// Penké Web, página /firmar: asistente de tres pasos (documento → ubicación → firma).
// La firma (.p12) y su clave solo se usan aquí, en el navegador: ver src/lib/firma-web.ts.
//
// Además:
//  - ?chaski=<token>: abre el PDF que la persona mandó a Chaski por WhatsApp y, al
//    firmarlo, se lo devuelve al chat (src/penke de Chaski).
//  - Varias firmas por documento («+ Otra firma», «En todas las hojas»).
//  - Varios PDF a la vez: las firmas van en el mismo lugar en todos.
//  - QR verificable opcional y «recordar mi archivo de firma» (IndexedDB; nunca la clave).
import * as pdfjs from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { zipSync } from "fflate";
import {
  abrirFirma, ErrorFirma, ESCALA_MAX, ESCALA_MIN, firmarDocumento, MAX_SELLOS, nombreFirmado, nuevoIdQr, registrarQr,
  SELLO_ALTO_PT, SELLO_ANCHO_PT, type Identidad, type Paso as PasoMotor, type Sello,
} from "../lib/firma-web";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_DOCUMENTOS = 10;
const MARGEN_PT = 18;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

type Paso = "documento" | "ubicar" | "firmar" | "listo";
const ORDEN: Paso[] = ["documento", "ubicar", "firmar", "listo"];

const raiz = $("firmador");
const motor = raiz.dataset.motor ?? "";
const chaskiApi = raiz.dataset.chaski ?? "";

// Paso 1
const inputPdf = $<HTMLInputElement>("pdf");
const zona = $("zona-pdf");
const pdfError = $("pdf-error");
const pdfCargando = $("pdf-cargando");
// Paso 2
const avisoChaski = $("aviso-chaski");
const documentoNombre = $("documento-nombre");
const documentoLote = $("documento-lote");
const navegacion = $("navegacion");
const visor = $("visor");
const lienzo = $<HTMLCanvasElement>("lienzo");
const capaSellos = $("sellos");
const sellosOtras = $("sellos-otras");
const paginaTexto = $("pagina-texto");
const anterior = $<HTMLButtonElement>("pagina-anterior");
const siguiente = $<HTMLButtonElement>("pagina-siguiente");
const botonOtra = $<HTMLButtonElement>("otra-firma");
const botonTodas = $<HTMLButtonElement>("todas-hojas");
const botonQuitar = $<HTMLButtonElement>("quitar-firma");
const cuentaFirmas = $("cuenta-firmas");
const tamano = $<HTMLInputElement>("tamano");
const tamanoTexto = $("tamano-texto");
const avisoQr = $("aviso-qr");
const casillaQr = $<HTMLInputElement>("qr-verificable");
// Paso 3
const formFirma = $<HTMLFormElement>("form-firma");
const firmaAbierta = $("firma-abierta");
const firmaRotulo = $("firma-rotulo");
const firmaTitular = $("firma-titular");
const campoArchivo = $("campo-archivo");
const campoClave = $("campo-clave");
const campoRecordar = $("campo-recordar");
const inputP12 = $<HTMLInputElement>("p12");
const inputClave = $<HTMLInputElement>("clave");
const casillaRecordar = $<HTMLInputElement>("recordar");
const verClave = $<HTMLButtonElement>("ver-clave");
const claveError = $("clave-error");
const errorFirmar = $("error-firmar");
const botonFirmar = $<HTMLButtonElement>("firmar");
// Listo
const listoTitulo = $("listo-titulo");
const listoDetalle = $("listo-detalle");
const listoAviso = $("listo-aviso");
const listoQr = $("listo-qr");
const chaskiEstado = $("chaski-estado");
const chaskiError = $("chaski-error");
const chaskiReintentar = $<HTMLButtonElement>("chaski-reintentar");
const listaFirmados = $("lista-firmados");
const descargar = $<HTMLAnchorElement>("descargar");
const compartir = $<HTMLButtonElement>("compartir");

