---
name: Penké
description: Firma digital de PDFs en Ecuador, sin instalar nada extra
colors:
  penke-blue: "#2563EB"
  penke-blue-dark: "#1D4ED8"
  penke-teal: "#0E8F79"
  penke-teal-dark: "#0B6F5E"
  penke-dark: "#0F172A"
  penke-dark-2: "#1E293B"
  neutral-white: "#ffffff"
  neutral-mist: "#F8FAFC"
  neutral-fog: "#F1F5F9"
  neutral-vellum: "#E2E8F0"
  neutral-idle: "#94a3b8"
typography:
  display:
    fontFamily: "Alegreya, 'Iowan Old Style', serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Alegreya, 'Iowan Old Style', serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Public Sans, system-ui, -apple-system, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Public Sans, system-ui, -apple-system, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    letterSpacing: "0.06em"
  nav-label:
    fontFamily: "Public Sans, system-ui, -apple-system, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    letterSpacing: "0.02em"
  caption:
    fontFamily: "Public Sans, system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
  data:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.625rem"
rounded:
  frame: "4px"
  chip: "9999px"
  field: "2px"
spacing:
  section-y: "5rem"
  card-p: "1.75rem"
components:
  button-primary:
    backgroundColor: "{colors.penke-teal}"
    textColor: "#ffffff"
    rounded: "{rounded.chip}"
    padding: "14px 28px"
  button-primary-hover:
    backgroundColor: "{colors.penke-teal-dark}"
---

# Design System: Penké — Certificado de autenticidad

## Overview

**Creative North Star: "Certificado de autenticidad"**

Penké's world treats every screen as if it were the certificate it produces: a document worth trusting, not a SaaS dashboard asking to be trusted. The system is built on fine engraved-line ornament (a guilloché pattern borrowed from security paper and currency), a circular seal carrying the isotipo, and print-registration corner marks framing every screenshot — all rendered in solid committed color fields (deep navy, teal), never on cream or parchment. This is a deliberate rejection of the "diploma cliché" (warm cream ground, gold foil, serif-on-parchment): authenticity here is expressed through precision and engraving, not nostalgia.

This world replaced an earlier version of the page built from default Tailwind conventions (slate/blue palette, Inter, rounded-2xl shadow cards, bento grid) that a design critique identified as "specific content, generic form" — the copy was authentically Ecuadorian but the visual language was interchangeable with any dev-tool landing. The redesign keeps the fixed brand marks (the penke-blue/penke-teal isotipo) and product truth, and replaces everything else.

**Key Characteristics:**
- Committed color fields (deep navy, full-bleed) alternate with light "document" fields, never a wash of white cards on light gray.
- One recurring device — the guilloché engraving + seal + corner registration marks — appears at every trust-critical moment (hero, screenshots, download CTA), never diluted into a second motif.
- Serif display type (Alegreya) carries the certificate's gravity; a plain, government-service-grade sans (Public Sans) carries everything a visitor must read quickly.
- Numbered "clauses" (ghost serif numerals) replace icon-in-colored-square cards as the system's way of presenting a list.

## Colors

The palette is the fixed Penké brand mark (blue + teal) plus the existing near-black navy token, now used at page scale rather than as small accents.

### Primary
- **Penké Teal** (`#0E8F79` / hover `#0B6F5E`): the action color. Every primary CTA, the active tab underline, the seal's ring, and the guilloché engraving line all use this single hue. It never competes with itself — no gradient, no second accent tint.

### Secondary
- **Penké Blue** (`#2563EB`): brand-identity color, not action color. Used for the logo mark's "P" stroke, the headline's default ink is navy/white rather than blue, and blue appears again only in the corner marks of the light-background "Privacidad" attestation box, distinguishing it from the dark sections' teal corner marks.

