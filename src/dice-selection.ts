// @ts-nocheck

export function createDiceSelection(context) {
  function toggleDie(i){
    if(context.busy)return;
    if(context.selected.has(i))context.selected.delete(i);else context.selected.add(i);
    context.renderDice();context.query("#rerollBtn").disabled=context.state.rerollsLeft<1||context.selected.size===0;
    context.clickSound(430,.03);
  }
  return { toggleDie };
}
