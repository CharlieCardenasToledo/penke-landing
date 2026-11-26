// Penké Web: firma en dos pasos. La firma (.p12) y su clave se abren y se usan
// solo en este navegador; al motor viajan el PDF y el certificado PÚBLICO.
//
//   preparar  → el motor valida el certificado, dibuja el sello y devuelve el PDF
//               con el hueco de la firma y los «atributos firmados» (lo que se firma)
//   firmar    → aquí, con la clave privada (RSA, SHA-256)
//   completar → el motor verifica esa firma y la incrusta: PAdES igual que Penké
//
// Varios sellos = varias firmas incrementales seguidas (igual que el escritorio).
// Funciona igual en el navegador y en Node (prueba de punta a punta).
import forge from "node-forge";

/** Un error que se le muestra tal cual a la persona. */
export class ErrorFirma extends Error {}

export interface Identidad {
  /** Clave privada: nunca sale de este módulo. */
  readonly clave: forge.pki.rsa.PrivateKey;
  /** Certificados: el del titular primero. */
  readonly certificados: forge.pki.Certificate[];
  /** Los mismos en DER base64. */
  readonly cadena: string[];
  readonly titular: string;
  readonly emisor: string;
  readonly validoDesde: Date;
  readonly validoHasta: Date;
}

export interface Sello {
  pagina: number;
  /** Esquina inferior izquierda en puntos PDF. */
  left: number;
  bottom: number;
  /** 1 = 170 × 56 pt. */
  escala: number;
}

/** Datos del titular tal como los lee el motor (para el registro del QR verificable). */
export interface Perfil {
  tipo: string;
  nombre: string;
  cargo: string;
  razonSocial: string;
  ruc: string;
  cedula: string;
}

export const SELLO_ANCHO_PT = 170;
export const SELLO_ALTO_PT = 56;
export const ESCALA_MIN = 0.55;
export const ESCALA_MAX = 2;
export const MAX_SELLOS = 20;

const campo = (attrs: forge.pki.CertificateField[], corto: string) =>
  String(attrs.find((a) => a.shortName === corto)?.value ?? "");

const derBase64 = (cert: forge.pki.Certificate) =>
  forge.util.encode64(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes());

function esCa(cert: forge.pki.Certificate): boolean {
  const bc = cert.getExtension("basicConstraints") as { cA?: boolean } | null;
  return bc?.cA === true;
}

function usoFirma(cert: forge.pki.Certificate): number {
  const ku = cert.getExtension("keyUsage") as { digitalSignature?: boolean; nonRepudiation?: boolean } | null;
  if (!ku) return 1;
  return ku.nonRepudiation ? 3 : ku.digitalSignature ? 2 : 0;
}

const aBinario = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return s;
};

/**
 * Abre la firma con su clave, aquí mismo. Elige el certificado que corresponde
 * a la clave privada (sin importar el orden del archivo) y arma la cadena.
 */
export function abrirFirma(archivo: Uint8Array, clave: string, ahora = new Date()): Identidad {
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(aBinario(archivo)), false, clave);
  } catch (e) {
    const m = String((e as Error)?.message ?? "");
    if (/mac|password|invalid|decrypt/i.test(m)) throw new ErrorFirma("La clave no corresponde a esta firma.");
    throw new ErrorFirma("Ese archivo no es una firma electrónica (.p12 o .pfx).");
  }

  const claves: forge.pki.rsa.PrivateKey[] = [];
  const certs: forge.pki.Certificate[] = [];
  for (const contenido of p12.safeContents) {
    for (const bag of contenido.safeBags) {
      if ((bag.type === forge.pki.oids.pkcs8ShroudedKeyBag || bag.type === forge.pki.oids.keyBag) && bag.key) {
        claves.push(bag.key as forge.pki.rsa.PrivateKey);
      } else if (bag.type === forge.pki.oids.certBag && bag.cert) {
        certs.push(bag.cert);
      }
    }
  }
  if (!claves.length) throw new ErrorFirma("Esta firma no trae su clave privada. Usa el .p12 que te entregó la entidad.");

  let mejor: { clave: forge.pki.rsa.PrivateKey; cert: forge.pki.Certificate } | null = null;
  for (const k of claves) {
    if (!k.n) continue; // solo RSA (todas las entidades de Ecuador emiten RSA)
    for (const c of certs) {
      const pub = c.publicKey as forge.pki.rsa.PublicKey;
      if (esCa(c) || !pub.n || !pub.n.equals(k.n) || !pub.e.equals(k.e) || usoFirma(c) === 0) continue;
      if (!mejor || usoFirma(c) > usoFirma(mejor.cert)) mejor = { clave: k, cert: c };
    }
  }
  if (!mejor) throw new ErrorFirma("Esta firma no trae un certificado para firmar documentos.");

  const { notBefore, notAfter } = mejor.cert.validity;
  if (ahora > notAfter) {
    throw new ErrorFirma(`Esta firma venció el ${notAfter.toLocaleDateString("es-EC", { dateStyle: "long" })}.`);
  }
  if (ahora < notBefore) throw new ErrorFirma("Esta firma todavía no está vigente.");

  const firmante = mejor.cert;
  const certificados = [firmante, ...certs.filter((c) => c !== firmante)];
  return {
    clave: mejor.clave,
    certificados,
    cadena: certificados.map(derBase64),
    titular: campo(firmante.subject.attributes, "CN") || "Titular",
    emisor: campo(firmante.issuer.attributes, "CN") || campo(firmante.issuer.attributes, "O"),
    validoDesde: notBefore,
    validoHasta: notAfter,
  };
}

