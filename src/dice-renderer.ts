// @ts-nocheck

export function createDiceRenderer(context) {
  function renderDice(){
    const skin=context.activeSkin();
    context.query("#diceRow").innerHTML=context.state.dice.map((n,i)=>{const picked=context.selected.has(i);return `<button class="die ${skin?"skinned-die":""} ${picked?"selected":""}" type="button" data-i="${i}" aria-pressed="${picked}" aria-label="Die ${i+1} showing ${n}${picked?", will be rerolled":""}">${skin?context.skinFace(skin.id,n):context.pips(n)}</button>`}).join("");
    document.querySelectorAll(".die").forEach(el=>el.onclick=()=>context.toggleDie(+el.dataset.i));
  }
  return { renderDice };
}
