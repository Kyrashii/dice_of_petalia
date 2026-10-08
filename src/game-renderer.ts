// @ts-nocheck

export function createGameRenderer(context) {
  function updateGardenPhase(){const phase=Math.min(5,Math.max(1,Math.ceil(context.state.level/5)));document.body.dataset.gardenPhase=String(phase);for(let i=1;i<=5;i++)document.body.classList.toggle(`garden-unlocked-${i}`,i<=phase)}
  const plural=(n,word)=>`${n} ${word}${n===1?"":"s"}`;
  // Counters, score and buttons. Cheap enough to call on every state change, and
  // separate from the dice so the numbers can update before an animation finishes.
  function renderStatus(){
    const state=context.state,q=context.query,p=context.previewStats();
    const remaining=Math.max(0,state.target-state.roundScore),clears=state.phase==="play"&&p.total>=remaining&&remaining>0;
    q("#levelText").textContent=`Round ${state.level} / 25`;
    q("#roundScore").textContent=state.roundScore.toLocaleString();
    q("#targetScore").textContent=state.target.toLocaleString();
    q("#progressFill").style.width=`${Math.min(100,state.roundScore/state.target*100)}%`;
    q("#roundHint").textContent=remaining<=0?"Target reached!":clears?`This hand clears the round! (${remaining.toLocaleString()} needed)`:`${remaining.toLocaleString()} more needed · ${plural(state.handsLeft,"hand")} left`;
    q("#roundHint").classList.toggle("clears",clears);
    q("#petals").textContent=p.petals;q("#mult").textContent=p.mult;q("#preview").textContent=p.total.toLocaleString();
    q("#handName").textContent=p.hand.name+` · Lv ${state.handLevels[p.hand.id]||1}`;
    const banked=[p.bonus.petals?`+${p.bonus.petals} petals`:"",p.bonus.mult?`+${p.bonus.mult} sparkle`:""].filter(Boolean).join(" ");
    q("#handDetail").textContent=p.hand.desc+(banked?` · ${banked} banked`:"")+(p.triggers.length?` · ${plural(p.triggers.length,"charm")} ready`:"");
    q("#rerolls").textContent=state.rerollsLeft;q("#hands").textContent=state.handsLeft;
    const count=context.selected.size;
    q("#rerollLabel").textContent=state.rerollsLeft<1?"No rerolls left":count?`Reroll ${plural(count,"die").replace("dies","dice")}`:"Tap dice to reroll";
    q("#rerollsUnit").textContent=state.rerollsLeft===1?"reroll left":"rerolls left";
    q("#handsUnit").textContent=state.handsLeft===1?"hand left":"hands left";
    q("#playLabel").textContent=`Play for ${p.total.toLocaleString()}`;
    q("#guardian").classList.toggle("is-worried",state.phase==="play"&&state.handsLeft===1);
    q("#rerollBtn").disabled=context.busy||state.rerollsLeft<1||count===0;
    q("#playBtn").disabled=context.busy||state.phase!=="play"||state.handsLeft<1;
    q("#playBtn").classList.toggle("clears",clears&&!context.busy);
    context.renderCharms(p.triggers);
  }
  function render(){
    updateGardenPhase();
    renderStatus();
    context.renderDice();
  }
  return { updateGardenPhase, renderStatus, render };
}
