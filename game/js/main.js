// main.js — mängutsükkel. Simulatsioon käib setInterval'il (töötab ka peidetud
// vahekaardil, throttled), renderdus requestAnimationFrame'il.
"use strict";

(function () {
  let lastRender = performance.now();
  let lastSim = performance.now();
  let simAcc = 0;

  function simStep() {
    const now = performance.now();
    let dt = (now - lastSim) / 1000;
    lastSim = now;
    if (dt > 1.5) dt = 1.5; // taustal viibinud aeg ei kuhju hüppeks

    if (window.__labLock) return; // balansilabor kasutab simulatsiooni ise
    if (!G || G.paused || G.over || G.combat || UI.modalOpen) { simAcc = 0; return; }
    simAcc += dt * G.speed;
    let guard = 0;
    while (simAcc >= DATA.DAY_SECONDS && guard < 4) {
      simAcc -= DATA.DAY_SECONDS;
      Sim.simDay();
      guard++;
      if (!G || G.paused || G.combat || UI.modalOpen || G.over) { simAcc = 0; break; }
    }
  }

  function renderLoop(now) {
    const dt = Math.min(0.1, (now - lastRender) / 1000);
    lastRender = now;
    if (G) Render.frame(dt);
    requestAnimationFrame(renderLoop);
  }

  document.addEventListener("DOMContentLoaded", () => {
    UI.init();
    Render.init(document.getElementById("game-canvas"));
    setInterval(simStep, 100);
    requestAnimationFrame(t => { lastRender = t; requestAnimationFrame(renderLoop); });

    // perioodiline UI-värskendus (kell jm), kord sekundis
    setInterval(() => { if (G && !UI.modalOpen) UI.refreshTop(); }, 1000);
    // automaatsalvestus
    setInterval(() => UI.saveGame(), 30000);
  });
})();
