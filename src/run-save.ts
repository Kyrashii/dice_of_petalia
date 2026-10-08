// @ts-nocheck
import { charmFamilies, variants } from "./game-content";
import { handsData, rollFive, targetFor } from "./game-rules";
import { storage } from "./storage";
import { emptyBonus } from "./run-state";

const PHASES=["play","chooseCharm","upgradeHand"];
const isDie=n=>Number.isInteger(n)&&n>=1&&n<=6;
const count=(value,fallback,min=0)=>Number.isFinite(value)?Math.max(min,Math.floor(value)):fallback;

// Repairs older or hand-edited saves so a bad field never breaks the table.
export function normalizeSave(raw){
  if(!raw||typeof raw!=="object"||!raw.level)return null;
  const level=Math.min(25,count(raw.level,1,1));
  const handLevels=Object.fromEntries(handsData.map(h=>[h.id,count(raw.handLevels?.[h.id],1,1)]));
  const charms=(Array.isArray(raw.charms)?raw.charms:[]).filter(ch=>charmFamilies[ch?.familyIndex]&&variants[ch?.variantIndex]).map(hydrateCharm);
  const dice=Array.isArray(raw.dice)&&raw.dice.length===5&&raw.dice.every(isDie)?raw.dice:rollFive();
  return {
    ...raw,level,target:targetFor(level),roundScore:count(raw.roundScore,0),handsLeft:count(raw.handsLeft,3),rerollsLeft:count(raw.rerollsLeft,3),
    dice,initialDice:Array.isArray(raw.initialDice)?raw.initialDice:[...dice],rerollsUsed:count(raw.rerollsUsed,0),handLevels,charms,
    phase:PHASES.includes(raw.phase)?raw.phase:"play",totalScore:count(raw.totalScore,0),
    bonus:{petals:count(raw.bonus?.petals,0),mult:count(raw.bonus?.mult,0)},
    refunded:Array.isArray(raw.refunded)?raw.refunded.filter(Number.isInteger):[],
    charmChoices:(Array.isArray(raw.charmChoices)?raw.charmChoices:[]).filter(c=>charmFamilies[c?.fi]&&variants[c?.vi])
  };
}
function hydrateCharm(raw){
  const fi=raw.familyIndex??0,vi=raw.variantIndex??0;
  return {family:charmFamilies[fi],variant:variants[vi],familyIndex:fi,variantIndex:vi,rank:count(raw.rank,1,1)};
}
function serializeCharm(ch){return {familyIndex:ch.familyIndex,variantIndex:ch.variantIndex,rank:ch.rank}}

export function createRunSave(context) {
  function load(){
    const state=normalizeSave(storage.getJSON(context.saveKey,null));
    if(!state){storage.remove(context.saveKey);return false}
    // A round that was already won (or a run already lost) must not be replayable.
    if(state.phase==="play"&&state.handsLeft<1&&state.roundScore<state.target){storage.remove(context.saveKey);context.updateContinue();return false}
    state.bonus=state.bonus||emptyBonus();
    context.state=state;
    return true;
  }
  function persistSafe(){
    const state=context.state;
    if(!state||state.phase==="over")return;
    storage.setJSON(context.saveKey,{...state,charms:state.charms.map(serializeCharm)});
    context.updateContinue();
  }
  function clearSave(){storage.remove(context.saveKey);context.updateContinue()}
  return { load, persistSafe, clearSave };
}
