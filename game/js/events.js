// events.js — sündmused, naabrid, haarangud. DOM-vaba (Bridge'i kaudu).
"use strict";

const Events = {

  // ---------- iga päev ----------
  daily() {
    if (G.over || G.combat) return;

    // planeeritud talvesündmused
    if (G.season === 3) {
      const due = G.winterPlan.filter(w => w.day === G.sday);
      for (const w of due) this.fireWinter(w.type);
    }

    // pagulased (kevadel, planeeritud päeval)
    if (G.season === 0) this.checkRefugees();

    // esimene kontakt naabriga (1. aasta suvi/sügis)
    if (!G.flags.contact[0] && G.day > 20 && U.chance(0.02)) {
      G.flags.contact[0] = true;
      const n = G.neighbors[0];
      n.known = true;
      G.sites[n.siteId].known = Math.max(G.sites[n.siteId].known, 1);
      Sim.emit({
        title: "Smoke on the horizon",
        body: "The hunters saw smoke far off and strange tracks on the paths. You are not alone here.\n\n" +
          n.name + " live in a place called " + G.sites[n.siteId].name + ". They know of you now too.",
        choices: [{ label: "We will remember it", fx: () => {} }],
        def: 0,
      });
    }

    // teine naaber ilmub hiljem
    if (!G.flags.contact[1] && G.year >= 2 && U.chance(0.008)) {
      G.flags.contact[1] = true;
      const n = G.neighbors[1];
      n.known = true;
      G.sites[n.siteId].known = Math.max(G.sites[n.siteId].known, 1);
      Sim.log("A trader spoke of a people called " + n.name + ". They are said to live at " + G.sites[n.siteId].name + ".", "evt");
    }

    // rändaja / liituja (suvi ja sügis); väikese rühmaga liitutakse kergemini
    if ((G.season === 1 || G.season === 2) &&
        U.chance(0.006 + (G.rep > 50 ? 0.006 : 0) + (Sim.pop() <= DATA.SMALL_BAND_POP ? 0.008 : 0) +
                 (Sim.pop() < 12 ? 0.010 : 0))) {
      this.wanderer();
    }

    // kaupleja
    if (G.season !== 3 && U.chance(0.004) && G.neighbors.some(n => n.known && n.att > 45)) {
      this.trader();
    }

    // metssiga rüüstab (sügis)
    if (G.season === 2 && U.chance(0.006) && (Sim.freshTotal() > 20 || G.dried > 20)) {
      const loss = Math.round((Sim.freshTotal() + G.dried) * U.rf(0.05, 0.12));
      Sim.consumeFood(loss);
      Sim.log("A boar was in the stores at night: " + loss + " food lost. A fence would help.", "bad");
    }

    // liha peitmine (sotsiaalne kriis, kord mängus)
    if (!G.flags.meatHidden && G.hungerRecent > 6 && Sim.pop() >= 8 && U.chance(0.02)) {
      this.meatHiding();
    }

    // haarang: kontroll kord hooajas juhuslikul päeval
    if ((G.season === 2 || G.season === 3) && G.sday === (G.raidCheckDay || 22)) {
      this.raidCheck();
    }
  },

  // ---------- hooaja alguses ----------
  seasonRolls() {
    G.raidCheckDay = U.ri(10, 28);

    // pagulased (kevad, alates 2. aastast)
    if (G.season === 0 && G.year >= 2 && U.chance(0.25)) {
      // lükka mõnele päevale
      G.refugeeDay = U.ri(5, 25);
    } else G.refugeeDay = null;

    // kliimašokk (haruldane, alates 4. aastast, kord mängus)
    if (G.season === 0 && G.year >= 4 && !G.flags.climateShock && U.chance(0.15)) {
      G.flags.climateShock = true;
      for (const s of G.sites) {
        for (let r = 0; r < 3; r++) { s.max[r] *= 0.8; s.points[r] = Math.min(s.points[r], s.max[r]); }
      }
      Sim.emit({
        title: "The weather has changed",
        body: "The old ones do not remember a spring this late. The birds came at the wrong time, the ice went out late.\n\nSomething in the world has shifted, and it will not shift back. Every place is poorer now than it was.\n\n(The richness of every site has fallen for good.)",
        choices: [{ label: "Hard years are coming", fx: () => {} }],
        def: 0,
      });
    }

    // šamaanita hõimule ilmub kandidaat: tõenäosus kasvab iga hooajaga
    if (!Sim.adults().some(p => p.job === "samaan") && Sim.pop() >= 7) {
      G.flags.shamanWait = (G.flags.shamanWait || 0) + 1;
    } else G.flags.shamanWait = 0;
    if (G.flags.shamanWait > 0 && U.chance(0.12 + G.flags.shamanWait * 0.1)) {
      const cand = Sim.adults().filter(p => !p.away && p.job !== "samaan");
      if (cand.length) {
        const p = U.pick(cand);
        Sim.emit({
          title: "Dreams",
          body: p.name + " has dreamt three nights running of the same deer, and it speaks in human words. The old ones say this is how it begins.\n\nWill you let them walk the spirits' road? (They would give up their present work and become a shaman.)",
          choices: [
            { label: "Let them. We need someone who knows the spirits.", fx: () => { p.job = "samaan"; Sim.log(p.name + " is a shaman now.", "evt"); } },
            { label: "No. There is work to do and dreams are dreams.", sub: "Faith falls a little.", fx: () => { G.faith = Math.max(0, G.faith - 6); } },
          ],
          def: 0,
        });
      }
    }
  },

  // pagulaste saabumine (kontrollitakse kevadpäeval)
  checkRefugees() {
    if (G.refugeeDay && G.sday === G.refugeeDay) {
      G.refugeeDay = null;
      this.refugees();
    }
  },

  // ---------- talve planeerimine ----------
  scheduleWinter() {
    G.winterPlan = [];
    const plan = [];
    const quiet = U.chance(0.12);
    const pool = [];
    pool.push("hundid");
    if (U.chance(0.7)) pool.push("kylmalaine");
    if (U.chance(0.35 + Sim.pop() * 0.01 + (G.stats.moves === 0 ? 0.1 : 0))) pool.push("haigus");
    if (U.chance(0.4)) pool.push("varud");
    if (U.chance(0.5)) pool.push("randaja");
    const count = quiet ? 1 : U.ri(3, 4);
    const chosen = U.shuffle(pool).slice(0, count);
    const days = U.shuffle([5, 9, 13, 17, 21, 25]).slice(0, chosen.length).sort((a, b) => a - b);
    chosen.forEach((type, i) => plan.push({ day: days[i], type }));
    G.winterPlan = plan;
    if (quiet) G.winterQuiet = true; else G.winterQuiet = false;
  },

  fireWinter(type) {
    if (type === "hundid") {
      // kari on suurem seal, kus on rohkem lõhna ja jäätmeid
      const wolves = U.clamp(Math.round(Sim.pop() / 3) + U.ri(0, 1), 2, 6) - (Sim.curSite().b.tara ? 1 : 0);
      G.wolfPressure = 5;
      const fighters = Sim.adults().filter(p => Person.canWork(p) && !p.away &&
        ["sodalane", "kytt", "kalur"].includes(p.job)).length;
      Sim.emit({
        title: "Hundid",
        body: "There are eyes around the fire tonight. The pack is hungry and your smell is food to them.\n\n" +
          "There are " + wolves + " of them. The ring 2 and 3 workers are far off and cannot help." +
          (fighters < 2 ? "\n\nThere are few real fighters in camp (" + fighters + ")." : ""),
        choices: [
          { label: "We meet them", sub: "Turn-based defence", fx: () => Combat.start({ type: "hundid", n: wolves }) },
          { label: "We give up part of the stores", sub: "Lose 20% of your food, the wolves go", fx: () => {
            const loss = Math.round(Sim.foodTotal() * 0.2);
            Sim.consumeFood(loss);
            G.sec = Math.max(0, G.sec - 8);
            Sim.log("The wolves took " + loss + " food and vanished into the dark. Nobody slept that night.", "bad");
          } },
        ],
        def: fighters >= 3 ? 0 : 1,
      });
    } else if (type === "kylmalaine") {
      G.coldSnap = 5;
      Sim.log("COLD SNAP: five days of cutting frost. Food goes faster and anyone without clothes suffers.", "bad");
    } else if (type === "haigus") {
      const n = Math.max(1, Math.round(Sim.pop() * U.rf(0.2, 0.4)));
      const victims = U.shuffle(Sim.alive()).slice(0, n);
      for (const v of victims) {
        v.sick = { name: "fever", days: U.ri(5, 10) };
        if ((v.child || v.age >= 45) && U.chance(Sim.hasShaman() ? 0.06 : 0.15)) {
          Sim.killPerson(v, "died of fever");
        }
      }
      Sim.log("Sickness is going round the camp: " + n + " people are in fever. Living close together brought it.", "bad");
    } else if (type === "varud") {
      const loss = Math.round(G.dried * U.rf(0.1, 0.2));
      if (loss > 0) {
        G.dried -= loss;
        Sim.log("Damp and vermin got into the stores: " + loss + " of the dried food is ruined.", "bad");
      }
    } else if (type === "randaja") {
      this.frozenWanderer();
    }
  },

  // ---------- inimeste tulek ----------
  wanderer() {
    const small = Sim.pop() < 10;
    if (Sim.foodTotal() < Sim.dailyNeed() * (small ? 6 : 8)) return; // näljas hõimuga ei liituta

    // Väikese rühmaga liitub KOGENUD rändaja: üksi rändab siin maailmas läbi ainult
    // see, kes oskab. (Simuleeritud: see viib rühma 10-ni ~3. aastaks.)
    if (small) {
      const dom = U.pick(["kor", "kala", "jaht"]);
      const lvl = U.ri(1, 2);
      const p = Person.create({ id: G.nextId++, age: U.ri(20, 42) });
      p.xp[dom] = lvl * DATA.XP_PER_LEVEL;
      p.job = dom === "kor" ? "korilane" : dom === "kala" ? "kalur" : "kytt";
      Sim.emit({
        title: "A wanderer",
        body: p.name + " stands at the edge of camp. They have walked alone a long time — and the fact that they are alive " +
          "speaks for itself: their hands know " + DATA.DOM_NAMES[dom] + ".\n\n" +
          "A small band is as much luck for a wanderer as the wanderer is for you.",
        choices: [
          { label: "We take them in", fx: () => {
            p.pos = { x: 100, y: 300, tx: 480, ty: 320, wander: 0 };
            G.people.push(p);
            G.stats.joins++;
            Sim.log(p.name + " joined the band, skilled in " + DATA.DOM_NAMES[dom] + ".", "good");
          } },
          { label: "Send them away", sub: "Renown falls a little", fx: () => {
            G.rep = Math.max(0, G.rep - 4);
            Sim.log("The wanderer was sent away. They went, and their skills went with them.", "evt");
          } },
        ],
        def: 0,
      });
      return;
    }

    let quality, desc;
    if (G.rep >= 70) {
      quality = 2;
      desc = "They move like someone who knows what they are doing. Your renown reached them.";
    } else if (G.rep >= 45) {
      quality = 1;
      desc = "An ordinary wanderer, tired but sound.";
    } else {
      quality = 0;
      desc = "Thin, and coughing. Nobody else took them in.";
    }
    const doms = ["kor", "kala", "jaht", "voit", "meister", "skaut"];
    const dom = U.pick(doms);
    const p = Person.create({ id: G.nextId++, age: U.ri(17, 45) });
    p.xp[dom] = quality * DATA.XP_PER_LEVEL;
    if (quality === 0 && U.chance(0.5)) p.sick = { name: "exhaustion", days: U.ri(3, 6) };
    const domName = DATA.DOM_NAMES[dom];
    Sim.emit({
      title: "A wanderer",
      body: p.name + " stands at the edge of camp, waiting. " + desc +
        (quality === 2 ? "\n\nTheir hands speak of skill: " + domName + "." : "") +
        "\n\nOne more mouth, but also two more hands.",
      choices: [
        { label: "We take them in", fx: () => {
          p.pos = { x: 100, y: 300, tx: 480, ty: 320, wander: 0 };
          G.people.push(p);
          G.stats.joins++;
          Sim.log(p.name + " joined the band." + (quality === 2 ? " Skilled in " + domName + "." : ""), "good");
        } },
        { label: "Send them away", sub: "Renown falls a little", fx: () => {
          G.rep = Math.max(0, G.rep - 4);
          Sim.log("The wanderer was sent away. They went, and their story of you went with them.", "evt");
        } },
      ],
      def: Sim.foodTotal() > Sim.dailyNeed() * 15 ? 0 : 1,
    });
  },

  frozenWanderer() {
    const p = Person.create({ id: G.nextId++, age: U.ri(20, 50) });
    const skilled = U.chance(0.4);
    if (skilled) p.xp[U.pick(["kor", "kala", "jaht", "meister"])] = DATA.XP_PER_LEVEL * U.ri(1, 2);
    p.sick = { name: "frostbite", days: U.ri(4, 8) };
    Sim.emit({
      title: "A frozen wanderer",
      body: "Someone has come out of the snow to your door. Half dead, but alive.\n\n" +
        "Take them in and they eat your stores and may never rise at all. Leave them out and they are dead by morning.",
      choices: [
        { label: "Bring them in", sub: "They eat, but may be skilled", fx: () => {
          p.pos = { x: 480, y: 340, tx: 480, ty: 330, wander: 0 };
          G.people.push(p);
          G.stats.joins++;
          G.faith = Math.min(100, G.faith + 4);
          Sim.log(p.name + " was brought to the fire. Whether any good comes of it, spring will show.", "evt");
        } },
        { label: "Leave them out", sub: "Renown and faith fall", fx: () => {
          G.rep = Math.max(0, G.rep - 6);
          G.faith = Math.max(0, G.faith - 5);
          Sim.log("They were left outside. In the morning there was silence at the door and nobody met anyone's eyes.", "bad");
        } },
      ],
      def: G.dried > Sim.dailyNeed() * 12 ? 0 : 1,
    });
  },

  refugees() {
    const n = U.ri(3, 8);
    const group = [];
    for (let i = 0; i < n; i++) {
      const child = U.chance(0.35);
      const p = Person.create({ id: G.nextId++, child, age: child ? U.ri(3, 10) : U.ri(16, 45), childLeft: child ? U.ri(4, 10) : 0 });
      if (!child && U.chance(0.3)) p.xp[U.pick(["kor", "kala", "jaht", "voit"])] = DATA.XP_PER_LEVEL;
      group.push(p);
    }
    const kids = group.filter(p => p.child).length;
    Sim.emit({
      title: "Refugees from the north",
      body: n + " people, " + kids + " of them children, with nothing. Their home is finished — hunger or a feud, they do not say which.\n\n" +
        "They are hands. They are mouths. They are future kin or future enemies.",
      choices: [
        { label: "We take them all in", sub: "+" + n + " people, faith rises, food goes", fx: () => {
          group.forEach((p, i) => { p.pos = { x: 60 + i * 14, y: 300, tx: 440 + i * 12, ty: 330, wander: 0 }; G.people.push(p); });
          G.stats.joins += n;
          G.faith = Math.min(100, G.faith + 6);
          G.rep = Math.min(100, G.rep + 5);
          Sim.log(n + " refugees were taken in. The camp is tighter and louder, but hearts are warmer.", "good");
        } },
        { label: "Only the working hands", sub: "The adults stay, the children and the weak are sent on. Faith falls.", fx: () => {
          const adults = group.filter(p => !p.child);
          adults.forEach((p, i) => { p.pos = { x: 60 + i * 14, y: 300, tx: 440 + i * 12, ty: 330, wander: 0 }; G.people.push(p); });
          G.stats.joins += adults.length;
          G.faith = Math.max(0, G.faith - 10);
          Sim.log(adults.length + " were taken in, the rest sent on. Nobody sang that evening.", "bad");
        } },
        { label: "Send them all on", sub: "Faith and renown fall", fx: () => {
          G.faith = Math.max(0, G.faith - 8);
          G.rep = Math.max(0, G.rep - 6);
          Sim.log("The refugees were sent on. Their tracks in the snow were still there next morning.", "bad");
        } },
      ],
      def: Sim.foodTotal() > Sim.dailyNeed() * 20 ? 0 : 2,
    });
  },

  trader() {
    const n = G.neighbors.find(n => n.known && n.att > 45);
    if (!n) return;
    const offers = [];
    // toit <-> materjal
    offers.push({ label: "10 hides → amber stone (relic)", ok: () => G.hides >= 10 && !G.relics.some(r => r.key === "merevaik"),
      fx: () => { G.hides -= 10; Sim.gainRelic("merevaik", null, "Got from a trader: a stone that has travelled further than any ancestor of yours."); } });
    offers.push({ label: "15 food → 10 timber", ok: () => Sim.foodTotal() >= 15,
      fx: () => { Sim.consumeFood(15); G.mat += 10; Sim.log("A trade was made: food for timber.", "evt"); } });
    offers.push({ label: "4 hides → 12 dried food", ok: () => G.hides >= 4,
      fx: () => { G.hides -= 4; G.dried += 12; Sim.log("A trade was made: hides for food.", "evt"); } });
    const valid = offers.filter(o => o.ok());
    const choices = valid.map(o => ({ label: o.label, fx: o.fx }));
    choices.push({ label: "No trade today", fx: () => {} });
    Sim.emit({
      title: "A trader from " + n.name,
      body: "They spread their goods out on a hide and wait. Trading is also listening to news: they talk of paths, of weather, and of who lives where.",
      choices,
      def: choices.length - 1,
    });
    n.att = Math.min(100, n.att + 2);
  },

  // ---------- sotsiaalsed kriisid ----------
  meatHiding() {
    G.flags.meatHidden = true;
    const suspects = Sim.adults().filter(p => !p.away);
    if (!suspects.length) return;
    const culprit = U.pick(suspects);
    Sim.emit({
      title: "Someone has been hiding meat",
      body: "Dried meat was found hidden under " + culprit.name + "'s bed. Hunger makes an animal of a person, but sharing is the law that holds you together.\n\n" +
        "The whole camp is watching you, waiting to see what you do.",
      choices: [
        { label: "Share the meat, forgive them", sub: "Faith rises, but they may try again", fx: () => {
          G.dried += 6;
          G.faith = Math.min(100, G.faith + 5);
          Sim.log("The meat was shared out and " + culprit.name + " was forgiven. Sharing is the law.", "evt");
        } },
        { label: "Drive them out", sub: "A hard lesson: safety rises, but one person fewer", fx: () => {
          G.dried += 6;
          Sim.personLeaves(culprit);
          G.faith = Math.max(0, G.faith - 3);
          G.leaveP = Math.max(0, G.leaveP - 5);
          Sim.log("The camp decided: whoever hides, goes. Nobody argued, and nobody was glad either.", "bad");
        } },
        { label: "Look the other way", sub: "Faith falls: a law nobody defends is not a law", fx: () => {
          G.faith = Math.max(0, G.faith - 8);
          Sim.log("Nothing was said about it. But everyone knows, and everyone is thinking about a hiding place of their own now.", "bad");
        } },
      ],
      def: 0,
    });
  },

  schism() {
    G.flags.schismDone = true;
    // vähemalt üks täiskasvanu jääb alati: lõhenemine ei ole väljasuremine
    const poolSize = Sim.adults().filter(p => !p.away).length;
    const leavers = Math.max(1, Math.min(Math.round(Sim.pop() * 0.4), poolSize - 1));
    if (poolSize < 3) return;
    Sim.emit({
      title: "Half the camp wants to leave",
      body: "They stand on the far side of the fire, their bundles already tied. Their case is simple: there is no living here any more. And they may be right.\n\n" +
        "About " + leavers + " people are ready to go.",
      choices: [
        { label: "Let them go", sub: "You lose " + leavers + " people and some stores, but the pressure lifts", fx: () => {
          this.removeLeavers(leavers);
          const foodShare = Math.round(Sim.foodTotal() * 0.3);
          Sim.consumeFood(foodShare);
          G.leaveP = 0;
          G.faith = Math.max(0, G.faith - 5);
          Sim.log("They went at dawn. A smaller band eats less and quarrels less. Perhaps it was right.", "evt");
        } },
        { label: "Ask them to stay", sub: "A great feast and a rite (20 food). If faith is high, they stay.", fx: () => {
          if (Sim.foodTotal() < 20) {
            Sim.log("There was not even enough food to ask with. They went.", "bad");
            this.removeLeavers(leavers);
            G.leaveP = 0;
            return;
          }
          Sim.consumeFood(20);
          if (U.chance(0.3 + G.faith / 150)) {
            G.leaveP = 5;
            G.faith = Math.min(100, G.faith + 8);
            Sim.log("They talked and ate and sang all night. In the morning the bundles were untied. This time they stayed.", "good");
          } else {
            this.removeLeavers(Math.ceil(leavers / 2));
            G.leaveP = 5;
            Sim.log("Some stayed, some went anyway. The feast softened the parting but did not stop it.", "bad");
          }
        } },
      ],
      def: 0,
    });
  },

  // viib ära kuni n täiskasvanut, jättes alati vähemalt ühe alles
  removeLeavers(n) {
    const pool = U.shuffle(Sim.adults().filter(p => !p.away));
    const take = Math.min(n, Math.max(0, pool.length - 1));
    pool.slice(0, take).forEach(p => Sim.personLeaves(p));
  },

  // ---------- haarangud ----------
  // Haarangukontroll: sihtimine käib AINULT nähtavuse järgi (rahvaarv, rikkus,
  // ehitised, peod). Ründaja on enamasti võõras hõim, kes genereeritakse SELLE
  // hetke valemiga — taustal ei simuleerita kedagi. Suurus sõltub sinu omast:
  // sind märkavad kõige tõenäolisemalt umbes sama suured.
  raidCheck() {
    if (G.journey) return;

    let neighborId = null, tribeName = null, n = 0, reason = "";

    // kättemaks (AI-naabrid; SP-mehaanika saatus otsustatakse etapis 5)
    const avenger = G.neighbors.find(nb => nb.known && nb.vengeance);
    if (avenger) {
      avenger.vengeance = false;
      avenger.raidsDone++;
      neighborId = avenger.id;
      tribeName = avenger.name;
      n = U.ri(3, 5);
      reason = "Blood called for blood — they did not forget.";
    } else {
      const vis = Sim.visibility();
      const p = U.clamp((vis - DATA.VIS.RAID_BASE) / DATA.VIS.RAID_DIV, 0, DATA.VIS.RAID_MAX);
      if (!U.chance(p)) return;
      const kn = G.neighbors.filter(nb => nb.known && nb.att < 45);
      if (kn.length && U.chance(0.35)) {
        const nb = U.pick(kn);
        neighborId = nb.id;
        tribeName = nb.name;
        nb.raidsDone++;
        n = U.ri(2, 4);
        reason = "They have been watching your stores a long time.";
      } else {
        // võõras hõim: suurus sinu järgi (sind näevad omasugused)
        const theirPop = Math.max(6, Math.round(Sim.pop() * U.rf(0.8, 1.8)));
        tribeName = U.pick(TRIBE_NAMES);
        n = U.clamp(Math.round(theirPop / 4), 2, 6);
        reason = "A strange people you do not know — about " + theirPop + " souls. Your smoke and your wealth show a long way off.";
      }
    }

    Sim.emit({
      title: "Night raid!",
      body: tribeName + " came in the hour before dawn. " + reason +
        "\n\nThere are " + n + " of them. The ring 2 and 3 workers are far off and cannot help.",
      choices: [
        { label: "Defend the camp", sub: "Turn-based battle", fx: () => Combat.start({ type: "haarang", n, neighborId, tribeName }) },
        { label: "Hide in the forest", sub: "They take what they can carry", fx: () => {
          const loss = Math.round(Sim.foodTotal() * 0.3);
          Sim.consumeFood(loss);
          let extra = "";
          if (G.relics.length && !G.stolenRelic && U.chance(0.4)) {
            const r = U.pick(G.relics);
            G.relics.splice(G.relics.indexOf(r), 1);
            G.stolenRelic = { key: r.key, name: r.name, neighborId };
            extra = " THEY TOOK: " + r.name + ".";
            G.faith = Math.max(0, G.faith - 12);
          }
          G.rep = Math.max(0, G.rep - 8);
          G.sec = Math.max(0, G.sec - 10);
          Sim.log("You hid. They took " + loss + " food and left laughing." + extra, "bad");
        } },
      ],
      def: 0,
    });
  },

  // Skaut leidis raiditava küla: otsus KOHE — hiljem seda võimalust ei ole.
  raidTargetFound(village, scout) {
    const party = Sim.raidParty();
    const can = party.length >= DATA.RAIDOP.MIN_FIGHTERS;
    const wealthTxt = village.rich > Sim.pop() * 12 ? "their stores look full" :
      village.rich > Sim.pop() * 7 ? "their stores look decent" : "they live meagrely";
    const choices = [];
    if (can) {
      choices.push({ label: "Send the war party (" + party.length + ")",
        sub: village.dist + " days there and the same back. The camp is left weak meanwhile.",
        fx: () => Sim.startRaid(village) });
    }
    choices.push({ label: can ? "Leave them be" : "Cannot attack (need " + DATA.RAIDOP.MIN_FIGHTERS + " fit fighters in camp)",
      sub: "Paths change, watchmen change — this chance will not come again.",
      fx: () => { Sim.log("You chose to leave " + village.name + " be. " + scout.name + " told nobody else what they had found.", "evt"); } });
    Sim.emit({
      title: "The scout found a camp",
      body: scout.name + " saw smoke and crept closer: " + village.name + ", about " + village.pop +
        " souls, " + wealthTxt + ". " + village.defenders + " defenders showed themselves.\n\n" +
        "You can attack ONLY NOW — tomorrow the paths are different and the chance is gone.\n\n" +
        "Loot comes off the fallen: clothes, gear, sometimes a relic. If the camp is left truly open, there is far more. " +
        "Lose, and you may be tracked home.",
      choices,
      def: choices.length - 1,
    });
  },

  // sõjasalk jõudis sihtküla alla: lahing nende maastikul
  raidArrive() {
    const op = G.raidOp;
    const alive = op.members.map(id => G.people.find(p => p.id === id)).filter(p => p && p.alive);
    if (!alive.length) { G.raidOp = null; return; }
    Sim.log("The war party reached " + op.village.name + ". The hour before dawn is yours.", "evt");
    Combat.start({
      type: "raid", n: op.village.defenders,
      tribeName: op.village.name, party: op.members,
      enemyDefensible: op.village.defensible,
    });
  },

  // Jälitaja jõudis jäljerajale lõpuni: kas ta leiab su üles, ja kui leiab,
  // otsustab vastane KOHE — ründab või laseb jalga. Hiljem seda võimalust ei ole.
  resolvePursuit() {
    const pu = G.pursuit;
    G.pursuit = null;
    const name = pu.neighborId !== null ? G.neighbors[pu.neighborId].name : (pu.tribeName || "A strange band");
    if (!U.chance(0.65)) {
      Sim.log("The tracks led the pursuers into the bog and there they stayed. " + name + " never found you.", "good");
      return;
    }
    if (!U.chance(0.7)) {
      G.sec = Math.max(0, G.sec - 5);
      Sim.log("A stranger was seen near the camp at night. They watched a long time and were gone. " + name + " knows where you live now — but did not come. This time.", "bad");
      return;
    }
    const n = U.ri(3, 5);
    Sim.emit({
      title: "The tracker brought them here",
      body: name + " followed your trail for weeks and now they are here — cover is no help against someone who came along the path.\n\nThere are " + n + " of them.",
      choices: [
        { label: "Defend the camp", sub: "Turn-based battle", fx: () => Combat.start({ type: "haarang", n, neighborId: pu.neighborId, tribeName: pu.tribeName }) },
        { label: "Hide in the forest", sub: "They take what they can carry", fx: () => {
          const loss = Math.round(Sim.foodTotal() * 0.35);
          Sim.consumeFood(loss);
          G.rep = Math.max(0, G.rep - 8);
          Sim.log("You hid. Being tracked cost the camp its price: " + loss + " food.", "bad");
        } },
      ],
      def: 0,
    });
  },

    // reliikvia tagasitoomise retk (Teod-vahekaardilt)
  canRetrieve() {
    if (!G.stolenRelic) return { ok: false, why: "Nothing has been stolen." };
    const fighters = Sim.adults().filter(p => Person.canWork(p) && !p.away &&
      (p.job === "sodalane" || p.job === "kytt" || p.job === "kalur"));
    if (fighters.length < 3) return { ok: false, why: "You need 3 fit fighters (warrior/hunter/fisher)." };
    return { ok: true, fighters: fighters.slice(0, 5) };
  },

  startRetrieve() {
    const c = this.canRetrieve();
    if (!c.ok) return;
    G.stats.battles++;
    Combat.start({ type: "tagasitoomine", n: U.ri(3, 4), neighborId: G.stolenRelic.neighborId, party: c.fighters.map(p => p.id) });
  },

  // ---------- kalendrisündmused ----------
  autumnReminder() {
    const site = Sim.curSite();
    // talvel toodetakse veel natuke ise: juured, jääalune kala, talvejaht
    const winterProd = Sim.alive().filter(p => Person.canWork(p) && !p.child).reduce((s, p) => {
      const lvl = Person.jobSkill(p);
      if (p.job === "kalur") return s + DATA.YIELD.kala[lvl] * DATA.SEASON_MOD.kala[3] * (site.river ? 1 : 0.35);
      if (p.job === "kytt") return s + DATA.YIELD.jaht[lvl] * DATA.SEASON_MOD.jaht[3];
      if (p.job === "korilane") return s + DATA.YIELD.juured[lvl] * DATA.SEASON_MOD.juured[3];
      return s;
    }, 0);
    const need = Math.max(0, Math.round((Sim.dailyNeed() - winterProd) * DATA.SEASON_DAYS * 1.15));
    const have = Math.round(G.dried + Sim.freshTotal() * 0.3);
    const daysLeft = DATA.SEASON_DAYS - G.sday + 1;
    // hinnang: kuivatamise läbilase + praegune tootmine
    const projPerDay = Math.max(0, G.seasonGain / Math.max(1, G.sday) - Sim.dailyNeed());
    const proj = Math.round(have + projPerDay * daysLeft * 0.7);
    let verdict;
    if (proj >= need) verdict = "At this rate it should be enough. But a rate is a promise, not a store.";
    else verdict = "AT THIS RATE YOU WILL FALL SHORT.";
    Sim.emit({
      title: "Winter is coming",
      body: "Winter comes in " + daysLeft + " days. You have " + have + " food that will keep. You need about " + need + ".\n\n" + verdict +
        (site.cave ? "\n\nThe cave keeps you warm. You do not need to build a hut." : "") +
        (site.b.raam === 0 ? "\n\nYou have NO drying rack. Fresh food will not last until winter." : "") +
        "\n\nThe autumn moving window is open " + Math.max(0, DATA.WINDOW.SYGIS_UNTIL - G.sday + 1) + " more days.",
      choices: [{ label: "Understood", fx: () => {} }],
      def: 0,
    });
  },

  yearSummary() {
    const s = G.stats;
    const deathsThisYear = s.deaths.filter(d => d.year === G.year - 1);
    const site = Sim.curSite();
    Sim.emit({
      title: "Year " + G.year + " begins",
      body: "Winter is over. Out from under the snow come wet ground and last year's stories.\n\n" +
        "People: " + Sim.pop() + ". Died last year: " + deathsThisYear.length +
        (deathsThisYear.length ? " (" + deathsThisYear.map(d => d.name).join(", ") + ")" : "") + ".\n" +
        "The camp (" + site.name + "): ring 1 is " + Math.round(site.points[0] / site.max[0] * 100) + "% left.\n\n" +
        "Spring is the hungry season, but it is also the moving window. Stay or roam?",
      choices: [{ label: "A new year, the old questions", fx: () => {} }],
      def: 0,
    });
  },

  epilogue() {
    const s = G.stats;
    const settled = s.moves <= 1;
    const rich = Sim.foodTotal() > 200 && Sim.pop() >= 16;
    let story;
    if (settled && rich) {
      story = "You stayed. The graves bound you to the land and the stores made you the people others come to — and come to raid. Your grandchildren will build something here that you have no name for yet. They will not remember freedom, but they will not remember hunger either.";
    } else if (settled) {
      story = "You stayed, though it was not easy. The place is yours — every stone, every grave. Whether it was the right choice, nobody will tell you. That is how this age works: nobody knows, and everyone must choose anyway.";
    } else if (s.moves >= 4) {
      story = "You never stayed. A light bundle, familiar paths, stars for a roof. You are few, and nobody finds you unless you wish it. The old places remember you as the stones of a hearth, and that is all that is left of you. Perhaps that is enough.";
    } else {
      story = "You moved when you had to and stayed when you could. Neither road is yours — you walk between them, as your parents walked. The choice still stands ahead of you, again every spring.";
    }
    Sim.emit({
      title: "Eight years",
      body: "Eight years have passed since the summer when there were six of you.\n\n" + story + "\n\n" + Sim.storySummary() +
        "\n\nYou can keep playing — the world does not end, only the story has reached a full stop.",
      choices: [{ label: "I keep playing", fx: () => {} }],
      def: 0,
    });
  },
};
