// headless.js — jooksutab simulatsiooni Node'is ilma DOM-ita.
// Kasutus: node test/headless.js [aastaid] [seemneid]
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const files = ["util.js", "data.js", "world.js", "person.js", "sim.js", "events.js", "combat.js", "bot.js"];
for (const f of files) {
  const code = fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8");
  vm.runInThisContext(code, { filename: f });
}

const YEARS = parseInt(process.argv[2] || "8");
const SEEDS = parseInt(process.argv[3] || "5");
// strateegia: randav | paikne | raidiv-randav | raidiv-paikne
const STRATEGY = process.argv[4] || "randav";
// agressiivne profiil võtab raidipakkumised vastu
Bridge.onEvent = ev => { const c = Bot.eventChoice(ev, STRATEGY); if (c && c.fx) c.fx(); };

function assertFinite(name, v) {
  if (typeof v !== "number" || !isFinite(v)) throw new Error("NaN/Infinity: " + name + " = " + v);
}

function checkInvariants(g, day) {
  assertFinite("dried", g.dried);
  assertFinite("mat", g.mat);
  assertFinite("hides", g.hides);
  assertFinite("faith", g.faith);
  assertFinite("rep", g.rep);
  assertFinite("sec", g.sec);
  assertFinite("leaveP", g.leaveP);
  if (g.dried < -0.01) throw new Error("negatiivne kuivatatu: " + g.dried);
  for (const f of g.fresh) { assertFinite("fresh", f.a); if (f.a < -0.01) throw new Error("negatiivne värske"); }
  for (const p of g.people) {
    if (!p.alive) continue;
    assertFinite("health:" + p.name, p.health);
    for (const k in p.xp) assertFinite("xp:" + k, p.xp[k]);
  }
  const site = g.sites[g.campId];
  for (let r = 0; r < 3; r++) {
    assertFinite("points", site.points[r]);
    if (site.points[r] < -0.01) throw new Error("negatiivne ring");
  }
}

let failures = 0;
const results = [];

for (let s = 1; s <= SEEDS; s++) {
  const seed = s * 7919 + 13;
  try {
    Sim.newGame(seed);
    G.paused = false;
    const maxDays = YEARS * 120;
    let d;
    for (d = 0; d < maxDays; d++) {
      Bot.play(G, STRATEGY);
      Sim.simDay();
      checkInvariants(G, d);
      if (G.over) break;
    }
    const s2 = G.stats;
    results.push({
      seed,
      survived: !G.over,
      days: d,
      years: U.round1(G.year - 1 + (G.season + 1) / 4),
      pop: Sim.pop(),
      deaths: s2.deaths.length,
      births: s2.births,
      joins: s2.joins,
      leaves: s2.leaves,
      moves: s2.moves,
      battles: s2.battles,
      relics: G.relics.length,
      score: Math.round(G.score),
      gear: G.gear.length,
      food: Math.round(Sim.foodTotal()),
      causes: s2.deaths.map(x => x.cause).join(","),
    });
  } catch (e) {
    failures++;
    console.error("SEED " + seed + " VIGA päeval " + (G ? G.day : "?") + ": " + e.stack);
  }
}

console.log("\n=== TULEMUSED (" + YEARS + " aastat, " + SEEDS + " seemet) ===");
for (const r of results) {
  console.log("seed " + r.seed + ": " + (r.survived ? "ELUS" : "HUKKUS p" + r.days) +
    " | aastaid " + r.years + " | rahvast " + r.pop + " | surmi " + r.deaths +
    " | sünde " + r.births + " | liitujaid " + r.joins + " | lahkujaid " + r.leaves +
    " | kolimisi " + r.moves + " | lahinguid " + r.battles + " | reliikviaid " + r.relics +
    " | SKOOR " + r.score + " | varustust " + r.gear + " | toitu " + r.food);
  if (r.deaths > 0) console.log("   surmapõhjused: " + r.causes);
}
console.log(failures ? "\n" + failures + " SEEMET KUKKUS VEAGA LÄBI" : "\nÜhtegi viga ei tekkinud.");
process.exit(failures ? 1 : 0);
