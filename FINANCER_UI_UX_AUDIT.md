# Financer Portal — UI/UX Audit Report

## 1. Report title

**INRFS Financer Portal: Final UI/UX Audit**  
Review date: 12 August 2026

## 2. Application URL and review scope

**Application:** <https://inrfs-financer-fe.vercel.app/>  
**Scope:** Authenticated Financer Portal only. The Admin Portal was excluded.  
**Method:** Read-only review of the deployed application at desktop (1272–1440 px), tablet (768 px), and mobile (390 px) widths. No customer, loan, payment, profile, or billing data was created, edited, approved, rejected, or deleted.

Reviewed areas: portal selection, OTP login and welcome, dashboard, customers, add-customer form, loans, new-loan form, payments, payment modal, customer ledger, reports and report preview, service charge, settings tabs, filters, tables, charts, navigation, search empty state, and responsive navigation.

## 3. Executive summary

The Financer Portal has a clean visual foundation, coherent branding, and a sensible top-level information architecture. It is not ready for client acceptance, however, because prominent figures and customer records are inconsistent across screens, direct route loading returns a Vercel 404, and a successful payment's **View** action opens an editable **Record Payment** form. These issues undermine financial trust and create operational risk.

The responsive framework is functional: the sidebar becomes a drawer, cards stack, and tables remain accessible through horizontal scrolling. Important presentation and accessibility defects remain, including clipped chart labels, an awkward mobile date treatment, controls without accessible names, unassociated form labels, and overlays without dialog semantics.

### Must fix before submission

1. Use one authoritative dataset so dashboard, lists, ledgers, reports, service charges, names, IDs, phone numbers, dates, and totals agree.
2. Correct payment **View** so it opens a read-only receipt/detail view, never an editable recording form for a completed payment.
3. Configure SPA rewrites so authenticated routes survive refresh, bookmarks, and direct links.
4. Repair non-responsive row actions and remove or disable unfinished controls.
5. Complete accessible names, form-label associations, dialog semantics, focus handling, and switch states.
6. Fix chart clipping and mobile table/date presentation.

## 4. Current Financer Dashboard UI summary

The dashboard uses a fixed desktop sidebar, top search/notification header, greeting and date panel, four KPI cards, collection and loan-status charts, and an upcoming/due payments table. Navigation covers Customers, Loans, Payments, Customer Ledger, Reports, Service Charge, and Settings. Tablet and mobile layouts replace the sidebar with a drawer and stack content vertically.

The structure is appropriate for a loan-management product, but the current content behaves like multiple disconnected demonstration datasets rather than one dependable financial system.

## 5. Positive aspects

- Branding, icon style, card radius, borders, shadows, and blue accent colour are visually cohesive.
- Desktop navigation is easy to scan and gives the active route a strong visual treatment.
- Dashboard KPIs appear before charts and payment actions, creating a generally sensible hierarchy.
- Statuses use distinguishable labels such as Active, Due, Overdue, Closed, Pending, and Success.
- Customer and loan screens provide search plus relevant filters.
- The add-customer wizard communicates four steps clearly and fits well on mobile.
- Mobile navigation uses a full-height drawer with a dimmed backdrop and an obvious close control.
- The customer search provides a verified empty result message rather than leaving a blank table.
- The payment modal shows amount due, amount received, and outstanding together.

## 6. Critical issues that must be fixed

### FIN-001 — Financial and customer data is inconsistent across the portal

- **Screen or component:** Dashboard, Customers, Loans, Payments, Customer Ledger, Reports, Service Charge
- **Observed problem:** The dashboard reports 250 customers and 180 active loans, while Customers shows 7 total and 4 active and Loans shows 8 total and 5 active. Customers identifies Ramesh Kumar as `CUST001` with `+91 98234 11223` and ₹45,000 outstanding; Ledger/Reports use `CUS001`, `+91 98001 11111`, and ₹21,000. Loans shows Ramesh with ₹70,000 total principal across two loans, while Ledger reports ₹23,000 disbursed. Customer names also change (Amit Shah, Anita Shah, Anita Desai; Sunita Verma, Sunita Rao). Payments reports ₹3,550 collected this month, while Service Charge uses ₹28,500 interest collected for August. Dashboard date is 10-Sep-2026 while payment data and form defaults are in August 2026.
- **Why it affects users:** A financer cannot trust balances, collection obligations, customer identity, statements, reports, or charges. Decisions based on conflicting figures can cause collection and reconciliation errors.
- **Severity:** **Critical**
- **Exact recommended fix:** Bind every screen to the same backend entities and aggregation rules. Define canonical customer/loan IDs, reporting period, timezone, and financial calculations. Add automated reconciliation tests for KPI-to-list totals, loan-to-ledger balances, payment-to-report totals, and interest-to-service-charge totals. Remove all disconnected mock/demo datasets from the client build.

