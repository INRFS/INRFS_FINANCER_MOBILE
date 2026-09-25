const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(process.cwd());
const source = relative => fs.readFileSync(path.join(root, relative), "utf8");

const compileModule = (relativePath) => {
  const input = source(relativePath);
  const compiled = ts.transpileModule(input, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", "require", compiled)(module.exports, module, (id) => {
    if (id === "./billingPeriod") {
      return compileModule("src/utils/billingPeriod.ts");
    }
    return require(id);
  });
  return module.exports;
};

test("Requirement 2: determines current billing month dynamically from reference date", () => {
  const { calculateMonthlyServiceCharges } = compileModule("src/utils/serviceCharge.ts");

  const sepResult = calculateMonthlyServiceCharges({
    invoices: [],
    loans: [],
    referenceDate: new Date("2026-09-24T12:00:00Z"),
  });
  assert.equal(sepResult[0].month, "September 2026");
  assert.equal(sepResult[0].status, "No Charge");

  const octResult = calculateMonthlyServiceCharges({
    invoices: [],
    loans: [],
    referenceDate: new Date("2026-10-01T00:00:00Z"),
  });
  assert.equal(octResult[0].month, "October 2026");

  const novResult = calculateMonthlyServiceCharges({
    invoices: [],
    loans: [],
    referenceDate: new Date("2026-11-15T00:00:00Z"),
  });
  assert.equal(novResult[0].month, "November 2026");

  const janNextYear = calculateMonthlyServiceCharges({
    invoices: [],
    loans: [],
    referenceDate: new Date("2027-01-10T00:00:00Z"),
  });
  assert.equal(janNextYear[0].month, "January 2027");
});

test("Requirement 3 & 4: monthly loan-based service charge calculation and same-month updates", () => {
  const { calculateMonthlyServiceCharges } = compileModule("src/utils/serviceCharge.ts");

  // Single loan of 10,000 at 1%
  const loans1 = [
    {
      id: "loan-1",
      principal: 10000,
      startDate: "2026-09-10",
    },
  ];

  const result1 = calculateMonthlyServiceCharges({
    invoices: [],
    loans: loans1,
    defaultRate: 1,
    referenceDate: new Date("2026-09-24"),
  });

  assert.equal(result1[0].month, "September 2026");
  assert.equal(result1[0].interestCollected, 10000);
  assert.equal(result1[0].chargeRate, 1);
  assert.equal(result1[0].amountPayable, 100);
  assert.equal(result1[0].outstanding, 100);
  assert.equal(result1[0].status, "Pending");

  // When another loan of 10,000 is issued in the same month
  const loans2 = [
    {
      id: "loan-1",
      principal: 10000,
      startDate: "2026-09-10",
    },
    {
      id: "loan-2",
      principal: 10000,
      startDate: "2026-09-24",
    },
  ];

  const result2 = calculateMonthlyServiceCharges({
    invoices: [],
    loans: loans2,
    defaultRate: 1,
    referenceDate: new Date("2026-09-24"),
  });

  assert.equal(result2[0].month, "September 2026");
  assert.equal(result2[0].interestCollected, 20000);
  assert.equal(result2[0].chargeRate, 1);
  assert.equal(result2[0].amountPayable, 200);
  assert.equal(result2[0].outstanding, 200);
});

test("Requirement 5: fixed percentage does not mean fixed amount", () => {
  const { calculateMonthlyServiceCharges } = compileModule("src/utils/serviceCharge.ts");

  const lowLoan = calculateMonthlyServiceCharges({
    loans: [{ id: "l1", principal: 5000, startDate: "2026-09-01" }],
    defaultRate: 2,
    referenceDate: new Date("2026-09-15"),
  });
  assert.equal(lowLoan[0].amountPayable, 100); // 2% of 5,000

  const highLoan = calculateMonthlyServiceCharges({
    loans: [{ id: "l2", principal: 50000, startDate: "2026-09-01" }],
    defaultRate: 2,
    referenceDate: new Date("2026-09-15"),
  });
  assert.equal(highLoan[0].amountPayable, 1000); // 2% of 50,000
});

test("Requirement 6: month isolation between September and October", () => {
  const { calculateMonthlyServiceCharges } = compileModule("src/utils/serviceCharge.ts");

  const loans = [
    { id: "loan-sep-1", principal: 10000, startDate: "2026-09-10" },
    { id: "loan-sep-2", principal: 10000, startDate: "2026-09-23" },
    { id: "loan-oct-1", principal: 15000, startDate: "2026-10-05" },
  ];

  const result = calculateMonthlyServiceCharges({
    invoices: [],
    loans,
    defaultRate: 1,
    referenceDate: new Date("2026-10-10"),
  });

  assert.equal(result.length, 2);

  const octMonth = result.find(r => r.month === "October 2026");
  const sepMonth = result.find(r => r.month === "September 2026");

  assert.ok(octMonth);
  assert.ok(sepMonth);

  // October only includes October loan (15,000 * 1% = 150)
  assert.equal(octMonth.interestCollected, 15000);
  assert.equal(octMonth.amountPayable, 150);

  // September only includes September loans (20,000 * 1% = 200)
  assert.equal(sepMonth.interestCollected, 20000);
  assert.equal(sepMonth.amountPayable, 200);
});

test("Requirement 7: Service Charge History remains intact with past invoices", () => {
  const { calculateMonthlyServiceCharges } = compileModule("src/utils/serviceCharge.ts");

  const pastInvoices = [
    {
      id: "inv-aug",
      billingMonth: "2026-08",
      interestActivity: 24000,
      chargeAmount: 240,
      collectedAmount: 240,
      chargePercentage: 1,
      status: "Paid",
    },
    {
      id: "inv-jul",
      billingMonth: "2026-07",
      interestActivity: 22000,
      chargeAmount: 220,
      collectedAmount: 220,
      chargePercentage: 1,
      status: "Paid",
    },
  ];

  const loans = [
    { id: "loan-sep", principal: 10000, startDate: "2026-09-15" },
  ];

  const result = calculateMonthlyServiceCharges({
    invoices: pastInvoices,
    loans,
    defaultRate: 1,
    referenceDate: new Date("2026-09-24"),
  });

  assert.equal(result.length, 3);
  assert.equal(result[0].month, "September 2026");
  assert.equal(result[0].amountPayable, 100);
  assert.equal(result[0].status, "Pending");

  assert.equal(result[1].month, "August 2026");
  assert.equal(result[1].amountPayable, 240);
  assert.equal(result[1].amountPaid, 240);
  assert.equal(result[1].status, "Paid");

  assert.equal(result[2].month, "July 2026");
  assert.equal(result[2].amountPayable, 220);
  assert.equal(result[2].amountPaid, 220);
  assert.equal(result[2].status, "Paid");
});
