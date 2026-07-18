<!-- SEED: re-run $impeccable document once there's code to capture the actual tokens and components. -->
---
name: Local 947 Special Separation Calculator
description: A trustworthy, firefighter-first retirement benefit estimator.
---

# Design System: Local 947 Special Separation Calculator

## 1. Overview

**Creative North Star: "The Union Desk"**

The interface should feel like a well-prepared benefit worksheet placed on a clean union-hall desk: authoritative, familiar, and ready for a firefighter to use without assistance. The Local 947 badge and its established palette provide institutional pride, while the form itself follows the clarity of the GOV.UK Design System and the focus of Stripe Checkout.

This is a calculator first. Branding frames the task but never competes with it. Information is grouped by the decision the firefighter is making, language stays plain, and every result explains itself. Motion is limited to fast state changes that clarify what appeared, changed, or failed.

The system explicitly rejects dense government or pension forms, commercial insurance or financial-sales pages, gimmicky firehouse styling, and TurboTax-style upsell screens.

**Key Characteristics:**

- Calculator-first structure with integrated Local 947 identity
- Plain-language guidance and visibly explained eligibility
- Strong contrast, generous touch targets, and color-blind-safe status cues
- Familiar controls with restrained, functional motion
- Professional rather than ceremonial typography

## 2. Colors

Use the supplied Local 947 palette as a set of assigned roles, not as decoration. Exact accessible token values will be resolved during implementation from the supplied palette and verified against WCAG 2.2 AA.

### Primary

- **Command Navy** (`[to be resolved during implementation]`): Primary buttons, active controls, section structure, and focus emphasis.

### Secondary

- **Local 947 Gold** (`[to be resolved during implementation]`): Brand identity, selected states, and limited high-value emphasis.

### Tertiary

- **Service Red** (`[to be resolved during implementation]`): Failed requirements, destructive errors, and small points of urgent emphasis only.

### Neutral

- **Working White** (`[to be resolved during implementation]`): Main calculator surface and input backgrounds.
- **Badge Black** (`[to be resolved during implementation]`): Primary text and high-contrast structural details.

**The Assigned Palette Rule.** White is the working surface, navy drives actions, gold identifies and selects, red signals failure or urgency, and black carries text. Never swap these roles for decoration.

**The No Color-Only Rule.** Every success, failure, warning, and selection must also use text, shape, or an icon. Color must remain supplementary for users with color-vision deficiency.

## 3. Typography

**Display Font:** `[humanist sans-serif to be chosen at implementation]`
**Body Font:** `[same humanist sans-serif to be chosen at implementation]`

**Character:** One highly readable humanist sans-serif carries the entire calculator. The Local 947 badge supplies ceremonial character; interface type remains practical, approachable, and consistent.

### Hierarchy

- **Display:** Semibold, reserved for the page title at a moderate product-interface scale.
- **Headline:** Semibold, used for calculator stages and the eligibility result.
- **Title:** Semibold, used for grouped questions and result labels.
- **Body:** Regular, used for instructions and explanations with a maximum readable line length of 70 characters.
- **Label:** Medium, sentence case, used for fields, choices, and compact status text.

**The One-Family Rule.** Never introduce a decorative display face into calculator headings, labels, buttons, or results.

## 4. Elevation

The system is flat by default. Depth comes from surface changes, spacing, and structural grouping; a small functional shadow may appear only on an active overlay or transient result transition after implementation proves it necessary.

**The State-Only Motion Rule.** Motion may reveal a conditional field, confirm an update, or transition into a result. Decorative entrances and page-load choreography are prohibited.

## 6. Do's and Don'ts

### Do:

- **Do** place the calculator task ahead of all supporting explanation.
- **Do** use the Local 947 badge as the primary identity asset and keep its surrounding space clear.
- **Do** use familiar native controls, visible focus states, large touch targets, and plain-language errors.
- **Do** pair eligibility colors with explicit text and recognizable status icons.
- **Do** preserve the assigned roles of navy, gold, red, white, and black.

### Don't:

- **Don't** resemble a dense government or pension form.
- **Don't** resemble a commercial insurance or financial-sales page.
- **Don't** use gimmicky firehouse styling, including flames, sirens, distressed typography, or excessive red.
- **Don't** imitate TurboTax's upsell screens or introduce sales-oriented interruptions and unnecessary choices.
- **Don't** use decorative motion, glassmorphism, gradient text, nested cards, or oversized rounded containers.
