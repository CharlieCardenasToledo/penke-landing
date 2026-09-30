// Registros de verificación del QR de Penké (/v/<id>).
//
// La app de escritorio envía el registro (JSON en UTF-8) y una firma CMS
// separada sobre esos bytes, hecha con el mismo certificado que firmó el PDF.
// Aquí se comprueba esa firma y que el certificado encadene a una entidad de
// certificación reconocida por FirmaEC, así nadie puede publicar un registro
// a nombre de otra persona.
import * as pkijs from "pkijs";
import { webcrypto } from "node:crypto";
import rootsPem from "./ca/ec-roots.txt?raw";
import intermediatesPem from "./ca/ec-intermediates.txt?raw";

pkijs.setEngine("node", new pkijs.CryptoEngine({ name: "node", crypto: webcrypto as unknown as Crypto }));

export const ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export interface Registro {
  v: 1;
  id: string;
  /** SHA-256 (hex) de la revisión del PDF recién firmada. */
  sha256: string;
  /** ISO 8601 con zona horaria. */
  fecha: string;
  tipo: string;
  nombre: string;
  cargo: string;
  razonSocial: string;
  ruc: string;
  /** Cédula con solo los 4 últimos dígitos visibles. */
  cedula: string;
  /** Número de serie (hex) del certificado firmante. */
  serie: string;
}

export interface RegistroVerificado {
  registro: Registro;
  firmanteCertificado: string;
  emisorCertificado: string;
}

export class RegistroInvalido extends Error {}

export function pemToCertificates(pem: string): pkijs.Certificate[] {
  const blocks = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) ?? [];
  return blocks.map((block) => {
    const b64 = block.replace(/-----(BEGIN|END) CERTIFICATE-----|\s/g, "");
    return pkijs.Certificate.fromBER(Buffer.from(b64, "base64"));
  });
}

const INTERMEDIATES = pemToCertificates(intermediatesPem);
// Las subordinadas conocidas también son anclas: algunas entidades emiten bajo
// raíces que no están en el listado (p. ej. la SubCA-2 de Security Data cuelga
// de "RAIZ CA-2"). Es el mismo criterio que la validación de la app de escritorio.
const ROOTS = [...pemToCertificates(rootsPem), ...INTERMEDIATES];

function commonName(name: pkijs.RelativeDistinguishedNames): string {
  const cn = name.typesAndValues.find((tv) => tv.type === "2.5.4.3");
  return cn ? String(cn.value.valueBlock.value) : "";
}

const text = (v: unknown, max: number) => typeof v === "string" && v.length <= max;

export function parseRegistro(bytes: Uint8Array): Registro {
  let r: Record<string, unknown>;
  try {
    r = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new RegistroInvalido("El registro no es JSON válido");
  }
  const ok =
    r.v === 1 &&
    typeof r.id === "string" && ID_PATTERN.test(r.id) &&
    typeof r.sha256 === "string" && /^[0-9a-f]{64}$/.test(r.sha256) &&
    typeof r.fecha === "string" && !Number.isNaN(Date.parse(r.fecha)) &&
    text(r.tipo, 40) && text(r.nombre, 200) && (r.nombre as string).length > 0 &&
    text(r.cargo, 200) && text(r.razonSocial, 300) &&
    typeof r.ruc === "string" && /^(\d{13})?$/.test(r.ruc) &&
    typeof r.cedula === "string" && /^(\**\d{0,4})$/.test(r.cedula) && r.cedula.length <= 13 &&
    typeof r.serie === "string" && /^[0-9a-f]{1,64}$/.test(r.serie);
  if (!ok) throw new RegistroInvalido("El registro tiene campos faltantes o con formato inválido");
  return r as unknown as Registro;
}

/** `confianza` solo se cambia en pruebas, para usar una CA de prueba. */
export async function verificarRegistro(
  registroBytes: Uint8Array,
  firmaDer: Uint8Array,
  confianza: { roots: pkijs.Certificate[]; intermediates: pkijs.Certificate[] } = { roots: ROOTS, intermediates: INTERMEDIATES },
): Promise<RegistroVerificado> {
  const registro = parseRegistro(registroBytes);

  let signed: pkijs.SignedData;
  try {
    const info = pkijs.ContentInfo.fromBER(new Uint8Array(firmaDer));
    signed = new pkijs.SignedData({ schema: info.content });
  } catch {
    throw new RegistroInvalido("La firma no es un CMS válido");
  }
  // Intermedias conocidas por si el CMS no trae la cadena completa
  signed.certificates = [...(signed.certificates ?? []), ...confianza.intermediates];

  let result: pkijs.SignedDataVerifyResult;
  try {
    result = await signed.verify({
      signer: 0,
      data: registroBytes.buffer.slice(registroBytes.byteOffset, registroBytes.byteOffset + registroBytes.byteLength) as ArrayBuffer,
      trustedCerts: confianza.roots,
      checkChain: true,
      checkDate: new Date(),
      extendedMode: true,
    });
  } catch (error) {
    const message = (error as { message?: string })?.message ?? "";
    throw new RegistroInvalido(`La firma del registro no es válida${message ? `: ${message}` : ""}`);
  }
  if (!result.signatureVerified || !result.signerCertificate) {
    throw new RegistroInvalido("La firma del registro no es válida");
  }

  const cert = result.signerCertificate;
  const serie = Buffer.from(cert.serialNumber.valueBlock.valueHexView).toString("hex").replace(/^0+(?=.)/, "");
  if (serie !== registro.serie.replace(/^0+(?=.)/, "")) {
    throw new RegistroInvalido("El registro no corresponde al certificado que lo firmó");
  }

  return {
    registro,
    firmanteCertificado: commonName(cert.subject),
    emisorCertificado: commonName(cert.issuer),
  };
}
