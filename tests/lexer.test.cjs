const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function load(path) {
  const js = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports });
  return exports;
}

const { lexPnr } = load("lib/parser/lexer.ts");
const { fixtures } = load("tests/fixtures/pnr.ts");

test("preserves CRLF, LF, CR, tabs, Unicode and an empty final physical line", () => {
  const raw = "1 . BS 105\r\n\t2.1DOE/JANE\u00a0ANN\n#0100\r";
  const lexed = lexPnr(raw);
  assert.equal(lexed.rawLength, raw.length);
  assert.deepEqual(Array.from(lexed.lines, l => [l.number, l.raw, l.newline]), [
    [1, "1 . BS 105", "\r\n"],
    [2, "\t2.1DOE/JANE\u00a0ANN", "\n"],
    [3, "#0100", "\r"],
    [4, "", ""],
  ]);
  assert.equal(lexed.lines.map(l => l.raw + l.newline).join(""), raw);
  assert.deepEqual(Array.from(lexed.lines[0].tokens, t => [t.kind, t.value, t.span.startColumn, t.span.endColumn, t.span.startOffset, t.span.endOffset]), [
    ["number", "1", 1, 2, 0, 1], ["symbol", ".", 3, 4, 2, 3],
    ["word", "BS", 5, 7, 4, 6], ["number", "105", 8, 11, 7, 10],
  ]);
  const jane = lexed.lines[1].tokens.find(t => t.value === "JANE");
  assert.deepEqual([jane.span.startLine, jane.span.startColumn, jane.span.startOffset, jane.span.endOffset], [2, 9, 20, 24]);
  assert.equal(lexed.lines[2].tokens[0].value, "#");
  assert.equal(lexed.lines[2].tokens[1].value, "0100");
  assert.equal(lexPnr("").lines.length, 1);
  assert.equal(lexPnr("A\rB").lines.length, 2);
});

test("golden fixtures retain physical evidence for passengers, segments, statuses and RBD", () => {
  assert.equal(fixtures.length, 5);
  for (const fixture of fixtures) {
    const lexed = lexPnr(fixture.raw);
    const { expected } = fixture;
    assert.equal(expected.passengers.length, expected.passengerCount, fixture.id);
    assert.equal(expected.flights.length, expected.flightCount, fixture.id);
    assert.equal(expected.groundGaps.length, expected.groundGapCount, fixture.id);
    for (const token of lexed.tokens) {
      assert.equal(fixture.raw.slice(token.span.startOffset, token.span.endOffset), token.value, fixture.id);
      assert.equal(lexed.lines[token.span.startLine - 1].raw.slice(token.span.startColumn - 1, token.span.endColumn - 1), token.value, fixture.id);
    }
    for (const record of [...expected.passengers, ...expected.flights, ...expected.groundGaps]) {
      const { startLine, endLine, excerpt } = record.source;
      assert.ok(startLine >= 1 && endLine <= lexed.lines.length && startLine <= endLine, fixture.id);
      const evidence = lexed.lines.slice(startLine - 1, endLine).map(line => line.raw).join("\n");
      assert.ok(evidence.includes(excerpt), `${fixture.id}: ${excerpt}`);
      if ("status" in record) {
        assert.ok(evidence.includes(record.status), `${fixture.id}: ${record.status}`);
        assert.ok(evidence.includes(record.rbd), `${fixture.id}: ${record.rbd}`);
        assert.ok(evidence.includes(record.flightNumber), `${fixture.id}: ${record.flightNumber}`);
      }
    }
  }
});

test("keeps 120 passenger rows and 80 segment rows without token loss", () => {
  const raw = [
    ...Array.from({ length: 120 }, (_, i) => `${i + 1}.1DOE/AGENT${i + 1} MR`),
    ...Array.from({ length: 80 }, (_, i) => `${i + 1} TK 713E 13SEP 7 DACIST*HK1 0650 1235`),
  ].join("\n");
  const result = lexPnr(raw);
  assert.equal(result.lines.length, 200);
  assert.equal(result.lines.map(l => l.raw + l.newline).join(""), raw);
  assert.ok(result.tokens.length > 1000);
  assert.ok(result.tokens.every(t => raw.slice(t.span.startOffset, t.span.endOffset) === t.value));
});
