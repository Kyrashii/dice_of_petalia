// @ts-nocheck
import { charmTotals, emptyBonus } from "./run-state";

export function createRerollCharmEffects(context) {
  // Reroll charms refund at most one reroll each per hand, so a charm like
  // "reroll exactly one die" cannot loop forever. Petals and sparkle are banked
  // for the next hand that is played.
  function applyRerollCharmEffects(hits) {
    const state=context.state;
    state.refunded=state.refunded||[];
    state.bonus=state.bonus||emptyBonus();
    const refundable=hits.filter(ch=>!state.refunded.includes(state.charms.indexOf(ch)));
    const refund=charmTotals(refundable).rerolls,banked=charmTotals(hits);
    refundable.forEach(ch=>{if(ch.variant.effect(ch.rank).rerolls)state.refunded.push(state.charms.indexOf(ch))});
    state.rerollsLeft+=refund;
    state.bonus.petals+=banked.petals;state.bonus.mult+=banked.mult;
    const bits=[];
    if(refund)bits.push(`+${refund} reroll${refund>1?"s":""}`);
    if(banked.petals)bits.push(`+${banked.petals} petals`);
    if(banked.mult)bits.push(`+${banked.mult} sparkle`);
    if(!bits.length)return;
    context.toast(`${hits.length} charm${hits.length>1?"s":""} twinkled${bits.length?`: ${bits.join(", ")}`:""}${banked.petals||banked.mult?" for your next hand":""}!`);
  }

  return { applyRerollCharmEffects };
}
