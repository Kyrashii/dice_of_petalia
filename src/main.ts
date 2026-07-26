// @ts-nocheck
import "./styles.css";
import { evaluate, handsData, rollFive, sum, targetFor } from "./game-rules";

// The original browser game is intentionally kept as one behavior-preserving module.
// Game-rule functions above are typed and independently tested.
(() => {
    "use strict";

    const $ = s => document.querySelector(s);
    const SAVE_KEY = "dice-of-petalia-save-v1";
    const META_KEY = "dice-of-petalia-meta-v1";
    const colors = ["#f5a9cf","#c8b6ff","#a8e6cf","#ffd98e","#a9d8f5"];
    let audioCtx = null;
    let soundOn = JSON.parse(localStorage.getItem("petalia-sound") ?? "true");
    let petTimer = null;
    let petImage = null;
    let petImageReady = false;
    let lastPetState = "idle";
    let lastPetFrame = 0;
    const petRows = {idle:0,happy:1,dice:2};
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const spriteIcon = name => `<span class="sprite-icon ${name}" aria-hidden="true"></span>`;
    const icons = {
      flower:spriteIcon("flower"),
      charm:() => spriteIcon("charm"),
      help:spriteIcon("help"),
      sound:spriteIcon("sound"),
      mute:spriteIcon("mute"),
      bag:spriteIcon("bag")
    };

    const charmFamilies = [
      {name:"Daisy Charm",test:c=>c.phase==="play"&&c.dice.includes(1),desc:"Play a hand containing a 1"},
      {name:"Royal Ribbon",test:c=>c.phase==="play"&&c.dice.includes(6),desc:"Play a hand containing a 6"},
      {name:"Cloud Charm",test:c=>c.phase==="play"&&c.rerollsUsed===0,desc:"Play without rerolling"},
      {name:"Rainy Charm",test:c=>c.phase==="play"&&c.rerollsLeft===0,desc:"Play with no rerolls left"},
      {name:"Tea Charm",test:c=>c.phase==="play"&&sum(c.dice)<15,desc:"Play dice totaling less than 15"},
      {name:"Sunbeam Charm",test:c=>c.phase==="play"&&sum(c.dice)>22,desc:"Play dice totaling more than 22"},
      {name:"Twin Charm",test:c=>c.phase==="play"&&c.hand.id==="pair",desc:"Play exactly one Pair"},
      {name:"Picnic Charm",test:c=>c.phase==="play"&&["twoPair","full"].includes(c.hand.id),desc:"Play Two Pair or a Full House"},
      {name:"Crown Charm",test:c=>c.phase==="play"&&["three","four","five"].includes(c.hand.id),desc:"Play at least Three of a Kind"},
      {name:"Rainbow Charm",test:c=>c.phase==="play"&&c.hand.id==="straight",desc:"Play a Straight"},
      {name:"Evening Charm",test:c=>c.phase==="play"&&c.dice.every(n=>n%2===0),desc:"Play only even dice"},
      {name:"Morning Charm",test:c=>c.phase==="play"&&c.dice.every(n=>n%2===1),desc:"Play only odd dice"},
      {name:"Mirror Charm",test:c=>c.phase==="play"&&c.dice[0]===c.dice[4]&&c.dice[1]===c.dice[3],desc:"Play mirrored outer dice"},
      {name:"Bouquet Charm",test:c=>c.phase==="play"&&new Set(c.dice).size<=3,desc:"Play three or fewer unique values"},
      {name:"Butterfly Charm",test:c=>c.phase==="play"&&Math.max(...c.dice)-Math.min(...c.dice)<=2,desc:"Largest and smallest differ by 2 or less"},
      {name:"Lucky Seven",test:c=>c.phase==="play"&&(c.dice[0]+c.dice[4]===7),desc:"First and last dice total 7"},
      {name:"Moon Charm",test:c=>c.phase==="play"&&sum(c.dice)%5===0,desc:"Dice total is divisible by 5"},
      {name:"Comet Charm",test:c=>c.phase==="play"&&c.dice.every((n,i,a)=>i===0||n>=a[i-1]),desc:"Dice never descend left to right"},
      {name:"Frog Charm",test:c=>c.phase==="reroll"&&c.newDice.some((n,i)=>c.changed[i]&&n===6),desc:"Reroll at least one die into a 6"},
      {name:"Berry Charm",test:c=>c.phase==="reroll"&&c.newDice.some((n,i)=>c.changed[i]&&n===1),desc:"Reroll at least one die into a 1"},
      {name:"Wish Charm",test:c=>c.phase==="reroll"&&c.oldHand.id===c.newHand.id,desc:"Reroll without changing hand type"},
      {name:"Acorn Charm",test:c=>c.phase==="reroll"&&c.changed.filter(Boolean).length===1,desc:"Reroll exactly one die"},
      {name:"Confetti Charm",test:c=>c.phase==="reroll"&&c.changed.filter(Boolean).length===5,desc:"Reroll all five dice"},
      {name:"Swan Charm",test:c=>c.phase==="play"&&c.dice[0]===c.dice[4],desc:"First and last dice match"}
    ];

    const variants = [
      {id:"petals",tone:"#a8e6cf",label:"Mint",effect:rank=>({petals:8+rank*4,mult:0,rerolls:0})},
      {id:"mult",tone:"#f5a9cf",label:"Rose",effect:rank=>({petals:0,mult:1+Math.floor(rank/2),rerolls:0})},
      {id:"both",tone:"#c8b6ff",label:"Lilac",effect:rank=>({petals:4+rank*2,mult:1,rerolls:0})},
      {id:"reroll",tone:"#ffd98e",label:"Golden",effect:rank=>({petals:0,mult:0,rerolls:1})}
    ];

    let state;
    let selected = new Set();
    let busy = false;
    let pendingChoices = [];

    function defaultState(){
      return {
        level:1,target:targetFor(1),roundScore:0,handsLeft:3,rerollsLeft:3,
        dice:rollFive(),initialDice:[],rerollsUsed:0,handLevels:Object.fromEntries(handsData.map(h=>[h.id,1])),
        charms:[],sound:soundOn,phase:"play",totalScore:0,runStarted:Date.now()
      };
    }
    function baseStats(){
      const hand=evaluate(state.dice), level=state.handLevels[hand.id]||1;
      return {hand,petals:sum(state.dice)+hand.base+(level-1)*(4+Math.ceil(hand.base*.22)),mult:hand.mult+(level-1)};
    }
    function context(phase,extra={}){
      return {phase,dice:state.dice,hand:evaluate(state.dice),rerollsUsed:state.rerollsUsed,rerollsLeft:state.rerollsLeft,handsLeft:state.handsLeft,...extra};
    }
    function triggered(ctx){return state.charms.filter(ch=>ch.family.test(ctx))}
    function previewStats(){
      const base=baseStats(), list=triggered(context("play"));
      let petals=base.petals,mult=base.mult;
      list.forEach(ch=>{const e=ch.variant.effect(ch.rank);petals+=e.petals;mult+=e.mult});
      return {...base,petals,mult,total:petals*mult,triggers:list};
    }
    function save(){
      localStorage.setItem(SAVE_KEY,JSON.stringify(state));
      updateContinue();
    }
    function load(){
      try{
        const raw=JSON.parse(localStorage.getItem(SAVE_KEY));
        if(!raw||!raw.level) return false;
        state=raw;
        state.charms=(state.charms||[]).map(ch=>hydrateCharm(ch));
        return true;
      }catch{return false}
    }
    function serializeCharm(ch){return {familyIndex:ch.familyIndex,variantIndex:ch.variantIndex,rank:ch.rank}}
    function hydrateCharm(raw){
      const fi=raw.familyIndex??0,vi=raw.variantIndex??0;
      return {family:charmFamilies[fi],variant:variants[vi],familyIndex:fi,variantIndex:vi,rank:raw.rank||1};
    }
    function persistSafe(){
      const copy={...state,charms:state.charms.map(serializeCharm)};
      localStorage.setItem(SAVE_KEY,JSON.stringify(copy));updateContinue();
    }

    function pips(n){
      const map={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
      return map[n].map(i=>`<i class="pip p${i}"></i>`).join("");
    }
    function renderDice(){
      $("#diceRow").innerHTML=state.dice.map((n,i)=>`<button class="die ${selected.has(i)?"selected":""}" data-i="${i}" aria-label="Die ${i+1}: ${n}${selected.has(i)?", selected for reroll":""}">${pips(n)}</button>`).join("");
      document.querySelectorAll(".die").forEach(el=>el.onclick=()=>toggleDie(+el.dataset.i));
    }
    function effectText(ch){
      const e=ch.variant.effect(ch.rank),bits=[];
      if(e.petals)bits.push(`+${e.petals} petals`);
      if(e.mult)bits.push(`+${e.mult} sparkle`);
      if(e.rerolls)bits.push(`+${e.rerolls} reroll`);
      return bits.join(" & ");
    }
    function renderCharms(){
      $("#charmCount").textContent=state.charms.length;
      if(!state.charms.length){$("#charmList").innerHTML=`<div class="empty-note">Win the first round and Lady Luma will offer you a lucky charm.</div>`;return}
      $("#charmList").innerHTML=state.charms.map((ch,i)=>`<div class="charm" data-charm="${i}" title="${ch.family.desc}">
        <div class="charm-icon">${icons.charm(ch.variant.tone)}</div><div><strong>${ch.variant.label} ${ch.family.name}${ch.rank>1?` · ${ch.rank}`:""}</strong><span>${ch.family.desc}: ${effectText(ch)}</span></div></div>`).join("");
    }
    function updateGardenPhase(){
      const phase=Math.min(5,Math.max(1,Math.ceil(state.level/5)));
      document.body.dataset.gardenPhase=String(phase);
      for(let i=1;i<=5;i++)document.body.classList.toggle(`garden-unlocked-${i}`,i<=phase);
    }
    function render(){
      updateGardenPhase();
      const p=previewStats();
      $("#levelText").textContent=`Round ${state.level} / 25`;
      $("#roundScore").textContent=state.roundScore.toLocaleString();
      $("#targetScore").textContent=state.target.toLocaleString();
      $("#progressFill").style.width=`${Math.min(100,state.roundScore/state.target*100)}%`;
      $("#petals").textContent=p.petals;
      $("#mult").textContent=p.mult;
      $("#preview").textContent=p.total.toLocaleString();
      $("#handName").textContent=p.hand.name+` · Lv ${state.handLevels[p.hand.id]}`;
      $("#handDetail").textContent=p.hand.desc;
      $("#rerolls").textContent=state.rerollsLeft;
      $("#hands").textContent=state.handsLeft;
      $("#guardian").classList.toggle("is-worried",state.phase==="play"&&state.handsLeft===1);
      $("#rerollBtn").disabled=busy||state.rerollsLeft<1||selected.size===0;
      $("#playBtn").disabled=busy;
      renderDice();renderCharms();updateSound();
    }
    function toggleDie(i){
      if(busy)return;
      if(selected.has(i))selected.delete(i);else selected.add(i);
      renderDice();$("#rerollBtn").disabled=state.rerollsLeft<1||selected.size===0;
      clickSound(430,.03);
    }
    function setPetFrame(petState,frame){
      lastPetState=petState;lastPetFrame=frame;
      document.querySelectorAll("canvas.pet-sprite").forEach(canvas=>{
        canvas.dataset.petState=petState;
        canvas.dataset.petFrame=String(frame);
        if(!petImageReady)return;
        const context=canvas.getContext("2d");
        const sourceWidth=petImage.naturalWidth/4,sourceHeight=petImage.naturalHeight/3;
        context.clearRect(0,0,canvas.width,canvas.height);
        context.drawImage(
          petImage,
          frame*sourceWidth,petRows[petState]*sourceHeight,sourceWidth,sourceHeight,
          0,0,canvas.width,canvas.height
        );
      });
    }
    function loadPetSheet(){
      const cssValue=getComputedStyle(document.documentElement).getPropertyValue("--pet-sheet").trim();
      const match=cssValue.match(/^url\((['"]?)(.*)\1\)$/);
      const source=match?match[2]:cssValue;
      petImage=new Image();
      petImage.onload=()=>{
        petImageReady=true;
        setPetFrame(lastPetState,lastPetFrame);
      };
      petImage.onerror=()=>toast("Lady Luma's sprite sheet could not be loaded.");
      petImage.src=source;
    }
    function startPetIdle(){
      clearInterval(petTimer);clearTimeout(petTimer);
      if(reduceMotion){setPetFrame("idle",0);return}
      const sequence=[0,0,1,2,3,0],step=()=>{setPetFrame("idle",sequence[index]);index=(index+1)%sequence.length};
      let index=0;step();petTimer=setInterval(step,620);
    }
    function animatePet(petState,loops=1){
      clearInterval(petTimer);clearTimeout(petTimer);
      if(reduceMotion){setPetFrame(petState,3);petTimer=setTimeout(startPetIdle,500);return}
      let step=0;const total=4*Math.max(1,loops),speed=petState==="dice"?180:145;
      setPetFrame(petState,0);
      petTimer=setInterval(()=>{
        step++;
        if(step>=total){startPetIdle();return}
        setPetFrame(petState,step%4);
      },speed);
    }
    function petTap(){
      animatePet("happy",1);clickSound(720,.05);
      lumaHearts();
      const lines=["You found my secret ticklish ear!","I am supervising the dice very carefully.","The moon says your next roll feels lucky.","One tiny hop for moral support!"];
      if(state)$("#speech").textContent=lines[Math.floor(Math.random()*lines.length)];
    }
    function animateDice(indices){
      indices.forEach(i=>document.querySelector(`.die[data-i="${i}"]`)?.classList.add("rolling"));
    }
    async function reroll(){
      if(busy||state.rerollsLeft<1||!selected.size)return;
      busy=true;rollSound();animatePet("dice",1);
      const idx=[...selected],oldDice=[...state.dice],oldHand=evaluate(oldDice),changed=state.dice.map((_,i)=>idx.includes(i));
      animateDice(idx);
      await wait(360);
      idx.forEach(i=>state.dice[i]=1+Math.floor(Math.random()*6));
      state.rerollsLeft--;state.rerollsUsed++;
      const ctx=context("reroll",{oldDice,newDice:[...state.dice],changed,oldHand,newHand:evaluate(state.dice)});
      const hits=triggered(ctx);
      applyRerollCharmEffects(hits);
      selected.clear();busy=false;
      speechForHand();persistSafe();render();
      flashCharms(hits);
    }
    function applyRerollCharmEffects(hits){
      hits.forEach(ch=>{const e=ch.variant.effect(ch.rank);if(e.rerolls)state.rerollsLeft+=e.rerolls});
      if(hits.length)toast(`${hits.length} charm${hits.length>1?"s":""} twinkled!`);
    }
    async function playHand(){
      if(busy)return;
      busy=true;selected.clear();
      const p=previewStats(), hits=p.triggers;
      animatePet(p.mult>=4?"happy":"dice",1);
      if(p.hand.mult>=4)lumaStars(p.hand.mult);
      $("#petals").textContent=p.petals;$("#mult").textContent=p.mult;$("#preview").textContent=p.total.toLocaleString();
      flashCharms(hits);scoreSound(p.mult);
      popScore(p.total);burst(window.innerWidth/2,window.innerHeight*.58,16);
      state.roundScore+=p.total;state.totalScore+=p.total;state.handsLeft--;
      await wait(700);
      if(state.roundScore>=state.target){
        render();await wait(400);roundWon();return;
      }
      if(state.handsLeft<=0){render();await wait(450);gameOver();return}
      state.dice=rollFive();state.initialDice=[...state.dice];state.rerollsUsed=0;
      speechForHand();busy=false;persistSafe();render();animateDice([0,1,2,3,4]);
    }
    function roundWon(){
      winSound();animatePet("happy",2);burst(window.innerWidth/2,window.innerHeight/2,40);
      $("#speech").textContent="That was lovely! Choose a charm for the path ahead.";
      pendingChoices=makeCharmChoices();
      state.phase="chooseCharm";persistSafe();
      showCharmChoices();
    }
    function makeCharmChoices(){
      const pool=[];
      charmFamilies.forEach((_,fi)=>variants.forEach((__,vi)=>pool.push({fi,vi})));
      for(let i=pool.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [pool[i],pool[j]]=[pool[j],pool[i]];
      }
      return pool.slice(0,3).map(({fi,vi})=>{
        const existing=state.charms.find(c=>c.familyIndex===fi&&c.variantIndex===vi);
        return {family:charmFamilies[fi],variant:variants[vi],familyIndex:fi,variantIndex:vi,rank:existing?(existing.rank+1):1,isUpgrade:!!existing};
      });
    }
    function showCharmChoices(){
      showModal(`<h2>A charm chooses you</h2><p class="lead">Pick one. Matching charms become stronger and charms with the same condition can twinkle together.</p>
        <div class="choice-grid">${pendingChoices.map((ch,i)=>`<button class="choice" data-pick="${i}">
          <div class="big-icon">${icons.charm(ch.variant.tone)}</div><div><h3>${ch.variant.label} ${ch.family.name}</h3><p>${ch.family.desc}</p><div class="effect">${effectText(ch)}${ch.isUpgrade?" · upgrades yours":""}</div></div></button>`).join("")}</div>`);
      document.querySelectorAll("[data-pick]").forEach(b=>b.onclick=()=>pickCharm(+b.dataset.pick));
    }
    function pickCharm(i){
      const ch=pendingChoices[i],existing=state.charms.find(c=>c.familyIndex===ch.familyIndex&&c.variantIndex===ch.variantIndex);
      if(existing)existing.rank++;else state.charms.push(ch);
      clickSound(620,.08);state.phase="upgradeHand";persistSafe();showHandUpgrade();
    }
    function showHandUpgrade(){
      const order=[...handsData].sort((a,b)=>(state.handLevels[a.id]||1)-(state.handLevels[b.id]||1));
      showModal(`<h2>Grow a favorite hand</h2><p class="lead">Every level adds petals and sparkle whenever you play that hand.</p>
        <div class="upgrade-list">${order.map(h=>`<button class="upgrade" data-up="${h.id}"><em>Lv ${state.handLevels[h.id]}</em><strong>${h.name}</strong><span>${h.desc}</span></button>`).join("")}</div>`);
      document.querySelectorAll("[data-up]").forEach(b=>b.onclick=()=>upgradeHand(b.dataset.up));
    }
    function upgradeHand(id){
      state.handLevels[id]++;clickSound(760,.1);closeModal();
      if(state.level>=25){victory();return}
      state.level++;state.target=targetFor(state.level);state.roundScore=0;state.handsLeft=3;state.rerollsLeft=3;state.dice=rollFive();state.initialDice=[...state.dice];state.rerollsUsed=0;state.phase="play";
      busy=false;$("#speech").textContent=roundSpeech();persistSafe();render();animateDice([0,1,2,3,4]);
    }
    function gameOver(){
      failSound();startPetIdle();
      const best=JSON.parse(localStorage.getItem(META_KEY)||"{}");
      best.bestLevel=Math.max(best.bestLevel||0,state.level);best.runs=(best.runs||0)+1;localStorage.setItem(META_KEY,JSON.stringify(best));
      localStorage.removeItem(SAVE_KEY);
      showModal(`<h2>The gate grows sleepy</h2><p class="lead">You reached round ${state.level} and gathered ${state.totalScore.toLocaleString()} starlight. Lady Luma will remember your courage, even if the garden resets.</p>
        <button class="primary" id="againBtn">Try another journey</button>`);
      $("#againBtn").onclick=()=>{closeModal();newRun()};
    }
    function victory(){
      const best=JSON.parse(localStorage.getItem(META_KEY)||"{}");
      best.bestLevel=25;best.wins=(best.wins||0)+1;best.runs=(best.runs||0)+1;localStorage.setItem(META_KEY,JSON.stringify(best));
      localStorage.removeItem(SAVE_KEY);burst(window.innerWidth/2,window.innerHeight/2,60);winSound();animatePet("happy",3);
      showModal(`<h2>The starlight gate opens</h2><p class="lead">You completed all 25 rounds with ${state.totalScore.toLocaleString()} starlight. Lady Luma crowns you the Moon Garden's luckiest wanderer.</p>
        <div class="ending-flower" style="text-align:center">${icons.flower}</div><button class="primary" id="againBtn">Begin a fresh journey</button>`);
      $("#againBtn").onclick=()=>{closeModal();newRun()};
    }
    function newRun(){
      state=defaultState();state.initialDice=[...state.dice];selected.clear();busy=false;
      $("#startScreen").classList.add("hidden");persistSafe();render();speechForHand();animateDice([0,1,2,3,4]);
    }
    function continueRun(){
      if(!load()){newRun();return}
      $("#startScreen").classList.add("hidden");selected.clear();busy=false;render();
      if(state.phase==="chooseCharm"){pendingChoices=makeCharmChoices();showCharmChoices()}
      else if(state.phase==="upgradeHand")showHandUpgrade();
      else speechForHand();
    }
    function updateContinue(){$("#continueBtn").disabled=!localStorage.getItem(SAVE_KEY)}

    function speechForHand(){
      const h=evaluate(state.dice),lines={
        high:["A gentle start. The next roll may bloom.","Every little petal still counts."],
        pair:["A tiny pair found each other!","Two matching friends. How sweet."],
        twoPair:["Two pairs are having a garden picnic!"],
        three:["Three of a kind! A proper little club."],
        straight:["A perfect staircase of stars!"],
        full:["A full house! Everyone is home."],
        four:["Four matching blooms! The garden is impressed."],
        five:["Five of a kind! Even the moon blinked twice."]
      };
      const a=lines[h.id];$("#speech").textContent=a[Math.floor(Math.random()*a.length)];
    }
    function roundSpeech(){
      const lines=["The moon path grows brighter.","New round, new little possibilities.","Your charms are humming softly.","The gate is closer than it looks."];
      return lines[Math.floor(Math.random()*lines.length)];
    }
    function showHelp(){
      showModal(`<h2>How to play</h2><p class="lead">Build dice-poker hands, stack lucky charms, and clear all 25 rounds.</p><div class="tutorial">
        <div class="tip"><b>1. Choose dice</b><span>Tap any dice you do not want. The raised pink dice will be rerolled.</span></div>
        <div class="tip"><b>2. Shape a hand</b><span>You have three rerolls each round. Pairs, straights and matching sets give more sparkle.</span></div>
        <div class="tip"><b>3. Play three hands</b><span>Each round gives you three scoring hands. Reach the target before they run out.</span></div>
        <div class="tip"><b>4. Build combos</b><span>After winning, take one charm and upgrade one hand. Charms with compatible conditions stack.</span></div>
      </div><button class="primary" id="closeHelp">Got it</button>`);
      $("#closeHelp").onclick=closeModal;
    }
    function showHandLevels(){
      showModal(`<h2>Your hand garden</h2><p class="lead">Upgraded hands grant more petals and sparkle.</p><div class="upgrade-list">
        ${handsData.map(h=>`<div class="upgrade" style="cursor:default"><em>Lv ${state.handLevels[h.id]}</em><strong>${h.name}</strong><span>${h.desc}</span></div>`).join("")}</div><button class="primary" id="closeHands">Close</button>`);
      $("#closeHands").onclick=closeModal;
    }
    function confirmRestart(){
      showModal(`<h2>Start over?</h2><p class="lead">This will replace the current journey and its charms with a fresh run.</p>
      <div style="display:flex;gap:10px;justify-content:center"><button class="mini-btn" id="cancelRestart">Keep playing</button><button class="primary" id="yesRestart" style="margin:0">Start fresh</button></div>`);
      $("#cancelRestart").onclick=closeModal;$("#yesRestart").onclick=()=>{closeModal();newRun()};
    }
    function showModal(html){$("#modal").innerHTML=html;$("#overlay").classList.add("show")}
    function closeModal(){$("#overlay").classList.remove("show")}
    function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove("show"),1500)}
    function wait(ms){return new Promise(r=>setTimeout(r,ms))}
    function flashCharms(list){
      list.forEach(ch=>{const i=state.charms.indexOf(ch);const el=document.querySelector(`[data-charm="${i}"]`);if(el){el.classList.remove("active");void el.offsetWidth;el.classList.add("active")}});
    }
    function burst(x,y,n){
      for(let i=0;i<n;i++){const e=document.createElement("i"),a=Math.random()*Math.PI*2,d=40+Math.random()*150;e.className="burst";e.style.cssText=`left:${x}px;top:${y}px;background:${colors[i%colors.length]};--x:${Math.cos(a)*d}px;--y:${Math.sin(a)*d}px`;document.body.appendChild(e);setTimeout(()=>e.remove(),1100)}
    }
    function popScore(n){const r=$("#preview").getBoundingClientRect(),e=document.createElement("div");e.className="score-pop";e.textContent=`+${n.toLocaleString()}`;e.style.left=`${r.left+r.width/2-28}px`;e.style.top=`${r.top}px`;document.body.appendChild(e);setTimeout(()=>e.remove(),1200)}
    function lumaParticles(kind,count){
      if(reduceMotion)return;
      const stage=$("#guardian");if(!stage)return;
      const r=stage.getBoundingClientRect();
      for(let i=0;i<count;i++){
        const e=document.createElement("i"),angle=Math.random()*Math.PI*2,range=34+Math.random()*54;
        e.className=`luma-${kind}`;e.textContent=kind==="star"?"✦":"♥";
        e.style.left=`${r.left+r.width*(.2+Math.random()*.6)}px`;
        e.style.top=`${r.top+r.height*(.16+Math.random()*.58)}px`;
        e.style.setProperty("--drift-x",`${Math.cos(angle)*range}px`);
        e.style.setProperty("--drift-y",`${Math.sin(angle)*range-28}px`);
        document.body.appendChild(e);setTimeout(()=>e.remove(),950);
      }
    }
    function lumaHearts(){lumaParticles("heart",6)}
    function lumaStars(mult){lumaParticles("star",Math.min(10,3+mult))}

    function initAudio(){
      if(audioCtx)return true;
      const AudioEngine=window.AudioContext||window.webkitAudioContext;
      if(!AudioEngine)return false;
      audioCtx=new AudioEngine();return true;
    }
    function tone(freq,duration,type="sine",volume=.06,delay=0){
      if(!soundOn||!initAudio())return;const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime+delay;o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+duration+.02)
    }
    function clickSound(f=440,v=.03){tone(f,.08,"sine",v)}
    function rollSound(){[0,1,2,3].forEach(i=>tone(180+i*55,.08,"triangle",.025,i*.06))}
    function scoreSound(mult){tone(520,.15,"sine",.05);tone(660,.18,"sine",.04,.08);if(mult>5)tone(880,.22,"sine",.04,.16)}
    function winSound(){[523,659,784,1047].forEach((f,i)=>tone(f,.3,"sine",.05,i*.1))}
    function failSound(){[420,350,280].forEach((f,i)=>tone(f,.25,"triangle",.04,i*.14))}
    function updateSound(){$("#soundBtn").innerHTML=soundOn?icons.sound:icons.mute;localStorage.setItem("petalia-sound",JSON.stringify(soundOn))}

    function init(){
      $("#brandMark").innerHTML=icons.flower;
      $("#guardian").innerHTML=`<button class="pet-button" type="button" aria-label="Pet Lady Luma" title="Pet Lady Luma"><canvas class="pet-sprite pet-canvas" width="314" height="418"></canvas></button>`;
      $("#startGuardian").innerHTML=`<canvas class="pet-sprite pet-canvas" width="314" height="418" aria-hidden="true"></canvas>`;
      $("#helpBtn").innerHTML=icons.help;$("#soundBtn").innerHTML=icons.sound;$("#sideToggle").innerHTML=icons.bag;
      $("#newRunBtn").onclick=newRun;$("#continueBtn").onclick=continueRun;$("#rerollBtn").onclick=reroll;$("#playBtn").onclick=playHand;
      $("#helpBtn").onclick=showHelp;$("#handsBtn").onclick=showHandLevels;$("#restartBtn").onclick=confirmRestart;
      $("#soundBtn").onclick=()=>{soundOn=!soundOn;updateSound();if(soundOn)clickSound(660,.05)};
      $("#guardian .pet-button").onclick=petTap;
      $("#sideToggle").onclick=()=>$("#sidePanel").classList.toggle("open");
      $("#overlay").onclick=e=>{if(e.target===$("#overlay")&&state?.phase==="play")closeModal()};
      document.addEventListener("keydown",e=>{if(e.key==="Escape"&&state?.phase==="play")closeModal();if(e.key>="1"&&e.key<="5"&&!$("#overlay").classList.contains("show"))toggleDie(+e.key-1)});
      window.addEventListener("beforeunload",()=>{if(state)persistSafe()});
      updateContinue();updateSound();loadPetSheet();startPetIdle();
    }
    init();
  })();
