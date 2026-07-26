// @ts-nocheck

export function createSkinEffects(context) {
  function emitSkinEffect(trigger){const skin=context.activeSkin();if(trigger==="roll"&&skin&&context.effectUnlocked(skin))context.effects.skinEffect(skin)}
  return { emitSkinEffect };
}
