// telemetry.js — anonüümne mängutelemeetria testiringi jaoks.
// Saadab sündmused sama serveri /api/t otspunkti (JSONL). Kui serverit pole
// (nt lokaalne arendus python-serveriga), vaikib täielikult.
"use strict";

const T = {
  q: [],
  pid: null,   // püsiv anonüümne mängija-ID (localStorage)
  gid: null,   // ühe mängu ID
  enabled: true,
  seen: { year: 0, season: -1, deaths: 0 },

  init() {
    try {
      this.pid = localStorage.getItem("kiviaeg-pid");
      if (!this.pid) {
        this.pid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
        localStorage.setItem("kiviaeg-pid", this.pid);
      }
    } catch (e) { this.pid = "anon"; }
    setInterval(() => this.flush(), 20000);
    window.addEventListener("beforeunload", () => {
      // lahkumishetk: KUS mängus inimene käega lõi
      if (G && !G.over) {
        this.log("quit", this.snapshot());
      }
      this.flush(true);
    });
  },

  newGame(seed, resumed) {
    this.gid = Math.random().toString(36).slice(2, 10);
    this.seen = { year: 0, season: -1, deaths: 0 };
    this.log(resumed ? "resume" : "game_start", { seed, w: window.innerWidth, h: window.innerHeight });
  },

  snapshot() {
    if (!G) return {};
    return {
      year: G.year, season: G.season, sday: G.sday, pop: Sim.pop(),
      food: Math.round(Sim.foodTotal()), score: Math.round(G.score),
      vis: Sim.visibility(), faith: Math.round(G.faith), sec: Math.round(G.sec),
      camp: Sim.curSite().name, moves: G.stats.moves, battles: G.stats.battles,
      raids: G.stats.raidsMade || 0, relics: G.relics.length, gear: G.gear.length,
      racks: Sim.curSite().b.raam, clothed: Sim.alive().filter(p => p.clothed).length,
    };
  },

  // kutsutakse kord sekundis UI-st: märka hooajavahetusi ja surmasid
  tick() {
    if (!G || !this.gid) return;
    if (G.year !== this.seen.year || G.season !== this.seen.season) {
      this.seen.year = G.year;
      this.seen.season = G.season;
      this.log("season", this.snapshot());
    }
    while (this.seen.deaths < G.stats.deaths.length) {
      const d = G.stats.deaths[this.seen.deaths++];
      this.log("death", { name: d.name, cause: d.cause, year: d.year });
    }
  },

  log(type, data) {
    if (!this.enabled) return;
    this.q.push({ t: type, ts: Date.now(), pid: this.pid, gid: this.gid, d: data || {} });
    if (this.q.length >= 25) this.flush();
  },

  flush(useBeacon) {
    if (!this.q.length || !this.enabled) return;
    const body = JSON.stringify(this.q);
    this.q = [];
    try {
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon("/api/t", body);
      } else {
        fetch("/api/t", { method: "POST", body, keepalive: true })
          .catch(() => { this.enabled = this.failCount() < 3; });
      }
    } catch (e) { /* vaikime */ }
  },

  _fails: 0,
  failCount() { return ++this._fails; },

  // tagasisidevorm: küsitakse surma järel ja 💬 nupust
  askFeedback(context) {
    if (document.getElementById("fb-box")) return;
    const div = document.createElement("div");
    div.id = "fb-box";
    div.innerHTML = '<div class="fb-inner"><b>Tagasiside</b>' +
      '<p>Mis jäi segaseks? Mis meeldis, mis häiris? Paar lauset aitab palju.</p>' +
      '<textarea id="fb-text" rows="4" maxlength="2000"></textarea>' +
      '<div class="fb-btns"><button id="fb-send">Saada</button><button id="fb-skip">Jäta vahele</button></div></div>';
    document.body.appendChild(div);
    document.getElementById("fb-send").addEventListener("click", () => {
      const txt = document.getElementById("fb-text").value.trim();
      if (txt) this.log("feedback", { text: txt, ctx: context, snap: this.snapshot() });
      this.flush();
      div.remove();
    });
    document.getElementById("fb-skip").addEventListener("click", () => div.remove());
  },
};