// ── Estado ─────────────────────────────────────────────────────────────────
let paso: Paso = "documento";
let documentos: File[] = [];
let doc: pdfjs.PDFDocumentProxy | null = null; // el primero: sobre él se ubican las firmas
let carga: pdfjs.PDFDocumentLoadingTask | null = null;
let identidad: Identidad | null = null;
/** Archivo de firma recordado en este navegador (sin la clave). */
let guardada: FirmaGuardada | null = null;
let pagina = 1;
let vista: pdfjs.PageViewport | null = null; // píxeles CSS de la hoja mostrada
let caja: number[] = [0, 0, 595, 842]; // page.view de la hoja mostrada, en puntos PDF
let sellos: Sello[] = [];
let activo = 0;
let resultados: { nombre: string; blob: Blob; url: string }[] = [];
let chaski: { token: string } | null = null;
let ocupado = false;
let renderTarea: { cancel: () => void } | null = null;
let urlZip: string | null = null;

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

// ── 1. Documento(s) ────────────────────────────────────────────────────────
async function cerrarDocumento() {
  renderTarea?.cancel();
  const anterior = carga;
  carga = null;
  doc = null;
  await anterior?.destroy().catch(() => {});
}

const esPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);

async function cargarDocumentos(archivos: File[], desdeChaski = false) {
  aviso(pdfError, null);
  const pdfs = archivos.filter(esPdf);
  if (!pdfs.length) return aviso(pdfError, "Elige un archivo PDF.");
  if (pdfs.length > MAX_DOCUMENTOS) return aviso(pdfError, `Puedes firmar hasta ${MAX_DOCUMENTOS} PDF a la vez.`);
  const pesado = pdfs.find((f) => f.size > MAX_PDF_BYTES);
  if (pesado) return aviso(pdfError, `«${pesado.name}» pesa más de 20 MB. Prueba con uno más liviano.`);
  if (!desdeChaski) chaski = null;
  mostrar(pdfCargando, true);
  try {
    const datos = new Uint8Array(await pdfs[0]!.arrayBuffer());
    if (!new TextDecoder("latin1").decode(datos.subarray(0, 1024)).includes("%PDF-")) {
      return aviso(pdfError, `«${pdfs[0]!.name}» no es un PDF.`);
    }
    await cerrarDocumento();
    try {
      // Copia: pdf.js se queda con el buffer que recibe
      carga = pdfjs.getDocument({ data: datos.slice() });
      doc = await carga.promise;
    } catch (e) {
      const protegido = (e as { name?: string })?.name === "PasswordException";
      return aviso(pdfError, protegido
        ? `«${pdfs[0]!.name}» tiene contraseña. Quítasela y vuelve a elegirlo.`
        : `No se pudo abrir «${pdfs[0]!.name}». Puede estar dañado.`);
    }
    documentos = pdfs;
    documentoNombre.textContent = pdfs[0]!.name;
    documentoNombre.title = pdfs[0]!.name;
    aviso(documentoLote, pdfs.length > 1
      ? `y ${pdfs.length - 1} ${pdfs.length === 2 ? "documento más" : "documentos más"}: las firmas irán en el mismo lugar en todos`
      : null);
    mostrar(avisoChaski, Boolean(chaski));
    mostrar(navegacion, doc.numPages > 1);
    // Como en Penké de escritorio: la firma se propone abajo a la derecha de la última hoja
    pagina = doc.numPages;
    sellos = [];
    activo = 0;
    ir("ubicar");
    await dibujar();
    if (!sellos.length) agregarSello();
    setTimeout(selloALaVista, 650);
  } finally {
    mostrar(pdfCargando, false);
    inputPdf.value = "";
  }
}

inputPdf.addEventListener("change", () => {
  const fs = [...(inputPdf.files ?? [])];
  if (fs.length) void cargarDocumentos(fs);
});
zona.addEventListener("dragover", (e) => {
  e.preventDefault();
  zona.dataset.encima = "true";
});
zona.addEventListener("dragleave", () => delete zona.dataset.encima);
zona.addEventListener("drop", (e) => {
  e.preventDefault();
  delete zona.dataset.encima;
  void cargarDocumentos([...(e.dataTransfer?.files ?? [])]);
});
$("cambiar-pdf").addEventListener("click", () => {
  chaski = null;
  ir("documento");
  inputPdf.click();
});

