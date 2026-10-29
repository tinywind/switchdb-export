const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const header = "게임명,지원 플랫폼,전체 첫 발매일,스위치 발매일,한글화 여부,포팅/리마스터 여부,PC 지원 여부\n";

function exportFixture(t, games) {
  const temporaryRoot = path.join(root, ".tmp");
  fs.mkdirSync(temporaryRoot, { recursive: true });
  const directory = fs.mkdtempSync(path.join(temporaryRoot, "csv-security-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const output = path.join(directory, "games.csv");
  const preload = path.join(directory, "igdb-fixture.cjs");
  fs.writeFileSync(preload, `
    const assert = require("node:assert/strict");
    const games = ${JSON.stringify(games)};
    global.fetch = async (input, options) => {
      const url = new URL(input);
      assert.equal(options.method, "POST");
      if (url.origin === "https://id.twitch.tv" && url.pathname === "/oauth2/token") {
        return Response.json({ access_token: "fixture-token", expires_in: 3600 });
      }
      if (url.origin === "https://api.igdb.com" && url.pathname === "/v4/games") {
        assert.equal(options.headers.Authorization, "Bearer fixture-token");
        return Response.json(options.body.includes("offset 0;") ? games : []);
      }
      throw new Error("Unexpected outbound request");
    };
  `);
  const result = spawnSync(process.execPath, ["--require", preload, path.join(root, "igdb-switch-exporter.js")], {
    cwd: directory,
    env: {
      ...process.env,
      IGDB_CLIENT_ID: "fixture-client",
      IGDB_CLIENT_SECRET: "fixture-secret",
      OUTPUT_FILE: path.relative(root, output)
    },
    encoding: "utf8",
    timeout: 5000
  });
  assert.equal(result.status, 0, result.stderr);
  return fs.readFileSync(output, "utf8");
}

test("remote game names are exported as text instead of spreadsheet formulas", (t) => {
  const cases = [
    ["=1+1", "\"\t=1+1\""],
    ["+SUM(1,2)", "\"\t+SUM(1,2)\""],
    ["-1+2", "\"\t-1+2\""],
    ["@SUM(1,2)", "\"\t@SUM(1,2)\""],
    ["\t=1+1", "\"\t\t=1+1\""],
    ["\r=1+1", "\"\t\r=1+1\""],
    ["\n=1+1", "\"\t\n=1+1\""],
    ["  =1+1", "\"\t  =1+1\""]
  ];
  const csv = exportFixture(t, cases.map(([name], index) => ({ id: index + 1, name, platforms: [{ id: 130, name: "Nintendo Switch" }] })));
  for (const [, cell] of cases) {
    assert.ok(csv.includes(`${cell},"Nintendo Switch",`), `Missing protected cell ${JSON.stringify(cell)}`);
  }
});

test("remote platform names cannot introduce spreadsheet formulas", (t) => {
  const csv = exportFixture(t, [
    { id: 1, name: "First", platforms: [{ id: 130, name: "=1+1" }] },
    { id: 2, name: "Second", platforms: [{ id: 130, name: "@SUM(1,2)" }] }
  ]);
  assert.ok(csv.includes("\"First\",\"\t=1+1\","));
  assert.ok(csv.includes("\"Second\",\"\t@SUM(1,2)\","));
});

test("ordinary names retain quotes, commas, line breaks and existing columns", (t) => {
  const csv = exportFixture(t, [{
    id: 1,
    name: "A \"Game\", edition\nSecond line",
    platforms: [{ id: 130, name: "Nintendo Switch" }, { id: 6, name: "PC \"Desktop\"" }]
  }]);
  assert.equal(csv, header + '"A ""Game"", edition\nSecond line","Nintendo Switch / PC ""Desktop""","","","미지원","오리지널","지원"\n');
});

test("full-width formula markers are exported as text", (t) => {
  const csv = exportFixture(t, [
    { id: 1, name: "＝1+1" }, { id: 2, name: "＋1+1" },
    { id: 3, name: "－1+1" }, { id: 4, name: "＠SUM(1,2)" }
  ]);
  for (const cell of ['"\t＝1+1"', '"\t＋1+1"', '"\t－1+1"', '"\t＠SUM(1,2)"']) {
    assert.ok(csv.includes(cell + ',"",'), `Missing protected cell ${JSON.stringify(cell)}`);
  }
});
