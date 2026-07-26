// @ts-nocheck

export function createCharmRenderer(context) {
  function effectText(ch){const e=ch.variant.effect(ch.rank),bits=[];if(e.petals)bits.push(`+${e.petals} petals`);if(e.mult)bits.push(`+${e.mult} sparkle`);if(e.rerolls)bits.push(`+${e.rerolls} reroll`);return bits.join(" & ")}
  function renderCharms(){
    context.query("#charmCount").textContent=context.state.charms.length;
    if(!context.state.charms.length){context.query("#charmList").innerHTML=`<div class="empty-note">Win the first round and Lady Luma will offer you a lucky charm.</div>`;return}
    context.query("#charmList").innerHTML=context.state.charms.map((ch,i)=>`<div class="charm" data-charm="${i}" title="${ch.family.desc}">
      <div class="charm-icon">${context.icons.charm(ch.variant.tone)}</div><div><strong>${ch.variant.label} ${ch.family.name}${ch.rank>1?` · ${ch.rank}`:""}</strong><span>${ch.family.desc}: ${effectText(ch)}</span></div></div>`).join("");
  }
  return { effectText, renderCharms };
}