// ── 2. Ubicación de las firmas ─────────────────────────────────────────────
async function dibujar() {
  if (!doc || paso !== "ubicar") return;
  const p = await doc.getPage(pagina);
  const base = p.getViewport({ scale: 1 });
  // En la computadora la hoja entera tiene que caber en la pantalla: si no, el sello (abajo a la
  // derecha) queda fuera de la vista. En el celular usa todo el ancho y la vista baja sola hasta él.
  const disponible = visor.parentElement?.clientWidth || 340;
  const celular = window.matchMedia("(max-width: 639px)").matches;
  const encima = visor.getBoundingClientRect().top - raiz.getBoundingClientRect().top;
  const altoMax = Math.max(360, window.innerHeight - 80 - encima - 16);
  const anchoCss = Math.floor(celular ? disponible : Math.min(disponible, (altoMax * base.width) / base.height));
  visor.style.width = `${anchoCss}px`;
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
  pintarSellos();
  try {
    await tarea.promise;
  } catch {
    /* lo canceló un dibujo más nuevo */
  }
  paginaTexto.textContent = `Hoja ${pagina} de ${doc.numPages}`;
  anterior.disabled = pagina <= 1;
  siguiente.disabled = pagina >= doc.numPages;
}

const limitarEn = (s: Sello, [x0, y0, x1, y1]: number[]): Sello => ({
  ...s,
  left: Math.max(x0!, Math.min(x1! - ancho(s), s.left)),
  bottom: Math.max(y0!, Math.min(y1! - alto(s), s.bottom)),
});
const limitar = (s: Sello) => limitarEn(s, caja);

const escalaActual = () => Math.max(ESCALA_MIN, Math.min(ESCALA_MAX, Number(tamano.value) / 100));

/** Una firma nueva en la hoja visible: abajo a la derecha, o más arriba si ya hay otra ahí. */
function agregarSello() {
  if (sellos.length >= MAX_SELLOS) return;
  const escala = escalaActual();
  const [, y0, x1] = caja;
  let bottom = y0! + MARGEN_PT;
  while (sellos.some((s) => s.pagina === pagina && Math.abs(s.bottom - bottom) < SELLO_ALTO_PT * escala)) {
    bottom += SELLO_ALTO_PT * escala + 8;
  }
  sellos.push(limitar({ pagina, escala, left: x1! - SELLO_ANCHO_PT * escala - MARGEN_PT, bottom }));
  activo = sellos.length - 1;
  pintarSellos();
}

/** Copia la posición de la firma activa (relativa a su hoja) en todas las hojas. */
async function enTodasLasHojas() {
  if (!doc) return;
  const s = sellos[activo];
  if (!s) return;
  const origen = (await doc.getPage(s.pagina)).view;
  const fx = (s.left - origen[0]!) / (origen[2]! - origen[0]!);
  const fy = (s.bottom - origen[1]!) / (origen[3]! - origen[1]!);
  const nuevos: Sello[] = [];
  for (let n = 1; n <= Math.min(doc.numPages, MAX_SELLOS); n++) {
    const v = (await doc.getPage(n)).view;
    nuevos.push(limitarEn({ pagina: n, escala: s.escala, left: v[0]! + fx * (v[2]! - v[0]!), bottom: v[1]! + fy * (v[3]! - v[1]!) }, v));
  }
  sellos = nuevos;
  activo = Math.min(pagina, nuevos.length) - 1;
  pintarSellos();
}

