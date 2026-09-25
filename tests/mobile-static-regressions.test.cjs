const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(process.cwd());
const source = relative => fs.readFileSync(path.join(root, relative), "utf8");

function loadTsModule(relative, mocks) {
  const compiled = ts.transpileModule(source(relative), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "exports", "module", compiled)(name => mocks[name] || {}, module.exports, module);
  return module.exports;
}

test("document uploads validate sizes including picker assets without size metadata", async () => {
  let info = { exists: true, isDirectory: false, size: 2000 };
  let inspected = 0;
  const { validateDocumentForUpload, MAX_DOCUMENT_SIZE_BYTES } = loadTsModule("src/services/nativeDocuments.ts", {
    "expo-file-system/legacy": { getInfoAsync: async () => { inspected++; return info; } },
  });
  const asset = { uri: "file:///document.jpg", name: "document.jpg", mimeType: "image/jpeg" };
  await validateDocumentForUpload({ ...asset, size: MAX_DOCUMENT_SIZE_BYTES });
  await assert.rejects(validateDocumentForUpload({ ...asset, size: MAX_DOCUMENT_SIZE_BYTES + 1 }), /smaller than 10 MB/);
  assert.equal(inspected, 0);
  await validateDocumentForUpload(asset);
  assert.equal(inspected, 1);
  info = { ...info, size: MAX_DOCUMENT_SIZE_BYTES + 1 };
  await assert.rejects(validateDocumentForUpload(asset), /too large/);
  info = { exists: false };
  await assert.rejects(validateDocumentForUpload(asset), /Cannot read/);
  await assert.rejects(validateDocumentForUpload({ ...asset, size: 0 }), /empty or unreadable/);
});

test("customer onboarding rejects oversized documents before creating a customer", async () => {
  let creates = 0;
  const { saveCustomerWithDocuments } = loadTsModule("src/services/customerOnboarding.ts", {
    "./platformApi": { platformApi: { customers: { create: async () => { creates++; return { id: "customer-1" }; } } } },
    "./nativeDocuments": {
      validateDocumentForUpload: async asset => { if (asset.name === "large.jpg") throw new Error("too large"); },
      uploadPickedDocument: async () => assert.fail("Must not upload before all documents are validated"),
    },
  });
  await assert.rejects(saveCustomerWithDocuments({}, [
    { asset: { name: "small.jpg" }, category: "Aadhaar" },
    { asset: { name: "large.jpg" }, category: "Pan" },
  ], { uploadedDocuments: new Set() }), /too large/);
  assert.equal(creates, 0);
});

test("customer onboarding retries remaining documents without creating duplicates", async () => {
  let creates = 0;
  let updates = 0;
  let failPan = true;
  const uploads = [];
  const { saveCustomerWithDocuments } = loadTsModule("src/services/customerOnboarding.ts", {
    "./platformApi": { platformApi: { customers: {
      create: async () => { creates++; return { id: "customer-1" }; },
      get: async id => { assert.equal(id, "customer-1"); return { status: "Suspended" }; },
      update: async (id, details) => {
        assert.equal(id, "customer-1");
        assert.equal(details.status, "Suspended");
        updates++;
      },
    } } },
    "./nativeDocuments": {
      validateDocumentForUpload: async () => {},
      uploadPickedDocument: async (asset, category, owner) => {
        assert.equal(owner.customerId, "customer-1");
        uploads.push(category);
        if (category === "Pan" && failPan) { failPan = false; throw new Error("upload failed"); }
      },
    },
  });
  const documents = [
    { asset: { name: "aadhaar.jpg" }, category: "Aadhaar" },
    { asset: { name: "pan.jpg" }, category: "Pan" },
  ];
  const progress = { uploadedDocuments: new Set() };
  await assert.rejects(saveCustomerWithDocuments({}, documents, progress), /upload failed/);
  await saveCustomerWithDocuments({}, documents, progress);
  assert.equal(creates, 1);
  assert.equal(updates, 1);
  assert.deepEqual(uploads, ["Aadhaar", "Pan", "Pan"]);
  assert.equal(progress.uploadedDocuments.size, 2);
});

test("customer onboarding does not update without a confirmed customer status", async () => {
  const { saveCustomerWithDocuments } = loadTsModule("src/services/customerOnboarding.ts", {
    "./platformApi": { platformApi: { customers: {
      get: async () => ({}),
      update: async () => assert.fail("Must not reset status when the server value is missing"),
    } } },
    "./nativeDocuments": { validateDocumentForUpload: async () => {} },
  });
  await assert.rejects(saveCustomerWithDocuments({}, [], {
    customerId: "customer-1", uploadedDocuments: new Set(),
  }), /Could not confirm customer status/);
});