### Neutral
- **Penké Dark** (`#0F172A`): the committed full-bleed ground for the hero, the screenshot-viewer section, and the download CTA. This is the "document" field, not a footer-only dark mode.
- **Neutral White** (`#ffffff`): the light document field's ground — page background, certificate-frame background, active-tab text on dark grounds.
- **Neutral Mist** (`#F8FAFC`) / **Neutral Fog** (`#F1F5F9`) / **Neutral Vellum** (`#E2E8F0`): the near-white step scale reserved for subtle field separation (bento grid gap lines, chip backgrounds) — never used as a "paper" texture, only as a flat tint.
- **Neutral Idle** (`#94a3b8`): the resting-state color for the ledger tabs before selection; the only place a mid-gray appears, since selection turns the label white against teal.

### Named Rules
**The One Motif Rule.** The guilloché engraving, the seal, and the corner registration marks are the system's only ornament. No other decorative pattern, gradient, or illustration style may appear alongside them.

## Typography

**Display Font:** Alegreya (serif, with `italic` used for the single emphasized phrase per headline)
**Body Font:** Public Sans (the USWDS government-service sans — chosen deliberately for its official-but-modern register, matching a product that stands next to a government certificate)
**Label/Mono Font:** JetBrains Mono, reserved for small verification-style data (screenshot title bars, tab-title readout)

**Character:** A literary/legal-adjacent serif (Alegreya was designed with academic and literary Latin American typesetting in mind) paired with a sans built for official digital services. The pairing reads as "this matters" without reading as antique.

### Hierarchy
- **Display** (700, `clamp(2.25rem, 5vw, 3.75rem)`, 1.08): hero H1 only. One phrase per headline is set in teal italic for emphasis — never the whole line.
- **Headline** (600, 1.875rem–2rem, 1.25): section headings ("Sin configuraciones complejas...", "Preguntas frecuentes"). No eyebrow/kicker label is ever placed above these; the heading carries its own weight.
- **Body** (400, 0.9375rem, 1.6, max ~62–68ch): all paragraph copy.
- **Label** (700, 0.6875rem, tracked +0.06em, uppercase): badges, "La app oficial" / "Penké" column headers in the comparison block.
- **Nav Label** (600, 0.8125rem, tracked +0.02em, uppercase): the header's primary navigation links — slightly larger than Label for click-target legibility.
- **Caption** (400, 0.75rem, 1.5): legal fine print (the independence-notice second line) — the smallest body-adjacent text on the page; never go smaller than this.
- **Data** (JetBrains Mono, 0.625rem): screenshot title-bar readouts only ("100% local", the active tab name).

### Named Rules
**The Serif-Is-Rare Rule.** Alegreya appears only in H1/H2-level headings, never in body copy, buttons, or labels — its gravity would be diluted if it were used everywhere.

## Layout

Full-bleed alternating "document fields": dark navy sections (hero, screenshot viewer, download CTA) bookend and punctuate light sections (features, privacy attestation, FAQ) at `max-w-6xl`/`max-w-5xl`/`max-w-3xl` per section, `py-20` rhythm throughout. Mobile collapses the header nav behind a hamburger (`#mobile-menu-btn`) rather than hiding it outright. The bento feature grid is a single-pixel-gap 3-column grid (`gap-px bg-slate-200`) rather than spaced shadow cards, so the grid lines themselves read as a ruled ledger sheet.

## Elevation & Depth

Flat by design. No drop shadows on cards or buttons at rest; the "certificate frame" components (`.cert-frame`, `.cert-frame-dark`) carry the only real elevation (`box-shadow` on the outer frame) because they represent a physical object — the app window — being presented, not a UI card floating for no reason.

### Shadow & Border Vocabulary
Outside Stitch's 8-prop component schema, so recorded here rather than in the frontmatter:
- **Frame lift** (`0 30px 60px -20px rgba(15, 23, 42, 0.35)` light / `0 30px 70px -20px rgba(15, 23, 42, 0.65)` dark): the certificate-frame's only shadow, simulating the mockup floating slightly off the page. Both use Penké Dark's RGB rather than pure black, so even the shadow stays on-palette.
- **Frame hairline** (`1px solid rgba(15,23,42,0.14)` light / `1px solid rgba(255,255,255,0.14)` dark): the frame's outer edge.
- **Security-thread white** (`rgba(255,255,255,0.4)`): the dashed line texture inside the corner ribbon, at 40% so it reads as a thread over teal rather than a solid stripe.

