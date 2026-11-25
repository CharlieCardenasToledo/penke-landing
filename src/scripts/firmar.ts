// Penké Web, página /firmar: un asistente de tres pasos (documento → ubicación → firma).
// La firma (.p12) y su clave solo se usan aquí, en el navegador: ver src/lib/firma-web.ts.
import * as pdfjs from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  abrirFirma, ErrorFirma, ESCALA_MAX, ESCALA_MIN, firmarPdf, nombreFirmado,
  SELLO_ALTO_PT, SELLO_ANCHO_PT, type Identidad, type Paso as PasoMotor, type Sello,
} from "../lib/firma-web";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MARGEN_PT = 18;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

type Paso = "documento" | "ubicar" | "firmar" | "listo";
const ORDEN: Paso[] = ["documento", "ubicar", "firmar", "listo"];

const raiz = $("firmador");
const motor = raiz.dataset.motor ?? "";

// Paso 1
const inputPdf = $<HTMLInputElement>("pdf");
const zona = $("zona-pdf");
const pdfError = $("pdf-error");
const pdfCargando = $("pdf-cargando");
// Paso 2
const documentoNombre = $("documento-nombre");
const navegacion = $("navegacion");
const visor = $("visor");
const lienzo = $<HTMLCanvasElement>("lienzo");
const selloEl = $("sello");
const selloNombre = $("sello-nombre");
const paginaTexto = $("pagina-texto");
const anterior = $<HTMLButtonElement>("pagina-anterior");
const siguiente = $<HTMLButtonElement>("pagina-siguiente");
const selloOtraHoja = $("sello-otra-hoja");
const selloHoja = $("sello-hoja");
const aquiSello = $<HTMLButtonElement>("sello-aqui");
const tamano = $<HTMLInputElement>("tamano");
const tamanoTexto = $("tamano-texto");
const avisoQr = $("aviso-qr");
// Paso 3
const formFirma = $<HTMLFormElement>("form-firma");
const firmaGuardada = $("firma-guardada");
const firmaTitular = $("firma-titular");
const camposFirma = $("campos-firma");
const inputP12 = $<HTMLInputElement>("p12");
const inputClave = $<HTMLInputElement>("clave");
const verClave = $<HTMLButtonElement>("ver-clave");
const claveError = $("clave-error");
const errorFirmar = $("error-firmar");
const botonFirmar = $<HTMLButtonElement>("firmar");
// Listo
const listoDetalle = $("listo-detalle");
const listoAviso = $("listo-aviso");
const descargar = $<HTMLAnchorElement>("descargar");
const compartir = $<HTMLButtonElement>("compartir");

// ── Estado ─────────────────────────────────────────────────────────────────
let paso: Paso = "documento";
let archivoPdf: File | null = null;
let doc: pdfjs.PDFDocumentProxy | null = null;
let carga: pdfjs.PDFDocumentLoadingTask | null = null;

/** Libera el documento anterior (en pdf.js 6 se destruye la tarea de carga, no el documento). */
async function cerrarDocumento() {
  renderTarea?.cancel();
  const anterior = carga;
  carga = null;
  doc = null;
  await anterior?.destroy().catch(() => {});
}
let identidad: Identidad | null = null;
let pagina = 1;
let vista: pdfjs.PageViewport | null = null; // píxeles CSS de la hoja mostrada
let caja: number[] = [0, 0, 595, 842]; // page.view de la hoja mostrada, en puntos PDF
let sello: Sello | null = null;
let firmado: { blob: Blob; nombre: string; url: string } | null = null;
let ocupado = false;
let renderTarea: { cancel: () => void } | null = null;

const ancho = (s: Sello) => SELLO_ANCHO_PT * s.escala;
const alto = (s: Sello) => SELLO_ALTO_PT * s.escala;
const mostrar = (el: HTMLElement, visible: boolean) => { el.hidden = !visible; };
function aviso(el: HTMLElement, mensaje: string | null) {
  el.textContent = mensaje ?? "";
  mostrar(el, Boolean(mensaje));
}

