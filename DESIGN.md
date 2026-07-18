---
name: Local 947 Special Separation Calculator
description: A trustworthy, firefighter-first retirement benefit estimator.
colors:
  command-navy: "oklch(0.22 0.05 275)"
  command-navy-hover: "oklch(0.28 0.06 275)"
  local-947-gold: "oklch(0.82 0.16 78)"
  focus-gold: "oklch(0.66 0.17 78)"
  service-red: "oklch(0.43 0.18 25)"
  service-red-soft: "oklch(0.96 0.025 25)"
  working-white: "oklch(1 0 0)"
  badge-ink: "oklch(0.12 0.01 275)"
  muted-ink: "oklch(0.42 0.02 275)"
  cool-surface: "oklch(0.97 0.006 275)"
  cool-border: "oklch(0.82 0.015 275)"
typography:
  display:
    fontFamily: "Segoe UI, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Segoe UI, system-ui, sans-serif"
    fontSize: "1.4rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 650
    lineHeight: 1.5
  body:
    fontFamily: "Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 650
    lineHeight: 1.5
rounded:
  sm: "6px"
  md: "12px"
spacing:
  space-1: "0.5rem"
  space-2: "0.75rem"
  space-3: "1rem"
  space-4: "1.5rem"
  space-5: "2rem"
  space-6: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.command-navy}"
    textColor: "{colors.working-white}"
    rounded: "{rounded.sm}"
    padding: "0.75rem 1.1rem"
    width: "100%"
  button-primary-hover:
    backgroundColor: "{colors.command-navy-hover}"
    textColor: "{colors.working-white}"
  button-secondary:
    backgroundColor: "{colors.working-white}"
    textColor: "{colors.command-navy}"
    rounded: "{rounded.sm}"
    padding: "0.75rem 1.1rem"
  input-field:
    backgroundColor: "{colors.working-white}"
    textColor: "{colors.badge-ink}"
    rounded: "{rounded.sm}"
    padding: "0.65rem 0.75rem"
    width: "100%"
  choice-selected:
    backgroundColor: "{colors.local-947-gold}"
    textColor: "{colors.badge-ink}"
    rounded: "{rounded.sm}"
    padding: "0.75rem 1rem"
  result-eligible:
    backgroundColor: "{colors.cool-surface}"
    textColor: "{colors.badge-ink}"
    rounded: "{rounded.md}"
    padding: "1.5rem"
  result-ineligible:
    backgroundColor: "{colors.service-red-soft}"
    textColor: "{colors.service-red}"
    rounded: "{rounded.md}"
    padding: "1.5rem"
---

# Design System: Local 947 Special Separation Calculator

## Overview

**Creative North Star: "The Union Desk"**

The Union Desk feels like a well-prepared benefit worksheet on a clean union-hall desk: authoritative, familiar, and ready for a firefighter to use without assistance. The Local 947 badge and established palette frame the task with institutional pride while the calculator remains the center of attention.

The system is flat, direct, and deliberately calm. Plain-language questions, open sections, native controls, and explained results make a complicated benefit rule feel manageable. It rejects dense government or pension forms, commercial insurance or financial-sales pages, gimmicky firehouse styling, and TurboTax-style upsell screens.

**Key Characteristics:**

- Calculator-first structure with integrated Local 947 identity
- Plain-language guidance and visibly explained eligibility
- Strong contrast, generous touch targets, and color-blind-safe status cues
- Familiar controls with restrained, functional motion
- Professional rather than ceremonial typography

## Colors

The palette assigns one job to each Local 947 color so brand recognition supports comprehension instead of becoming decoration.

### Primary

- **Command Navy:** Frames the masthead, drives the primary action, marks passing status icons, and provides the strongest structural contrast.

### Secondary

- **Local 947 Gold:** Carries the badge identity, masthead rule, selected choices, and visible keyboard focus. Its use is concentrated so selections remain unmistakable.
- **Focus Gold:** A darker gold reserved for the three-pixel focus ring where it remains visible on both white and navy surfaces.

### Tertiary

- **Service Red:** Identifies failed requirements, validation messages, and ineligible result borders.
- **Soft Service Red:** Provides a quiet failure surface behind red text without turning the page into an alarm state.

### Neutral

- **Working White:** Keeps the long form open and gives native controls a familiar surface.
- **Badge Ink:** Carries body text and high-contrast structural detail.
- **Muted Ink:** Supports hints and secondary explanations while remaining readable.
- **Cool Surface:** Groups derived values and eligible results without creating nested cards.
- **Cool Border:** Separates sections, rows, and unselected choices with low visual weight.

### Named Rules

**The Assigned Palette Rule.** White is the working surface, navy drives actions, gold identifies and selects, red signals failure or urgency, and near-black carries text. Never swap these roles for decoration.

