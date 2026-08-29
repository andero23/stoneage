// admin.js — arendaja/balansipaneel. Ava: F2 või ⚙ nupp.
// Kolm osa: (1) muutujate tuunimine, (2) balansilabor (botiga täismängud brauseris),
// (3) olukorra tööriistad (sündmuste käivitamine, ressursid, varjatud seisund).
"use strict";

const Admin = {
  open: false,
  defaults: null,
  labRunning: false,
  STORE_KEY: "kiviaeg-admin",

  // ---------- muutujate register ----------
  // path: punktidega tee DATA sees; arr: mitu elementi (renderdatakse N sisendit)
  registry: [
    { grp: "Saagikus (TÜ/päev, suvi, ring 1, oskus 0–3)", rows: [
      { path: "YIELD.marjad", arr: 4, label: "Marjad", step: 0.1 },
      { path: "YIELD.seened", arr: 4, label: "Seened", step: 0.1 },
      { path: "YIELD.juured", arr: 4, label: "Juured", step: 0.1 },
      { path: "YIELD.kala", arr: 4, label: "Kala", step: 0.1 },
      { path: "YIELD.jaht", arr: 4, label: "Jaht (keskmine)", step: 0.1 },
    ]},
    { grp: "Hooajakordajad (kevad, suvi, sügis, talv)", rows: [
      { path: "SEASON_MOD.korilus", arr: 4, label: "Korilus", step: 0.05 },
      { path: "SEASON_MOD.juured", arr: 4, label: "Juured", step: 0.05 },
      { path: "SEASON_MOD.kala", arr: 4, label: "Kalapüük", step: 0.05 },
      { path: "SEASON_MOD.jaht", arr: 4, label: "Jaht", step: 0.05 },
    ]},
    { grp: "Ammendumine ja taastumine — KÕIGE TUNDLIKUM", rows: [
      { path: "TU_PER_POINT", label: "TÜ ühe punkti kohta", step: 1, note: "suurem = koht kestab kauem" },
      { path: "RING_KNEE", label: "Ammenduskõvera põlv", step: 0.02, note: "väiksem = täissaak kauem" },
      { path: "REGEN_GROW", arr: 4, label: "Taastumine (osa/päev)", step: 0.0005, note: "kevad,suvi,sügis,talv" },
      { path: "REGEN_ABANDONED_MIN", label: "Tühja koha taastumine", step: 0.001 },
      { path: "RING_MOD", arr: 3, label: "Ringi tootlikkus", step: 0.05 },
      { path: "RING_RISK", arr: 3, label: "Ringi risk/päev", step: 0.001 },
      { path: "RING_XP", arr: 3, label: "Kogemus/päev ringis", step: 0.5 },
      { path: "LOCAL_KNOWLEDGE_MAX", label: "Kohatundmise boonus", step: 0.02, note: "paiksuse tasu" },
    ]},
    { grp: "Toit ja talv", rows: [
      { path: "FRESH_LIFE", label: "Värske säilib (päevi)", step: 1 },
      { path: "FRESH_LIFE_WINTER", label: "… talvel", step: 1 },
      { path: "RACK_CAP", label: "Raami maht (TÜ)", step: 10 },
      { path: "RACK_RATE", label: "Raami läbilase/päev", step: 1 },
      { path: "DRYER_RATE", label: "Kuivataja TÜ/päev", step: 1 },
      { path: "CLOTHES_HIDES", label: "Nahku riidekomplektiks", step: 1 },
      { path: "CLOTHES_LIFE_SEASONS", label: "Riiete iga (hooaegu)", step: 1 },
    ]},
    { grp: "Mürgitus (seened)", rows: [
      { path: "POISON.seened.risk", arr: 4, label: "Risk/päev, oskus 0–3", step: 0.005 },
      { path: "POISON.seened.death", label: "Surma osakaal", step: 0.02 },
      { path: "POISON.seened.deathShaman", label: "… šamaaniga", step: 0.01 },
    ]},
    { grp: "Rahvas ja kogukond", rows: [
      { path: "XP_PER_LEVEL", label: "Kogemust taseme kohta", step: 50 },
      { path: "SEC_REQ_PER_POP", label: "Turvanõue inimese kohta", step: 0.5 },
      { path: "LEAVE_THRESHOLD", label: "Lahkumise lävi", step: 1 },
      { path: "CHILD_SEASONS", label: "Lapsepõlv (hooaegu)", step: 1 },
      { path: "FEAST_COST_PER_POP", label: "Peo hind inimese kohta", step: 0.5 },
      { path: "SMALL_BAND_POP", label: "Väiksuse lävi (inimest)", step: 1 },
      { path: "SMALL_BAND_XP", label: "Väiksuse õppeboonus", step: 0.1 },
      { path: "TRAIT_GIFT", label: "Ande õppekordaja", step: 0.05 },
      { path: "TRAIT_WEAK", label: "Nõrkuse õppekordaja", step: 0.05 },
    ]},
    { grp: "Retked", rows: [
      { path: "KAUGRETK.minPop", label: "Kaugretke rahvalävi", step: 1 },
      { path: "KAUGRETK.deathP", label: "Kaugretke surmarisk", step: 0.01 },
      { path: "KAUGRETK.woundP", label: "Kaugretke haavarisk", step: 0.05 },
      { path: "KAUGRETK.decay", label: "Kaugalade kulumine", step: 0.02, note: "0,9 = iga retk −10%" },
      { path: "KAUGRETK.recover", label: "Kaugalade taastumine/hooaeg", step: 0.1 },
      { path: "SUURJAHT.deathP", label: "Suurjahi surmarisk", step: 0.01 },
      { path: "SUURJAHT.woundP", label: "Suurjahi haavarisk", step: 0.05 },
      { path: "SUURJAHT.relicP", label: "Suurjahi reliikviašanss", step: 0.05 },
    ]},
    { grp: "Skoor (punktid hooajas)", rows: [
      { path: "SCORE.SEASON_BASE", label: "Baaspunktid", step: 1 },
      { path: "SCORE.POP", label: "Inimese kohta", step: 0.5 },
      { path: "SCORE.FOOD_DIV", label: "TÜ-d varapunkti kohta", step: 5 },
      { path: "SCORE.RELIC", label: "Reliikvia kohta", step: 1 },
      { path: "SCORE.WINTER", label: "Üle elatud talv", step: 5 },
      { path: "SCORE.RAID", label: "Võidetud sõjaretk", step: 2 },
    ]},
    { grp: "Nähtavus (sihtimise alus)", rows: [
      { path: "VIS.POP", label: "Nähtavus inimese kohta", step: 0.1 },
      { path: "VIS.HIDDEN_MULT", label: "Varjatuse kaal", step: 0.05 },
      { path: "VIS.RAID_BASE", label: "Rünnakulävi", step: 1, note: "alla selle nähtavuse ei rünnata" },
      { path: "VIS.RAID_DIV", label: "Rünnakukõvera jagaja", step: 5, note: "väiksem = sagedasemad rünnakud" },
      { path: "VIS.RAID_MAX", label: "Rünnaku max tõenäosus", step: 0.05 },
      { path: "VIS.TIME_CAP", label: "Paigalpüsimise lisa lagi", step: 1 },
    ]},
    { grp: "Lahing", rows: [
      { path: "COMBAT.hunt.hp", label: "Hundi HP", step: 1 },
      { path: "COMBAT.hunt.hit", label: "Hundi tabamis%", step: 0.05 },
      { path: "COMBAT.hunt.lo", label: "Hundi kahju min", step: 1 },
      { path: "COMBAT.hunt.hi", label: "Hundi kahju max", step: 1 },
      { path: "COMBAT.roovel.hp", label: "Röövli HP", step: 1 },
      { path: "COMBAT.roovel.hit", label: "Röövli tabamis%", step: 0.02 },
      { path: "COMBAT.sodalane.hp", label: "Sõdalase HP", step: 1 },
      { path: "COMBAT.kytt.range", label: "Vibu ulatus", step: 1 },
    ]},
  ],

  // ---------- tee-abilised ----------
  get(path) { return path.split(".").reduce((o, k) => o[k], DATA); },
  set(path, v) {
    const ks = path.split(".");
    const last = ks.pop();
    const o = ks.reduce((o, k) => o[k], DATA);
    o[last] = v;
  },

  // ---------- init ----------
  init() {
    this.defaults = JSON.parse(JSON.stringify(DATA));
    this.applyStored();
    this.buildDOM();
    document.addEventListener("keydown", e => {
      if (e.key === "F2") { e.preventDefault(); this.toggle(); }
    });
    setInterval(() => { if (this.open) this.refreshInternals(); }, 1000);
  },

  storedOverrides() {
    try { return JSON.parse(localStorage.getItem(this.STORE_KEY)) || {}; } catch (e) { return {}; }
  },

  applyStored() {
    const ov = this.storedOverrides();
    for (const path in ov) {
      try { this.set(path, ov[path]); } catch (e) { /* vana/kadunud tee */ }
    }
  },

  saveOverride(path, v) {
    const ov = this.storedOverrides();
    const defV = path.split(".").reduce((o, k) => o[k], this.defaults);
    if (Math.abs(v - defV) < 1e-12) delete ov[path];
    else ov[path] = v;
    try { localStorage.setItem(this.STORE_KEY, JSON.stringify(ov)); } catch (e) {}
  },

  toggle() {
    this.open = !this.open;
    document.getElementById("admin-drawer").classList.toggle("hidden", !this.open);
    if (this.open) { this.renderValues(); this.refreshInternals(); }
  },

  // ---------- DOM ----------
  buildDOM() {
    const d = document.createElement("div");
    d.id = "admin-drawer";
    d.className = "hidden";
    let h = '<div class="ad-head"><b>⚙ Balansipaneel</b>' +
      '<span class="ad-x" id="ad-close">✕</span></div>' +
      '<div class="ad-note">Enamik väärtusi mõjub jooksvas mängus KOHE. Maailma struktuur ' +
      "(kohtade rikkus, kaart, varjatud rituaalimõjud) sünnib uue mängu alguses. " +
      "Muudetud väärtused on kollased ja jäävad meelde (localStorage).</div>" +
      '<div class="ad-btnrow">' +
      '<button id="ad-reset">Lähtesta kõik</button>' +
      '<button id="ad-export">Ekspordi</button>' +
      '<button id="ad-import">Impordi</button>' +
      '<button id="ad-newgame">Uus mäng</button></div>' +
      '<div id="ad-io" class="hidden"><textarea id="ad-io-text" rows="4" spellcheck="false"></textarea>' +
      '<div class="ad-btnrow"><button id="ad-io-copy">Kopeeri</button>' +
      '<button id="ad-io-apply">Rakenda</button>' +
      '<button id="ad-io-close">Sulge</button></div>' +
      '<div id="ad-io-status" class="ad-note"></div>' +
      '<input type="file" id="ad-io-file" accept=".json,application/json" class="hidden"></div>';

    // balansilabor
    h += '<details open class="ad-grp"><summary>🧪 Balansilabor</summary><div class="ad-lab">' +
      '<div class="ad-note">Bot mängib täismänge praeguste väärtustega. Sinu jooksev mäng pannakse ' +
      "vahepeal kõrvale ja taastatakse. Siht: rändav ~12/16, paikne ~9/16 (8 aastat).</div>" +
      '<label>Seemneid <input id="ad-lab-seeds" type="number" value="8" min="1" max="32" step="1"></label> ' +
      '<label>Aastaid <input id="ad-lab-years" type="number" value="8" min="1" max="20" step="1"></label><br>' +
      '<button data-lab="randav">rändav</button> ' +
      '<button data-lab="paikne">paikne</button> ' +
      '<button data-lab="raidiv-randav">raidiv-rändav</button> ' +
      '<button data-lab="raidiv-paikne">raidiv-paikne</button> ' +
      '<button data-lab="all">KÕIK 4</button>' +
      '<pre id="ad-lab-out"></pre></div></details>';

    // muutujad
    for (let gi = 0; gi < this.registry.length; gi++) {
      const g = this.registry[gi];
      h += '<details class="ad-grp"' + (gi === 2 ? " open" : "") + "><summary>" + g.grp + "</summary><div>";
      for (const row of g.rows) {
        h += '<div class="ad-row" data-path="' + row.path + '"><label title="' + row.path + '">' + row.label + "</label><span class=\"ad-inputs\">";
        const n = row.arr || 1;
        for (let i = 0; i < n; i++) {
          const p = row.arr ? row.path + "." + i : row.path;
          h += '<input type="number" data-p="' + p + '" step="' + row.step + '">';
        }
        h += '</span><span class="ad-undo" title="Lähtesta">↺</span></div>';
        if (row.note) h += '<div class="ad-rownote">' + row.note + "</div>";
      }
      h += "</div></details>";
    }

    // olukord
    h += '<details class="ad-grp"><summary>🛠 Olukord (jooksvas mängus)</summary><div class="ad-cheats">' +
      '<button data-cheat="food">+100 kuivatatut</button>' +
      '<button data-cheat="mat">+50 materjali</button>' +
      '<button data-cheat="hides">+10 nahka</button>' +
      '<button data-cheat="clothe">Riieta kõik</button>' +
      '<button data-cheat="heal">Tervista kõik</button>' +
      '<button data-cheat="faith">Usk +20</button>' +
      '<button data-cheat="rep">Maine +20</button>' +
      '<button data-cheat="map">Ava kaart</button>' +
      '<button data-cheat="relic">Anna reliikvia</button>' +
      '<button data-cheat="season">Hooaja lõppu</button>' +
      '<hr><b>Kutsu sündmus:</b><br>' +
      '<button data-ev="hundid">Hundid</button>' +
      '<button data-ev="kylmalaine">Külmalaine</button>' +
      '<button data-ev="haigus">Haigus</button>' +
      '<button data-ev="randaja">Rändaja</button>' +
      '<button data-ev="pagulased">Pagulased</button>' +
      '<button data-ev="kaupleja">Kaupleja</button>' +
      '<button data-ev="haarang">Haarang</button>' +
      '<button data-ev="schism">Lõhenemine</button>' +
      '<button data-ev="raidleid">Skaut leiab küla</button>' +
      "</div></details>";

    // sisikond
    h += '<details open class="ad-grp"><summary>🔍 Sisikond (varjatud seisund)</summary>' +
      '<pre id="ad-internals"></pre></details>';

    d.innerHTML = h;
    document.body.appendChild(d);

    // ⚙ nupp ülaribale
    const gear = document.createElement("button");
    gear.id = "ad-gear";
    gear.textContent = "⚙";
    gear.title = "Balansipaneel (F2)";
    gear.addEventListener("click", () => this.toggle());
    document.getElementById("tb-pop").appendChild(gear);

    // sündmuste sidumine
    d.querySelector("#ad-close").addEventListener("click", () => this.toggle());
    d.querySelector("#ad-reset").addEventListener("click", () => this.resetAll());
    d.querySelector("#ad-export").addEventListener("click", () => this.exportOverrides());
    d.querySelector("#ad-import").addEventListener("click", () => this.importOverrides());
    d.querySelector("#ad-io-copy").addEventListener("click", () => this.copyIO());
    d.querySelector("#ad-io-apply").addEventListener("click", () => this.applyIO());
    d.querySelector("#ad-io-close").addEventListener("click", () => document.getElementById("ad-io").classList.add("hidden"));
    d.querySelector("#ad-io-file").addEventListener("change", e => {
      this.importFile(e.target.files[0]);
      e.target.value = ""; // sama faili saab uuesti valida
    });
    d.querySelector("#ad-newgame").addEventListener("click", () => { if (typeof UI !== "undefined") UI.newGame(); });
    d.querySelectorAll("[data-lab]").forEach(b => b.addEventListener("click", () => {
      const st = b.dataset.lab;
      this.runLab(st === "all" ? ["randav", "paikne", "raidiv-randav", "raidiv-paikne"] : [st]);
    }));
    d.querySelectorAll("input[data-p]").forEach(inp => {
      inp.addEventListener("change", () => {
        const v = parseFloat(inp.value);
        if (!isFinite(v)) { this.renderValues(); return; }
        this.set(inp.dataset.p, v);
        this.saveOverride(inp.dataset.p, v);
        this.renderValues();
      });
    });
    d.querySelectorAll(".ad-undo").forEach(u => {
      u.addEventListener("click", () => {
        const row = u.closest(".ad-row");
        row.querySelectorAll("input[data-p]").forEach(inp => {
          const p = inp.dataset.p;
          const defV = p.split(".").reduce((o, k) => o[k], this.defaults);
          this.set(p, defV);
          this.saveOverride(p, defV);
        });
        this.renderValues();
      });
    });
    d.querySelectorAll("[data-cheat]").forEach(b => b.addEventListener("click", () => this.cheat(b.dataset.cheat)));
    d.querySelectorAll("[data-ev]").forEach(b => b.addEventListener("click", () => this.fireEvent(b.dataset.ev)));
  },

  renderValues() {
    document.querySelectorAll("#admin-drawer input[data-p]").forEach(inp => {
      const p = inp.dataset.p;
      const v = this.get(p);
      const defV = p.split(".").reduce((o, k) => o[k], this.defaults);
      inp.value = Math.round(v * 10000) / 10000;
      inp.classList.toggle("ad-changed", Math.abs(v - defV) > 1e-12);
    });
  },

  resetAll() {
    for (const g of this.registry) for (const row of g.rows) {
      const n = row.arr || 1;
      for (let i = 0; i < n; i++) {
        const p = row.arr ? row.path + "." + i : row.path;
        this.set(p, p.split(".").reduce((o, k) => o[k], this.defaults));
      }
    }
    try { localStorage.removeItem(this.STORE_KEY); } catch (e) {}
    this.renderValues();
  },

  ioStatus(msg, bad) {
    const el = document.getElementById("ad-io-status");
    el.textContent = msg;
    el.style.color = bad ? "var(--danger)" : "var(--ok)";
  },

  // kõik registri teed lamedalt: {tee: praegune väärtus}
  snapshot() {
    const out = {};
    for (const g of this.registry) for (const row of g.rows) {
      const n = row.arr || 1;
      for (let i = 0; i < n; i++) {
        const path = row.arr ? row.path + "." + i : row.path;
        out[path] = this.get(path);
      }
    }
    return out;
  },

  exportOverrides() {
    const snap = this.snapshot();
    const json = JSON.stringify(snap, null, 1);
    document.getElementById("ad-io").classList.remove("hidden");
    const ta = document.getElementById("ad-io-text");
    ta.value = json;
    ta.select();
    const changed = Object.keys(this.storedOverrides()).length;
    // laadi .json failina alla
    let saved = false;
    try {
      const d = new Date();
      const stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") +
        "-" + String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0");
      const blob = new Blob([json], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "kiviaeg-balanss-" + stamp + ".json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      saved = true;
    } catch (e) { /* allalaadimine keelatud — tekstiväli jääb */ }
    this.ioStatus("Täielik seadete fail (" + Object.keys(snap).length + " väärtust, neist muudetud " + changed + ")" +
      (saved ? " laaditi alla. Sama JSON on ka siin väljal." : ". Allalaadimine ebaõnnestus, kopeeri siit väljalt."), !saved);
  },

  importOverrides() {
    document.getElementById("ad-io").classList.remove("hidden");
    this.ioStatus("Vali .json fail — või kleebi JSON väljale ja vajuta \"Rakenda\".");
    document.getElementById("ad-io-file").click();
  },

  importFile(file) {
    if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      document.getElementById("ad-io").classList.remove("hidden");
      document.getElementById("ad-io-text").value = rd.result;
      this.applyIO();
    };
    rd.onerror = () => this.ioStatus("Faili lugemine ebaõnnestus.", true);
    rd.readAsText(file);
  },

  copyIO() {
    const ta = document.getElementById("ad-io-text");
    ta.select();
    const done = () => this.ioStatus("Kopeeritud lõikelauale.");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ta.value).then(done, () => {
        document.execCommand && document.execCommand("copy");
        done();
      });
    } else {
      document.execCommand && document.execCommand("copy");
      done();
    }
  },

  applyIO() {
    const txt = document.getElementById("ad-io-text").value.trim();
    if (!txt) { this.ioStatus("Tekstiväli on tühi.", true); return; }
    try {
      const ov = JSON.parse(txt);
      if (typeof ov !== "object" || ov === null || Array.isArray(ov)) throw new Error("oodatud on objekt {tee: väärtus}");
      // rakenda ainult tuntud teed
      let applied = 0, skipped = [];
      const clean = {};
      for (const path in ov) {
        try {
          const v = ov[path];
          if (typeof v !== "number" || !isFinite(v)) throw new Error("mittearvuline");
          // tee peab olemas olema vaikeväärtustes — muidu tekiks DATA-sse prügi
          const defV = path.split(".").reduce((o, k) => (o === undefined ? undefined : o[k]), this.defaults);
          if (typeof defV !== "number") throw new Error("tundmatu tee");
          this.set(path, v);
          if (Math.abs(v - defV) > 1e-12) clean[path] = v; // püsima jäävad ainult erinevused
          applied++;
        } catch (e) { skipped.push(path); }
      }
      localStorage.setItem(this.STORE_KEY, JSON.stringify(clean));
      this.renderValues();
      this.ioStatus("Rakendatud " + applied + " väärtust (vaikimisi erinevaid: " + Object.keys(clean).length + ")." +
        (skipped.length ? " Vahele jäid tundmatud teed: " + skipped.join(", ") : ""), !!skipped.length);
    } catch (e) { this.ioStatus("Vigane JSON: " + e.message, true); }
  },

  // ---------- balansilabor ----------
  runLab(strategies) {
    if (this.labRunning || !G) return;
    this.labRunning = true;
    window.__labLock = true;
    const out = document.getElementById("ad-lab-out");
    const seeds = parseInt(document.getElementById("ad-lab-seeds").value) || 8;
    const years = parseInt(document.getElementById("ad-lab-years").value) || 8;
    out.textContent = "Jooksutan " + strategies.join("+") + " × " + seeds + " seemet × " + years + " a…\n";

    // pane elus mäng kõrvale
    const savedG = G;
    const savedNames = Person.usedNames;
    const savedEvent = Bridge.onEvent, savedCombat = Bridge.onCombat, savedLog = Bridge.onLog, savedState = Bridge.onStateChange;
    const savedRestart = Bridge.onRestart;
    Bridge.onRestart = () => {}; // labori mängu lõpp ei tohi algusekraani avada
    let labStrategy = null;
    Bridge.onEvent = ev => { const c = Bot.eventChoice(ev, labStrategy); if (c && c.fx) c.fx(); };
    Bridge.onCombat = () => Combat.autoResolve();
    Bridge.onLog = () => {};
    Bridge.onStateChange = () => {};

    const jobs = [];
    for (const st of strategies) for (let s = 1; s <= seeds; s++) jobs.push({ st, seed: s * 7919 + 13 });
    const results = {};
    for (const st of strategies) results[st] = [];
    let ji = 0;
    const self = this;

    function finishLab() {
      // taasta elus mäng
      G = savedG;
      Person.usedNames = savedNames;
      U.setSeed((G.seed + G.day * 7919) >>> 0);
      Bridge.onEvent = savedEvent; Bridge.onCombat = savedCombat; Bridge.onLog = savedLog; Bridge.onStateChange = savedState;
      Bridge.onRestart = savedRestart;
      window.__labLock = false;
      self.labRunning = false;
      if (typeof UI !== "undefined") UI.refreshAll(true);
      let sum = "\n";
      for (const st of strategies) {
        const rs = results[st];
        const alive = rs.filter(r => r.ok).length;
        const avgPop = Math.round(rs.reduce((s, r) => s + r.pop, 0) / rs.length * 10) / 10;
        const causes = {};
        rs.forEach(r => r.causes.forEach(c => { causes[c] = (causes[c] || 0) + 1; }));
        const top = Object.entries(causes).sort((a, b) => b[1] - a[1]).slice(0, 3)
          .map(([c, n]) => c + "×" + n).join(", ");
        const avgScore = Math.round(rs.reduce((s2, r) => s2 + r.score, 0) / rs.length);
        const topScore = Math.max(...rs.map(r => r.score));
        sum += st.toUpperCase() + ": elas üle " + alive + "/" + rs.length +
          " | keskmine rahvaarv " + avgPop + " | skoor kesk " + avgScore + " / tipp " + topScore +
          "\n  surmad: " + (top || "—") + "\n";
      }
      out.textContent += sum;
    }

    function runOne() {
      if (ji >= jobs.length) { finishLab(); return; }
      const { st, seed } = jobs[ji++];
      labStrategy = st;
      let line;
      try {
        Sim.newGame(seed);
        G.paused = false;
        let d = 0;
        for (; d < years * 120 && !G.over; d++) {
          Bot.play(G, st);
          Sim.simDay();
        }
        const r = { ok: !G.over, pop: Sim.pop(), days: d, score: Math.round(G.score), causes: G.stats.deaths.map(x => x.cause) };
        results[st].push(r);
        line = st + " seed " + seed + ": " + (r.ok ? "ELUS, rahvast " + r.pop : "hukkus p" + r.days) + ", skoor " + r.score;
      } catch (e) {
        results[st].push({ ok: false, pop: 0, days: 0, score: 0, causes: ["VIGA"] });
        line = st + " seed " + seed + ": VIGA — " + e.message;
      }
      out.textContent += line + "\n";
      out.scrollTop = out.scrollHeight;
      setTimeout(runOne, 10);
    }
    setTimeout(runOne, 10);
  },

  // ---------- olukorra tööriistad ----------
  cheat(what) {
    if (!G || G.over) return;
    if (what === "food") G.dried += 100;
    else if (what === "mat") G.mat += 50;
    else if (what === "hides") G.hides += 10;
    else if (what === "clothe") Sim.alive().forEach(p => { p.clothed = true; p.clothesAge = 0; });
    else if (what === "heal") Sim.alive().forEach(p => { p.health = 100; p.sick = null; p.wound = 0; p.hungry = 0; });
    else if (what === "faith") G.faith = Math.min(100, G.faith + 20);
    else if (what === "rep") G.rep = Math.min(100, G.rep + 20);
    else if (what === "map") G.sites.forEach(s => { s.known = 2; s.revealed = true; if (s.estRich === null) s.estRich = s.rich; });
    else if (what === "relic") {
      const missing = Object.keys(DATA.RELICS).filter(k => !G.relics.some(r => r.key === k));
      if (missing.length) Sim.gainRelic(U.pick(missing), null, "Balansipaneelist antud.");
    }
    else if (what === "season") {
      let guard = 0;
      while (G.sday !== 1 && guard++ < 31 && !G.over && !G.combat) Sim.simDay();
    }
    if (typeof UI !== "undefined") UI.refreshAll(true);
  },

  fireEvent(ev) {
    if (!G || G.over || G.combat) return;
    if (ev === "hundid" || ev === "kylmalaine" || ev === "haigus") Events.fireWinter(ev);
    else if (ev === "randaja") Events.wanderer();
    else if (ev === "pagulased") Events.refugees();
    else if (ev === "kaupleja") { G.neighbors[0].known = true; G.neighbors[0].att = Math.max(G.neighbors[0].att, 50); Events.trader(); }
    else if (ev === "haarang") {
      const n = G.neighbors[0];
      n.known = true;
      n.vengeance = true;
      G.raidCheckDay = G.sday;
      const s = G.season;
      G.season = 2; // haarangukontroll käib sügisel/talvel
      Events.raidCheck();
      G.season = s;
    }
    else if (ev === "schism") { G.flags.schismDone = false; G.leaveP = Math.max(G.leaveP, 36); Events.schism(); }
    else if (ev === "raidleid") {
      const theirPop = Math.max(5, Math.round(Sim.pop() * U.rf(DATA.RAIDOP.SIZE[0], DATA.RAIDOP.SIZE[1])));
      Events.raidTargetFound({
        name: U.pick(TRIBE_NAMES), pop: theirPop,
        defenders: U.clamp(Math.round(theirPop / 4), 2, 5),
        defensible: U.ri(15, 75), dist: U.ri(2, 5), rich: theirPop * U.rf(6, 14),
      }, { name: "(paneeli skaut)" });
    }
    if (typeof UI !== "undefined") UI.refreshAll(true);
  },

  // ---------- sisikond ----------
  refreshInternals() {
    const el = document.getElementById("ad-internals");
    if (!el || !G) return;
    const site = Sim.curSite();
    const ry = [0, 1, 2].map(r => Math.round(World.ringYield(site, r) * 100) + "%").join(" / ");
    const fx = DATA.RITUAL_TYPES.map(t => t + ":" + (G.ritualFx[t] ? "PÄRIS" : "petukaup")).join("  ");
    const nb = G.neighbors.map(n => n.name + " att=" + Math.round(n.att) + (n.vengeance ? " VERI!" : "")).join(" | ");
    el.textContent =
      "koht: " + site.name + "  varjatus=" + Math.round(site.hidden || 0) + "  kaitstavus=" + Math.round(site.defensible || 0) +
      "  ring auto=" + (World.autoRing(site) + 1) + "  saagikus " + ry + "\n" +
      "punktid: " + site.points.map(p => Math.round(p * 10) / 10).join(" / ") + "  kaugretki tehtud: " + Math.round(site.expeds * 10) / 10 + "\n" +
      "SKOOR=" + Math.round(G.score) + " (viimane hooaeg +" + Math.round(G.lastSeasonPts || 0) + ")" +
      "  relvi=" + Sim.gearCount("relv") + " turviseid=" + Sim.gearCount("turvis") +
      " leiud: kivi=" + G.finds.flint + " luu=" + G.finds.bone + "\n" +
      "NÄHTAVUS=" + Sim.visibility() + " (rünnak/hooaeg: " +
      Math.round(U.clamp((Sim.visibility() - DATA.VIS.RAID_BASE) / DATA.VIS.RAID_DIV, 0, DATA.VIS.RAID_MAX) * 100) + "%)" +
      "  jälitus=" + (G.pursuit ? G.pursuit.days + "p" : "ei") + "\n" +
      "usk=" + Math.round(G.faith) + "  maine=" + Math.round(G.rep) + "  turva=" + Math.round(G.sec) + "/" + Sim.secReq() +
      "  lahkumissurve=" + Math.round(G.leaveP * 10) / 10 + "\n" +
      "näljanäit=" + Math.round(G.hungerRecent * 10) / 10 + "  söödud=" + Math.round((G.fedFrac || 1) * 100) + "%" +
      "  tööriistad=" + Math.round(G.tool) + "  kohatundmine=+" + Math.round((Sim.localKnowledge() - 1) * 100) + "%\n" +
      "rituaalid (varjatud!): " + fx + "\n" +
      "naabrid: " + (nb || "—") + "\n" +
      "talveplaan: " + (G.winterPlan.length ? G.winterPlan.map(w => "p" + w.day + ":" + w.type).join(", ") : "—");
  },
};

document.addEventListener("DOMContentLoaded", () => Admin.init());
