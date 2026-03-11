# Rookwizard UI Wireframe

## Dashboard CTA
- **Title:** "RF401 Buyer Wizard"
- **Description:** "Launch the RF401 buyer questionnaire with data mapped to Sections 1–6 of RF401 v01/01/2026."
- **Primary CTA Button:** "Start RF401 Wizard" (creates transaction, opens Reva panel for that transaction).
- **Secondary CTA:** "Continue Draft" (if an existing transaction_id is detected, resumes at the last unfinished section).
- **Status Badge:** Displays `In Progress`, `Awaiting Buyer`, `Complete`, or `unknown in current RF401 reference` until the wizard is fully synced.

## Reva Panel Wizard UX
1. **Header Bar**
   - Shows `Transaction ID` and `Property Address` (or `unknown in current RF401 reference` if blank).
   - Progress indicator (4 steps) tied to contract sections.

2. **Step Panels**
   - Each step corresponds to a RF401 section group (Purchase & Sale, Purchase Price, Closing Expenses, Timelines).
   - Panel content includes summary chips showing stored data or `unknown in current RF401 reference` tags for missing fields.
   - Input fields match the JSON schema (arrays rendered as multi-select chips). Select/checkbox fields explain RF401 expectations (e.g., financing type enum).

3. **Action Buttons**
   - `Save & Continue` triggers API PUT for that section and advances progress.
   - `Mark as Unknown` sets all empty fields to `unknown in current RF401 reference` and notifies the buyer agent to follow up.
   - `Export to PDF` (disabled until step 4 is complete).

4. **Sidebar / Notes**
   - Shows critical deadlines (earnest money, closing, inspection) aggregated from Sections 3–6.
   - Includes contacts (buyer closing agency, title) with quick call/email icons.
   - Displays `Next Steps` based on missing fields.

5. **Validation & Help**
   - Each panel includes contextual help referencing the RF401 section, e.g., "Section 2.A–C requires both numeric and written purchase price."
   - When a field cannot be filled, show `Set to "unknown in current RF401 reference"` link that logs the status for compliance.

This wireframe keeps the dashboard focused on CTA and tracking, while the Reva panel walks the agent through the contract-aligned wizard steps, surfacing missing detail states explicitly.
