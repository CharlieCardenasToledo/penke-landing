// Comprueba que el registro del QR verificable que firma el navegador (node-forge,
// src/lib/firma-web.ts) lo acepta la verificación del servidor (pkijs, misma lógica
// que src/lib/verification.ts), con la CA de prueba de probar-firma-web.ts.
//   tsx scripts/probar-registro-qr.ts <carpeta con ca.pem y firma.p12>
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { webcrypto } from "node:crypto";
import * as pkijs from "pkijs";
import { abrirFirma, firmarRegistro, nuevoIdQr } from "../src/lib/firma-web";

pkijs.setEngine("node", new pkijs.CryptoEngine({ name: "node", crypto: webcrypto as unknown as Crypto }));
const carpeta = process.argv[2]!;
const identidad = abrirFirma(new Uint8Array(readFileSync(join(carpeta, "firma.p12"))), "prueba123");

const serie = identidad.certificados[0]!.serialNumber.toLowerCase().replace(/^0+(?=.)/, "");
const registro = { v: 1, id: nuevoIdQr(), sha256: "a".repeat(64), fecha: new Date().toISOString(), tipo: "PERSONA_NATURAL",
  nombre: identidad.titular, cargo: "", razonSocial: "", ruc: "", cedula: "******5678", serie };
const bytes = new TextEncoder().encode(JSON.stringify(registro));
const firma = Buffer.from(firmarRegistro(identidad, bytes), "base64");

const pem = readFileSync(join(carpeta, "ca.pem"), "utf8").replace(/-----(BEGIN|END) CERTIFICATE-----|\s/g, "");
const ca = pkijs.Certificate.fromBER(Buffer.from(pem, "base64"));
const signed = new pkijs.SignedData({ schema: pkijs.ContentInfo.fromBER(new Uint8Array(firma)).content });
const r = await signed.verify({ signer: 0, data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  trustedCerts: [ca], checkChain: true, checkDate: new Date(), extendedMode: true });
const cert = r.signerCertificate!;
const serieCms = Buffer.from(cert.serialNumber.valueBlock.valueHexView).toString("hex").replace(/^0+(?=.)/, "");
console.log(JSON.stringify({ firmaVerificada: r.signatureVerified, serieCoincide: serieCms === serie, id: registro.id, idValido: /^[A-Za-z0-9_-]{22}$/.test(registro.id) }));
if (!r.signatureVerified || serieCms !== serie) process.exit(1);
