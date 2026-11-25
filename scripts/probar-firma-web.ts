// Prueba de punta a punta de Penké Web contra un motor real (local o en Cloud Run),
// con el MISMO código que usa la página /firmar (src/lib/firma-web.ts).
//
//   tsx scripts/probar-firma-web.ts generar <carpeta>
//       crea ca.pem (para PENKE_WEB_CA_PRUEBA del motor local), firma.p12 (clave «prueba123») y documento.pdf
//   tsx scripts/probar-firma-web.ts firmar <carpeta> <url-del-motor> [entrada.pdf] [salida.pdf]
//
// Con un motor en producción (sin CA de prueba) la firma de prueba se rechaza:
// eso también es una prueba (solo se aceptan entidades acreditadas en Ecuador).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import forge from "node-forge";
import { abrirFirma, firmarPdf } from "../src/lib/firma-web";

const [modo, carpeta, motor, entrada, salida] = process.argv.slice(2);
if (!modo || !carpeta) {
  console.error("Uso: generar <carpeta> | firmar <carpeta> <motor> [entrada.pdf] [salida.pdf]");
  process.exit(2);
}

function certificado(args: {
  cn: string; keys: forge.pki.rsa.KeyPair; ca?: { cert: forge.pki.Certificate; keys: forge.pki.rsa.KeyPair };
  extensiones: object[];
}) {
  const c = forge.pki.createCertificate();
  c.publicKey = args.keys.publicKey;
  c.serialNumber = "0" + Math.floor(Math.random() * 1e12).toString(16);
  c.validity.notBefore = new Date(Date.now() - 86_400_000);
  c.validity.notAfter = new Date(Date.now() + 365 * 86_400_000);
  const sujeto = [{ shortName: "CN", value: args.cn }, { shortName: "O", value: "PRUEBA S.A." }, { shortName: "C", value: "EC" }];
  c.setSubject(sujeto);
  c.setIssuer(args.ca ? args.ca.cert.subject.attributes : sujeto);
  c.setExtensions(args.extensiones);
  c.sign((args.ca?.keys ?? args.keys).privateKey, forge.md.sha256.create());
  return c;
}

/** Campo del titular al estilo de las entidades de Ecuador (OID .3.N). */
const campoEc = (n: number, valor: string) => ({
  id: `1.3.6.1.4.1.61305.3.${n}`,
  critical: false,
  value: forge.asn1.toDer(forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.UTF8, false, forge.util.encodeUtf8(valor))).getBytes(),
});

/** PDF mínimo de una página con su tabla xref correcta. */
function pdfMinimo(): Buffer {
  const texto = "BT /F1 18 Tf 72 760 Td (Contrato de prueba de Penke Web) Tj ET";
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${texto.length} >>\nstream\n${texto}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [];
  objetos.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

if (modo === "generar") {
  mkdirSync(carpeta, { recursive: true });
  const caKeys = forge.pki.rsa.generateKeyPair(2048);
  const ca = certificado({
    cn: "CA DE PRUEBA PENKE WEB", keys: caKeys,
    extensiones: [{ name: "basicConstraints", cA: true, critical: true }, { name: "keyUsage", keyCertSign: true, cRLSign: true, critical: true }],
  });
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const titular = certificado({
    cn: "MARIA JOSE PEÑA LOPEZ", keys, ca: { cert: ca, keys: caKeys },
    extensiones: [
      { name: "basicConstraints", cA: false },
      { name: "keyUsage", digitalSignature: true, nonRepudiation: true, critical: true },
      campoEc(1, "1712345678"), campoEc(2, "MARIA JOSE"), campoEc(3, "PEÑA"), campoEc(4, "LOPEZ"),
    ],
  });
  const p12 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [titular, ca], "prueba123", { algorithm: "3des" });
  writeFileSync(join(carpeta, "firma.p12"), Buffer.from(forge.asn1.toDer(p12).getBytes(), "binary"));
  writeFileSync(join(carpeta, "ca.pem"), forge.pki.certificateToPem(ca));
  writeFileSync(join(carpeta, "documento.pdf"), pdfMinimo());
  console.log(`Listo: ${carpeta}\\{ca.pem, firma.p12 (clave prueba123), documento.pdf}`);
} else if (modo === "firmar") {
  if (!motor) throw new Error("Falta la URL del motor");
  const identidad = abrirFirma(new Uint8Array(readFileSync(join(carpeta, "firma.p12"))), "prueba123");
  console.log(`Firma abierta en «el navegador»: ${identidad.titular} (vence ${identidad.validoHasta.toISOString().slice(0, 10)}), cadena de ${identidad.cadena.length}`);
  const pdf = readFileSync(entrada ?? join(carpeta, "documento.pdf"));
  const inicio = Date.now();
  const r = await firmarPdf({
    motor,
    pdf: new Blob([new Uint8Array(pdf)], { type: "application/pdf" }),
    identidad,
    sello: { pagina: 1, left: 400, bottom: 40, escala: 1 },
    razon: "Prueba de Penké Web",
    lugar: "Loja, Ecuador",
    alAvanzar: (p) => console.log(`  … ${p}`),
  });
  const destino = salida ?? join(carpeta, "firmado.pdf");
  writeFileSync(destino, Buffer.from(await r.pdf.arrayBuffer()));
  console.log(`Firmado por ${r.firmante} en ${Date.now() - inicio} ms → ${destino}${r.aviso ? `\nAviso: ${r.aviso}` : ""}`);
} else {
  throw new Error(`Modo desconocido: ${modo}`);
}
