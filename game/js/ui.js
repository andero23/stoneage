// ui.js — DOM, paneelid, modaalid, lahinguliides, piirkonnakaart.
"use strict";

const UI = {
  modalQueue: [],
  modalOpen: false,
  autoResume: false,
  selectedSite: null,
  combatSel: null,
  combatTarget: null,
  lastPeopleRefresh: -1,

  $(id) { return document.getElementById(id); },

  init() {
    // Bridge
    Bridge.headless = false;
    Bridge.onLog = (line, cls) => this.logLine(line, cls);
    Bridge.onEvent = ev => this.queueModal(ev);
    Bridge.onCombat = () => this.openCombat();
    Bridge.onCombatEnd = () => this.closeCombat();
    Bridge.onStateChange = () => this.refreshAll();
    Bridge.onRestart = () => this.newGame();
    Bridge.onRecord = () => {
      this.saveRecord();
      T.log("game_over", { score: Math.round(G.score), ...T.snapshot() });
      T.flush();
      setTimeout(() => T.askFeedback("surm"), 800);
    };

    // kiirus
    document.querySelectorAll(".spd").forEach(b => {
      b.addEventListener("click", () => {
        const s = parseInt(b.dataset.spd);
        if (s === 0) G.paused = true;
        else { G.paused = false; G.speed = s; }
        this.refreshTop();
      });
    });

    // tabid
    document.querySelectorAll(".tab").forEach(b => {
      b.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
        document.querySelectorAll(".tabpage").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        this.$("tab-" + b.dataset.tab).classList.add("active");
        this.refreshAll(true);
      });
    });

    // klaviatuur
    document.addEventListener("keydown", e => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return;
      if (!G || this.modalOpen || G.combat) return;
      if (e.code === "Space") { e.preventDefault(); G.paused = !G.paused; this.refreshTop(); }
      if (e.key === "1") { G.paused = false; G.speed = 1; this.refreshTop(); }
      if (e.key === "2") { G.paused = false; G.speed = 2; this.refreshTop(); }
      if (e.key === "3") { G.paused = false; G.speed = 4; this.refreshTop(); }
    });

    // lahingunupud
    this.$("cb-endturn").addEventListener("click", () => { if (G.combat && !G.combat.over) { Combat.endPlayerTurn(); this.drawCombat(); } });
    this.$("cb-flee").addEventListener("click", () => { if (G.combat && !G.combat.over) Combat.fleeAll(); });
    this.$("cb-auto").addEventListener("click", () => { if (G.combat && !G.combat.over) Combat.autoResolve(); });
    this.$("combat-canvas").addEventListener("click", e => this.combatClick(e));
    this.$("cb-confirm").addEventListener("click", () => {
      if (!G.combat || G.combat.over) return;
      const sel = G.combat.units.find(u => u.id === this.combatSel);
      const tgt = G.combat.units.find(u => u.id === this.combatTarget);
      if (sel && tgt && !sel.acted) Combat.attack(sel, tgt);
      this.combatTarget = null;
      this.drawCombat();
    });

    // ringiribad: klõps avab selgituse (tooltip ei tööta puuteekraanil)
    this.$("ring-overlay").addEventListener("click", () => this.showRings());

    // paneelis toimetamise ajal ei ehitata seda ümber
    this.ptrDown = false;
    this.$("side").addEventListener("pointerdown", () => { this.ptrDown = true; });
    window.addEventListener("pointerup", () => { this.ptrDown = false; });

    // Mäng algab kohe: pooleliolev partii jätkub, muidu algab uus.
    // Vaheekraane ega juhendit ei ole — mäng peab seletama end ise.
    if (!this.loadGame()) this.newGame();

    const objHide = this.$("obj-hide");
    if (objHide) objHide.addEventListener("click", e => {
      e.stopPropagation();
      if (G && G.obj) { G.obj.hidden = true; this.refreshObjective(); }
    });

    window.addEventListener("beforeunload", () => this.saveGame());

    // telemeetria (vaikib, kui serverit pole)
    T.init();
    setInterval(() => T.tick(), 1000);
    this.$("btn-feedback").addEventListener("click", () => T.askFeedback("nupp"));
  },

  saveRecord() {
    try {
      const recs = JSON.parse(localStorage.getItem("kiviaeg-records") || "[]");
      recs.push({
        score: Math.round(G.score),
        years: U.round1(G.year - 1 + (G.season + 1) / 4),
        pop: G.stats.peakPop || Sim.pop(),
        raids: G.stats.raidsMade || 0,
        moves: G.stats.moves,
        date: new Date().toISOString().slice(0, 10),
      });
      recs.sort((a, b) => b.score - a.score);
      localStorage.setItem("kiviaeg-records", JSON.stringify(recs.slice(0, 10)));
    } catch (e) {}
  },

  records() {
    try { return JSON.parse(localStorage.getItem("kiviaeg-records") || "[]"); } catch (e) { return []; }
  },

  clearModals() {
    this.modalQueue = [];
    this.modalOpen = false;
    this.autoResume = false;
    this.$("modal-back").classList.add("hidden");
    this.$("log-overlay").innerHTML = "";
  },

  newGame() {
    const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    this.clearModals();
    Sim.newGame(seed);
    T.newGame(seed, false);
    G.paused = false;
    this.refreshAll(true);
  },

  saveGame() {
    if (!G || G.over || G.combat) return; // lahingu keskelt ei salvestata; teekonna keskelt küll
    try {
      localStorage.setItem("kiviaeg-save", JSON.stringify(G));
    } catch (e) { /* täis või keelatud — pole hullu */ }
  },

  loadGame() {
    try {
      const g = JSON.parse(localStorage.getItem("kiviaeg-save"));
      if (!g || !g.people || g.over) return false;
      G = g;
      U.setSeed((g.seed + g.day * 7919) >>> 0);
      Person.usedNames = new Set(G.people.map(p => p.name));
      G.paused = false;
      G.combat = null;
      G.suurjaht = G.suurjaht || null;
      // vanade salvestuste migratsioon: koha omadused, isikuomadused
      for (const st of G.sites) {
        if (st.hidden === undefined) { st.hidden = U.ri(20, 70); st.defensible = U.ri(20, 70); }
        if (st.hidden0 === undefined) st.hidden0 = st.hidden;
      }
      for (const pp of G.people) if (!pp.traits) pp.traits = Person.rollTraits();
      Objectives.migrate();
      this.clearModals();
      this.refreshAll(true);
      T.newGame(G.seed, true);
      Sim.log("The fire still burns. The game picks up where you left it.", "evt");
      return true;
    } catch (e) { console.error(e); return false; }
  },

  // Ringide selgitus: mida kaugus tähendab saagile, kogemusele ja ohule.
  showRings() {
    if (!G || G.over) return;
    const site = Sim.curSite();
    const auto = World.autoRing(site);
    const pct = r => Math.round((site.max[r] > 0 ? site.points[r] / site.max[r] : 0) * 100);
    const names = ["Ring 1 — around the camp", "Ring 2 — a day's walk out", "Ring 3 — the far forest"];
    const desc = [
      "Safe. The walk takes one day, and in a raid your people are home. Empties first.",
      "Yield " + Math.round(DATA.RING_MOD[1] * 100) + "% and experience " + DATA.RING_XP[1] + "× faster. " +
        "The walk takes two days — in a raid these people cannot get home. Wolves and boar.",
      "Yield " + Math.round(DATA.RING_MOD[2] * 100) + "%, but experience " + DATA.RING_XP[2] + "× faster. " +
        "Bear, wolf pack, strangers, and getting lost. Here a person can vanish for good.",
    ];
    let body = "The land empties from the inside out. Each ring is a separate store: when the nearest runs dry, " +
      "people walk further — slower, riskier, but they learn more out there.\n\n";
    for (let r = 0; r < 3; r++) {
      body += names[r] + " — " + pct(r) + "% left" + (r === auto ? "  ← today's ring" : "") + "\n" +
        desc[r] + "\n\n";
    }
    body += "Comfort teaches nothing: a band that sits in a rich place working ring 1 grows large and stays ignorant. " +
      "You can send one person further out with the ring button on the People tab.";
    this.queueModal({
      title: "The rings around camp",
      body,
      choices: [{ label: "Understood", fx: () => {} }],
      def: 0,
    });
  },

  // ---------- logi ----------
  logLine(line, cls) {
    const el = this.$("log-overlay");
    if (!el) return;
    const div = document.createElement("div");
    div.className = "logline " + (cls || "");
    div.textContent = line;
    el.appendChild(div);
    while (el.children.length > 7) el.removeChild(el.firstChild);
  },

  // ---------- modaalid ----------
  queueModal(ev) {
    this.modalQueue.push(ev);
    if (!this.modalOpen) this.showNextModal();
  },

  showNextModal() {
    // lahingu ajal ootavad modaalid järjekorras: muidu jääksid nad lahingu alla peitu
    if (G && G.combat) {
      this.modalOpen = false;
      this.$("modal-back").classList.add("hidden");
      return;
    }
    const ev = this.modalQueue.shift();
    if (!ev) {
      this.modalOpen = false;
      this.$("modal-back").classList.add("hidden");
      if (this.autoResume && !G.over) { G.paused = false; this.autoResume = false; }
      this.refreshAll(true);
      return;
    }
    if (!G.paused) { this.autoResume = true; G.paused = true; }
    this.modalOpen = true;
    this.$("modal-back").classList.remove("hidden");
    this.$("modal-title").textContent = ev.title;
    this.$("modal-body").textContent = ev.body;
    const box = this.$("modal-choices");
    box.innerHTML = "";
    const multi = (ev.choices || []).length > 1;
    (ev.choices || [{ label: "Selge", fx: () => {} }]).forEach(c => {
      const b = document.createElement("button");
      b.innerHTML = c.label + (c.sub ? '<span class="csub">' + c.sub + "</span>" : "");
      b.addEventListener("click", () => {
        if (multi) T.log("choice", { title: ev.title, choice: c.label });
        if (c.fx) c.fx();
        this.showNextModal();
      });
      box.appendChild(b);
    });
  },

  // ---------- värskendused ----------
  refreshAll(force) {
    if (!G) return;
    this.refreshTop();
    this.refreshRings();
    this.refreshAway();
    this.refreshObjective();
    // ära ehita paneeli uuesti, kui kasutaja parasjagu selle sees toimetab
    if (!force) {
      const pg = document.querySelector(".tabpage.active");
      if (pg && (pg.contains(document.activeElement) || this.ptrDown)) return;
    }
    const active = document.querySelector(".tab.active");
    const tab = active ? active.dataset.tab : "rahvas";
    if (tab === "rahvas") this.refreshPeople(force);
    else if (tab === "kyla") this.refreshVillage();
    else if (tab === "teod") this.refreshActions();
    else if (tab === "kaart") this.refreshMap();
  },

  refreshTop() {
    this.$("date-txt").textContent = Sim.seasonName().toUpperCase() + ", YEAR " + G.year;
    this.$("day-txt").textContent = "day " + G.sday + "/30" + (G.journey ? " — TRAVELLING" : "");
    this.$("r-fresh").textContent = Math.floor(Sim.freshTotal());
    this.$("r-dried").textContent = Math.floor(G.dried);
    this.$("r-mat").textContent = Math.floor(G.mat);
    this.$("r-hides").textContent = Math.floor(G.hides);
    this.$("r-clothes").textContent = Sim.alive().filter(p => p.clothed).length + "/" + Sim.pop();
    this.$("r-tool").textContent = Math.round(G.tool);
    const gw = Sim.gearCount("relv"), ga = Sim.gearCount("turvis");
    this.$("r-gear").textContent = gw + "/" + ga;
    this.$("res-gear").title = "War gear: " + gw + " weapons, " + ga + " armour (they wear out in battle). Finds waiting: " +
      G.finds.flint + " special stones, " + G.finds.bone + " great bones. Forging: Camp tab.";
    this.$("r-pop").textContent = Sim.pop();
    this.$("r-leave").textContent = Sim.leaveCost();
    this.$("r-score").textContent = Math.round(G.score);

    document.querySelectorAll(".spd").forEach(b => {
      const s = parseInt(b.dataset.spd);
      b.classList.toggle("active", (s === 0 && G.paused) || (!G.paused && s === G.speed));
    });

    const req = Sim.secReq();
    const secEl = this.$("m-sec");
    secEl.title = "Safety " + Math.round(G.sec) + " / needed " + req + ". The need grows with the band (3 per person). Below it, work slows and people start to leave.";
    secEl.querySelector(".fill").style.width = G.sec + "%";
    secEl.querySelector(".req").style.left = Math.min(100, req) + "%";
    secEl.querySelector(".mval").textContent = Math.round(G.sec);
    secEl.querySelector(".fill").style.background = G.unsafe ? "var(--danger)" : "var(--sec)";

    this.$("m-faith").querySelector(".fill").style.width = G.faith + "%";
    this.$("m-faith").querySelector(".mval").textContent = Math.round(G.faith);
    this.$("m-rep").querySelector(".fill").style.width = G.rep + "%";
    this.$("m-rep").querySelector(".mval").textContent = Math.round(G.rep);

    const vis = Sim.visibility();
    const visEl = this.$("m-vis");
    visEl.title = "Exposure " + vis + ": what others see of you. People, stores, buildings and feasts raise it; " +
      "the cover of the place (" + DATA.LEVEL_NAME(Sim.curSite().hidden || 0) + ") hides you. " +
      (vis < DATA.VIS.RAID_BASE ? "Right now nobody can find you." : "You may be spotted and attacked.");
    visEl.querySelector(".fill").style.width = vis + "%";
    visEl.querySelector(".fill").style.background = vis < DATA.VIS.RAID_BASE ? "var(--ok)" : vis < 55 ? "#c9a83c" : "var(--danger)";
    visEl.querySelector(".mval").textContent = vis;

    if (typeof Mobile !== "undefined" && Mobile.on) Mobile.syncSpeed();
  },

  refreshRings() {
    const site = Sim.curSite();
    const short = typeof Mobile !== "undefined" && Mobile.on;
    for (let r = 0; r < 3; r++) {
      const el = this.$("rb-" + r);
      const lab = el.querySelector("label");
      if (lab) lab.textContent = short ? "R" + (r + 1) : "Ring " + (r + 1);
      const frac = site.max[r] > 0 ? site.points[r] / site.max[r] : 0;
      const fill = el.querySelector(".rfill");
      fill.style.width = Math.round(frac * 100) + "%";
      fill.style.background = frac > 0.5 ? "var(--ok)" : frac > 0.2 ? "#c9a83c" : "var(--danger)";
    }
  },

  refreshObjective() {
    const el = this.$("obj-bar");
    if (!el || !G) return;
    if (!G.obj) { el.classList.add("hidden"); return; }
    // tähistus (4 s)
    const c = G.obj.celebrate;
    if (c && (G.day - c.day) < 1 && this.lastCelebrated !== c.title) {
      this.lastCelebrated = c.title;
      const t = document.createElement("div");
      t.id = "obj-toast";
      t.textContent = "✓ " + c.title + "  +" + c.reward + " 🏆";
      document.getElementById("canvas-wrap").appendChild(t);
      setTimeout(() => t.remove(), 4000);
    }
    const def = Objectives.active();
    if (!def || G.obj.hidden) { el.classList.add("hidden"); return; }
    el.classList.remove("hidden");
    let ptxt = "";
    if (def.progress) {
      const pr = def.progress();
      ptxt = " · " + pr.cur + "/" + pr.max;
    }
    this.$("obj-title").textContent = "🎯 " + def.title + ptxt;
    el.title = def.hint || "";
  },

  refreshAway() {
    const away = Sim.alive().filter(p => p.away);
    const el = this.$("away-overlay");
    if (!away.length) { el.textContent = ""; return; }
    el.innerHTML = "Away: " + away.map(p => {
      const a = p.away;
      if (a.type === "ring") return p.name + " (ring " + (a.ring + 1) + ")";
      if (a.type === "skaut") return p.name + " (scouting, " + a.days + "d)";
      if (a.type === "retk") return p.name + " (long journey)";
      if (a.type === "suurjaht") return p.name + " (great hunt)";
      return p.name;
    }).join(", ");
  },

  // ---------- rahvas ----------
  refreshPeople(force) {
    if (!force && this.lastPeopleRefresh === G.day) return;
    this.lastPeopleRefresh = G.day;
    const page = this.$("tab-rahvas");
    page.innerHTML = "";
    const ppl = Sim.alive().slice().sort((a, b) => (a.child ? 1 : 0) - (b.child ? 1 : 0));
    for (const p of ppl) {
      const row = document.createElement("div");
      row.className = "prow";
      const dom = DATA.JOBS[p.job] ? DATA.JOBS[p.job].dom : "kor";
      const lvl = Person.skill(p, dom);
      const xpFrac = ((p.xp[dom] || 0) % DATA.XP_PER_LEVEL) / DATA.XP_PER_LEVEL;
      const stars = "★".repeat(lvl) + (lvl < 3 ? "☆" : "") + (lvl < 3 ? " " + Math.round(xpFrac * 100) + "%" : "");
      const tags = Person.statusText(p);

      const relicHead = G.relics.find(r => r.bearerId === p.id);
      const tagHtml = tags.map(x => (x.includes("sick") || x.includes("wounded") || x.includes("hungry") || x === "no clothes") ? '<span class="warn">' + x + "</span>" : x).join(" · ") +
        (relicHead ? (tags.length ? " · " : "") + '<span class="relic" title="' + relicHead.origin + '">' + relicHead.name + "</span>" : "");

      const head = document.createElement("div");
      head.className = "phead";
      head.innerHTML = '<span class="pname">' + p.name + '</span><span class="page">' + p.age + "</span>" +
        '<span class="psex" title="' + (p.sex === "N" ? "female" : "male") + '">' + (p.sex === "N" ? "♀" : "♂") + "</span>" +
        '<span class="hbar" title="Health ' + Math.round(p.health) + '"><span class="hfill" style="width:' + Math.max(0, p.health) + '%;background:' + (p.health > 60 ? "var(--ok)" : p.health > 30 ? "#c9a83c" : "var(--danger)") + '"></span></span>' +
        '<span class="ptags">' + tagHtml + "</span>" +
        '<span class="pstat">' + (p.child ? "🧒" : "") + "</span>";
      row.appendChild(head);

      if (!p.child) {
        const ctrl = document.createElement("div");
        ctrl.className = "pctrl";
        const sel = document.createElement("select");
        for (const jk of DATA.JOB_KEYS) {
          if (jk === "samaan" && p.job !== "samaan") continue; // šamaaniks ei määrata, šamaaniks saadakse
          const o = document.createElement("option");
          o.value = jk; o.textContent = DATA.JOBS[jk].name;
          if (p.job === jk) o.selected = true;
          sel.appendChild(o);
        }
        sel.title = DATA.JOBS[p.job].desc;
        sel.addEventListener("change", () => {
          p.job = sel.value;
          if (p.away && p.away.type === "ring") p.away = null;
          this.refreshAll(true);
        });
        ctrl.appendChild(sel);

        if (p.job === "korilane") {
          const msel = document.createElement("select");
          for (const mk in DATA.KOR_MODES) {
            const o = document.createElement("option");
            o.value = mk; o.textContent = DATA.KOR_MODES[mk];
            if (p.mode === mk) o.selected = true;
            msel.appendChild(o);
          }
          const kl = Person.skill(p, "kor");
          const pr = Math.round(DATA.POISON.seened.risk[kl] * 100 * 10) / 10;
          msel.title = "Berries: safe and predictable.\n" +
            "Mushrooms: more than berries, but POISON RISK — at their skill a bad mushroom reaches the common pot " + pr + "% of days. " +
            "A RANDOM eater falls ill (a child too); death depends on that eater's health" + (Sim.hasShaman() ? " and the shaman heals" : " — and you have no shaman") + ". " +
            "The picker's skill cuts the risk sharply: knowing which mushroom is safe is wealth the band owns.\n" +
            "Roots: the only foraging in winter. Timber: for building and special finds. Drying: fresh → dried (needs a rack).";
          msel.addEventListener("change", () => { p.mode = msel.value; this.refreshAll(true); });
          ctrl.appendChild(msel);
        }

        const skill = document.createElement("span");
        skill.className = "skill";
        let traitTxt = "", traitTitle = "";
        const tr = p.traits;
        if (tr && tr.giftKnown && dom === tr.gift) { traitTxt = " ✦"; traitTitle = " — born gifted at this"; }
        if (tr && tr.weakKnown && dom === tr.weak) { traitTxt = " ▿"; traitTitle = " — this work never comes easy to them"; }
        skill.title = DATA.DOM_NAMES[dom] + ": level " + lvl + (lvl < 3 ? " (" + Math.round((1 - xpFrac) * 100) + "% to next)" : " (master)") + traitTitle;
        skill.textContent = stars + traitTxt;
        ctrl.appendChild(skill);

        if (["korilane", "kalur", "kytt"].includes(p.job)) {
          // Ringi-nupp: näitab, kus see inimene täna töötab. Vajutus saadab ta
          // ühe ringi kaugemale (vähem saaki, rohkem kogemust ja ohtu) ja tagasi.
          const ring = Math.min(2, World.autoRing(Sim.curSite()) + (p.farWork ? 1 : 0));
          const btn = document.createElement("button");
          btn.className = "ringbtn" + (p.farWork ? " far" : "");
          btn.textContent = "R" + (ring + 1);
          btn.title = p.farWork
            ? "Working further out (ring " + (ring + 1) + "): less yield, more experience and more danger. Tap to bring them closer."
            : "Working the nearest ring that still grows anything. Tap to send them further out.";
          btn.addEventListener("click", () => { p.farWork = !p.farWork; this.refreshPeople(true); });
          ctrl.appendChild(btn);
        }
        row.appendChild(ctrl);
      }

      page.appendChild(row);
    }
  },

  // ---------- küla ----------
  refreshVillage() {
    const page = this.$("tab-kyla");
    const site = Sim.curSite();
    let html = "";

    html += '<div class="sechead">' + site.name + " — a " + DATA.RICHNESS_NAME(site.rich) + " place</div>";
    html += '<div class="bdesc" style="font-size:12px;color:var(--dim);line-height:1.4;margin-bottom:6px">' +
      (site.river ? "The river gives fish. " : "Little water: poor fishing. ") +
      (site.cave ? "Cave: free shelter for 12. " : "") +
      (site.fishRun ? "SPAWNING RUN: extraordinary fishing in spring. " : "") +
      "Cover: " + DATA.LEVEL_NAME(site.hidden || 0) + " · defensible: " + DATA.LEVEL_NAME(site.defensible || 0) + ". " +
      "Shelter for " + Sim.shelterCap() + "/" + Sim.pop() + " people." +
      "</div>";

    // ratsioonid
    html += '<div class="bldrow"><div class="bhead"><span class="bname">Rations</span>' +
      '<button class="bbtn" id="btn-ration">' + (G.ration === 1 ? "Full → half" : "Half → full") + "</button></div>" +
      '<div class="bdesc">Now: ' + (G.ration === 1 ? "full rations" : "HALF RATIONS: stores last longer, but health and faith suffer") + ". Daily need: " + U.round1(Sim.dailyNeed()) + " food.</div></div>";

    html += '<div class="sechead">Buildings</div>';
    if (G.buildQueue.length) {
      const hasM = Sim.adults().some(p => p.job === "meister" && Person.canWork(p));
      html += '<div class="buildq">Under construction:' +
        (hasM ? "" : " <span style='color:var(--danger)'>YOU NEED A CRAFTER!</span>") + "</div>";
      G.buildQueue.forEach((b, i) => {
        const total = DATA.BUILDINGS[b.key].work;
        const done = U.clamp((total - b.workLeft) / total, 0, 1);
        html += '<div class="progrow"><span class="plabel">' + DATA.BUILDINGS[b.key].name +
          (i > 0 ? " <span class='dim'>(queued)</span>" : "") + '</span>' +
          '<span class="pbar"><span class="pfill" style="width:' + Math.round(done * 100) + '%"></span></span>' +
          '<span class="pval">' + Math.round(done * 100) + "% · " + Math.ceil(b.workLeft) + " wd</span></div>";
      });
    }
    for (const key in DATA.BUILDINGS) {
      const def = DATA.BUILDINGS[key];
      const n = site.b[key];
      html += '<div class="bldrow"><div class="bhead"><span class="bname">' + def.name + '</span><span class="bcount">' + (def.max > 1 ? n + "/" + def.max : (n ? "✓" : "—")) + "</span>" +
        '<button class="bbtn" data-build="' + key + '"' + (n >= def.max ? " disabled" : "") + ">Build</button></div>" +
        '<div class="bdesc">' + def.desc + "</div>" +
        '<div class="bcost">' + def.mat + " timber + " + def.work + " work-days (crafter). Lost on leaving: " + def.leave + (def.halfBack ? " (half the timber comes back)" : "") + "</div></div>";
    }

    html += '<div class="sechead">Winter clothes</div>';
    html += '<div class="bldrow"><div class="bhead"><span class="bname">Clothed: ' + Sim.alive().filter(p => p.clothed).length + "/" + Sim.pop() + "</span>" +
      '<button class="bbtn" id="btn-clothes">Sew (' + DATA.CLOTHES_HIDES + ' hides)</button></div>' +
      '<div class="bdesc">A crafter sews a set in ' + DATA.CLOTHES_WORK + " work-days. Without one it is done in the evenings, far slower. Queued: " + G.clothQueue + ". Anyone without clothes freezes in winter.</div>" +
      (G.clothQueue > 0 ? '<div class="progrow"><span class="plabel">Winter clothes</span>' +
        '<span class="pbar"><span class="pfill" style="width:' + Math.round(U.clamp(G.clothProgress / DATA.CLOTHES_WORK, 0, 1) * 100) + '%"></span></span>' +
        '<span class="pval">' + Math.round(U.clamp(G.clothProgress / DATA.CLOTHES_WORK, 0, 1) * 100) + '%</span></div>' : "") + "</div>";

    // sõjavarustus
    html += '<div class="sechead">War gear</div>';
    html += '<div class="bldrow"><div class="bhead"><span class="bname">Weapons: ' + Sim.gearCount("relv") + " · armour: " + Sim.gearCount("turvis") + '</span></div>' +
      '<div class="bdesc">Finds waiting: <b>' + G.finds.flint + '</b> special stones (from timber work further out), <b>' + G.finds.bone + '</b> great bones (from the great hunt, from big kills). ' +
      "Gear wears out in battle (" + DATA.GEAR.WEAR_PER_FIGHT + "/fight) — resupply never ends." +
      "</div>" +
      (G.gearQueue.length ? (function(){
        const q = G.gearQueue[0];
        const need = q.kind === "relv" ? DATA.GEAR.WEAPON.work : DATA.GEAR.ARMOR.work;
        const d = U.clamp(G.gearProgress / need, 0, 1);
        return '<div class="progrow"><span class="plabel">' + (q.kind === "relv" ? "Weapon" : "Armour") +
          (G.gearQueue.length > 1 ? " <span class='dim'>(+" + (G.gearQueue.length - 1) + ")</span>" : "") + '</span>' +
          '<span class="pbar"><span class="pfill" style="width:' + Math.round(d * 100) + '%"></span></span>' +
          '<span class="pval">' + Math.round(d * 100) + '%</span></div>';
      })() : "") +
      '<div class="bcost"><button id="btn-gear-relv">Forge weapon (1 stone + 2 timber, 2 wd)</button> ' +
      '<button id="btn-gear-turvis">Armour (2 bones + 2 hides, 3 wd)</button></div></div>';

    // kuivatamine
    const dryers = Sim.alive().filter(p => p.job === "korilane" && p.mode === "kuivatab").length;
    html += '<div class="sechead">Drying</div>';
    html += '<div class="bldrow"><div class="bdesc">Racks: ' + site.b.raam + " (capacity " + site.b.raam * DATA.RACK_CAP + ", dried in store " + Math.floor(G.dried) + "). Drying: " + dryers +
      (site.b.raam && !dryers ? ' — <span style="color:var(--danger)">nobody is drying! Set a forager to "drying food".</span>' : "") + "</div></div>";

    // lahkumise hind
    html += '<div class="sechead">Cost of leaving: ' + Sim.leaveCost() + "</div>";
    html += '<div class="bdesc" style="font-size:12px;color:var(--dim);line-height:1.4">Every building is a step away from freedom. Move, and all of it stays behind' +
      (site.b.pyha ? ", and leaving a shrine shakes the faith" : "") +
      (site.graves ? ", and the graves (" + site.graves + ") are left guarding an empty place" : "") + ".</div>";

    page.innerHTML = html;

    page.querySelectorAll("[data-build]").forEach(b => {
      b.addEventListener("click", () => {
        const err = Sim.queueBuild(b.dataset.build);
        if (!err) T.log("action", { a: "ehita-" + b.dataset.build });
        if (err) this.logLine(err, "bad");
        this.refreshAll(true);
      });
    });
    const rat = this.$("btn-ration");
    if (rat) rat.addEventListener("click", () => { G.ration = G.ration === 1 ? 0.5 : 1; this.refreshAll(true); });
    const cl = this.$("btn-clothes");
    if (cl) cl.addEventListener("click", () => {
      const err = Sim.queueClothes();
      if (err) this.logLine(err, "bad");
      this.refreshAll(true);
    });
    for (const kind of ["relv", "turvis"]) {
      const b = this.$("btn-gear-" + kind);
      if (b) b.addEventListener("click", () => {
        const err = Sim.queueGear(kind);
        if (err) this.logLine(err, "bad");
        this.refreshAll(true);
      });
    }
  },

  // ---------- teod ----------
  refreshActions() {
    const page = this.$("tab-teod");
    let html = "";

    const feast = Sim.canFeast();
    html += this.actHtml("Feast", "pidu", feast.ok,
      "Costs " + Math.ceil(Sim.pop() * DATA.FEAST_COST_PER_POP) + " food. Renown and faith rise, the urge to leave falls, neighbours come to visit — and count your stores.",
      feast.ok ? null : feast.why);

    const rit = Sim.canRitual();
    for (const t of DATA.RITUAL_TYPES) {
      html += this.actHtml(DATA.RITUAL_NAMES[t], "rit-" + t, rit.ok,
        "The shaman offers up " + DATA.RITUAL_COST + " food. Does it work? The shaman says it works. Proof never comes.",
        rit.ok ? null : rit.why);
    }

    const sj = Sim.canSuurjaht();
    html += this.actHtml("Great hunt", "suurjaht", sj.ok,
      "4–6 people, 3 days, one big animal: meat and hides in quantity, a chance at a relic. Someone will probably come back wounded.",
      sj.ok ? null : sj.why);

    const kr = Sim.canKaugretk();
    html += this.actHtml("Long journey", "kaugretk", kr.ok,
      "3 warriors + 3 hunters, 12 days in far hunting grounds. Much food, and it does NOT deplete the land around home. The camp is left weak. Each journey wears the far country down.",
      kr.ok ? null : kr.why);

    const sr = Sim.canScoutRaid();
    html += this.actHtml("Look for camps to raid", "skautraid", sr.ok,
      "A scout walks the far paths looking for strangers' camps (6–12 days, dangerous). If they find something, you must decide THEN AND THERE: attack or not — the chance does not come back. Loot comes off the fallen; lose, and you may be tracked home.",
      sr.ok ? null : sr.why);

    if (G.stolenRelic) {
      const rt = Events.canRetrieve();
      html += this.actHtml("Take back the relic: " + G.stolenRelic.name, "retrieve", rt.ok,
        "A raid on their camp. The best reason for war this age knows. Blood brings blood.",
        rt.ok ? null : rt.why);
    }

    // reliikviad
    html += '<div class="sechead">Relics (' + G.relics.length + ")</div>";
    if (!G.relics.length) html += '<div class="bdesc" style="color:var(--dim);font-size:12px">None yet. Relics come from the great hunt, from burials, from traders, and from victories.</div>';
    G.relics.forEach((r, i) => {
      const bearer = r.bearerId !== null ? G.people.find(p => p.id === r.bearerId && p.alive) : null;
      const def = DATA.RELICS[r.key];
      html += '<div class="act"><div class="ahead"><span class="aname" style="color:var(--faith)">' + r.name + "</span></div>" +
        '<div class="adesc">' + r.origin + "<br>" + def.desc +
        (def.job ? "<br>Belongs to the " + DATA.JOBS[def.job].name + "." : "") +
        "<br>Held by: " + (bearer ? bearer.name : (Sim.curSite().b.pyha ? "the shrine (gives faith)" : "nobody")) + "</div>" +
        '<select data-relic="' + i + '"><option value="">— hand it over (5 food) —</option>' +
        Sim.adults().filter(p => !def.job || p.job === def.job).map(p => '<option value="' + p.id + '">' + p.name + " (" + DATA.JOBS[p.job].name + ")</option>").join("") +
        "</select></div>";
    });

    page.innerHTML = html;

    const wire = (id, fn) => { const el = page.querySelector('[data-act="' + id + '"]'); if (el) el.addEventListener("click", () => { T.log("action", { a: id }); fn(); this.refreshAll(true); }); };
    wire("pidu", () => Sim.feast());
    for (const t of DATA.RITUAL_TYPES) wire("rit-" + t, () => Sim.ritual(t));
    wire("suurjaht", () => Sim.startSuurjaht());
    wire("kaugretk", () => Sim.startKaugretk());
    wire("skautraid", () => Sim.startScoutRaid());
    wire("retrieve", () => Events.startRetrieve());

    page.querySelectorAll("[data-relic]").forEach(sel => {
      sel.addEventListener("change", () => {
        if (sel.value) Sim.assignRelic(parseInt(sel.dataset.relic), parseInt(sel.value));
        this.refreshAll(true);
      });
    });
  },

  actHtml(name, act, ok, desc, why) {
    return '<div class="act"><div class="ahead"><span class="aname">' + name + '</span>' +
      '<button class="abtn" data-act="' + act + '"' + (ok ? "" : " disabled") + ">Do it</button></div>" +
      '<div class="adesc">' + desc + "</div>" +
      (why ? '<div class="areq">' + why + "</div>" : "") + "</div>";
  },

  // ---------- kaart ----------
  refreshMap() {
    const page = this.$("tab-kaart");
    let html = '<canvas id="region-canvas" width="340" height="230"></canvas>';

    html += '<div class="bdesc" style="font-size:11px;color:var(--dim);margin:4px 0">Tap a place. Moving window: ' +
      (Sim.moveWindowOpen() ? '<span style="color:var(--ok)">OPEN</span>' : '<span style="color:var(--danger)">shut (spring + early autumn)</span>') + "</div>";

    if (this.selectedSite !== null) {
      const s = G.sites[this.selectedSite];
      const dist = World.distDays(Sim.curSite(), s);
      html += '<div class="sitecard"><div class="sname">' + (s.special ? "✦ " : "") + s.name +
        (s.id === G.campId ? " (home)" : "") + "</div>" +
        (s.special ? '<span style="color:#5ad0c0">A place people mention in whispers. Live quietly and you stay hidden here — but growth and wealth show from everywhere.</span><br>' : "");
      if (s.known === 0) html += "Unknown ground. Only a scout can find out what is there.";
      else if (s.known === 1) html += "Hearsay: someone has mentioned this place. Nobody knows how rich it is.";
      else {
        html += "Richness: " + DATA.RICHNESS_NAME(s.estRich || s.rich) + (s.estRich !== s.rich ? " (the scout's guess)" : "") + ".";
        const feat = [];
        if (s.river) feat.push("river");
        if (s.cave) feat.push("cave (free shelter)");
        if (s.fishRun) feat.push("spawning run");
        feat.push(DATA.LEVEL_NAME(s.hidden || 0) + " cover");
        feat.push(DATA.LEVEL_NAME(s.defensible || 0) + " to defend");
        if (feat.length) html += "<br>" + feat.join(", ") + ".";
        if (s.b.onn || s.b.raam || s.b.pyha) html += "<br>Old buildings still stand.";
        if (s.graves) html += "<br>Graves: " + s.graves + " — ancestors lie here.";
      }
      if (s.occupied !== null && s.known >= 1) {
        const n = G.neighbors[s.occupied];
        html += "<br>Lived in by <b>" + n.name + "</b> (" + this.attText(n.att) + ")";
      }
      if (s.id !== G.campId) {
        html += "<br>Journey: about " + dist + " days.";
        const sc = Sim.canScout(s.id);
        const mv = Sim.canMove(s.id);
        html += "<br>";
        html += '<button id="btn-scout"' + (sc.ok ? "" : " disabled") + ' title="' + (sc.ok ? "A scout makes the trip in " + dist * 2 + " days" : sc.why) + '">Send a scout</button>';
        html += '<button id="btn-move"' + (mv.ok ? "" : " disabled") + ' title="' + (mv.ok ? "The whole band takes to the road" : mv.why) + '">Move here</button>';
        if (Sim.hasShaman() && s.known >= 1 && s.id !== G.campId) {
          html += '<button id="btn-omen" title="The shaman reads the signs for this journey">Ask for omens</button>';
        }
      }
      html += "</div>";
    }

    // naabrid ja kohustused
    html += '<div class="sechead">Neighbours and debts</div>';
    const known = G.neighbors.filter(n => n.known);
    if (!known.length) html += '<div class="bdesc" style="color:var(--dim);font-size:12px">You have met nobody yet. But somebody is always somewhere.</div>';
    for (const n of known) {
      html += '<div class="nbrow"><b>' + n.name + "</b> (" + G.sites[n.siteId].name + ") — " + this.attText(n.att) +
        (n.vengeance ? ' · <span style="color:var(--danger)">BLOOD AWAITS BLOOD</span>' : "") +
        (n.debts.length ? '<br><span class="dim">The book of debts: ' + n.debts.join("; ") + "</span>" : "") + "</div>";
    }

    page.innerHTML = html;

    const cv = this.$("region-canvas");
    this.drawRegion(cv);
    cv.addEventListener("click", e => {
      const rect = cv.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (340 / rect.width);
      const y = (e.clientY - rect.top) * (230 / rect.height);
      let best = null, bd = 1e9;
      for (const s of G.sites) {
        if (s.special && !s.revealed) continue;
        const d = Math.hypot(this.mx(s.x) - x, this.my(s.y) - y);
        if (d < 22 && d < bd) { best = s.id; bd = d; }
      }
      if (best !== null) { this.selectedSite = best; this.refreshMap(); }
    });

    const bs = this.$("btn-scout");
    if (bs) bs.addEventListener("click", () => { T.log("action", { a: "skaudiretk" }); Sim.startScout(this.selectedSite); this.refreshAll(true); });
    const bm = this.$("btn-move");
    if (bm) bm.addEventListener("click", () => this.confirmMove(this.selectedSite));
    const bo = this.$("btn-omen");
    if (bo) bo.addEventListener("click", () => this.askOmen(this.selectedSite));
  },

  attText(att) {
    return att >= 70 ? "friendly" : att >= 45 ? "wary" : att >= 25 ? "distrustful" : "hostile";
  },

  confirmMove(siteId) {
    const c = Sim.canMove(siteId);
    if (!c.ok) return;
    const s = G.sites[siteId];
    const dist = World.distDays(Sim.curSite(), s);
    const cost = Sim.leaveCost();
    this.queueModal({
      title: "Stay or roam?",
      body: "The whole band takes to the road for " + s.name + " (about " + dist + " days).\n\n" +
        "Left behind: every building (cost of leaving " + cost + ")" +
        (Sim.curSite().b.pyha ? ", the shrine (faith will fall!)" : "") +
        (Sim.curSite().graves ? ", " + Sim.curSite().graves + " graves" : "") +
        ".\nOnly so much can be carried (about " + Sim.pop() * 8 + " dried food).\n\n" +
        "The journey is dangerous, above all for the weak. But a new place teaches and feeds.\n\nThis choice cannot be taken back.",
      choices: [
        { label: "We go", fx: () => { T.log("action", { a: "kolimine" }); Sim.startJourney(siteId); } },
        { label: "We stay a while", fx: () => {} },
      ],
      def: 1,
    });
  },

  askOmen(siteId) {
    const s = G.sites[siteId];
    if (s.omenAsked) { this.logLine("The shaman has already read the signs for that place.", "bad"); return; }
    s.omenAsked = true;
    const truth = s.rich >= 60;
    let told = U.chance(0.65) ? truth : !truth;
    if (Sim.relicBearer("merevaik")) told = U.chance(0.8) ? truth : !truth;
    const good = ["The birds flew that way in two lines. That is a good sign.",
      "In the dream that valley was full of deer. The shaman woke smiling.",
      "The entrails were clean and dark. The land there is kind."];
    const bad = ["The raven circled over that place and came back. The shaman was silent a long time.",
      "In the dream there was only wind there. Not one animal, not one sound.",
      "The entrails were spotted. The shaman buried them quickly."];
    this.queueModal({
      title: "Omens: " + s.name,
      body: (told ? U.pick(good) : U.pick(bad)) + "\n\nSigns are signs. Nobody knows whether they tell the truth — but stories get told about those who ignore them.",
      choices: [{ label: "We will remember it", fx: () => {} }],
      def: 0,
    });
  },

  // piirkonnakoordinaadid (700x420) -> kaardilõuend (340x230), servavaruga
  mx(x) { return 18 + x / 700 * 304; },
  my(y) { return 16 + y / 420 * 198; },

  drawRegion(cv) {
    const ctx = cv.getContext("2d");
    const W = 340, H = 230;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#241c11";
    ctx.fillRect(0, 0, W, H);
    const rng = mulberry32(G.seed % 100000);
    ctx.fillStyle = "#2c2215";
    for (let i = 0; i < 320; i++) ctx.fillRect(Math.floor(rng() * (W / 3)) * 3, Math.floor(rng() * (H / 3)) * 3, 3, 3);

    // rajad tuntud kohtade vahel
    ctx.strokeStyle = "#4a3823";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    const cur = Sim.curSite();
    for (const s of G.sites) {
      if (s.id === G.campId || s.known === 0) continue;
      ctx.beginPath(); ctx.moveTo(this.mx(cur.x), this.my(cur.y)); ctx.lineTo(this.mx(s.x), this.my(s.y)); ctx.stroke();
    }
    ctx.setLineDash([]);

    for (const s of G.sites) {
      if (s.special && !s.revealed) continue; // erikoht ei eksisteeri enne avastamist
      const known = s.known;
      const x = this.mx(s.x), y = this.my(s.y);
      if (s.id === this.selectedSite) {
        ctx.strokeStyle = "#d9a24a"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.stroke();
      }
      if (known === 0) {
        ctx.fillStyle = "#6a5c44";
        ctx.font = "bold 13px 'Courier New'";
        ctx.textAlign = "center";
        ctx.fillText("?", x, y + 5);
        continue;
      }
      const col = s.id === G.campId ? "#d9a24a" : s.occupied !== null ? "#c9503c" :
        s.special ? "#5ad0c0" : known === 2 ? "#7fa650" : "#9a8a6c";
      ctx.fillStyle = col;
      ctx.fillRect(x - 5, y - 5, 10, 10);
      if (s.river && known === 2) { ctx.fillStyle = "#4a7a9c"; ctx.fillRect(x - 5, y + 6, 10, 2); }
      ctx.fillStyle = "#e8dcc4";
      ctx.font = "9px 'Courier New'";
      ctx.textAlign = "center";
      ctx.fillText(s.name, x, y - 9);
      if (s.id === G.campId) {
        ctx.fillStyle = "#d9a24a";
        ctx.fillText("kodu", x, y + 17);
      } else if (s.occupied !== null && known >= 1) {
        ctx.fillStyle = "#c9503c";
        ctx.fillText(G.neighbors[s.occupied].name, x, y + 17);
      }
    }
    ctx.textAlign = "left";
  },

  // ---------- lahing ----------
  openCombat() {
    if (!G.combat) return;
    T.log("combat", { type: G.combat.type, n: G.combat.initialEnemies });
    G.paused = true;
    this.combatSel = null;
    this.combatTarget = null;
    this.$("combat-back").classList.remove("hidden");
    const t = { hundid: "Wolves at the camp", haarang: "Night raid", tagasitoomine: "Raid for the relic" };
    this.$("combat-title").textContent = t[G.combat.type] || "Encounter";
    this.drawCombat();
  },

  closeCombat() {
    this.$("combat-back").classList.add("hidden");
    // lahingu ajal kogunenud modaalid (nt veretasu) tulevad nüüd ette
    if (!this.modalOpen && this.modalQueue.length) this.showNextModal();
    this.refreshAll(true);
  },

  combatClick(e) {
    const c = G.combat;
    if (!c || c.over) return;
    const cv = this.$("combat-canvas");
    const rect = cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (780 / rect.width) / 60);
    const y = Math.floor((e.clientY - rect.top) * (480 / rect.height) / 60);

    const clicked = c.units.find(u => u.hp > 0 && !u.fled && u.x === x && u.y === y);
    const sel = this.combatSel !== null ? c.units.find(u => u.id === this.combatSel) : null;

    if (clicked && clicked.side === "meie") {
      this.combatSel = clicked.id;
      this.combatTarget = null;
    } else if (sel && clicked && clicked.side === "nemad") {
      if (Combat.dist(sel, clicked) <= Combat.effRange(sel) && !sel.acted) {
        // mobiilis kahes sammus: esimene puude märgib sihtmärgi, kinnitus lööb
        if (typeof Mobile !== "undefined" && Mobile.on) {
          this.combatTarget = clicked.id;
        } else {
          Combat.attack(sel, clicked);
        }
      }
    } else if (sel && !clicked) {
      Combat.moveTo(sel, x, y);
      this.combatTarget = null;
    }
    this.drawCombat();
  },

  drawCombat() {
    const c = G.combat;
    if (!c) return;
    const cv = this.$("combat-canvas");
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const T = 60;

    // taust
    ctx.fillStyle = G.season === 3 ? "#aeb4c2" : "#3c4c2c";
    ctx.fillRect(0, 0, 780, 480);
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= Combat.W; x++) { ctx.beginPath(); ctx.moveTo(x * T, 0); ctx.lineTo(x * T, 480); ctx.stroke(); }
    for (let y = 0; y <= Combat.H; y++) { ctx.beginPath(); ctx.moveTo(0, y * T); ctx.lineTo(780, y * T); ctx.stroke(); }

    // künkad: kõrgem maa, laskurile +ulatus ja +tabamine
    for (const h of (c.hills || [])) {
      ctx.fillStyle = G.season === 3 ? "#c8ccd8" : "#5e6e3c";
      ctx.fillRect(h.x * T + 2, h.y * T + 2, T - 4, T - 4);
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.strokeRect(h.x * T + 6, h.y * T + 6, T - 12, T - 12);
    }

    for (const o of c.obstacles) {
      const spr = Sprites.rock();
      ctx.drawImage(spr, o.x * T + 8, o.y * T + 14, spr.width * 6, spr.height * 6);
    }

    const sel = this.combatSel !== null ? c.units.find(u => u.id === this.combatSel) : null;
    if (sel && sel.hp > 0 && !sel.moved) {
      ctx.fillStyle = "rgba(217,162,74,0.22)";
      for (const t of Combat.reachable(sel)) ctx.fillRect(t.x * T + 2, t.y * T + 2, T - 4, T - 4);
    }

    for (const u of c.units) {
      if (u.hp <= 0 || u.fled) continue;
      let spr;
      if (u.kind === "hunt") spr = Sprites.wolf(0);
      else if (u.kind === "karu") spr = Sprites.bear();
      else if (u.kind === "metssiga") spr = Sprites.boar();
      else if (u.kind.startsWith("roovel")) spr = Sprites.raider(0);
      else spr = Sprites.villager(JOB_COLORS[u.kind] || "888888", "c9915e", 0);
      const px = u.x * T + (T - spr.width * 4) / 2;
      const py = u.y * T + (T - spr.height * 4) / 2;
      if (sel && u.id === sel.id) {
        ctx.strokeStyle = "#d9a24a"; ctx.lineWidth = 2;
        ctx.strokeRect(u.x * T + 2, u.y * T + 2, T - 4, T - 4);
      }
      if (sel && u.side === "nemad" && !sel.acted && Combat.dist(sel, u) <= Combat.effRange(sel)) {
        ctx.strokeStyle = "#c9503c"; ctx.lineWidth = 2;
        ctx.strokeRect(u.x * T + 2, u.y * T + 2, T - 4, T - 4);
      }
      ctx.drawImage(spr, px, py, spr.width * 4, spr.height * 4);
      // HP
      ctx.fillStyle = "#000";
      ctx.fillRect(u.x * T + 6, u.y * T + T - 8, T - 12, 5);
      ctx.fillStyle = u.side === "meie" ? "#7fa650" : "#c9503c";
      ctx.fillRect(u.x * T + 6, u.y * T + T - 8, Math.max(1, (T - 12) * u.hp / u.maxhp), 5);
      // tegutsemismärk
      if (u.side === "meie" && u.acted) {
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(u.x * T + 2, u.y * T + 2, T - 4, T - 4);
      }
      ctx.fillStyle = "#e8dcc4";
      ctx.font = "9px 'Courier New'";
      ctx.textAlign = "center";
      ctx.fillText(u.name.slice(0, 8), u.x * T + T / 2, u.y * T + 10);
      ctx.textAlign = "left";
    }

    // mobiilis valitud sihtmärk: paks punane raam
    const tgt = this.combatTarget !== null && this.combatTarget !== undefined
      ? c.units.find(u => u.id === this.combatTarget && u.hp > 0 && !u.fled) : null;
    if (tgt) {
      ctx.strokeStyle = "#c9503c"; ctx.lineWidth = 4;
      ctx.strokeRect(tgt.x * T + 3, tgt.y * T + 3, T - 6, T - 6);
    }
    const conf = this.$("cb-confirm");
    if (conf) {
      const show = !!(tgt && sel && !c.over);
      conf.classList.toggle("show", show);
      if (show) conf.textContent = "⚔ Attack: " + tgt.name;
    }

    // info
    const info = this.$("combat-info");
    if (c.over) {
      info.textContent = "The fight is over.";
    } else if (sel) {
      info.textContent = sel.name + " (" + sel.wpn + ", ulatus " + Combat.effRange(sel) +
        (Combat.onHill(sel) ? " ON THE HILL" : "") + ", " + sel.hp + "/" + sel.maxhp + " HP)" +
        (sel.moved ? " · has moved" : " · can move") + (sel.acted ? " · has attacked" : " · can attack") +
        " — round " + c.round;
    } else {
      info.textContent = "Pick one of your fighters (tap them). Round " + c.round + ". Keep the ranged ones back, the warrior in front.";
    }
    const log = this.$("combat-log");
    log.innerHTML = c.log.slice(-6).map(l => "<div>" + l + "</div>").join("");
    log.scrollTop = log.scrollHeight;
  },
};