function pintarSellos() {
  const nombre = identidad?.titular ?? guardada?.titular ?? "Tu nombre";
  const enEsta = sellos.map((s, i) => ({ s, i })).filter(({ s }) => s.pagina === pagina);
  capaSellos.replaceChildren();
  if (vista) {
    for (const { s, i } of enEsta) {
      // Dos esquinas, igual que Penké de escritorio: sirve también en hojas giradas
      const [a, b] = vista.convertToViewportPoint(s.left, s.bottom);
      const [c, d] = vista.convertToViewportPoint(s.left + ancho(s), s.bottom + alto(s));
      const w = Math.abs(c - a), h = Math.abs(d - b);
      const el = document.createElement("div");
      el.className = "sello";
      el.dataset.i = String(i);
      el.dataset.activo = String(i === activo);
      el.tabIndex = 0;
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", `Firma ${i + 1} de ${sellos.length}. Usa las flechas para moverla.`);
      // En % del visor: no se mueve si cambia el ancho de la pantalla
      el.style.left = `${(Math.min(a, c) / vista.width) * 100}%`;
      el.style.top = `${(Math.min(b, d) / vista.height) * 100}%`;
      el.style.width = `${(w / vista.width) * 100}%`;
      el.style.height = `${(h / vista.height) * 100}%`;
      el.style.fontSize = `${Math.max(5, Math.min(w, h * 3) / 22)}px`;
      const qr = document.createElement("span");
      qr.className = "sello-qr";
      const texto = document.createElement("span");
      texto.className = "sello-texto";
      const rotulo = document.createElement("span");
      rotulo.className = "sello-rotulo";
      rotulo.textContent = "Firmado electrónicamente por:";
      const quien = document.createElement("span");
      quien.className = "sello-nombre";
      quien.textContent = nombre;
      texto.append(rotulo, quien);
      el.append(qr, texto);
      capaSellos.append(el);
    }
  }
  const otras = sellos.filter((s) => s.pagina !== pagina);
  aviso(sellosOtras, otras.length
    ? `${enEsta.length ? "También hay" : "Tus firmas están en"} ${otras.length === 1 ? "una firma" : `${otras.length} firmas`} en ${
        [...new Set(otras.map((s) => s.pagina))].length === 1 ? `la hoja ${otras[0]!.pagina}` : "otras hojas"}. Toca la hoja para poner aquí la firma seleccionada.`
    : null);
  cuentaFirmas.textContent = sellos.length > 1 ? `${sellos.length} firmas` : "";
  mostrar(botonQuitar, sellos.length > 1);
  mostrar(botonTodas, Boolean(doc && doc.numPages > 1));
  botonOtra.disabled = sellos.length >= MAX_SELLOS;
  const s = sellos[activo];
  if (s) {
    tamano.value = String(Math.round(s.escala * 100));
    tamanoTexto.textContent = `${tamano.value} %`;
    mostrar(avisoQr, s.escala < 0.75);
  }
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
  const tocado = (e.target as HTMLElement).closest<HTMLElement>(".sello");
  if (tocado) {
    activo = Number(tocado.dataset.i);
  } else {
    // Toque en la hoja: la firma seleccionada se centra ahí (y pasa a esta hoja)
    if (!sellos.length) agregarSello();
    const s = sellos[activo]!;
    sellos[activo] = limitar({ ...s, pagina, left: p[0] - ancho(s) / 2, bottom: p[1] - alto(s) / 2 });
  }
  const s = sellos[activo]!;
  arrastre = { dx: p[0] - s.left, dy: p[1] - s.bottom, id: e.pointerId };
  try {
    visor.setPointerCapture(e.pointerId);
  } catch {
    /* sin captura el arrastre sigue funcionando dentro del visor */
  }
  pintarSellos();
  capaSellos.querySelector<HTMLElement>(`.sello[data-i="${activo}"]`)?.setAttribute("data-arrastrando", "true");
  e.preventDefault();
});

visor.addEventListener("pointermove", (e) => {
  if (!arrastre || e.pointerId !== arrastre.id) return;
  const p = aPdf(e.clientX, e.clientY);
  const s = sellos[activo];
  if (!p || !s) return;
  sellos[activo] = limitar({ ...s, left: p[0] - arrastre.dx, bottom: p[1] - arrastre.dy });
  pintarSellos();
  capaSellos.querySelector<HTMLElement>(`.sello[data-i="${activo}"]`)?.setAttribute("data-arrastrando", "true");
});

const soltar = (e: PointerEvent) => {
  if (arrastre && e.pointerId === arrastre.id) {
    arrastre = null;
    pintarSellos();
  }
};
visor.addEventListener("pointerup", soltar);
visor.addEventListener("pointercancel", soltar);

// Teclado: Tab llega a cada firma; las flechas la mueven (con Mayús, más rápido)
capaSellos.addEventListener("focusin", (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>(".sello");
  if (el && Number(el.dataset.i) !== activo) {
    activo = Number(el.dataset.i);
    pintarSellos();
    capaSellos.querySelector<HTMLElement>(`.sello[data-i="${activo}"]`)?.focus();
  }
});
capaSellos.addEventListener("keydown", (e) => {
  const s = sellos[activo];
  if (!s) return;
  const d = e.shiftKey ? 24 : 6;
  const mov: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] };
  const m = mov[e.key];
  if (!m) return;
  e.preventDefault();
  sellos[activo] = limitar({ ...s, left: s.left + m[0], bottom: s.bottom + m[1] });
  pintarSellos();
  capaSellos.querySelector<HTMLElement>(`.sello[data-i="${activo}"]`)?.focus();
});

