// sprites.js — protseduuriline pixel-art. Vajab DOM-i (canvas); headless-režiimis ei laeta.
"use strict";

// Ametivärvid: küllastunud ja heledad, et eristuda rohelisest maast ja
// pruunist laagriplatsist. Rohelist riietust ei kasuta ükski amet.
const JOB_COLORS = {
  korilane: "e0b84a",   // kollane
  kalur:    "4fa8d8",   // hele sinine
  kytt:     "d97b32",   // oranž
  sodalane: "d1443a",   // punane
  meister:  "2b2b33",   // must — beež kadus laagriplatsi taustal ära
  skaut:    "3fc9b0",   // türkiis
  samaan:   "9a4fd1",   // lilla
  laps:     "e35d8a",   // roosa
};

const Sprites = {
  cache: {},

  make(rows, pal) {
    const h = rows.length, w = rows[0].length;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x];
        if (ch === "." || !(ch in pal)) continue;
        const col = pal[ch];
        const i = (y * w + x) * 4;
        img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  },

  hex(s) { return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]; },

  // ------- inimene: 8x12, kaks kaadrit -------
  villager(bodyHex, skinHex = "c9915e", frame = 0) {
    const key = "v" + bodyHex + skinHex + frame;
    if (this.cache[key]) return this.cache[key];
    const S = this.hex(skinHex), B = this.hex(bodyHex), H = this.hex("3a2a18");
    const pal = { s: S, b: B, h: H, d: this.hex("00000044").slice(0, 3) };
    const legsA = ["..b..b..", ".b....b."];
    const legsB = [".b..b...", "..b..b.."];
    const legs = frame === 0 ? legsA : legsB;
    const rows = [
      "..hhhh..",
      ".hhhhhh.",
      ".hssssh.",
      "..ssss..",
      "..bbbb..",
      ".bbbbbb.",
      ".bbbbbb.",
      "s.bbbb.s",
      "..bbbb..",
      "..b..b..",
      legs[0],
      legs[1],
    ];
    const spr = this.make(rows, pal);
    this.cache[key] = spr;
    return spr;
  },

  child(frame = 0) {
    const key = "child" + frame;
    if (this.cache[key]) return this.cache[key];
    // laps kandis varem pruuni, mis kadus laagriplatsi taustal ära
    const pal = { s: this.hex("d4a06c"), b: this.hex(JOB_COLORS.laps), h: this.hex("3a2a18") };
    const rows = frame === 0 ? [
      "..hhh...", "..sss...", "..bbb...", ".bbbbb..", "..bbb...", "..b.b...",
    ] : [
      "..hhh...", "..sss...", "..bbb...", ".bbbbb..", "..bbb...", ".b..b...",
    ];
    const spr = this.make(rows, pal);
    this.cache[key] = spr;
    return spr;
  },

  // ------- puud hooaja järgi -------
  tree(kind, season) {
    const key = "t" + kind + season;
    if (this.cache[key]) return this.cache[key];
    let leaf, leaf2;
    if (season === 0) { leaf = "5e8a4a"; leaf2 = "79a45e"; }        // kevad: hele
    else if (season === 1) { leaf = "3f6e35"; leaf2 = "558a48"; }   // suvi
    else if (season === 2) { leaf = "b0722c"; leaf2 = "c98f3e"; }   // sügis
    else { leaf = "e8e8ee"; leaf2 = "c8ccd8"; }                     // talv: lumine
    const pal = { a: this.hex(leaf), b: this.hex(leaf2), t: this.hex("5a4028") };
    let rows;
    if (kind === "kuusk") {
      // okaspuu: talvel lumega, muidu tume roheline
      const ne = season === 3 ? { a: this.hex("2e4a2e"), b: this.hex("dfe4ec"), t: this.hex("4a3520") } : { a: this.hex("2e5230"), b: this.hex("3d6a3f"), t: this.hex("4a3520") };
      rows = [
        "....b....",
        "...bab...",
        "...aaa...",
        "..baaab..",
        "..aaaaa..",
        ".baaaaab.",
        ".aaaaaaa.",
        "baaaaaaab",
        "....t....",
        "....t....",
      ];
      const spr = this.make(rows, ne);
      this.cache[key] = spr; return spr;
    }
    rows = [
      "..abba...",
      ".abbbba..",
      "abbabbba.",
      "abbbbbba.",
      ".abbbba..",
      "..abba...",
      "...tt....",
      "...tt....",
      "...tt....",
    ];
    const spr = this.make(rows, pal);
    this.cache[key] = spr;
    return spr;
  },

  // ------- ehitised -------
  hut() {
    if (this.cache.hut) return this.cache.hut;
    const pal = { r: this.hex("8a6a42"), d: this.hex("6a4e2e"), o: this.hex("2a1c10"), s: this.hex("bfa77c") };
    const rows = [
      "....rr....",
      "...rrrr...",
      "..rdrrdr..",
      ".rrrddrrr.",
      ".rdrrrrdr.",
      "rrrrddrrrr",
      "rdrrroorrr",
      "srrrroorrs",
    ];
    this.cache.hut = this.make(rows, pal);
    return this.cache.hut;
  },

  rack() {
    if (this.cache.rack) return this.cache.rack;
    const pal = { t: this.hex("6a4e2e"), f: this.hex("b06a4a"), g: this.hex("c98f5e") };
    const rows = [
      "t..t..t..t",
      "tttttttttt",
      "t.f.g.f..t",
      "t.f.g.g..t",
      "tttttttttt",
      "t.g.f.g..t",
      "t.g.f....t",
      "t..t..t..t",
    ];
    this.cache.rack = this.make(rows, pal);
    return this.cache.rack;
  },

  sacred() {
    if (this.cache.sacred) return this.cache.sacred;
    const pal = { k: this.hex("8a8a92"), d: this.hex("6a6a72"), o: this.hex("c9503c"), m: this.hex("4a4a52") };
    const rows = [
      "..k....k..",
      "..kk..kk..",
      ".kdk..kdk.",
      ".kkk..kkk.",
      ".kdkokkdk.",
      ".kkkokkkk.",
      "mkkkmmkkkm",
    ];
    this.cache.sacred = this.make(rows, pal);
    return this.cache.sacred;
  },

  workshop() {
    if (this.cache.workshop) return this.cache.workshop;
    const pal = { t: this.hex("6a4e2e"), k: this.hex("8a8a92"), b: this.hex("9c7448"), f: this.hex("5a4028") };
    const rows = [
      "t........t",
      "tbbbbbbbbt",
      "t.k..f...t",
      "t.kk.ff..t",
      "t..k..f..t",
      "tbbbbbbbbt",
    ];
    this.cache.workshop = this.make(rows, pal);
    return this.cache.workshop;
  },

  fencePost() {
    if (this.cache.fence) return this.cache.fence;
    const pal = { t: this.hex("6a4e2e"), d: this.hex("4a3520") };
    const rows = ["t.", "td", "t.", "td", "t."];
    this.cache.fence = this.make(rows, pal);
    return this.cache.fence;
  },

  fire(frame) {
    const key = "fire" + frame;
    if (this.cache[key]) return this.cache[key];
    const pal = { r: this.hex("d94a2a"), o: this.hex("e8873a"), y: this.hex("f2c94c"), w: this.hex("5a4028"), k: this.hex("3a3a42") };
    const rowsA = [
      "...r....",
      "..ryr...",
      "..ryro..",
      ".royyor.",
      ".ryyyyr.",
      "kwwwwwwk",
    ];
    const rowsB = [
      "....r...",
      "...ryr..",
      ".or yro.".replace(" ", "y"),
      ".royyor.",
      ".ryyyyr.",
      "kwwwwwwk",
    ];
    const rowsC = [
      "........",
      "...ry...",
      "..ryyr..",
      ".ryyoyr.",
      ".royyor.",
      "kwwwwwwk",
    ];
    const spr = this.make([rowsA, rowsB, rowsC][frame % 3], pal);
    this.cache[key] = spr;
    return spr;
  },

  // ------- loomad ja vastased -------
  wolf(frame = 0) {
    const key = "wolf" + frame;
    if (this.cache[key]) return this.cache[key];
    const pal = { g: this.hex("7a7a82"), d: this.hex("5a5a62"), e: this.hex("d94a2a") };
    const rows = frame === 0 ? [
      "d.......",
      "dg......",
      ".ggggggd",
      ".gegggg.",
      ".g.g.g..",
      "...g..g.",
    ] : [
      "d.......",
      "dg......",
      ".ggggggd",
      ".gegggg.",
      ".gg..gg.",
      "..g..g..",
    ];
    const spr = this.make(rows, pal);
    this.cache[key] = spr;
    return spr;
  },

  bear() {
    if (this.cache.bear) return this.cache.bear;
    const pal = { b: this.hex("5e4630"), d: this.hex("47341f"), e: this.hex("1a1208") };
    const rows = [
      "..bbbb....",
      ".bbbbbb...",
      "bbebbbbbb.",
      "bbbbbbbbbb",
      ".bbbbbbbb.",
      ".bb.bb.bb.",
      ".dd.dd.dd.",
    ];
    this.cache.bear = this.make(rows, pal);
    return this.cache.bear;
  },

  boar() {
    if (this.cache.boar) return this.cache.boar;
    const pal = { b: this.hex("6a5240"), d: this.hex("4e3c2c"), w: this.hex("e8e0d0") };
    const rows = [
      "...bbbb..",
      "..bbbbbb.",
      "wbbbbbbbb",
      ".bbbbbbb.",
      ".b.b.b.b.",
    ];
    this.cache.boar = this.make(rows, pal);
    return this.cache.boar;
  },

  deer() {
    if (this.cache.deer) return this.cache.deer;
    const rows = [
      "h..h.....",
      ".dd......",
      ".dddddd..",
      "..dddddd.",
      "..d.d.d..",
      "..d.d.d..",
    ];
    this.cache.deer = this.make(rows, { b: this.hex("a58a62"), d: this.hex("8a6a48"), h: this.hex("d9c9a8") });
    return this.cache.deer;
  },

  raider(frame = 0) {
    const key = "raider" + frame;
    if (this.cache[key]) return this.cache[key];
    const pal = { s: this.hex("b5825a"), b: this.hex("5a3a3a"), h: this.hex("2a1a12"), w: this.hex("8a8a92") };
    const rows = [
      "..hhhh..",
      ".hhhhhh.",
      ".hssssh.",
      "..ssss..",
      "w.bbbb..",
      "wbbbbbb.",
      "w.bbbb..",
      "..bbbb..",
      "..b..b..",
      frame === 0 ? "..b..b.." : ".b....b.",
      frame === 0 ? ".b....b." : "..b..b..",
    ];
    const spr = this.make(rows, pal);
    this.cache[key] = spr;
    return spr;
  },

  rock() {
    if (this.cache.rock) return this.cache.rock;
    const pal = { k: this.hex("8a8a92"), d: this.hex("6a6a72") };
    const rows = ["..kk..", ".kkkk.", "kkdkkk", "kdkkdk"];
    this.cache.rock = this.make(rows, pal);
    return this.cache.rock;
  },

  cave() {
    if (this.cache.cave) return this.cache.cave;
    const pal = { k: this.hex("7a7a82"), d: this.hex("5a5a62"), o: this.hex("14100c") };
    const rows = [
      "....kkkkkk....",
      "..kkkkkkkkkk..",
      ".kkkdkkkkdkkk.",
      "kkkkkkkkkkkkkk",
      "kkkdkoooookkkk",
      "kkkkooooooookk",
      "kkkoooooooookk",
    ];
    this.cache.cave = this.make(rows, pal);
    return this.cache.cave;
  },

  grave() {
    if (this.cache.grave) return this.cache.grave;
    const pal = { k: this.hex("9a8a6c"), o: this.hex("a5502e") };
    const rows = ["..k..", ".kok.", ".kkk.", "kkkkk"];
    this.cache.grave = this.make(rows, pal);
    return this.cache.grave;
  },
};

// ametivärvid (keha)
