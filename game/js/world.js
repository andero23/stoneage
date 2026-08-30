// world.js — piirkonna ja laagripaikade genereerimine. DOM-vaba.
"use strict";

const World = {
  // 8 laagripaika 700x420 kaardil
  genRegion() {
    const sites = [];
    const positions = [];
    // hajutatud punktid
    let guard = 0;
    while (positions.length < 8 && guard < 500) {
      guard++;
      const p = { x: U.ri(60, 640), y: U.ri(50, 370) };
      if (positions.every(q => Math.hypot(p.x - q.x, p.y - q.y) > 110)) positions.push(p);
    }
    while (positions.length < 8) positions.push({ x: U.ri(60, 640), y: U.ri(50, 370) });

    const pools = { river: U.shuffle(SITE_NAMES.river), cave: U.shuffle(SITE_NAMES.cave), plain: U.shuffle(SITE_NAMES.plain) };
    // profiilid: algus keskmine+jõgi; kiusatus: rikas+kalajooks; rikas+koobas kaugel; ülejäänud segu.
    // hid = varjatus (kui hästi koht peidab teiste eest), def = kaitstavus (lahingumaastik).
    // Rikkad kuulsad kohad on nähtavad; vaesed urkad peidetud. Kõike korraga saab harva.
    const profiles = [
      { rich: 60,  river: true,  cave: false, fishRun: false, hid: 45, def: 35 }, // 0 = algus
      { rich: 100, river: true,  cave: false, fishRun: true,  hid: 15, def: 40 }, // 1 = kalajooksu koht, KUULUS
      { rich: 100, river: false, cave: true,  fishRun: false, hid: 65, def: 75 }, // kättesaamatu varandus
      { rich: 60,  river: true,  cave: false, fishRun: false, hid: 40, def: 30 },
      { rich: 60,  river: false, cave: true,  fishRun: false, hid: 60, def: 65 },
      { rich: 30,  river: false, cave: false, fishRun: false, hid: 85, def: 45 }, // peidetud urgas
      { rich: 60,  river: false, cave: false, fishRun: false, hid: 45, def: 40 }, // naabri koht
      { rich: 100, river: true,  cave: false, fishRun: false, hid: 25, def: 55 }, // naabri koht
    ];

    // algus keskele-vasakule, kalajooks temast 2 sammu kaugusele
    positions.sort((a, b) => a.x - b.x);
    for (let i = 0; i < 8; i++) {
      const prof = profiles[i];
      const pos = positions[i];
      const pool = prof.cave ? pools.cave : prof.river ? pools.river : pools.plain;
      const name = pool.length ? pool.pop() : "Nimetu";
      sites.push({
        id: i, name, x: pos.x, y: pos.y,
        rich: prof.rich,
        max: DATA.RING_SHARE.map(s => prof.rich * s),
        points: DATA.RING_SHARE.map(s => prof.rich * s),
        river: prof.river, cave: prof.cave, fishRun: prof.fishRun,
        hidden: U.clamp(prof.hid + U.ri(-12, 12), 5, 95),
        defensible: U.clamp(prof.def + U.ri(-12, 12), 5, 95),
        known: 0, estRich: null, // skaudi hinnang
        b: { onn: 0, raam: 0, pyha: 0, tookoht: 0, tara: 0 },
        graves: 0,
        occupied: null,
        expeds: 0,
        arrivedDay: -999,
        abandonedDay: null,
      });
    }
    sites[0].known = 2;
    sites[0].estRich = sites[0].rich;

    // Peidetud erikohad: kaardil ei eksisteeri (isegi mitte "?"), kuni skaut avastab.
    // Rikas + kalajooks + varjatud = kiire kasvu koht, aga jutt levib seal kiiresti.
    const specials = [
      { name: "The Falls",  rich: 100, river: true, cave: true,  fishRun: true, hid: 80, def: 70 },
      { name: "Hidden River", rich: 100, river: true, cave: false, fishRun: true, hid: 75, def: 55 },
    ];
    for (const sp of specials) {
      sites.push({
        id: sites.length, name: sp.name, x: U.ri(60, 640), y: U.ri(50, 370),
        rich: sp.rich,
        max: DATA.RING_SHARE.map(sh => sp.rich * sh),
        points: DATA.RING_SHARE.map(sh => sp.rich * sh),
        river: sp.river, cave: sp.cave, fishRun: sp.fishRun,
        hidden: U.clamp(sp.hid + U.ri(-8, 8), 5, 95),
        defensible: U.clamp(sp.def + U.ri(-8, 8), 5, 95),
        special: true, revealed: false,
        known: 0, estRich: null,
        b: { onn: 0, raam: 0, pyha: 0, tookoht: 0, tara: 0 },
        graves: 0, occupied: null, expeds: 0, arrivedDay: -999, abandonedDay: null,
      });
    }
    // algne varjatus meelde: mahajäetud koht taastab varjatuse aegamisi
    for (const st of sites) st.hidden0 = st.hidden;
    return sites;
  },

  distDays(a, b) {
    return U.clamp(Math.round(Math.hypot(a.x - b.x, a.y - b.y) / 85), 2, 6);
  },

  genNeighbors(sites) {
    const names = U.shuffle(NEIGHBOR_NAMES);
    const n1 = { id: 0, name: names[0], siteId: 6, att: U.ri(40, 60), known: false,
                 debts: [], vengeance: false, raidsDone: 0 };
    const n2 = { id: 1, name: names[1], siteId: 7, att: U.ri(30, 55), known: false,
                 debts: [], vengeance: false, raidsDone: 0 };
    sites[6].occupied = 0;
    sites[7].occupied = 1;
    return [n1, n2];
  },

  ringDepleted(site, ring) {
    return site.points[ring] <= 0.01;
  },

  // Ringi saagikuse kordaja: kuni ring on üle 22% täis, korjatakse täiskiirusel;
  // alla selle jääb saak kiiresti kesisemaks. Nii on ammendumine nähtav libisemine,
  // mitte sein, ja aeglane taastumine ei suuda suurt rühma toita.
  ringYield(site, ring) {
    const frac = site.max[ring] > 0 ? site.points[ring] / site.max[ring] : 0;
    return U.clamp(frac / DATA.RING_KNEE, 0.2, 1);
  },

  // ring, kus täna tasub käia: kaugem reis tasub end ära, kui lähem on tühjaks korjatud
  autoRing(site) {
    let best = 0, bestVal = -1;
    for (let r = 0; r < 3; r++) {
      const val = this.ringYield(site, r) * DATA.RING_MOD[r];
      if (val > bestVal + 0.001) { bestVal = val; best = r; }
    }
    return best;
  },

  extract(site, ring, tu) {
    const pts = tu / DATA.TU_PER_POINT;
    site.points[ring] = Math.max(0, site.points[ring] - pts);
  },

  // Maa taastub kasvuperioodil ka seal, kus elatakse — aga aeglaselt.
  // Nii on väike rühm ühes kohas jätkusuutlik ja kasvav rühm ei ole: koht sureb
  // järk-järgult, mitte lõplikult, ja kolimisotsus on tempo, mitte seina küsimus.
  // season: 0 kevad, 1 suvi, 2 sügis, 3 talv
  regenerate(sites, campId, season) {
    const growth = DATA.REGEN_GROW[season];
    for (const s of sites) {
      const rate = (s.id === campId || s.occupied !== null) ? growth : Math.max(growth, DATA.REGEN_ABANDONED_MIN);
      if (rate <= 0) continue;
      for (let r = 0; r < 3; r++) {
        s.points[r] = Math.min(s.max[r], s.points[r] + s.max[r] * rate);
      }
    }
  },
};
