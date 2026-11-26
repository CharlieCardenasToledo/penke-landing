# Penké Web — firmar PDFs desde el navegador

Plan y estado. Empezado el 2026-11-25. Objetivo: que cualquiera firme un PDF con su
firma electrónica (.p12) desde `penke.nekateklabs.com/firmar`, sin instalar nada, y
que Chaski (facturación por WhatsApp) mande ahí a quien pide «firmar un PDF».

## La promesa que no se rompe

Penké promete que **la firma (.p12) y su clave nunca salen del equipo**. En la web eso
se cumple con una firma en dos pasos:

```
Navegador                                   Motor Penké (Cloud Run, Java)
─────────                                   ─────────────────────────────
abre el .p12 con la clave (node-forge)
manda PDF + certificado PÚBLICO + sello ──► valida el certificado (entidades de Ecuador,
                                            OCSP/CRL), dibuja el sello, guarda la revisión
                                            incremental con /Contents vacío y calcula los
                                            atributos firmados (PAdES, signing-certificate-v2)
                       ◄── PDF preparado + atributos a firmar
firma los atributos con la clave privada
(RSA/ECDSA SHA-256) — la clave no viaja
manda PDF preparado + firma            ──► verifica la firma con la clave pública, arma el
                                            CMS y lo incrusta en /Contents
                       ◄── PDF firmado (PAdES, ETSI.CAdES.detached)
```

- El motor es **sin estado**: no guarda el PDF, ni sesiones, ni registros. Todo vive en
  memoria durante la petición.
- El PDF sí viaja al motor (por HTTPS) porque PDFBox arma la revisión y el sello. La
  página lo dice con claridad. Para quien no quiere que el PDF salga del equipo:
  Penké de escritorio.
- Es el mismo motor de Penké de escritorio (PenkeSigner, PenkeStampPainter,
  CertValidator): la firma valida igual en FirmaEC y en Adobe Acrobat. Las firmas que
  ya tenga el PDF siguen válidas (revisión incremental).

## Fases

### F1 — Motor: firma diferida (penke-desktop/penke-backend) · HECHA 2026-11-25 (5fbb3c9)
- [x] `PenkeSigner.prepare(...)`: revisión incremental con sello y /Contents vacío
      (`saveIncrementalForExternalSigning`) + bytes firmados del ByteRange.
- [x] `FirmaDiferida`: atributos firmados (los mismos de `CmsSignatureSigner`), y
      `completar` que verifica la firma del navegador, arma el CMS y lo incrusta.
- [x] `web/WebServer` (main aparte): solo `/salud`, `/v1/preparar`, `/v1/completar`;
      CORS solo para penke.nekateklabs.com; 20 MB por PDF; 60 peticiones por IP cada 10 min.
      El servidor de escritorio (`BackendServer`, rutas con archivos locales) no se expone.
- [x] Pruebas (`FirmaDiferidaTest`): firma válida con `PdfSignatureVerifier`, dos firmas
      incrementales, firma con otra clave rechazada, PDF alterado rechazado.

### F2 — Motor en producción · HECHA 2026-11-25
- [x] `Dockerfile` (Maven → JRE 21), Cloud Run `penke-motor` en `penke-e6555`,
      `southamerica-west1`, público, sin estado, 1 GiB, máx. 3 instancias:
      https://penke-motor-217485644640.southamerica-west1.run.app
- [x] Salud (arranque en frío ~1,1 s), CORS solo del dominio, y una firma de prueba
      rechazada con «no fue emitido por una entidad de certificación acreditada en Ecuador».
- Redesplegar: `gcloud run deploy penke-motor --source penke-desktop/penke-backend --project penke-e6555 --region southamerica-west1` (mismas opciones).
- Probar contra un motor local con CA de prueba: `scripts/probar-firma-web.ts` (ver su cabecera).

### F3 — Página `/firmar` (penke-landing, Astro) · HECHA 2026-11-25 (6e72feb)
- [x] Asistente de tres pasos con una sola acción por pantalla: documento (avanza solo)
      → ubicación (el sello ya viene abajo a la derecha de la última hoja) → firma
      (.p12 + clave + «Firmar», sin botón aparte para abrir la firma) → descargar o compartir.