### FIN-002 — Completed payment “View” opens an editable payment-recording form

- **Screen or component:** Payments & Interest Schedule → successful row → **View**
- **Observed problem:** Selecting **View** for successful payment LN000128 opens a modal titled **Record Payment**, prefilled with ₹2,000 and an active **Record Payment** button. It also offers rescheduling.
- **Why it affects users:** A view action suggests read-only inspection. Presenting a transaction form creates a high risk of duplicate payment entry or unintended schedule changes.
- **Severity:** **Critical**
- **Exact recommended fix:** Open an immutable payment receipt/detail modal for successful transactions, showing receipt/reference, timestamps, allocation, method, status, audit trail, and print/download actions. Keep recording and rescheduling in separate, clearly named flows with permission checks and confirmation.
- **Evidence:** [Payment View opens Record Payment modal](audit-screenshots/11-payment-view-opens-record-modal.png)

### FIN-003 — Authenticated routes fail on direct load or refresh

- **Screen or component:** Routing/deep links; verified with `/financer/customers`
- **Observed problem:** Directly loading the customer URL returns Vercel `404: NOT_FOUND`. Returning through the root also required authentication again because the authenticated state was not restored after reload.
- **Why it affects users:** Refresh, bookmarks, browser history, shared internal links, and recovery from a crash can eject users from their workflow.
- **Severity:** **Critical**
- **Exact recommended fix:** Add a Vercel SPA rewrite from non-asset paths to the application entry point, restore authenticated sessions securely on boot, and add end-to-end tests for direct loading and refreshing every Financer route.

## 7. Important improvements

### FIN-004 — Customer row “View” provides no visible response

- **Screen or component:** Customers table → View Ramesh Kumar
- **Observed problem:** The verified View action produced no navigation, modal, drawer, loading state, or feedback.
- **Why it affects users:** Users cannot access the expected customer summary and may repeatedly click an apparently broken control.
- **Severity:** **High**
- **Exact recommended fix:** Open a customer detail route or drawer with identity, KYC, contact information, active/closed loans, outstanding balance, next due item, documents, and activity. If unfinished, remove or disable the action with a clear explanation before release.

### FIN-005 — Placeholder/demo records are exposed as operational data

- **Screen or component:** New Loan Account, Customers, Ledger, Reports
- **Observed problem:** The new-loan customer selector includes names not present in the customer list, while examples and prefilled values use realistic names, phone numbers, amounts, dates, and emails. The customer KPI “New This Month” is 12 despite only 7 total customers.
- **Why it affects users:** Realistic but contradictory placeholders are easily mistaken for actual records and make the product appear unfinished.
- **Severity:** **High**
- **Exact recommended fix:** Populate selectors only from live eligible customers. Remove realistic personal data from production placeholders; use neutral format hints. Ensure KPI counts are computed from the displayed source and never exceed their parent totals.

### FIN-006 — SMS settings are editable but have no save action

- **Screen or component:** Settings → SMS Settings
- **Observed problem:** Sender ID and Default SMS Template appear editable, but no Save/Apply/Cancel action is present.
- **Why it affects users:** Users cannot tell whether changes are saved automatically, discarded, or unsupported.
- **Severity:** **High**
- **Exact recommended fix:** Add explicit Save and Cancel actions with dirty-state handling and success/error feedback, or make fields read-only and label them as managed settings.

### FIN-007 — Wide mobile tables hide key context and actions

