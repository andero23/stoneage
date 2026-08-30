// objectives.js — eesmärkide rada: juhatab mängija mängu sisse ja hoo üles.
// DOM-vaba: seis elab G.obj sees, UI joonistab ui.js. Simuleeritud disain:
// eesmärke järgiv mängija elab 1. aasta üle 59/60 ja jõuab 10 inimeseni ~3. aastaks.
"use strict";

const Objectives = {
  DEFS: [
    { id: "kogu20", title: "Gather 20 food",
      hint: "Foragers pick, fishers catch, hunters hunt. Look at the People tab.",
      reward: 10,
      progress: () => ({ cur: Math.floor(Sim.foodTotal()), max: 20 }),
      check: () => Sim.foodTotal() >= 20 },
    { id: "raam", title: "Build a drying rack",
      hint: "Needs 8 timber (set a forager to \"timber\") and a crafter to build it. Camp tab.",
      reward: 15,
      check: () => Sim.curSite().b.raam >= 1 },
    { id: "kuivata", title: "Dry 130 food for winter",
      hint: "Set a forager to \"drying food\". Fresh food rots — only dried food survives winter.",
      reward: 25,
      progress: () => ({ cur: Math.floor(G.dried), max: 130 }),
      check: () => G.dried >= 130 },
    { id: "riided", title: "Clothe everyone for winter",
      hint: "Hunters bring hides (2 per set), the crafter sews them. Camp tab.",
      reward: 15,
      progress: () => ({ cur: Sim.alive().filter(p => p.clothed).length, max: Sim.pop() }),
      check: () => Sim.alive().every(p => p.clothed) },
    { id: "onn", title: "Shelter for everyone",
      hint: "Build a hut (20 timber). A cave counts too. Whoever sleeps outside freezes.",
      reward: 15,
      progress: () => ({ cur: Math.min(Sim.shelterCap(), Sim.pop()), max: Sim.pop() }),
      check: () => Sim.shelterCap() >= Sim.pop() },
    { id: "talv1", title: "Survive your first winter",
      hint: "In winter: roots mode, half rations if you must. Now autumn's choices come due.",
      reward: 40, big: true,
      check: () => G.year >= 2 },
    { id: "kalajooks", title: "Spring run: put 2 on fishing",
      hint: "Spring is the hungry season, but the river boils with spawning fish. A fisher is worth gold now.",
      reward: 20,
      progress: () => ({ cur: Sim.adults().filter(p => p.job === "kalur").length, max: 2 }),
      check: () => G.season === 0 && Sim.adults().filter(p => p.job === "kalur").length >= 2 },
    { id: "pop8", title: "Grow the band to 8",
      hint: "Keep a food surplus — wanderers join a band that has something to offer.",
      reward: 25,
      progress: () => ({ cur: Sim.pop(), max: 8 }),
      check: () => Sim.pop() >= 8 },
    { id: "luure", title: "Send a scout to a neighbouring site",
      hint: "Give someone the scout trade and pick a target on the Map. No place feeds you forever.",
      reward: 15,
      check: () => G.sites.some(s => s.id !== 0 && s.known === 2 && !s.special) },
    { id: "koli", title: "The land is spent — choose a new home and MOVE",
      hint: "The ring bars top right show how spent the land is. You can move in spring and early autumn. Every ancestor of yours moved.",
      reward: 40, big: true,
      check: () => G.stats.moves >= 1 },
    { id: "talv2", title: "Stock the new home and survive the winter",
      hint: "Same cycle, new place: rack, stores, clothes. A new place teaches fast.",
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
      Sim.log("GOAL COMPLETE: " + def.title + " (+" + def.reward + " 🏆)", "good");
      if (def.big) {
        const next = this.active();
        Sim.emit({
          title: "✓ " + def.title,
          body: (def.id === "talv1"
            ? "The first winter is behind you. Every one of your ancestors passed this test — now you have too.\n\nSpring is the hungry season, but it is also the season of chances."
            : def.id === "koli"
            ? "Your first move. The old place is left to rest and remember; you walk on, as your parents walked.\n\nThat is the life of this world: stay or roam."
            : "The new home carries you. The cycle is plain: a place feeds you, a place tires, you move on.\n\nWhat comes next is your story.") +
            "\n\n+" + def.reward + " score." +
            (next ? "\n\nNext goal: " + next.title : "\n\nYou have walked the whole path of goals!"),
          choices: [{ label: "Onward", fx: () => {} }],
          def: 0,
        });
      }
    }
  },
};
