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
        title: "Suits silmapiiril",
        body: "Kütid nägid kaugelt suitsu ja radadel võõraid jälgi. Te ei ole siin üksi.\n\n" +
          n.name + " elab paigas nimega " + G.sites[n.siteId].name + ". Nad teavad nüüd ka teist.",
        choices: [{ label: "Võtame teadmiseks", fx: () => {} }],
        def: 0,
      });
    }

    // teine naaber ilmub hiljem
    if (!G.flags.contact[1] && G.year >= 2 && U.chance(0.008)) {
      G.flags.contact[1] = true;
      const n = G.neighbors[1];
      n.known = true;
      G.sites[n.siteId].known = Math.max(G.sites[n.siteId].known, 1);
      Sim.log("Kaupleja rääkis rahvast nimega " + n.name + ". Nad elavat paigas " + G.sites[n.siteId].name + ".", "evt");
    }

    // rändaja / liituja (suvi ja sügis); väikese rühmaga liitutakse kergemini
    if ((G.season === 1 || G.season === 2) &&
        U.chance(0.006 + (G.rep > 50 ? 0.006 : 0) + (Sim.pop() <= DATA.SMALL_BAND_POP ? 0.008 : 0))) {
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
      Sim.log("Metssiga käis öösel varudes: " + loss + " TÜ läks kaotsi. Tara aitaks.", "bad");
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
        title: "Ilm on muutunud",
        body: "Vanad ei mäleta nii hilist kevadet. Linnud tulid valel ajal, jää läks hilja.\n\nMidagi on maailmas nihkunud ja see ei nihku tagasi. Kõik paigad on nüüd vaesemad kui enne.\n\n(Kõikide laagripaikade rikkus langes püsivalt.)",
        choices: [{ label: "Rasked ajad tulevad", fx: () => {} }],
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
          title: "Unenäod",
          body: p.name + " on kolm ööd järjest näinud unes sama hirve, kes räägib inimkeeli. Vanad ütlevad, et nii see algab.\n\nKas lubad tal minna vaimude teele? (Ta jätaks oma senise töö ja temast saaks šamaan.)",
          choices: [
            { label: "Lubame. Meil on vaimuteadjat vaja.", fx: () => { p.job = "samaan"; Sim.log(p.name + " on nüüd šamaan.", "evt"); } },
            { label: "Ei. Tööd on teha ja unenäod on unenäod.", sub: "Usk langeb pisut.", fx: () => { G.faith = Math.max(0, G.faith - 6); } },
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
        body: "Öösel on lõkke ümber silmad. Hundikari on näljas ja teie lõhn on neile toit.\n\n" +
          "Neid on " + wolves + ". Ring 2 ja 3 töölised on kaugel ega jõua appi." +
          (fighters < 2 ? "\n\nTõsiseid võitlejaid on laagris vähe (" + fighters + ")." : ""),
        choices: [
          { label: "Võtame nad vastu", sub: "Käigupõhine kaitse", fx: () => Combat.start({ type: "hundid", n: wolves }) },
          { label: "Ohverdame osa varudest", sub: "Kaotad 20% toiduvarust, hundid lähevad", fx: () => {
            const loss = Math.round(Sim.foodTotal() * 0.2);
            Sim.consumeFood(loss);
            G.sec = Math.max(0, G.sec - 8);
            Sim.log("Hundid võtsid " + loss + " TÜ ja kadusid pimedusse. Keegi ei maganud sel ööl.", "bad");
          } },
        ],
        def: fighters >= 3 ? 0 : 1,
      });
    } else if (type === "kylmalaine") {
      G.coldSnap = 5;
      Sim.log("KÜLMALAINE: viis päeva lõikavat pakast. Toidukulu kasvab, riieteta inimesed kannatavad.", "bad");
    } else if (type === "haigus") {
      const n = Math.max(1, Math.round(Sim.pop() * U.rf(0.2, 0.4)));
      const victims = U.shuffle(Sim.alive()).slice(0, n);
      for (const v of victims) {
        v.sick = { name: "palavik", days: U.ri(5, 10) };
        if ((v.child || v.age >= 45) && U.chance(Sim.hasShaman() ? 0.06 : 0.15)) {
          Sim.killPerson(v, "suri palavikku");
        }
      }
      Sim.log("Haigus käib laagris ringi: " + n + " inimest on palavikus. Tihe koosolemine tõi selle kaasa.", "bad");
    } else if (type === "varud") {
      const loss = Math.round(G.dried * U.rf(0.1, 0.2));
      if (loss > 0) {
        G.dried -= loss;
        Sim.log("Niiskus ja närilised rikkusid varusid: " + loss + " TÜ kuivatatut läks raisku.", "bad");
      }
    } else if (type === "randaja") {
      this.frozenWanderer();
    }
  },

  // ---------- inimeste tulek ----------
  wanderer() {
    if (Sim.foodTotal() < Sim.dailyNeed() * 8) return; // näljas hõimuga ei liituta
    let quality, desc;
    if (G.rep >= 70) {
      quality = 2;
      desc = "Ta liigub nagu inimene, kes teab, mida teeb. Teie maine on temani jõudnud.";
    } else if (G.rep >= 45) {
      quality = 1;
      desc = "Tavaline rändaja, väsinud aga terve.";
    } else {
      quality = 0;
      desc = "Ta on kõhn ja köhib. Keegi teine teda vastu ei võtnud.";
    }
    const doms = ["kor", "kala", "jaht", "voit", "meister", "skaut"];
    const dom = U.pick(doms);
    const p = Person.create({ id: G.nextId++, age: U.ri(17, 45) });
    p.xp[dom] = quality * DATA.XP_PER_LEVEL;
    if (quality === 0 && U.chance(0.5)) p.sick = { name: "kurnatus", days: U.ri(3, 6) };
    const domName = DATA.DOM_NAMES[dom];
    Sim.emit({
      title: "Rändaja",
      body: p.name + " seisab laagri serval ja ootab. " + desc +
        (quality === 2 ? "\n\nTema käed räägivad oskusest: " + domName + "." : "") +
        "\n\nÜks suu juurde, aga ka kaks kätt.",
      choices: [
        { label: "Võtame vastu", fx: () => {
          p.pos = { x: 100, y: 300, tx: 480, ty: 320, wander: 0 };
          G.people.push(p);
          G.stats.joins++;
          Sim.log(p.name + " liitus hõimuga." + (quality === 2 ? " Ta oskab: " + domName + "." : ""), "good");
        } },
        { label: "Saadame minema", sub: "Maine langeb pisut", fx: () => {
          G.rep = Math.max(0, G.rep - 4);
          Sim.log("Rändaja saadeti minema. Ta läks, ja tema lugu teist läks temaga.", "evt");
        } },
      ],
      def: Sim.foodTotal() > Sim.dailyNeed() * 15 ? 0 : 1,
    });
  },

  frozenWanderer() {
    const p = Person.create({ id: G.nextId++, age: U.ri(20, 50) });
    const skilled = U.chance(0.4);
    if (skilled) p.xp[U.pick(["kor", "kala", "jaht", "meister"])] = DATA.XP_PER_LEVEL * U.ri(1, 2);
    p.sick = { name: "külmavõetud", days: U.ri(4, 8) };
    Sim.emit({
      title: "Külmunud rändaja",
      body: "Keegi on lume seest ukse taha jõudnud. Ta on poolsurnud, aga elus.\n\n" +
        "Kui võtate ta sisse, sööb ta teie varusid ja võib-olla ei tõuse üldse. Kui jätate välja, on ta hommikuks surnud.",
      choices: [
        { label: "Sisse", sub: "Ta sööb, aga võib olla oskaja", fx: () => {
          p.pos = { x: 480, y: 340, tx: 480, ty: 330, wander: 0 };
          G.people.push(p);
          G.stats.joins++;
          G.faith = Math.min(100, G.faith + 4);
          Sim.log(p.name + " toodi lõkke äärde. Kas temast tõuseb tulu, näitab kevad.", "evt");
        } },
        { label: "Välja", sub: "Maine ja usk langevad", fx: () => {
          G.rep = Math.max(0, G.rep - 6);
          G.faith = Math.max(0, G.faith - 5);
          Sim.log("Ta jäeti välja. Hommikul oli ukse taga vaikus ja keegi ei vaadanud teistele otsa.", "bad");
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
      title: "Pagulased põhjast",
      body: n + " inimest, neist " + kids + " last, ilma varustuseta. Nende kodupaik on otsas — nälg või vaen, seda nad ei räägi.\n\n" +
        "Nad on tööjõud. Nad on suud. Nad on tulevased sugulased või tulevased vaenlased.",
      choices: [
        { label: "Võtame kõik vastu", sub: "+" + n + " inimest, usk tõuseb, toit kulub", fx: () => {
          group.forEach((p, i) => { p.pos = { x: 60 + i * 14, y: 300, tx: 440 + i * 12, ty: 330, wander: 0 }; G.people.push(p); });
          G.stats.joins += n;
          G.faith = Math.min(100, G.faith + 6);
          G.rep = Math.min(100, G.rep + 5);
          Sim.log(n + " pagulast võeti vastu. Laager on kitsam ja lärmakam, aga südamed said soojemaks.", "good");
        } },
        { label: "Võtame ainult töökäed", sub: "Täiskasvanud jäävad, lapsed ja nõrgad saadetakse edasi. Usk langeb.", fx: () => {
          const adults = group.filter(p => !p.child);
          adults.forEach((p, i) => { p.pos = { x: 60 + i * 14, y: 300, tx: 440 + i * 12, ty: 330, wander: 0 }; G.people.push(p); });
          G.stats.joins += adults.length;
          G.faith = Math.max(0, G.faith - 10);
          Sim.log(adults.length + " võeti vastu, ülejäänud saadeti edasi. Keegi ei laulnud sel õhtul.", "bad");
        } },
        { label: "Saadame kõik minema", sub: "Usk ja maine langevad", fx: () => {
          G.faith = Math.max(0, G.faith - 8);
          G.rep = Math.max(0, G.rep - 6);
          Sim.log("Pagulased saadeti edasi. Nende jäljed lumes olid järgmisel hommikul alles.", "bad");
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
    offers.push({ label: "10 nahka → merevaikkivi (reliikvia)", ok: () => G.hides >= 10 && !G.relics.some(r => r.key === "merevaik"),
      fx: () => { G.hides -= 10; Sim.gainRelic("merevaik", null, "Kaupleja käest saadud kivi, mis on rännanud kaugemalt kui ükski teie esivanem."); } });
    offers.push({ label: "15 TÜ toitu → 10 materjali", ok: () => Sim.foodTotal() >= 15,
      fx: () => { Sim.consumeFood(15); G.mat += 10; Sim.log("Vahetus tehtud: toit materjali vastu.", "evt"); } });
    offers.push({ label: "4 nahka → 12 TÜ kuivatatud toitu", ok: () => G.hides >= 4,
      fx: () => { G.hides -= 4; G.dried += 12; Sim.log("Vahetus tehtud: nahad toidu vastu.", "evt"); } });
    const valid = offers.filter(o => o.ok());
    const choices = valid.map(o => ({ label: o.label, fx: o.fx }));
    choices.push({ label: "Täna ei vaheta", fx: () => {} });
    Sim.emit({
      title: "Kaupleja " + n.name + " juurest",
      body: "Ta laotab oma kraami nahale laiali ja ootab. Kauplemine on ka uudiste kuulamine: ta räägib radadest, ilmast ja sellest, kes kus elab.",
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
      title: "Keegi peitis liha",
      body: culprit.name + " magamisaseme alt leiti peidetud kuivatatud liha. Nälg teeb inimesest looma, aga jagamine on seadus, mis hoiab teid koos.\n\n" +
        "Terve küla vaatab sind ja ootab, mida sa teed.",
      choices: [
        { label: "Liha jagatakse, tema saab andeks", sub: "Usk tõuseb, aga ta võib uuesti proovida", fx: () => {
          G.dried += 6;
          G.faith = Math.min(100, G.faith + 5);
          Sim.log("Liha jagati ära ja " + culprit.name + " sai andeks. Jagamine on seadus.", "evt");
        } },
        { label: "Ta aetakse minema", sub: "Karm õppetund: turvatunne tõuseb, aga üks inimene vähem", fx: () => {
          G.dried += 6;
          Sim.personLeaves(culprit);
          G.faith = Math.max(0, G.faith - 3);
          G.leaveP = Math.max(0, G.leaveP - 5);
          Sim.log("Küla otsustas: kes peidab, see läheb. Keegi ei vaielnud vastu, aga keegi ei rõõmustanud ka.", "bad");
        } },
        { label: "Vaatame mööda", sub: "Usk langeb: seadus, mida ei kaitsta, ei ole seadus", fx: () => {
          G.faith = Math.max(0, G.faith - 8);
          Sim.log("Sellest ei räägitud. Aga kõik teavad, ja igaüks mõtleb nüüd oma peidupaigale.", "bad");
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
      title: "Pool küla tahab lahkuda",
      body: "Nad seisavad lõkke teisel pool, oma kimbud juba seotud. Nende jutt on lihtne: siin ei ole enam elu. Ja neil võib õigus olla.\n\n" +
        "Umbes " + leavers + " inimest on valmis minema.",
      choices: [
        { label: "Lase neil minna", sub: "Kaotad " + leavers + " inimest ja osa varusid, aga surve kaob", fx: () => {
          this.removeLeavers(leavers);
          const foodShare = Math.round(Sim.foodTotal() * 0.3);
          Sim.consumeFood(foodShare);
          G.leaveP = 0;
          G.faith = Math.max(0, G.faith - 5);
          Sim.log("Nad läksid koidikul. Väiksem rühm sööb vähem ja tülitseb vähem. Võib-olla oli see õige.", "evt");
        } },
        { label: "Palu neil jääda", sub: "Suur pidu + rituaal (20 TÜ). Kui usk on kõrge, jäävad.", fx: () => {
          if (Sim.foodTotal() < 20) {
            Sim.log("Toitu ei jätkunud isegi palumiseks. Nad läksid.", "bad");
            this.removeLeavers(leavers);
            G.leaveP = 0;
            return;
          }
          Sim.consumeFood(20);
          if (U.chance(0.3 + G.faith / 150)) {
            G.leaveP = 5;
            G.faith = Math.min(100, G.faith + 8);
            Sim.log("Öö läbi räägiti, söödi ja lauldi. Hommikul olid kimbud lahti seotud. Seekord jäädi.", "good");
          } else {
            this.removeLeavers(Math.ceil(leavers / 2));
            G.leaveP = 5;
            Sim.log("Osa jäi, osa läks ikkagi. Pidu pehmendas lahkumist, aga ei peatanud seda.", "bad");
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
      reason = "Veri nõudis verd — nad ei unustanud.";
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
        reason = "Nad on teie varusid kaua vaadanud.";
      } else {
        // võõras hõim: suurus sinu järgi (sind näevad omasugused)
        const theirPop = Math.max(6, Math.round(Sim.pop() * U.rf(0.8, 1.8)));
        tribeName = U.pick(TRIBE_NAMES);
        n = U.clamp(Math.round(theirPop / 4), 2, 6);
        reason = "Võõras rahvas, keda te ei tunne — umbes " + theirPop + " hinge. Teie suits ja teie rikkus paistavad kaugele.";
      }
    }

    Sim.emit({
      title: "Öine haarang!",
      body: tribeName + " tuli koidueelsel tunnil. " + reason +
        "\n\nNeid on " + n + ". Ring 2 ja 3 töölised on kaugel ega jõua appi.",
      choices: [
        { label: "Kaitseme laagrit", sub: "Käigupõhine lahing", fx: () => Combat.start({ type: "haarang", n, neighborId, tribeName }) },
        { label: "Peidame end metsa", sub: "Nad võtavad, mida kanda jõuavad", fx: () => {
          const loss = Math.round(Sim.foodTotal() * 0.3);
          Sim.consumeFood(loss);
          let extra = "";
          if (G.relics.length && !G.stolenRelic && U.chance(0.4)) {
            const r = U.pick(G.relics);
            G.relics.splice(G.relics.indexOf(r), 1);
            G.stolenRelic = { key: r.key, name: r.name, neighborId };
            extra = " NAD VÕTSID KAASA: " + r.name + ".";
            G.faith = Math.max(0, G.faith - 12);
          }
          G.rep = Math.max(0, G.rep - 8);
          G.sec = Math.max(0, G.sec - 10);
          Sim.log("Peitsite end. Nad võtsid " + loss + " TÜ ja lahkusid naerdes." + extra, "bad");
        } },
      ],
      def: 0,
    });
  },

  // Skaut leidis raiditava küla: otsus KOHE — hiljem seda võimalust ei ole.
  raidTargetFound(village, scout) {
    const party = Sim.raidParty();
    const can = party.length >= DATA.RAIDOP.MIN_FIGHTERS;
    const wealthTxt = village.rich > Sim.pop() * 12 ? "aidad paistavad täis" :
      village.rich > Sim.pop() * 7 ? "varud paistavad korralikud" : "elavad kasinalt";
    const choices = [];
    if (can) {
      choices.push({ label: "Saadame sõjasalga (" + party.length + " meest)",
        sub: "Teekond " + village.dist + " päeva sinna, sama palju tagasi. Küla jääb vahepeal nõrgaks.",
        fx: () => Sim.startRaid(village) });
    }
    choices.push({ label: can ? "Jätame nad rahule" : "Ei saa rünnata (vaja " + DATA.RAIDOP.MIN_FIGHTERS + " tervet võitlejat laagris)",
      sub: "Rajad muutuvad, valvurid vahetuvad — hiljem seda võimalust ei tule.",
      fx: () => { Sim.log("Otsustasite " + village.name + " rahule jätta. " + scout.name + " ei rääkinud leiust kellelegi teisele.", "evt"); } });
    Sim.emit({
      title: "Skaut leidis küla",
      body: scout.name + " nägi suitsu ja luuras lähemale: " + village.name + ", umbes " + village.pop +
        " hinge, " + wealthTxt + ". Kaitsjaid paistis " + village.defenders + ".\n\n" +
        "Rünnata saab AINULT KOHE — homme on rajad teised ja võimalus läinud.\n\n" +
        "Saak tuleb langenutelt: rõivad, varustus, vahel reliikvia. Kui küla jääb päriselt lahtiseks, saab palju rohkem. " +
        "Kui kaotate, võidakse teid koju jälitada.",
      choices,
      def: choices.length - 1,
    });
  },

  // sõjasalk jõudis sihtküla alla: lahing nende maastikul
  raidArrive() {
    const op = G.raidOp;
    const alive = op.members.map(id => G.people.find(p => p.id === id)).filter(p => p && p.alive);
    if (!alive.length) { G.raidOp = null; return; }
    Sim.log("Sõjasalk jõudis " + op.village.name + " alla. Koidueelne tund on teie päralt.", "evt");
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
    const name = pu.neighborId !== null ? G.neighbors[pu.neighborId].name : (pu.tribeName || "Võõras hõim");
    if (!U.chance(0.65)) {
      Sim.log("Jäljed viisid jälitaja rappa ja sinna nad jäid. " + name + " ei leidnud teid.", "good");
      return;
    }
    if (!U.chance(0.7)) {
      G.sec = Math.max(0, G.sec - 5);
      Sim.log("Öösel nähti võõrast laagri lähedal. Ta vaatas kaua ja kadus. " + name + " teab nüüd, kus te elate — aga ei tulnud. Seekord.", "bad");
      return;
    }
    const n = U.ri(3, 5);
    Sim.emit({
      title: "Jälitaja tõi nad kohale",
      body: name + " käis teie jälgedel nädalaid ja nüüd on nad siin — varjatus ei aita selle vastu, kes rada mööda tuli.\n\nNeid on " + n + ".",
      choices: [
        { label: "Kaitseme laagrit", sub: "Käigupõhine lahing", fx: () => Combat.start({ type: "haarang", n, neighborId: pu.neighborId, tribeName: pu.tribeName }) },
        { label: "Peidame end metsa", sub: "Nad võtavad, mida kanda jõuavad", fx: () => {
          const loss = Math.round(Sim.foodTotal() * 0.35);
          Sim.consumeFood(loss);
          G.rep = Math.max(0, G.rep - 8);
          Sim.log("Peitsite end. Jälitatud küla maksis oma hinna: " + loss + " TÜ.", "bad");
        } },
      ],
      def: 0,
    });
  },

    // reliikvia tagasitoomise retk (Teod-vahekaardilt)
  canRetrieve() {
    if (!G.stolenRelic) return { ok: false, why: "Midagi ei ole varastatud." };
    const fighters = Sim.adults().filter(p => Person.canWork(p) && !p.away &&
      (p.job === "sodalane" || p.job === "kytt" || p.job === "kalur"));
    if (fighters.length < 3) return { ok: false, why: "Vaja on 3 tervet võitlejat (sõdalane/kütt/kalur)." };
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
    if (proj >= need) verdict = "Praeguse tempoga peaks jätkuma. Aga tempo on lubadus, mitte ladu.";
    else verdict = "PRAEGUSE TEMPOGA JÄÄD PUUDU.";
    Sim.emit({
      title: "Talv tuleb",
      body: "Talv tuleb " + daysLeft + " päeva pärast. Sul on talvekõlblikku varu " + have + " TÜ. Vaja on umbes " + need + " TÜ.\n\n" + verdict +
        (site.cave ? "\n\nKoobas hoiab teid soojas. Onni ei ole vaja ehitada." : "") +
        (site.b.raam === 0 ? "\n\nSul EI OLE kuivatusraami. Värske toit ei säili talveni." : "") +
        "\n\nSügisene liikumisaken on lahti " + Math.max(0, DATA.WINDOW.SYGIS_UNTIL - G.sday + 1) + " päeva.",
      choices: [{ label: "Selge", fx: () => {} }],
      def: 0,
    });
  },

  yearSummary() {
    const s = G.stats;
    const deathsThisYear = s.deaths.filter(d => d.year === G.year - 1);
    const site = Sim.curSite();
    Sim.emit({
      title: G.year + ". aasta algab",
      body: "Talv on läbi. Lume alt tuleb välja märg maa ja eelmise aasta lood.\n\n" +
        "Rahvast: " + Sim.pop() + ". Surma sai mullu: " + deathsThisYear.length +
        (deathsThisYear.length ? " (" + deathsThisYear.map(d => d.name).join(", ") + ")" : "") + ".\n" +
        "Laagripaik (" + site.name + "): ring 1 on " + Math.round(site.points[0] / site.max[0] * 100) + "% alles.\n\n" +
        "Kevad on näljakuu, aga ka liikumisaken. Jääda või liikuda?",
      choices: [{ label: "Uus aasta, vanad küsimused", fx: () => {} }],
      def: 0,
    });
  },

  epilogue() {
    const s = G.stats;
    const settled = s.moves <= 1;
    const rich = Sim.foodTotal() > 200 && Sim.pop() >= 16;
    let story;
    if (settled && rich) {
      story = "Te jäite. Kalmed sidusid teid maaga ja aidad tegid teist need, kelle juurde tullakse — ja kelle juurde tullakse ka röövima. Teie lapselapsed ehitavad siia midagi, mida teie ei oska veel nimetada. Vabadust nad enam ei mäleta, aga nälga ka mitte.";
    } else if (settled) {
      story = "Te jäite, kuigi kerge see ei olnud. Koht on teie oma — iga kivi, iga haud. Kas see oli õige valik, ei ütle teile keegi. Nii see ajastu käibki: keegi ei tea, ja kõik peavad ikkagi valima.";
    } else if (s.moves >= 4) {
      story = "Te ei jäänud kunagi. Kerge kimp, tuttavad rajad, tähed katuseks. Teid on vähe ja teid ei leia keegi, kui te ise ei taha. Vanad kohad mäletavad teid tulease kividena, ja see ongi kõik, mis teist maha jääb. Võib-olla sellest piisab.";
    } else {
      story = "Te liikusite, kui pidi, ja jäite, kui sai. Kumbki tee ei ole teie oma — te käite nende vahel, nagu käisid teie vanemad. Otsus seisab endiselt ees, igal kevadel uuesti.";
    }
    Sim.emit({
      title: "Kaheksa aastat",
      body: "Kaheksa aastat on möödas sellest suvest, kui teid oli kuus.\n\n" + story + "\n\n" + Sim.storySummary() +
        "\n\nVõid edasi mängida — maailm ei lõpe, ainult lugu sai punkti.",
      choices: [{ label: "Mängin edasi", fx: () => {} }],
      def: 0,
    });
  },
};
