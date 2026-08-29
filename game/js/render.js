// render.js — laagri ülaltvaade, pixel-art. Ainult brauseris.
"use strict";

const Render = {
  cv: null, ctx: null,
  terrainCache: {}, // "siteId:season" -> canvas
  fireFrame: 0, fireT: 0,
  snow: [],

  SLOTS: {
    fire: { x: 470, y: 300 },
    onn: [[350, 215], [565, 210], [345, 390], [580, 390], [295, 300], [645, 300]],
    raam: [[425, 175], [520, 175], [425, 435], [520, 435], [375, 150], [570, 150], [375, 465], [570, 465]],
    pyha: [480, 92],
    tookoht: [625, 345],
    cave: [95, 95],
  },

  init(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < 60; i++) this.snow.push({ x: U.r() * 960, y: U.r() * 600, s: 0.4 + U.r() });
  },

  seasonGround(season) {
    return [["#4a6238", "#556e40", "#3f5530"],   // kevad
            ["#4f6a34", "#5b783c", "#445c2e"],   // suvi
            ["#6e5c30", "#7d6a38", "#5e4e29"],   // sügis
            ["#c9ccd4", "#d4d7de", "#b8bcc7"]][season]; // talv
  },

  terrain(site, season) {
    const key = site.id + ":" + season;
    if (this.terrainCache[key]) return this.terrainCache[key];
    const c = document.createElement("canvas");
    c.width = 960; c.height = 600;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const rng = mulberry32(site.id * 991 + season * 31 + 7);
    const [g0, g1, g2] = this.seasonGround(season);

    ctx.fillStyle = g0;
    ctx.fillRect(0, 0, 960, 600);
    // muster
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = rng() < 0.5 ? g1 : g2;
      ctx.fillRect(Math.floor(rng() * 240) * 4, Math.floor(rng() * 150) * 4, 4, 4);
    }
    // laagriplats: tallatud maa
    ctx.fillStyle = season === 3 ? "#b3aa9a" : "#7d6a4e";
    ctx.beginPath();
    ctx.ellipse(490, 310, 195, 150, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = season === 3 ? "#c1b8a8" : "#8a765a";
    for (let i = 0; i < 260; i++) {
      const a = rng() * Math.PI * 2, r = Math.sqrt(rng());
      ctx.fillRect(Math.floor((490 + Math.cos(a) * 190 * r) / 4) * 4, Math.floor((310 + Math.sin(a) * 145 * r) / 4) * 4, 4, 4);
    }

    // jõgi paremal
    if (site.river) {
      const w = 70;
      ctx.fillStyle = season === 3 ? "#aebfd4" : "#3d6a8a";
      for (let y = 0; y < 600; y += 4) {
        const off = Math.sin(y / 55) * 14;
        ctx.fillRect(866 + off, y, 960 - 866, 4);
      }
      ctx.fillStyle = season === 3 ? "#c4d2e4" : "#4d7da0";
      for (let i = 0; i < 130; i++) {
        const y = Math.floor(rng() * 150) * 4;
        const off = Math.sin(y / 55) * 14;
        ctx.fillRect(870 + off + Math.floor(rng() * 18) * 4, y, 4, 4);
      }
    }

    // puud servades (deterministlikud)
    const treeSpots = [];
    for (let i = 0; i < 58; i++) {
      let x, y, tries = 0;
      do {
        x = rng() * 920 + 10; y = rng() * 555 + 5;
        tries++;
      } while (tries < 20 && (Math.hypot(x - 490, y - 320) < 230 || (site.river && x > 820)));
      if (Math.hypot(x - 490, y - 320) < 225) continue;
      treeSpots.push({ x, y, kind: rng() < 0.45 ? "kuusk" : "leht" });
    }
    treeSpots.sort((a, b) => a.y - b.y);
    for (const t of treeSpots) {
      const spr = Sprites.tree(t.kind, season);
      ctx.drawImage(spr, Math.floor(t.x), Math.floor(t.y), spr.width * 3, spr.height * 3);
    }
    // kivid
    for (let i = 0; i < 6; i++) {
      const x = rng() * 800 + 60, y = rng() * 500 + 40;
      if (Math.hypot(x - 490, y - 320) < 160) continue;
      const spr = Sprites.rock();
      ctx.drawImage(spr, Math.floor(x), Math.floor(y), spr.width * 3, spr.height * 3);
    }
    // koobas
    if (site.cave) {
      const spr = Sprites.cave();
      ctx.drawImage(spr, this.SLOTS.cave[0], this.SLOTS.cave[1], spr.width * 4, spr.height * 4);
    }
    this.terrainCache[key] = c;
    return c;
  },

  // inimese sihtpunkt ameti järgi
  anchor(p) {
    const site = Sim.curSite();
    if (p.sick || p.wound > 0) return { x: 470 + U.rf(-40, 60), y: 330 + U.rf(-20, 40) };
    if (p.child) return { x: 480 + U.rf(-50, 50), y: 315 + U.rf(-35, 45) };
    switch (p.job) {
      case "korilane":
        if (p.mode === "seened") return { x: U.rf(150, 350), y: U.rf(90, 190) };
        if (p.mode === "materjal") return { x: U.rf(600, 760), y: U.rf(100, 200) };
        if (p.mode === "kuivatab") { const s = this.SLOTS.raam[0]; return { x: s[0] + U.rf(-10, 40), y: s[1] + U.rf(0, 30) }; }
        return { x: U.rf(140, 310), y: U.rf(380, 530) };
      case "kalur":
        return site.river ? { x: U.rf(820, 850), y: U.rf(120, 480) } : { x: U.rf(700, 800), y: U.rf(430, 520) };
      case "kytt": return { x: U.rf(120, 820), y: U.rf(70, 530) };
      case "sodalane": {
        const a = U.r() * Math.PI * 2;
        return { x: 480 + Math.cos(a) * 150, y: 310 + Math.sin(a) * 120 };
      }
      case "meister": {
        if (site.b.tookoht) { const s = this.SLOTS.tookoht; return { x: s[0] + U.rf(-15, 45), y: s[1] + U.rf(-10, 30) }; }
        return { x: 520 + U.rf(-30, 50), y: 340 + U.rf(-20, 30) };
      }
      case "skaut": return { x: U.rf(680, 800), y: U.rf(60, 130) };
      case "samaan": {
        if (site.b.pyha) return { x: this.SLOTS.pyha[0] + U.rf(-15, 40), y: this.SLOTS.pyha[1] + U.rf(15, 45) };
        return { x: 450 + U.rf(-30, 40), y: 280 + U.rf(-20, 30) };
      }
    }
    return { x: 480, y: 320 };
  },

  updatePeople(dt) {
    for (const p of Sim.alive()) {
      if (p.away) continue;
      const pos = p.pos;
      pos.wander -= dt;
      if (pos.wander <= 0 || (Math.abs(pos.x - pos.tx) < 4 && Math.abs(pos.y - pos.ty) < 4)) {
        const a = this.anchor(p);
        pos.tx = U.clamp(a.x, 20, 930); pos.ty = U.clamp(a.y, 20, 560);
        pos.wander = U.rf(3, 9);
      }
      const spd = 28 * dt * (G.speed || 1) * 0.7 + 14 * dt;
      const dx = pos.tx - pos.x, dy = pos.ty - pos.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) {
        pos.x += dx / d * Math.min(spd, d);
        pos.y += dy / d * Math.min(spd, d);
      }
    }
  },

  frame(dt) {
    if (!G || !this.ctx) return;
    const ctx = this.ctx;
    const site = Sim.curSite();

    // teekonnavaade
    if (G.journey) {
      this.journeyFrame(dt);
      return;
    }

    this.updatePeople(dt);
    this.fireT += dt;
    if (this.fireT > 0.28) { this.fireT = 0; this.fireFrame = (this.fireFrame + 1) % 3; }

    ctx.drawImage(this.terrain(site, G.season), 0, 0);

    // tara
    if (site.b.tara) {
      const post = Sprites.fencePost();
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 26) {
        const x = 480 + Math.cos(a) * 218, y = 312 + Math.sin(a) * 172;
        ctx.drawImage(post, Math.floor(x), Math.floor(y), post.width * 3, post.height * 3);
      }
    }

    // ehitised
    for (let i = 0; i < site.b.onn; i++) {
      const s = this.SLOTS.onn[i % this.SLOTS.onn.length];
      const spr = Sprites.hut();
      ctx.drawImage(spr, s[0], s[1], spr.width * 3, spr.height * 3);
    }
    for (let i = 0; i < site.b.raam; i++) {
      const s = this.SLOTS.raam[i % this.SLOTS.raam.length];
      const spr = Sprites.rack();
      ctx.drawImage(spr, s[0], s[1], spr.width * 3, spr.height * 3);
    }
    if (site.b.pyha) {
      const spr = Sprites.sacred();
      ctx.drawImage(spr, this.SLOTS.pyha[0], this.SLOTS.pyha[1], spr.width * 3, spr.height * 3);
    }
    if (site.b.tookoht) {
      const spr = Sprites.workshop();
      ctx.drawImage(spr, this.SLOTS.tookoht[0], this.SLOTS.tookoht[1], spr.width * 3, spr.height * 3);
    }
    // kalmed
    for (let i = 0; i < Math.min(site.graves, 8); i++) {
      const spr = Sprites.grave();
      ctx.drawImage(spr, 545 + (i % 4) * 18, 88 + Math.floor(i / 4) * 16, spr.width * 2, spr.height * 2);
    }

    // lõke: kuma + leek
    const fx = this.SLOTS.fire.x, fy = this.SLOTS.fire.y;
    const glow = ctx.createRadialGradient(fx + 20, fy + 15, 4, fx + 20, fy + 15, 55);
    glow.addColorStop(0, "rgba(242,160,60,0.28)");
    glow.addColorStop(1, "rgba(242,160,60,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(fx - 40, fy - 40, 120, 110);
    const fire = Sprites.fire(this.fireFrame);
    ctx.drawImage(fire, fx, fy, fire.width * 5, fire.height * 5);

    // inimesed (y-järjekorras)
    const ppl = Sim.alive().filter(p => !p.away).sort((a, b) => a.pos.y - b.pos.y);
    const walkFrame = Math.floor(performance.now() / 260) % 2;
    for (const p of ppl) {
      const moving = Math.abs(p.pos.x - p.pos.tx) > 4 || Math.abs(p.pos.y - p.pos.ty) > 4;
      let spr;
      if (p.child) spr = Sprites.child(moving ? walkFrame : 0);
      else spr = Sprites.villager(JOB_COLORS[p.job] || "888888", "c9915e", moving ? walkFrame : 0);
      const scale = 2;
      const x = Math.floor(p.pos.x - spr.width), y = Math.floor(p.pos.y - spr.height * 2);
      ctx.drawImage(spr, x, y, spr.width * scale, spr.height * scale);
      // tervis / staatus
      if (p.health < 70 || p.sick || p.wound > 0) {
        ctx.fillStyle = "#000";
        ctx.fillRect(x, y - 5, 16, 3);
        ctx.fillStyle = p.sick ? "#c9a83c" : p.health < 35 ? "#c9503c" : "#7fa650";
        ctx.fillRect(x, y - 5, Math.max(1, 16 * p.health / 100), 3);
      }
      if (p.relicKeyCache === undefined) p.relicKeyCache = null;
      if (G.relics.some(r => r.bearerId === p.id)) {
        ctx.fillStyle = "#a06ac9";
        ctx.fillRect(x + 6, y - 9, 4, 4);
      }
    }

    // lumi
    if (G.season === 3) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (const f of this.snow) {
        f.y += f.s * 60 * dt; f.x += Math.sin(f.y / 40) * 0.4;
        if (f.y > 600) { f.y = -4; f.x = U.r() * 960; }
        ctx.fillRect(Math.floor(f.x), Math.floor(f.y), 2, 2);
      }
    }
    // kevadine/sügisene toon
    if (G.season === 2) {
      ctx.fillStyle = "rgba(180,110,30,0.06)";
      ctx.fillRect(0, 0, 960, 600);
    }

    // paus-riba
    if (G.paused && !G.over) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 280, 960, 42);
      ctx.fillStyle = "#e8dcc4";
      ctx.font = "bold 20px 'Courier New'";
      ctx.textAlign = "center";
      ctx.fillText("PAUS — tühik jätkab", 480, 308);
      ctx.textAlign = "left";
    }
  },

  journeyFrame(dt) {
    const ctx = this.ctx;
    const j = G.journey;
    ctx.fillStyle = G.season === 3 ? "#c9ccd4" : "#4f6a34";
    ctx.fillRect(0, 0, 960, 600);
    const rng = mulberry32(77);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = G.season === 3 ? "#b8bcc7" : "#445c2e";
      ctx.fillRect(Math.floor(rng() * 240) * 4, Math.floor(rng() * 150) * 4, 4, 4);
    }
    for (let i = 0; i < 26; i++) {
      const spr = Sprites.tree(rng() < 0.5 ? "kuusk" : "leht", G.season);
      ctx.drawImage(spr, rng() * 900, rng() * 250, spr.width * 3, spr.height * 3);
    }
    // rada
    ctx.strokeStyle = "#7d6a4e"; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(0, 430); ctx.bezierCurveTo(300, 400, 620, 460, 960, 420); ctx.stroke();
    // rühm liigub üle ekraani, kolonnis, nagu päris rännak: eesotsas skaudid, taga lapsed
    const prog = 1 - j.days / j.total;
    const walkFrame = Math.floor(performance.now() / 220) % 2;
    const ppl = Sim.alive().slice().sort((a, b) => (a.child ? 1 : 0) - (b.child ? 1 : 0));
    const headX = U.lerp(70, 880, prog);
    ppl.forEach((p, i) => {
      const x = headX - i * 26;
      if (x < -20) return;
      const y = 400 + Math.sin((x + i * 17) / 60) * 12 + (i % 3) * 9;
      const spr = p.child ? Sprites.child(walkFrame) : Sprites.villager(JOB_COLORS[p.job] || "888888", "c9915e", walkFrame);
      ctx.drawImage(spr, Math.floor(x), Math.floor(y), spr.width * 2, spr.height * 2);
    });
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(280, 40, 400, 54);
    ctx.fillStyle = "#e8dcc4";
    ctx.font = "bold 16px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText("Teel: " + G.sites[j.to].name, 480, 62);
    ctx.font = "13px 'Courier New'";
    ctx.fillText((j.total - j.days) + "/" + j.total + " päeva käidud", 480, 82);
    ctx.textAlign = "left";
  },
};
