// @ts-nocheck
import atlasUrl from "./assets/luma-atlas.webp";

// luma-atlas.webp is built by scripts/build_sprites.py: a uniform grid where
// every pose stands on the same baseline, so any frame can follow any other.
export const LUMA_CELL = { width: 400, height: 420 };
export const LUMA_POSES = { idle: { row: 0, frames: 4 }, happy: { row: 1, frames: 4 }, dice: { row: 2, frames: 4 }, sad: { row: 3, frames: 6 } };

// Each step is [pose, frame, milliseconds, motion]. Motion names a CSS
// animation on the guardian (hop, bounce, shiver, squish) that plays with it.
export const LUMA_CLIPS = {
  blink: [["idle", 2, 130]],
  glance: [["idle", 1, 650], ["idle", 3, 650]],
  wiggle: [["happy", 0, 260, "squish"], ["happy", 3, 420]],
  dice: [["dice", 0, 170], ["dice", 1, 170], ["dice", 2, 210, "hop"], ["dice", 3, 320]],
  happy: [["happy", 0, 130], ["happy", 1, 150, "hop"], ["happy", 2, 190], ["happy", 3, 220]],
  cheer: [["happy", 1, 150, "hop"], ["happy", 2, 170], ["happy", 1, 150, "hop"], ["happy", 2, 190], ["dice", 3, 380, "bounce"]],
  pet: [["happy", 3, 110, "squish"], ["idle", 2, 260], ["happy", 2, 300, "bounce"], ["happy", 3, 220]],
  wince: [["sad", 3, 300], ["sad", 4, 420, "shiver"], ["sad", 0, 260]],
  nervous: [["sad", 3, 900], ["sad", 4, 650], ["sad", 0, 700]],
  loss: [["sad", 0, 600], ["sad", 1, 420], ["sad", 2, 900], ["sad", 1, 380], ["sad", 3, 700], ["sad", 4, 650], ["sad", 5, 520, "shiver"], ["sad", 5, 520, "shiver"]]
};

export function lumaFrameRect(pose, frame) {
  const info = LUMA_POSES[pose] ?? LUMA_POSES.idle;
  const index = Math.max(0, Math.min(info.frames - 1, frame));
  return { sx: index * LUMA_CELL.width, sy: info.row * LUMA_CELL.height, sw: LUMA_CELL.width, sh: LUMA_CELL.height };
}

export function createLuma(context) {
  const image = new Image();
  let ready = false, clipTimer = null, idleTimer = null, lossTimer = null, playing = null;
  let current = ["idle", 0], lossFrame = ["sad", 0];

  function draw(canvas, pose, frame) {
    canvas.dataset.petState = pose;
    canvas.dataset.petFrame = String(frame);
    if (!ready || !canvas.getContext) return;
    const { sx, sy, sw, sh } = lumaFrameRect(pose, frame);
    const ctx = canvas.getContext("2d");
    const scale = Math.min(canvas.width / sw, canvas.height / sh);
    const w = sw * scale, h = sh * scale;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, sx, sy, sw, sh, (canvas.width - w) / 2, canvas.height - h, w, h);
  }
  function show(pose, frame) {
    current = [pose, frame];
    document.querySelectorAll("canvas.pet-sprite").forEach(canvas => draw(canvas, pose, frame));
  }
  function showLoss(pose, frame) {
    lossFrame = [pose, frame];
    document.querySelectorAll("canvas.loss-pet-sprite").forEach(canvas => draw(canvas, pose, frame));
  }
  function setMotion(motion) {
    const stage = context.query("#guardian");
    if (!stage) return;
    stage.dataset.lumaMove = "";
    if (!motion || context.reduceMotion) return;
    void stage.offsetWidth;
    stage.dataset.lumaMove = motion;
  }

  function isWorried() {
    const state = context.state;
    return !!state && state.phase === "play" && state.handsLeft === 1 && !!context.query("#startScreen")?.classList.contains("hidden");
  }
  function restPose() { return isWorried() ? ["sad", 0] : ["idle", 0]; }

  function clearTimers() { clearTimeout(clipTimer); clearTimeout(idleTimer); clipTimer = idleTimer = null; }

  // Plays a named clip `repeat` times, then settles back into the idle loop.
  function play(name, repeat = 1) {
    const clip = LUMA_CLIPS[name] ?? LUMA_CLIPS.happy;
    clearTimers();
    playing = name;
    if (context.reduceMotion) {
      const [pose, frame] = clip[clip.length - 1];
      show(pose, frame);
      clipTimer = setTimeout(startPetIdle, 650);
      return;
    }
    const steps = Array.from({ length: Math.max(1, repeat) }, () => clip).flat();
    let index = 0;
    const step = () => {
      if (index >= steps.length) { startPetIdle(); return; }
      const [pose, frame, ms, motion] = steps[index++];
      show(pose, frame); setMotion(motion);
      clipTimer = setTimeout(step, ms);
    };
    step();
  }

  // Idle: hold the rest pose, with a blink, glance or wiggle every few seconds.
  function startPetIdle() {
    clearTimers();
    playing = null;
    show(...restPose()); setMotion(null);
    if (context.reduceMotion) return;
    const next = () => {
      if (isWorried()) { idleClip(Math.random() < .7 ? "nervous" : "blink"); return; }
      const roll = Math.random();
      idleClip(roll < .6 ? "blink" : roll < .85 ? "glance" : "wiggle");
    };
    idleTimer = setTimeout(next, 1800 + Math.random() * 2600);
  }
  function idleClip(name) {
    const steps = LUMA_CLIPS[name];
    let index = 0;
    const step = () => {
      if (index >= steps.length) { startPetIdle(); return; }
      const [pose, frame, ms, motion] = steps[index++];
      // Blinks in the worried state use the teary sad frame instead of idle.
      show(isWorried() && pose === "idle" ? "sad" : pose, isWorried() && pose === "idle" ? 4 : frame); setMotion(motion);
      idleTimer = setTimeout(step, ms);
    };
    step();
  }
  // Called after renders so the rest pose follows the game (e.g. last hand).
  function refreshLuma() {
    if (playing) return;
    const [pose, frame] = restPose();
    if (current[0] === "idle" && pose === "idle" || current[0] === "sad" && pose === "sad") return;
    startPetIdle();
  }

  function showSadPet() {
    clearTimeout(lossTimer);
    const steps = LUMA_CLIPS.loss;
    if (context.reduceMotion) { showLoss("sad", 0); return; }
    let index = 0;
    const step = () => {
      const [pose, frame, ms] = steps[index % steps.length];
      showLoss(pose, frame); index++;
      lossTimer = setTimeout(step, ms);
    };
    step();
  }
  function stopSadPet() { clearTimeout(lossTimer); lossTimer = null; }

  function loadPetSheet() {
    image.onload = () => { ready = true; show(...current); showLoss(...lossFrame); };
    image.onerror = () => context.toast("Lady Luma's sprite sheet could not be loaded.");
    image.src = atlasUrl;
  }

  return { loadPetSheet, startPetIdle, animatePet: play, showSadPet, stopSadPet, refreshLuma, setPetFrame: show };
}
