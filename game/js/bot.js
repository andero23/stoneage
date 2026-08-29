// bot.js — automaatmängija. DOM-vaba: kasutavad nii test/headless.js (Node)
// kui ka adminpaneeli balansilabor (brauser). Tahtlikult keskpärane mängija:
// jälgib toidubilanssi ja kolib, aga ei kasuta reliikviaid ega peenemaid nippe.
"use strict";

const Bot = {
  // hinnang: kui palju toitu praegused töölised päevas toovad
  estimateFood(g) {
    let est = 0;
    for (const p of Sim.adults()) {
      if (!Person.canWork(p) || (p.away && p.away.type !== "ring")) continue;
      const lvl = Person.jobSkill(p);
      if (p.job === "korilane" && ["marjad", "seened", "juured"].includes(p.mode)) {
        const smod = p.mode === "juured" ? DATA.SEASON_MOD.juured[g.season] : DATA.SEASON_MOD.korilus[g.season];
        est += DATA.YIELD[p.mode][lvl] * smod;
      } else if (p.job === "kalur") {
        est += DATA.YIELD.kala[lvl] * DATA.SEASON_MOD.kala[g.season] * (Sim.curSite().river ? 1 : 0.35);
      } else if (p.job === "kytt") {
        est += DATA.YIELD.jaht[lvl] * DATA.SEASON_MOD.jaht[g.season];
      }
    }
    return est;
  },

  wantRacks(g) {
    return Math.min(4, Math.ceil((Sim.dailyNeed() * 30 * 1.2) / DATA.RACK_CAP));
  },

  // Sündmuse valik strateegia järgi: agressiivne profiil võtab raidipakkumise vastu,
  // muud vaikevaliku. Kasutavad nii headless-testid kui balansilabor.
  eventChoice(ev, strategy) {
    if (strategy && strategy.includes("raidiv") && ev.title === "Skaut leidis küla") {
      const atk = ev.choices && ev.choices.find(c => c.label.startsWith("Saadame"));
      if (atk) return atk;
    }
    return ev.choices && ev.choices[ev.def || 0];
  },

  // üks otsustuspäev; strategy: "randav" | "paikne" | "raidiv-randav" | "raidiv-paikne"
  play(g, strategy) {
    const raw = strategy || "randav";
    const AGGRESSIVE = raw.includes("raidiv");
    const STRATEGY = raw.includes("paikne") ? "paikne" : "randav";
    const adults = Sim.adults();
    const pop = Sim.pop();
    const site = Sim.curSite();
    const need = Sim.dailyNeed();

    const foodJob = p => (p.job === "korilane" && p.mode !== "materjal" && p.mode !== "kuivatab") || p.job === "kalur" || p.job === "kytt";
    const pullToFood = () => {
      const c = adults.find(p => Person.canWork(p) && !p.away && !foodJob(p) && p.job !== "samaan" && p.job !== "meister") ||
                adults.find(p => Person.canWork(p) && !p.away && p.job === "meister");
      if (c) { c.job = "korilane"; c.mode = "marjad"; }
    };

    // hooajarežiim korilastele: talvel ja varakevadel juured, muidu marjad
    const defMode = (g.season === 3 || (g.season === 0 && g.sday <= 15)) ? "juured" : "marjad";
    for (const p of adults.filter(p => p.job === "korilane" && ["marjad", "juured"].includes(p.mode))) {
      p.mode = defMode;
    }

    // ratsioonid: talvel ja varakevadel pool, kui varusid napib
    if (g.season === 3 || (g.season === 0 && g.sday <= 15)) {
      const daysLeft = g.season === 3 ? (30 - g.sday + 15) : (15 - g.sday);
      g.ration = Sim.foodTotal() < Sim.pop() * daysLeft * 0.7 ? 0.5 : 1;
    } else g.ration = 1;

    // SÜGIS = varumine
    if (g.season === 2) {
      for (const p of adults.filter(p => p.job === "korilane" && ["materjal", "seened"].includes(p.mode))) p.mode = "marjad";
      if (g.buildQueue.length === 0 && g.clothQueue === 0) {
        const m = adults.find(p => p.job === "meister" && Person.canWork(p));
        if (m && site.b.raam >= 1) { m.job = "korilane"; m.mode = "marjad"; }
      }
    }
    // jõeta kohas on kalur kasutu
    if (!site.river) {
      for (const p of adults.filter(p => p.job === "kalur")) { p.job = "korilane"; p.mode = "marjad"; }
    } else if (g.season === 0) {
      const fishers = adults.filter(p => p.job === "kalur").length;
      if (fishers < 2 && pop >= 6) {
        const c = adults.find(p => p.job === "korilane" && Person.canWork(p) && !p.away);
        if (c) c.job = "kalur";
      }
    }

    // näljahäda: kõik toidule
    if (g.hungerRecent > 2 || this.estimateFood(g) < need) {
      pullToFood();
      for (const p of adults.filter(p => p.job === "korilane" && p.mode === "materjal")) p.mode = defMode;
    }

    const surplus = this.estimateFood(g) - need;

    if (surplus > 1.0 && !adults.some(p => p.job === "meister")) {
      const c = adults.find(p => p.job === "korilane" && p.mode === "marjad" && Person.canWork(p) && !p.away);
      if (c) c.job = "meister";
    }
    let wantWar = STRATEGY === "paikne" && pop >= 14
      ? Math.max(3, Math.floor(pop * pop / 100))
      : Math.floor(pop * pop / 100);
    if (AGGRESSIVE && pop >= 7) wantWar = Math.max(wantWar, 2);
    if (AGGRESSIVE && STRATEGY === "paikne" && pop >= 10) wantWar = Math.max(wantWar, 4); // keegi jääb koju
    const wars = adults.filter(p => p.job === "sodalane").length;
    if (wars < wantWar && surplus > 1.5) {
      const c = adults.find(p => p.job === "korilane" && p.mode === "marjad" && Person.canWork(p) && !p.away);
      if (c) c.job = "sodalane";
    }
    const depletion = (site.points[0] + site.points[1]) / (site.max[0] + site.max[1]);
    const needScout = AGGRESSIVE ||
      g.sites.filter(s => s.known === 2 && s.id !== g.campId && s.occupied === null).length < 2;
    if (!adults.some(p => p.job === "skaut") && needScout && (pop >= 7 || depletion < 0.7) && (surplus > 0.5 || depletion < 0.5)) {
      const c = adults.find(p => p.job === "korilane" && p.mode === "marjad" && Person.canWork(p) && !p.away);
      if (c) c.job = "skaut";
    }
    const wantRacks = this.wantRacks(g);
    if (g.buildQueue.length === 0) {
      if (site.b.raam < wantRacks && g.mat >= 8 && g.season >= 1 && g.season <= 2) Sim.queueBuild("raam");
      else if (Sim.shelterCap() < pop && g.mat >= 20 && (g.season === 2 || g.season === 1)) Sim.queueBuild("onn");
      else if (STRATEGY === "paikne" && !site.b.pyha && g.mat >= 10 && g.season !== 3) Sim.queueBuild("pyha");
      else if (!site.b.tookoht && g.mat >= 12 && g.year >= 2 && g.season === 1) Sim.queueBuild("tookoht");
      else if (!site.b.pyha && g.mat >= 10 && g.year >= 2 && g.season === 1) Sim.queueBuild("pyha");
      else if (STRATEGY === "paikne" && !site.b.tara && g.mat >= 25 && pop >= 14 && g.season === 1) Sim.queueBuild("tara");
    }
    if (g.hides >= DATA.CLOTHES_HIDES && Sim.alive().some(p => !p.clothed) && g.clothQueue < 2) Sim.queueClothes();
    // sepista varustust, kui leiud olemas ja riided tehtud
    if (g.gearQueue.length === 0 && !Sim.alive().some(p => !p.clothed)) {
      if (g.finds.flint >= DATA.GEAR.WEAPON.flint && g.mat >= DATA.GEAR.WEAPON.mat + 10) Sim.queueGear("relv");
      else if (g.finds.bone >= DATA.GEAR.ARMOR.bone && g.hides >= DATA.GEAR.ARMOR.hides + DATA.CLOTHES_HIDES) Sim.queueGear("turvis");
    }
    if (g.season === 2 && Sim.alive().filter(p => !p.clothed).length > 1 && pop >= 8 && surplus > 2.5) {
      const hunters = adults.filter(p => p.job === "kytt").length;
      if (hunters < 2) {
        const c = adults.find(p => p.job === "korilane" && p.mode === "marjad" && Person.canWork(p) && !p.away);
        if (c) c.job = "kytt";
      }
    }
    if ((g.season === 1 || g.season === 2) && site.b.raam > 0 && Sim.freshTotal() > need * 2 && Sim.rackCapLeft() > 5) {
      const dryers = adults.filter(p => p.job === "korilane" && p.mode === "kuivatab").length;
      if (dryers < 1) {
        const c = adults.find(p => p.job === "korilane" && p.mode !== "kuivatab" && Person.canWork(p));
        if (c) c.mode = "kuivatab";
      }
    } else {
      for (const p of adults.filter(p => p.job === "korilane" && p.mode === "kuivatab")) p.mode = defMode;
    }
    const matGuy = adults.filter(p => p.job === "korilane" && p.mode === "materjal").length;
    const matNeed = (Sim.shelterCap() < pop ? 20 : 0) + (site.b.raam < this.wantRacks(g) ? 16 : 0) + 8;
    if (g.mat < matNeed && matGuy < 1 && surplus > 0.6 && g.season !== 3) {
      const c = adults.find(p => p.job === "korilane" && p.mode === "marjad" && Person.canWork(p));
      if (c) c.mode = "materjal";
    } else if ((g.mat > matNeed + 15 || surplus < 0.2) && matGuy > 0) {
      const c = adults.find(p => p.job === "korilane" && p.mode === "materjal");
      if (c) c.mode = "marjad";
    }
    if (g.season === 1 && pop >= 8 && surplus > 1.5) {
      const mushroomers = adults.filter(p => p.job === "korilane" && p.mode === "seened").length;
      if (mushroomers < 1) {
        const c = adults.find(p => p.job === "korilane" && p.mode === "marjad");
        if (c) c.mode = "seened";
      }
    }
    if (Sim.foodTotal() > Sim.dailyNeed() * 45 && g.rep < 70) Sim.feast();
    if (STRATEGY === "paikne" && Sim.foodTotal() > Sim.dailyNeed() * 12 && Sim.canRitual().ok) {
      Sim.ritual(g.season === 3 ? "tervendus" : g.season === 2 ? "jahionn" : "kalaonn");
    }
    if (Sim.canKaugretk().ok && (g.season === 2 || (STRATEGY === "paikne" && g.season !== 3))) Sim.startKaugretk();
    // agressiivne: raidi ainult jõukusest, mitte meeleheitest — toidupuhver peab
    // katma salga äraoleku, ja talvel/kevadel ei sõdita
    if (AGGRESSIVE && (g.season === 1 || g.season === 2) &&
        Sim.foodTotal() > need * 12 && surplus > 0 &&
        Sim.raidParty().length >= DATA.RAIDOP.MIN_FIGHTERS &&
        Sim.canScoutRaid().ok) {
      Sim.startScoutRaid();
    }
    if (g.season === 2 && g.hides < pop && Sim.canSuurjaht().ok) Sim.startSuurjaht();
    if (g.season !== 3 && U.chance(0.2)) {
      const unknown = g.sites.filter(s => s.known < 2 && s.id !== g.campId);
      if (unknown.length) {
        unknown.sort((a, b) => World.distDays(site, a) - World.distDays(site, b));
        if (Sim.canScout(unknown[0].id).ok) Sim.startScout(unknown[0].id);
      }
    }
    if (!g.journey && Sim.moveWindowOpen()) {
      const depleted = STRATEGY === "paikne"
        ? (depletion < 0.18 || g.hungerRecent > 5)
        : (depletion < 0.45 || g.hungerRecent > 3);
      if (depleted) {
        const targets = g.sites.filter(s => s.id !== g.campId && s.known === 2 && s.occupied === null &&
          (s.points[0] + s.points[1] + s.points[2]) > 35);
        const score = s => s.points[0] + s.points[1] + s.points[2] + (s.river ? 25 : 0) + (s.cave ? 20 : 0) +
          (s.hidden || 0) * 0.1 + (s.defensible || 0) * 0.08 - World.distDays(site, s) * 4;
        targets.sort((a, b) => score(b) - score(a));
        if (targets.length && Sim.canMove(targets[0].id).ok) Sim.startJourney(targets[0].id);
      }
    }
  },
};
