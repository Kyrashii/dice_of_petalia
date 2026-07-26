// @ts-nocheck

export function createDiceAnimation(context) {
  function animateDice(indices){
    indices.forEach(i=>document.querySelector(`.die[data-i="${i}"]`)?.classList.add("rolling"));
  }
  return { animateDice };
}
