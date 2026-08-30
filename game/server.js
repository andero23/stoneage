#!/usr/bin/env node
// server.js — Kiviaja testiserver: staatika + telemeetria vastuvõtt (JSONL).
// Käivitus: node server.js            (PORT env, vaikimisi 8125)
// Raport:   node server.js report     (loeb data/*.jsonl ja trükib kokkuvõtte)
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const PORT = /^\d+$/.test(process.argv[2] || "") ? parseInt(process.argv[2]) : parseInt(process.env.PORT || "8125");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png",
  ".md": "text/plain; charset=utf-8", ".ico": "image/x-icon",
  ".svg": "image/svg+xml" };

fs.mkdirSync(DATA_DIR, { recursive: true });

function telemetryFile() {
  const d = new Date();
  const stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
  return path.join(DATA_DIR, "telemetry-" + stamp + ".jsonl");
}

// ---------- raport ----------
function report() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".jsonl"));
  const events = [];
  for (const f of files) {
    for (const line of fs.readFileSync(path.join(DATA_DIR, f), "utf8").split("\n")) {
      if (!line.trim()) continue;
      try { events.push(JSON.parse(line)); } catch (e) {}
    }
  }
  const by = t => events.filter(e => e.t === t);
  const players = new Set(events.map(e => e.pid)).size;
  const games = new Set(events.filter(e => e.gid).map(e => e.gid));
  const out = [];
  out.push("=== KIVIAEG TESTIRAPORT ===");
  out.push("Sündmusi: " + events.length + " | mängijaid: " + players + " | mänge: " + games.size);

  // lehter: kui kaugele jõuti (iga mängu viimane season-sündmus)
  const lastSeason = {};
  for (const e of by("season")) {
    const k = e.gid;
    const prog = (e.d.year - 1) * 4 + e.d.season;
    if (!(k in lastSeason) || prog > lastSeason[k].prog) lastSeason[k] = { prog, d: e.d };
  }
  const funnel = { "jõudis sügiseni (a1)": 0, "jõudis talveni (a1)": 0, "elas üle talve 1": 0, "jõudis 3. aastasse": 0, "jõudis 5. aastasse": 0 };
  for (const k in lastSeason) {
    const p = lastSeason[k].prog;
    if (p >= 1) funnel["jõudis sügiseni (a1)"]++;
    if (p >= 2) funnel["jõudis talveni (a1)"]++;
    if (p >= 3) funnel["elas üle talve 1"]++;
    if (p >= 8) funnel["jõudis 3. aastasse"]++;
    if (p >= 16) funnel["jõudis 5. aastasse"]++;
  }
  out.push("\n--- Lehter (" + Object.keys(lastSeason).length + " mängu season-andmetega) ---");
  for (const k in funnel) out.push("  " + k + ": " + funnel[k]);

  // raami-kontroll enne esimest talve (kõige levinum algajaviga)
  let rackBeforeWinter = 0, winterReached = 0;
  for (const k in lastSeason) {
    const seasons = by("season").filter(e => e.gid === k);
    const w1 = seasons.find(e => e.d.year === 1 && e.d.season === 3);
    if (w1) { winterReached++; if (w1.d.racks > 0) rackBeforeWinter++; }
  }
  if (winterReached) out.push("\nKuivatusraam enne 1. talve: " + rackBeforeWinter + "/" + winterReached);

  // tegevuste kasutus
  const acts = {};
  for (const e of by("action")) acts[e.d.a] = (acts[e.d.a] || 0) + 1;
  out.push("\n--- Tegevuste kasutus ---");
  const gameCount = Math.max(1, games.size);
  for (const [a, n] of Object.entries(acts).sort((x, y) => y[1] - x[1]))
    out.push("  " + a + ": " + n + " (" + (n / gameCount).toFixed(1) + "/mäng)");

  // modaalivalikud
  const choices = {};
  for (const e of by("choice")) {
    const k = e.d.title + " → " + e.d.choice;
    choices[k] = (choices[k] || 0) + 1;
  }
  out.push("\n--- Sündmuste valikud (top 20) ---");
  for (const [k, n] of Object.entries(choices).sort((x, y) => y[1] - x[1]).slice(0, 20))
    out.push("  " + n + "× " + k);

  // surmapõhjused
  const causes = {};
  for (const e of by("death")) causes[e.d.cause] = (causes[e.d.cause] || 0) + 1;
  out.push("\n--- Surmapõhjused ---");
  for (const [c, n] of Object.entries(causes).sort((x, y) => y[1] - x[1]))
    out.push("  " + c + ": " + n);

  // mängu lõpud ja skoorid
  const overs = by("game_over");
  if (overs.length) {
    const scores = overs.map(e => e.d.score || 0).sort((a, b) => b - a);
    out.push("\n--- Lõppenud mänge: " + overs.length + " | parim skoor: " + scores[0] +
      " | mediaan: " + scores[Math.floor(scores.length / 2)]);
  }

  // lahkumishetked (kus käega löödi)
  const quits = by("quit");
  out.push("\n--- Lahkumishetked (" + quits.length + ") ---");
  const quitAt = {};
  for (const e of quits) {
    const k = "aasta " + e.d.year + " " + ["kevad", "suvi", "sügis", "talv"][e.d.season];
    quitAt[k] = (quitAt[k] || 0) + 1;
  }
  for (const [k, n] of Object.entries(quitAt).sort((x, y) => y[1] - x[1]).slice(0, 10))
    out.push("  " + n + "× " + k);

  // abi ja tagasiside
  out.push("\nAbi avamisi: " + by("help").length);
  const fbs = by("feedback");
  out.push("\n--- Tagasiside (" + fbs.length + ") ---");
  for (const e of fbs) out.push('  [' + (e.d.ctx || "?") + '] "' + e.d.text + '"');

  return out.join("\n");
}

if (process.argv[2] === "report") {
  console.log(report());
  process.exit(0);
}

// ---------- server ----------
http.createServer((req, res) => {
  // telemeetria vastuvõtt
  if (req.method === "POST" && req.url === "/api/t") {
    let body = "";
    req.on("data", c => { body += c; if (body.length > 100000) req.destroy(); });
    req.on("end", () => {
      try {
        const events = JSON.parse(body);
        if (Array.isArray(events) && events.length <= 100) {
          const lines = events.map(e => JSON.stringify({ ...e, srv: Date.now() })).join("\n") + "\n";
          fs.appendFile(telemetryFile(), lines, () => {});
        }
      } catch (e) {}
      res.writeHead(204).end();
    });
    return;
  }

  // raport (kaitse: ADMIN_KEY env)
  if (req.method === "GET" && req.url.startsWith("/api/report")) {
    const key = new URL(req.url, "http://x").searchParams.get("key");
    if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
      res.writeHead(403).end("ei");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" }).end(report());
    return;
  }

  // staatika
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  // avaleht (site/) on juurel; mäng elab /play all
  if (p === "/" || p === "/index.html") p = "/site/index.html";
  else if (p === "/play" || p === "/play/") p = "/index.html";
  else if (p.startsWith("/img/")) p = "/site" + p;
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT) || file.includes("data" + path.sep) || p === "/server.js") {
    res.writeHead(404).end();
    return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404).end("404"); return; }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    }).end(buf);
  });
}).listen(PORT, () => console.log("Kiviaeg server: http://localhost:" + PORT));
