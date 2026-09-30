import type { APIRoute } from "astro";
import { FieldValue } from "firebase-admin/firestore";
import { firestore, VERIFICACIONES } from "../../../lib/firestore";
import { RegistroInvalido, verificarRegistro } from "../../../lib/verification";

// POST /api/v/registrar  { registro: base64(JSON UTF-8), firma: base64(CMS DER) }
// Lo llama la app de escritorio justo después de firmar un PDF.

const MAX_BODY = 64 * 1024;
const LIMIT_PER_MINUTE = 30;
const hits = new Map<string, { minute: number; count: number }>();

function rateLimited(ip: string): boolean {
  const minute = Math.floor(Date.now() / 60_000);
  const entry = hits.get(ip);
  if (!entry || entry.minute !== minute) {
    hits.set(ip, { minute, count: 1 });
    if (hits.size > 10_000) hits.clear();
    return false;
  }
  entry.count++;
  return entry.count > LIMIT_PER_MINUTE;
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || clientAddress;
  if (rateLimited(ip)) return json(429, { code: "RATE_LIMITED", error: "Demasiadas solicitudes" });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json(413, { code: "TOO_LARGE", error: "Solicitud demasiado grande" });

  let registroBytes: Uint8Array;
  let firmaBytes: Uint8Array;
  try {
    const body = JSON.parse(raw) as { registro?: unknown; firma?: unknown };
    if (typeof body.registro !== "string" || typeof body.firma !== "string") throw new Error();
    registroBytes = Buffer.from(body.registro, "base64");
    firmaBytes = Buffer.from(body.firma, "base64");
  } catch {
    return json(400, { code: "BAD_REQUEST", error: "Se esperaba { registro, firma } en base64" });
  }

  let verificado;
  try {
    verificado = await verificarRegistro(registroBytes, firmaBytes);
  } catch (error) {
    if (error instanceof RegistroInvalido) return json(422, { code: "INVALID_RECORD", error: error.message });
    throw error;
  }

  const { registro } = verificado;
  try {
    await firestore().collection(VERIFICACIONES).doc(registro.id).create({
      ...registro,
      firmanteCertificado: verificado.firmanteCertificado,
      emisorCertificado: verificado.emisorCertificado,
      // Se guardan los bytes originales para poder volver a verificar la firma
      registroB64: Buffer.from(registroBytes).toString("base64"),
      firmaB64: Buffer.from(firmaBytes).toString("base64"),
      registradoEn: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    // Código 6 = ALREADY_EXISTS: los registros no se pueden reemplazar
    if ((error as { code?: number }).code === 6) {
      return json(409, { code: "ALREADY_EXISTS", error: "Ese identificador ya está registrado" });
    }
    console.error("No se pudo guardar el registro", error);
    return json(503, { code: "STORAGE_UNAVAILABLE", error: "No se pudo guardar el registro" });
  }

  return json(201, { id: registro.id, url: new URL(`/v/${registro.id}`, request.url).toString() });
};
