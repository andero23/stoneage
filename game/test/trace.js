// trace.js — päevahaaval jälg ühe seemne kohta.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

for (const f of ["util.js", "data.js", "world.js", "person.js", "sim.js", "events.js", "combat.js", "bot.js"]) {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8"), { filename: f });
}
const seed = parseInt(process.argv[2] || "7945");
const days = parseInt(process.argv[3] || "130");
globalThis.STRATEGY = process.argv[4] || "randav";
Sim.newGame(seed);
G.paused = false;

for (let d = 0; d < days; d++) {
  Bot.play(G, globalThis.STRATEGY);
  const before = Sim.foodTotal();
  Sim.simDay();
  if (G.over) { console.log("KÕIK SURNUD päeval " + d); break; }
  const jobs = {};
  for (const p of Sim.adults()) {
    const key = p.job + (p.job === "korilane" ? ":" + p.mode : "");
    jobs[key] = (jobs[key] || 0) + 1;
  }
  console.log(
    "p" + String(G.day).padStart(3) + " " + DATA.SEASONS[G.season].padEnd(5) +
    " pop=" + Sim.pop() +
    " värske=" + Math.round(Sim.freshTotal()) +
    " kuiv=" + Math.round(G.dried) +
    " mat=" + Math.round(G.mat) +
    " nahad=" + Math.round(G.hides) +
    " riides=" + Sim.alive().filter(p => p.clothed).length +
    " vajadus=" + U.round1(Sim.dailyNeed()) +
    " hinnang=" + U.round1(Bot.estimateFood(G)) +
    " r1=" + Math.round(Sim.curSite().points[0]) +
    " tervis=" + Math.round(Sim.alive().reduce((s, p) => s + p.health, 0) / Math.max(1, Sim.pop())) +
    " | " + Object.entries(jobs).map(([k, v]) => k + "×" + v).join(" ")
  );
}