### Named Rules
**The Frame-Only Shadow Rule.** Shadows exist solely on the certificate-frame screenshot mockups. Every other surface (cards, buttons, the FAQ list) is flat, separated by hairline borders or single-pixel grid gaps instead.

## Shapes

Two corner languages, assigned by role: sharp/near-square (`rounded-sm`, 2–4px) for anything that represents a document, field, or frame (feature clause cells, the cert-frame mockups, the privacy attestation box); fully rounded pill (`rounded-full`) for anything that is an action or a status chip (buttons, nav badges, ledger tabs' underline-only active state has no fill so this doesn't apply to tabs themselves). Corner registration marks (`.corner-mark`, a small tick-and-circle SVG) mark the four corners of every framed element as a signature detail unique to this system.

## Components

### Buttons
- **Shape:** fully rounded (`rounded-full`).
- **Primary:** solid teal (`#0E8F79`) background, white text, bold, `hover:` darkens to `#0B6F5E` and lifts 2px (`hover:-translate-y-0.5`).
- **Secondary:** none in the current build — every call to action is the single teal primary button; the former dual-CTA (Windows / macOS-Linux) pattern was removed because it split attention on a promise the download page couldn't yet keep.

### Certificate Frame (signature component)
- The system's core custom component (`.cert-frame` / `.cert-frame-dark`), used for every app-screenshot mockup. A double-ruled border (outer 1px near-black/white-10%, inner 1px teal inset 7px), four corner registration marks, and a header strip with the wordmark in tracked small caps plus a small mono readout on the right (e.g. "100% local", the active screen name). Replaces the earlier generic macOS-traffic-light browser-chrome mockup.

### Seal (signature component)
- `<symbol id="penke-seal">`: a dashed outer ring, a solid inner ring, a white disc, and the two-tone isotipo centered inside at reduced scale. Used above the hero H1 and above the download-CTA heading — exactly twice, at the two highest-trust moments, never as decoration elsewhere.

### Clause Numeral (signature component)
- `.clause-numeral`: a large, low-opacity Alegreya serif numeral (01, 02, 1, 2...) marking each feature card, FAQ question, and comparison row. Replaces icon-in-colored-square cards as the system's list-item marker.

### Navigation
- Desktop: text nav in tracked-caps Public Sans, no active-state underline (single page, anchor links only). Mobile: hamburger toggles a full-width dropdown panel with the same four links, each row separated by a hairline.

### Ledger Tab (signature component)
- `.ledger-tab`: the screenshot-viewer's tab control. No pill background; `aria-selected="true"` turns text white and draws a 2px teal bottom border. Modeled on a ledger/folder index tab rather than a segmented control.

## Do's and Don'ts

### Do:
- **Do** keep the guilloché engraving, seal, and corner marks confined to trust-critical moments (hero, screenshots, privacy section, download CTA) — their power depends on not being everywhere.
- **Do** use Alegreya only at heading scale; Public Sans carries every other word on the page.
- **Do** keep every primary action as the single teal pill button; never reintroduce a second same-weight competing CTA.
- **Do** match the certificate-frame's aspect ratio to the actual screenshot assets (`1376/768`) rather than a generic `16/10` — cropping a real product screenshot breaks the "this is proof" premise the whole world depends on.

### Don't:
- **Don't** put an eyebrow/kicker label above a heading. The heading carries its own weight; this was a deliberate removal from the prior version.
- **Don't** use gradient text for emphasis. Emphasis is teal italic Alegreya, full weight, never a gradient fill.
- **Don't** reach for cream, parchment, or gold-foil textures to signal "official" — that is the diploma cliché this world was built to avoid. Authenticity here is engraved line work on solid color, not aged paper.
- **Don't** add a second decorative motif alongside the guilloché/seal/corner-mark system, even a subtle one.
