// util.js — RNG, helpers, nimed. Ei sõltu DOM-ist.
"use strict";

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const U = {
  rng: mulberry32(1),
  setSeed(s) { U.rng = mulberry32(s); },
  r() { return U.rng(); },
  ri(lo, hi) { return lo + Math.floor(U.rng() * (hi - lo + 1)); }, // kaasa arvatud
  rf(lo, hi) { return lo + U.rng() * (hi - lo); },
  chance(p) { return U.rng() < p; },
  pick(arr) { return arr[Math.floor(U.rng() * arr.length)]; },
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(U.rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; },
  lerp(a, b, t) { return a + (b - a) * t; },
  round1(v) { return Math.round(v * 10) / 10; },
};

const NAMES = {
  M: ["Aro", "Uku", "Koit", "Tormi", "Salu", "Neeme", "Ohto", "Rauk", "Sulo", "Meelo",
      "Piki", "Taevo", "Urmo", "Vaino", "Ilo", "Kauro", "Leiko", "Otti", "Remo", "Tahvo",
      "Sindo", "Paas", "Kaljo", "Ehalo", "Virko"],
  N: ["Kai", "Salme", "Vaike", "Leelo", "Ehe", "Õie", "Maara", "Helme", "Aita", "Elo",
      "Siru", "Tuule", "Meri", "Laine", "Virve", "Õnne", "Ilme", "Kaja", "Pihla", "Marja",
      "Sula", "Kaste", "Uneli", "Hela", "Villu"],
};

// nimepoolid omaduste järgi: jõekohad, koopakohad, muud
const SITE_NAMES = {
  river: ["Jõesuu", "Pärlijõgi", "Havikari", "Kärestiku", "Luhaoja", "Kalasoon"],
  cave: ["Kaldakoobas", "Hallikivi", "Karukoobas", "Kivivarju"],
  plain: ["Soosaar", "Tammiku", "Luhasoo", "Kuresoo", "Põhjanõmm", "Kivineem"],
};

const NEIGHBOR_NAMES = ["Jõerahvas", "Põdrarahvas", "Kivirahvas", "Tuulerahvas", "Soorahvas"];

// kauged hõimud, kes genereeritakse kohtumise hetkel (neid ei simuleerita taustal)
const TRIBE_NAMES = ["Hundirahvas", "Kotkarahvas", "Kaljurahvas", "Männirahvas",
  "Rebaserahvas", "Luigerahvas", "Ilveserahvas", "Tormirahvas"];

// nimi, mida pole veel kasutatud
function freshName(sex, used) {
  const pool = NAMES[sex].filter(n => !used.has(n));
  const name = pool.length ? U.pick(pool) : U.pick(NAMES[sex]) + "-" + U.ri(2, 9);
  used.add(name);
  return name;
}
