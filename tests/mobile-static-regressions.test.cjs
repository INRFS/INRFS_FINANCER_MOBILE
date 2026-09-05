const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(process.cwd());
const source = relative => fs.readFileSync(path.join(root, relative), "utf8");

test("customer payment sends the selected backend payment type", () => {
  const file = source("src/screens/financer/CustomersScreen.tsx");
  assert.match(file, /paymentType:\s*type === "Interest Only" \? "InterestOnly"/);
  assert.match(file, /"Full Settlement" \? "FullSettlement" : "Regular"/);
});

test("customer payment exposes every active loan", () => {
  const file = source("src/screens/financer/CustomersScreen.tsx");
  assert.doesNotMatch(file, /activeLoans\.map\([\s\S]{0,160}\.slice\(0,\s*3\)/);
});

test("customer ledger maps the backend entries envelope and transaction date", () => {
  const file = source("src/screens/financer/CustomersScreen.tsx");
  const ledger = file.slice(file.indexOf("function LedgerTab"), file.indexOf("function CustomerDocuments"));
  assert.match(ledger, /state\.data as any\)\?\.entries/);
  assert.match(ledger, /entry\.transactionAt \|\| entry\.date/);
});

test("admin collection submit has a duplicate-request lock and strict date validation", () => {
  const file = source("src/screens/admin/AdminCollectionsScreen.tsx");
  assert.match(file, /if \(!selected \|\| !action \|\| saving\) return/);
  assert.match(file, /setSaving\(true\)/);
  assert.match(file, /finally \{ setSaving\(false\); \}/);
  assert.match(file, /loading=\{saving\}/);
  assert.match(file, /isValidDateOnly\(date\)/);
});

test("financer tab icons use a named component", () => {
  const file = source("src/navigation/FinancerDrawerNavigator.tsx");
  assert.match(file, /return function TabIcon/);
});

test("financer More excludes schedule and notifications while header opens notifications", () => {
  const file = source("src/navigation/FinancerDrawerNavigator.tsx");
  const moreItems = file.slice(file.indexOf("const moreItems"), file.indexOf("const moreScreens"));
  assert.doesNotMatch(moreItems, /Interest Schedule|Notifications/);
  assert.match(file, /accessibilityLabel="Open notifications"/);
  assert.match(file, /<NotificationsScreen\/>/);
});

test("admin More does not duplicate the Financer Details workflow", () => {
  const file = source("src/screens/admin/LiveAdminAppScreen.tsx");
  const moreSection = file.slice(file.indexOf("function AdminMore"), file.indexOf("function AdminReports"));
  assert.doesNotMatch(moreSection, /Financer Details|AdminFinancerDetailsPanel/);
});

test("admin Financers header does not expose Add action", () => {
  const file = source("src/screens/admin/LiveAdminAppScreen.tsx");
  const headerStart = file.indexOf('return <Screen><Header title="Financers"');
  const headerEnd = file.indexOf('/><Field label="Search"', headerStart);
  assert.ok(headerStart >= 0 && headerEnd > headerStart);
  assert.doesNotMatch(file.slice(headerStart, headerEnd), /label="Add"/);
  assert.match(file.slice(headerStart, headerEnd), /label="Usage"/);
});

