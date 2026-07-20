# Salary Lookup Default Design

## Goal

Make the current-salary prediction path showcase the existing employee lookup while preserving manual entry as an available choice.

## Interface changes

- Rename **Use my salary now** to **Predict from my current salary**.
- Rename **Find me in current City records** to **Look up my information**.
- Make **Look up my information** the initial nested choice.

## Selection behavior

Whenever the user selects **Predict from my current salary**, select **Look up my information** and reveal the existing lookup controls. The user can still switch to **Enter my rank and salary myself**. If the user leaves the prediction path and later returns, select **Look up my information** again.

Existing lookup, manual-entry, validation, projection, calculation, privacy, and reset behavior remain unchanged.

## Verification

- Structurally require both new labels and the lookup choice's checked default.
- Controller-test the first selection, manual override, and lookup reselection after leaving and returning.
- Run the complete Node test suite and JavaScript syntax checks before publishing.
- Verify the deployed HTML and JavaScript contain the new labels and reselection behavior.
