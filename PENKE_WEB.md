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

### F4 — Producción y verificación
- [x] Web publicada (App Hosting publica sola con cada push a master).
- [ ] **Pendiente:** firmar con una firma real de Ecuador (Security Data, BCE, ANF…) en
      https://penke.nekateklabs.com/firmar y validar el PDF en FirmaEC y en Adobe Acrobat.
      Con la CA de prueba todo verifica íntegro con el verificador de Penké.

### F5 — Chaski la recomienda · HECHA 2026-11-25
- [x] «firmar pdf» o un PDF enviado al chat → mensaje con el enlace a `/firmar` (chaski 2336df2).
- [x] Chaski desplegado en producción (revisión chaski-00056-f2b).

## Después (no entra en esta versión)
- Varias firmas en un paso y firma en lote desde la web.
- QR verificable en la web (requiere firmar también el registro en el navegador).
- Verificar firmas de un PDF desde la web (`/verificar`).
- Recordar la firma en el navegador (IndexedDB cifrado) para no elegir el .p12 cada vez.
