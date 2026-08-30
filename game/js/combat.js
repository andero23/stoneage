// combat.js — käigupõhine väikelahing. Loogika DOM-vaba; UI joonistab ui.js/render.js.
"use strict";

const Combat = {
  W: 13, H: 8,

  start(cfg) {
    // kaitsjad: laagris olevad terved täiskasvanud (mitte šamaan), kuni 6
    let party;
    if (cfg.party) {
      party = cfg.party.map(id => G.people.find(p => p.id === id)).filter(Boolean).slice(0, 5);
    } else {
      const pref = { sodalane: 0, kytt: 1, kalur: 2, skaut: 3, korilane: 4, meister: 5 };
      const able = Sim.adults()
        .filter(p => Person.canWork(p) && !p.away && p.job !== "samaan")
        .sort((a, b) => (pref[a.job] ?? 9) - (pref[b.job] ?? 9));
      // kuni 5 võitlejat; korilased-meistrid tulevad appi ainult siis, kui võitlejaid on alla kolme
      const real = able.filter(p => ["sodalane", "kytt", "kalur", "skaut"].includes(p.job));
      party = real.slice(0, 5);
      if (party.length < 3) party = able.slice(0, Math.min(4, able.length));
    }

    if (!party.length) {
      // kedagi pole kaitsmas: sama, mis peitmine
      const loss = Math.round(Sim.foodTotal() * 0.35);
      Sim.consumeFood(loss);
      Sim.log("Nobody was there to defend. They took " + loss + " food and went.", "bad");
      return;
    }

    G.stats.battles++;
    const units = [];
    let uid = 0;

    // takistused
    const obstacles = [];
    for (let i = 0; i < 7; i++) {
      const x = U.ri(3, this.W - 4), y = U.ri(0, this.H - 1);
      if (!obstacles.some(o => o.x === x && o.y === y)) obstacles.push({ x, y });
    }

    // künkad koha kaitstavusest: kaitsja poolel, laskur künkal näeb kaugemale.
    // Rünnates (raid, tagasitoomine) oled SINA võõral maal — künkad on nende poolel.
    const attacking = cfg.type === "tagasitoomine" || cfg.type === "raid";
    const hills = [];
    const defSite = attacking ? { defensible: cfg.enemyDefensible ?? 45 } : Sim.curSite();
    const nHills = Math.round((defSite.defensible || 0) / 22);
    const hillX0 = attacking ? this.W - 5 : 1;
    for (let i = 0; i < nHills * 3 && hills.length < nHills; i++) {
      const x = U.ri(hillX0, hillX0 + 3), y = U.ri(0, this.H - 1);
      if (!hills.some(h => h.x === x && h.y === y) && !obstacles.some(o => o.x === x && o.y === y)) {
        hills.push({ x, y });
      }
    }

    const spotsL = U.shuffle(this.spawnSpots(0, 2));
    const spotsR = U.shuffle(this.spawnSpots(this.W - 2, this.W));

    party.forEach((p, i) => {
      const stats = DATA.COMBAT[p.job] || DATA.COMBAT.korilane;
      const lvl = Person.skill(p, "voit");
      const u = {
        id: uid++, side: "meie", kind: p.job, name: p.name, pid: p.id,
        hp: stats.hp + lvl, maxhp: stats.hp + lvl,
        range: stats.range, hit: Math.min(0.92, stats.hit + lvl * 0.05 + Person.jobSkill(p) * 0.02),
        lo: stats.lo, hi: stats.hi, move: stats.move, wpn: stats.wpn,
        x: spotsL[i % spotsL.length].x, y: spotsL[i % spotsL.length].y,
        acted: false, moved: false, fled: false,
      };
      if (Sim.relicBearer("karukapp") && Sim.relicBearer("karukapp").id === p.id) { u.lo += 2; u.hi += 2; u.karukapp = true; }
      if (Sim.relicBearer("harpuun") && Sim.relicBearer("harpuun").id === p.id) { u.range = Math.max(u.range, 4); u.hi += 1; }
      if (Sim.relicBearer("peakate") && Sim.relicBearer("peakate").id === p.id) { u.hit = Math.min(0.95, u.hit + 0.08); }
      units.push(u);
    });

    // sepistatud varustus: parimad relvad-turvised jagatakse rivikorras (sõdalased ees)
    const weapons = G.gear.filter(g => g.kind === "relv").sort((a, b) => b.dur - a.dur);
    const armors = G.gear.filter(g => g.kind === "turvis").sort((a, b) => b.dur - a.dur);
    units.filter(u => u.side === "meie").forEach((u, i) => {
      if (weapons[i]) {
        u.lo += DATA.GEAR.WEAPON.lo; u.hi += DATA.GEAR.WEAPON.hi;
        u.hit = Math.min(0.95, u.hit + DATA.GEAR.WEAPON.hit);
        u.gearW = weapons[i].id;
      }
      if (armors[i]) {
        u.hp += DATA.GEAR.ARMOR.hp; u.maxhp += DATA.GEAR.ARMOR.hp;
        u.gearA = armors[i].id;
      }
    });

    const enemyKind = cfg.type === "hundid" ? "hunt" : "roovel";
    for (let i = 0; i < cfg.n; i++) {
      let kind = enemyKind;
      if (kind === "roovel" && U.chance(0.4)) kind = "roovel_oda";
      const stats = DATA.COMBAT[kind];
      units.push({
        id: uid++, side: "nemad", kind, name: kind === "hunt" ? "wolf" : "raider",
        pid: null, hp: stats.hp, maxhp: stats.hp,
        range: stats.range, hit: stats.hit, lo: stats.lo, hi: stats.hi, move: stats.move, wpn: stats.wpn,
        x: spotsR[i % spotsR.length].x, y: spotsR[i % spotsR.length].y,
        acted: false, moved: false, fled: false,
      });
    }

    // kes laagris veel on, peitub metsa — kui neid on, ei jää küla ka kaotuse korral lahtiseks
    const presentOthers = Math.max(0, Sim.adults().filter(p => !p.away).length - party.length);

    G.combat = {
      type: cfg.type, neighborId: cfg.neighborId ?? null, tribeName: cfg.tribeName || null,
      units, obstacles, hills, round: 1, phase: "meie",
      initialEnemies: cfg.n, enemiesKilled: 0, log: [],
      presentOthers,
      over: false, result: null,
    };
    this.clog((cfg.type === "hundid" ? "The wolves come across the snow." :
      cfg.type === "tagasitoomine" ? "Te hiilite nende laagrisse koidu eel. Reliikvia on seal." :
      cfg.type === "raid" ? "You creep into the camp of " + (cfg.tribeName || "strangers") + " before dawn." :
      "They came in the hour before dawn.") + " Every fight is dangerous, the winner's too.");
    Bridge.onCombat();
  },

  spawnSpots(x0, x1) {
    const spots = [];
    for (let x = x0; x < x1; x++) for (let y = 1; y < this.H - 1; y++) spots.push({ x, y });
    return spots;
  },

  clog(msg) {
    if (!G.combat) return;
    G.combat.log.push(msg);
    if (G.combat.log.length > 40) G.combat.log.shift();
  },

  alive(side) { return G.combat.units.filter(u => u.hp > 0 && !u.fled && (!side || u.side === side)); },

  occupied(x, y, exceptId) {
    return G.combat.units.some(u => u.hp > 0 && !u.fled && u.x === x && u.y === y && u.id !== exceptId) ||
      G.combat.obstacles.some(o => o.x === x && o.y === y);
  },

  dist(a, b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); },

  onHill(u) { return (G.combat.hills || []).some(h => h.x === u.x && h.y === u.y); },

  // laskuri tegelik ulatus: künkalt näeb kaugemale
  effRange(u) { return u.range + (u.range >= 3 && this.onHill(u) ? 1 : 0); },

  // BFS liikumisulatus
  reachable(u) {
    const seen = new Map();
    const key = (x, y) => x + "," + y;
    const q = [{ x: u.x, y: u.y, d: 0 }];
    seen.set(key(u.x, u.y), 0);
    const out = [];
    while (q.length) {
      const c = q.shift();
      if (c.d >= u.move) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = c.x + dx, ny = c.y + dy;
        if (nx < 0 || ny < 0 || nx >= this.W || ny >= this.H) continue;
        if (seen.has(key(nx, ny))) continue;
        if (this.occupied(nx, ny, u.id)) continue;
        seen.set(key(nx, ny), c.d + 1);
        out.push({ x: nx, y: ny });
        q.push({ x: nx, y: ny, d: c.d + 1 });
      }
    }
    return out;
  },

  moveTo(u, x, y) {
    if (u.moved || u.hp <= 0) return false;
    if (!this.reachable(u).some(t => t.x === x && t.y === y)) return false;
    u.x = x; u.y = y; u.moved = true;
    return true;
  },

  attack(u, target) {
    if (u.acted || u.hp <= 0 || target.hp <= 0) return false;
    if (this.dist(u, target) > this.effRange(u)) return false;
    u.acted = true;
    let hitP = u.hit;
    if (u.range >= 3 && this.onHill(u)) hitP += 0.05; // kõrgelt näeb paremini
    if (target.karukapp) hitP -= 0.10; // karu käpp: vastased kõhklevad
    if (U.chance(hitP)) {
      const dmg = U.ri(u.lo, u.hi);
      target.hp -= dmg;
      this.clog(u.name + " (" + u.wpn + ") hit " + target.name + " for −" + dmg + ".");
      if (target.hp <= 0) this.unitDown(target, u);
    } else {
      this.clog(u.name + " (" + u.wpn + ") missed.");
    }
    this.checkEnd();
    return true;
  },

  unitDown(target, killer) {
    if (target.side === "nemad") {
      G.combat.enemiesKilled++;
      G.stats.kills++;
      this.clog(target.name + " is down.");
      if (killer && killer.pid !== null) {
        const p = G.people.find(p => p.id === killer.pid);
        if (p) Person.addXP(p, "voit", 100);
      }
    } else {
      const p = G.people.find(p => p.id === target.pid);
      this.clog(target.name + " IS DOWN.");
      if (p) Sim.killPerson(p, G.combat.type === "hundid" ? "taken by wolves" :
        G.combat.type === "raid" ? "fell on the raid" : "fell in battle");
    }
  },

  // üksus põgeneb servalt
  fleeUnit(u) {
    u.fled = true;
    this.clog(u.name + " fled.");
    this.checkEnd();
  },

  endPlayerTurn() {
    if (!G.combat || G.combat.over) return;
    G.combat.phase = "nemad";
    this.enemyPhase();
    if (!G.combat || G.combat.over) return;
    G.combat.round++;
    G.combat.phase = "meie";
    for (const u of G.combat.units) { u.acted = false; u.moved = false; }
    if (G.combat.round > 15) this.finish("viik");
  },

  enemyPhase() {
    const c = G.combat;
    // huntide moraal: kui pool karjast langenud, põgenevad
    if (c.type === "hundid") {
      if (c.enemiesKilled >= Math.max(1, Math.ceil(c.initialEnemies / 3))) {
        this.clog("The pack breaks: the wolves vanish into the night.");
        for (const u of this.alive("nemad")) u.fled = true;
        this.checkEnd();
        return;
      }
    }
    // röövlid: kui üle poole langenud, taganevad
    if (c.type === "haarang" || c.type === "tagasitoomine" || c.type === "raid") {
      if (c.enemiesKilled > c.initialEnemies / 2) {
        this.clog("They fall back, carrying their fallen with them.");
        for (const u of this.alive("nemad")) u.fled = true;
        this.checkEnd();
        return;
      }
    }
    for (const e of this.alive("nemad")) {
      const targets = this.alive("meie");
      if (!targets.length) break;
      targets.sort((a, b) => this.dist(e, a) - this.dist(e, b));
      const t = targets[0];
      // liigu lähemale, kui pole ulatuses (BFS, et takistused ei blokeeriks)
      if (this.dist(e, t) > this.effRange(e)) {
        const reach = this.reachable(e);
        if (reach.length) {
          reach.sort((a, b) =>
            (this.dist(a, t) - this.dist(b, t)) ||
            ((Math.abs(a.x - t.x) + Math.abs(a.y - t.y)) - (Math.abs(b.x - t.x) + Math.abs(b.y - t.y))));
          const best = reach[0];
          if (this.dist(best, t) < this.dist(e, t)) { e.x = best.x; e.y = best.y; }
        }
      }
      if (this.dist(e, t) <= this.effRange(e)) this.attack(e, t);
      if (!G.combat || G.combat.over) return;
    }
  },

  checkEnd() {
    const c = G.combat;
    if (!c || c.over) return;
    if (!this.alive("nemad").length) this.finish("voit");
    else if (!this.alive("meie").length) {
      // kui keegi pääses eluga, on see taganemine, mitte hukk
      const escaped = c.units.some(u => u.side === "meie" && u.hp > 0 && u.fled);
      this.finish(escaped ? "pogenemine" : "kaotus");
    }
  },

  fleeAll() {
    if (!G.combat || G.combat.over) return;
    for (const u of this.alive("meie")) u.fled = true;
    this.finish("pogenemine");
  },

  finish(result) {
    const c = G.combat;
    if (!c || c.over) return;
    c.over = true;
    c.result = result;

    // varustus kulub iga lahinguga; katkine visatakse minema
    let broken = 0;
    for (const u of c.units) {
      if (u.side !== "meie") continue;
      for (const gid of [u.gearW, u.gearA]) {
        if (!gid) continue;
        const g = G.gear.find(x => x.id === gid);
        if (!g) continue;
        g.dur -= DATA.GEAR.WEAR_PER_FIGHT;
        if (g.dur <= 0) { G.gear.splice(G.gear.indexOf(g), 1); broken++; }
      }
    }
    if (broken > 0) Sim.log(broken + " pieces of gear broke in the fight. The crafter needs new finds.", "bad");

    // haavad ellujäänutele
    for (const u of c.units) {
      if (u.side !== "meie" || u.hp <= 0) continue;
      const p = G.people.find(p => p.id === u.pid);
      if (p && p.alive && u.hp < u.maxhp * 0.6) {
        p.wound = Math.max(p.wound, U.ri(10, 20));
      }
    }

    const nb = c.neighborId !== null ? G.neighbors[c.neighborId] : null;

    if (c.type === "raid") {
      this.finishRaid(result, c);
      return;
    }

    if (result === "voit") {
      if (c.type === "hundid") {
        Sim.addFresh(8);
        G.sec = Math.min(100, G.sec + 8);
        Sim.log("The wolves are beaten. A couple of carcasses left on the snow: 8 meat. People sleep better tonight.", "good");
      } else if (c.type === "tagasitoomine") {
        const st = G.stolenRelic;
        if (st) {
          G.relics.push({ key: st.key, name: st.name, origin: "Taken back in blood (" + Sim.dateText() + ")", bearerId: null });
          G.stolenRelic = null;
        }
        G.faith = Math.min(100, G.faith + 10);
        G.rep = Math.min(100, G.rep + 6);
        Sim.log("The relic is back. That night will be talked about for a long time — your people with pride, theirs with anger.", "good");
      } else {
        G.rep = Math.min(100, G.rep + 8);
        G.faith = Math.min(100, G.faith + 4);
        G.sec = Math.min(100, G.sec + 10);
        Sim.log("The raid was beaten back. The stores are still yours. That story travels.", "good");
      }
    } else if (result === "pogenemine") {
      // haarangu eest põgenemine: vastane otsustab, kas saata skaut jälgi lugema
      if (c.type === "haarang" && (nb || c.tribeName) && U.chance(0.5)) {
        G.pursuit = { neighborId: nb ? nb.id : null, tribeName: c.tribeName, days: U.ri(6, 15) };
        Sim.log("Someone stayed behind to read your tracks. If the trail leads home, they come at once — or not at all.", "bad");
      }
      if (c.type === "hundid") {
        const loss = Math.round(Sim.foodTotal() * 0.25);
        Sim.consumeFood(loss);
        Sim.log("You fled into the dark. The wolves took " + loss + " food. But everyone is alive, and that counts.", "bad");
      } else if (c.type === "tagasitoomine") {
        G.faith = Math.max(0, G.faith - 8);
        Sim.log("A retreat. The relic stayed in their hands. Nobody says anything, but everyone is thinking the same thing.", "bad");
      } else {
        this.raidLoss();
        Sim.log("You hid in the forest. Better to lose goods than people — so they say, though they say it looking at the ground.", "bad");
      }
      G.rep = Math.max(0, G.rep - 6);
    } else if (result === "kaotus") {
      if (c.type === "hundid") {
        const loss = Math.round(Sim.foodTotal() * 0.25);
        Sim.consumeFood(loss);
        Sim.log("The wolves got what they came for.", "bad");
      } else if (c.type === "tagasitoomine") {
        G.faith = Math.max(0, G.faith - 12);
        Sim.log("The raid ended in blood and empty hands.", "bad");
      } else {
        this.raidLoss();
      }
      G.rep = Math.max(0, G.rep - 10);
    } else if (result === "viik") {
      Sim.log("The dark separated them. Neither side won, both lost.", "bad");
    }

    // veretasu: tapetud vastased jätavad kohustuse (kui on veel keegi, kes seda kannab)
    if (nb && c.enemiesKilled > 0 && c.type !== "hundid" && !G.over) {
      nb.att = Math.max(0, nb.att - 12 * c.enemiesKilled);
      nb.debts.push("We killed " + c.enemiesKilled + " of theirs (" + Sim.seasonName() + ", year " + G.year + ")");
      const wantsVengeance = U.chance(0.55);
      G.combat = null;
      Bridge.onCombatEnd && Bridge.onCombatEnd();
      Sim.emit({
        title: "Blood calls for blood",
        body: "You killed " + c.enemiesKilled + " of theirs. " + nb.name + " will not forget it — every death is a debt with a name on it, and it does not clear itself.\n\nThe debt can be settled three ways, and two of them cost.",
        choices: [
          { label: "Send compensation (25 food)", sub: "Expensive, but it ends the spiral", fx: () => {
            if (Sim.foodTotal() >= 25) {
              Sim.consumeFood(25);
              nb.att = Math.min(100, nb.att + 20);
              nb.vengeance = false;
              nb.debts.push("Compensation paid (year " + G.year + ")");
              Sim.log("The compensation was carried to them and accepted. The blood is paid for. This time.", "evt");
            } else {
              nb.vengeance = wantsVengeance;
              Sim.log("There was not enough food for compensation. The debt hangs in the air.", "bad");
            }
          } },
          { label: "Pay nothing", sub: "Cheap today. Costly later.", fx: () => {
            nb.vengeance = wantsVengeance;
            Sim.log("You sent nothing. The young men praised you. The old ones looked into the fire and said nothing.", "evt");
          } },
        ],
        def: 0,
      });
      Bridge.onStateChange();
      return;
    }

    G.combat = null;
    Bridge.onCombatEnd && Bridge.onCombatEnd();
    Bridge.onStateChange();
  },

  // Loot skaleerub kaitsja kohalolekuga: kui keegi jäi ellu või peitu, ei jää küla
  // lahtiseks (röövlid võtavad, mida kanda jõuavad, ja langenutelt). Kui laagris olid
  // AINULT need viis ja kõik langesid/põgenesid, on küla paljas — loot on ränk.
  raidLoss() {
    const c = G.combat;
    const survivors = c ? c.units.filter(u => u.side === "meie" && u.hp > 0 && !u.fled).length : 0;
    const hiding = c ? (c.presentOthers || 0) : 0;
    const bare = survivors + hiding <= 0;
    const frac = bare ? 0.55 : 0.2;
    const relicP = bare ? 0.6 : 0.25;
    const loss = Math.round(Sim.foodTotal() * frac);
    Sim.consumeFood(loss);
    let extra = "";
    if (G.relics.length && !G.stolenRelic && U.chance(relicP)) {
      const r = U.pick(G.relics);
      G.relics.splice(G.relics.indexOf(r), 1);
      G.stolenRelic = { key: r.key, name: r.name, neighborId: c ? c.neighborId : 0 };
      extra = " They carried off a relic: " + r.name + "!";
      G.faith = Math.max(0, G.faith - 12);
    }
    Sim.log(bare
      ? "The camp was left truly open. They emptied it at their leisure: " + loss + " food." + extra
      : "They took what they could carry: " + loss + " food. The people hidden in the forest held their breath." + extra, "bad");
  },

  // Sõjaretke tulemus. Saak tuleb LANGENUTELT (rõivad, varustus); suur loot ainult
  // siis, kui küla jäi päriselt lahtiseks — väike küla paneb kõik välja, suurel
  // peitub ülejäänud rahvas metsa. Kaotuse/põgenemise järel võidakse teid jälitada.
  finishRaid(result, c) {
    const op = G.raidOp;
    const village = op ? op.village : { name: c.tribeName || "the camp", pop: 10 };

    if (result === "voit") {
      const carry = Math.max(1, c.units.filter(u => u.side === "meie" && u.hp > 0 && !u.fled).length) * DATA.RAIDOP.CARRY_PER_RAIDER;
      // langenute rõivad-varustus
      let hides = c.enemiesKilled;
      let food = c.enemiesKilled * U.rf(1, 3);
      // paljas küla? väike paneb kõik välja, suur peidab ülejäänud rahva
      const bare = U.chance(U.clamp(1 - (village.pop - 8) / 20, 0.1, 0.9));
      if (bare) {
        food += Math.min(carry, village.pop * U.rf(4, 8));
        hides += U.ri(3, 7);
      } else {
        food += Math.min(carry / 2, village.pop * U.rf(1, 2));
      }
      food = Math.min(food, carry);
      let relicKey = null;
      if (bare && U.chance(0.25)) {
        const missing = Object.keys(DATA.RELICS).filter(k => !G.relics.some(r => r.key === k) &&
          (!G.stolenRelic || G.stolenRelic.key !== k));
        if (missing.length) relicKey = U.pick(missing);
      }
      // langenute relvad: pooleldi kulunud, aga relvad
      const lootedWeapons = Math.round(c.enemiesKilled / 2);
      for (let i = 0; i < lootedWeapons; i++) {
        G.gear.push({ id: G.nextGearId++, kind: "relv", dur: DATA.GEAR.RAID_LOOT_DUR });
      }
      if (op) op.loot = { food, hides, relicKey, bare, weapons: lootedWeapons };
      G.rep = Math.min(100, G.rep + 4);
      G.stats.raidsMade = (G.stats.raidsMade || 0) + 1;
      G.score += DATA.SCORE.RAID;
      Sim.log("The camp is yours. " + (bare ? village.name + " was left truly open — you take what you can carry." :
        "The rest of them vanished into the forest; you take what you can off the fallen.") + " Now home, before anyone follows.", "good");
    } else {
      // kaotus või põgenemine: tühjade kätega, ja keegi võib jälgi lugema jääda
      if (U.chance(DATA.RAIDOP.TRACK_P)) {
        G.pursuit = { neighborId: null, tribeName: village.name, days: U.ri(6, 15) };
        Sim.log("You pulled back. Someone from " + village.name + " stayed to read your tracks.", "bad");
      } else {
        Sim.log("You pulled back. The forests are wide and the tracks were lost — this time.", "bad");
      }
      G.rep = Math.max(0, G.rep - 4);
    }

    // tagasitee: ellujäänud (ka põgenenud) tulevad koju
    if (op) {
      const anyAlive = op.members.some(id => { const p = G.people.find(q => q.id === id); return p && p.alive; });
      if (anyAlive) {
        op.phase = "tulek";
        op.days = op.dist;
      } else {
        G.raidOp = null;
        Sim.log("Nobody came back from the raid. The camp waited for nothing.", "bad");
      }
    }
    G.combat = null;
    Bridge.onCombatEnd && Bridge.onCombatEnd();
    Bridge.onStateChange();
  },

  // automaatlahendus: lihtne AI mõlemale poolele
  autoResolve() {
    const c = G.combat;
    if (!c) return;
    let guard = 0;
    while (!c.over && guard < 40) {
      guard++;
      // meie üksuste lihtne AI: tugevad võitlevad, nõrgad hoiavad eemale
      for (const u of this.alive("meie")) {
        const targets = this.alive("nemad");
        if (!targets.length) break;
        targets.sort((a, b) => this.dist(u, a) - this.dist(u, b));
        const t = targets[0];
        const weak = u.hi <= 2; // korilane, meister: kivi käes
        const hurt = u.hp < u.maxhp * 0.35;
        if ((weak || hurt) && this.dist(u, t) <= 3) {
          // tagane vastasest kaugemale; servalt põgene
          const reach = this.reachable(u);
          reach.sort((a, b) => this.dist(b, t) - this.dist(a, t));
          if (reach.length && this.dist(reach[0], t) > this.dist(u, t)) {
            u.x = reach[0].x; u.y = reach[0].y; u.moved = true;
          } else if (hurt) { this.fleeUnit(u); continue; }
        } else if (this.dist(u, t) > this.effRange(u)) {
          const reach = this.reachable(u);
          reach.sort((a, b) =>
            Math.max(Math.abs(a.x - t.x), Math.abs(a.y - t.y)) - Math.max(Math.abs(b.x - t.x), Math.abs(b.y - t.y)));
          // kaugvõitleja liigub ainult ulatusse (künkaruut ees), mitte ligemale
          const inRange = reach.filter(r => Math.max(Math.abs(r.x - t.x), Math.abs(r.y - t.y)) <= u.range);
          const best = inRange.find(r => (c.hills || []).some(h => h.x === r.x && h.y === r.y)) ||
            inRange[0] || (u.range <= 1 ? reach[0] : null);
          if (best) { u.x = best.x; u.y = best.y; u.moved = true; }
        }
        if (!u.acted && this.dist(u, t) <= this.effRange(u)) this.attack(u, t);
        if (c.over) break;
      }
      if (c.over) break;
      this.endPlayerTurn();
    }
    if (!c.over) this.finish("viik");
  },
};