- [x] Visor con pdf.js 6; coordenadas con `convertToPdfPoint`/`convertToViewportPoint`
      (igual que el escritorio); tocar, arrastrar, flechas del teclado, tamaño 55–200 %.
- [x] Móvil primero (375 px): acciones fijas abajo, botones ≥ 44 px, la hoja entera cabe.
- [x] «Firmar otro documento» conserva la firma abierta: el segundo PDF solo pide ubicar y firmar.
- [x] Textos revisados contra patrones de escritura de IA; diseño pasado por el detector
      de impeccable (sin hallazgos en la página). Colores de error agregados a DESIGN.md.
- [x] Enlaces en la portada y el encabezado, sitemap y `/privacidad` (sección 7).

### F4 — Producción y verificación · HECHA 2026-11-25
- [x] Web publicada (App Hosting publica sola con cada push a master).
- [x] Primera firma real (2026-11-25, FirmaSegura de Charlie Cárdenas): el verificador de Penké da íntegra y certificado VÁLIDO (cadena de Ecuador + revocación en línea).
- [x] Arreglado: en la computadora la hoja era más alta que la ventana y el sello quedaba fuera de la vista; ahora la hoja entera cabe (691f4d6).
- [x] El usuario confirmó el 2026-11-25 que funciona de punta a punta con su firma real (ubicación del sello y validación).

### F5 — Chaski la recomienda · HECHA 2026-11-25
- [x] «firmar pdf» o un PDF enviado al chat → mensaje con el enlace a `/firmar` (chaski 2336df2).
- [x] Chaski desplegado en producción (revisión chaski-00056-f2b).

## Segunda etapa (2026-11-25): todo lo que faltaba

### F6 — Chaski ↔ Penké de punta a punta · HECHA
- [x] Mandas el PDF al chat de Chaski → enlace de un solo uso a `/firmar?chaski=<token>`
      que abre Penké Web con ese documento (el token se borra de la barra de direcciones).
- [x] Al firmar, Penké devuelve el PDF a Chaski (`POST /penke/entregar/<token>`) y Chaski
      lo manda al chat una sola vez; la descarga queda como respaldo.
- [x] Chaski guarda el PDF como máximo 1 hora, borra el original al entregar, el barrido
      borra lo vencido; en Firestore solo queda el hash del token; 20 por número y día.
      Código: `chaski/src/penke/servicio.ts`, rutas en `chaski/src/app.ts`, pruebas en
      `chaski/test/penke.test.ts`.

### F7 — Varias firmas en un documento · HECHA
- [x] «+ Otra firma», «En todas las hojas» (misma posición relativa en cada hoja),
      «Quitar esta»; hasta 20. Cada firma es una firma incremental (como el escritorio).

### F8 — Verificar firmas (`/verificar`) · HECHA
- [x] Motor `POST /v1/verificar` (PdfSignatureVerifier en memoria) y página con el
      veredicto y cada firma: quién, entidad, fecha, integridad y estado del certificado.

### F9 — QR verificable · HECHA
- [x] Casilla opcional: el navegador elige el id, el motor dibuja el QR con `/v/<id>` y
      devuelve el perfil; el navegador firma el registro (CMS separado, node-forge) y lo
      publica en `/api/v/registrar`. Compatibilidad forge ↔ pkijs probada en
      `scripts/probar-registro-qr.ts`.

### F10 — Recordar la firma · HECHA
- [x] Opcional: el .p12 queda en IndexedDB del navegador; la clave nunca se guarda.
      «Usar otra» lo olvida; si venció, se borra solo.

### F11 — Varios PDF a la vez · HECHA
- [x] Hasta 10 PDF; las firmas van en el mismo lugar relativo de cada documento (la
      última hoja sigue siendo la última). Descarga uno por uno o todo en un .zip (fflate).

## Ideas para después
- Firma con token USB desde la web (necesitaría un componente local).
- Plantillas de posición guardadas (como los perfiles del escritorio).
