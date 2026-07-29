// @ts-nocheck
import newRunDiceSheetSource from "./assets/wuerfelanimation.png?inline";

// The painted grid is intentionally irregular. These measured bands exclude its
// divider lines without re-centering the individual dice poses.
export const SPRITE_COLUMNS = [
  { x: 0, width: 253 },
  { x: 258, width: 250 },
  { x: 513, width: 250 },
  { x: 768, width: 256 }
];
export const SPRITE_ROWS = [
  { y: 0, height: 231 },
  { y: 236, height: 237 },
  { y: 478, height: 228 },
  { y: 711, height: 233 }
];
const FRAME_DURATIONS = [110, 90, 85, 80, 80, 80, 95, 85, 80, 80, 100, 110, 90, 100, 120, 320];

export function getNewRunDiceFrameRect(frameIndex) {
  const index = Math.max(0, Math.min(15, frameIndex));
  const column = SPRITE_COLUMNS[index % 4];
  const row = SPRITE_ROWS[Math.floor(index / 4)];
  return { sx: column.x, sy: row.y, sw: column.width, sh: row.height };
}

export function createNewRunIntro({ query, audio, reduceMotion }) {
  const sheet = new Image();
  let sheetReady = false;
  let sheetFailed = false;
  let timer = null;
  let particles = [];
  let loadWaiters = [];

  sheet.onload = () => { sheetReady = true; loadWaiters.splice(0).forEach(({ resolve }) => resolve(sheet)); };
  sheet.onerror = () => { sheetFailed = true; loadWaiters.splice(0).forEach(({ reject }) => reject(new Error("New-run dice sheet could not be loaded"))); };
  sheet.src = newRunDiceSheetSource;

  function canvas() { return query("#newRunDiceCanvas"); }
  function overlay() { return query("#newRunIntro"); }

  function loadNewRunDiceSheet() {
    if (sheetReady) return Promise.resolve(sheet);
    if (sheetFailed) return Promise.reject(new Error("New-run dice sheet could not be loaded"));
    return new Promise((resolve, reject) => loadWaiters.push({ resolve, reject }));
  }

  function drawNewRunDiceFrame(frameIndex) {
    const target = canvas();
    if (!target || !sheetReady || !sheet.naturalWidth) return false;
    const context = target.getContext("2d");
    const index = Math.max(0, Math.min(15, frameIndex));
    const { sx, sy, sw, sh } = getNewRunDiceFrameRect(index);
    context.clearRect(0, 0, target.width, target.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    const scale = Math.min(target.width / sw, target.height / sh);
    const drawWidth = sw * scale, drawHeight = sh * scale;
    // Centre the measured frame rectangle only. The dice remains at its authored
    // in-frame position, preserving the crouch, hop and landing movement.
    context.drawImage(sheet, sx, sy, sw, sh, (target.width - drawWidth) / 2, (target.height - drawHeight) / 2, drawWidth, drawHeight);
    return true;
  }

  function makeParticles() {
    const layer = query("#newRunIntroParticles");
    if (!layer) return;
    clearParticles();
    const palette = ["#fff2a8", "#f7b5d2", "#c7b6ff", "#aee7d5"];
    particles = Array.from({ length: 13 }, (_, index) => {
      const dot = document.createElement("i");
      const angle = (Math.PI * 2 * index) / 13 + Math.random() * .24;
      const distance = 75 + Math.random() * 115;
      dot.style.setProperty("--intro-x", `${Math.cos(angle) * distance}px`);
      dot.style.setProperty("--intro-y", `${Math.sin(angle) * distance}px`);
      dot.style.setProperty("--intro-delay", `${Math.random() * .16}s`);
      dot.style.background = palette[index % palette.length];
      layer.append(dot);
      return dot;
    });
  }

  function clearParticles() {
    particles.forEach(particle => particle.remove());
    particles = [];
  }

  function cleanup() {
    clearTimeout(timer);
    timer = null;
    clearParticles();
    const intro = overlay();
    intro?.classList.remove("show", "finishing");
    intro?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("new-run-intro-active");
    query("#startScreen")?.classList.remove("intro-pending");
  }

  function finishNewRunIntro(onFinish) {
    const intro = overlay();
    if (!intro) { onFinish(); return; }
    intro.classList.add("finishing");
    timer = setTimeout(() => {
      cleanup();
      onFinish();
    }, reduceMotion ? 120 : 250);
  }

  function playNewRunIntro(onFinish) {
    if (!sheetReady || sheetFailed || !overlay() || !canvas()) return false;
    cleanup();
    const intro = overlay();
    document.body.classList.add("new-run-intro-active");
    query("#startScreen")?.classList.add("intro-pending");
    intro.classList.add("show");
    intro.setAttribute("aria-hidden", "false");
    audio.introHop();

    if (reduceMotion) {
      drawNewRunDiceFrame(15);
      timer = setTimeout(() => finishNewRunIntro(onFinish), 350);
      return true;
    }

    let frame = 0;
    const step = () => {
      drawNewRunDiceFrame(frame);
      if (frame === 6) { makeParticles(); audio.introSparkle(); }
      if (frame === 11) audio.introSparkle();
      if (frame === 15) {
        audio.introConfirm();
        timer = setTimeout(() => finishNewRunIntro(onFinish), FRAME_DURATIONS[frame]);
        return;
      }
      timer = setTimeout(() => { frame += 1; step(); }, FRAME_DURATIONS[frame]);
    };
    step();
    return true;
  }

  return { loadNewRunDiceSheet, drawNewRunDiceFrame, playNewRunIntro, finishNewRunIntro };
}
