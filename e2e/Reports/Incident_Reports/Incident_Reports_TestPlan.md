# Incident Reports – End-to-End Test Plan

## Executive Summary

This plan validates the Incident Reports feature from creation to export, including UI validation, filtering, selection limits, map snapshot, preview/export flows, and downloaded PDF content verification. It consolidates and elaborates the two provided CSV checklists:

- Creating an Incident Report (navigation, validations, filtering, selection, snapshot, preview/export, archive/download)
- Validating Incident Report PDF (content integrity, statuses, timestamps, counts, images, branding, limits)

Scope assumes a clean session, Admin user, and accessible Alert Reports page. Tests are independent and can run in any order; each test initializes its own state.

---

## Assumptions (Starting State)

- Tester is signed in as an Admin user with valid credentials (via storage state or login flow)
- Correct company is selected (e.g., Vodacom), unless the test explicitly switches
- Incident Reports page is reachable under Reports → Alert Reports
- Timeouts account for real backend delays (report generation may take minutes)
- System contains at least some incidents for selected filters unless test targets empty results

---

## User Journeys and Critical Paths

- Create new incident report → filter and select incidents → take map snapshot → preview/export → download/verify
- View existing reports → download, archive
- Apply filters (alert type, station, area, site) → verify results
- Validation handling (required report name, optional/invalid email, future date disabled, selection limit)

---

## Test Scenarios

### 1. Navigate to Incident Reports

- Steps:
  1. Login to Proof and land on Command page
  2. Open Burger menu (top-left)
  3. Click Reports
  4. Click Alert Reports
- Expected:
  - User lands on Incident Reports page by default
- Success:
  - Alert Reports page title and controls are visible
- Failure:
  - Page or controls fail to render within timeout

### 2. Create New Incident Report – Report Name Validation

- Steps:
  1. On Incident Reports page, click "+ Create new"
  2. Click "Next" without entering Report name
- Expected:
  - Validation message indicates Report name is required
- Success:
  - Inline error is present and "Next" is blocked
- Failure:
  - No error displayed or flow continues without a name

### 3. Create New – Recipient Email (Optional)

- Steps:
  1. Click "+ Create new"
  2. Enter a valid Report name
  3. Enter a valid email in optional Recipient email; proceed
  4. Enter an invalid email; attempt to proceed
- Expected:
  - Valid email: proceeds with no validation error
  - Invalid email: error "Email address is not valid"
- Success:
  - Correct validation behavior for both cases
- Failure:
  - Valid email blocked or invalid email accepted

### 4. Select Incidents by Date Range

- Steps:
  1. Create new report (with name and optional valid email)
  2. On selection step, set a valid From/To date range
  3. Apply filter
- Expected:
  - Incidents in range are displayed
- Success:
  - Results load and reflect the range
- Failure:
  - No results or error when valid range is used

### 5. Select Incidents – No Matching Results

- Steps:
  1. Create new report
  2. Apply filters with no expected results (e.g., future range, non-existent alert type)
- Expected:
  - "No data" or equivalent empty-results state
- Success:
  - Clear empty state message shown
- Failure:
  - Random results appear or validation error

### 6. Incident Selection Limit (150)

- Steps:
  1. Create new report
  2. Attempt to select >150 incidents
- Expected:
  - System prevents selection beyond 150 and shows a validation message
- Success:
  - Limit enforced exactly at 150
- Failure:
  - Able to exceed 150 or blocked prematurely

### 7. Add/Remove Incidents to Export Selection

- Steps:
  1. Select multiple incidents
  2. Click "Add to export selection"
  3. Remove one incident from the Export selection panel
- Expected:
  - Selected incidents move to the Export panel; removed item disappears
- Success:
  - Export panel accurately reflects selection
- Failure:
  - Items fail to add/remove

### 8. Map Snapshot – Take and Clear

- Steps:
  1. Proceed to Map step
  2. Click "Take snapshot"
  3. Verify snapshot preview shows
  4. Click "Clear image"
- Expected:
  - Snapshot captured and can be cleared; map resets
- Success:
  - Visual state toggles correctly
- Failure:
  - No snapshot or cannot clear

### 9. Preview Export and Export

- Steps:
  1. After selection and snapshot, click "Preview export"
  2. Verify preview renders
  3. Click "Export"
  4. Observe report generation toast
