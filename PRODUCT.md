# Product
<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro + TailwindCSS, Tauri 2 (Rust) + React 19 for desktop app

## Users

Primary users: Profesionales legales, contadores y funcionarios públicos en Ecuador que necesitan firmar documentos PDF con certificados digitales (.p12 o Token USB). Audiencia secundaria: Ciudadanos y pequeñas empresas que requieren validar firmas PDF.

## Product Purpose

Penké enables digital signing, verification, and validation of PDF documents using Ecuadorian government-accredited certificates (.p12 files or Token USB/HSM) without requiring manual Java installation. The product eliminates the primary barrier to digital adoption in Ecuador's public and private sectors by packaging the execution environment in a native, ultra-fast application.

Founder motivation (from the creator, not just the Java-install pain): the official FirmaEC desktop app is old and workflow-hostile day to day — it forces you to reload your .p12 certificate every time you open the app, and to find the PDF to sign you must browse directory by directory with no drag-and-drop. Penké's core promise is the opposite: your signing profile stays saved, and you just drag the PDF from wherever it is, place your signature, and sign. This workflow simplicity, not only the absence of Java, is the product's primary differentiator and should lead marketing copy over the Java-install point.

## Positioning

The only digital signing solution for Ecuador that removes Java entirely from the user experience, combining Tauri-native GUI performance with the official MINTEL FirmaDigital engine running locally via encrypted internal HTTP communication. Day-to-day, it wins on workflow: a saved signing profile and drag-and-drop file selection, replacing FirmaEC's reload-your-certificate-every-time and browse-folder-by-folder friction.

## Operating Context

Professionals working with legal documents, contracts, and government forms who need to sign PDFs using accredited Ecuadorian certificates. Used in environments ranging from individual professional offices to government departments. The application runs on Windows, macOS, and Linux desktops.

## Capabilities and Constraints

- Sign PDFs using .p12 certificate files with password protection
- Sign PDFs using Token USB/HSM devices (PKCS#11 native support)
- Verify PDF digital signatures and certificate validity
- Validate certificate chains against CRL and official accreditation
- Batch processing of multiple PDF files
- Integrated Ecuadorian location autocomplete (Provinces, Cantons, Parroquias)
- 100% local execution - no PDF or private key leaves the user's device
- No Java installation required on user's system
- Open source under MIT license (engine FirmaDigital under GPL v3)

## Brand Commitments

- Open source and free (MIT license)
- Focus on Ecuadorian market and government-accredited certificates
- Privacy-first: all processing local, nothing transmitted externally
- Simple, guided user experience ("step-by-step" onboarding)
- Technical authority without complexity

## Evidence on Hand

- Landing page at src/pages/index.astro
- Desktop app UI with screenshot assets in /screenshots/
- Architecture diagram in landing page describing Tauri 2 + FirmaDigital MINTEL
- FAQ section with 5 common questions and answers
- GitHub repository: CharlieCardenasToledo/penke-ec
- Released installers: Windows only as of the v1.0.0 GitHub release (verified via `gh release view`); macOS and Linux CI jobs added 2026-08-22 but no multi-platform release has shipped yet

## Product Principles

1. Local-first: All cryptographic processing occurs on the user's device
2. Zero-configuration: No Java installation, no environment variable setup
3. Ecuador-integrated: Native support for local address autocomplete and certificate validation
4. Accessibility: Free and open source for personal, professional, and governmental use
5. Performance: Native Tauri runtime for responsive UI without electron overhead
6. Workflow-first: saved signing profiles and drag-and-drop file selection remove FirmaEC's repeat-certificate-load and folder-hunting friction