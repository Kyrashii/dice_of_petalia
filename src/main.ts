// @ts-nocheck
import "@fontsource-variable/fredoka";
import "@fontsource-variable/nunito";
import "./styles.css";
import { evaluate, handTier, handsData, levelPetals, rollFive, scoringIndices, targetFor } from "./game-rules";
import { animateNumber } from "./number-animation";
import { burstColors, charmFamilies, skinPacks, variants } from "./game-content";
import { createSkinFaceLoader } from "./skin-faces";
import { createAudioController } from "./audio-controller";
import { createVisualEffects } from "./visual-effects";
import { createRerollCharmEffects } from "./reroll-charm-effects";
import { createLumaSpeech } from "./luma-speech";
import { createDiceAnimation } from "./dice-animation";
import { createLuma } from "./luma";
import { createUiFeedback } from "./ui-feedback";
import { createGameServices } from "./game-services";
import { createRunSave } from "./run-save";
import { createGardenState } from "./garden-state";
import { createSkinPresentation } from "./skin-presentation";
import { createDiceSelection } from "./dice-selection";
import { createDiceRenderer } from "./dice-renderer";
import { createCharmRenderer } from "./charm-renderer";
import { createGameRenderer } from "./game-renderer";
import { createGardenProgress } from "./garden-progress";
import { createRunState } from "./run-state";
import { createSkinEffects } from "./skin-effects";
import { createPetInteraction } from "./pet-interaction";
import { createNewRunIntro } from "./new-run-intro";
import { storage } from "./storage";
import { emptyBonus } from "./run-state";

