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

### F1 — Motor: firma diferida (penke-desktop/penke-backend)
- [ ] `PenkeSigner.preparar(...)`: revisión incremental con sello y /Contents vacío
      (`saveIncrementalForExternalSigning`) + bytes firmados del ByteRange.
- [ ] `FirmaDiferida`: atributos firmados (los mismos de `CmsSignatureSigner`), y
      `completar` que verifica la firma del navegador, arma el CMS y lo incrusta.
- [ ] `web/WebServer` (main aparte): solo `/salud`, `/v1/preparar`, `/v1/completar`;
      CORS solo para penke.nekateklabs.com; límites de tamaño y de peticiones por IP.
      El servidor de escritorio (`BackendServer`, rutas con archivos locales) no se expone.
- [ ] Pruebas: firma de punta a punta válida con `PdfSignatureVerifier`, dos sellos
      (dos firmas incrementales), firma alterada rechazada, PDF alterado rechazado.

### F2 — Motor en producción
- [ ] `Dockerfile` (Maven → JRE 21), servicio Cloud Run `penke-motor` en el proyecto
      `penke-e6555`, región `southamerica-west1`, público, sin estado.
- [ ] Prueba de salud y de firma contra la URL real.

### F3 — Página `/firmar` (penke-landing, Astro)
- [ ] Pasos: 1) PDF (arrastrar o elegir) · 2) firma .p12 + clave (se abre en el
      navegador; muestra titular y vigencia) · 3) tocar dónde va el sello, tamaño,
      página · 4) firmar → descargar o compartir (WhatsApp en el celular).
- [ ] Visor con pdf.js; coordenadas con `convertToPdfPoint` (igual que el escritorio).
- [ ] Móvil primero (375 px), botones ≥ 44 px, modo oscuro, accesible.
- [ ] Textos de privacidad honestos (qué viaja y qué no) y enlace a Penké de escritorio.
- [ ] Enlace «Firmar en la web» en la portada y el encabezado; `/privacidad` actualizada.

### F4 — Producción y verificación
- [ ] Probar con una firma real de Ecuador (Security Data, BCE, ANF…) y validar el PDF
      en FirmaEC (validador oficial) y en Adobe Acrobat.
- [ ] Publicar la web (App Hosting `penke-landing`).

### F5 — Chaski la recomienda
- [x] «firmar pdf» o un PDF enviado al chat → mensaje que recomienda Penké (2026-11-25).
- [ ] Enlace directo a `/firmar` y desplegar Chaski.

## Después (no entra en esta versión)
- Varias firmas en un paso y firma en lote desde la web.
- QR verificable en la web (requiere firmar también el registro en el navegador).
- Verificar firmas de un PDF desde la web (`/verificar`).
- Recordar la firma en el navegador (IndexedDB cifrado) para no elegir el .p12 cada vez.
