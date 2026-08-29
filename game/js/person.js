// person.js — inimese mudel. DOM-vaba.
"use strict";

const Person = {
  usedNames: new Set(),

  create(opts = {}) {
    const sex = opts.sex || (U.chance(0.5) ? "M" : "N");
    const p = {
      id: opts.id,
      name: opts.name || freshName(sex, this.usedNames),
      sex,
      age: opts.age !== undefined ? opts.age : U.ri(17, 40),
      child: !!opts.child,
      childLeft: opts.child ? (opts.childLeft !== undefined ? opts.childLeft : DATA.CHILD_SEASONS) : 0,
      job: opts.job || "korilane",
      mode: opts.mode || "marjad",
      xp: { kor: 0, kala: 0, jaht: 0, voit: 0, meister: 0, skaut: 0, vaim: 0, ...(opts.xp || {}) },
      traits: opts.traits || this.rollTraits(),
      health: 100,
      hungry: 0,          // järjestikused näljapäevad
      sick: null,         // {name, days}
      wound: 0,           // päevi töövõimetu
      clothed: false,
      clothesAge: 0,      // hooaegades
      away: null,         // {type:'ring'|'skaut'|'retk'|'suurjaht', days, total, data}
      farWork: false,     // "saada kaugemale": töötab ring+1 (rohkem XP, rohkem riski)
      relic: null,        // reliikvia võti
      pos: { x: 0, y: 0, tx: 0, ty: 0, wander: 0 },
      alive: true,
    };
    return p;
  },

  // varjatud omadused: anne ühes valdkonnas, nõrkus teises, üldine tempo
  rollTraits() {
    const doms = ["kor", "kala", "jaht", "voit", "meister", "skaut", "vaim"];
    const gift = U.pick(doms);
    const weak = U.pick(doms.filter(d => d !== gift));
    return {
      gift, weak,
      tempo: Math.round(U.rf(DATA.TRAIT_TEMPO[0], DATA.TRAIT_TEMPO[1]) * 100) / 100,
      giftKnown: false, weakKnown: false,
    };
  },

  traitMod(p, dom) {
    const t = p.traits;
    if (!t) return 1;
    let m = t.tempo;
    if (dom === t.gift) m *= DATA.TRAIT_GIFT;
    if (dom === t.weak) m *= DATA.TRAIT_WEAK;
    return m;
  },

  skill(p, dom) {
    return Math.min(DATA.MAX_LEVEL, Math.floor((p.xp[dom] || 0) / DATA.XP_PER_LEVEL));
  },

  jobSkill(p) {
    return this.skill(p, DATA.JOBS[p.job].dom);
  },

  addXP(p, dom, amt) {
    p.xp[dom] = Math.min(DATA.XP_PER_LEVEL * DATA.MAX_LEVEL, (p.xp[dom] || 0) + amt);
  },

  // kas saab täna tööd teha
  canWork(p) {
    return p.alive && !p.child && !p.sick && p.wound <= 0 && p.health > 15;
  },

  // kas on laagris (kaitseks) — ring 2/3 töölised ja missioonil olijad ei ole
  atCamp(p) {
    return p.alive && !p.away;
  },

  statusText(p) {
    const t = [];
    if (p.child) t.push("laps");
    if (p.sick) t.push("haige (" + p.sick.name + ", " + p.sick.days + " p)");
    if (p.wound > 0) t.push("haavatud (" + p.wound + " p)");
    if (p.hungry >= 2) t.push("näljas");
    if (p.away) {
      const m = { ring: "eemal (ring " + ((p.away.ring || 1) + 1) + ")", skaut: "luurel", skautraid: "külasid otsimas", raid: "sõjaretkel", retk: "kaugretkel", suurjaht: "suurjahil" };
      t.push(m[p.away.type] || "eemal");
    }
    if (!p.clothed) t.push("riieteta");
    return t;
  },

  // algusrühm: 4 täiskasvanut + 1 laps. Väike rühm on kergesti toidetav ja õpib
  // kiiresti (vt DATA.SMALL_BAND_XP) — kasvades muutub elu raskemaks, mitte kergemaks.
  startBand() {
    this.usedNames = new Set();
    const band = [];
    const jobs = ["korilane", "korilane", "kalur", "kytt"];
    const sexes = ["N", "N", "M", "M"];
    for (let i = 0; i < 4; i++) {
      band.push(this.create({ id: i, job: jobs[i], sex: sexes[i], age: U.ri(18, 38) }));
    }
    band[0].xp.kor = DATA.XP_PER_LEVEL; // üks kogenud korilane
    band[0].age = 34;
    band.push(this.create({ id: 4, child: true, childLeft: 6, age: 8, sex: "N" }));
    return band;
  },
};
