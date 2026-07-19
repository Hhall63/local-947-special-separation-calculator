# Progressive Calculator Disclosure Design

## Goal

Reduce visual clutter by showing dependent inputs and calculated summaries only when the user has supplied the information needed to understand them.

## Layout

- Center all `.form-subheading` subsection headings.
- Limit the retirement-year field to an 18rem maximum width while keeping it full width on small screens.
- Use the existing Cool Surface and Cool Border tokens for calculated-value panels. These panels remain flat, with no shadows or added decorative treatment.

## Progressive disclosure

### Sick hours

- Keep the sick-hours field hidden until the user selects either current sick hours or sick hours expected at retirement.
- Keep the service calculation panel hidden until the sick-hours field contains a finite, nonnegative number.
- Continue updating the panel as the remaining service prerequisites become valid.

### Creditable service

- Keep the creditable-service detail region hidden until the user selects calculated or manually entered service.
- For calculated service, show the gray result panel when the service calculation is available.
- For manual service, reveal the year/month inputs in the gray detail region and show the calculated value when both are valid.

### Retirement salary

- Continue revealing the selected salary input path after its radio selection.
- Keep the projected-retirement-salary panel hidden until that path contains enough valid data to calculate a salary.
- Show the completed salary on the same gray panel treatment used by the service summaries.

## Disclaimer banners

Both banners use identical copy:

> **Estimate only.** Information provided by this calculator is an estimate only. It is not an official allowance determination.

Use the existing Soft Service Red background and Service Red text/border so the notice is clearly cautionary while maintaining accessible contrast.

## Assumption copy

Add this plain-language explanation inside Calculation assumptions:

> When current sick hours are selected, the calculator divides current sick hours by completed GFD and other LGERS service to estimate a yearly net rate, caps that rate at 96 hours per year, and applies it through retirement.

## Behavior boundaries

- Do not change eligibility rules, sick-hour conversion, salary projection, allowance math, validation messages, or result behavior.
- Do not add dependencies, animation, new controls, or a wizard flow.
- Reset and Start over must return every new dependent region to its initial hidden state.

## Verification

- Add event-driven tests for each initial, selected, incomplete, complete, and reset visibility state.
- Add structural tests for the assumptions wording, matched disclaimer copy, centered heading hook, compact retirement field, and gray panels.
- Run the full Node test suite, syntax checks, whitespace validation, the Impeccable detector, and desktop/mobile browser screenshots.
