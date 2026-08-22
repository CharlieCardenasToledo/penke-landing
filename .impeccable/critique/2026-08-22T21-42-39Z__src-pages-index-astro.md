---
target: landing de Penké (src/pages/index.astro), contrastada contra el producto real firmaec-tauri
total_score: 19
max_score: 36
na_heuristics: 7
p0_count: 1
p1_count: 2
timestamp: 2026-08-22T21-42-39Z
slug: src-pages-index-astro
---
Method: dual-agent (A: a78ae15fa58759dd1 · B: a51e4e38ae2cf2ad8)

## Design Health Score

| # | Heurística | Score | Hallazgo clave |
|---|---|---|---|
| 1 | Visibilidad del estado del sistema | 2/4 | Nav superior no marca la sección activa al scrollear; enlaces externos sin ícono de "abre en otra pestaña". |
| 2 | Match con el mundo real | 1/4 | El botón "Ver instaladores macOS / Linux" enlaza a una página de releases que **solo contiene instaladores de Windows** (verificado). Badge "v1.0.1" pero el único release en GitHub es v1.0.0. |
| 3 | Control y libertad del usuario | 3/4 | Página de una sola vista, scroll libre, sin modales ni trampas. |
| 4 | Consistencia y estándares | 2/4 | Logo inline usa `#38BDF8` (celeste) en vez del teal de marca `#0E8F79`; tres etiquetas distintas para "descargar"; tab "Gestor de Perfiles" no existe en la app real. |
| 5 | Prevención de errores | 1/4 | Cero detección de OS del visitante antes de mostrarle un botón que no aplica a su sistema. |
| 6 | Reconocimiento antes que recuerdo | 3/4 | Nav con texto, tabs numerados y etiquetados — salvo el mismatch de nombre en el tab 02. |
| 7 | Flexibilidad y eficiencia | n/a | No aplica a landing en modo Persuade. |
| 8 | Estética y diseño minimalista | 3/4 | Composición limpia; confirmado por detector: 13 tipos de hallazgo en overlay (contraste, nested-cards, gradient-text) que matizan el score. |
| 9 | Ayuda a reconocer/recuperar errores | 1/4 | El único "error" real que puede vivir un visitante (no encontrar su instalador) no tiene mensaje ni guía. |
| 10 | Ayuda y documentación | 3/4 | FAQ de 5 preguntas bien resuelto (privacidad, costo, compatibilidad, validación). |

**Total: 19/36** (heurística 7 excluida por no aplicar a modo Persuade) ≈ 53% → banda **Acceptable**. El déficit se concentra en las heurísticas 2, 5 y 9 — las tres golpeadas por la misma causa raíz: la landing promete disponibilidad multiplataforma que hoy no existe.

## Design Specificity Verdict

**LLM (Assessment A)**: Contenido específico, forma genérica. El copy está anclado en la realidad ecuatoriana (BCE, Consejo de la Judicatura, Security Data, provincias/cantones/parroquias, `localhost:8765`, JRE 17 empaquetado, aviso legal de independencia frente al MINTEL) — nadie escribe eso para una landing SaaS genérica. Pero la composición (hero centrado + badge + bento grid de 5 features + sección oscura con tabs + arquitectura + FAQ acordeón + CTA final oscuro) es el esqueleto intercambiable de cualquier landing de dev-tool 2024, con la paleta slate/blue-600/emerald por defecto de Tailwind sin inflexión propia. Si se reemplazara todo el texto ecuatoriano por copy de un SaaS genérico, la estructura visual sobreviviría intacta.

**Escaneo determinístico (Assessment B)**: `detect.mjs --json src/` (exit 2) encontró 4 hallazgos vía análisis estático: `gray-on-color` (línea 75 del `.astro`), `overused-font` (Inter al 98% del texto, vía `global.css`) y `gradient-text` x2 (vía `global.css`, líneas 54 y 60). Escanear solo el archivo `.astro` (sin seguir el import de CSS) subestima los hallazgos a 1 de 4 — nota metodológica para futuras corridas de `/impeccable audit`.

**Overlays visuales (inyección en navegador, confirmada, no fallback)**: en desktop y mobile el overlay `impeccable` reportó 13 tipos de hallazgo: contraste bajo en 9 elementos (badge de versión 4.3:1, subtítulo del mockup 4.3:1, "127.0.0.1:8765" 2.4:1, las 4 etiquetas FRONTEND/SHELL NATIVO/MOTOR FIRMA/LICENCIA a 2.6:1, nota legal del footer 4.2:1, copyright 4.2:1 — todas por debajo del mínimo AA 4.5:1), `gradient-text` en el titular del hero, `tight-leading` (1.11x) en el subtítulo, `line-length` >90 caracteres en 6 párrafos, `dark-glow` en 2 CTAs (matizado como uso de marca deliberado, no ruido), `nested-cards` x3 (matizado: son mockups de ventana tipo macOS/Windows, patrón intencional) y `tiny-text` en el footer legal. Ningún hallazgo del overlay es falso positivo puro; los de `dark-glow` y `nested-cards` están señalados por el propio Assessment B como uso de marca intencional más que antipatrón real.

