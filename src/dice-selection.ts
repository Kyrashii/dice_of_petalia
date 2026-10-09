// @ts-nocheck

export function createDiceSelection(context) {
  function canSelect(){return !!context.state&&!context.busy&&context.state.phase==="play"}
  function toggleDie(i){
    if(!canSelect()||i<0||i>=context.state.dice.length)return;
    const hadFocus=document.activeElement?.classList?.contains("die");
    if(context.selected.has(i))context.selected.delete(i);else context.selected.add(i);
    context.renderDice();context.renderStatus();
    // Re-rendering replaces the buttons; keep keyboard users on the die they toggled.
    const die=context.query(`.die[data-i="${i}"]`);
    if(hadFocus)die?.focus?.({preventScroll:true});
    if(die&&!context.reduceMotion){
      const name=context.selected.has(i)?"just-picked":"just-dropped";
      die.classList.add(name);setTimeout(()=>die.classList.remove(name),300);
    }
    context.clickSound(context.selected.has(i)?520:430,.03);
  }
  function clearSelection(){
    if(!canSelect()||!context.selected.size)return;
    context.selected.clear();context.renderDice();context.renderStatus();
  }
  return { toggleDie, clearSelection };
}
