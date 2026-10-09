// @ts-nocheck

// Tweens a number shown in an element from its last value to the new one.
// Falls back to setting the text directly without requestAnimationFrame or with reduced motion.
export function animateNumber(el, value, { duration = 420, reduceMotion = false, format = v => Math.round(v).toLocaleString() } = {}) {
  if (!el) return;
  const previous = Number(el.dataset.value);
  el.dataset.value = String(value);
  const raf = globalThis.requestAnimationFrame;
  if (!Number.isFinite(previous) || previous === value || !raf || reduceMotion) { el.textContent = format(value); return; }
  globalThis.cancelAnimationFrame?.(el._tween);
  el.classList.remove("num-up", "num-down");
  void el.offsetWidth;
  el.classList.add(value > previous ? "num-up" : "num-down");
  const start = performance.now();
  const step = now => {
    const progress = Math.min(1, (now - start) / duration), eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = format(previous + (value - previous) * eased);
    if (progress < 1) el._tween = raf(step);
  };
  el._tween = raf(step);
}