// ── Navegación entre pasos ─────────────────────────────────────────────────
function ir(destino: Paso, { enfocar = true } = {}) {
  paso = destino;
  raiz.dataset.paso = destino;
  for (const s of raiz.querySelectorAll<HTMLElement>("section[data-paso]")) s.hidden = s.dataset.paso !== destino;
  const i = ORDEN.indexOf(destino);
  for (const li of raiz.querySelectorAll<HTMLElement>(".progreso li")) {
    const j = ORDEN.indexOf(li.dataset.de as Paso);
    li.dataset.estado = j < i ? "hecho" : j === i ? "actual" : "pendiente";
    if (j === i) li.setAttribute("aria-current", "step");
    else li.removeAttribute("aria-current");
  }
  if (destino === "ubicar") requestAnimationFrame(() => void dibujar());
  if (destino === "firmar") prepararPasoFirma();
  if (enfocar) {
    raiz.scrollIntoView({ behavior: "smooth", block: "start" });
    raiz.querySelector<HTMLElement>(`section[data-paso="${destino}"] .titulo`)?.focus({ preventScroll: true });
  }
}

for (const b of raiz.querySelectorAll<HTMLButtonElement>("[data-ir]")) {
  b.addEventListener("click", () => ir(b.dataset.ir as Paso));
}

// ── 1. Documento ───────────────────────────────────────────────────────────
async function cargarPdf(f: File) {
  aviso(pdfError, null);
  if (f.size > MAX_PDF_BYTES) return aviso(pdfError, "Ese PDF pesa más de 20 MB. Prueba con uno más liviano.");
  mostrar(pdfCargando, true);
  try {
    const datos = new Uint8Array(await f.arrayBuffer());
    if (!new TextDecoder("latin1").decode(datos.subarray(0, 1024)).includes("%PDF-")) {
      return aviso(pdfError, "Ese archivo no es un PDF.");
    }
    await cerrarDocumento();
    try {
      // Copia: pdf.js se queda con el buffer que recibe
      carga = pdfjs.getDocument({ data: datos.slice(), isEvalSupported: false });
      doc = await carga.promise;
    } catch (e) {
      const protegido = (e as { name?: string })?.name === "PasswordException";
      return aviso(pdfError, protegido
        ? "Ese PDF tiene contraseña. Quítasela y vuelve a elegirlo."
        : "No se pudo abrir ese PDF. Puede estar dañado.");
    }
    archivoPdf = f;
    documentoNombre.textContent = f.name;
    documentoNombre.title = f.name;
    mostrar(navegacion, doc.numPages > 1);
    // Como en Penké de escritorio: la firma se propone abajo a la derecha de la última hoja
    pagina = doc.numPages;
    sello = null;
    ir("ubicar");
    await dibujar();
    if (!sello) ponerEnEsquina();
    // Que se vea dónde quedó la firma propuesta (en el celular suele estar bajo el pliegue)
    setTimeout(() => {
      const r = selloEl.getBoundingClientRect();
      const tope = (raiz.querySelector('section[data-paso="ubicar"] .acciones') as HTMLElement).getBoundingClientRect().top;
      if (r.bottom > tope - 12) window.scrollBy({ top: r.bottom - tope + 24, behavior: "smooth" });
    }, 650);
  } finally {
    mostrar(pdfCargando, false);
    inputPdf.value = "";
  }
}

inputPdf.addEventListener("change", () => {
  const f = inputPdf.files?.[0];
  if (f) void cargarPdf(f);
});
zona.addEventListener("dragover", (e) => {
  e.preventDefault();
  zona.dataset.encima = "true";
});
zona.addEventListener("dragleave", () => delete zona.dataset.encima);
zona.addEventListener("drop", (e) => {
  e.preventDefault();
  delete zona.dataset.encima;
  const f = [...(e.dataTransfer?.files ?? [])].find((x) => x.type === "application/pdf" || /\.pdf$/i.test(x.name));
  if (f) void cargarPdf(f);
  else aviso(pdfError, "Suelta un archivo PDF.");
});
$("cambiar-pdf").addEventListener("click", () => {
  ir("documento");
  inputPdf.click();
});

