// @ts-nocheck

export function createRerollCharmEffects(context) {
  function applyRerollCharmEffects(hits) {
    hits.forEach(ch=>{const e=ch.variant.effect(ch.rank);if(e.rerolls)context.state.rerollsLeft+=e.rerolls});
    if(hits.length)context.toast(`${hits.length} charm${hits.length>1?"s":""} twinkled!`);
  }

  return { applyRerollCharmEffects };
}
