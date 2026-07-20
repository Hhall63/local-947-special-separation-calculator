# Streamlined Salary Lookup Design

## Goal

Remove the redundant confirmation step from the existing live employee salary lookup without changing what information is imported or any other calculator behavior.

## Interface changes

- Rename **Project from FY 2025-2026 salary structure** to **Use my salary now**.
- Keep **Search current records** visually secondary until the existing two-alphanumeric-character search minimum is met.
- Once the name input meets that minimum, show **Search current records** as a dark green button with white text. Preserve the existing focus treatment, touch target, loading state, and reduced-motion behavior.
- Remove the confirmation panel, confirmation heading, record summary, and **Use this information** button.

## Record selection

Clicking a mappable result immediately performs the same import that the removed confirmation button performs today:

- set the current rank;
- select the exact current salary step for nonexempt ranks or fill the current annual salary for exempt ranks;
- reveal those existing fields as normal editable controls;
- run the existing preview and progressive-disclosure flow; and
- announce that the values were filled and remain editable.

The selected result keeps its existing visible **Selected** text and `aria-pressed="true"` state. Focus moves to the filled current-rank field, matching the current post-import behavior.

Clicking an unmappable record changes no calculator field and shows the existing manual-entry fallback message. Search failures, no-result behavior, local name matching, public-record privacy behavior, reset behavior, salary mapping, projections, validation, and calculations remain unchanged.

## Verification

- Test the new **Use my salary now** label.
- Test the search button's default and search-ready visual states, including reset.
- Test that clicking a mappable record fills the same current fields immediately.
- Test that no confirmation markup or confirmation action remains.
- Test that an unmappable record still leaves calculator fields unchanged.
- Run the complete Node test suite and JavaScript syntax checks before publication.