- Expected:
  - Report is generated; entry appears in list with enabled Download when ready
- Success:
  - Download becomes enabled within SLA (e.g., ≤5 minutes)
- Failure:
  - Download never enables or export fails

### 10. Download and Archive Existing Report

- Steps:
  1. Click "Download" for first row; ensure PDF opens
  2. Click "Archive" for an existing report
- Expected:
  - PDF opens in new tab; archiving removes from active list
- Success:
  - Actions work and UI updates
- Failure:
  - PDF fails to open or archive has no effect

### 11. Apply Filters: Alert Type, Station, Area, Site

- Steps:
  1. Use each filter category to refine results
  2. Verify list updates to matching incidents only
- Expected:
  - Results align with applied filters
- Success:
  - No bleed-over from other categories; relevant items shown
- Failure:
  - Irrelevant incidents appear or filters have no effect

### 12. Future Date Range Cannot Be Selected

- Steps:
  1. In the date controls, attempt to set a future From/To
- Expected:
  - Future days disabled/unselectable
- Success:
  - Cannot apply future date
- Failure:
  - Future date accepted

---

## PDF Validation Scenarios

These validate the downloaded report contents. Use a freshly generated report or an existing one.

### A. Verify Incident ID(s)
- Steps:
  1. Open report PDF and extract text
  2. For each incident block, locate Incident ID
- Expected:
  - IDs match canonical format or backing index (when cross-checked)
- Success:
  - IDs present and formatted consistently
- Failure:
  - Missing or malformed IDs

### B. Verify Status Display
- Steps:
  - Check for statuses across scenarios: Resolved, Not resolved, Dismissed, Escalated, Dispatch
- Expected:
  - Correct statuses appear based on incident lifecycle

### C. Verify Alert Counts and Names
- Steps:
  - Confirm numeric alert counts and presence of alert names
- Expected:
  - Counts match incident content; names rendered

### D. Verify Alert Types (UB, LPR, Object Motion)
- Steps:
  - Search for type labels in PDF text (UB, LPR, Object Motion)

### E. Verify Timestamps Accuracy
- Steps:
  - Extract timestamps and ensure plausible ranges and formats

### F. Verify Incident Group Names and Site Names
- Steps:
  - Confirm group and site labels match selected context

### G. Verify Dismissal Reason (Right/Wrong) – Metrics On/Off
- Steps:
  - If metrics enabled, ensure dismissal reason present

### H. Verify Escalation Actions
- Steps:
  - Search for "Escalated" action entries

### I. Verify Manual Comments
- Steps:
  - Detect manual comment sections/text

### J. Verify Images and Watermark
- Steps:
  - Verify captions (e.g., "Image Taken") and watermark text references
  - Note: Text-only parsing cannot confirm actual pixel/image content

### K. Verify Incident Duration
- Steps:
  - Extract duration strings; validate consistency

### L. Verify Map Snapshot Accuracy
- Steps:
  - Confirm map snapshot caption/label present; location names present

### M. Verify PDF Format Integrity
- Steps:
  - PDF opens without corruption; text extractable

### N. Verify Footer & Branding
- Steps:
  - Verify Proof logo/footer text reference; company logo or company name present; title

### O. Verify Incident Reporting Limits (150)
- Steps:
  - Generate report with 150 incidents and confirm coverage

### P. Verify Preview vs Download Consistency
- Steps:
  - Compare preview identifiers (title/name/date) to downloaded PDF text

### Q. Verify Dispatch Actions by Provider
- Steps:
  - Response 24: Dispatch lifecycle entries
  - Aura: Response Requested, Activepolling, Completed

### R. Verify Images for Trex and LPR Alerts
- Steps:
  - Ensure text labels for those alert types are present

---

## Success Criteria and Failure Conditions

- Success when all mandatory scenarios pass; optional provider/metric-dependent checks are soft-failing with diagnostics
- Failures produce actionable logs, screenshots (on failure), and PDF snippets to aid triage

---

## Notes and Risks

- Some validations (logos, actual map/image pixel checks) are limited by text extraction; confirmed via captions/labels
- Cross-system validation (Elastic) requires environment variables and index access. If configured, an integration step can compare Incident IDs and counts
- Long-running export enablement is handled with retry/backoff up to a bounded timeout