// This module coordinates game state and screen flow. Content and browser services live in focused modules.
(() => {
    "use strict";

    const $ = s => document.querySelector(s);
    const SAVE_KEY = "dice-of-petalia-save-v1";
    const META_KEY = "dice-of-petalia-meta-v1";
    const GARDEN_KEY = "dice-of-petalia-luma-garden-v1";
    const audio = createAudioController(storage.getJSON("petalia-sound", true) !== false);
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const effects = createVisualEffects({query:$,colors:burstColors,reduceMotion});
    const newRunIntro = createNewRunIntro({query:$,audio,reduceMotion});

    let garden;
    const gardenState = createGardenState({gardenKey:GARDEN_KEY,skinPacks,get garden(){return garden}});
    garden=gardenState.loadGarden();
    let secretCodeBuffer = "";
    let gardenKeeperToolsUnlocked = false;
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
    const appContext = {
      get state(){return state}, set state(value){state=value},
      get selected(){return selected},
      get busy(){return busy}, set busy(value){busy=value},
      query:$,
      reduceMotion,
      audio,effects,icons,
      saveKey:SAVE_KEY,
      gardenKey:GARDEN_KEY,
      get garden(){return garden}, set garden(value){garden=value},
      skinPacks,
      skinFaceLoader,
      toast: (...args)=>toast(...args)
    };
    const { applyRerollCharmEffects } = createRerollCharmEffects(appContext);
    const { speechForHand, roundSpeech } = createLumaSpeech(appContext);
    const diceAnimation = createDiceAnimation(appContext);
    const { animateDice, tumbleDice, landDice, dealDice, highlightScoring } = diceAnimation;
    const luma = createLuma(appContext);
    Object.assign(appContext,luma);
    const { loadPetSheet, startPetIdle, animatePet, showSadPet } = luma;
    const { showModal, closeModal, toast, wait, flashCharms } = createUiFeedback(appContext);
    appContext.wait=wait;
    const gameServices = createGameServices(appContext);
    Object.assign(appContext,gameServices);
    const { burst, popScore, lumaHearts, lumaStars, clickSound, rollSound, scoreSound, winSound, failSound, updateSound } = gameServices;
    appContext.updateContinue=updateContinue;
    const { load, persistSafe, clearSave } = createRunSave(appContext);
    Object.assign(appContext,gardenState);
    const skinPresentation = createSkinPresentation(appContext);
    Object.assign(appContext,skinPresentation);
    const { pips, prepareSkinSheets, skinFace } = skinPresentation;
    const diceSelection = createDiceSelection(appContext);
    const diceRenderer = createDiceRenderer(appContext);
    Object.assign(appContext,diceSelection,diceRenderer);
    const { toggleDie, clearSelection } = diceSelection;
    const { renderDice } = diceRenderer;
    const charmRenderer = createCharmRenderer(appContext);
    Object.assign(appContext,charmRenderer);
    const { effectText, renderCharms } = charmRenderer;
    const runState = createRunState(appContext);
    Object.assign(appContext,runState);
    const { defaultState, gameContext: context, triggered, previewStats } = runState;
    const gameRenderer = createGameRenderer(appContext);
    Object.assign(appContext,gameRenderer);
    const { render, renderStatus } = gameRenderer;
    appContext.showSkinMenu=showSkinMenu;
    const { recordGardenEvent, grantMoonDropForRun } = createGardenProgress(appContext);
    const { emitSkinEffect } = createSkinEffects(appContext);
    const { petTap } = createPetInteraction(appContext);


    const { saveGarden, taskDone, completedTasks, isUnlocked, effectUnlocked } = gardenState;
    function selectSkin(id){
      const pack=skinPacks.find(item=>item.id===id);
      if(pack&&!isUnlocked(pack)){toast(`${pack.name} needs ${Math.max(0,5-completedTasks(pack))} more garden task${completedTasks(pack)===4?"":"s"}.`);return}
      garden.selected=id;saveGarden();if(state)render();showSkinMenu();clickSound(620,.06);
    }
    function skipGardenTask(packId,taskId){
      const pack=skinPacks.find(item=>item.id===packId),task=pack?.tasks.find(item=>item.id===taskId);
      if(!pack||!task||garden.moonDrops<8||garden.packs[packId].skipped||taskDone(pack,task))return;
      garden.moonDrops-=8;garden.packs[packId].skipped=true;garden.packs[packId].skippedTask=taskId;garden.packs[packId].progress[taskId]=task.target;saveGarden();
      toast(`${task.label} was tended with Moon Drops.`);showSkinMenu();if(state)render();
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
      secretCodeBuffer="";gardenKeeperToolsUnlocked=true;
      if(document.querySelector("#modal")?.dataset.view==="settings")showSettings();
      toast("A Garden Keeper key has appeared in Settings.");
    }
    function showDismissibleModal(html,onClose=closeModal){
      showModal(`<button class="mobile-page-close" id="mobilePageClose" type="button">Back to the table</button>${html}`);
      $("#mobilePageClose").onclick=onClose;
    }
    function showSkinMenu(){
      prepareSkinSheets(true);
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
      showDismissibleModal(`<div class="skin-menu"><div class="skin-menu-head"><div><p class="eyebrow">Luma's Dice Garden</p><h2>Cosmetic dice skins</h2></div><div class="moon-drops"><b>${garden.moonDrops}</b><span>Moon Drops</span></div></div><p class="lead">Complete 5 of 6 tasks to use a pack. Completing all 6 unlocks its roll effect. End a run on round 5 or later to earn one Moon Drop.</p><div class="skin-list">${defaultCard}${packCards}</div><button class="primary" id="closeSkins">Close garden</button></div>`);
      $("#modal").dataset.view="skins";
      document.querySelectorAll("[data-skin]").forEach(button=>button.onclick=()=>selectSkin(button.dataset.skin));
      document.querySelectorAll("[data-skip-pack]").forEach(button=>button.onclick=()=>skipGardenTask(button.dataset.skipPack,button.dataset.skipTask));
      $("#closeSkins").onclick=closeModal;
    }

    const loadMeta=()=>storage.getJSON(META_KEY,{})||{};
    const saveMeta=meta=>storage.setJSON(META_KEY,meta);
    function canAct(){return !!state&&!busy&&state.phase==="play"&&!$("#overlay").classList.contains("show")}
    // Shows score, progress and counters straight away, before the dice animation finishes.
    function renderCommittedCounters(){
      $("#hands").textContent=state.handsLeft;$("#rerolls").textContent=state.rerollsLeft;
      $("#rerollBtn").disabled=true;$("#playBtn").disabled=true;$("#playBtn").classList.remove("clears");
    }
    function renderCommittedScore(){
      animateNumber($("#roundScore"),state.roundScore,{duration:700,reduceMotion});
      $("#progressFill").style.width=`${Math.min(100,state.roundScore/state.target*100)}%`;
      renderCommittedCounters();
    }

    // Each action commits its outcome (state + save) first, then plays the animation.
    // The counters respond instantly and closing the page mid-animation never loses or repeats a move.
    async function reroll(){
      if(!canAct()||state.rerollsLeft<1||!selected.size)return;
      busy=true;rollSound();animatePet("dice",1);
      const idx=[...selected],oldDice=[...state.dice],oldHand=evaluate(oldDice),changed=state.dice.map((_,i)=>selected.has(i));
      idx.forEach(i=>state.dice[i]=1+Math.floor(Math.random()*6));
      state.rerollsLeft--;state.rerollsUsed++;
      const hits=triggered(context("reroll",{oldDice,newDice:[...state.dice],changed,oldHand,newHand:evaluate(state.dice)}));
      applyRerollCharmEffects(hits);
      persistSafe();renderCommittedCounters();
      recordGardenEvent({type:"reroll",changed:idx.length,sixes:state.dice.filter((n,i)=>changed[i]&&n===6).length,ones:state.dice.filter((n,i)=>changed[i]&&n===1).length});
      await tumbleDice(idx,420);
      emitSkinEffect("roll");
      selected.clear();busy=false;
      speechForHand();render();landDice(idx);audio.land?.();
      flashCharms(hits);
    }
    async function playHand(){
      if(!canAct()||state.handsLeft<1)return;
      busy=true;selected.clear();
      const p=previewStats(),hits=p.triggers,playedDice=[...state.dice],neededBefore=state.target-state.roundScore;
      state.roundScore+=p.total;state.totalScore+=p.total;state.handsLeft--;
      state.rerollsLeft+=p.rerollRefund;state.bonus=emptyBonus();state.refunded=[];
      recordGardenEvent({type:"play",dice:playedDice,hand:p.hand.id,score:p.total,rerollsUsed:state.rerollsUsed});
      const won=state.roundScore>=state.target,lost=!won&&state.handsLeft<=0;
      if(won){
        state.phase="chooseCharm";state.charmChoices=makeCharmChoices();
        recordGardenEvent({type:"round-win",round:state.level,rerollsLeft:state.rerollsLeft});
        persistSafe();
      }else if(lost)finishRun(false);
      else{state.dice=rollFive();state.initialDice=[...state.dice];state.rerollsUsed=0;persistSafe()}

      // Score choreography: the scoring dice hop in turn, the hand name blooms,
      // then the points fly into the round total.
      const tier=handTier(p.hand),scoring=scoringIndices(playedDice);
      renderCommittedCounters();
      animatePet(tier==="rare"||tier==="legendary"?"cheer":p.mult>=4?"happy":"dice",1);
      scoring.forEach((_,k)=>setTimeout(()=>audio.tick?.(k),reduceMotion?0:k*85));
      await highlightScoring(scoring,tier);
      if(tier!=="common")effects.flourish(`${p.hand.name}!`,tier);
      if(p.hand.mult>=4)lumaStars(p.hand.mult);
      flashCharms(hits);scoreSound(p.mult);
      effects.scoreFly(p.total,"#preview","#roundScore");burst(window.innerWidth/2,window.innerHeight*.58,tier==="legendary"?34:16);
      renderCommittedScore();
      if(p.rerollRefund)toast(`Golden charm${p.rerollRefund>1?"s":""} returned ${p.rerollRefund} reroll${p.rerollRefund>1?"s":""}.`);
      await wait(650);
      if(won){render();await wait(300);celebrateRoundWin();return}
      if(lost){animatePet("wince");await wait(450);showGameOver();return}
      if(p.total<neededBefore*.25)animatePet("wince");
      busy=false;speechForHand();render();dealDice();
    }
    function celebrateRoundWin(){
      winSound();animatePet("cheer",2);burst(window.innerWidth/2,window.innerHeight/2,40);effects.petalRain(40);
      $("#speech").textContent="That was lovely! Choose a charm for the path ahead.";
      showCharmChoices();
    }
    function makeCharmChoices(){
      const pool=[];
      charmFamilies.forEach((_,fi)=>variants.forEach((__,vi)=>pool.push({fi,vi})));
      for(let i=pool.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [pool[i],pool[j]]=[pool[j],pool[i]];
      }
      return pool.slice(0,3);
    }
    function charmChoices(){
      if(!state.charmChoices?.length)state.charmChoices=makeCharmChoices();
      return state.charmChoices.map(({fi,vi})=>{
        const existing=state.charms.find(c=>c.familyIndex===fi&&c.variantIndex===vi);
        return {family:charmFamilies[fi],variant:variants[vi],familyIndex:fi,variantIndex:vi,rank:existing?(existing.rank+1):1,isUpgrade:!!existing};
      });
    }
    function showCharmChoices(){
      const choices=charmChoices();
      showModal(`<h2>A charm chooses you</h2><p class="lead">Round ${state.level} cleared! Pick one charm. Picking one you own makes it stronger.</p>
        <div class="choice-grid">${choices.map((ch,i)=>`<button class="choice" type="button" data-pick="${i}">
          <div class="big-icon">${icons.charm(ch.variant.tone)}</div><div><h3>${ch.variant.label} ${ch.family.name}</h3><p>${ch.family.desc}</p><div class="effect">${effectText(ch)}${ch.isUpgrade?` · upgrades yours to rank ${ch.rank}`:""}</div><span class="choice-when">${ch.family.trigger==="reroll"?"Triggers when you reroll":"Triggers when you play"}</span></div></button>`).join("")}</div>`);
      document.querySelectorAll("[data-pick]").forEach(b=>b.onclick=()=>pickCharm(+b.dataset.pick));
    }
    function pickCharm(i){
      if(state?.phase!=="chooseCharm")return;
      const ch=charmChoices()[i];if(!ch)return;
      const existing=state.charms.find(c=>c.familyIndex===ch.familyIndex&&c.variantIndex===ch.variantIndex);
      if(existing)existing.rank++;else state.charms.push({family:ch.family,variant:ch.variant,familyIndex:ch.familyIndex,variantIndex:ch.variantIndex,rank:1});
      state.charmChoices=[];
      // The new or upgraded charm glows in the charm list for a moment.
      appContext.freshCharm={index:existing?state.charms.indexOf(existing):state.charms.length-1,until:Date.now()+4000};
      clickSound(620,.08);state.phase="upgradeHand";persistSafe();renderStatus();showHandUpgrade();
    }
    function showHandUpgrade(){
      const order=[...handsData].sort((a,b)=>(state.handLevels[a.id]||1)-(state.handLevels[b.id]||1));
      showModal(`<h2>Grow a favorite hand</h2><p class="lead">Each level gives that hand more petals and +1 sparkle, every time you play it.</p>
        <div class="upgrade-list">${order.map(h=>`<button class="upgrade" type="button" data-up="${h.id}"><em>Lv ${state.handLevels[h.id]} → ${state.handLevels[h.id]+1}</em><strong>${h.name}</strong><span>${h.desc}</span><small class="upgrade-gain">+${levelPetals(h)} petals · +1 sparkle</small></button>`).join("")}</div>`);
      document.querySelectorAll("[data-up]").forEach(b=>b.onclick=()=>upgradeHand(b.dataset.up));
    }
    function upgradeHand(id){
      if(state?.phase!=="upgradeHand"||!(id in state.handLevels))return;
      state.handLevels[id]++;clickSound(760,.1);closeModal();
      if(state.level>=25){victory();return}
      state.level++;state.target=targetFor(state.level);state.roundScore=0;state.handsLeft=3;state.rerollsLeft=3;state.dice=rollFive();state.initialDice=[...state.dice];state.rerollsUsed=0;state.bonus=emptyBonus();state.refunded=[];state.phase="play";
      busy=false;$("#speech").textContent=`${roundSpeech()} Reach ${state.target.toLocaleString()} petals.`;persistSafe();render();
      effects.roundCard(`Round ${state.level}`,`Reach ${state.target.toLocaleString()} petals`);dealDice();
    }
    // Records the result and clears the save right away, so a finished run can't be continued.
    function finishRun(won){
      grantMoonDropForRun();
      state.phase="over";busy=false;selected.clear();
      const meta=loadMeta();
      meta.bestLevel=won?25:Math.max(meta.bestLevel||0,state.level);meta.runs=(meta.runs||0)+1;
      if(won)meta.wins=(meta.wins||0)+1;
      meta.bestScore=Math.max(meta.bestScore||0,state.totalScore);
      saveMeta(meta);clearSave();updateStartStats();
    }
    function gameOver(){finishRun(false);showGameOver()}
    function showGameOver(){
      failSound();startPetIdle();
      showModal(`<div class="loss-ending"><canvas class="loss-pet-sprite" width="400" height="420" aria-hidden="true"></canvas><section class="loss-window"><h2>The gate grows sleepy</h2><p class="lead">You reached round ${state.level} and gathered ${state.totalScore.toLocaleString()} starlight. Lady Luma will remember your courage, even if the garden resets.</p>
        ${runSummary()}<button class="primary" id="againBtn" type="button">Try another journey</button></section></div>`);
      $("#modal").classList.add("loss-modal");
      showSadPet();
      $("#againBtn").onclick=()=>{closeModal();newRun()};
    }
    function victory(){
      finishRun(true);
      burst(window.innerWidth/2,window.innerHeight/2,60);effects.petalRain(90);winSound();animatePet("cheer",3);
      showModal(`<h2>The starlight gate opens</h2><p class="lead">You completed all 25 rounds with ${state.totalScore.toLocaleString()} starlight. Lady Luma crowns you the Moon Garden's luckiest wanderer.</p>
        <div class="ending-flower" style="text-align:center">${icons.flower}</div>${runSummary()}<button class="primary" id="againBtn" type="button">Begin a fresh journey</button>`);
      $("#againBtn").onclick=()=>{closeModal();newRun()};
    }
    function runSummary(){
      const meta=loadMeta();
      return `<dl class="run-summary"><div><dt>Charms</dt><dd>${state.charms.length}</dd></div><div><dt>Best round</dt><dd>${meta.bestLevel||state.level}</dd></div><div><dt>Journeys</dt><dd>${meta.runs||1}</dd></div></dl>`;
    }
    function beginNewRun(){
      state=defaultState();state.initialDice=[...state.dice];selected.clear();busy=false;startPetIdle();
      $("#startScreen").classList.add("hidden");persistSafe();render();speechForHand();dealDice();
      const meta=loadMeta();
      if(!meta.tutorialSeen){meta.tutorialSeen=true;saveMeta(meta);showHelp()}
      else effects.roundCard("Round 1",`Reach ${state.target.toLocaleString()} petals`);
    }
    function newRun(){
      if(busy)return;
      busy=true;
      const startButton=$("#newRunBtn");
      if(startButton)startButton.disabled=true;
      // The intro is deliberately opt-in: Continue and restoration call beginNewRun/load directly.
      if(!newRunIntro.playNewRunIntro(()=>{if(startButton)startButton.disabled=false;beginNewRun()})){if(startButton)startButton.disabled=false;beginNewRun()}
    }
    function continueRun(){
      if(!load()){beginNewRun();return}
      $("#startScreen").classList.add("hidden");selected.clear();busy=false;render();startPetIdle();dealDice();
      if(state.phase==="chooseCharm")showCharmChoices()
      else if(state.phase==="upgradeHand")showHandUpgrade();
      else speechForHand();
    }
    function updateContinue(){
      const saved=storage.getJSON(SAVE_KEY,null),button=$("#continueBtn");
      button.disabled=!saved?.level;
      button.textContent=saved?.level?`Continue journey · Round ${saved.level}`:"No saved journey yet";
    }
    function updateStartStats(){
      const meta=loadMeta(),el=$("#startStats");
      if(!meta.runs){el.hidden=true;return}
      el.hidden=false;
      el.textContent=`Best round ${meta.bestLevel||1} / 25 · ${meta.runs} journey${meta.runs===1?"":"s"}${meta.wins?` · ${meta.wins} gate${meta.wins===1?"":"s"} opened`:""}`;
    }

    function showHelp(){
      showDismissibleModal(`<h2>How to play</h2><p class="lead">Build dice-poker hands, collect lucky charms, and clear all 25 rounds.</p><div class="tutorial">
        <div class="tip"><b>1. Pick dice to reroll</b><span>Tap the dice you don't want. Raised pink dice are rerolled. You get 3 rerolls per round, shared by all your hands.</span></div>
        <div class="tip"><b>2. Play a hand</b><span>Your score is <b class="inline">petals × sparkle</b>. Petals are the dice total plus the hand's bonus. Better hands give more sparkle.</span></div>
        <div class="tip"><b>3. Reach the target</b><span>Each round gives you 3 hands. Reach the round's target score before they run out. A glowing Play button means this hand clears the round.</span></div>
        <div class="tip"><b>4. Grow stronger</b><span>After each round, pick a charm and level up a hand. Play charms add to the hand you play. Reroll charms save their bonus for your next hand.</span></div>
      </div><p class="help-keys">On a keyboard: <kbd>1</kbd>–<kbd>5</kbd> pick dice · <kbd>R</kbd> reroll · <kbd>P</kbd> play · <kbd>Esc</kbd> clear</p><button class="primary" id="closeHelp" type="button">Got it</button>`);
      $("#closeHelp").onclick=closeModal;
    }
    function showSettings(){
      const soundLabel=audio.enabled?"On":"Off";
      const gardenKeeperLink=gardenKeeperToolsUnlocked?`<button class="setting-link garden-keeper-link" id="gardenKeeperTools" type="button"><span><b>Garden Keeper tools</b><small>Test this journey's hidden paths</small></span><strong aria-hidden="true">›</strong></button>`:"";
      showDismissibleModal(`<div class="settings-menu"><p class="eyebrow">Moon Garden</p><h2>Settings</h2><p class="lead">Settle in before your next hand.</p>
        <div class="settings-list">
          <section class="setting-row"><div><h3>Garden sounds</h3><p>Music and little dice chimes.</p></div><button class="setting-toggle ${audio.enabled?"is-on":""}" id="settingsSound" type="button" role="switch" aria-checked="${audio.enabled}"><span aria-hidden="true"></span>${soundLabel}</button></section>
          <button class="setting-link" id="settingsHelp" type="button"><span><b>How to play</b><small>Rules, dice, and charms</small></span><strong aria-hidden="true">›</strong></button>
          <button class="setting-link" id="settingsGarden" type="button"><span><b>Dice garden</b><small>Choose cosmetic dice skins</small></span><strong aria-hidden="true">›</strong></button>
          <button class="setting-link" id="settingsHands" type="button"><span><b>Hand levels</b><small>Review your upgrades</small></span><strong aria-hidden="true">›</strong></button>
          ${gardenKeeperLink}
        </div><button class="primary" id="closeSettings">Back to the table</button></div>`);
      $("#modal").dataset.view="settings";
      $("#settingsSound").onclick=()=>{const enabled=audio.toggle();updateSound();if(enabled)clickSound(660,.05);showSettings()};
      $("#settingsHelp").onclick=showHelp;$("#settingsGarden").onclick=showSkinMenu;$("#settingsHands").onclick=showHandLevels;
      const gardenKeeperButton=$("#gardenKeeperTools");if(gardenKeeperButton)gardenKeeperButton.onclick=showGardenKeeperTools;
      $("#closeSettings").onclick=closeModal;
    }
    function resetTestRound(){
      if(!state||state.phase==="over")return;
      busy=false;selected.clear();state.roundScore=0;state.handsLeft=3;state.rerollsLeft=3;state.dice=rollFive();state.initialDice=[...state.dice];state.rerollsUsed=0;state.bonus=emptyBonus();state.refunded=[];state.phase="play";
      persistSafe();closeModal();render();speechForHand();animateDice([0,1,2,3,4]);toast("This round has been reset.");
    }
    function forceRoundWin(){
      if(!state)return;
      if(state.phase!=="play")return;
      busy=false;selected.clear();const remaining=Math.max(0,state.target-state.roundScore);state.roundScore+=remaining;state.totalScore+=remaining;
      state.phase="chooseCharm";state.charmChoices=makeCharmChoices();recordGardenEvent({type:"round-win",round:state.level,rerollsLeft:state.rerollsLeft});
      persistSafe();render();celebrateRoundWin();
    }
    function jumpToFinalRound(){
      if(!state||state.phase==="over")return;
      busy=false;selected.clear();state.level=25;state.target=targetFor(25);state.roundScore=0;state.handsLeft=3;state.rerollsLeft=3;state.dice=rollFive();state.initialDice=[...state.dice];state.rerollsUsed=0;state.bonus=emptyBonus();state.refunded=[];state.phase="play";
      persistSafe();closeModal();render();speechForHand();animateDice([0,1,2,3,4]);toast("The final round is ready.");
    }
    function showGardenKeeperTools(){
      if(!gardenKeeperToolsUnlocked)return;
      showDismissibleModal(`<div class="garden-keeper-menu"><p class="eyebrow">Secret path</p><h2>Garden Keeper tools</h2><p class="lead">Shortcuts for testing the Moon Garden's full journey.</p>
        <div class="keeper-grid">
          <button class="keeper-action" id="keeperWin" type="button"><b>Clear this round</b><small>Choose a charm now</small></button>
          <button class="keeper-action" id="keeperFinal" type="button"><b>Jump to round 25</b><small>Prepare the final gate</small></button>
          <button class="keeper-action" id="keeperSixes" type="button"><b>Roll five sixes</b><small>Test a high-score hand</small></button>
          <button class="keeper-action" id="keeperResetRound" type="button"><b>Reset this round</b><small>Restore hands and rerolls</small></button>
          <button class="keeper-action" id="keeperGarden" type="button"><b>Open every dice garden</b><small>Unlock all cosmetic packs</small></button>
          <button class="keeper-action keeper-danger" id="keeperLose" type="button"><b>Lose this run</b><small>Show the loss ending now</small></button>
        </div><button class="mini-btn" id="closeGardenKeeper" type="button">Back to settings</button></div>`,showSettings);
      $("#keeperWin").onclick=forceRoundWin;$("#keeperFinal").onclick=jumpToFinalRound;
      $("#keeperSixes").onclick=()=>{if(state?.phase!=="play")return;state.dice=[6,6,6,6,6];state.initialDice=[...state.dice];state.rerollsUsed=0;selected.clear();busy=false;persistSafe();closeModal();render();speechForHand();toast("Five sixes are on the table.")};
      $("#keeperResetRound").onclick=resetTestRound;$("#keeperGarden").onclick=unlockAllSkinPacks;
      $("#keeperLose").onclick=()=>{if(state?.phase!=="play")return;busy=false;selected.clear();gameOver()};$("#closeGardenKeeper").onclick=showSettings;
    }
    function showHandLevels(){
      const current=evaluate(state.dice).id;
      showDismissibleModal(`<h2>Your hand garden</h2><p class="lead">What each hand scores before dice and charms. Level up hands after each round.</p><div class="upgrade-list">
        ${handsData.map(h=>{const lv=state.handLevels[h.id]||1;return `<div class="upgrade hand-info ${h.id===current?"current":""}"><em>Lv ${lv}</em><strong>${h.name}</strong><span>${h.desc}</span><small class="upgrade-gain">+${h.base+(lv-1)*levelPetals(h)} petals · ×${h.mult+lv-1} sparkle${h.id===current?" · on the table":""}</small></div>`}).join("")}</div><button class="primary" id="closeHands" type="button">Close</button>`);
      $("#closeHands").onclick=closeModal;
    }
    function confirmRestart(){
      showDismissibleModal(`<h2>Start over?</h2><p class="lead">Your round ${state.level} journey and its ${state.charms.length} charm${state.charms.length===1?"":"s"} will be replaced by a fresh run.</p>
      <div class="confirm-actions"><button class="mini-btn" id="cancelRestart" type="button">Keep playing</button><button class="primary" id="yesRestart" type="button">Start fresh</button></div>`);
      $("#cancelRestart").onclick=closeModal;$("#yesRestart").onclick=()=>{closeModal();newRun()};
    }

    function init(){
      $("#brandMark").innerHTML=icons.flower;
      $("#guardian").innerHTML=`<button class="pet-button" type="button" aria-label="Pet Lady Luma" title="Pet Lady Luma"><canvas class="pet-sprite pet-canvas" width="400" height="420"></canvas></button>`;
      $("#startGuardian").innerHTML=`<canvas class="pet-sprite pet-canvas" width="400" height="420" aria-hidden="true"></canvas>`;
      $("#sideToggle").innerHTML=icons.bag;
      $("#newRunBtn").onclick=newRun;$("#continueBtn").onclick=continueRun;$("#rerollBtn").onclick=reroll;$("#playBtn").onclick=playHand;
      $("#settingsBtn").onclick=showSettings;$("#handsBtn").onclick=showHandLevels;$("#skinsBtn").onclick=showSkinMenu;$("#restartBtn").onclick=confirmRestart;
      $("#guardian .pet-button").onclick=petTap;
      function setSidePanelOpen(open){
        const panel=$("#sidePanel"),isMobile=window.matchMedia?.("(max-width: 800px)").matches;
        panel.classList.toggle("open",open);
        $("#sideToggle").setAttribute("aria-expanded",String(open));
        $("#sideToggle").setAttribute("aria-label",open?"Close charms":"Open charms");
        if(isMobile){panel.toggleAttribute("inert",!open);panel.setAttribute("aria-hidden",String(!open));}
      }
      $("#sideToggle").onclick=()=>setSidePanelOpen(!$("#sidePanel").classList.contains("open"));
      $("#closeSidePanel").onclick=()=>setSidePanelOpen(false);
      setSidePanelOpen(false);
      // Only menus opened during play can be dismissed; charm picks and endings need a choice.
      const canDismissModal=()=>state?.phase==="play";
      $("#overlay").onclick=e=>{if(e.target===$("#overlay")&&canDismissModal())closeModal()};
      document.addEventListener("keydown",e=>{
        checkSecretCode(e);
        const modalOpen=$("#overlay").classList.contains("show");
        if(e.key==="Escape"){
          if(modalOpen){if(canDismissModal())closeModal()}
          else if($("#sidePanel").classList.contains("open"))setSidePanelOpen(false);
          else clearSelection();
          return;
        }
        if(modalOpen||e.ctrlKey||e.metaKey||e.altKey||!state||!$("#startScreen").classList.contains("hidden"))return;
        if(e.target?.closest?.("input,textarea,select,[contenteditable]"))return;
        const key=e.key.toLowerCase();
        if(key>="1"&&key<="5"&&key.length===1)toggleDie(+key-1);
        else if(key==="r"){e.preventDefault?.();reroll()}
        else if(key==="p"){e.preventDefault?.();playHand()}
      });
      // pagehide/visibilitychange fire reliably on mobile, where beforeunload often does not.
      const persistIfPlaying=()=>{if(state)persistSafe()};
      window.addEventListener("pagehide",persistIfPlaying);
      document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")persistIfPlaying()});
      effects.startAmbient($("#ambient"));
      // The speech bubble gives a little pop whenever Luma says something new.
      if(typeof MutationObserver!=="undefined")new MutationObserver(()=>{const bubble=$(".speech");if(!bubble||reduceMotion)return;bubble.classList.remove("speech-pop");void bubble.offsetWidth;bubble.classList.add("speech-pop")}).observe($("#speech"),{childList:true,characterData:true,subtree:true});
      // Soft ripple from the press point on the game's chunky buttons.
      document.addEventListener("pointerdown",e=>{
        const button=e.target?.closest?.(".btn,.primary,.start-btn,.choice,.upgrade,.setting-link,.keeper-action");
        if(!button||button.disabled||reduceMotion)return;
        const rect=button.getBoundingClientRect(),ripple=document.createElement("span");
        ripple.className="ripple";ripple.style.left=`${e.clientX-rect.left}px`;ripple.style.top=`${e.clientY-rect.top}px`;
        button.appendChild(ripple);setTimeout(()=>ripple.remove(),600);
      });
      updateStartStats();updateContinue();updateSound();loadPetSheet();prepareSkinSheets();startPetIdle();
    }
    init();
  })();
