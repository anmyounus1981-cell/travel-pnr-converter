const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function moduleFrom(path) {
  const source = ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require, TextEncoder, Date, Number, String, Math, Buffer });
  return exports;
}
const { parsePnr, formatQuote } = moduleFrom("lib/converter.ts");
const { generatePdf } = moduleFrom("lib/pdf/generator.ts");
test("parses and formats a two-passenger, two-flight and hotel PNR in English", () => {
  const raw = "PNR: ABC123\n1.MOHAMMAD RAHIM 2.FATIMA RAHIM\nBG 341 J 15JAN27 DACDXB 0830 1130\nEK 003 M 15JAN27 DXBLHR 1400 1820\nHTL MARRIOTT DOWNTOWN 15JAN27-20JAN27 5 NIGHTS";
  const parsed = parsePnr(raw, new Date("2026-09-15"));
  assert.equal(parsed.passengers.length, 2);
  assert.equal(parsed.flights.length, 2);
  assert.equal(parsed.hotels.length, 1);
  const conversion = { ...parsed, raw_text: raw, status: "completed", fare_amount: 85000, fare_currency: "BDT", baggage_info: "30kg checked + 7kg cabin", cancellation_rule: "Non-refundable", reissue_rule: "Reissue fee BDT 5,000" };
  const quote = formatQuote(conversion);
  assert.match(quote, /BDT 85,000/);
  assert.match(quote, /DAC → DXB/);
  assert.doesNotMatch(quote, /[\u0980-\u09ff]/);
  const pdf = Buffer.from(generatePdf(conversion));
  assert.match(pdf.toString("latin1"), /^%PDF-1\.4/);
  assert.match(pdf.toString("latin1"), /FARE AND CONDITIONS/);
  assert.doesNotMatch(pdf.toString("latin1"), /[\u0980-\u09ff]/);
});