**The No Color-Only Rule.** Every success, failure, warning, and selection must also use text, shape, or an icon. Color is always supplementary.

## Typography

**Display Font:** Segoe UI (with system UI and sans-serif fallbacks)

**Body Font:** Segoe UI (with system UI and sans-serif fallbacks)

**Character:** One practical humanist sans-serif carries the complete experience. The badge supplies ceremonial character; interface type stays direct, readable, and native to a Windows-heavy user base.

### Hierarchy

- **Display:** Bold and compact, reserved for the page title with balanced wrapping and slightly tightened tracking.
- **Headline:** Bold section and result headings that establish clear stages without oversized marketing typography.
- **Title:** Semibold question legends, derived-value labels, and result labels.
- **Body:** Regular sentence-case instructions and explanations, limited to approximately 70 characters where prose runs long.
- **Label:** Semibold, sentence case, and full body size for fields, choices, and buttons.

### Named Rules

**The One-Family Rule.** Never introduce a decorative display face into calculator headings, labels, buttons, or results.

**The Full-Size Label Rule.** Labels never shrink into captions; benefit decisions must remain legible under stress and on mobile screens.

## Elevation

There are no shadows. Depth comes from navy and gold framing, cool tonal surfaces, full borders, section rules, and generous vertical spacing. This keeps the calculator worksheet-like and avoids commercial-finance card styling.

### Named Rules

**The Flat-by-Default Rule.** Every surface stays in the document plane. Use a tonal shift or complete border when grouping is necessary; never add decorative drop shadows.

**The State-Only Motion Rule.** The only motion is a fast 180ms color transition on buttons. Reduced-motion preferences collapse transitions to effectively instant feedback.

## Components

### Buttons

Buttons feel decisive and workmanlike, with gently squared corners and large touch targets.

- **Shape:** Compact rounded rectangle using the small radius token and at least a 44px block size.
- **Primary:** Full-width Command Navy with Working White text and semibold labeling; hover shifts to Command Navy Hover.
- **Secondary:** Working White with a two-pixel Command Navy border; hover reverses to navy with white text.
- **Focus:** A three-pixel Focus Gold outline with a three-pixel offset. Focus never depends on a color fill change alone.

### Choice Controls

Native radios remain visible inside full-row labels so both control type and selected state are obvious.

- **Unselected:** Working White with a Cool Border outline.
- **Selected:** Local 947 Gold with Badge Ink text and a Badge Ink border.
- **Layout:** Choices run inline only when short; stacked groups and all choices at 640px or below use the full available width.

### Cards / Containers

Only eligibility results and error summaries receive complete containers because they are distinct outcomes, not decorative content blocks.

- **Corner Style:** Moderate rounding using the medium radius token.
- **Background:** Cool Surface for eligible results; Soft Service Red for ineligible results and error summaries.
- **Shadow Strategy:** None; full two-pixel borders communicate outcome boundaries.
- **Internal Padding:** The fourth spacing step, reduced naturally by the responsive page width rather than an extra card breakpoint.

### Inputs / Fields

Inputs are familiar, quiet, and easy to target.

- **Style:** Full-width Working White field, one-pixel Muted Ink border, small radius, and at least a 44px block size.
- **Hover / Focus:** Hover strengthens the border to Command Navy; focus uses the global three-pixel Focus Gold outline.
- **Error:** Service Red border plus a nearby plain-language error and error-summary link. Error color never stands alone.

### Derived Values

Projected service and salary values appear in a flat definition list on Cool Surface. Each row uses label/value alignment on wide screens and stacks at 640px or below. Tabular numerals keep money and service values steady while recalculating.

### Eligibility Status

Each requirement is a text sentence paired with a circular check or cross icon. Eligible totals use stronger type and tabular numerals; ineligible results stop before any payment values and explain every failed rule.

## Do's and Don'ts

### Do:

- **Do** place the calculator task ahead of all supporting explanation.
- **Do** use the Local 947 badge as the primary identity asset and keep its surrounding space clear.
- **Do** use familiar native controls, visible focus states, 44px minimum touch targets, and plain-language errors.
- **Do** pair eligibility colors with explicit text and recognizable status icons.
- **Do** preserve the assigned roles of navy, gold, red, white, and near-black.
- **Do** keep the layout readable from 320px upward and stack choices and values at the 640px breakpoint.

### Don't:

- **Don't** resemble a dense government or pension form.
- **Don't** resemble a commercial insurance or financial-sales page.
- **Don't** use gimmicky firehouse styling, including flames, sirens, distressed typography, or excessive red.
- **Don't** imitate TurboTax-style upsell screens or introduce sales-oriented interruptions and unnecessary choices.
- **Don't** use decorative motion, glassmorphism, gradient text, nested cards, drop shadows, or oversized rounded containers.
- **Don't** communicate eligibility, errors, or selection by color alone.
