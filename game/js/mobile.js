// mobile.js — mobiilivaate loogika: alumine leht, tegevusriba, ülariba laiendus,
// logi täisvaade ja lahingu kaheastmeline sihtimine.
// Lauaarvutis ei tee midagi peale akna kuulamise.
"use strict";

const Mobile = {
  BREAK: 820,
  on: false,

  isMobile() { return window.innerWidth <= this.BREAK; },

  init() {
    this.wire();
    this.apply();
    window.addEventListener("resize", () => this.apply());
    window.addEventListener("orientationchange", () => setTimeout(() => this.apply(), 150));
  },

  apply() {
    const m = this.isMobile();
    if (m === this.on) return;
    this.on = m;
    document.body.classList.toggle("is-mobile", m);
    if (!m) {
      document.getElementById("main").classList.remove("camp-min");
      document.getElementById("topbar").classList.remove("tb-open");
    }
    this.syncTabs();
  },

  // ---------- laagri/paneeli jaotus ----------
  // Laager on fikseeritud riba, paneel täidab ülejäänu. Käepide peidab laagri,
  // kui on vaja pikka nimekirja korraga näha.
  toggleCamp() {
    const main = document.getElementById("main");
    const hidden = main.classList.toggle("camp-min");
    const lab = document.querySelector("#sheet-handle .sh-label");
    if (lab) lab.textContent = hidden ? "show camp" : "hide camp";
  },

  // ---------- ühendused ----------
  wire() {
    // käepide: klõps tsükleerib, lohistamine liigutab


    // tegevusriba: vahekaardid + kiirus
    document.querySelectorAll("#mob-tabs [data-mtab]").forEach(b => {
      b.addEventListener("click", () => {
        const name = b.dataset.mtab;
        document.querySelector('.tab[data-tab="' + name + '"]')?.click();
        this.syncTabs();
      });
    });

    const spd = document.getElementById("mt-speed");
    if (spd) spd.addEventListener("click", () => {
      if (!G) return;
      // paus → 1× → 2× → 4× → paus
      if (G.paused) { G.paused = false; G.speed = 1; }
      else if (G.speed === 1) G.speed = 2;
      else if (G.speed === 2) G.speed = 4;
      else G.paused = true;
      UI.refreshTop();
      this.syncSpeed();
    });

    // ülariba laiendus
    const more = document.getElementById("tb-more");
    if (more) more.addEventListener("click", () => {
      const tb = document.getElementById("topbar");
      const open = tb.classList.toggle("tb-open");
      more.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // pikk vajutus kuupäeval avab arendajapaneeli
    const date = document.getElementById("tb-date");
    if (date) {
      let timer = null;
      date.addEventListener("touchstart", () => {
        timer = setTimeout(() => { if (typeof Admin !== "undefined") Admin.toggle(); }, 700);
      }, { passive: true });
      ["touchend", "touchmove", "touchcancel"].forEach(ev =>
        date.addEventListener(ev, () => clearTimeout(timer), { passive: true }));
    }

    // logi: puude peale täisvaade
    const log = document.getElementById("log-overlay");
    if (log) log.addEventListener("click", () => { if (this.on) this.openLog(); });
    const lfClose = document.getElementById("lf-close");
    if (lfClose) lfClose.addEventListener("click", () => this.closeLog());
  },

  syncTabs() {
    const active = document.querySelector(".tab.active")?.dataset.tab;
    document.querySelectorAll("#mob-tabs [data-mtab]").forEach(b =>
      b.classList.toggle("active", b.dataset.mtab === active));
    this.syncSpeed();
  },

  syncSpeed() {
    const el = document.getElementById("mt-speed");
    if (!el || !G) return;
    el.querySelector(".mt-ico").textContent = G.paused ? "▶" : "⏸";
    el.querySelector(".mt-lab").textContent = G.paused ? "seis" : G.speed + "×";
  },

  // ---------- logi ----------
  openLog() {
    const box = document.getElementById("log-full");
    const body = box.querySelector(".lf-body");
    body.innerHTML = "";
    const entries = (G && G.log) ? G.log.slice(-60).reverse() : [];
    for (const e of entries) {
      const d = document.createElement("div");
      d.className = e.cls || "";
      d.textContent = e.msg;
      body.appendChild(d);
    }
    box.classList.add("open");
  },

  closeLog() { document.getElementById("log-full").classList.remove("open"); },
};

document.addEventListener("DOMContentLoaded", () => Mobile.init());
