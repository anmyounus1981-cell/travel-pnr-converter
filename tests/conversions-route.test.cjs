const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const cache = new Map();
let writes = 0;
function load(filename) {
  const file = path.resolve(filename);
  if (cache.has(file)) return cache.get(file);
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  cache.set(file, exports);
  const mocked = {
    "next/server": { NextResponse: { json: (data, options = {}) => ({ status: options.status ?? 200, json: async () => data }) } },
    "@/lib/supabase/auth": { authenticatedAgent: async () => ({ id: "dummy-agent" }) },
    "@/lib/data/conversions": { saveConversion: async conversion => { writes++; return conversion; }, getConversion: async () => null, listConversions: async () => [], deleteConversion: async () => {} },
  };
  vm.runInNewContext(source, { exports, TextEncoder, Buffer, Date, URL, require: id => mocked[id] ?? (id.startsWith("@/") ? load(id.slice(2) + ".ts") : id.startsWith(".") ? load(path.resolve(path.dirname(file), id === "./parser" ? "./parser/index.ts" : `${id}.ts`)) : require(id)) });
  return exports;
}
const { POST } = load("app/api/conversions/route.ts");
const { fixtures } = load("tests/fixtures/pnr.ts");
const { amadeusFixtures } = load("tests/fixtures/amadeus.ts");
function post(body) { return POST(new Request("http://localhost/api/conversions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })); }

test("server requires acknowledgement and rejects unconfirmed Amadeus status without writing", async () => {
  const before = writes;
  const raw = amadeusFixtures[2].raw;
  assert.equal((await post({ raw_text: raw })).status, 400);
  const response = await post({ raw_text: raw, reviewed_source: true });
  assert.equal(response.status, 400);
  assert.equal(writes, before);
  assert.doesNotMatch(JSON.stringify(await response.json()), /DOE\/JANE|HL2|DUM003/);
});

test("server rejects client passenger count spoofing against structured evidence", async () => {
  const before = writes;
  const raw = fixtures.find(fixture => fixture.id === "galileo_bs_spaced").raw;
  const parsed = load("lib/converter.ts").parsePnr(raw, new Date("2026-09-15"));
  const body = { raw_text: raw, reviewed_source: true, passengers: parsed.passengers.slice(0, 1), flights: parsed.flights, hotels: [], fare_currency: "BDT" };
  const response = await post(body);
  assert.equal(response.status, 400);
  assert.equal(writes, before);
});

test("acknowledged older format remains saveable without writing parser state", async () => {
  const raw = "PNR: TEST27\n1.DOE JANE\nBG 341 J 15JAN27 DACDXB 0830 1130";
  const before = writes;
  const response = await post({ raw_text: raw, reviewed_source: true, parserReview: { injected: "never persist" }, fare_currency: "BDT" });
  assert.equal(response.status, 200);
  assert.equal(writes, before + 1);
  assert.equal((await response.json()).parserReview, undefined);
});
