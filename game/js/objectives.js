// objectives.js — eesmärkide rada: juhatab mängija mängu sisse ja hoo üles.
// DOM-vaba: seis elab G.obj sees, UI joonistab ui.js. Simuleeritud disain:
// eesmärke järgiv mängija elab 1. aasta üle 59/60 ja jõuab 10 inimeseni ~3. aastaks.
"use strict";

const Objectives = {
  DEFS: [
    { id: "kogu20", title: "Kogu 20 TÜ toiduvaru",
      hint: "Korilased korjavad, kalur püüab, kütt jahib. Vaata Rahva-vahekaarti.",
      reward: 10,
      progress: () => ({ cur: Math.floor(Sim.foodTotal()), max: 20 }),
      check: () => Sim.foodTotal() >= 20 },
    { id: "raam", title: "Ehita kuivatusraam",
      hint: "Vaja 8 materjali (korilase režiim \"materjal\") ja meistrit, kes ehitab. Küla-vahekaart.",
      reward: 15,
      check: () => Sim.curSite().b.raam >= 1 },
    { id: "kuivata", title: "Kuivata talveks 130 TÜ",
      hint: "Määra korilane režiimile \"kuivatab\". Värske rikneb — talve elab üle ainult kuivatatu.",
      reward: 25,
      progress: () => ({ cur: Math.floor(G.dried), max: 130 }),
      check: () => G.dried >= 130 },
    { id: "riided", title: "Riieta kõik talveks",
      hint: "Kütt toob nahku (2 tk komplekti kohta), meister õmbleb. Küla-vahekaart.",
      reward: 15,
      progress: () => ({ cur: Sim.alive().filter(p => p.clothed).length, max: Sim.pop() }),
      check: () => Sim.alive().every(p => p.clothed) },
    { id: "onn", title: "Peavari kõigile",
      hint: "Ehita onn (20 materjali). Koobas loeb ka. Väljas magaja külmub.",
      reward: 15,
      progress: () => ({ cur: Math.min(Sim.shelterCap(), Sim.pop()), max: Sim.pop() }),
      check: () => Sim.shelterCap() >= Sim.pop() },
    { id: "talv1", title: "Ela esimene talv üle",
      hint: "Talvel: juured-režiim, vajadusel poolratsioonid. Nüüd makstakse sügiseste otsuste eest.",
      reward: 40, big: true,
      check: () => G.year >= 2 },
    { id: "kalajooks", title: "Kevadine kalajooks: 2 inimest kalale",
      hint: "Kevad on näljakuu, aga jões keeb kudemine. Kalur on kevadel kulla hinnaga.",
      reward: 20,
      progress: () => ({ cur: Sim.adults().filter(p => p.job === "kalur").length, max: 2 }),
      check: () => G.season === 0 && Sim.adults().filter(p => p.job === "kalur").length >= 2 },
    { id: "pop8", title: "Kasvata rühm 8 inimeseni",
      hint: "Hoia toidupuhvrit — rändajad liituvad rühmaga, kellel on, mida pakkuda.",
      reward: 25,
      progress: () => ({ cur: Sim.pop(), max: 8 }),
      check: () => Sim.pop() >= 8 },
    { id: "luure", title: "Saada skaut naaberpaika luurele",
      hint: "Määra kellelegi skaudi amet ja vali Kaardilt sihtkoht. Ükski koht ei kanna igavesti.",
      reward: 15,
      check: () => G.sites.some(s => s.id !== 0 && s.known === 2 && !s.special) },
    { id: "koli", title: "Ümbrus tühjeneb — vali uus kodu ja KOLI",
      hint: "Ringiribad üleval paremal näitavad ammendumist. Kolida saab kevadel ja sügise alguses. Kõik su esivanemad liikusid.",
      reward: 40, big: true,
      check: () => G.stats.moves >= 1 },
    { id: "talv2", title: "Ehita uues kodus varud üles ja ela talv üle",
      hint: "Sama tsükkel, uus koht: raam, varud, riided. Uus koht õpetab kiiresti.",
      reward: 40, big: true,
      check: () => G.obj && G.obj.moveYear !== undefined && G.year > G.obj.moveYear },
  ],

  init() {
    G.obj = { done: [], idx: 0, moveYear: undefined, hidden: false };
  },

  // vana salvestuse migratsioon: juba täidetud sammud loetakse vaikselt tehtuks
  migrate() {
    if (G.obj) return;
    this.init();
    let guard = 0;
    while (G.obj.idx < this.DEFS.length && guard++ < 20) {
      const def = this.DEFS[G.obj.idx];
      let ok = false;
      try { ok = def.check(); } catch (e) { ok = false; }
      if (!ok) break;
      if (def.id === "koli") G.obj.moveYear = G.year;
      G.obj.done.push(def.id);
      G.obj.idx++;
    }
  },

  active() {
    if (!G.obj || G.obj.idx >= this.DEFS.length) return null;
    return this.DEFS[G.obj.idx];
  },

  // kutsutakse iga päeva lõpus (Sim.simDay)
  tick() {
    if (!G.obj) return;
    let guard = 0;
    while (guard++ < 5) {
      const def = this.active();
      if (!def) return;
      let ok = false;
      try { ok = def.check(); } catch (e) { ok = false; }
      if (!ok) return;
      // täidetud!
      if (def.id === "koli") G.obj.moveYear = G.year;
      G.obj.done.push(def.id);
      G.obj.idx++;
      G.score += def.reward;
      G.obj.celebrate = { title: def.title, reward: def.reward, big: !!def.big, day: G.day };
      Sim.log("EESMÄRK TÄIDETUD: " + def.title + " (+" + def.reward + " 🏆)", "good");
      if (def.big) {
        const next = this.active();
        Sim.emit({
          title: "✓ " + def.title,
          body: (def.id === "talv1"
            ? "Esimene talv on läbi. Kõik teie esivanemad on selle proovi läbinud — nüüd olete ka teie.\n\nKevad on näljakuu, aga ka võimaluste aeg."
            : def.id === "koli"
            ? "Esimene rändamine. Vana koht jääb puhkama ja mäletama; teie lähete edasi, nagu käisid teie vanemad.\n\nSee ongi selle maailma elu: jääda või liikuda."
            : "Uus kodu kannab teid. Tsükkel on selge: koht toidab, koht väsib, teie liigute.\n\nEdasine on sinu lugu.") +
            "\n\n+" + def.reward + " skooripunkti." +
            (next ? "\n\nJärgmine eesmärk: " + next.title : "\n\nEesmärkide rada on läbitud!"),
          choices: [{ label: "Edasi", fx: () => {} }],
          def: 0,
        });
      }
    }
  },
};
