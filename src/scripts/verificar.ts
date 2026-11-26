// Penké Web, página /verificar: manda el PDF al motor (/v1/verificar) y muestra cada firma.
import { ErrorFirma, verificarPdf, type FirmaVerificada } from "../lib/firma-web";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const raiz = $("verificador");
const motor = raiz.dataset.motor ?? "";
const input = $<HTMLInputElement>("pdf");
const zona = $("zona");
const estado = $("estado");
const error = $("error");
const resultado = $("resultado");
const veredicto = $("veredicto");
const archivo = $("archivo");
const lista = $("firmas");

const ESTADO_CERTIFICADO: Record<string, string> = {
  VALIDO: "Certificado vigente al firmar y emitido por una entidad acreditada en Ecuador",
  REVOCACION_DESCONOCIDA: "Certificado de una entidad acreditada; la entidad no respondió si estaba revocado",
  CADUCADO: "El certificado estaba caducado al firmar",
  NO_VIGENTE: "El certificado todavía no estaba vigente al firmar",
  REVOCADO: "El certificado fue revocado",
  NO_CONFIABLE: "El certificado no es de una entidad acreditada en Ecuador",
};

function marca(texto: string, ok: boolean): HTMLElement {
  const p = Object.assign(document.createElement("p"), { className: "marca", textContent: texto });
  p.dataset.ok = String(ok);
  return p;
}

function tarjeta(f: FirmaVerificada, n: number, total: number): HTMLLIElement {
  const li = document.createElement("li");
  const quien = Object.assign(document.createElement("p"), { className: "quien", textContent: f.nombre || "Firmante sin nombre" });
  li.append(quien);
  const empresa = [f.cargo, f.razonSocial].filter(Boolean).join(" · ") + (f.ruc ? ` · RUC ${f.ruc}` : "");
  if (empresa.trim()) li.append(Object.assign(document.createElement("p"), { className: "dato", textContent: empresa }));
  const fecha = f.fecha
    ? new Intl.DateTimeFormat("es-EC", { dateStyle: "long", timeStyle: "short", timeZone: "America/Guayaquil" }).format(new Date(f.fecha))
    : "";
  const detalle = [total > 1 ? `Firma ${n} de ${total}` : "", f.entidad, fecha].filter(Boolean).join(" · ");
  li.append(Object.assign(document.createElement("p"), { className: "dato", textContent: detalle }));
  if (f.razon) li.append(Object.assign(document.createElement("p"), { className: "dato", textContent: `Razón: ${f.razon}` }));
  const marcas = document.createElement("div");
  marcas.className = "marcas";
  marcas.append(marca(f.integra ? "El documento no cambió desde esta firma" : "El documento cambió después de esta firma", f.integra));
  const certOk = f.certificado === "VALIDO" || f.certificado === "REVOCACION_DESCONOCIDA";
  marcas.append(marca(ESTADO_CERTIFICADO[f.certificado] ?? f.aviso ?? f.certificado, f.valida || certOk));
  li.append(marcas);
  return li;
}

async function verificar(f: File) {
  error.hidden = true;
  resultado.hidden = true;
  if (!(f.type === "application/pdf" || /\.pdf$/i.test(f.name))) {
    error.textContent = "Elige un archivo PDF.";
    error.hidden = false;
    return;
  }
  if (f.size > 20 * 1024 * 1024) {
    error.textContent = "Ese PDF pesa más de 20 MB.";
    error.hidden = false;
    return;
  }
  estado.textContent = "Revisando las firmas con cada entidad…";
  estado.hidden = false;
  try {
    const r = await verificarPdf(motor, f);
    archivo.textContent = f.name;
    lista.replaceChildren(...r.firmas.map((x, i) => tarjeta(x, i + 1, r.firmas.length)));
    if (!r.firmas.length) {
      veredicto.textContent = "Este PDF no tiene firmas electrónicas";
    } else if (r.documentoValido) {
      veredicto.replaceChildren(Object.assign(document.createElement("span"), { className: "text-valid", textContent: "✓" }),
        r.firmas.length === 1 ? "La firma es válida" : `Las ${r.firmas.length} firmas son válidas`);
    } else {
      veredicto.textContent = r.firmas.some((x) => !x.integra)
        ? "El documento cambió después de firmarse"
        : r.firmas.every((x) => x.valida)
          ? "Las firmas son válidas, pero el documento tiene cambios después de la última"
          : "Hay firmas que no son válidas";
    }
    resultado.hidden = false;
    veredicto.focus();
  } catch (e) {
    error.textContent = e instanceof ErrorFirma ? e.message : "No se pudo revisar el PDF. Intenta de nuevo.";
    error.hidden = false;
  } finally {
    estado.hidden = true;
    input.value = "";
  }
}

input.addEventListener("change", () => {
  const f = input.files?.[0];
  if (f) void verificar(f);
});
zona.addEventListener("dragover", (e) => {
  e.preventDefault();
  zona.dataset.encima = "true";
});
zona.addEventListener("dragleave", () => delete zona.dataset.encima);
zona.addEventListener("drop", (e) => {
  e.preventDefault();
  delete zona.dataset.encima;
  const f = e.dataTransfer?.files?.[0];
  if (f) void verificar(f);
});
$("otro").addEventListener("click", () => {
  resultado.hidden = true;
  input.click();
});
