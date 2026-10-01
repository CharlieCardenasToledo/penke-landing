---
name: Penké
description: Firma electrónica de PDF en Ecuador — landing de producto
colors:
  ink: "#0B1220"
  ink-soft: "#334155"
  ink-muted: "#5B6577"
  line: "#E3E8EF"
  mist: "#F5F7FA"
  white: "#FFFFFF"
  brand: "#2563EB"
  brand-dark: "#1D4ED8"
  brand-deep: "#1E3A8A"
  brand-tint: "#EFF4FF"
  valid: "#0E8F79"
typography:
  display:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "1.875rem–2.25rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "1rem–1.125rem"
    fontWeight: 600
  body:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "1rem (1.125rem en introducciones)"
    fontWeight: 400
    lineHeight: 1.75
  caption:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.75rem–0.875rem"
    fontWeight: 400
rounded:
  focus: "6px"
  control: "12px"
  card: "16px"
  app-window: "14px"
  chip: "9999px"
spacing:
  section-y: "5rem (6rem desde sm)"
  gutter: "1.25rem (2rem desde sm)"
  container: "72rem (max-w-6xl)"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    height: "48px en el hero, 40–44px en el resto"
  button-primary-hover:
    backgroundColor: "{colors.brand-dark}"
  button-secondary:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    border: "1px {colors.line}"
    rounded: "{rounded.control}"
---

# Design System: Penké (landing)

## Idea

**La app se demuestra sola.** La landing es la de un producto terminado: fondo blanco, un solo color de acción y capturas reales de Penké (con datos de demostración) donde otras páginas de la categoría ponen ilustraciones, sellos o promesas. Reemplaza al sistema anterior ("Certificado de autenticidad": guilloché, sellos, marcas de esquina, numerales serif), que se leía como MVP ornamental.

Escena: profesionales en una oficina con luz de día, en un portátil o un monitor. Por eso el tema es claro.

## Color

Estrategia **contenida**: neutros más un acento, con un único campo comprometido.

- **Tinta** `#0B1220` para titulares; **tinta suave** `#334155` para lectura; **tinta atenuada** `#5B6577` para texto secundario (≥ 4.5:1 sobre blanco y sobre niebla).
- **Niebla** `#F5F7FA` alterna secciones; **línea** `#E3E8EF` para todos los bordes y divisores.
- **Azul de acción** `#2563EB` (hover `#1D4ED8`): el mismo `bg-blue-600` de los botones de la app. Es el único color de acción de la página.
- **Azul profundo** `#1E3A8A`: el único campo de color a toda anchura, la banda de descarga que cierra la página.
- **Verde de validez** `#0E8F79`: el check del isotipo. Solo para marcas de verificación ("Validadas en FirmaEC", "Con Penké", "Se queda en tu equipo"), nunca para botones.

### Regla del azul único
Todo lo que se pulsa es azul `#2563EB` o un botón blanco con borde. El verde nunca es acción.

## Tipografía

**Public Sans** en toda la página (la sans del sistema de servicios digitales del gobierno de EE. UU.: registro oficial pero moderno, acorde a un producto que convive con un certificado). Sin serif ni mono decorativa.

- **Display** (H1): 800, `clamp(2.25rem, 5vw, 3.75rem)`, interlineado 1.08, tracking −0.025em. Solo en el hero y en el título de páginas internas.
- **Titular** (H2): 700, 1.875–2.25rem, tracking −0.02em.
- **Título** (H3 de tarjetas): 600, 1–1.125rem.
- **Cuerpo**: 400, 1rem, interlineado 1.75; introducciones de sección en 1.125rem. Medida máxima ~65 caracteres.
- **Pie/leyendas**: 0.75–0.875rem, nunca más pequeño.
- Las cifras y códigos (RUC, huella SHA-256) usan la mono del sistema.

## Composición

- Contenedor `max-w-6xl` con márgenes de 20 px (32 px desde `sm`). Ritmo vertical de sección `py-20`/`sm:py-24`, con más aire sobre un titular que debajo.
- **Primera pantalla**: titular centrado de dos líneas, subtítulo, botón azul "Descargar para <tu sistema>" (detectado; en teléfonos, "Ver descargas") y botón secundario "Otros sistemas"; debajo, la captura grande del visor de firma, que sube una vez al cargar (respeta `prefers-reduced-motion`). Una franja de niebla detrás de la mitad inferior de la captura la ancla.
- Orden de la página: hero → confianza (entidades + tres checks) → tres pasos → filas alternas con capturas (Inicio, Verificar) → cuadrícula de seis funciones → comparación con la app oficial → privacidad (qué se queda / qué usa internet) → preguntas → banda de descarga.
- Las listas de funciones son una cuadrícula con líneas de 1 px (`gap-px` sobre el color de línea), no tarjetas con sombra.

## Superficies

- Plano por defecto: tarjetas blancas con borde `#E3E8EF`, radio 16 px, sin sombra.
- **Ventana de la app** (`.app-shot`): la única superficie con sombra, porque representa un objeto real. Radio 14 px, borde oscuro al 12 %, sombra `0 24px 60px -28px rgba(15,23,42,.35)`.
- Controles con radio 12 px (como los botones de la app); chips y pastillas en radio completo.

## Componentes

- **Encabezado**: fijo, blanco translúcido con desenfoque; el borde y una sombra suave aparecen al desplazarse. Logo, cuatro anclas (ocultas en móvil) y botón "Descargar".
- **Botón primario**: azul, texto blanco, 600, icono de descarga a la izquierda.
- **Botón secundario**: blanco con borde de línea; hover a niebla.
- **Tarjeta de sistema** (descarga): blanca sobre el azul profundo; la del sistema del visitante se resalta con un anillo azul claro. macOS lleva la nota de primera apertura (clic derecho → Abrir), porque el instalador no está notarizado.
- **Preguntas**: `<details>` nativo, divisores de línea, un "+" que gira 45° al abrir.
- **Iconos**: lucide (el mismo set de la app), trazo 2 px, en cuadrados de 36–40 px con fondo `#EFF4FF` cuando acompañan una función.

## Imágenes

Capturas reales de la app en `public/screenshots/`, tomadas de la interfaz actual con datos ficticios (María José Peña Villavicencio, Andina Logística S.A., contrato ADM-2026-0147). WebP 2000×1250 para la página y `og-penke.jpg` 1200×630 para compartir. Al cambiar la interfaz de la app, se vuelven a capturar; nunca se sustituyen por maquetas dibujadas.

## Lo que no se hace

- Nada de guilloché, sellos, marcas de esquina, numerales decorativos ni serif.
- Nada de degradados, vidrio ni ilustraciones genéricas.
- No se afirma que Penké sea de código abierto ni se enlaza a GitHub.
- No se usa el verde como color de botón.
