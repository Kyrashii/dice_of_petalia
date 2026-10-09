// @ts-nocheck

export function createCharmRenderer(context) {
  function effectText(ch){
    const e=ch.variant.effect(ch.rank),bits=[],reroll=ch.family.trigger==="reroll";
    if(e.petals)bits.push(`+${e.petals} petals`);if(e.mult)bits.push(`+${e.mult} sparkle`);
    if(e.rerolls)return `+${e.rerolls} reroll${reroll?" (once per hand)":" after scoring"}`;
    return bits.join(" & ")+(reroll?" to your next hand":"");
  }
  function renderCharms(ready=[]){
    context.query("#charmCount").textContent=context.state.charms.length;
    if(!context.state.charms.length){context.query("#charmList").innerHTML=`<div class="empty-note">Win the first round and Lady Luma will offer you a lucky charm.</div>`;return}
    context.query("#charmList").innerHTML=context.state.charms.map((ch,i)=>{
      const isReady=ready.includes(ch),when=ch.family.trigger==="reroll"?"On reroll":"On play";
      const fresh=context.freshCharm?.index===i&&Date.now()<context.freshCharm.until;
      return `<div class="charm ${isReady?"ready":""} ${fresh?"is-new":""}" data-charm="${i}" title="${ch.family.desc}">
      <div class="charm-icon">${context.icons.charm(ch.variant.tone)}</div><div><strong>${ch.variant.label} ${ch.family.name}${ch.rank>1?` <i class="charm-rank" aria-label="rank ${ch.rank}">${"★".repeat(Math.min(ch.rank,5))}</i>`:""}</strong><span>${ch.family.desc}: ${effectText(ch)}</span><em class="charm-when">${isReady?"Ready this hand":when}</em></div></div>`}).join("");
  }
  return { effectText, renderCharms };
}