**Adicional del detector que Assessment A no cubrió**: el patrón de scroll-reveal (`opacity:0` + `IntersectionObserver`, `global.css:93-102` / `index.astro:520-529`) no tiene fallback `prefers-reduced-motion` ni `<noscript>` — si JS falla, **todo el contenido bajo el hero queda invisible permanentemente**. Es un antipatrón real de content-hiding pre-JS, no cosmético.

## Overall Impression

La página tiene una honestidad técnica genuina en su sección de arquitectura y su FAQ — habla el idioma exacto de un contador o abogado ecuatoriano frustrado con Java. Pero esa honestidad se rompe justo en el momento de mayor fricción: el CTA de descarga promete instaladores de macOS y Linux que no existen en el único release publicado. Es el peor lugar posible para una promesa falsa (regla peak-end: lo último que vive el visitante es el clic de descarga), y compone con una segunda discrepancia de versión (v1.0.1 anunciada vs. v1.0.0 publicada). La mayor oportunidad no es rediseñar la composición — es cerrar la brecha entre lo que el marketing promete y lo que el repositorio entrega, y solo después pulir tipografía/contraste/jerarquía.

## What's Working

1. **El detalle técnico como señal de confianza**: mostrar `127.0.0.1:8765` en el mockup y explicarlo ("proceso local secundario vía comunicación HTTP interna cifrada") es un gesto de transparencia que ninguna landing genérica inventaría — construye credibilidad real ante un público que sabe reconocer marketing vacío.
2. **La FAQ responde miedos reales**: las 5 preguntas cubren exactamente las objeciones que tendría un usuario de FirmaEC/MINTEL frustrado con Java (privacidad, costo, compatibilidad, validación de certificados).
3. **El marco de "ventana nativa" en los mockups** ancla visualmente que esto es una app de escritorio real, reforzando el posicionamiento sin necesitar texto adicional.

## Priority Issues

**[P0] El botón "Ver instaladores macOS / Linux" enlaza a una página que solo tiene instaladores de Windows**
- **Why it matters**: promesa falsa verificable en dos clics (confirmado vía `gh release view`: el único release, v1.0.0, contiene solo `Penke.EC_1.0.0_x64-setup.exe` y `.msi`). Golpea las heurísticas 2, 5 y 9 a la vez y es el hallazgo que tanto Assessment A como la revisión de producto identificaron de forma independiente como el más dañino, precisamente porque ataca la confianza en un producto que maneja llaves privadas y documentos legales.
- **Fix — dos caminos, no mutuamente excluyentes**:
  1. *Fix de diseño (rápido, en esta landing)*: quitar el botón "Ver instaladores macOS / Linux" y el link duplicado del CTA final hasta que existan builds reales, o cambiar la etiqueta a "macOS / Linux — próximamente" deshabilitado visualmente; considerar detección de OS para mostrar un único CTA correcto.
  2. *Fix de raíz (en `firmaec-tauri`, no en esta landing)*: el `ci.yml` actual solo corre checks en `ubuntu-latest` (frontend/backend/rust), no hay ningún job que empaquete `.dmg`/`.AppImage`/`.deb`. Ahora que **macOS es GA en runners hospedados por GitHub** (ver enlace compartido: macOS 26 GA en GitHub-hosted runners, feb-2026), es viable agregar una matriz de build (`macos-latest`, `ubuntu-latest`, `windows-latest`) con `tauri-action` para generar y publicar los bundles de macOS/Linux reales en el próximo release — así la promesa de la landing se vuelve cierta en vez de eliminarse. Esto es trabajo en el repo `firmaec-tauri`, separado de este proyecto de landing.
- **Suggested command**: `/impeccable harden` en esta landing (mientras no exista el build); el trabajo de CI/CD es una tarea aparte en `firmaec-tauri`, fuera del alcance de los comandos de Impeccable.

**[P1] Desalineación de versión: la landing anuncia "v1.0.1", GitHub solo tiene publicado "v1.0.0"**
- **Why it matters**: el badge del header y el título del mockup muestran una versión que no coincide con el release descargable — la segunda discrepancia "promete más de lo que existe" en la misma sesión de un visitante, erosionando la credibilidad de las afirmaciones de privacidad 100% local.
- **Fix**: sincronizar el número de versión mostrado con el tag real del último release publicado, o publicar v1.0.1 antes de anunciarlo.
- **Suggested command**: `/impeccable harden`.