- **Screen or component:** Customers and other data tables at 390 px
- **Observed problem:** The Customers table is 1,080 px wide inside a 341 px scroll container. Status and row actions begin far off-screen, with no visible cue that horizontal scrolling is required.
- **Why it affects users:** Mobile users may not discover status/actions and must coordinate vertical and horizontal scrolling for routine work.
- **Severity:** **High**
- **Exact recommended fix:** Replace dense tables below the tablet breakpoint with stacked record cards containing identity, amount, due date, status, and a labelled overflow/action menu. If a table remains, freeze the primary column, add a scroll affordance, and keep the action column visible.
- **Evidence:** [Customers on mobile](audit-screenshots/08-customers-mobile.png)

### FIN-008 — Essential controls lack accessible names or state

- **Screen or component:** Mobile menu, header, customer modal, notification preferences
- **Observed problem:** The mobile menu button and other icon-only buttons have no accessible name. Notification preference controls are blank buttons rather than labelled switches with an exposed on/off state. The global search relies on placeholder text.
- **Why it affects users:** Screen-reader and voice-control users cannot reliably identify or operate controls; keyboard users cannot understand toggle state.
- **Severity:** **High**
- **Exact recommended fix:** Add visible or `aria-label` names; use semantic switches (`role="switch"` plus `aria-checked`, or native checkboxes); provide persistent search labels; verify focus indicators and logical keyboard order.

### FIN-009 — Form labels and overlays are not correctly associated

- **Screen or component:** Add New Customer; Create New Loan; report preview
- **Observed problem:** Add-customer labels have no `for` attributes and controls have no IDs/ARIA labelling. The customer modal and report preview expose no `dialog` semantics, despite visually behaving as overlays.
- **Why it affects users:** Assistive technology may announce fields without their labels and may not recognize modal context; focus can escape behind overlays.
- **Severity:** **High**
- **Exact recommended fix:** Give every field a unique ID and associated `<label for>`. Use `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`; move focus into the overlay, trap it, support Escape, and restore focus to the trigger on close.

### FIN-010 — Loading, error, and success feedback is incomplete or unverified

- **Screen or component:** Data pages, forms, exports, settings
- **Observed problem:** A basic “No customers found.” state was verified. Authenticated loading, API error, save success, export progress/failure, and retry states could not be verified without performing mutations or forcing network failures.
- **Why it affects users:** Financial workflows require clear confirmation and recoverable failures; absence of these states can cause repeated submissions.
- **Severity:** **High**
- **Exact recommended fix:** Implement and QA skeleton loading, actionable empty states, inline validation, non-destructive error messages with retry, disabled/loading submit states, success confirmations with reference IDs, and export progress/failure feedback.

## 8. Minor visual refinements

### FIN-011 — Chart axis labels are clipped

- **Screen or component:** Dashboard → Collection Overview
- **Observed problem:** Leading digits of the Y-axis tick labels are clipped on desktop and tablet; labels appear as fragments such as “000”.
- **Why it affects users:** The chart scale is ambiguous, reducing the value of the visualization.
- **Severity:** **Medium**
- **Exact recommended fix:** Increase the chart’s left margin and Y-axis width, prevent card overflow clipping, and test all breakpoint widths and large-number formats.
- **Evidence:** [Desktop dashboard](audit-screenshots/01-dashboard-desktop.png), [Tablet dashboard](audit-screenshots/05-dashboard-tablet-settled.png)

### FIN-012 — Mobile greeting/date panel is cramped

- **Screen or component:** Dashboard greeting card at 390 px
- **Observed problem:** The date breaks across three lines (“10- / Sep- / 2026”) in a narrow pill beside a two-line greeting.
- **Why it affects users:** The first content block looks compressed and reduces scanability.
- **Severity:** **Medium**
- **Exact recommended fix:** Stack the date below the greeting on small screens or use a full-width single-line date chip; reduce decorative emphasis before reducing text space.
- **Evidence:** [Mobile dashboard](audit-screenshots/06-dashboard-mobile.png)

### FIN-013 — Dashboard is excessively long on mobile

- **Screen or component:** Mobile dashboard
- **Observed problem:** Four large KPI cards are stacked before charts and the due-payments table, pushing actionable collection work far down the page.
- **Why it affects users:** Mobile users must scroll through summary content before reaching urgent tasks.
- **Severity:** **Medium**
- **Exact recommended fix:** Use a compact two-column KPI grid where readable, place due/overdue actions immediately after KPIs, and collapse secondary charts behind a “View analytics” section.