/** Firma los atributos que preparó el motor (RSASSA-PKCS1-v1_5 con SHA-256). */
export function firmarAtributos(identidad: Identidad, atributosB64: string): string {
  const md = forge.md.sha256.create();
  md.update(forge.util.decode64(atributosB64));
  return forge.util.encode64(identidad.clave.sign(md));
}

async function error(r: Response): Promise<ErrorFirma> {
  let mensaje = "";
  try {
    mensaje = ((await r.json()) as { error?: string }).error ?? "";
  } catch {
    /* respuesta sin JSON */
  }
  if (r.status === 429) mensaje ||= "Demasiadas firmas seguidas. Espera unos minutos.";
  return new ErrorFirma(mensaje || `El servicio de firma no respondió bien (HTTP ${r.status}). Intenta de nuevo.`);
}

async function enviar(url: string, init: RequestInit): Promise<Response> {
  let r: Response;
  try {
    r = await fetch(url, init);
  } catch {
    throw new ErrorFirma("No hay conexión con el servicio de firma. Revisa tu internet e intenta de nuevo.");
  }
  if (!r.ok) throw await error(r);
  return r;
}

export interface Firmado {
  pdf: Blob;
  firmante: string;
  /** Aviso del motor (p. ej. no se pudo consultar la revocación del certificado). */
  aviso?: string;
  perfil?: Perfil;
  /** Fecha de la última firma (ISO 8601) y número de serie del certificado (hex). */
  fecha?: string;
  serie?: string;
}

export type Paso = "validando" | "firmando" | "terminando";

/** Una firma (un sello). `motor` es la URL del motor de Penké Web. */
export async function firmarPdf(args: {
  motor: string;
  pdf: Blob;
  identidad: Identidad;
  sello: Sello;
  razon?: string;
  lugar?: string;
  /** Id del QR verificable (el sello lleva la URL /v/<id> en vez del texto). */
  qrId?: string;
  alAvanzar?: (paso: Paso) => void;
}): Promise<Firmado> {
  const base = args.motor.replace(/\/+$/, "");
  const cadena = JSON.stringify(args.identidad.cadena);

  args.alAvanzar?.("validando");
  const f1 = new FormData();
  f1.append("pdf", args.pdf, "documento.pdf");
  f1.append("cadena", cadena);
  f1.append("pagina", String(args.sello.pagina));
  f1.append("left", args.sello.left.toFixed(2));
  f1.append("bottom", args.sello.bottom.toFixed(2));
  f1.append("escala", args.sello.escala.toFixed(3));
  if (args.razon) f1.append("razon", args.razon);
  if (args.lugar) f1.append("lugar", args.lugar);
  if (args.qrId) f1.append("qrId", args.qrId);
  const r1 = await enviar(`${base}/v1/preparar`, { method: "POST", body: f1 });
  const atributos = r1.headers.get("Penke-Atributos");
  if (!atributos) throw new ErrorFirma("El servicio de firma no devolvió qué firmar. Intenta de nuevo.");
  const algoritmo = r1.headers.get("Penke-Algoritmo") ?? "SHA256withRSA";
  if (algoritmo !== "SHA256withRSA") throw new ErrorFirma("Este tipo de firma no se puede usar en la web. Usa Penké de escritorio.");
  const firmante = decodeURIComponent(r1.headers.get("Penke-Firmante") ?? "");
  const avisoCrudo = r1.headers.get("Penke-Aviso");
  const perfilCrudo = r1.headers.get("Penke-Perfil");
  const preparado = await r1.blob();

  args.alAvanzar?.("firmando");
  const firma = firmarAtributos(args.identidad, atributos);

  args.alAvanzar?.("terminando");
  const f2 = new FormData();
  f2.append("pdf", preparado, "preparado.pdf");
  f2.append("cadena", cadena);
  f2.append("firma", firma);
  const r2 = await enviar(`${base}/v1/completar`, { method: "POST", body: f2 });
  let perfil: Perfil | undefined;
  try {
    perfil = perfilCrudo ? (JSON.parse(decodeURIComponent(perfilCrudo)) as Perfil) : undefined;
  } catch {
    perfil = undefined;
  }
  return {
    pdf: new Blob([await r2.arrayBuffer()], { type: "application/pdf" }),
    firmante,
    aviso: avisoCrudo ? decodeURIComponent(avisoCrudo) : undefined,
    perfil,
    fecha: r1.headers.get("Penke-Fecha") ?? undefined,
    serie: r1.headers.get("Penke-Serie") ?? undefined,
  };
}