tamano.addEventListener("input", () => {
  const escala = escalaActual();
  tamanoTexto.textContent = `${Math.round(escala * 100)} %`;
  mostrar(avisoQr, escala < 0.75);
  const s = sellos[activo];
  if (!s) return;
  // Crece o se achica desde su centro
  const cx = s.left + ancho(s) / 2, cy = s.bottom + alto(s) / 2;
  const nuevo = { ...s, escala };
  sellos[activo] = limitar({ ...nuevo, left: cx - ancho(nuevo) / 2, bottom: cy - alto(nuevo) / 2 });
  pintarSellos();
});

botonOtra.addEventListener("click", () => {
  agregarSello();
  selloALaVista();
});
botonTodas.addEventListener("click", () => void enTodasLasHojas());
botonQuitar.addEventListener("click", () => {
  if (sellos.length <= 1) return;
  sellos.splice(activo, 1);
  activo = Math.max(0, Math.min(activo, sellos.length - 1));
  pintarSellos();
});
anterior.addEventListener("click", () => { if (pagina > 1) { pagina--; void dibujar(); } });
siguiente.addEventListener("click", () => { if (doc && pagina < doc.numPages) { pagina++; void dibujar(); } });
$("a-firmar").addEventListener("click", () => {
  if (!sellos.length) agregarSello();
  ir("firmar");
});

/** Si la firma seleccionada quedó fuera de la vista (pantalla baja o barra fija), la desplaza hasta ella. */
function selloALaVista() {
  const el = capaSellos.querySelector<HTMLElement>(`.sello[data-i="${activo}"]`);
  if (!el) return;
  const r = el.getBoundingClientRect();
  const barra = raiz.querySelector<HTMLElement>('section[data-paso="ubicar"] .acciones')?.getBoundingClientRect();
  const abajo = barra && barra.top < window.innerHeight ? barra.top : window.innerHeight;
  if (r.bottom > abajo - 12) window.scrollBy({ top: r.bottom - abajo + 24, behavior: "smooth" });
  else if (r.top < 76) window.scrollBy({ top: r.top - 88, behavior: "smooth" });
}

// Se observa el contenedor (no el visor, cuyo ancho fija dibujar()) para no entrar en un bucle
let redimension = 0;
let ultimaMedida = "";
const redibujar = () => {
  cancelAnimationFrame(redimension);
  redimension = requestAnimationFrame(() => void dibujar());
};
new ResizeObserver(() => {
  const medida = `${visor.parentElement?.clientWidth}x${window.innerHeight}`;
  if (medida === ultimaMedida) return;
  ultimaMedida = medida;
  redibujar();
}).observe(visor.parentElement!);
window.addEventListener("resize", redibujar);

// ── Firma recordada (IndexedDB): el archivo .p12, nunca la clave ───────────
interface FirmaGuardada { nombre: string; bytes: Uint8Array; titular: string; validoHasta: string }