### FIN-014 — Empty search state lacks recovery guidance

- **Screen or component:** Customers → no matching search
- **Observed problem:** The table shows only “No customers found.”
- **Why it affects users:** Users receive no explanation of applied filters or one-click recovery.
- **Severity:** **Low**
- **Exact recommended fix:** Show the search term/filter summary with **Clear search** and **Reset filters** actions. Use a distinct first-use empty state when no customers exist.

### FIN-015 — Terminology and action labels are inconsistent

- **Screen or component:** Payments and reports
- **Observed problem:** Payment rows alternate between **View** and **Record**, the page also has **Record Payment**, and the sort control is labelled only **Earliest**. Reports use both **Export PDF** and **Print / Save PDF**.
- **Why it affects users:** Similar actions appear to have uncertain scope or behavior.
- **Severity:** **Medium**
- **Exact recommended fix:** Standardize verbs by outcome: **View receipt**, **Record payment**, **Reschedule**, **Sort: Earliest due**, **Download PDF**, and **Print**.

## 9. Unnecessary elements to remove

- Remove all disconnected mock records, impossible KPI values, and realistic placeholder identities from the production build.
- Remove or disable unfinished View/Edit/Export/Statement actions until they produce a verified result.
- Remove duplicate entry points that perform the same payment action unless their context is clearly differentiated.
- Replace placeholder-only field guidance with permanent labels and optional helper text.
- Do not expose an Admin Portal card within the authenticated Financer experience. The reviewed Financer dashboard itself did not include Admin navigation.

## 10. Screen-by-screen findings

| Screen | Verified findings | Recommended priority |
|---|---|---|
| Portal selection / OTP / Welcome | Clear entry flow. Session was not restored after a route reload. Login inputs rely heavily on placeholders. | Restore session; confirm accessible field labels and OTP error/resend states. |
| Dashboard | Strong KPI-first structure. KPI totals conflict with operational lists; chart ticks clip; date/reporting periods conflict. | Reconcile data and dates; fix chart margins; prioritize due work on mobile. |
| Customers | Search/filter/table structure is clear. Totals conflict, View is non-responsive, mobile table is very wide. | Fix actions/data; adopt mobile record cards. |
| Add Customer | Four-step progression and mobile layout are clear. Labels are not programmatically associated; overlay lacks dialog semantics; realistic personal placeholders are used. | Repair accessibility and replace placeholders. |
| Loans | Useful status/type filters and summary cards. Customer selector conflicts with Customers; default amount/date/rate appear prefilled; row detail behavior requires completion. | Use live customer source; remove unsafe defaults; verify details/edit flows. |
| Payments | Strong summary/filter/table pattern. Successful View opens Record Payment; customer naming and dates conflict. | Separate receipt and recording flows immediately. |
| Customer Ledger | Customer selector and debit/credit structure are understandable. IDs, phone, disbursed and outstanding values conflict with Customers/Loans/Reports. | Rebuild from canonical ledger transactions. |
| Reports | Report catalogue is easy to scan; preview is useful. Counts/details conflict with live screens; preview lacks dialog semantics. | Generate reports from filtered canonical data; add period/as-of metadata. |
| Service Charge | Calculation is visually understandable. Interest basis conflicts with Payments and the period context is inconsistent elsewhere. | Link calculation to an auditable interest collection report and formula. |
| Settings — Profile | Simple, readable form. Save success/error state was not tested to preserve data. | Add clear validation, dirty-state, confirmation, and read-only fields where appropriate. |
| Settings — Notifications | Preferences are concise. Toggles have no accessible names/states. | Use labelled semantic switches and save confirmation. |
| Settings — SMS | Credit allowance is visible. Editable fields have no save action. | Add explicit persistence controls and template validation/preview. |
| Settings — Security | OTP approach is stated clearly. No session/device history or sign-out-all control was visible. | Consider recent sessions, OTP destination masking, and security activity. |

## 11. Desktop, tablet, and mobile responsiveness findings

### Desktop

- Sidebar, header, KPI cards, charts, and tables follow a coherent grid.
- At the tested 1272 px viewport, the dashboard chart's Y-axis labels are clipped.
- Dense tables are workable but require stronger row-action labels than icon-only controls.
- The initial 588 px-high viewport shows important content below the fold; this is acceptable, but chart card heights could be more efficient.

