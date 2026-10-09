// @ts-nocheck
import { handTier, handsData, levelPetals } from "./game-rules";
import { animateNumber } from "./number-animation";

export function createGameRenderer(context) {
  let shownLevel=null;
  function updateGardenPhase(){
    const phase=Math.min(5,Math.max(1,Math.ceil(context.state.level/5))),previous=Number(document.body.dataset.gardenPhase)||phase;
    // The garden grows every five rounds: celebrate only when play advances into a new
    // phase, not when a saved run is continued or a new run resets the garden.
    const advanced=shownLevel!==null&&context.state.level===shownLevel+1;
    shownLevel=context.state.level;
    if(advanced&&phase>previous&&context.state.phase==="play"){context.effects.petalRain(50,["#ffc4dd","#fff1a8","#d9c8ff","#bff0db"]);context.audio.bloom?.();context.toast("The Moon Garden blooms a little brighter.")}
    document.body.dataset.gardenPhase=String(phase);for(let i=1;i<=5;i++)document.body.classList.toggle(`garden-unlocked-${i}`,i<=phase)}
  const plural=(n,word)=>`${n} ${word}${n===1?"":"s"}`;
  // Counters, score and buttons. Cheap enough to call on every state change, and
  // separate from the dice so the numbers can update before an animation finishes.
  function renderStatus(){
    const state=context.state,q=context.query,p=context.previewStats();
    const remaining=Math.max(0,state.target-state.roundScore),clears=state.phase==="play"&&p.total>=remaining&&remaining>0;
    q("#levelText").textContent=`Round ${state.level} / 25`;
    const tween=(el,value,duration)=>animateNumber(el,value,{duration,reduceMotion:context.reduceMotion});
    tween(q("#roundScore"),state.roundScore,700);
    q("#targetScore").textContent=state.target.toLocaleString();
    q("#progressFill").style.width=`${Math.min(100,state.roundScore/state.target*100)}%`;
    q(".progress")?.classList.toggle("full",state.roundScore>=state.target);
    q(".progress")?.classList.toggle("almost",clears);
    q("#roundHint").textContent=remaining<=0?"Target reached!":clears?`This hand clears the round! (${remaining.toLocaleString()} needed)`:`${remaining.toLocaleString()} more needed · ${plural(state.handsLeft,"hand")} left`;
    q("#roundHint").classList.toggle("clears",clears);
    tween(q("#petals"),p.petals,320);tween(q("#mult"),p.mult,320);tween(q("#preview"),p.total,420);
    const handName=q("#handName"),tier=handTier(p.hand);
    if(handName.dataset.hand!==p.hand.id){
      handName.dataset.hand=p.hand.id;
      const banner=q(".hand-banner");
      if(banner){banner.dataset.tier=tier;banner.classList.remove("hand-change");void banner.offsetWidth;banner.classList.add("hand-change")}
    }
    handName.textContent=p.hand.name+` · Lv ${state.handLevels[p.hand.id]||1}`;
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
    q("#playBtn").classList.remove("hinted");
    context.renderCharms(p.triggers);
    renderHandGuide(p.hand.id);
    context.refreshLuma?.();
  }
  // Side-panel cheat sheet: every hand's current petals and sparkle, best at the top.
  function renderHandGuide(currentId){
    const list=context.query("#handGuide");
    if(!list)return;
    list.innerHTML=[...handsData].reverse().map(h=>{const lv=context.state.handLevels[h.id]||1;return `<li class="${h.id===currentId?"current":""} tier-${handTier(h)}"><span>${h.name}${lv>1?` <em>Lv ${lv}</em>`:""}</span><b>+${h.base+(lv-1)*levelPetals(h)} · ×${h.mult+lv-1}</b></li>`}).join("");
  }
  function render(){
    updateGardenPhase();
    renderStatus();
    context.renderDice();
  }
  return { updateGardenPhase, renderStatus, render };
}