test("loan interest uses contractual month periods in both creation flows", () => {
  const input = source("src/screens/financer/loanInterest.ts");
  const compiled = ts.transpileModule(input, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", compiled)(module.exports, module);
  const { totalInterestForDuration, collectionInterestForFrequency } = module.exports;

  assert.equal(totalInterestForDuration(15000, 10, 1, "Months"), 1500);
  assert.equal(totalInterestForDuration(10000, 10, 1, "Months"), 1000);
  assert.equal(totalInterestForDuration(15000, 10, 1, "Weeks"), 350);
  assert.equal(totalInterestForDuration(15000, 10, 1, "Days"), 50);
  assert.equal(collectionInterestForFrequency(15000, 10, "Monthly", 1500), 1500);
  assert.equal(collectionInterestForFrequency(15000, 10, "AtMaturity", 1500), 1500);

  for (const screen of [
    "src/screens/financer/CustomersScreen.tsx",
    "src/screens/financer/LoansScreen.tsx",
  ]) {
    assert.match(source(screen), /totalInterestForDuration/, screen);
    assert.doesNotMatch(source(screen), /dateDays\(startDate, maturityDate\)/, screen);
  }
});

test("local calendar date helper survives UTC-boundary timestamps", () => {
  const input = source("src/utils/date.ts");
  const compiled = ts.transpileModule(input, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", compiled)(module.exports, module);
  const { localDateOnly, isValidDateOnly } = module.exports;

  assert.equal(localDateOnly(new Date(2026, 7, 28, 0, 15)), "2026-08-28");
  assert.equal(localDateOnly(new Date(2026, 11, 31, 23, 59)), "2026-12-31");
  assert.equal(isValidDateOnly("2028-02-29"), true);
  assert.equal(isValidDateOnly("2026-02-29"), false);
  assert.equal(isValidDateOnly("2026-02-31"), false);
});

test("currency formatter never renders NaN and handles negatives", () => {
  const input = source("src/utils/format.ts");
  const compiled = ts.transpileModule(input, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", compiled)(module.exports, module);
  const { formatInr } = module.exports;
  assert.equal(formatInr("not-a-number"), "—");
  assert.doesNotMatch(formatInr(-1234.5), /NaN/);
  assert.match(formatInr(1234567.89), /12,34,567\.89/);
  assert.match(formatInr(null), /0/);
});

test("API transport has timeout and friendly network errors", () => {
  const file = source("src/services/apiClient.ts");
  assert.match(file, /REQUEST_TIMEOUT_MS = 20_000/);
  assert.match(file, /The request timed out\. Check your connection and try again\./);
  assert.match(file, /Unable to connect\. Check your internet connection and try again\./);
});

test("service-charge status and effective date are persisted", () => {
  const mobile = source("src/screens/admin/AdminServiceChargesScreen.tsx");
  const backend = source("inrfs_financer_api/src/INRFS.Financer.Infrastructure/PlatformService.cs");
  assert.match(mobile, /ServiceChargeConfigurationStatus/);
  assert.match(mobile, /ServiceChargeEffectiveDate/);
  assert.match(backend, /overrideIsActive/);
  assert.match(backend, /overrideIsEffective/);
});

test("service charge labels 26th-to-25th cycles by their closing month", () => {
  const input = source("src/utils/billingPeriod.ts");
  const compiled = ts.transpileModule(input, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", compiled)(module.exports, module);
  const { formatBillingPeriodLabel } = module.exports;

  assert.equal(formatBillingPeriodLabel("2026-09-25", "2026-08-26"), "September 2026");
  assert.equal(formatBillingPeriodLabel("2026-08-25", "2026-07-26"), "August 2026");
  assert.equal(formatBillingPeriodLabel(null, "2026-08-01"), "August 2026");

  const serviceCharge = source("src/utils/serviceCharge.ts");
  assert.match(serviceCharge, /formatBillingPeriodLabel\(item\.periodEnd, item\.periodStart\)/);
});

test("mobile service-charge statuses match web billing rules", () => {
  const input = source("src/utils/serviceCharge.ts")
    .replace('import { formatBillingPeriodLabel } from "./billingPeriod";', 'const formatBillingPeriodLabel = (end) => end;');
  const compiled = ts.transpileModule(input, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", compiled)(module.exports, module);
  const { groupServiceCharges, withLiveInterestCollected } = module.exports;

  const rows = groupServiceCharges([{ periodStart: "2026-07-26", periodEnd: "2026-08-25", chargeAmount: 0, collectedAmount: 0, chargePercentage: 1, status: "Due" }], "2026-08-28");
  assert.equal(rows[0].status, "No Charge");

  const current = withLiveInterestCollected({ periodStart: "2026-08-26", periodEnd: "2026-09-25", chargeRate: 1, amountPaid: 0 }, [
    { status: "Completed", receivedAt: "2026-08-28T06:30:00Z", interestAmount: 12200.01 },
  ]);
  assert.equal(current.interestCollected, 12200.01);
  assert.equal(current.amountPayable, 122);
  assert.equal(current.status, "Accruing");

  const screen = source("src/screens/financer/FinancerServiceChargeScreen.tsx");
  assert.match(screen, /data=\{billing\}/);
  assert.doesNotMatch(screen, /data=\{billing\.slice\(1\)\}/);
});

test("active date defaults do not derive local today from UTC ISO", () => {
  const activeFiles = [
    "src/screens/financer/DashboardScreen.tsx",
    "src/screens/financer/CustomersScreen.tsx",
    "src/screens/financer/DuesScreen.tsx",
    "src/screens/admin/LiveAdminAppScreen.tsx",
    "src/screens/admin/AdminCollectionsScreen.tsx",
    "src/screens/admin/AdminServiceChargesScreen.tsx",
  ];
  for (const file of activeFiles) {
    assert.doesNotMatch(source(file), /new Date\(\)\.toISOString\(\)\.slice\(0,\s*10\)/, file);
  }
});
