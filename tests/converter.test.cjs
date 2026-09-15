const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function moduleFrom(path, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: (id) => dependencies[id] ?? require(id), TextEncoder, Date, Number, String, Math, Buffer });
  return exports;
}
const converter = moduleFrom("lib/converter.ts");
const { parsePnr, formatQuote, displayPnrTime, formatFare } = converter;
const { generatePdf } = moduleFrom("lib/pdf/generator.ts", { "../converter": converter });
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
  const raw = `TEST01/KJ DACOU 81WJKJ AG 00000000 27JUN
1.1DOE/ASHEKA
MRS  2.1DOE/FAISAL MR
3.1DOE/SANAYA ALEENA MS  4.1DOE/AYAAN ZARRAF MR
1. CX 662 Q 14NOV DACHKG HK4 0210
0810 O* E SA 1
2. CX 506 Q 14NOVHKGKIX HK4 1025
1510 O* E SA 1
3. ARNK
4. CX 549 Q 28NOV HNDHKG HK4 1620
2000 O* E SA 2
5. CX 667 Q 28NOV HKGDAC HK4 2255
#0100 O* E SA/SU 2
* FILED FARE DATA EXISTS * >*FF`;
  const result = parsePnr(raw, new Date("2026-09-15"));
  assert.equal(result.gds_type, "galileo");
  assert.equal(result.pnr_code, "TEST01");
  assert.deepEqual(Array.from(result.passengers, p => p.name), ["DOE ASHEKA", "DOE FAISAL", "DOE SANAYA ALEENA", "DOE AYAAN ZARRAF"]);
  assert.deepEqual(Array.from(result.flights, f => `${f.airline} ${f.flight_number}`), ["CX 662", "CX 506", "CX 549", "CX 667"]);
  assert.equal(result.flights[3].arrival_at, "2026-11-29T01:00:00");
});
test("parses wrapped Galileo Emirates segments and arrival markers", () => {
  const raw = `1.1DOE/NABAN MR
1. EK
583 X 14AUG DACDXB HS1 1230 1555 O E WE 1
2. EK 203 E 17AUG DXBJFK HS1 0235 0815 O E SA 1
3. EK 204 E 14SEP JFKDXB HS1 1120 #0755 O E TH/FR 2
4. EK 584 X 17SEP DXBDAC HS1 1645 2320 O E SU 2
* FILED FARE DATA EXISTS * >*FF`;
  const result = parsePnr(raw, new Date("2026-07-01"));
  assert.equal(result.gds_type, "galileo");
  assert.equal(result.passengers.length, 1);
  assert.deepEqual(Array.from(result.flights, f => f.flight_number), ["583", "203", "204", "584"]);
  assert.equal(result.flights[2].arrival_at, "2026-09-15T07:55:00");
});
test("parses Sabre compact flights with weekday, status and explicit previous-day arrival", () => {
  const raw = `1.1DOE/MARUF MR
3 CZ5016E 11SEP 5 DACCAN*HK1 1315 1905 HRS /DCCZ*XXXXXX /E
4 CZ 329E 12SEP 6 CANYVR*HK1 0050 2145 11SEP 5 HRS
/DCCZ*XXXXXX /E
TKT/TIME LIMIT
1.T-09JUL-XXXX*ASQ
GENERAL FACTS
1.SSR ADPI 1B HK1 CZ0329 REQ SEC FLT PAGR DATA`;
  const result = parsePnr(raw, new Date("2026-07-01"));
  assert.equal(result.gds_type, "sabre");
  assert.equal(result.passengers.length, 1);
  assert.deepEqual(Array.from(result.flights, f => f.flight_number), ["5016", "329"]);
  assert.equal(result.flights[1].arrival_at, "2026-09-11T21:45:00");
});
test("parses Sabre wrapped multi-part name, ARNK and two explicit arrival dates", () => {
  const raw = `TEST99
1.1DOE/N R M BORHAN MR
1 TK 713E 13SEP 7 DACIST*HK1 0650 1235 /DCTK*XXXXXX /E
2 TK 29E 15SEP 2 ISTEWR*HK1 1850 2230 /DCTK*XXXXXX /E
3 ARNK
4 TK 192L 10NOV 2 DFWIST*HK1 2010 1710 11NOV 3
/DCTK*XXXXXX /E
5 TK 712L 11NOV 3 ISTDAC*HK1 1930 0550 12NOV 4
/DCTK*XXXXXX /E
TKT/TIME LIMIT 1.T-12AUG-XXXX*ASI`;
  const result = parsePnr(raw, new Date("2026-08-01"));
  assert.equal(result.gds_type, "sabre");
  assert.equal(result.pnr_code, "TEST99");
  assert.deepEqual(Array.from(result.passengers, p => p.name), ["DOE N R M BORHAN"]);
  assert.deepEqual(Array.from(result.flights, f => f.flight_number), ["713", "29", "192", "712"]);
  assert.equal(result.flights[2].arrival_at, "2026-11-11T17:10:00");
  assert.equal(result.flights[3].arrival_at, "2026-11-12T05:50:00");
});
test("parses Galileo space-before-dot flights and the second passenger using the vendor time-limit year", () => {
  const raw = `TEST02/SA DACOU 7M6WSA AG 00000000 22JUL
1.1DOE/JANE ANN MRS  2.1DOE/JOHN ADAM MR
1 . BS 105 K 25JUL DACCGP HK2 0940 1035 O* E FR
2 . BS 322 K 27JUL CGPOAC HK2 0940 1035 O* E SU
VENDOR LOCATOR DATA EXISTS >*VL
VENDOR REMARKS
VRMK-VI/ABS *ADTK1GB5// TTL FOR AUTO CANX FIXED FOR 22JUL25 AT 1102 GMT`;
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
