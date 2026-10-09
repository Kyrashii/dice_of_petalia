// @ts-nocheck

export function createDiceAnimation(context) {
  const dieAt = i => document.querySelector(`.die[data-i="${i}"]`);
  const faceFor = value => {
    const skin = context.activeSkin?.();
    return skin ? context.skinFace(skin.id, value) : context.pips(value);
  };
  // Restarts a CSS animation class on an element, with an optional stagger.
  function pulse(el, className, delay = 0) {
    if (!el) return;
    el.classList.remove(className);
    void el.offsetWidth;
    el.style.setProperty("--anim-delay", `${delay}ms`);
    el.classList.add(className);
  }

  // Rerolled dice spin and flicker through random faces until the result lands.
  function tumbleDice(indices, duration = 420) {
    const dice = indices.map(dieAt).filter(Boolean);
    if (context.reduceMotion || !dice.length) return context.wait(Math.min(duration, 120));
    dice.forEach((el, k) => pulse(el, "tumbling", k * 35));
    const timer = setInterval(() => dice.forEach(el => { el.innerHTML = faceFor(1 + Math.floor(Math.random() * 6)); }), 70);
    return context.wait(duration).then(() => clearInterval(timer));
  }

  // After a render: landed dice squash, settle and puff a little dust.
  function landDice(indices) {
    if (context.reduceMotion) return;
    indices.forEach((i, k) => {
      const el = dieAt(i);
      pulse(el, "landing", k * 45);
      setTimeout(() => {
        const rect = el?.getBoundingClientRect?.();
        if (rect) context.effects.dust(rect.left + rect.width / 2, rect.bottom - 4);
      }, k * 45 + 90);
    });
  }

  // A fresh hand: the dice drop onto the table one after another.
  function dealDice() {
    if (context.reduceMotion) return;
    [0, 1, 2, 3, 4].forEach(i => pulse(dieAt(i), "dealing", i * 70));
    setTimeout(() => context.audio?.deal?.(), 120);
  }

  // The dice that form the hand hop in order and glow before the score lands.
  function highlightScoring(indices, tier) {
    const step = context.reduceMotion ? 0 : 85;
    document.querySelectorAll(".die").forEach(el => el.classList.add("dimmed"));
    indices.forEach((i, k) => {
      const el = dieAt(i);
      if (!el) return;
      el.classList.remove("dimmed");
      el.dataset.tier = tier;
      pulse(el, "scoring", k * step);
    });
    return context.wait(indices.length * step + 260);
  }

  // Kept for existing callers: a new set of dice arrives.
  function animateDice(indices) {
    if (indices.length === 5) dealDice(); else landDice(indices);
  }

  return { animateDice, tumbleDice, landDice, dealDice, highlightScoring };
}