// ── 2. Ubicación del sello ─────────────────────────────────────────────────
async function dibujar() {
  if (!doc || paso !== "ubicar") return;
  const p = await doc.getPage(pagina);
  const anchoCss = visor.clientWidth || 340;
  const base = p.getViewport({ scale: 1 });
  vista = p.getViewport({ scale: anchoCss / base.width });
  caja = p.view;
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const render = p.getViewport({ scale: vista.scale * dpr });
  lienzo.width = Math.floor(render.width);
  lienzo.height = Math.floor(render.height);
  lienzo.style.aspectRatio = `${vista.width} / ${vista.height}`;
  renderTarea?.cancel();
  const tarea = p.render({ canvas: lienzo, canvasContext: lienzo.getContext("2d")!, viewport: render });
  renderTarea = tarea;
  pintarSello();
  try {
    await tarea.promise;
  } catch {
    /* lo canceló un dibujo más nuevo */
  }
  paginaTexto.textContent = `Hoja ${pagina} de ${doc.numPages}`;
  anterior.disabled = pagina <= 1;
  siguiente.disabled = pagina >= doc.numPages;
}

function limitar(s: Sello): Sello {
  const [x0, y0, x1, y1] = caja;
  return {
    ...s,
    left: Math.max(x0, Math.min(x1 - ancho(s), s.left)),
    bottom: Math.max(y0, Math.min(y1 - alto(s), s.bottom)),
  };
}

const escalaActual = () => Math.max(ESCALA_MIN, Math.min(ESCALA_MAX, Number(tamano.value) / 100));

function ponerEnEsquina() {
  const escala = escalaActual();
  const [, y0, x1] = caja;
  sello = limitar({ pagina, escala, left: x1 - SELLO_ANCHO_PT * escala - MARGEN_PT, bottom: y0 + MARGEN_PT });
  pintarSello();
}

function pintarSello() {
  const enEsta = Boolean(sello && vista && sello.pagina === pagina);
  mostrar(selloEl, enEsta);
  mostrar(selloOtraHoja, Boolean(sello && sello.pagina !== pagina));
  if (sello) selloHoja.textContent = String(sello.pagina);
  if (!enEsta || !sello || !vista) return;
  // Dos esquinas, igual que Penké de escritorio: sirve también en hojas giradas
  const [a, b] = vista.convertToViewportPoint(sello.left, sello.bottom);
  const [c, d] = vista.convertToViewportPoint(sello.left + ancho(sello), sello.bottom + alto(sello));
  const w = Math.abs(c - a), h = Math.abs(d - b);
  // En % del visor: no se mueve si cambia el ancho de la pantalla
  selloEl.style.left = `${(Math.min(a, c) / vista.width) * 100}%`;
  selloEl.style.top = `${(Math.min(b, d) / vista.height) * 100}%`;
  selloEl.style.width = `${(w / vista.width) * 100}%`;
  selloEl.style.height = `${(h / vista.height) * 100}%`;
  selloEl.style.fontSize = `${Math.max(5, Math.min(w, h * 3) / 22)}px`;
}

function aPdf(clientX: number, clientY: number): [number, number] | null {
  if (!vista) return null;
  const r = lienzo.getBoundingClientRect();
  const [x, y] = vista.convertToPdfPoint((clientX - r.left) * (vista.width / r.width), (clientY - r.top) * (vista.height / r.height));
  return [x, y];
}

let arrastre: { dx: number; dy: number; id: number } | null = null;

