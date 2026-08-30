// data.js — kõik balansinumbrid. Allikas: Kiviaeg-susteemid-v1.md ja Kiviaeg-balanss-v1.md
"use strict";

const DATA = {
  DAY_SECONDS: 15,        // 1 päev = 15 s (1× kiirusel)
  SEASON_DAYS: 30,
  SEASONS: ["spring", "summer", "autumn", "winter"],
  SEASON_IDX: { spring: 0, summer: 1, autumn: 2, winter: 3 },

  XP_PER_LEVEL: 400,
  MAX_LEVEL: 3,
  RING_XP: [1, 2, 3],       // kogemus/päev ringi järgi
  NEW_CAMP_XP: 3,           // uus laagripaik: +3/päev esimesel hooajal
  RING_MOD: [1.0, 0.85, 0.65],
  RING_SHARE: [0.40, 0.35, 0.25],
  TU_PER_POINT: 30,         // 1 ammendumispunkt = 30 TÜ

  // Päeva saak kõigub ±YIELD_VAR: metsas ei ole tabelit. Keskmine jääb samaks,
  // aga mängija ei saa täpseid numbreid välja arvutada — ja ei peagi.
  YIELD_VAR: 0.18,

  // TÜ/päevas, suvi, ring 1, oskus 0..3 (KESKMINE — mängijale ei näidata)
  YIELD: {
    marjad: [1.5, 1.9, 2.3, 2.6],
    seened: [1.8, 2.2, 2.9, 3.6], // pahmakas korraga: alati marjadest rohkem, aga mürgioht
    juured: [0.9, 1.1, 1.3, 1.5],
    kala:   [1.8, 2.4, 3.0, 3.6],
    jaht:   [1.0, 2.0, 3.2, 4.5],  // oodatav keskmine; tuleb pahmakatena
    materjal: [2.0, 2.6, 3.2, 3.8], // materjaliühikut päevas
  },

  // Jõeta koha identiteet: metsakohad on JAHIMAAD (ulukid väldivad inimeste
  // jõekoridori) ja kevadel annavad linnupesad-kasemahl korilusele leiba.
  // Ilma selleta on jõeta koht surmalõks (mõõdetud: 37/40 hukkus).
  DRY_HUNT_MULT: 1.5,       // jaht jõeta kohas (ka väikesaak: jänesed, laanepüüd)
  DRY_SPRING_KORILUS: 0.65, // koriluse kevadine põrand jõeta kohas (munad, mahl)

  // hooajakordajad [kevad, suvi, sügis, talv]
  SEASON_MOD: {
    korilus: [0.4, 1.0, 1.4, 0.1],
    juured:  [1.0, 0.7, 1.0, 0.55], // juured ja koor: talvel ainus korilus
    kala:    [1.2, 1.0, 0.9, 0.4], // talv 0,4 (spec 0,3): jääalune püük on ainus talvine toidusissetulek
    jaht:    [0.7, 0.9, 1.3, 0.6],
  },

  // mürgitus: [risk/päev oskuse 0..3 järgi]
  POISON: {
    seened: { risk: [0.06, 0.03, 0.012, 0.004], days: [4, 8], death: 0.05, deathShaman: 0.015 },
    marjad: { risk: [0.015, 0.008, 0.004, 0.002], days: [2, 3], death: 0, deathShaman: 0 },
    juured: { risk: [0.01, 0.006, 0.003, 0.001], days: [2, 4], death: 0, deathShaman: 0 },
  },

  // Mürgitus tapab nõrga, mitte tugeva: kordaja tervise järgi (100 → ×0,5, 50 → ×1,0, 20 → ×1,3).
  // Nii on seened hooldatud rahvaga risk, hooldamata rahvaga hukatus — ja mängijal on kontroll.
  POISON_HEALTH_MULT: h => U.clamp(1.5 - h / 100, 0.5, 1.3),

  FRESH_LIFE: 6,            // värske toit rikneb ~6 päevaga
  FRESH_LIFE_WINTER: 12,    // külm hoiab kauem
  RACK_CAP: 100,            // kuivatatud lao maht raami kohta
  RACK_RATE: 8,             // TÜ/päev raami kohta (kuivatamise läbilase)
  DRYER_RATE: 12,           // TÜ/päev kuivataja kohta

  CLOTHES_HIDES: 2,         // 1 komplekt talveriideid = 2 nahka
  CLOTHES_WORK: 3,          // + 3 tööpäeva
  CLOTHES_LIFE_SEASONS: 8,  // riided kuluvad ~2 aastaga

  TOOL_DECAY: 1.2,          // tööriistad kuluvad päevas
  TOOL_BONUS_MAX: 0.25,     // +25% tootlikkust täiskvaliteedil
  TOOL_CAP_NO_WORKSHOP: 40,
  LOCAL_KNOWLEDGE_MAX: 0.25, // +25% saagikust, kui ollakse samas paigas kaks aastat (paiksuse tasu)

  // väiksuse boonused: kuni selle rahvaarvuni õpitakse kiiremini ja liitujaid tuleb kergemini
  SMALL_BAND_POP: 7,
  SMALL_BAND_XP: 1.5,

  // varjatud isikuomadused: anne/nõrkus (üks valdkond kumbki) ja üldine õpitempo.
  // Väike mõju, mida ei näidata numbrina — avaldub läbi mängu (logiteade + märk).
  TRAIT_GIFT: 1.3,
  TRAIT_WEAK: 0.75,
  TRAIT_TEMPO: [0.9, 1.1],
  TRAIT_REVEAL_XP: 250,

  // Maa taastumine (osa max-punktidest päevas): [kevad, suvi, sügis, talv].
  // KÕIGE TUNDLIKUM NUPP: kiirem taastumine teeb paiksuse alati õigeks (pinge kaob),
  // aeglasem sunnib igavesse rändu. Vt README "Kaks kohta, mis hoiavad tasakaalu".
  REGEN_GROW: [0.005, 0.005, 0.002, 0],
  REGEN_ABANDONED_MIN: 0.004,  // tühjaks jäetud koha miinimumtaastumine (v.a talv)

  // Nähtavus: mida teised sinust näevad. Sihtimine käib AINULT selle järgi
  // (rikkus, rahvaarv, ehitised) — mitte kättemaksu ega "sõjamaine" järgi.
  VIS: {
    POP: 1.5,          // nähtavust inimese kohta
    FOOD_DIV: 15,      // toidu-TÜ-d ühe nähtavuspunkti kohta
    HIDES_DIV: 10,
    RELIC: 3,
    FEAST: 10,         // peo järelkuma (kahaneb FEAST_DAYS jooksul)
    FEAST_DAYS: 60,
    TIME_CAP: 10,      // paigalpüsimise lisa lagi (aeglane: +1/hooaeg)
    HIDDEN_MULT: 0.55, // kui palju koha varjatus nähtavust maha võtab
    RAID_BASE: 25,     // alla selle nähtavuse ei rünnata üldse
    RAID_DIV: 130,     // (vis - BASE) / DIV = haarangu tõenäosus hooajakontrollil
    RAID_MAX: 0.55,
  },

  // Mängija raidid: skaudi külaotsing ja sõjaretk
  RAIDOP: {
    SEARCH_DAYS: [6, 12],   // külaotsingu kestus
    FIND_P: 0.65,           // tõenäosus, et skaut üldse midagi leiab
    DIST: [2, 5],           // leitud küla kaugus (päevi)
    SIZE: [0.8, 2.2],       // nende suurus sinu suhtes (suuri märkad kergemini)
    MIN_FIGHTERS: 3,
    CARRY_PER_RAIDER: 14,   // TÜ, mida üks mees koju jõuab kanda
    TRACK_P: 0.5,           // kaotuse/põgenemise järel jälitatakse sind koju
  },

  // Sõjavarustus: erileidudest sepistatud relvad-turvised, mis KULUVAD kasutamisel.
  // Erinevalt reliikviatest on varustus numbriline ja usaldusväärne.
  GEAR: {
    FIND_P: [0.004, 0.012, 0.025], // erilise kivi leid materjalikorjel, ringi kaupa
    BONE_BIGKILL_P: 0.2,           // suuruluki luud suursaagilt
    WEAPON: { flint: 1, mat: 2, work: 2, dur: 100, lo: 1, hi: 2, hit: 0.04 },
    ARMOR:  { bone: 2, hides: 2, work: 3, dur: 100, hp: 3 },
    WEAR_PER_FIGHT: 25,            // kulumine lahingu kohta
    RAID_LOOT_DUR: 50,             // röövitud relvad on pooleldi kulunud
  },

  // Skoor: koguneb hooajati, surm lõpetab kogumise. Eri mängustiilid peavad
  // suutma kõrgeid skoore: suur-rikas kogub kiiresti, väike-varjatud kaua.
  SCORE: {
    SEASON_BASE: 3,   // puhas ellujäämine
    POP: 2,           // punkti inimese kohta hooajas
    FOOD_DIV: 20,     // varapunkt iga 20 TÜ kohta
    RELIC: 5,         // punkti reliikvia kohta hooajas
    GEAR: 1,
    WINTER: 15,       // üle elatud talv
    RAID: 15,         // võidetud sõjaretk (ühekordne)
  },

  // Ammendumiskõvera põlv: ring annab täissaaki, kuni ta on üle selle osa täis;
  // allpool langeb saak lineaarselt (miinimum 20%). Teine kõige tundlikum nupp.
  RING_KNEE: 0.22,

  BUILDINGS: {
    onn:     { name: "Hut",          mat: 20, work: 12, desc: "Winter shelter for six. A winter without shelter kills.", leave: 20, halfBack: false, max: 6 },
    raam:    { name: "Drying rack", mat: 8,  work: 5,  desc: "The only way to keep food for winter. Holds 100, dries 8 a day.", leave: 8, halfBack: true, max: 8 },
    pyha:    { name: "Shrine",     mat: 10, work: 6,  desc: "Faith, rites, a place for relics. Leaving it breaks faith badly.", leave: 25, halfBack: false, max: 1 },
    tookoht: { name: "Workshop",      mat: 12, work: 6,  desc: "Tool quality can reach 100. Every trade works faster.", leave: 12, halfBack: true, max: 1 },
    tara:    { name: "Fence",         mat: 25, work: 10, desc: "Thorn fence against wolves and raiders. Safety +12.", leave: 10, halfBack: false, max: 1 },
  },

  JOBS: {
    korilane: { name: "Forager", dom: "kor",     desc: "Food and timber. Safe, but brings no hides." },
    kalur:    { name: "Fisher",    dom: "kala",    desc: "Steady food. Needs water. The spring run saves the hungry months." },
    kytt:     { name: "Hunter",     dom: "jaht",    desc: "Food and hides. Comes in bursts. Risky." },
    sodalane: { name: "Warrior", dom: "voit",    desc: "Produces nothing. Safety and defence. Three warriors open the long raid." },
    meister:  { name: "Crafter",  dom: "meister", desc: "Builds, makes clothes, keeps tools sharp." },
    skaut:    { name: "Scout",    dom: "skaut",   desc: "Word of the next campsite. Without a scout you leap blind." },
    samaan:   { name: "Shaman",   dom: "vaim",    desc: "Faith, rites, healing. Does not fight. Their death is a crisis." },
  },
  JOB_KEYS: ["korilane", "kalur", "kytt", "sodalane", "meister", "skaut", "samaan"],
  KOR_MODES: { marjad: "berries", seened: "mushrooms", juured: "roots/bark", materjal: "timber", kuivatab: "drying food" },

  DOM_NAMES: { kor: "foraging", kala: "fishing", jaht: "hunting", voit: "fighting", meister: "crafting", skaut: "scouting", vaim: "spirit lore" },

  // ringi risk päevas (õnnetus, kiskja, eksimine)
  RING_RISK: [0, 0.006, 0.013],
  RING_DEATH_SHARE: 0.05, // osa ringiõnnetustest, mis lõppeb surmaga (ainult ring 3)

  BIG_KILL_TU: [55, 70],    // suurkütitud loom
  BIG_KILL_HIDES: 3,
  SMALL_HIDE_CHANCE: 0.22,

  // lahing: [hp, ulatus, tabamis%, dmgLo, dmgHi, liikumine]
  COMBAT: {
    kytt:     { hp: 8,  range: 5, hit: 0.70, lo: 3, hi: 5, move: 3, wpn: "bow" },
    sodalane: { hp: 14, range: 1, hit: 0.75, lo: 4, hi: 6, move: 3, wpn: "stone club" },
    kalur:    { hp: 10, range: 3, hit: 0.65, lo: 3, hi: 4, move: 3, wpn: "harpoon" },
    korilane: { hp: 8,  range: 2, hit: 0.50, lo: 1, hi: 2, move: 3, wpn: "stone" },
    meister:  { hp: 8,  range: 2, hit: 0.50, lo: 1, hi: 2, move: 3, wpn: "stone" },
    skaut:    { hp: 8,  range: 2, hit: 0.55, lo: 1, hi: 3, move: 4, wpn: "stone" },
    hunt:     { hp: 6,  range: 1, hit: 0.55, lo: 2, hi: 3, move: 4, wpn: "teeth" },
    roovel:   { hp: 10, range: 1, hit: 0.68, lo: 3, hi: 5, move: 3, wpn: "axe" },
    roovel_oda: { hp: 9, range: 4, hit: 0.62, lo: 3, hi: 5, move: 3, wpn: "spear" },
    karu:     { hp: 30, range: 1, hit: 0.70, lo: 6, hi: 10, move: 3, wpn: "paw" },
    metssiga: { hp: 16, range: 1, hit: 0.65, lo: 4, hi: 7, move: 4, wpn: "tusks" },
  },

  KAUGRETK: { days: 12, minWar: 3, minHunt: 3, minPop: 16, baseTU: 200, perSkillTU: 66,
              hides: [6, 10], woundP: 0.25, deathP: 0.07, decay: 0.9, recover: 0.75 },

  SUURJAHT: { days: 3, minPeople: 4, tu: [80, 120], hides: [6, 8], woundP: 0.30, deathP: 0.08,
              relicP: 0.20, cooldown: 20, ringCost: 1.5 },

  FEAST_COST_PER_POP: 3,
  RITUAL_COST: 4,
  RITUAL_COOLDOWN: 15,
  RITUAL_DAYS: 15,          // rituaali mõju kestus
  RITUAL_TYPES: ["jahionn", "kalaonn", "kaitse", "tervendus"],
  RITUAL_NAMES: { jahionn: "Rite of the hunt", kalaonn: "Rite of the catch", kaitse: "Warding rite", tervendus: "Healing rite" },

  // reliikviad
  RELICS: {
    peakate:  { name: "Antlered headdress", job: "kytt",     desc: "A red deer skull, antlers still on. Wearing it, he is someone else." },
    karukapp: { name: "Bear's paw",         job: "sodalane", desc: "His enemies hesitate. He does not." },
    merevaik: { name: "Amber stone",      job: "samaan",   desc: "A stone that came from further than any living person." },
    tuum:     { name: "True flint core", job: "meister", desc: "A stone that gives way exactly where it should." },
    seenekorv:{ name: "Grandmother's basket", job: "korilane", desc: "Woven work that remembers what grandmother knew." },
    harpuun:  { name: "Bone harpoon head", job: "kalur",    desc: "In water it never loses its way." },
    jalaluu:  { name: "Wanderer's legbone",   job: "skaut",    desc: "A bone from someone who never stayed anywhere." },
    ehe:      { name: "First child's pendant", job: null,       desc: "A seashell pendant. It helps with nothing. And still." },
  },

  RICHNESS: { vaene: 30, keskmine: 60, rikas: 100 },
  RICHNESS_NAME: r => r >= 90 ? "rich" : r >= 50 ? "fair" : "poor",
  LEVEL_NAME: v => v >= 67 ? "good" : v >= 34 ? "fair" : "poor",

  SEC_REQ_PER_POP: 3,
  LEAVE_THRESHOLD: 25,

  WINDOW: { KEVAD: true, SYGIS_UNTIL: 15 }, // liikumisaknad

  CHILD_SEASONS: 12,        // laps saab täiskasvanuks 3 aastaga
  CHILD_RATION: 0.5,
};
