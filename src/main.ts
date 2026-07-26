// @ts-nocheck
import "./styles.css";
import { evaluate, handsData, rollFive, sum, targetFor } from "./game-rules";
import { burstColors, charmFamilies, skinPacks, variants } from "./game-content";
import { createSkinFaceLoader } from "./skin-faces";
import { createAudioController } from "./audio-controller";
import { createVisualEffects } from "./visual-effects";
import { createRerollCharmEffects } from "./reroll-charm-effects";
import { createLumaSpeech } from "./luma-speech";
import { createDiceAnimation } from "./dice-animation";
import { createPetSpriteRenderer } from "./pet-sprite-renderer";
import { createPetSheetLoader } from "./pet-sheet-loader";
import { createPetAnimation } from "./pet-animation";
import { createUiFeedback } from "./ui-feedback";
import { createGameServices } from "./game-services";
import { createRunSave } from "./run-save";
import { createGardenState } from "./garden-state";

// This module coordinates game state and screen flow. Content and browser services live in focused modules.
(() => {
    "use strict";

    const $ = s => document.querySelector(s);
    const SAVE_KEY = "dice-of-petalia-save-v1";
    const META_KEY = "dice-of-petalia-meta-v1";
    const GARDEN_KEY = "dice-of-petalia-luma-garden-v1";
    const audio = createAudioController(JSON.parse(localStorage.getItem("petalia-sound") ?? "true"));
    let petTimer = null;
    let petImage = null;
    let petImageReady = false;
    let lastPetState = "idle";
    let lastPetFrame = 0;
    const petRows = {idle:0,happy:1,dice:2};
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const effects = createVisualEffects({query:$,colors:burstColors,reduceMotion});

    let garden;
    const gardenState = createGardenState({gardenKey:GARDEN_KEY,skinPacks,get garden(){return garden}});
    garden=gardenState.loadGarden();
    let secretCodeBuffer = "";
    const skinFaceLoader = createSkinFaceLoader(skinPacks, {
      onReady: () => {
        if (state) render();
        if (document.querySelector("#modal")?.dataset.view === "skins") showSkinMenu();
      },
      onError: () => toast("A dice sheet could not be prepared.")
    });

    const spriteIcon = name => `<span class="sprite-icon ${name}" aria-hidden="true"></span>`;
    const icons = {
      flower:spriteIcon("flower"),
      charm:() => spriteIcon("charm"),
      help:spriteIcon("help"),
      sound:spriteIcon("sound"),
      mute:spriteIcon("mute"),
      bag:spriteIcon("bag")
    };

    let state;
    let selected = new Set();
    let busy = false;
    let pendingChoices = [];
    const appContext = {
      get state(){return state}, set state(value){state=value},
      query:$,
      get petImage(){return petImage}, set petImage(value){petImage=value},
      get petImageReady(){return petImageReady}, set petImageReady(value){petImageReady=value},
      get lastPetState(){return lastPetState}, set lastPetState(value){lastPetState=value},
      get lastPetFrame(){return lastPetFrame}, set lastPetFrame(value){lastPetFrame=value},
      get petTimer(){return petTimer}, set petTimer(value){petTimer=value},
      petRows,
      reduceMotion,
      audio,effects,icons,
      saveKey:SAVE_KEY,
      gardenKey:GARDEN_KEY,
      get garden(){return garden}, set garden(value){garden=value},
      skinPacks,
      toast: (...args)=>toast(...args)
    };
    const { applyRerollCharmEffects } = createRerollCharmEffects(appContext);
    const { speechForHand, roundSpeech } = createLumaSpeech(appContext);
    const { animateDice } = createDiceAnimation(appContext);
    const { setPetFrame } = createPetSpriteRenderer(appContext);
    appContext.setPetFrame=setPetFrame;
    const { loadPetSheet } = createPetSheetLoader(appContext);
    const { startPetIdle, animatePet } = createPetAnimation(appContext);
    const { showModal, closeModal, toast, wait, flashCharms } = createUiFeedback(appContext);
    const { burst, popScore, lumaHearts, lumaStars, clickSound, rollSound, scoreSound, winSound, failSound, updateSound } = createGameServices(appContext);
    appContext.updateContinue=()=>updateContinue();
    const { save, load, persistSafe } = createRunSave(appContext);
    Object.assign(appContext,gardenState);

    function defaultState(){
      return {
        level:1,target:targetFor(1),roundScore:0,handsLeft:3,rerollsLeft:3,
        dice:rollFive(),initialDice:[],rerollsUsed:0,handLevels:Object.fromEntries(handsData.map(h=>[h.id,1])),
        charms:[],sound:audio.enabled,phase:"play",totalScore:0,runStarted:Date.now()
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

    const { defaultGarden, loadGarden, saveGarden, taskDone, completedTasks, isUnlocked, effectUnlocked, activeSkin } = gardenState;
    function recordGardenEvent(event){
      let changed=false,justUnlocked=[];
      skinPacks.forEach(pack=>pack.tasks.forEach(task=>{
        if(taskDone(pack,task)||!task.when(event))return;
        const progress=garden.packs[pack.id].progress;
        progress[task.id]=Math.min(task.target,(progress[task.id]||0)+1);
        changed=true;
        if(taskDone(pack,task))justUnlocked.push(`${pack.name}: ${task.label}`);
      }));
      if(!changed)return;
      saveGarden();
      if(justUnlocked.length)toast(`Garden task complete: ${justUnlocked[0]}`);
      if(document.querySelector("#overlay").classList.contains("show")&&document.querySelector("#modal")?.dataset.view==="skins")showSkinMenu();
    }
    function grantMoonDropForRun(){
      if(state.level<5||state.gardenRewarded)return;
      state.gardenRewarded=true;garden.moonDrops++;saveGarden();
      toast("Lady Luma saved a Moon Drop for this journey.");
    }
    function prepareSkinSheets(){
      skinFaceLoader.prepare();
    }
    function skinFace(packId,value,preview=false){
      if(packId==="default")return `<span class="preview-pips preview-${value}" aria-hidden="true">${pips(value)}</span>`;
      const source=skinFaceLoader.face(packId,value);
      return source?`<img class="skin-face${preview?" preview-face":""}" src="${source}" alt="" aria-hidden="true">`:`<span class="skin-loading" aria-hidden="true"></span>`;
    }
    function selectSkin(id){
      const pack=skinPacks.find(item=>item.id===id);
      if(pack&&!isUnlocked(pack)){toast(`${pack.name} needs ${Math.max(0,5-completedTasks(pack))} more garden task${completedTasks(pack)===4?"":"s"}.`);return}
      garden.selected=id;saveGarden();render();showSkinMenu();clickSound(620,.06);
    }
    function skipGardenTask(packId,taskId){
      const pack=skinPacks.find(item=>item.id===packId),task=pack?.tasks.find(item=>item.id===taskId);
      if(!pack||!task||garden.moonDrops<8||garden.packs[packId].skipped||taskDone(pack,task))return;
      garden.moonDrops-=8;garden.packs[packId].skipped=true;garden.packs[packId].skippedTask=taskId;garden.packs[packId].progress[taskId]=task.target;saveGarden();
      toast(`${task.label} was tended with Moon Drops.`);showSkinMenu();render();
    }
    function unlockAllSkinPacks(){
      skinPacks.forEach(pack=>pack.tasks.forEach(task=>{garden.packs[pack.id].progress[task.id]=task.target}));
      saveGarden();
      if(state)render();
      if(document.querySelector("#modal")?.dataset.view==="skins")showSkinMenu();
      toast("Lady Luma has opened every dice garden.");
    }
    function checkSecretCode(event){
      if(event.ctrlKey||event.metaKey||event.altKey||event.key.length!==1)return;
      secretCodeBuffer=(secretCodeBuffer+event.key.toLowerCase()).slice(-8);
      if(secretCodeBuffer!=="ladyluma")return;
      secretCodeBuffer="";unlockAllSkinPacks();
    }
    function showSkinMenu(){
      const option=(id,name,unlocked,content,details="")=>`<article class="skin-card ${garden.selected===id?"selected":""} ${unlocked?"":"locked"}">
        <div class="skin-preview">${content}</div><div class="skin-card-copy"><div><h3>${name}</h3><p>${details}</p></div><button class="skin-select" data-skin="${id}" ${unlocked?"":"disabled"}>${garden.selected===id?"Selected":unlocked?"Use skin":"Locked"}</button></div></article>`;
      const defaultCard=option("default","Classic Petalia",true,`<div class="preview-dice">${[1,3,5].map(value=>skinFace("default",value,true)).join("")}</div>`,"Always available");
      const packCards=skinPacks.map(pack=>{
        const complete=completedTasks(pack),unlocked=isUnlocked(pack),effect=effectUnlocked(pack);
        const preview=`<div class="preview-dice">${[1,3,6].map(value=>skinFace(pack.id,value,true)).join("")}</div>`;
        const tasks=pack.tasks.map(task=>{
          const progress=Math.min(task.target,garden.packs[pack.id].progress[task.id]||0),done=taskDone(pack,task),canSkip=!done&&garden.moonDrops>=8&&!garden.packs[pack.id].skipped;
          return `<li class="garden-task ${done?"done":""}"><span>${done?"Done":""}</span><div><b>${task.label}</b><small>${progress} / ${task.target}${garden.packs[pack.id].skippedTask===task.id?" · skipped":""}</small></div>${canSkip?`<button data-skip-pack="${pack.id}" data-skip-task="${task.id}">Skip · 8 drops</button>`:""}</li>`;
        }).join("");
        return `${option(pack.id,pack.name,unlocked,preview,`${complete} / 6 tasks · ${effect?`${pack.effect} unlocked`:unlocked?"Skin unlocked":"Unlocks at 5 / 6"}`)}<div class="skin-tasks"><div class="skin-progress"><b>${complete} / 6</b><span>${effect?"Cosmetic roll effect ready":"Complete all 6 for the roll effect"}</span></div><ol>${tasks}</ol>${garden.packs[pack.id].skipped?"<p class=\"skip-note\">Moon Drop skip used for this pack.</p>":""}</div>`;
      }).join("");
      showModal(`<div class="skin-menu"><div class="skin-menu-head"><div><p class="eyebrow">Luma's Dice Garden</p><h2>Cosmetic dice skins</h2></div><div class="moon-drops"><b>${garden.moonDrops}</b><span>Moon Drops</span></div></div><p class="lead">Complete 5 of 6 tasks to use a pack. Completing all 6 unlocks its roll effect. End a run on round 5 or later to earn one Moon Drop.</p><div class="skin-list">${defaultCard}${packCards}</div><button class="primary" id="closeSkins">Close garden</button></div>`);
      $("#modal").dataset.view="skins";
      document.querySelectorAll("[data-skin]").forEach(button=>button.onclick=()=>selectSkin(button.dataset.skin));
      document.querySelectorAll("[data-skip-pack]").forEach(button=>button.onclick=()=>skipGardenTask(button.dataset.skipPack,button.dataset.skipTask));
      $("#closeSkins").onclick=closeModal;
    }

    function pips(n){
      const map={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
      return map[n].map(i=>`<i class="pip p${i}"></i>`).join("");
    }
    function renderDice(){
      const skin=activeSkin();
      $("#diceRow").innerHTML=state.dice.map((n,i)=>`<button class="die ${skin?"skinned-die":""} ${selected.has(i)?"selected":""}" data-i="${i}" aria-label="Die ${i+1}: ${n}${selected.has(i)?", selected for reroll":""}">${skin?skinFace(skin.id,n):pips(n)}</button>`).join("");
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
    function petTap(){
      animatePet("happy",1);clickSound(720,.05);
      lumaHearts();
      const lines=["You found my secret ticklish ear!","I am supervising the dice very carefully.","The moon says your next roll feels lucky.","One tiny hop for moral support!"];
      if(state)$("#speech").textContent=lines[Math.floor(Math.random()*lines.length)];
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
      recordGardenEvent({type:"reroll",changed:idx.length,sixes:state.dice.filter((n,i)=>changed[i]&&n===6).length,ones:state.dice.filter((n,i)=>changed[i]&&n===1).length});
      emitSkinEffect("roll");
      selected.clear();busy=false;
      speechForHand();persistSafe();render();
      flashCharms(hits);
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
      recordGardenEvent({type:"play",dice:[...state.dice],hand:p.hand.id,score:p.total,rerollsUsed:state.rerollsUsed});
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
      recordGardenEvent({type:"round-win",round:state.level,rerollsLeft:state.rerollsLeft});
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
      grantMoonDropForRun();
      const best=JSON.parse(localStorage.getItem(META_KEY)||"{}");
      best.bestLevel=Math.max(best.bestLevel||0,state.level);best.runs=(best.runs||0)+1;localStorage.setItem(META_KEY,JSON.stringify(best));
      localStorage.removeItem(SAVE_KEY);
      showModal(`<h2>The gate grows sleepy</h2><p class="lead">You reached round ${state.level} and gathered ${state.totalScore.toLocaleString()} starlight. Lady Luma will remember your courage, even if the garden resets.</p>
        <button class="primary" id="againBtn">Try another journey</button>`);
      $("#againBtn").onclick=()=>{closeModal();newRun()};
    }
    function victory(){
      grantMoonDropForRun();
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
    function emitSkinEffect(trigger){
      const skin=activeSkin();
      if(trigger==="roll"&&skin&&effectUnlocked(skin))effects.skinEffect(skin);
    }
    function confirmRestart(){
      showModal(`<h2>Start over?</h2><p class="lead">This will replace the current journey and its charms with a fresh run.</p>
      <div style="display:flex;gap:10px;justify-content:center"><button class="mini-btn" id="cancelRestart">Keep playing</button><button class="primary" id="yesRestart" style="margin:0">Start fresh</button></div>`);
      $("#cancelRestart").onclick=closeModal;$("#yesRestart").onclick=()=>{closeModal();newRun()};
    }

    function init(){
      $("#brandMark").innerHTML=icons.flower;
      $("#guardian").innerHTML=`<button class="pet-button" type="button" aria-label="Pet Lady Luma" title="Pet Lady Luma"><canvas class="pet-sprite pet-canvas" width="314" height="418"></canvas></button>`;
      $("#startGuardian").innerHTML=`<canvas class="pet-sprite pet-canvas" width="314" height="418" aria-hidden="true"></canvas>`;
      $("#helpBtn").innerHTML=icons.help;$("#soundBtn").innerHTML=icons.sound;$("#sideToggle").innerHTML=icons.bag;
      $("#newRunBtn").onclick=newRun;$("#continueBtn").onclick=continueRun;$("#rerollBtn").onclick=reroll;$("#playBtn").onclick=playHand;
      $("#helpBtn").onclick=showHelp;$("#handsBtn").onclick=showHandLevels;$("#skinsBtn").onclick=showSkinMenu;$("#restartBtn").onclick=confirmRestart;
      $("#soundBtn").onclick=()=>{const enabled=audio.toggle();updateSound();if(enabled)clickSound(660,.05)};
      $("#guardian .pet-button").onclick=petTap;
      $("#sideToggle").onclick=()=>$("#sidePanel").classList.toggle("open");
      $("#overlay").onclick=e=>{if(e.target===$("#overlay")&&state?.phase==="play")closeModal()};
      document.addEventListener("keydown",e=>{checkSecretCode(e);if(e.key==="Escape"&&state?.phase==="play")closeModal();if(e.key>="1"&&e.key<="5"&&!$("#overlay").classList.contains("show"))toggleDie(+e.key-1)});
      window.addEventListener("beforeunload",()=>{if(state)persistSafe()});
      updateContinue();updateSound();loadPetSheet();prepareSkinSheets();startPetIdle();
    }
    init();
  })();
