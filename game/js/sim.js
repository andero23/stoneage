// sim.js — päevasimulatsioon. DOM-vaba: suhtleb UI-ga ainult Bridge'i kaudu.
"use strict";

// UI-sild. ui.js kirjutab need üle; headless-režiimis lahendatakse automaatselt.
const Bridge = {
  headless: false,
  onLog(line, cls) {},
  onEvent(ev) { // vaikimisi (headless): vali vaikevalik
    const c = ev.choices && ev.choices[ev.def || 0];
    if (c && c.fx) c.fx();
  },
  onCombat(cfg) { // vaikimisi: automaatlahendus
    Combat.autoResolve(cfg);
  },
  onStateChange() {},
};

let G = null;

const Sim = {
  // ---------- uus mäng ----------
  newGame(seed) {
    U.setSeed(seed);
    Person.usedNames = new Set();
    const sites = World.genRegion();
    const neighbors = World.genNeighbors(sites);
    G = {
      seed,
      day: 0,                       // absoluutne päev
      year: 1, season: 1, sday: 1,  // algus: suvi
      speed: 1, paused: true, over: false,

      campId: 0, sites, neighbors,
      people: Person.startBand(),
      nextId: 5,

      fresh: [{ a: 16, age: 0 }],   // natuke moona alustuseks
      dried: 0, mat: 10, hides: 0,
      tool: 10, ration: 1,

      buildQueue: [], clothQueue: 0, clothProgress: 0,
      finds: { flint: 0, bone: 0 },
      gear: [], gearQueue: [], gearProgress: 0, nextGearId: 1,
      score: 0, lastSeasonPts: 0,

      relics: [],
      sec: 40, faith: 45, rep: 30, leaveP: 0,
      unsafe: false,

      coldSnap: 0,
      buffs: { jahionn: 0, kalaonn: 0, kaitse: 0, tervendus: 0 },
      ritualFx: {},                  // varjatud: kas rituaal päriselt mõjub
      cool: { ritual: 0, pidu: 0, suurjaht: 0 },
      wolfPressure: 0,

      journey: null, exped: null, raidOp: null,
      combat: null, pursuit: null,

      seasonGain: 0, seasonSpent: 0, surplusStreak: 0,
      hungerRecent: 0,              // libisev näljanäit
      winterPlan: [],               // planeeritud talvesündmused
      stolenRelic: null,            // varastatud reliikvia võti

      stats: { deaths: [], births: 0, joins: 0, leaves: 0, moves: 0, feasts: 0, rituals: 0, battles: 0, kills: 0 },
      flags: { schismDone: false, meatHidden: false, firstWinterDone: false, climateShock: false, contact: [false, false] },
      log: [],
    };
    for (const t of DATA.RITUAL_TYPES) G.ritualFx[t] = U.chance(0.6); // mõni rituaal ei tee mitte midagi
    Objectives.init();
    G.people.forEach((p, i) => { p.pos.x = 400 + i * 22; p.pos.y = 330; p.pos.tx = p.pos.x; p.pos.ty = p.pos.y; });
    this.log("There are five of you. The summer is kind, but the summer lies.", "evt");
    return G;
  },

  // ---------- abifunktsioonid ----------
  curSite() { return G.sites[G.campId]; },
  alive() { return G.people.filter(p => p.alive); },
  adults() { return this.alive().filter(p => !p.child); },
  pop() { return this.alive().length; },
  freshTotal() { return G.fresh.reduce((s, f) => s + f.a, 0); },
  foodTotal() { return this.freshTotal() + G.dried; },
  dailyNeed() {
    const base = this.alive().reduce((s, p) => s + (p.child ? DATA.CHILD_RATION : 1), 0) * G.ration;
    return base * (G.coldSnap > 0 ? 1.5 : 1); // külmalaine: keha nõuab rohkem
  },
  rackCapLeft() { return this.curSite().b.raam * DATA.RACK_CAP - G.dried; },
  hasShaman() { return this.adults().some(p => p.job === "samaan" && Person.canWork(p) && !p.away); },
  toolBonus() { return 1 + DATA.TOOL_BONUS_MAX * (G.tool / 100); },

  // päeva saagikõikumine: mõni päev on marju rohkem, mõni päev vähem
  yieldRoll() { return U.rf(1 - DATA.YIELD_VAR, 1 + DATA.YIELD_VAR); },

  // Kohatundmine: kaua ühes paigas elades teatakse, kus marjad kasvavad ja kus kala
  // seisab. Uus koht õpetab oskust (kogemus), vana koht annab kohatundmise — kaks
  // eri asja, mõlemal oma väärtus.
  localKnowledge() {
    const seasonsHere = (G.day - this.curSite().arrivedDay) / DATA.SEASON_DAYS;
    return 1 + U.clamp(seasonsHere / 8, 0, 1) * DATA.LOCAL_KNOWLEDGE_MAX;
  },
  // NÄHTAVUS: mida teised sinust näevad. Tuleneb TEGEVUSEST — rahvaarv, rikkus,
  // ehitised, peod, (hiljem: oma raidid) — miinus koha varjatus. Vaikselt elades
  // saab ka kose peal kaua kosuda; kasv ja rikkus paistavad aga igalt poolt.
  visibility() {
    const site = this.curSite();
    const V = DATA.VIS;
    const wealth = this.foodTotal() / V.FOOD_DIV + G.hides / V.HIDES_DIV + G.relics.length * V.RELIC;
    const b = site.b;
    const bvis = b.onn * 2 + b.raam * 1.5 + (b.pyha ? 6 : 0) + (b.tookoht ? 2 : 0) +
      (b.tara ? 3 : 0) + site.graves;
    const feast = (G.flags.feastDay && (G.day - G.flags.feastDay) < V.FEAST_DAYS)
      ? V.FEAST * (1 - (G.day - G.flags.feastDay) / V.FEAST_DAYS) : 0;
    const timeV = Math.min(V.TIME_CAP, (G.day - site.arrivedDay) / DATA.SEASON_DAYS);
    const raw = this.pop() * V.POP + wealth + bvis + feast + timeV + (G.raidsMadeRecent || 0);
    return U.clamp(Math.round(raw - (site.hidden || 0) * V.HIDDEN_MULT), 0, 100);
  },

  seasonName() { return DATA.SEASONS[G.season]; },
  dateText() {
    const sn = this.seasonName();
    return sn.charAt(0).toUpperCase() + sn.slice(1) + " " + G.sday + ", year " + G.year;
  },

  leaveCost() {
    const b = this.curSite().b;
    let cost = 0;
    for (const k in b) {
      const def = DATA.BUILDINGS[k];
      if (!def) continue;
      cost += b[k] * (def.leave - (def.halfBack ? def.mat / 2 : 0));
    }
    cost += this.curSite().graves * 6; // kalmeid ei saa kaasa võtta
    return Math.round(cost);
  },

  log(msg, cls) {
    const entry = { day: G.day, msg, cls: cls || "" };
    G.log.push(entry);
    if (G.log.length > 400) G.log.shift();
    Bridge.onLog(this.dateText() + " — " + msg, cls);
  },

  emit(ev) { Bridge.onEvent(ev); },

  relicBearer(key) {
    const r = G.relics.find(r => r.key === key && r.bearerId !== null);
    if (!r) return null;
    const p = G.people.find(p => p.id === r.bearerId && p.alive);
    if (!p) return null;
    const def = DATA.RELICS[key];
    if (def.job && p.job !== def.job) return null; // mõju ainult õiges ametis
    return p;
  },

  buffMod(type, val) {
    // varjatud: mõjub ainult siis, kui see rituaal selles maailmas päriselt töötab
    if (G.buffs[type] > 0 && G.ritualFx[type]) return val;
    return 1;
  },

  // ---------- päev ----------
  simDay() {
    if (!G || G.over || G.combat) return;
    if (G.journey) { this.journeyDay(); return; }

    // 1. loendurid
    for (const k in G.buffs) if (G.buffs[k] > 0) G.buffs[k]--;
    for (const k in G.cool) if (G.cool[k] > 0) G.cool[k]--;
    if (G.wolfPressure > 0) G.wolfPressure--;

    // jälitaja läheneb: kui jälg viib kohale, otsustab vastane KOHE — ründab või mitte
    if (G.pursuit) {
      G.pursuit.days--;
      if (G.pursuit.days <= 0) Events.resolvePursuit();
    }

    // 2. missioonide edenemine
    this.tickMissions();

    // 3. turvatunne (enne tööd, mõjutab tootlikkust)
    this.computeSecurity();

    // 4. töö ja tootmine
    this.doWork();

    // 5. kuivatamine
    this.doDrying();

    // 6. söömine ja riknemine
    this.doConsumption();
    this.doSpoilage();

    // 7. tervis
    this.doHealth();

    // 8. usk, maine, lahkumissurve
    this.doMeters();

    // 9. sündmused
    Events.daily();

    // 9.5. ringitöölised naasevad ööseks laagrisse (retked ja luure jätkuvad)
    for (const p of this.alive()) if (p.away && p.away.type === "ring") p.away = null;

    // 9.6. eesmärkide rada
    Objectives.tick();

    // 10. loodus taastub
    World.regenerate(G.sites, G.campId, G.season);

    // 11. aja edasiliikumine
    this.advanceTime();

    Bridge.onStateChange();
  },

  // ---------- missioonid (skaut, kaugretk, suurjaht) ----------
  tickMissions() {
    for (const p of this.alive()) {
      if (!p.away || p.away.type === "ring") continue;
      p.away.days--;
      if (p.away.days <= 0) {
        if (p.away.type === "skaut") this.resolveScout(p);
        else if (p.away.type === "skautraid") this.resolveScoutRaid(p);
        else if (p.away.type === "suurjaht") { /* lahendatakse koos, vt allpool */ }
        else if (p.away.type === "retk") { /* koos */ }
        if (p.away && (p.away.type === "skaut" || p.away.type === "skautraid")) p.away = null;
      }
    }
    // sõjaretk: minek -> lahing -> tulek
    if (G.raidOp) {
      G.raidOp.days--;
      if (G.raidOp.days <= 0) {
        if (G.raidOp.phase === "minek") Events.raidArrive();
        else this.raidReturn();
      }
    }
    // kaugretk
    if (G.exped) {
      G.exped.days--;
      if (G.exped.days <= 0) this.resolveKaugretk();
    }
    // suurjaht
    if (G.suurjaht) {
      G.suurjaht.days--;
      if (G.suurjaht.days <= 0) this.resolveSuurjaht();
    }
  },

  // ---------- turvatunne ----------
  computeSecurity() {
    const site = this.curSite();
    const atCamp = this.alive().filter(p => Person.atCamp(p));
    const warriors = atCamp.filter(p => p.job === "sodalane" && !p.child && Person.canWork(p)).length;
    const scouts = atCamp.filter(p => p.job === "skaut" && !p.child && Person.canWork(p)).length;
    const housed = this.shelterCap() >= this.pop();
    let sec = 20 + warriors * 9 + (site.b.tara ? 12 : 0) + (housed ? 8 : 3) + scouts * 3 +
      (this.hasShaman() ? 4 : 0) + Math.round((site.defensible || 0) / 18);
    if (G.buffs.kaitse > 0 && G.ritualFx.kaitse) sec += 8;
    sec -= G.wolfPressure > 0 ? 12 : 0;
    G.sec = U.clamp(Math.round(sec), 0, 100);
    const req = this.secReq();
    G.unsafe = G.sec < req;
  },

  secReq() { return Math.min(96, this.pop() * DATA.SEC_REQ_PER_POP); },

  shelterCap() {
    const site = this.curSite();
    return site.b.onn * 6 + (site.cave ? 12 : 0);
  },

  // ---------- töö ----------
  doWork() {
    const site = this.curSite();
    const baseRing = World.autoRing(site);
    const toolB = this.toolBonus();
    const localK = this.localKnowledge();
    const secPenalty = G.unsafe ? 0.92 : 1;
    const newCampXP = (G.day - site.arrivedDay) < DATA.SEASON_DAYS;

    const workers = this.alive().filter(p => Person.canWork(p) && (!p.away || p.away.type === "ring"));

    // õpipaarid: sama ameti sees, suurim + väikseim oskus, kui vahe >= 1
    const pairs = {};   // job -> {master, apprentice}
    for (const jk of DATA.JOB_KEYS) {
      if (jk === "sodalane" || jk === "samaan") continue;
      const grp = workers.filter(p => p.job === jk && !(jk === "korilane" && (p.mode === "kuivatab")));
      if (grp.length >= 2) {
        grp.sort((a, b) => Person.jobSkill(b) - Person.jobSkill(a));
        const m = grp[0], a = grp[grp.length - 1];
        if (Person.jobSkill(m) - Person.jobSkill(a) >= 1) pairs[jk] = { m: m.id, a: a.id };
      }
    }

    let extracted = [0, 0, 0]; // TÜ ringi kohta

    for (const p of workers) {
      const job = p.job;
      // ring: kaugtöö soov või automaatne
      let ring = baseRing;
      if (p.farWork && ring < 2) ring = ring + 1;
      const ringDepletedMult = World.ringYield(site, ring);

      // ringi 2/3 tööline on kaitse mõttes eemal
      if ((job === "korilane" && p.mode !== "kuivatab" && p.mode !== "materjal") || job === "kytt" || job === "kalur") {
        p.away = ring > 0 ? { type: "ring", ring } : null;
      } else if (p.away && p.away.type === "ring") p.away = null;

      // paariroll
      const pair = pairs[job];
      const isApprentice = pair && pair.a === p.id;
      const isMaster = pair && pair.m === p.id;

      // XP
      const dom = DATA.JOBS[job].dom;
      let xpGain = DATA.RING_XP[ring] || 1;
      if (newCampXP) xpGain = Math.max(xpGain, DATA.NEW_CAMP_XP);
      if (isApprentice) xpGain *= 3;
      if (job === "sodalane") xpGain = 0.5;
      // väike rühm õpib häda sunnil kiiremini: igaüks teeb kõike
      if (this.pop() <= DATA.SMALL_BAND_POP) xpGain *= DATA.SMALL_BAND_XP;
      // varjatud isikuomadused: anne, nõrkus, tempo
      xpGain *= Person.traitMod(p, dom);
      Person.addXP(p, dom, xpGain);
      this.checkTraitReveal(p, dom);

      if (isApprentice) continue; // õpipoisi toodang sisaldub meistri 1,2× sees

      const lvl = Person.jobSkill(p);
      const rm = DATA.RING_MOD[ring] * ringDepletedMult * secPenalty * toolB * localK * (isMaster ? 1.2 : 1);

      if (job === "korilane") {
        this.workGather(p, lvl, ring, rm, extracted);
      } else if (job === "kalur") {
        let y = DATA.YIELD.kala[lvl] * DATA.SEASON_MOD.kala[G.season] * rm * this.yieldRoll();
        if (!site.river) y *= 0.35;
        if (site.fishRun && G.season === 0) y *= 1.5;
        y *= this.buffMod("kalaonn", 1.12);
        if (this.relicBearer("harpuun") === p) y *= 1.2;
        this.addFresh(y);
        extracted[ring] += y;
        G.seasonGain += y;
      } else if (job === "kytt") {
        this.workHunt(p, lvl, ring, rm, extracted);
      } else if (job === "meister") {
        this.workCrafter(p, lvl);
      }
      // sõdalane, skaut, šamaan: passiivne roll mujal

      // ringi risk
      if (ring > 0 && (job === "korilane" || job === "kytt" || job === "kalur")) {
        let risk = DATA.RING_RISK[ring] * (G.season === 3 ? 1.5 : 1);
        if (U.chance(risk)) this.ringIncident(p, ring);
      }
    }

    // skaudi kuulujutud
    for (const p of workers.filter(p => p.job === "skaut" && !p.away)) {
      if (U.chance(0.05)) {
        const unknown = G.sites.filter(s => s.known === 0 && !s.special);
        if (unknown.length) {
          const s = U.pick(unknown);
          s.known = 1;
          this.log(p.name + " heard a wanderer speak of a place called " + s.name + ".", "evt");
        }
      }
    }

    // riiete õmblemine ilma meistrita: õhtuti, aeglaselt, kõigi jõududega
    if (G.clothQueue > 0 && !workers.some(p => p.job === "meister")) {
      const hands = workers.filter(p => !p.away || p.away.type === "ring").length;
      if (hands > 0) {
        G.clothProgress += 0.15 * hands;
        if (G.clothProgress >= DATA.CLOTHES_WORK) {
          G.clothProgress = 0;
          G.clothQueue--;
          const unclothed = this.alive().find(q => !q.clothed);
          if (unclothed) {
            unclothed.clothed = true;
            unclothed.clothesAge = 0;
            this.log("Working hides in the evenings finished a set of winter clothes: " + unclothed.name + " is clothed.", "good");
          }
        }
      }
    }

    // ammendumine
    for (let r = 0; r < 3; r++) if (extracted[r] > 0) World.extract(site, r, extracted[r]);
  },

  workGather(p, lvl, ring, rm, extracted) {
    const mode = p.mode;
    if (mode === "kuivatab") return; // kuivatusfaasis
    if (mode === "materjal") {
      const y = DATA.YIELD.materjal[lvl] * [0.8, 1, 1, 0.5][G.season] * rm * this.yieldRoll();
      G.mat += y;
      // eriline kivi: kaugemal harv, aga võimalik
      if (U.chance(DATA.GEAR.FIND_P[ring])) {
        G.finds.flint++;
        this.log(p.name + " found " + U.pick(["a stone shaped like a spearhead", "a flint with an axe edge", "a straight core that flakes true"]) + "! A crafter could make a weapon of it.", "good");
      }
      return;
    }
    let smod = mode === "juured" ? DATA.SEASON_MOD.juured[G.season] : DATA.SEASON_MOD.korilus[G.season];
    // jõeta kohas päästab kevade mets: linnupesad, munad, kasemahl
    if (G.season === 0 && !this.curSite().river) smod = Math.max(smod, DATA.DRY_SPRING_KORILUS);
    let y = DATA.YIELD[mode][lvl] * smod * rm * this.yieldRoll();
    this.addFresh(y);
    extracted[ring] += y;
    G.seasonGain += y;

    // mürgitus: vale saak jõuab ÜHISESSE PATTA — haigestub juhuslik sööja.
    // Korjaja oskus määrab, kui tihti vale seen üldse koju jõuab.
    const poi = DATA.POISON[mode];
    let risk = poi.risk[lvl];
    if (mode === "seened" && this.relicBearer("seenekorv") === p) risk *= 0.35;
    if (U.chance(risk)) this.poisonRandomEater(p, mode, poi);
  },

  workHunt(p, lvl, ring, rm, extracted) {
    // metsakohad (jõeta) on jahimaad: ulukid väldivad inimeste jõekoridori
    const dryMult = this.curSite().river ? 1 : DATA.DRY_HUNT_MULT;
    const EV = DATA.YIELD.jaht[lvl] * DATA.SEASON_MOD.jaht[G.season] * rm * dryMult * this.buffMod("jahionn", 1.12);
    // väikesaak (metsakohas rikkalikum: jänesed, laanepüüd)
    if (U.chance(0.55)) {
      const y = U.rf(0.7, 1.5) * dryMult;
      this.addFresh(y);
      extracted[ring] += y;
      G.seasonGain += y;
      if (U.chance(DATA.SMALL_HIDE_CHANCE)) G.hides += 1;
    }
    // suursaak: pahmakas, mille sagedus hoiab oodatava keskmise tabeli lähedal
    let pBig = Math.max(0.003, (EV - 0.66) / 62);
    if (this.relicBearer("peakate") === p) pBig *= 1.35;
    if (U.chance(pBig)) {
      const tu = U.rf(DATA.BIG_KILL_TU[0], DATA.BIG_KILL_TU[1]);
      this.addFresh(tu);
      extracted[ring] += tu;
      G.seasonGain += tu;
      G.hides += DATA.BIG_KILL_HIDES;
      Person.addXP(p, "jaht", 30);
      if (U.chance(DATA.GEAR.BONE_BIGKILL_P)) {
        G.finds.bone++;
        this.log(p.name + " brought down a big animal: " + Math.round(tu) + " meat, " + DATA.BIG_KILL_HIDES + " hides and strong bones (good for armour).", "good");
      } else {
        this.log(p.name + " brought down a big animal: " + Math.round(tu) + " meat and " + DATA.BIG_KILL_HIDES + " hides.", "good");
      }
      if (U.chance(0.10)) this.woundPerson(p, U.ri(6, 14), "hurt on the hunt");
      // sarvedega peakate: kogenud kütt, sügisene suursaak
      if (lvl >= 2 && G.season === 2 && !G.relics.some(r => r.key === "peakate") && U.chance(0.18)) {
        this.gainRelic("peakate", p, p.name + " did not take only meat from the deer. They took the head, and with the head something else.");
      }
    }
  },

  workCrafter(p, lvl) {
    const power = 1 + 0.15 * lvl;
    // 1) ehitusjärjekord
    if (G.buildQueue.length) {
      const b = G.buildQueue[0];
      b.workLeft -= power;
      if (b.workLeft <= 0) {
        const site = this.curSite();
        site.b[b.key]++;
        this.log(DATA.BUILDINGS[b.key].name + " on valmis.", "good");
        G.buildQueue.shift();
      }
      return;
    }
    // 2) riided
    if (G.clothQueue > 0) {
      G.clothProgress += power;
      if (G.clothProgress >= DATA.CLOTHES_WORK) {
        G.clothProgress = 0;
        G.clothQueue--;
        const unclothed = this.alive().find(q => !q.clothed);
        if (unclothed) {
          unclothed.clothed = true;
          unclothed.clothesAge = 0;
          this.log(p.name + " sewed winter clothes: " + unclothed.name + " is clothed.", "good");
        }
      }
      return;
    }
    // 3) sõjavarustus
    if (G.gearQueue.length) {
      const q = G.gearQueue[0];
      G.gearProgress += power;
      const need = q.kind === "relv" ? DATA.GEAR.WEAPON.work : DATA.GEAR.ARMOR.work;
      if (G.gearProgress >= need) {
        G.gearProgress = 0;
        G.gearQueue.shift();
        G.gear.push({ id: G.nextGearId++, kind: q.kind, dur: q.kind === "relv" ? DATA.GEAR.WEAPON.dur : DATA.GEAR.ARMOR.dur });
        this.log(p.name + " sai valmis: " + (q.kind === "relv" ? "a flint-edged weapon" : "armour of bone and hide") + ".", "good");
      }
      return;
    }
    // 4) tööriistade hooldus
    const cap = this.curSite().b.tookoht ? 100 : DATA.TOOL_CAP_NO_WORKSHOP;
    if (G.tool < cap) {
      let gain = 3 + 1.5 * lvl;
      if (this.relicBearer("tuum") === p) gain *= 1.3;
      if (G.mat >= 0.2) { G.mat -= 0.2; } else gain *= 0.5;
      G.tool = Math.min(cap, G.tool + gain);
    }
  },

  // omadus avaldub, kui inimene on valdkonnas piisavalt töötanud
  checkTraitReveal(p, dom) {
    const t = p.traits;
    if (!t || (p.xp[dom] || 0) < DATA.TRAIT_REVEAL_XP) return;
    if (dom === t.gift && !t.giftKnown) {
      t.giftKnown = true;
      this.log(p.name + " takes to \"" + DATA.DOM_NAMES[dom] + "\" as if born to it.", "good");
    } else if (dom === t.weak && !t.weakKnown) {
      t.weakKnown = true;
      this.log(p.name + " struggles: \"" + DATA.DOM_NAMES[dom] + "\" will not come to them. Everyone has their own path.", "evt");
    }
  },

  // ---------- kuivatamine ----------
  doDrying() {
    const site = this.curSite();
    if (!site.b.raam) return;
    const dryers = this.alive().filter(p => Person.canWork(p) && p.job === "korilane" && p.mode === "kuivatab" && !p.away);
    if (!dryers.length) return;
    const capLeft = this.rackCapLeft();
    const amt = Math.min(
      dryers.length * DATA.DRYER_RATE,
      site.b.raam * DATA.RACK_RATE,
      this.freshTotal(),
      Math.max(0, capLeft)
    );
    if (amt <= 0) return;
    this.takeFresh(amt);
    G.dried += amt;
  },

  // ---------- toit ----------
  addFresh(amt) {
    if (amt <= 0) return;
    const last = G.fresh[G.fresh.length - 1];
    if (last && last.age === 0) last.a += amt;
    else G.fresh.push({ a: amt, age: 0 });
  },

  takeFresh(amt) { // vanim enne
    let left = amt;
    while (left > 0 && G.fresh.length) {
      const oldest = G.fresh.reduce((a, b) => a.age >= b.age ? a : b);
      const take = Math.min(oldest.a, left);
      oldest.a -= take;
      left -= take;
      if (oldest.a <= 0.001) G.fresh.splice(G.fresh.indexOf(oldest), 1);
    }
    return amt - left;
  },

  doConsumption() {
    const need = this.dailyNeed();
    G.seasonSpent += need;
    let got = this.takeFresh(need);
    if (got < need) {
      const fromDried = Math.min(G.dried, need - got);
      G.dried -= fromDried;
      got += fromDried;
    }
    const fedFrac = need > 0 ? got / need : 1;
    G.fedFrac = fedFrac;
    if (fedFrac < 0.95) {
      G.hungerRecent = Math.min(30, G.hungerRecent + (1 - fedFrac) * 2);
      for (const p of this.alive()) {
        p.hungry++;
        p.health -= (1 - fedFrac) * 6;
      }
      if (G.hungerRecent > 4 && U.chance(0.15)) this.log("There is not enough food. Bellies are empty.", "bad");
    } else {
      G.hungerRecent = Math.max(0, G.hungerRecent - 0.5);
      for (const p of this.alive()) p.hungry = 0;
    }
    // poolratsioon kurnab
    if (G.ration < 1) {
      for (const p of this.alive()) p.health -= 0.8;
      G.faith = Math.max(0, G.faith - 0.25);
    }
  },

  doSpoilage() {
    const life = G.season === 3 ? DATA.FRESH_LIFE_WINTER : DATA.FRESH_LIFE;
    let spoiled = 0;
    for (const f of G.fresh) f.age++;
    G.fresh = G.fresh.filter(f => {
      if (f.age > life) { spoiled += f.a; return false; }
      return true;
    });
    if (spoiled > 3) this.log(Math.round(spoiled) + " of the fresh food has gone bad.", "bad");
  },

  // ---------- tervis ----------
  doHealth() {
    const shaman = this.hasShaman();
    const healBuff = G.buffs.tervendus > 0 && G.ritualFx.tervendus;
    const site = this.curSite();
    // peavarju jaotus: lapsed ja haiged enne
    const cap = this.shelterCap();
    const sorted = this.alive().slice().sort((a, b) =>
      (b.child ? 2 : 0) + (b.sick ? 1 : 0) - ((a.child ? 2 : 0) + (a.sick ? 1 : 0)));
    const housedSet = new Set(sorted.slice(0, cap).map(p => p.id));

    for (const p of this.alive()) {
      if (p.sick) {
        p.sick.days -= 1 + (shaman ? 0.5 : 0) + (healBuff ? 0.5 : 0);
        p.health -= 2.0;
        if (p.sick.days <= 0) { p.sick = null; this.log(p.name + " is well again.", "good"); }
      }
      if (p.wound > 0) {
        p.wound -= 1 + (shaman ? 0.3 : 0);
        p.health -= 0.4;
        if (p.wound <= 0) { p.wound = 0; this.log(p.name + " haavad on paranenud.", "good"); }
      }
      // talvekülm
      if (G.season === 3 && !G.journey) {
        const housed = housedSet.has(p.id);
        let exposure = (housed ? 0 : 1.2) + (p.clothed ? 0 : 1.0);
        if (G.coldSnap > 0) exposure *= 2;
        p.health -= exposure * 1.1;
        if (!p.clothed && !p.sick && U.chance(0.01)) {
          p.sick = { name: "chill", days: U.ri(4, 7) };
          this.log(p.name + " has caught a chill.", "bad");
        }
      }
      // taastumine
      if (!p.sick && p.hungry === 0 && G.ration >= 1) p.health = Math.min(100, p.health + 2);
      if (p.health <= 0) this.killPerson(p, p.hungry > 3 ? "hunger" : (G.season === 3 ? "cold" : "sickness"));
    }
    if (G.coldSnap > 0) G.coldSnap--;
  },

  // ---------- usk, maine, lahkumine ----------
  doMeters() {
    const site = this.curSite();
    const stored = G.relics.filter(r => r.bearerId === null).length;
    const borne = G.relics.filter(r => r.bearerId !== null).length;
    const eheB = this.relicBearerAnyJob("ehe") ? 5 : 0;
    let faithTarget = 28 + (this.hasShaman() ? 15 : 0) + (site.b.pyha ? 10 : 0) +
      (site.b.pyha ? stored * 4 : 0) + borne * 1 + eheB +
      (this.relicBearer("merevaik") ? 5 : 0);
    G.faith += U.clamp(faithTarget - G.faith, -0.5, 0.5);
    G.faith = U.clamp(G.faith, 0, 100);

    let repTarget = 25 + this.pop() * 0.8 + G.relics.length * 2 + (site.b.pyha ? 5 : 0);
    G.rep += U.clamp(repTarget - G.rep, -0.3, 0.3);
    G.rep = U.clamp(G.rep, 0, 100);

    // lahkumissurve
    if (G.fedFrac < 0.95) G.leaveP += (1 - G.fedFrac) * 1.2;
    if (G.unsafe) G.leaveP += 0.25;
    if (G.fedFrac >= 0.95 && !G.unsafe) G.leaveP -= 0.3;
    if (G.faith > 70) G.leaveP -= 0.1;
    G.leaveP = Math.max(0, G.leaveP);

    if (G.leaveP > 35 && this.pop() >= 12 && !G.flags.schismDone) {
      Events.schism();
    } else if (G.leaveP > DATA.LEAVE_THRESHOLD) {
      const candidates = this.adults().filter(p => !p.away);
      if (candidates.length > 1) {
        this.personLeaves(U.pick(candidates));
        G.leaveP = 15;
      }
    }
  },

  relicBearerAnyJob(key) {
    const r = G.relics.find(r => r.key === key && r.bearerId !== null);
    if (!r) return null;
    return G.people.find(p => p.id === r.bearerId && p.alive) || null;
  },

  // ---------- surm ja lahkumine ----------
  killPerson(p, cause) {
    if (!p.alive) return;
    p.alive = false;
    p.away = null;
    G.stats.deaths.push({ name: p.name, cause, day: G.day, year: G.year });
    const site = this.curSite();
    const wasShaman = p.job === "samaan";
    // matus
    if (site.b.pyha && this.hasShaman()) {
      G.faith = Math.min(100, G.faith + 2);
      site.graves++;
      this.log(p.name + " died (" + cause + "). They were buried properly. The grave binds you to this place.", "bad");
    } else {
      G.faith = Math.max(0, G.faith - 8);
      site.graves++;
      this.log(p.name + " died (" + cause + "). The burial was meagre and it sat heavy on everyone.", "bad");
    }
    G.leaveP += Math.max(2, 10 - G.faith * 0.1);
    // reliikvia jääb järele
    const relic = G.relics.find(r => r.bearerId === p.id);
    if (relic) {
      relic.bearerId = null;
      this.log(relic.name + " has no bearer. Someone must take it up.", "evt");
    }
    if (wasShaman && !this.adults().some(q => q.job === "samaan")) {
      G.faith = Math.max(0, G.faith - 20);
      this.log("The shaman is dead. Nobody knows how to speak to the spirits. Faith wavers.", "bad");
    }
    // vanem, kellel oli oskusi: reliikviavõimalus matuselt
    if (!p.child && p.age >= 45 && site.b.pyha && !G.relics.some(r => r.key === "ehe") && U.chance(0.2)) {
      this.gainRelic("ehe", null, p.name + " matuselt leiti ripats, mille ta oli hoidnud oma esimesest lapsest saati.");
    }
    this.checkGameOver();
  },

  personLeaves(p) {
    p.alive = false;
    p.away = null;
    G.stats.leaves++;
    G.rep = Math.max(0, G.rep - 5);
    const relic = G.relics.find(r => r.bearerId === p.id);
    if (relic) relic.bearerId = null;
    this.log(p.name + " left in the night, taking their knowledge along, and will speak of you elsewhere.", "bad");
    this.checkGameOver();
  },

  checkGameOver() {
    if (G.over) return;
    if (this.adults().length === 0) {
      G.over = true;
      Bridge.onRecord && Bridge.onRecord();
      const kids = this.alive().length;
      this.emit({
        title: "The story ends",
        body: (kids > 0
          ? "There are no adults left. The children walked to a neighbouring band and within a few years forgot your names.\n\n"
          : "There is nobody left. The fire went out and snow covered the camp.\n\n") + this.storySummary(),
        choices: [{ label: "Begin a new game", fx: () => { Bridge.onRestart && Bridge.onRestart(); } }],
        def: 0,
      });
    }
  },

  storySummary() {
    const s = G.stats;
    const years = G.year - 1 + (G.season + 1) / 4;
    return "SCORE: " + Math.round(G.score) + "\n\nYou lasted " + U.round1(years) + " years. Died: " + s.deaths.length +
      ", left: " + s.leaves + ", born: " + s.births + ", joined: " + s.joins +
      ". You moved " + s.moves + " times. Feasts " + s.feasts + ", battles " + s.battles +
      ", raids won " + (G.stats.raidsMade || 0) + ".";
  },

  // ---------- reliikviad ----------
  gainRelic(key, bearer, origin) {
    const def = DATA.RELICS[key];
    const r = {
      key, name: def.name,
      origin: origin + " (" + this.dateText() + ")",
      bearerId: bearer ? bearer.id : null,
    };
    G.relics.push(r);
    G.faith = Math.min(100, G.faith + 5);
    G.rep = Math.min(100, G.rep + 3);
    this.log("Reliikvia: " + def.name + ". " + def.desc, "evt");
    this.emit({
      title: "Relic: " + def.name,
      body: r.origin + "\n\n" + def.desc + (def.job ? "\n\nThis belongs to a bearer, not to the camp. " + (bearer ? bearer.name + " carries it now." : "Someone must take it up (Acts → relics).") : ""),
      choices: [{ label: "Olgu nii", fx: () => {} }],
      def: 0,
    });
  },

  assignRelic(relicIdx, personId) {
    const r = G.relics[relicIdx];
    if (!r) return;
    if (this.foodTotal() < 5) { this.log("The handing-over rite needs 5 food.", "bad"); return; }
    this.consumeFood(5);
    r.bearerId = personId;
    const p = G.people.find(p => p.id === personId);
    this.log(r.name + " was handed over: " + (p ? p.name : "someone") + " carries it now.", "evt");
  },

  consumeFood(amt) {
    let got = this.takeFresh(amt);
    if (got < amt) { const d = Math.min(G.dried, amt - got); G.dried -= d; got += d; }
    return got;
  },

  // ---------- ehitamine ----------
  queueBuild(key) {
    const def = DATA.BUILDINGS[key];
    const site = this.curSite();
    if (G.journey) return "You are on the road — you can build when you arrive.";
    if (site.b[key] >= def.max) return "No room for more.";
    if (G.mat < def.mat) return "Not enough timber (" + Math.floor(G.mat) + "/" + def.mat + ").";
    if (G.buildQueue.some(b => b.key === key) && def.max === 1) return "Already being built.";
    G.mat -= def.mat;
    G.buildQueue.push({ key, workLeft: def.work });
    this.log("Work has begun on the " + def.name.toLowerCase() + " (needs a crafter).", "evt");
    return null;
  },

  queueClothes() {
    if (G.hides < DATA.CLOTHES_HIDES) return "Not enough hides (" + Math.floor(G.hides) + "/" + DATA.CLOTHES_HIDES + ").";
    if (this.alive().every(p => p.clothed) && G.clothQueue === 0) return "Everyone is clothed already.";
    G.hides -= DATA.CLOTHES_HIDES;
    G.clothQueue++;
    this.log("The crafter starts on winter clothes.", "evt");
    return null;
  },

  queueGear(kind) {
    if (kind === "relv") {
      const W = DATA.GEAR.WEAPON;
      if (G.finds.flint < W.flint) return "You need a special stone (from timber work further out).";
      if (G.mat < W.mat) return "Not enough timber (" + Math.floor(G.mat) + "/" + W.mat + ").";
      G.finds.flint -= W.flint;
      G.mat -= W.mat;
    } else {
      const A = DATA.GEAR.ARMOR;
      if (G.finds.bone < A.bone) return "You need great bones (" + G.finds.bone + "/" + A.bone + ") — from the great hunt or a big kill.";
      if (G.hides < A.hides) return "Not enough hides (" + Math.floor(G.hides) + "/" + A.hides + ").";
      G.finds.bone -= A.bone;
      G.hides -= A.hides;
    }
    G.gearQueue.push({ kind });
    this.log("The crafter has started on " + (kind === "relv" ? "a weapon" : "armour") + ".", "evt");
    return null;
  },

  gearCount(kind) { return G.gear.filter(g => g.kind === kind).length; },

  // ---------- teod ----------
  canFeast() {
    const cost = Math.ceil(this.pop() * DATA.FEAST_COST_PER_POP);
    if (G.journey) return { ok: false, why: "You are on the road." };
    if (G.cool.pidu > 0) return { ok: false, why: "The last feast is still fresh in memory (" + G.cool.pidu + "d)." };
    if (this.foodTotal() < cost) return { ok: false, why: "Needs " + cost + " food, you have " + Math.floor(this.foodTotal()) + "." };
    return { ok: true, cost };
  },

  feast() {
    const c = this.canFeast();
    if (!c.ok) return;
    this.consumeFood(c.cost);
    G.rep = Math.min(100, G.rep + 15);
    G.faith = Math.min(100, G.faith + 8);
    G.leaveP = Math.max(0, G.leaveP - 15);
    G.cool.pidu = 40;
    G.stats.feasts++;
    G.flags.feastDay = G.day;
    let visitors = false;
    for (const n of G.neighbors) {
      if (n.known) { n.att = Math.min(100, n.att + 10); visitors = true; }
    }
    this.log("A feast! Meat, stories and songs. Renown and faith rise." +
      (visitors ? " The neighbours came by. They smiled, and they counted your stores." : ""), "evt");
  },

  canRitual() {
    if (G.journey) return { ok: false, why: "You are on the road." };
    if (!this.hasShaman()) return { ok: false, why: "You need a shaman who is here and well." };
    if (G.cool.ritual > 0) return { ok: false, why: "The spirits need quiet (" + G.cool.ritual + "d)." };
    if (this.foodTotal() < DATA.RITUAL_COST) return { ok: false, why: "The offering needs " + DATA.RITUAL_COST + " food." };
    return { ok: true };
  },

  ritual(type) {
    const c = this.canRitual();
    if (!c.ok) return;
    this.consumeFood(DATA.RITUAL_COST);
    G.buffs[type] = DATA.RITUAL_DAYS;
    G.cool.ritual = DATA.RITUAL_COOLDOWN;
    G.faith = Math.min(100, G.faith + 6);
    G.stats.rituals++;
    this.log(DATA.RITUAL_NAMES[type] + " has been held. The smoke rose straight up. Whether that means anything, nobody knows.", "evt");
  },

  // suurjaht
  canSuurjaht() {
    if (G.journey) return { ok: false, why: "You are on the road." };
    if (G.cool.suurjaht > 0) return { ok: false, why: "The animals are restless (" + G.cool.suurjaht + "d)." };
    if (G.suurjaht) return { ok: false, why: "A great hunt is already out." };
    const able = this.adults().filter(p => Person.canWork(p) && !p.away && (p.job === "kytt" || p.job === "sodalane" || p.job === "kalur"));
    if (able.length < DATA.SUURJAHT.minPeople) return { ok: false, why: "You need 4 fit hunters/warriors/fishers in camp." };
    return { ok: true, members: able.slice(0, 6) };
  },

  startSuurjaht() {
    const c = this.canSuurjaht();
    if (!c.ok) return;
    const prey = U.pick(["a bear", "an aurochs", "an elk"]);
    for (const p of c.members) p.away = { type: "suurjaht", days: DATA.SUURJAHT.days, total: DATA.SUURJAHT.days };
    G.suurjaht = { days: DATA.SUURJAHT.days, members: c.members.map(p => p.id), prey };
    G.cool.suurjaht = DATA.SUURJAHT.cooldown;
    this.log(c.members.length + " went out on the great hunt. They have their eye on " + prey + ".", "evt");
  },

  resolveSuurjaht() {
    const sj = G.suurjaht;
    G.suurjaht = null;
    const members = sj.members.map(id => G.people.find(p => p.id === id)).filter(p => p && p.alive);
    for (const p of members) p.away = null;
    if (!members.length) return;
    const site = this.curSite();
    World.extract(site, 2, DATA.SUURJAHT.ringCost * DATA.TU_PER_POINT);
    const success = U.chance(0.78);
    if (success) {
      const tu = U.rf(DATA.SUURJAHT.tu[0], DATA.SUURJAHT.tu[1]);
      const hides = U.ri(DATA.SUURJAHT.hides[0], DATA.SUURJAHT.hides[1]);
      this.addFresh(tu);
      G.hides += hides;
      G.rep = Math.min(100, G.rep + 5);
      G.seasonGain += tu;
      for (const p of members) Person.addXP(p, DATA.JOBS[p.job].dom, 40);
      G.finds.bone += 2;
      this.log("The great hunt succeeded: " + sj.prey + " went down. " + Math.round(tu) + " meat, " + hides + " hides and great bones (good for armour).", "good");
      if (sj.prey === "karu" && !G.relics.some(r => r.key === "karukapp") && U.chance(DATA.SUURJAHT.relicP)) {
        const warrior = members.find(p => p.job === "sodalane") || members[0];
        this.gainRelic("karukapp", warrior, "A bear that would not die. " + warrior.name + " struck the last blow and took the paw.");
      }
      if (U.chance(DATA.SUURJAHT.woundP)) this.woundPerson(U.pick(members), U.ri(10, 20), "hurt on the great hunt");
    } else {
      this.log("The great hunt failed. " + sj.prey + " got away and they came back empty-handed.", "bad");
      if (U.chance(0.4)) this.woundPerson(U.pick(members), U.ri(8, 18), "hurt on the great hunt");
      if (U.chance(DATA.SUURJAHT.deathP)) this.killPerson(U.pick(members.filter(p => p.alive)), sj.prey + " killed them on the hunt");
    }
  },

  // kaugretk
  canKaugretk() {
    if (G.journey) return { ok: false, why: "You are on the road." };
    if (G.exped) return { ok: false, why: "A long journey is already out." };
    if (this.pop() < DATA.KAUGRETK.minPop) return { ok: false, why: "You need at least " + DATA.KAUGRETK.minPop + " people in the band." };
    const wars = this.adults().filter(p => p.job === "sodalane" && Person.canWork(p) && !p.away);
    const hunts = this.adults().filter(p => p.job === "kytt" && Person.canWork(p) && !p.away);
    if (wars.length < DATA.KAUGRETK.minWar) return { ok: false, why: "You need " + DATA.KAUGRETK.minWar + " fit warriors (now " + wars.length + ")." };
    if (hunts.length < DATA.KAUGRETK.minHunt) return { ok: false, why: "You need " + DATA.KAUGRETK.minHunt + " fit hunters (now " + hunts.length + ")." };
    return { ok: true, members: wars.slice(0, 3).concat(hunts.slice(0, 3)) };
  },

  startKaugretk() {
    const c = this.canKaugretk();
    if (!c.ok) return;
    for (const p of c.members) p.away = { type: "retk", days: DATA.KAUGRETK.days, total: DATA.KAUGRETK.days };
    G.exped = { days: DATA.KAUGRETK.days, members: c.members.map(p => p.id) };
    this.log("The long journey set out: 3 warriors and 3 hunters, " + DATA.KAUGRETK.days + " days. The camp is left weaker.", "evt");
  },

  resolveKaugretk() {
    const ex = G.exped;
    G.exped = null;
    const members = ex.members.map(id => G.people.find(p => p.id === id)).filter(p => p && p.alive);
    for (const p of members) p.away = null;
    if (!members.length) return;
    const site = this.curSite();
    const hunters = members.filter(p => p.job === "kytt");
    const avgSkill = hunters.length ? hunters.reduce((s, p) => s + Person.jobSkill(p), 0) / hunters.length : 1;
    let tu = (100 + 100 * Math.max(1, avgSkill)) * Math.pow(DATA.KAUGRETK.decay, site.expeds);
    site.expeds++;
    const hides = U.ri(DATA.KAUGRETK.hides[0], DATA.KAUGRETK.hides[1]);
    // pool kuivatati juba teel
    G.dried = Math.min(G.dried + tu / 2, Math.max(G.dried, site.b.raam * DATA.RACK_CAP + tu / 2));
    this.addFresh(tu / 2);
    G.hides += hides;
    G.seasonGain += tu;
    G.rep = Math.min(100, G.rep + 4);
    for (const p of members) Person.addXP(p, DATA.JOBS[p.job].dom, 60);
    if (U.chance(0.5)) G.finds.bone++;
    this.log("The long journey came back: " + Math.round(tu) + " food (half of it already dried) and " + hides + " hides.", "good");
    if (U.chance(DATA.KAUGRETK.woundP)) this.woundPerson(U.pick(members), U.ri(10, 20), "hurt on the long journey");
    if (U.chance(DATA.KAUGRETK.deathP)) {
      const victim = U.pick(members.filter(p => p.alive));
      if (victim) this.killPerson(victim, "died on the long journey");
    }
    if (site.expeds >= 3 && U.chance(0.5)) this.log("The hunters say the far grounds are emptying. These journeys cannot go on forever.", "evt");
  },

  // ---------- skaut ----------
  canScout(siteId) {
    if (G.journey) return { ok: false, why: "You are on the road." };
    const scout = this.adults().find(p => p.job === "skaut" && Person.canWork(p) && !p.away);
    if (!scout) return { ok: false, why: "You need a fit scout who is in camp." };
    const target = G.sites[siteId];
    if (!target || siteId === G.campId) return { ok: false, why: "Not a valid destination." };
    if (G.season === 3) return { ok: false, why: "A scout will not travel in winter." };
    return { ok: true, scout, target };
  },

  startScout(siteId) {
    const c = this.canScout(siteId);
    if (!c.ok) return;
    const dist = World.distDays(this.curSite(), c.target);
    c.scout.away = { type: "skaut", days: dist * 2, total: dist * 2, data: { siteId, dist } };
    this.log(c.scout.name + " set out to scout " + c.target.name + " (" + (dist * 2) + " days).", "evt");
  },

  resolveScout(p) {
    const data = p.away.data;
    const target = G.sites[data.siteId];
    const lvl = Person.skill(p, "skaut");
    let risk = 0.04 + data.dist * 0.015 - lvl * 0.01;
    if (this.relicBearer("jalaluu") === p) risk *= 0.5;
    risk = Math.max(0.01, risk);
    if (U.chance(risk)) {
      const roll = U.r();
      if (roll < 0.25) {
        p.away = null;
        this.killPerson(p, "lost while scouting");
        this.log("The scout never came back. Nobody knows what happened, and that is the worst of it.", "bad");
        return;
      }
      this.woundPerson(p, U.ri(6, 12), "hurt while scouting");
      this.log(p.name + " came back from scouting wounded, and the word they brought is half a story.", "bad");
      target.known = Math.max(target.known, 1);
      Person.addXP(p, "skaut", 40);
      return;
    }
    target.known = 2;
    target.estRich = lvl >= 2 ? target.rich : U.clamp(target.rich + U.ri(-20, 20), 15, 110);
    Person.addXP(p, "skaut", 80);
    const feat = [];
    if (target.river) feat.push("river");
    if (target.cave) feat.push("cave");
    if (target.fishRun) feat.push("spawning run");
    if (lvl >= 1) {
      feat.push(DATA.LEVEL_NAME(target.hidden) + " cover");
      feat.push(DATA.LEVEL_NAME(target.defensible) + " to defend");
    }
    if (target.occupied !== null) feat.push("lived in by " + G.neighbors[target.occupied].name);
    this.log(p.name + " is back from scouting: " + target.name + " is " + DATA.RICHNESS_NAME(target.estRich) +
      (feat.length ? " (" + feat.join(", ") + ")" : "") + ".", "good");
    if (target.occupied !== null) G.neighbors[target.occupied].known = true;

    // haruldane avastus teel: peidetud erikoht. Kaugluure leiab sagedamini.
    const unrevealed = G.sites.filter(s => s.special && !s.revealed);
    if (unrevealed.length && U.chance(data.dist >= 4 ? 0.12 : 0.03)) {
      const sp = U.pick(unrevealed);
      sp.revealed = true;
      sp.known = 2;
      sp.estRich = sp.rich;
      this.emit({
        title: "The scout spoke quietly",
        body: p.name + " saw something on the road that people do not speak of aloud: " + sp.name + ".\n\n" +
          "Water falls there from the cliff, the fish stand thick under the rapids as they do in autumn, and the place is " +
          "hidden from the paths. Places like this do not stay secret long — the talk starts the moment " +
          "someone settles there.",
        choices: [{ label: "Mark it on the map", fx: () => {} }],
        def: 0,
      });
    }
  },

  // ---------- külaotsing ja sõjaretk ----------
  canScoutRaid() {
    if (G.journey) return { ok: false, why: "You are on the road." };
    if (G.season === 3) return { ok: false, why: "A scout will not travel in winter." };
    if (G.raidOp) return { ok: false, why: "A raid is already out." };
    if (G.cool.raidScout > 0) return { ok: false, why: "The scout is still resting from the last trip (" + G.cool.raidScout + "d)." };
    const scout = this.adults().find(p => p.job === "skaut" && Person.canWork(p) && !p.away);
    if (!scout) return { ok: false, why: "You need a fit scout who is in camp." };
    return { ok: true, scout };
  },

  startScoutRaid() {
    const c = this.canScoutRaid();
    if (!c.ok) return;
    const days = U.ri(DATA.RAIDOP.SEARCH_DAYS[0], DATA.RAIDOP.SEARCH_DAYS[1]);
    c.scout.away = { type: "skautraid", days, total: days };
    G.cool.raidScout = 10;
    this.log(c.scout.name + " took the far paths to look for strangers' camps (" + days + " days).", "evt");
  },

  resolveScoutRaid(p) {
    const lvl = Person.skill(p, "skaut");
    let risk = 0.06 - lvl * 0.012;
    if (this.relicBearer("jalaluu") === p) risk *= 0.5;
    if (U.chance(Math.max(0.015, risk))) {
      if (U.chance(0.25)) {
        p.away = null;
        this.killPerson(p, "lost while searching for camps");
        return;
      }
      this.woundPerson(p, U.ri(6, 12), "hurt while searching for camps");
      return;
    }
    Person.addXP(p, "skaut", 60);
    if (!U.chance(DATA.RAIDOP.FIND_P + lvl * 0.08)) {
      this.log(p.name + " came back with nothing: the paths were quiet and no smoke showed anywhere.", "evt");
      return;
    }
    // küla genereeritakse LEIDMISE hetkel: suuri märkab kergemini
    const theirPop = Math.max(5, Math.round(this.pop() * U.rf(DATA.RAIDOP.SIZE[0], DATA.RAIDOP.SIZE[1])));
    const village = {
      name: U.pick(TRIBE_NAMES),
      pop: theirPop,
      defenders: U.clamp(Math.round(theirPop / 4), 2, 5),
      defensible: U.ri(15, 75),
      dist: U.ri(DATA.RAIDOP.DIST[0], DATA.RAIDOP.DIST[1]),
      rich: theirPop * U.rf(6, 14), // varude hinnang
    };
    Events.raidTargetFound(village, p);
  },

  // sõjasalk: parimad võitlejad laagris, kuni 5
  raidParty() {
    const pref = { sodalane: 0, kytt: 1, kalur: 2, skaut: 3 };
    return this.adults()
      .filter(p => Person.canWork(p) && !p.away && ["sodalane", "kytt", "kalur", "skaut"].includes(p.job))
      .sort((a, b) => (pref[a.job] ?? 9) - (pref[b.job] ?? 9))
      .slice(0, 5);
  },

  startRaid(village) {
    const party = this.raidParty();
    if (party.length < DATA.RAIDOP.MIN_FIGHTERS) return;
    for (const p of party) p.away = { type: "raid", days: 999, total: 999 };
    G.raidOp = { phase: "minek", days: village.dist, dist: village.dist,
      village, members: party.map(p => p.id), loot: null };
    this.log("The war party (" + party.length + ") set out for " + village.name + ", " + village.dist + " days away. The camp is left weaker.", "evt");
  },

  raidReturn() {
    const op = G.raidOp;
    G.raidOp = null;
    const members = op.members.map(id => G.people.find(p => p.id === id)).filter(p => p && p.alive);
    for (const p of members) p.away = null;
    if (!members.length) return;
    if (op.loot) {
      this.addFreshOrDried(op.loot.food);
      G.hides += op.loot.hides;
      if (op.loot.relicKey) {
        this.gainRelic(op.loot.relicKey, null, "Taken from the camp of " + op.village.name + ". Their spirits came along with it — whose side they are on, nobody knows.");
      }
      this.log("The war party is home. Loot: " + Math.round(op.loot.food) + " food, " + op.loot.hides + " hides" +
        (op.loot.weapons ? ", " + op.loot.weapons + " relva" : "") + ". " +
        (op.loot.bare ? "The camp was left bare behind them." : "They took off the fallen what they could carry."), "good");
    } else {
      this.log("The war party is home. Empty-handed and silent.", "evt");
    }
  },

  addFreshOrDried(amt) {
    // röövsaak on suitsutatud/kuivatatud kraam: läheb otse lattu, kui mahub
    const capLeft = Math.max(0, this.rackCapLeft());
    const toDried = Math.min(amt, capLeft);
    G.dried += toDried;
    if (amt - toDried > 0) this.addFresh(amt - toDried);
  },

  // ---------- vigastused ja mürgitus ----------
  woundPerson(p, days, why) {
    if (!p || !p.alive) return;
    p.wound = Math.max(p.wound, days);
    p.away = null;
    this.log(p.name + " is " + why + ": " + days + " days unable to work. They eat, but produce nothing.", "bad");
  },

  // ühine pott: ohver on juhuslik sööja (kohalolijad ja ringitöölised; ka lapsed)
  poisonRandomEater(gatherer, mode, poi) {
    const eaters = this.alive().filter(q => !q.away || q.away.type === "ring");
    const victim = eaters.length ? U.pick(eaters) : gatherer;
    const days = U.ri(poi.days[0], poi.days[1]);
    victim.sick = { name: (mode === "seened" ? "mushroom" : "food") + " poisoning", days };
    victim.away = null;
    const deathP = (this.hasShaman() ? poi.deathShaman : poi.death) * DATA.POISON_HEALTH_MULT(victim.health);
    const blame = victim.id === gatherer.id
      ? victim.name + " ate a bad " + (mode === "seened" ? "mushroom" : "berry") + " they had picked themselves"
      : gatherer.name + " brought home a bad " + (mode === "seened" ? "mushroom" : "berry") + " and " + victim.name + " ate it";
    if (U.chance(deathP)) {
      this.killPerson(victim, "poisoning");
      this.log(blame + ". In the morning they did not wake.", "bad");
    } else {
      this.log(blame + ": ill for " + days + " days." + (this.hasShaman() ? " The shaman sits with them." : ""), "bad");
    }
  },

  poisonPerson(p, mode, poi) {
    const days = U.ri(poi.days[0], poi.days[1]);
    p.sick = { name: (mode === "seened" ? "mushroom" : "food") + " poisoning", days };
    p.away = null;
    const deathP = (this.hasShaman() ? poi.deathShaman : poi.death) * DATA.POISON_HEALTH_MULT(p.health);
    if (U.chance(deathP)) {
      this.killPerson(p, "poisoning");
      this.log("A bad mushroom. " + p.name + " did not wake in the morning.", "bad");
    } else {
      this.log(p.name + " ate something bad and is ill (" + days + "d)." + (this.hasShaman() ? " The shaman sits with them." : ""), "bad");
    }
  },

  ringIncident(p, ring) {
    const roll = U.r();
    if (roll < DATA.RING_DEATH_SHARE && ring === 2) {
      this.killPerson(p, "died working far out");
    } else if (roll < 0.75) {
      this.woundPerson(p, U.ri(5, 12), "caught in an accident (ring " + (ring + 1) + ")");
    } else {
      G.wolfPressure = Math.max(G.wolfPressure, 3);
      this.log(p.name + " saw predator tracks in ring " + (ring + 1) + ". People are uneasy.", "bad");
    }
  },

  // ---------- kolimine ----------
  moveWindowOpen() {
    return G.season === 0 || (G.season === 2 && G.sday <= DATA.WINDOW.SYGIS_UNTIL);
  },

  canMove(siteId) {
    if (G.journey) return { ok: false, why: "You are already on the road." };
    const target = G.sites[siteId];
    if (!target || siteId === G.campId) return { ok: false, why: "Not a valid destination." };
    if (target.occupied !== null) return { ok: false, why: G.neighbors[target.occupied].name + " live there." };
    if (target.known === 0) return { ok: false, why: "You know nothing about that place." };
    if (!this.moveWindowOpen()) return { ok: false, why: "The moving window is shut. You can move in spring and early autumn." };
    if (G.exped || G.suurjaht || G.raidOp) return { ok: false, why: "Some of your people are away. Wait for them." };
    if (this.adults().some(p => p.away && p.away.type === "skaut")) return { ok: false, why: "The scout is still out. Wait for them." };
    return { ok: true, target };
  },

  startJourney(siteId) {
    const c = this.canMove(siteId);
    if (!c.ok) return;
    const site = this.curSite();
    const dist = World.distDays(site, c.target);
    const popN = this.pop();

    // pooleliolevad ehitused jäävad katki: materjal tagasi
    for (const b of G.buildQueue) G.mat += DATA.BUILDINGS[b.key].mat;
    G.buildQueue = [];

    // lammutatavad ehitised: pooled materjalid kaasa, ehitis ise kaob
    let backMat = 0;
    for (const k of ["raam", "tookoht"]) {
      if (DATA.BUILDINGS[k].halfBack) {
        backMat += site.b[k] * DATA.BUILDINGS[k].mat / 2;
        site.b[k] = 0;
      }
    }
    G.mat += backMat;

    // liiga sage kolimine kurnab: alles harjuti, alles ehitati, ja jälle minek
    const seasonsHere = (G.day - site.arrivedDay) / DATA.SEASON_DAYS;
    if (seasonsHere < 4 && G.stats.moves > 0) {
      G.faith = Math.max(0, G.faith - 8);
      G.leaveP += 6;
      this.log("Moving again. The elders say a people who settle nowhere lose themselves in the end.", "bad");
    }

    // kanda jõuab piiratud koguse
    const carryDried = Math.min(G.dried, popN * 6);
    const carryFresh = Math.min(this.freshTotal(), popN * 2);
    const carryMat = Math.min(G.mat, popN * 2);
    const carryHides = Math.min(G.hides, popN * 3);
    const lostFood = Math.round(G.dried - carryDried + this.freshTotal() - carryFresh);
    G.dried = carryDried;
    const freshKeep = carryFresh;
    G.fresh = [{ a: freshKeep, age: 0 }];
    G.mat = carryMat;
    G.hides = carryHides;

    if (site.b.pyha) {
      G.faith = Math.max(0, G.faith - 15);
      this.log("The shrine was left behind. The spirits stayed where they were called. Faith falls.", "bad");
    }
    if (site.graves > 0) this.log("The graves were left behind. The ancestors stay to guard an empty place.", "evt");

    site.abandonedDay = G.day;
    // tühistame ring-eemaloleku
    for (const p of this.alive()) if (p.away && p.away.type === "ring") p.away = null;

    // jälitaja: kolimine kas raputab ta maha või ta järgneb uude kohta
    if (G.pursuit) {
      if (U.chance(0.5)) {
        G.pursuit = null;
        this.log("Hard paths and rain wiped out your tracks. The pursuers fell behind.", "good");
      } else {
        this.log("Strange tracks on your paths. Someone came along with you, at a distance.", "bad");
      }
    }

    G.journey = { to: siteId, days: dist, total: dist, from: G.campId };
    G.stats.moves++;
    this.log("The journey began: " + c.target.name + ", " + dist + " days." +
      (lostFood > 0 ? " " + lostFood + " food was left behind, more than could be carried." : ""), "evt");
    Bridge.onStateChange();
  },

  journeyDay() {
    const j = G.journey;
    // teel süüakse, ei toodeta
    this.doConsumption();
    this.doSpoilage();
    const avgHealth = this.alive().reduce((s, p) => s + p.health, 0) / Math.max(1, this.pop());
    let risk = 0.035 + (avgHealth < 60 ? 0.025 : 0) + (G.season === 0 ? 0.012 : 0) + (G.season === 3 ? 0.05 : 0);
    if (U.chance(risk)) {
      const victim = U.pick(this.alive());
      if (U.chance(0.12)) {
        this.killPerson(victim, "died on the road");
      } else {
        victim.health -= U.ri(15, 30);
        this.log(victim.name + " was hurt on the road (" + U.pick(["a river crossing", "a slick bank", "cold rain", "a fall on scree"]) + ").", "bad");
        if (victim.health <= 0) this.killPerson(victim, "died on the road");
      }
    }
    for (const p of this.alive()) if (p.sick) { p.sick.days--; if (p.sick.days <= 0) p.sick = null; }
    j.days--;
    if (j.days <= 0) {
      G.campId = j.to;
      const site = this.curSite();
      site.arrivedDay = G.day;
      site.known = 2;
      site.estRich = site.rich;
      G.journey = null;
      this.log("Kohal: " + site.name + ". " + (site.cave ? "Koobas hoiab teid soojas, onni pole vaja ehitada. " : "") +
        "A new place teaches fast (first season: experience comes quickly).", "good");
      if (site.b.onn || site.b.raam) this.log("The old camp's buildings still stand, though time has gnawed at them.", "evt");
    }
    this.advanceTime();
    Bridge.onStateChange();
  },

  // ---------- aeg ----------
  advanceTime() {
    G.day++;
    G.sday++;
    if (G.sday > DATA.SEASON_DAYS) {
      G.sday = 1;
      G.season++;
      if (G.season > 3) {
        G.season = 0;
        G.year++;
        this.yearChange();
      }
      this.seasonChange();
    }
    // igapäevased tähtpäevad
    if (G.season === 2 && G.sday === 5 && !G.journey) Events.autumnReminder();
    if (G.season === 2 && G.sday === DATA.WINDOW.SYGIS_UNTIL + 1) {
      this.log("The autumn moving window has shut. You are here until spring now.", "evt");
    }
  },

  seasonChange() {
    const s = G.season;

    // SKOOR koguneb iga elatud hooajaga; talve üleelamine annab lisa
    const SC = DATA.SCORE;
    const pts = SC.SEASON_BASE + this.pop() * SC.POP + Math.floor(this.foodTotal() / SC.FOOD_DIV) +
      G.relics.length * SC.RELIC + G.gear.length * SC.GEAR + (s === 0 ? SC.WINTER : 0);
    G.score += pts;
    G.lastSeasonPts = pts;
    G.stats.peakPop = Math.max(G.stats.peakPop || 0, this.pop());

    // kaugjahimaad toibuvad aegamisi: retki saab teha, aga mitte lõputult järjest
    for (const site of G.sites) site.expeds = Math.max(0, site.expeds - DATA.KAUGRETK.recover);

    // hooaja kokkuvõte ja sünnid
    const surplus = G.seasonGain > G.seasonSpent;
    G.surplusStreak = surplus ? G.surplusStreak + 1 : 0;
    G.seasonGain = 0; G.seasonSpent = 0;

    // lapsed kasvavad
    for (const p of this.alive()) {
      if (p.child) {
        p.childLeft--;
        if (p.childLeft <= 0) {
          p.child = false;
          p.job = "korilane";
          p.mode = "marjad";
          this.log(p.name + " is grown. They take up foraging (you can change their trade).", "good");
        }
      }
      if (p.clothed) {
        p.clothesAge++;
        if (p.clothesAge >= DATA.CLOTHES_LIFE_SEASONS) {
          p.clothed = false;
          p.clothesAge = 0;
          this.log(p.name + "'s winter clothes have worn through.", "bad");
        }
      }
    }

    // sünd
    this.tryBirth();

    if (s === 0) {
      this.log("SPRING. The hungry months: the stores are gone and nothing new has grown. " +
        (this.curSite().river ? "The run begins: fishers do well." : "") +
        " The moving window is open all spring.", "evt");
    } else if (s === 1) {
      this.log("SUMMER. Plenty. Gather, learn, build. And do not let the summer fool you.", "evt");
    } else if (s === 2) {
      this.log("AUTUMN. The season that decides: store, dry, build — or move (the window is open 15 days).", "evt");
    } else if (s === 3) {
      Events.scheduleWinter();
      this.log("WINTER. Now autumn's choices come due — but there is still work: building, timber, roots, winter hunting.", "evt");
      const cap = this.shelterCap();
      if (cap < this.pop()) this.log("WARNING: there is shelter for " + cap + ", and you are " + this.pop() + ". Those sleeping outside will freeze.", "bad");
      const unclothed = this.alive().filter(p => !p.clothed).length;
      if (unclothed > 0) this.log("WARNING: " + unclothed + " people have no winter clothes.", "bad");
    }
    Events.seasonRolls();
  },

  tryBirth() {
    if (G.surplusStreak >= 2 && G.faith > 32 && U.chance(0.55)) {
      const mothers = this.adults().filter(p => p.sex === "N" && p.age >= 16 && p.age <= 45 && !p.sick && !p.away);
      const fathers = this.adults().filter(p => p.sex === "M");
      if (mothers.length && fathers.length) {
        const mother = U.pick(mothers);
        const winterB = G.season === 3;
        const deathP = (this.hasShaman() ? 0.02 : 0.045) * (winterB ? 2 : 1);
        const baby = Person.create({ id: G.nextId++, child: true, age: 0 });
        baby.pos = { x: 480, y: 300, tx: 480, ty: 300, wander: 0 };
        G.people.push(baby);
        G.stats.births++;
        G.surplusStreak = 0; // järgmine sünd nõuab kaks uut ülejäägiga hooaega
        mother.wound = Math.max(mother.wound, 5);
        if (U.chance(deathP)) {
          this.killPerson(mother, "died in childbirth");
          this.log("A child was born, but " + mother.name + " did not survive. The child is called " + baby.name + ".", "bad");
        } else {
          this.log("A child was born: " + baby.name + ". " + mother.name + " rests a few days. A child eats half a ration and grows for three years.", "good");
          G.faith = Math.min(100, G.faith + 3);
        }
      }
    }
  },

  yearChange() {
    // vananemine
    for (const p of this.alive()) {
      p.age++;
      if (!p.child && p.age >= 50) {
        const dieP = 0.10 + (p.age - 50) * 0.03;
        if (U.chance(dieP)) {
          this.killPerson(p, "died of old age");
        }
      }
    }
    // aastakokkuvõte
    if (G.year >= 2) Events.yearSummary();
    if (G.year === 9) Events.epilogue();
  },
};