visor.addEventListener("pointerdown", (e) => {
  if (!doc || !vista || e.button > 0) return;
  const p = aPdf(e.clientX, e.clientY);
  if (!p) return;
  const sobreSello = selloEl.contains(e.target as Node) && sello?.pagina === pagina;
  if (!sobreSello || !sello) {
    // Toque en la hoja: el sello se centra ahí y se puede seguir arrastrando
    const escala = escalaActual();
    sello = limitar({ pagina, escala, left: p[0] - (SELLO_ANCHO_PT * escala) / 2, bottom: p[1] - (SELLO_ALTO_PT * escala) / 2 });
    pintarSello();
  }
  arrastre = { dx: p[0] - sello!.left, dy: p[1] - sello!.bottom, id: e.pointerId };
  try {
    visor.setPointerCapture(e.pointerId);
  } catch {
    /* sin captura el arrastre sigue funcionando dentro del visor */
  }
  selloEl.dataset.arrastrando = "true";
  e.preventDefault();
});

visor.addEventListener("pointermove", (e) => {
  if (!arrastre || e.pointerId !== arrastre.id || !sello) return;
  const p = aPdf(e.clientX, e.clientY);
  if (!p) return;
  sello = limitar({ ...sello, left: p[0] - arrastre.dx, bottom: p[1] - arrastre.dy });
  pintarSello();
});

const soltar = (e: PointerEvent) => {
  if (arrastre && e.pointerId === arrastre.id) {
    arrastre = null;
    delete selloEl.dataset.arrastrando;
  }
};
visor.addEventListener("pointerup", soltar);
visor.addEventListener("pointercancel", soltar);

// Teclado: las flechas mueven el sello (con Mayús, más rápido)
selloEl.addEventListener("keydown", (e) => {
  if (!sello) return;
  const d = e.shiftKey ? 24 : 6;
  const mov: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] };
  const m = mov[e.key];
  if (!m) return;
  e.preventDefault();
  sello = limitar({ ...sello, left: sello.left + m[0], bottom: sello.bottom + m[1] });
  pintarSello();
});

tamano.addEventListener("input", () => {
  const escala = escalaActual();
  tamanoTexto.textContent = `${Math.round(escala * 100)} %`;
  mostrar(avisoQr, escala < 0.75);
  if (!sello) return;
  // Crece o se achica desde su centro
  const cx = sello.left + ancho(sello) / 2, cy = sello.bottom + alto(sello) / 2;
  const nuevo = { ...sello, escala };
  sello = limitar({ ...nuevo, left: cx - ancho(nuevo) / 2, bottom: cy - alto(nuevo) / 2 });
  pintarSello();
});

anterior.addEventListener("click", () => { if (pagina > 1) { pagina--; void dibujar(); } });
siguiente.addEventListener("click", () => { if (doc && pagina < doc.numPages) { pagina++; void dibujar(); } });
aquiSello.addEventListener("click", ponerEnEsquina);
$("a-firmar").addEventListener("click", () => ir("firmar"));

let redimension = 0;
new ResizeObserver(() => {
  cancelAnimationFrame(redimension);
  redimension = requestAnimationFrame(() => void dibujar());
}).observe(visor);

// ── 3. Firma ───────────────────────────────────────────────────────────────
function prepararPasoFirma() {
  aviso(errorFirmar, null);
  mostrar(firmaGuardada, Boolean(identidad));
  mostrar(camposFirma, !identidad);
  if (identidad) firmaTitular.textContent = identidad.titular;
}

function errorClave(mensaje: string | null) {
  aviso(claveError, mensaje);
  if (mensaje) inputClave.setAttribute("aria-invalid", "true");
  else inputClave.removeAttribute("aria-invalid");
}

verClave.addEventListener("click", () => {
  const ver = inputClave.type === "password";
  inputClave.type = ver ? "text" : "password";
  verClave.textContent = ver ? "Ocultar" : "Mostrar";
  verClave.setAttribute("aria-pressed", String(ver));
});
inputClave.addEventListener("input", () => errorClave(null));

$("otra-firma").addEventListener("click", () => {
  identidad = null;
  selloNombre.textContent = "Tu nombre";
  prepararPasoFirma();
  inputP12.focus();
});

const TEXTO_PASO: Record<PasoMotor, string> = {
  validando: "Revisando tu certificado…",
  firmando: "Firmando…",
  terminando: "Terminando…",
};

