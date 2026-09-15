const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const nodePath = require("node:path");
const cache = new Map();
function moduleFrom(filename) {
  const path = nodePath.resolve(filename);
  if (cache.has(path)) return cache.get(path);
  const source = ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  cache.set(path, exports);
  vm.runInNewContext(source, { exports, require: id => id.startsWith(".") ? moduleFrom(nodePath.resolve(nodePath.dirname(path), id === "./parser" ? "./parser/index.ts" : `${id}.ts`)) : require(id), TextEncoder, Date, Number, String, Math, Buffer });
  return exports;
}
const { fixtures } = moduleFrom("tests/fixtures/pnr.ts");
function fixtureRaw(id) {
  const fixture = fixtures.find(item => item.id === id);
  assert.ok(fixture, `Missing fixture: ${id}`);
  return fixture.raw;
}
const converter = moduleFrom("lib/converter.ts");
const { parsePnr, formatQuote, displayPnrTime, formatFare } = converter;
const { generatePdf } = moduleFrom("lib/pdf/generator.ts");
const { adaptParseResult, unresolvedBlockers } = moduleFrom("lib/parser/adapter.ts");
const { parseStructuredPnr } = moduleFrom("lib/parser/index.ts");
const { amadeusFixtures } = moduleFrom("tests/fixtures/amadeus.ts");
test("adapter refuses fabricated dates, cabins and passenger types", () => {
  const source = parseStructuredPnr(amadeusFixtures[2].raw);
  const preview = adaptParseResult(source);
  assert.equal(preview.persistable, false);
  assert.equal(preview.passengerCount, 2);
  assert.equal(preview.flightCount, 2);
  assert.deepEqual(Array.from(preview.fields.passengers, p => p.type), ["", ""]);
  assert.deepEqual(Array.from(preview.fields.flights, f => [f.departure_at, f.arrival_at, f.cabin]), [["", "", ""], ["", "", ""]]);
  assert.ok(preview.diagnostics.some(d => d.code === "UNCONFIRMED_FLIGHT_STATUS" && d.severity === "blocking"));
  const legacy = parsePnr(amadeusFixtures[2].raw, new Date("2026-09-15"));
  assert.equal(legacy.parserReview.mode, "legacy_fallback");
  assert.ok(unresolvedBlockers(legacy.parserReview).some(d => d.code === "UNCONFIRMED_FLIGHT_STATUS"));
});
test("legacy preview exposes structured count disagreement before save", () => {
  const raw = fixtureRaw("galileo_cx_wrapped");
  const result = parsePnr(raw, new Date("2026-09-15"));
  assert.equal(result.parserReview.source.gds.value, "galileo");
  assert.equal(result.parserReview.passengerCount, 4);
  assert.equal(result.parserReview.flightCount, 4);
  assert.equal(unresolvedBlockers(result.parserReview).some(d => d.code === "LOCAL_DATE_STORAGE_PENDING"), false);
  const amadeus = parsePnr(amadeusFixtures[0].raw, new Date("2026-09-15"));
  assert.ok(amadeus.parserReview.diagnostics.some(d => d.code === "PARSER_COUNT_DISAGREEMENT"));
  const unknown = parsePnr("PNR: TEST27\n1.DOE JANE\nBG 341 J 15JAN27 DACDXB 0830 1130", new Date("2026-09-15"));
  assert.equal(unknown.parserReview.source.gds.value, null);
  assert.ok(unknown.parserReview.diagnostics.some(d => d.code === "LEGACY_FORMAT_FALLBACK"));
  assert.equal(unresolvedBlockers(unknown.parserReview).some(d => d.code === "GDS_UNKNOWN"), false);
});
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
  assert.match(quote, /2027-01-15 08:30/);
  assert.doesNotMatch(quote, /\+00:00/);
  assert.match(quote, /Confirm local dates, times and year/);
  assert.equal(displayPnrTime("2027-01-15T08:30:00+00:00"), "2027-01-15 08:30");
  assert.doesNotMatch(quote, /[\u0980-\u09ff]/);
  const pdf = Buffer.from(generatePdf(conversion));
  assert.match(pdf.toString("latin1"), /^%PDF-1\.4/);
  assert.match(pdf.toString("latin1"), /FARE AND CONDITIONS/);
  assert.doesNotMatch(pdf.toString("latin1"), /\+00:00/);
  assert.doesNotMatch(pdf.toString("latin1"), /[\u0980-\u09ff]/);
});
test("parses wrapped Galileo four-passenger itinerary, ARNK, and next-day arrival", () => {
  const raw = fixtureRaw("galileo_cx_wrapped");
  const result = parsePnr(raw, new Date("2026-09-15"));
  assert.equal(result.gds_type, "galileo");
  assert.equal(result.pnr_code, "TEST01");
  assert.deepEqual(Array.from(result.passengers, p => p.name), ["DOE ASHEKA", "DOE FAISAL", "DOE SANAYA ALEENA", "DOE AYAAN ZARRAF"]);
  assert.deepEqual(Array.from(result.flights, f => `${f.airline} ${f.flight_number}`), ["CX 662", "CX 506", "CX 549", "CX 667"]);
  assert.equal(result.flights[3].arrival_at, "2026-11-29T01:00:00");
});
test("parses wrapped Galileo Emirates segments and arrival markers", () => {
  const raw = fixtureRaw("galileo_ek_wrapped");
  const result = parsePnr(raw, new Date("2026-07-01"));
  assert.equal(result.gds_type, "galileo");
  assert.equal(result.passengers.length, 1);
  assert.deepEqual(Array.from(result.flights, f => f.flight_number), ["583", "203", "204", "584"]);
  assert.equal(result.flights[2].arrival_at, "2026-09-15T07:55:00");
});
test("parses Sabre compact flights with weekday, status and explicit previous-day arrival", () => {
  const raw = fixtureRaw("sabre_cz_weekday");
  const result = parsePnr(raw, new Date("2026-07-01"));
  assert.equal(result.gds_type, "sabre");
  assert.equal(result.passengers.length, 1);
  assert.deepEqual(Array.from(result.flights, f => f.flight_number), ["5016", "329"]);
  assert.equal(result.flights[1].arrival_at, "2026-09-11T21:45:00");
});
test("parses Sabre wrapped multi-part name, ARNK and two explicit arrival dates", () => {
  const raw = fixtureRaw("sabre_tk_arnk");
  const result = parsePnr(raw, new Date("2026-08-01"));
  assert.equal(result.gds_type, "sabre");
  assert.equal(result.pnr_code, "TEST99");
  assert.deepEqual(Array.from(result.passengers, p => p.name), ["DOE N R M BORHAN"]);
  assert.deepEqual(Array.from(result.flights, f => f.flight_number), ["713", "29", "192", "712"]);
  assert.equal(result.flights[2].arrival_at, "2026-11-11T17:10:00");
  assert.equal(result.flights[3].arrival_at, "2026-11-12T05:50:00");
});
test("parses Galileo space-before-dot flights and the second passenger using the vendor time-limit year", () => {
  const raw = fixtureRaw("galileo_bs_spaced");
  const result = parsePnr(raw, new Date("2026-09-15"));
  assert.equal(result.gds_type, "galileo");
  assert.equal(result.pnr_code, "TEST02");
  assert.deepEqual(Array.from(result.passengers, p => p.name), ["DOE JANE ANN", "DOE JOHN ADAM"]);
  assert.deepEqual(Array.from(result.flights, f => `${f.airline} ${f.flight_number} ${f.origin}-${f.destination}`), ["BS 105 DAC-CGP", "BS 322 CGP-OAC"]);
  assert.equal(result.flights[0].departure_at, "2025-07-25T09:40:00");
  assert.equal(result.flights[1].arrival_at, "2025-07-27T10:35:00");
});
test("does not invent a fare, cabin or hotel heading in a flight-only PDF", () => {
  const raw = "PNR: TEST27\n1.DOE JANE\nBG 341 J 15JAN27 DACDXB 0830 1130";
  const parsed = parsePnr(raw, new Date("2026-09-15"));
  const conversion = { ...parsed, raw_text: raw, status: "completed", fare_amount: 0, fare_currency: "BDT", baggage_info: "", cancellation_rule: "", reissue_rule: "" };
  assert.equal(parsed.flights[0].cabin, "");
  assert.equal(formatFare(conversion), "To be confirmed");
  assert.match(formatQuote(conversion), /\*Fare:\* To be confirmed/);
  assert.doesNotMatch(formatQuote(conversion), /BDT 0\b/);
  const pdf = Buffer.from(generatePdf({ ...conversion, flights: parsed.flights.map(f => ({ ...f, cabin: "economy" })) })).toString("latin1");
  assert.match(pdf, /Fare: To be confirmed/);
  assert.doesNotMatch(pdf, /economy|HOTELS|Fare: BDT 0/);
});