/** Todos los sellos de un documento: una firma incremental por sello, en orden. */
export async function firmarDocumento(args: {
  motor: string;
  pdf: Blob;
  identidad: Identidad;
  sellos: Sello[];
  razon?: string;
  lugar?: string;
  qrId?: string;
  alAvanzar?: (paso: Paso, sello: number, total: number) => void;
}): Promise<Firmado> {
  if (!args.sellos.length) throw new ErrorFirma("Ubica al menos una firma.");
  if (args.sellos.length > MAX_SELLOS) throw new ErrorFirma(`Se pueden poner hasta ${MAX_SELLOS} firmas en un documento.`);
  let pdf = args.pdf;
  let ultimo: Firmado | null = null;
  const avisos = new Set<string>();
  for (const [i, sello] of args.sellos.entries()) {
    ultimo = await firmarPdf({
      ...args,
      pdf,
      sello,
      alAvanzar: (p) => args.alAvanzar?.(p, i + 1, args.sellos.length),
    });
    if (ultimo.aviso) avisos.add(ultimo.aviso);
    pdf = ultimo.pdf;
  }
  return { ...ultimo!, aviso: [...avisos][0] };
}

// ── QR verificable ───────────────────────────────────────────────────────────

/** 16 bytes al azar en base64url (22 caracteres), como VerificationRegistry.nuevoId(). */
export function nuevoIdQr(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Hex(blob: Blob): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/**
 * Publica el registro del QR (mismo formato que el escritorio): JSON con los
 * datos del sello y la huella del PDF final, firmado con la misma clave en un
 * CMS separado. El PDF no se sube.
 */
export async function registrarQr(args: {
  identidad: Identidad;
  id: string;
  pdf: Blob;
  perfil: Perfil;
  fecha: string;
  serie: string;
  /** Raíz del sitio (en el navegador, el mismo origen). */
  sitio?: string;
}): Promise<string> {
  const registro = {
    v: 1,
    id: args.id,
    sha256: await sha256Hex(args.pdf),
    fecha: args.fecha,
    tipo: args.perfil.tipo,
    nombre: args.perfil.nombre,
    cargo: args.perfil.cargo,
    razonSocial: args.perfil.razonSocial,
    ruc: args.perfil.ruc,
    cedula: args.perfil.cedula,
    serie: args.serie.toLowerCase().replace(/^0+(?=.)/, ""),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(registro));
  const firma = firmarRegistro(args.identidad, bytes);

  const r = await enviar(`${args.sitio ?? ""}/api/v/registrar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ registro: btoa(aBinario(bytes)), firma }),
  });
  const j = (await r.json()) as { url?: string };
  return j.url ?? `${args.sitio ?? ""}/v/${args.id}`;
}

/** CMS separado (detached) sobre los bytes del registro, con la cadena del titular. Base64 DER. */
export function firmarRegistro(identidad: Identidad, bytes: Uint8Array): string {
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(aBinario(bytes));
  for (const c of identidad.certificados) p7.addCertificate(c);
  p7.addSigner({
    key: identidad.clave,
    certificate: identidad.certificados[0]!,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() as unknown as string },
    ],
  });
  p7.sign({ detached: true });
  return forge.util.encode64(forge.asn1.toDer(p7.toAsn1()).getBytes());
}

// ── Verificar ────────────────────────────────────────────────────────────────

export interface FirmaVerificada {
  nombre: string;
  tipo: string;
  cargo: string;
  razonSocial: string;
  ruc: string;
  cedula: string;
  entidad: string;
  fecha: string | null;
  razon: string;
  integra: boolean;
  certificado: string;
  valida: boolean;
  aviso: string;
}

export async function verificarPdf(motor: string, pdf: Blob): Promise<{ firmas: FirmaVerificada[]; documentoValido: boolean }> {
  const f = new FormData();
  f.append("pdf", pdf, "documento.pdf");
  const r = await enviar(`${motor.replace(/\/+$/, "")}/v1/verificar`, { method: "POST", body: f });
  return (await r.json()) as { firmas: FirmaVerificada[]; documentoValido: boolean };
}

/** «contrato.pdf» → «contrato-firmado.pdf». */
export function nombreFirmado(nombre: string): string {
  const base = nombre.replace(/\.pdf$/i, "").trim() || "documento";
  return `${base}-firmado.pdf`;
}
