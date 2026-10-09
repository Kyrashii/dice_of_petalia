// @ts-nocheck

// A first-run guide: a small bubble points at the real controls and moves on
// when the player actually does each thing (or presses Next).
export const COACH_STEPS = [
  { target: ".dice-row", text: "Tap any die you'd like to change. Picked dice float up.", waitFor: "select" },
  { target: "#rerollBtn", text: "Now reroll them! You get 3 rerolls each round.", waitFor: "reroll" },
  { target: ".score-row", text: "Your hand scores petals × sparkle. Tap here any time to see how.", next: "Next" },
  { target: "#hintBtn", text: "Not sure what to keep? Ask Luma for a tip.", next: "Next" },
  { target: "#playBtn", text: "Happy with your hand? Play it! Reach the target score within 3 hands.", waitFor: "play" }
];

export function createCoach(context) {
  let step = -1, bubble = null, target = null, onDone = null;
  const active = () => step >= 0;

  function place() {
    if (!bubble || !target) return;
    const rect = target.getBoundingClientRect(), box = bubble.getBoundingClientRect();
    const margin = 12, above = rect.top - box.height - margin > 8;
    const top = above ? rect.top - box.height - margin : rect.bottom + margin;
    const left = Math.max(10, Math.min(window.innerWidth - box.width - 10, rect.left + rect.width / 2 - box.width / 2));
    bubble.style.top = `${Math.max(8, top)}px`;
    bubble.style.left = `${left}px`;
    bubble.dataset.side = above ? "above" : "below";
    bubble.style.setProperty("--arrow-x", `${Math.max(18, Math.min(box.width - 18, rect.left + rect.width / 2 - left))}px`);
  }

  function show() {
    target?.classList.remove("coach-target");
    const current = COACH_STEPS[step];
    target = context.query(current.target);
    if (!target) { advance(); return; }
    target.classList.add("coach-target");
    bubble.innerHTML = `<span class="coach-step">${step + 1} / ${COACH_STEPS.length}</span><p>${current.text}</p><div class="coach-actions"><button type="button" class="coach-skip">Skip guide</button>${current.next ? `<button type="button" class="coach-next">${step === COACH_STEPS.length - 1 ? "Done" : current.next}</button>` : ""}</div>`;
    const skip = bubble.querySelector?.(".coach-skip");
    if (skip) skip.onclick = finish;
    const next = bubble.querySelector?.(".coach-next");
    if (next) next.onclick = advance;
    bubble.classList.remove("coach-in"); void bubble.offsetWidth; bubble.classList.add("coach-in");
    if (globalThis.requestAnimationFrame) requestAnimationFrame(place); else place();
    target.scrollIntoView?.({ block: "nearest", behavior: context.reduceMotion ? "auto" : "smooth" });
  }

  function advance() {
    step++;
    if (step >= COACH_STEPS.length) { finish(); return; }
    show();
  }

  function start(done) {
    if (active()) return;
    onDone = done;
    bubble = document.createElement("div");
    bubble.className = "coach";
    bubble.setAttribute("role", "status");
    document.body.appendChild(bubble);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    step = -1; advance();
  }

  function finish() {
    target?.classList.remove("coach-target");
    bubble?.remove(); bubble = target = null; step = -1;
    window.removeEventListener("resize", place);
    window.removeEventListener("scroll", place, true);
    onDone?.(); onDone = null;
  }

  // Game actions call this; the guide moves on when it was waiting for that action.
  function notify(action) {
    if (!active()) return;
    if (COACH_STEPS[step].waitFor === action) setTimeout(advance, action === "select" ? 150 : 650);
    else if (action === "play") setTimeout(finish, 650);
    else place();
  }

  return { start, notify, finish, get active() { return active(); } };
}
