# Product
<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro + TailwindCSS (landing, Firebase App Hosting), Tauri 2 (Rust) + React 19 desktop app with a Java backend (PDFBox + Bouncy Castle) bundled with its own runtime.

## Users

Primary users: Profesionales legales, contadores y funcionarios públicos en Ecuador que necesitan firmar documentos PDF con certificados digitales (.p12 o Token USB). Audiencia secundaria: Ciudadanos y pequeñas empresas que requieren validar firmas PDF, y representantes legales que firman a nombre de su empresa.

## Product Purpose

Penké lets people in Ecuador sign, verify and validate PDF documents with their accredited certificate (.p12 file or Token USB) from a native desktop app that installs in one step, with nothing else to install.

Founder motivation: the official FirmaEC desktop app is old and workflow-hostile day to day — it forces you to reload your .p12 certificate every time you open the app, and to find the PDF to sign you must browse directory by directory with no drag-and-drop. Penké's core promise is the opposite: your signing profile stays saved, you drag the PDF from wherever it is, place your signature where it fits, and sign. This workflow simplicity leads marketing copy.

## Positioning

A modern desktop app for electronic signatures in Ecuador. Penké signs with its own engine (PAdES, PDFBox + Bouncy Castle); its signatures validate in the official FirmaEC validator and in Adobe Acrobat. It is independent from MINTEL. Day-to-day it wins on workflow: saved signing profile, drag-and-drop, a real PDF viewer to place (and resize) the stamp, the same signature on several pages at once, and sharing the signed PDF straight to WhatsApp or email.

## Operating Context

Professionals working with legal documents, contracts, reports and government forms who sign PDFs with accredited Ecuadorian certificates, from individual offices to institutions. The app runs on Windows, macOS and Linux desktops.

## Capabilities and Constraints

- Sign PDFs with a .p12 certificate or a Token USB (Windows certificate store / driver of the provider)
- Own signing engine: PAdES (ETSI.CAdES.detached); validated by FirmaEC and Adobe Acrobat
- Certificate validation against Ecuador's accredited certification entities, with OCSP/CRL revocation checks, before signing
- Stamp with the signer's data per certificate type (legal representative: position, company name, RUC; natural person: masked ID)
- QR in the stamp; optional verifiable QR that opens a verification page on penke.nekateklabs.com (a signed record with the stamp data and the document hash; the PDF itself is never uploaded)
- PDF viewer with continuous scroll; place the stamp with a click, drag it between pages, resize it (55%–200%), warnings when it covers an existing signature or the QR gets too small
- Multi-signature: the same signature on several pages of a document in one step
- Batch signing of several PDFs
- Verify signatures in a signed PDF; review a certificate's validity
- Share the signed PDF through the Windows share panel (WhatsApp, email, Teams)
- History of signed documents; saved profiles; password stored encrypted on the device
- Signed in-app updates
- PDFs, certificates and private keys never leave the device; only revocation checks and (if the user enables it) the verifiable-QR record go online
- Nothing else to install (runtime bundled)
- macOS build is not notarized by Apple: first launch needs right-click → Abrir
- Free of charge. Not open source: never claim MIT, GPL or a public repository

## Brand Commitments

- Free (no subscription, no usage limits)
- Focus on Ecuadorian market and accredited certificates
- Privacy-first: documents and keys stay on the device
- Simple, guided user experience
- Technical authority without complexity
- Independent from MINTEL; say so plainly

## Evidence on Hand

- Landing page at src/pages/index.astro
- Real app screenshots in public/screenshots/ (captured from the current UI with demo data)
- Releases for Windows (.exe), macOS (.dmg, universal) and Linux (.deb, .rpm) served through /descargar
- Verification pages at /v/<id>
- Contact: hola@nekateklabs.com

## Product Principles

1. Local-first: all cryptographic processing occurs on the user's device
2. Zero-configuration: one installer, nothing else to install
3. Ecuador-integrated: accredited-certificate validation, stamp data for companies, local place names
4. Free for personal, professional and government use
5. Workflow-first: saved profiles, drag-and-drop, visual stamp placement, multi-signature, share
