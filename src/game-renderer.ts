// @ts-nocheck

export function createGameRenderer(context) {
  function updateGardenPhase(){const phase=Math.min(5,Math.max(1,Math.ceil(context.state.level/5)));document.body.dataset.gardenPhase=String(phase);for(let i=1;i<=5;i++)document.body.classList.toggle(`garden-unlocked-${i}`,i<=phase)}
  function render(){
    updateGardenPhase();
    const p=context.previewStats();
    context.query("#levelText").textContent=`Round ${context.state.level} / 25`;
    context.query("#roundScore").textContent=context.state.roundScore.toLocaleString();
    context.query("#targetScore").textContent=context.state.target.toLocaleString();
    context.query("#progressFill").style.width=`${Math.min(100,context.state.roundScore/context.state.target*100)}%`;
    context.query("#petals").textContent=p.petals;context.query("#mult").textContent=p.mult;context.query("#preview").textContent=p.total.toLocaleString();
    context.query("#handName").textContent=p.hand.name+` · Lv ${context.state.handLevels[p.hand.id]}`;context.query("#handDetail").textContent=p.hand.desc;
    context.query("#rerolls").textContent=context.state.rerollsLeft;context.query("#hands").textContent=context.state.handsLeft;
    context.query("#guardian").classList.toggle("is-worried",context.state.phase==="play"&&context.state.handsLeft===1);
    context.query("#rerollBtn").disabled=context.busy||context.state.rerollsLeft<1||context.selected.size===0;context.query("#playBtn").disabled=context.busy;
    context.renderDice();context.renderCharms();context.updateSound();
  }
  return { updateGardenPhase, render };
}
