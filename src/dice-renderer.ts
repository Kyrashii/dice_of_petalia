// @ts-nocheck

export function createDiceRenderer(context) {
  function renderDice(){
    const skin=context.activeSkin();
    context.query("#diceRow").innerHTML=context.state.dice.map((n,i)=>`<button class="die ${skin?"skinned-die":""} ${context.selected.has(i)?"selected":""}" data-i="${i}" aria-label="Die ${i+1}: ${n}${context.selected.has(i)?", selected for reroll":""}">${skin?context.skinFace(skin.id,n):context.pips(n)}</button>`).join("");
    document.querySelectorAll(".die").forEach(el=>el.onclick=()=>context.toggleDie(+el.dataset.i));
  }
  return { renderDice };
}