formFirma.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (ocupado || !archivoPdf || !sello) return;
  aviso(errorFirmar, null);
  errorClave(null);

  if (!identidad) {
    const f = inputP12.files?.[0];
    if (!f) {
      aviso(errorFirmar, "Elige el archivo de tu firma (.p12 o .pfx).");
      return inputP12.focus();
    }
    if (!inputClave.value) {
      errorClave("Escribe la clave de tu firma.");
      return inputClave.focus();
    }
    if (f.size > 200 * 1024) return aviso(errorFirmar, "Ese archivo es demasiado grande para ser una firma .p12.");
  }

  ocupado = true;
  botonFirmar.disabled = true;
  botonFirmar.textContent = "Abriendo tu firma…";
  try {
    if (!identidad) {
      // Deja pintar el texto del botón: abrir un .p12 tarda un momento en el celular
      await new Promise((r) => setTimeout(r, 30));
      try {
        identidad = abrirFirma(new Uint8Array(await inputP12.files![0]!.arrayBuffer()), inputClave.value);
      } catch (err) {
        const m = err instanceof ErrorFirma ? err.message : "No se pudo abrir tu firma.";
        if (/clave/i.test(m)) {
          errorClave("La clave no es correcta. Revísala e intenta de nuevo.");
          inputClave.select();
          inputClave.focus();
        } else {
          aviso(errorFirmar, m);
        }
        return;
      }
      inputClave.value = "";
      selloNombre.textContent = identidad.titular;
    }

    const r = await firmarPdf({
      motor,
      pdf: archivoPdf,
      identidad,
      sello: { ...sello, left: Number(sello.left.toFixed(2)), bottom: Number(sello.bottom.toFixed(2)) },
      alAvanzar: (p) => (botonFirmar.textContent = TEXTO_PASO[p]),
    });
    mostrarListo(r.pdf, r.firmante || identidad.titular, r.aviso);
  } catch (err) {
    aviso(errorFirmar, err instanceof ErrorFirma ? err.message : "No se pudo firmar el documento. Intenta de nuevo.");
  } finally {
    ocupado = false;
    botonFirmar.disabled = false;
    botonFirmar.textContent = "Firmar documento";
  }
});

// ── Listo ──────────────────────────────────────────────────────────────────
function mostrarListo(pdf: Blob, firmante: string, avisoMotor?: string) {
  if (firmado) URL.revokeObjectURL(firmado.url);
  const nombre = nombreFirmado(archivoPdf?.name ?? "documento.pdf");
  firmado = { blob: pdf, nombre, url: URL.createObjectURL(pdf) };
  descargar.href = firmado.url;
  descargar.download = nombre;
  listoDetalle.textContent = `${nombre}, firmado por ${firmante}.`;
  aviso(listoAviso, avisoMotor
    ? /revocaci/i.test(avisoMotor)
      ? "Tu entidad de certificación no respondió a tiempo para confirmar que tu certificado sigue vigente. La firma se hizo igual y puedes comprobarla en FirmaEC."
      : avisoMotor
    : null);
  const archivo = new File([pdf], nombre, { type: "application/pdf" });
  mostrar(compartir, typeof navigator.canShare === "function" && navigator.canShare({ files: [archivo] }));
  ir("listo");
}

compartir.addEventListener("click", async () => {
  if (!firmado) return;
  try {
    await navigator.share({ files: [new File([firmado.blob], firmado.nombre, { type: "application/pdf" })], title: firmado.nombre });
  } catch {
    /* la persona cerró el panel de compartir */
  }
});

$("firmar-otro").addEventListener("click", () => {
  // La firma sigue abierta: el siguiente documento solo pide ubicar el sello y firmar
  archivoPdf = null;
  sello = null;
  void cerrarDocumento();
  ir("documento");
});

window.addEventListener("beforeunload", () => {
  if (firmado) URL.revokeObjectURL(firmado.url);
});

tamanoTexto.textContent = `${tamano.value} %`;
ir("documento", { enfocar: false });