### Tablet

- Sidebar correctly changes to a menu control and KPI cards form a two-column grid.
- Chart cards stack appropriately.
- Collection chart labels remain clipped, so the chart is not fully usable.
- The menu control requires an accessible name.

### Mobile

- Drawer navigation, stacked cards, and add-customer modal remain visually stable.
- Greeting and date compete for horizontal space; the date wraps to three lines.
- The page becomes very long before urgent payment content.
- Data tables use horizontal scrolling; the tested customer table was 1,080 px inside a 341 px viewport container.
- Global search is visually hidden, leaving page-level searches as the main mobile discovery method.
- Evidence: [Mobile navigation](audit-screenshots/07-mobile-navigation.png), [Mobile customer form](audit-screenshots/09-add-customer-mobile.png).

## 12. Recommended final dashboard structure

1. **Header:** page title, reporting “as of” timestamp, global search, notification centre, profile/security menu.
2. **Priority work queue:** overdue amount/count, due today, upcoming seven days, failed/unallocated payments; each opens a filtered list.
3. **Core KPIs:** total principal outstanding, active customers, active loans, collected this period, expected this period, collection rate.
4. **Collection performance:** expected vs collected with selectable period, accessible data table, and correctly formatted axes.
5. **Portfolio risk:** Active, Due, Overdue, Rescheduled, Closed with count and value, not count alone.
6. **Upcoming payments:** customer, loan, due amount, due date/age, contact status, last reminder, and a safe Record Payment action.
7. **Recent activity:** payments, new loans, reschedules, profile/KYC changes, and exports with timestamps and actors.
8. **Operational alerts:** KYC/document expiry, reconciliation exceptions, low SMS credits, and service-charge status.

On mobile, show the priority work queue immediately after a compact KPI grid; move charts and recent activity into collapsible sections.

## 13. Final UI acceptance checklist

### Must pass before submission

- [ ] All customer identities, IDs, phone numbers, counts, balances, dates, and report totals reconcile across every screen.
- [ ] Dashboard and service-charge figures are traceable to underlying transactions and reporting periods.
- [ ] Every Financer URL loads and refreshes without 404 or session loss.
- [ ] Successful payment **View** opens a read-only receipt, not a recording form.
- [ ] All visible navigation, row actions, filters, exports, statements, and tabs respond correctly.
- [ ] No mock, placeholder, developer-only, or contradictory data appears in production.
- [ ] Forms prevent duplicate submission and show validation, loading, error, and success states.
- [ ] Modal focus, Escape behavior, focus return, and semantic dialog labelling pass keyboard/screen-reader testing.
- [ ] Every field, icon button, toggle, chart, and status has an accessible name/meaning; contrast meets WCAG AA.
- [ ] Charts show complete axes/legends and provide an accessible data alternative.
- [ ] Mobile tables are replaced or made clearly operable without hiding critical actions.
- [ ] Desktop, tablet, and mobile layouts pass at 200% zoom and with long names/currency values.

### Optional improvements

- [ ] Add user-configurable dashboard periods and saved filters.
- [ ] Add compact mobile KPI cards and collapsible analytics.
- [ ] Add recent security sessions and sign-out-all-devices.
- [ ] Add report scheduling and export history after core report accuracy is proven.

### Not verified during this read-only review

- Data-creating, editing, saving, recording, rescheduling, approving, rejecting, and deleting outcomes.
- Real OTP error, timeout, resend, and rate-limit states.
- Backend loading/API failure states and offline recovery.
- Actual PDF/statement file contents and print output.
- Notification delivery, SMS delivery, and Contact Operations behavior.
- Colour contrast ratios with automated measurement, screen-reader announcements, browser/OS combinations, and 200% zoom.

## 14. Client-ready conclusion

The Financer Portal already has a professional visual direction and a sound navigation model. Client acceptance should be withheld until financial data is consistent, payment viewing is made safely read-only, deep links are reliable, and unfinished/accessibility-deficient controls are corrected. Once these must-fix items are closed and the checklist passes, the existing design system can support a polished, credible loan-management dashboard across desktop, tablet, and mobile.

