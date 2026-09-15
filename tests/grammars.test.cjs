const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const cache = new Map();
function load(filename) {
  const file = path.resolve(filename);
  if (cache.has(file)) return cache.get(file);
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  cache.set(file, exports);
  vm.runInNewContext(js, { exports, require: id => id.startsWith(".") ? load(path.resolve(path.dirname(file), id + ".ts")) : require(id) });
  return exports;
}
const { fixtures } = load("tests/fixtures/pnr.ts");
const { parseStructuredPnr } = load("lib/parser/index.ts");
const { detectGds } = load("lib/parser/detector.ts");
const { lexPnr } = load("lib/parser/lexer.ts");

for (const fixture of fixtures) {
  test(`structured ${fixture.id}: counts, statuses, RBD, routes and source lines`, () => {
    const result = parseStructuredPnr(fixture.raw);
    const detection = detectGds(lexPnr(fixture.raw));
    assert.equal(detection.gds, fixture.gds);
    assert.ok(detection.evidence.length);
    assert.equal(result.gds.value, fixture.gds);
    const flights = result.itinerary.filter(record => record.kind === "flight");
    const gaps = result.itinerary.filter(record => record.kind === "ground_gap");
    assert.equal(result.passengers.length, fixture.expected.passengerCount);
    assert.equal(flights.length, fixture.expected.flightCount);
    assert.equal(gaps.length, fixture.expected.groundGapCount);
    assert.deepEqual(Array.from(result.passengers, p => p.name.value), Array.from(fixture.expected.passengers, p => p.name));
    fixture.expected.passengers.forEach((expected, i) => {
      assert.deepEqual([result.passengers[i].source.startLine, result.passengers[i].source.endLine], [expected.source.startLine, expected.source.endLine]);
    });
    fixture.expected.flights.forEach((expected, i) => {
      const actual = flights[i];
      assert.deepEqual([actual.gdsSegmentNumber, actual.airline.value, actual.flightNumber.value, actual.origin.value, actual.destination.value, actual.status.value, actual.rbd.value],
        [expected.segmentNumber, expected.airline, expected.flightNumber, expected.origin, expected.destination, expected.status, expected.rbd]);
      assert.deepEqual([actual.source.startLine, actual.source.endLine], [expected.source.startLine, expected.source.endLine]);
      assert.equal(actual.cabin.value, null);
      assert.equal(actual.departure.date.state, "unverified");
      assert.equal(actual.departure.timeZone.value, null);
    });
    fixture.expected.groundGaps.forEach((expected, i) => {
      assert.equal(gaps[i].gdsSegmentNumber, expected.segmentNumber);
      assert.deepEqual([gaps[i].source.startLine, gaps[i].source.endLine], [expected.source.startLine, expected.source.endLine]);
    });
    assert.equal(result.itinerary.filter(record => record.kind === "unparsed").length, 0);
  });
}

test("unknown, conflicting and unsupported Amadeus sources block rather than guess", () => {
  const unknown = parseStructuredPnr("UNRECOGNIZED PNR\n1 UNKNOWN");
  assert.equal(unknown.gds.value, null);
  assert.equal(unknown.diagnostics[0].code, "GDS_UNKNOWN");
  assert.equal(unknown.diagnostics[0].severity, "blocking");
  assert.equal(unknown.itinerary.length, 2);
  const mixed = parseStructuredPnr("TKT/TIME LIMIT\n* FILED FARE DATA EXISTS *");
  assert.equal(mixed.diagnostics[0].code, "GDS_AMBIGUOUS");
  const amadeus = parseStructuredPnr("RP/DAC1A1234/DAC1A1234 AA/SU 15SEP26/1200Z\n--- RLR ---");
  assert.equal(amadeus.gds.value, "amadeus");
  assert.equal(amadeus.diagnostics[0].code, "AMADEUS_GRAMMAR_PENDING");
});

test("incomplete segments and missing passenger names produce explicit diagnostics", () => {
  const broken = parseStructuredPnr("TEST02/SA DACOU 7M6WSA AG 00000000 22JUL\n1. BS 105 K 25JUL DACCGP HK2 0940\n* FILED FARE DATA EXISTS *");
  assert.ok(broken.diagnostics.some(d => d.code === "ARRIVAL_TIME_MISSING" && d.severity === "blocking"));
  assert.ok(broken.diagnostics.some(d => d.code === "NO_PASSENGERS" && d.severity === "blocking"));
  assert.equal(broken.itinerary.filter(record => record.kind === "flight").length, 1);
});

test("Galileo state machine retains 120 numbered passengers and 80 dynamic segments", () => {
  const raw = ["TEST02/SA DACOU 7M6WSA AG 00000000 22JUL",
    ...Array.from({ length: 120 }, (_, i) => `${i + 1}.1DOE/AGENT${i + 1} MR`),
    ...Array.from({ length: 80 }, (_, i) => `${i + 1}. BS 105 K 25JUL DACCGP HK1 0940 1035 O* E FR`),
    "* FILED FARE DATA EXISTS *"].join("\n");
  const result = parseStructuredPnr(raw);
  assert.equal(result.passengers.length, 120);
  assert.equal(result.itinerary.filter(record => record.kind === "flight").length, 80);
  assert.equal(result.passengers[119].name.value, "DOE AGENT120");
  assert.equal(result.itinerary.filter(record => record.kind === "flight")[79].source.startLine, 201);
  assert.ok(!result.diagnostics.some(d => d.severity === "blocking"));
});
