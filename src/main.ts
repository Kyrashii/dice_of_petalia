// @ts-nocheck
import "./styles.css";
import { evaluate, handsData, rollFive, sum, targetFor } from "./game-rules";
import sakuraPetalSheet from "./assets/sakura-petal-pack_keyed.png";
import mintFairySheet from "./assets/mint-fairy-pack_keyed.png";
import moonlitPearlSheet from "./assets/moonlit-pearl-pack_keyed.png";
import twilightCrystalSheet from "./assets/twilight-crystal-pack_keyed.png";

// The original browser game is intentionally kept as one behavior-preserving module.
// Game-rule functions above are typed and independently tested.
(() => {
    "use strict";

    const $ = s => document.querySelector(s);
    const SAVE_KEY = "dice-of-petalia-save-v1";
    const META_KEY = "dice-of-petalia-meta-v1";
    const GARDEN_KEY = "dice-of-petalia-luma-garden-v1";
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

    // These goals only observe existing dice events; none of them alter a roll, score or reroll.
    const skinPacks = [
      {id:"sakura",name:"Sakura Petal",sheet:sakuraPetalSheet,accent:"#df6f9f",effect:"Petal rain",tasks:[
        {id:"pair",label:"Play 3 pairs",target:3,when:e=>e.type==="play"&&e.hand==="pair"},
        {id:"twoPair",label:"Play a Two Pair",target:1,when:e=>e.type==="play"&&e.hand==="twoPair"},
        {id:"straight",label:"Play a straight",target:1,when:e=>e.type==="play"&&e.hand==="straight"},
        {id:"smallReroll",label:"Reroll exactly 2 dice",target:2,when:e=>e.type==="reroll"&&e.changed===2},
        {id:"pinkSix",label:"Reroll a die into 6, 3 times",target:3,when:e=>e.type==="reroll"&&e.sixes},
        {id:"bloom",label:"Win 2 rounds",target:2,when:e=>e.type==="round-win"}
      ]},
      {id:"mint",name:"Mint Fairy",sheet:mintFairySheet,accent:"#4aaf91",effect:"Fairy leaves",tasks:[
        {id:"clean",label:"Play 3 hands without rerolling",target:3,when:e=>e.type==="play"&&e.rerollsUsed===0},
        {id:"single",label:"Reroll exactly 1 die",target:3,when:e=>e.type==="reroll"&&e.changed===1},
        {id:"even",label:"Play an all-even hand",target:1,when:e=>e.type==="play"&&e.dice.every(n=>n%2===0)},
        {id:"odd",label:"Play an all-odd hand",target:1,when:e=>e.type==="play"&&e.dice.every(n=>n%2===1)},
        {id:"low",label:"Play a hand totaling under 15",target:2,when:e=>e.type==="play"&&sum(e.dice)<15},
        {id:"fresh",label:"Win a round with rerolls left",target:2,when:e=>e.type==="round-win"&&e.rerollsLeft>0}
      ]},
      {id:"pearl",name:"Moonlit Pearl",sheet:moonlitPearlSheet,accent:"#ad5a8c",effect:"Pearl shimmer",tasks:[
        {id:"moonTotal",label:"Play 3 hands totaling a multiple of 5",target:3,when:e=>e.type==="play"&&sum(e.dice)%5===0},
        {id:"mirror",label:"Play mirrored outer dice",target:2,when:e=>e.type==="play"&&e.dice[0]===e.dice[4]},
        {id:"full",label:"Play a Full House",target:1,when:e=>e.type==="play"&&e.hand==="full"},
        {id:"lucky",label:"Reroll a die into 1",target:3,when:e=>e.type==="reroll"&&e.ones},
        {id:"starlight",label:"Score 150 or more with one hand",target:1,when:e=>e.type==="play"&&e.score>=150},
        {id:"moonPath",label:"Reach round 5",target:1,when:e=>e.type==="round-win"&&e.round>=5}
      ]},
      {id:"crystal",name:"Twilight Crystal",sheet:twilightCrystalSheet,accent:"#9a65d2",effect:"Crystal sparks",tasks:[
        {id:"three",label:"Play 2 Three of a Kind",target:2,when:e=>e.type==="play"&&e.hand==="three"},
        {id:"four",label:"Play a Four of a Kind",target:1,when:e=>e.type==="play"&&e.hand==="four"},
        {id:"five",label:"Play a Five of a Kind",target:1,when:e=>e.type==="play"&&e.hand==="five"},
        {id:"all",label:"Reroll all 5 dice",target:2,when:e=>e.type==="reroll"&&e.changed===5},
        {id:"six",label:"Play 3 hands containing a 6",target:3,when:e=>e.type==="play"&&e.dice.includes(6)},
        {id:"twilight",label:"Win a round from round 10 onward",target:1,when:e=>e.type==="round-win"&&e.round>=10}
      ]}
    ];
    const skinFaces = {};
    let garden = loadGarden();
    let secretCodeBuffer = "";

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

    function defaultGarden(){
      return {selected:"default",moonDrops:0,packs:Object.fromEntries(skinPacks.map(pack=>[pack.id,{progress:{},skipped:false,skippedTask:null}]))};
    }
    function loadGarden(){
      try{
        const saved=JSON.parse(localStorage.getItem(GARDEN_KEY)||"null"),fresh=defaultGarden();
        if(!saved)return fresh;
        skinPacks.forEach(pack=>{
          const old=saved.packs?.[pack.id]||{};
          fresh.packs[pack.id]={progress:old.progress||{},skipped:!!old.skipped,skippedTask:old.skippedTask||null};
        });
        fresh.moonDrops=Math.max(0,Number(saved.moonDrops)||0);
        fresh.selected=saved.selected==="default"||skinPacks.some(pack=>pack.id===saved.selected)?saved.selected:"default";
        return fresh;
      }catch{return defaultGarden()}
    }
    function saveGarden(){localStorage.setItem(GARDEN_KEY,JSON.stringify(garden))}
    function taskDone(pack,task){return (garden.packs[pack.id]?.progress?.[task.id]||0)>=task.target}
    function completedTasks(pack){return pack.tasks.filter(task=>taskDone(pack,task)).length}
    function isUnlocked(pack){return completedTasks(pack)>=5}
    function effectUnlocked(pack){return completedTasks(pack)===pack.tasks.length}
    function activeSkin(){
      const pack=skinPacks.find(item=>item.id===garden.selected);
      return pack&&isUnlocked(pack)?pack:null;
    }
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
    async function prepareSkinFaces(pack){
      if(skinFaces[pack.id])return;
      const image=new Image();image.decoding="async";
      const loaded=new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject});
      image.src=pack.sheet;await loaded;
      const frameWidth=Math.floor(image.naturalWidth/6),frameHeight=image.naturalHeight;
      skinFaces[pack.id]=Array.from({length:6},(_,index)=>{
        const frame=document.createElement("canvas");frame.width=frameWidth;frame.height=frameHeight;
        const context=frame.getContext("2d",{willReadFrequently:true});
        context.drawImage(image,index*frameWidth,0,frameWidth,frameHeight,0,0,frameWidth,frameHeight);
        const pixels=context.getImageData(0,0,frameWidth,frameHeight),data=pixels.data;
        for(let pixel=0;pixel<data.length;pixel+=4){
          const red=data[pixel],green=data[pixel+1],blue=data[pixel+2],alpha=data[pixel+3];
          if(!alpha)continue;
          // The replacement sheets already have alpha. Only strip the narrow, leftover lime matte
          // from their outside edge; the more blue/white mint artwork is intentionally preserved.
          const greenLead=green-Math.max(red,blue);
          if(red<92&&blue<92&&green>125&&greenLead>68){
            const key=Math.min(1,(greenLead-68)/94);
            data[pixel+3]=Math.round(alpha*(1-key));
            data[pixel+1]=Math.min(green,Math.max(red,blue)+14); // despill the antialiased edge
          }
        }
        context.putImageData(pixels,0,0);
        // A few one-pixel matte fragments live on the frame seams. Crop the connected die body,
        // rather than every remaining non-transparent pixel, so those fragments cannot enlarge it.
        const alphaAt=index=>data[index*4+3]>=32;
        let seedX=Math.floor(frameWidth/2),seedY=Math.floor(frameHeight/2);
        if(!alphaAt(seedY*frameWidth+seedX)){
          let found=false;
          for(let radius=1;radius<Math.max(frameWidth,frameHeight)&&!found;radius++)for(let y=Math.max(0,seedY-radius);y<=Math.min(frameHeight-1,seedY+radius)&&!found;y++)for(let x=Math.max(0,seedX-radius);x<=Math.min(frameWidth-1,seedX+radius);x++){
            if(alphaAt(y*frameWidth+x)){seedX=x;seedY=y;found=true;break}
          }
        }
        let left=frameWidth,top=frameHeight,right=-1,bottom=-1;
        if(alphaAt(seedY*frameWidth+seedX)){
          const visited=new Uint8Array(frameWidth*frameHeight),stack=[seedY*frameWidth+seedX];
          visited[stack[0]]=1;
          const enqueue=next=>{if(!visited[next]&&alphaAt(next)){visited[next]=1;stack.push(next)}};
          while(stack.length){
            const point=stack.pop(),x=point%frameWidth,y=Math.floor(point/frameWidth);
            left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
            if(x>0)enqueue(point-1);if(x<frameWidth-1)enqueue(point+1);
            if(y>0)enqueue(point-frameWidth);if(y<frameHeight-1)enqueue(point+frameWidth);
          }
        }
        if(right<left||bottom<top){left=0;top=0;right=frameWidth-1;bottom=frameHeight-1}
        const width=right-left+1,height=bottom-top+1,padding=7;
        const face=document.createElement("canvas");face.width=face.height=360;
        const faceContext=face.getContext("2d");
        // Every extracted face fills the same square as a normal die. Deliberately stretching the
        // slightly portrait source art avoids a tiny, floating die inside the interaction target.
        faceContext.drawImage(frame,left,top,width,height,padding,padding,360-padding*2,360-padding*2);
        return face.toDataURL("image/png");
      });
    }
    function prepareSkinSheets(){
      Promise.all(skinPacks.map(prepareSkinFaces)).then(()=>{if(state)render();if(document.querySelector("#modal")?.dataset.view==="skins")showSkinMenu()}).catch(()=>toast("A dice sheet could not be prepared."));
    }
    function skinFace(packId,value,preview=false){
      if(packId==="default")return `<span class="preview-pips preview-${value}" aria-hidden="true">${pips(value)}</span>`;
      const source=skinFaces[packId]?.[value-1];
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
      recordGardenEvent({type:"reroll",changed:idx.length,sixes:state.dice.filter((n,i)=>changed[i]&&n===6).length,ones:state.dice.filter((n,i)=>changed[i]&&n===1).length});
      emitSkinEffect("roll");
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
    function emitSkinEffect(trigger){
      const skin=activeSkin();
      if(trigger!=="roll"||!skin||!effectUnlocked(skin)||reduceMotion)return;
      const colorsBySkin={sakura:["#ff9fc8","#ffd2e4"],mint:["#83dbc0","#dffff4"],pearl:["#f0c2da","#fff2d8"],crystal:["#d8a0ff","#a8d8ff"]};
      const glyphsBySkin={sakura:["✿","·"],mint:["❋","•"],pearl:["✦","·"],crystal:["◆","✧"]};
      const table=document.querySelector(".moon-table"),rect=table?.getBoundingClientRect();if(!rect)return;
      for(let i=0;i<12;i++){
        const particle=document.createElement("i"),angle=Math.random()*Math.PI*2,distance=46+Math.random()*105;
        particle.className=`skin-effect skin-effect-${skin.id}`;particle.textContent=glyphsBySkin[skin.id][i%2];
        particle.style.left=`${rect.left+rect.width*(.22+Math.random()*.56)}px`;particle.style.top=`${rect.top+rect.height*(.4+Math.random()*.34)}px`;
        particle.style.color=colorsBySkin[skin.id][i%2];particle.style.setProperty("--drift-x",`${Math.cos(angle)*distance}px`);particle.style.setProperty("--drift-y",`${Math.sin(angle)*distance-62}px`);
        document.body.appendChild(particle);setTimeout(()=>particle.remove(),1000);
      }
    }
    function confirmRestart(){
      showModal(`<h2>Start over?</h2><p class="lead">This will replace the current journey and its charms with a fresh run.</p>
      <div style="display:flex;gap:10px;justify-content:center"><button class="mini-btn" id="cancelRestart">Keep playing</button><button class="primary" id="yesRestart" style="margin:0">Start fresh</button></div>`);
      $("#cancelRestart").onclick=closeModal;$("#yesRestart").onclick=()=>{closeModal();newRun()};
    }
    function showModal(html){$("#modal").innerHTML=html;$("#overlay").classList.add("show")}
    function closeModal(){$("#overlay").classList.remove("show");delete $("#modal").dataset.view}
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
      $("#helpBtn").onclick=showHelp;$("#handsBtn").onclick=showHandLevels;$("#skinsBtn").onclick=showSkinMenu;$("#restartBtn").onclick=confirmRestart;
      $("#soundBtn").onclick=()=>{soundOn=!soundOn;updateSound();if(soundOn)clickSound(660,.05)};
      $("#guardian .pet-button").onclick=petTap;
      $("#sideToggle").onclick=()=>$("#sidePanel").classList.toggle("open");
      $("#overlay").onclick=e=>{if(e.target===$("#overlay")&&state?.phase==="play")closeModal()};
      document.addEventListener("keydown",e=>{checkSecretCode(e);if(e.key==="Escape"&&state?.phase==="play")closeModal();if(e.key>="1"&&e.key<="5"&&!$("#overlay").classList.contains("show"))toggleDie(+e.key-1)});
      window.addEventListener("beforeunload",()=>{if(state)persistSafe()});
      updateContinue();updateSound();loadPetSheet();prepareSkinSheets();startPetIdle();
    }
    init();
  })();