**[P1] El tab "02. Gestor de Perfiles" no corresponde a ninguna pantalla real de la app**
- **Why it matters**: la captura `firmar.jpg` muestra "Mis firmas" / nav "Firmar" — el término "Gestor de Perfiles" no existe en la app. Un primerizo que memoriza ese nombre y luego abre la app real no encuentra esa pantalla, generando una micro-duda de "¿instalé la versión correcta?" en el momento más frágil del onboarding. Nótese que ni el propio código es consistente consigo mismo: el script JS interno usa `tabTitleMap["firmar"] = "02_perfiles_guardados.png"`.
- **Fix**: renombrar el tab a la terminología real ("02. Mis Firmas" o "02. Perfiles guardados", pero coherente con lo que la app muestra).
- **Suggested command**: `/impeccable clarify`.

**[P2] La navegación desaparece por completo en móvil, sin reemplazo**
- **Why it matters**: `nav` usa `hidden md:flex` sin botón hamburguesa. Un visitante en teléfono pierde acceso directo a "Seguridad" y "FAQ" —las dos secciones que construyen la confianza necesaria antes de instalar software de firma digital— y debe scrollear a ciegas.
- **Fix**: agregar un menú hamburguesa mínimo, o promover "FAQ"/"Seguridad" como chips visibles bajo el hero en mobile.
- **Suggested command**: `/impeccable adapt`.

**[P3] El isotipo de marca se redibuja mal en el header/hero: color del check equivocado**
- **Why it matters**: el SVG inline duplica el logo con `stroke="#38BDF8"` (celeste) en vez del teal oficial `#0E8F79` (confirmado como token en `global.css` y en el favicon real, que sí usa el color correcto). En una marca que se vende por precisión técnica, que su propio logo esté mal reproducido en la vitrina principal es una señal de descuido.
- **Fix**: reemplazar el SVG inline por una referencia directa a `public/brand/penke-isotipo.svg`.
- **Suggested command**: `/impeccable polish`, con `/impeccable document` como seguimiento para fijar tokens de marca.

## Persona Red Flags

**Jordan (primerizo confundido)**: hace clic en "Ver instaladores macOS / Linux" esperando algo para su Mac y solo ve archivos `.exe`/`.msi` — nada en la página le explica si el sitio está roto o su sistema no es soportado. Lee "JRE 17", "PKCS#11" y "motor criptográfico" acumulados sin glosario en la misma sección. Ve el tab "Gestor de Perfiles" en las capturas, instala la app, y no encuentra esa pantalla.

**Riley (que prueba los límites)**: verifica el link de macOS/Linux en menos de 10 segundos y confirma que es un callejón sin salida — lo marca como el defecto más obvio y dañino porque es trivial de comprobar y contradice una promesa explícita. Descarga el instalador, ve que el binario real es `1.0.0` no `1.0.1`, y a partir de ahí duda del resto de afirmaciones de la página (incluida "100% local, nada sale de tu equipo"). No encuentra changelog enlazado desde la landing para auditar independientemente los cambios.

**Casey (usuario móvil distraído)**: sin nav visible en móvil, no puede saltar a "Seguridad" para calmar su duda de privacidad antes de descargar. Los dos CTAs del hero (Windows / macOS-Linux) tienen peso visual casi idéntico y apilado en mobile — alta probabilidad de tocar el botón equivocado por error de pulgar, terminando en el callejón sin salida de GitHub. Confirmado además por Assessment B: los tabs de capturas miden solo 34px de alto (bajo el mínimo de 44px) y los enlaces de footer solo 16px.

## Minor Observations

- Tres etiquetas distintas para "descargar" (`Obtener Penké`, `Descargar gratis para Windows`, `Descargar desde GitHub Releases`) — unificar ayuda al reconocimiento.
- Dos convenciones distintas de "chrome de ventana" en la misma página: puntos de semáforo a color en el hero vs. grises monocromos en la sección de capturas.
- Typo en FAQ: "e aislada" → "y aislada".
- Contraste AA fallido (4.2–4.3:1, bajo el mínimo 4.5:1) en: badge de versión, subtítulo del mockup, etiquetas FRONTEND/SHELL NATIVO/MOTOR FIRMA/LICENCIA, nota legal y copyright del footer.
- Sin `prefers-reduced-motion` ni fallback para el patrón de scroll-reveal — si JS falla, el contenido bajo el hero queda invisible de forma permanente.
- El indicador "Compatible con: BCE • Security Data • Consejo Judicatura" es buena prueba social específica; podría reforzarse con logos reales en vez de solo texto.

## Questions to Consider

- ¿Qué pasaría si el CTA de descarga detectara el sistema operativo del visitante y mostrara un solo botón correcto, en vez de forzar a adivinar cuál de los dos aplica?
- La sección de arquitectura es la parte más "Penké" de todo el sitio — específica, verificable, con números de puerto reales. ¿Qué pasaría si esa misma honestidad estructural se extendiera a ser igual de transparente sobre qué sistemas operativos soporta *hoy*, en vez de solo en el roadmap?
- ¿Vale más la pena, dado que macOS ya es GA en runners hospedados de GitHub, invertir en publicar builds reales de macOS/Linux antes que en ocultar el botón?