test("customer payment sends the selected backend payment type", () => {
  const file = source("src/screens/financer/CustomersScreen.tsx");
  assert.match(file, /paymentType:\s*type === "Interest Only" \? "InterestOnly"/);
  assert.match(file, /"Full Settlement" \? "FullSettlement" : "Regular"/);
});

test("customer payment exposes every active loan", () => {
  const file = source("src/screens/financer/CustomersScreen.tsx");
  assert.doesNotMatch(file, /activeLoans\.map\([\s\S]{0,160}\.slice\(0,\s*3\)/);
});

test("customer details fetches exact identity values and prefers them over list masks", () => {
  const file = source("src/screens/financer/CustomersScreen.tsx");
  assert.match(file, /platformApi\.customers\.get\(customer\.id\)/);
  assert.match(file, /title="Aadhaar" subtitle=\{customer\.aadhaar \|\| customer\.aadhaarMasked \|\| "-"\}/);
  assert.match(file, /title="PAN" subtitle=\{customer\.pan \|\| customer\.panMasked \|\| "-"\}/);
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

test("mobile navigation bars respect Android button and gesture safe areas", () => {
  const admin = source("src/screens/admin/LiveAdminAppScreen.tsx");
  const financer = source("src/navigation/FinancerDrawerNavigator.tsx");
  const legacyFinancer = source("src/screens/financer/FinancerAppScreen.tsx");
  assert.match(admin, /<SafeAreaView edges=\{\["bottom"\]\} style=\{styles\.nav\}>/);
  assert.match(financer, /const bottomInset = Math\.max\(insets\.bottom, 8\)/);
  assert.match(financer, /height: 56 \+ bottomInset, paddingBottom: bottomInset/);
  assert.match(legacyFinancer, /<SafeAreaView edges=\{\["bottom"\]\} style=\{styles\.bottomNav\}>/);
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

test("landing screen uses one centralized login for admin and financer accounts", () => {
  const file = source("src/screens/auth/AuthScreens.tsx");
  const landing = file.slice(file.indexOf("export function PortalSelectionScreen"), file.indexOf("type LoginProps"));
  assert.match(landing, /Email or Mobile Number/);
  assert.match(landing, /normalizedIdentifier\.includes\("@"\)/);
  assert.match(landing, /api\.post\("\/auth\/login"/);
  assert.match(landing, /api\.post\("\/auth\/login\/financer"/);
  assert.doesNotMatch(landing, /PortalCard|Choose your portal/);
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
  assert.match(file, /const url = `\$\{API_BASE_URL\}/);
  assert.doesNotMatch(file, /candidateBases|app\.inrfs\.com|financer-api/);
});

test("service-charge status and effective date are persisted", () => {
  const mobile = source("src/screens/admin/AdminServiceChargesScreen.tsx");
  assert.match(mobile, /ServiceChargeConfigurationStatus/);
  assert.match(mobile, /ServiceChargeEffectiveDate/);
  const backendPath = path.join(root, "inrfs_financer_api/src/INRFS.Financer.Infrastructure/PlatformService.cs");
  if (fs.existsSync(backendPath)) {
    const backend = fs.readFileSync(backendPath, "utf8");
    assert.match(backend, /overrideIsActive/);
    assert.match(backend, /overrideIsEffective/);
  }
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

test("decorative login background waves and ambient shapes are strictly login-only", () => {
  const sharedUi = source("src/components/ui.tsx");
  assert.doesNotMatch(sharedUi, /BottomOceanWaves/);
  assert.doesNotMatch(sharedUi, /ambientWaveTop/);
  assert.doesNotMatch(sharedUi, /TopOceanHeaderDecor/);

  const dashboard = source("src/screens/financer/DashboardScreen.tsx");
  assert.doesNotMatch(dashboard, /BottomOceanWaves/);
  assert.doesNotMatch(dashboard, /ambientWaveTop/);
  assert.doesNotMatch(dashboard, /TopOceanHeaderDecor/);

  const auth = source("src/screens/auth/AuthScreens.tsx");
  assert.match(auth, /BottomOceanWaves/);
  assert.match(auth, /ambientWaveTop/);
  assert.match(auth, /TopOceanHeaderDecor/);
});