function baseFirmas(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const r = indexedDB.open("penke-web", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("firma");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
}
async function leerGuardada(): Promise<FirmaGuardada | null> {
  try {
    const db = await baseFirmas();
    return await new Promise((ok) => {
      const r = db.transaction("firma").objectStore("firma").get("actual");
      r.onsuccess = () => ok((r.result as FirmaGuardada | undefined) ?? null);
      r.onerror = () => ok(null);
    });
  } catch {
    return null;
  }
}
async function guardarFirma(f: FirmaGuardada | null) {
  try {
    const db = await baseFirmas();
    const st = db.transaction("firma", "readwrite").objectStore("firma");
    if (f) st.put(f, "actual");
    else st.delete("actual");
  } catch {
    /* sin almacenamiento (ventana privada): simplemente no se recuerda */
  }
}

// ── 3. Firma ───────────────────────────────────────────────────────────────
function prepararPasoFirma() {
  aviso(errorFirmar, null);
  const conArchivo = Boolean(identidad || guardada);
  mostrar(firmaAbierta, conArchivo);
  mostrar(campoArchivo, !conArchivo);
  mostrar(campoRecordar, !conArchivo);
  mostrar(campoClave, !identidad);
  if (identidad) {
    firmaRotulo.textContent = "Firmas como";
    firmaTitular.textContent = identidad.titular;
  } else if (guardada) {
    firmaRotulo.textContent = "Tu firma guardada en este navegador";
    firmaTitular.textContent = guardada.titular;
  }
  const n = documentos.length;
  botonFirmar.textContent = n > 1 ? `Firmar ${n} documentos` : "Firmar documento";
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

$("otra-firma-archivo").addEventListener("click", () => {
  identidad = null;
  if (guardada) {
    guardada = null;
    void guardarFirma(null); // «Usar otra» también olvida la recordada
  }
  pintarSellos();
  prepararPasoFirma();
  inputP12.focus();
});

const TEXTO_PASO: Record<PasoMotor, string> = {
  validando: "Revisando tu certificado",
  firmando: "Firmando",
  terminando: "Terminando",
};

/** Las firmas del primer documento, llevadas a otro: mismas hojas (la última sigue siendo la última) y misma posición relativa. */
async function sellosPara(archivo: File, indice: number): Promise<Sello[]> {
  if (indice === 0 || !doc) return sellos;
  const tarea = pdfjs.getDocument({ data: new Uint8Array(await archivo.arrayBuffer()) });
  try {
    const otro = await tarea.promise;
    const salida: Sello[] = [];
    for (const s of sellos) {
      const origen = (await doc.getPage(s.pagina)).view;
      const hoja = s.pagina === doc.numPages ? otro.numPages : Math.min(s.pagina, otro.numPages);
      const v = (await otro.getPage(hoja)).view;
      const fx = (s.left - origen[0]!) / (origen[2]! - origen[0]!);
      const fy = (s.bottom - origen[1]!) / (origen[3]! - origen[1]!);
      salida.push(limitarEn({ pagina: hoja, escala: s.escala, left: v[0]! + fx * (v[2]! - v[0]!), bottom: v[1]! + fy * (v[3]! - v[1]!) }, v));
    }
    return salida;
  } catch {
    throw new ErrorFirma(`No se pudo abrir «${archivo.name}».`);
  } finally {
    await tarea.destroy().catch(() => {});
  }
}

formFirma.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (ocupado || !documentos.length || !sellos.length) return;
  aviso(errorFirmar, null);
  errorClave(null);

  let archivoFirma: Uint8Array | null = null;
  if (!identidad) {
    if (guardada) {
      archivoFirma = guardada.bytes;
    } else {
      const f = inputP12.files?.[0];
      if (!f) {
        aviso(errorFirmar, "Elige el archivo de tu firma (.p12 o .pfx).");
        return inputP12.focus();
      }
      if (f.size > 200 * 1024) return aviso(errorFirmar, "Ese archivo es demasiado grande para ser una firma .p12.");
      archivoFirma = new Uint8Array(await f.arrayBuffer());
    }
    if (!inputClave.value) {
      errorClave("Escribe la clave de tu firma.");
      return inputClave.focus();
    }
  }

  ocupado = true;
  botonFirmar.disabled = true;
  botonFirmar.textContent = "Abriendo tu firma…";
  try {
    if (!identidad && archivoFirma) {
      // Deja pintar el texto del botón: abrir un .p12 tarda un momento en el celular
      await new Promise((r) => setTimeout(r, 30));
      try {
        identidad = abrirFirma(archivoFirma, inputClave.value);
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
      if (!guardada && casillaRecordar.checked) {
        guardada = { nombre: inputP12.files?.[0]?.name ?? "firma.p12", bytes: archivoFirma, titular: identidad.titular, validoHasta: identidad.validoHasta.toISOString() };
        void guardarFirma(guardada);
      }
    }

    const yo = identidad;
    if (!yo) return;
    for (const r of resultados) URL.revokeObjectURL(r.url);
    resultados = [];
    let avisoMotor: string | undefined;
    let urlQr: string | undefined;
    let qrFallo = false;
    const varios = documentos.length > 1;
    for (const [i, archivo] of documentos.entries()) {
      const qrId = casillaQr.checked ? nuevoIdQr() : undefined;
      const r = await firmarDocumento({
        motor,
        pdf: archivo,
        identidad: yo,
        sellos: await sellosPara(archivo, i),
        qrId,
        alAvanzar: (p, n, total) => {
          const cual = varios ? ` ${i + 1} de ${documentos.length}` : total > 1 ? ` (firma ${n} de ${total})` : "";
          botonFirmar.textContent = `${TEXTO_PASO[p]}${cual}…`;
        },
      });
      avisoMotor ??= r.aviso;
      if (qrId && r.perfil && r.fecha && r.serie) {
        try {
          urlQr = await registrarQr({ identidad: yo, id: qrId, pdf: r.pdf, perfil: r.perfil, fecha: r.fecha, serie: r.serie });
        } catch {
          qrFallo = true;
        }
      }
      const nombre = nombreFirmado(archivo.name);
      resultados.push({ nombre, blob: r.pdf, url: URL.createObjectURL(r.pdf) });
    }
    mostrarListo(yo.titular, avisoMotor, urlQr, qrFallo);
  } catch (err) {
    aviso(errorFirmar, err instanceof ErrorFirma ? err.message : "No se pudo firmar. Intenta de nuevo.");
  } finally {
    ocupado = false;
    botonFirmar.disabled = false;
    prepararPasoFirma();
  }
});

// ── Listo ──────────────────────────────────────────────────────────────────
function mostrarListo(firmante: string, avisoMotor?: string, urlQr?: string, qrFallo = false) {
  const varios = resultados.length > 1;
  listoTitulo.textContent = varios ? `Tus ${resultados.length} documentos están firmados` : "Tu documento está firmado";
  const sellosTexto = sellos.length > 1 ? ` con ${sellos.length} firmas` : "";
  listoDetalle.textContent = varios
    ? `Firmados por ${firmante}${sellosTexto}.`
    : `${resultados[0]!.nombre}, firmado por ${firmante}${sellosTexto}.`;
  aviso(listoAviso, avisoMotor
    ? /revocaci/i.test(avisoMotor)
      ? "Tu entidad de certificación no respondió a tiempo para confirmar que tu certificado sigue vigente. La firma se hizo igual y puedes comprobarla en FirmaEC."
      : avisoMotor
    : null);
  if (urlQr && !varios) {
    listoQr.replaceChildren("Cualquiera puede comprobar la firma con el QR o en ", Object.assign(document.createElement("a"), {
      href: urlQr, textContent: urlQr.replace(/^https?:\/\//, ""), className: "font-medium text-brand underline", target: "_blank", rel: "noopener",
    }), ".");
    mostrar(listoQr, true);
  } else if (qrFallo) {
    listoQr.textContent = "El documento quedó firmado, pero no se pudo publicar el registro del QR: quien lo escanee verá «registro no encontrado».";
    mostrar(listoQr, true);
  } else {
    mostrar(listoQr, false);
  }

  // Varios: lista con cada PDF y un .zip con todos
  listaFirmados.replaceChildren();
  if (varios) {
    for (const r of resultados) {
      const li = document.createElement("li");
      const nombre = Object.assign(document.createElement("span"), { textContent: r.nombre, className: "min-w-0 truncate" });
      const a = Object.assign(document.createElement("a"), { href: r.url, download: r.nombre, textContent: "Descargar", className: "enlace inline-flex items-center shrink-0" });
      li.append(nombre, a);
      listaFirmados.append(li);
    }
  }
  mostrar(listaFirmados, varios);
  void prepararDescarga();

  // Desde Chaski: se devuelve solo al chat; la descarga queda como respaldo
  aviso(chaskiError, null);
  mostrar(chaskiReintentar, false);
  aviso(chaskiEstado, null);
  descargar.className = chaski ? "boton-secundario" : "boton-principal";
  if (chaski && !varios) void enviarAChaski();

  const archivo = new File([resultados[0]!.blob], resultados[0]!.nombre, { type: "application/pdf" });
  mostrar(compartir, !varios && typeof navigator.canShare === "function" && navigator.canShare({ files: [archivo] }));
  ir("listo");
}

async function prepararDescarga() {
  if (resultados.length === 1) {
    descargar.href = resultados[0]!.url;
    descargar.download = resultados[0]!.nombre;
    descargar.textContent = "Descargar PDF";
    return;
  }
  const archivos: Record<string, Uint8Array> = {};
  for (const r of resultados) {
    let nombre = r.nombre;
    for (let n = 2; archivos[nombre]; n++) nombre = r.nombre.replace(/\.pdf$/i, ` (${n}).pdf`);
    archivos[nombre] = new Uint8Array(await r.blob.arrayBuffer());
  }
  const zip = new Blob([new Uint8Array(zipSync(archivos, { level: 0 }))], { type: "application/zip" });
  if (urlZip) URL.revokeObjectURL(urlZip);
  urlZip = URL.createObjectURL(zip);
  descargar.href = urlZip;
  descargar.download = "documentos-firmados.zip";
  descargar.textContent = "Descargar todos (.zip)";
}

async function enviarAChaski() {
  if (!chaski || !resultados[0]) return;
  aviso(chaskiError, null);
  mostrar(chaskiReintentar, false);
  chaskiEstado.textContent = "Enviándolo a tu WhatsApp…";
  mostrar(chaskiEstado, true);
  try {
    const r = await fetch(`${chaskiApi}/penke/entregar/${chaski.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/pdf" },
      body: resultados[0].blob,
    });
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (r.status === 409) {
        chaskiEstado.textContent = "Ya te lo enviamos a tu WhatsApp.";
        return;
      }
      throw new Error(j.error || "No pude enviarlo a tu WhatsApp.");
    }
    chaskiEstado.textContent = "Listo, te lo envié a tu WhatsApp. Revisa el chat con Chaski.";
  } catch (e) {
    mostrar(chaskiEstado, false);
    aviso(chaskiError, `${(e as Error).message || "No pude enviarlo a tu WhatsApp."} Puedes descargarlo desde aquí.`);
    mostrar(chaskiReintentar, true);
  }
}
chaskiReintentar.addEventListener("click", () => void enviarAChaski());

compartir.addEventListener("click", async () => {
  const r = resultados[0];
  if (!r) return;
  try {
    await navigator.share({ files: [new File([r.blob], r.nombre, { type: "application/pdf" })], title: r.nombre });
  } catch {
    /* la persona cerró el panel de compartir */
  }
});

$("firmar-otro").addEventListener("click", () => {
  // La firma sigue abierta: el siguiente documento solo pide ubicar las firmas y firmar
  documentos = [];
  sellos = [];
  chaski = null;
  void cerrarDocumento();
  ir("documento");
});

window.addEventListener("beforeunload", () => {
  for (const r of resultados) URL.revokeObjectURL(r.url);
});

// ── Inicio ─────────────────────────────────────────────────────────────────
async function abrirDesdeChaski(token: string) {
  // El token no se queda en la barra de direcciones (ni en el historial al compartir la pantalla)
  history.replaceState(null, "", location.pathname);
  mostrar(pdfCargando, true);
  pdfCargando.textContent = "Abriendo el documento que mandaste a Chaski…";
  try {
    const r = await fetch(`${chaskiApi}/penke/documento/${encodeURIComponent(token)}`);
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error || "No se pudo abrir el documento de Chaski.");
    }
    const nombre = decodeURIComponent(r.headers.get("X-Penke-Nombre") ?? "documento.pdf");
    chaski = { token };
    await cargarDocumentos([new File([await r.blob()], nombre, { type: "application/pdf" })], true);
  } catch (e) {
    aviso(pdfError, `${(e as Error).message} También puedes elegir el PDF aquí.`);
  } finally {
    mostrar(pdfCargando, false);
    pdfCargando.textContent = "Abriendo el documento…";
  }
}

tamanoTexto.textContent = `${tamano.value} %`;
ir("documento", { enfocar: false });
void leerGuardada().then((g) => {
  guardada = g && Date.parse(g.validoHasta) > Date.now() ? g : null;
  if (g && !guardada) void guardarFirma(null); // la recordada venció
});
const tokenChaski = new URLSearchParams(location.search).get("chaski");
if (tokenChaski && /^[A-Za-z0-9_-]{20,100}$/.test(tokenChaski)) void abrirDesdeChaski(tokenChaski);
