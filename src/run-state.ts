// @ts-nocheck
import { evaluate, handsData, levelPetals, rollFive, sum, targetFor } from "./game-rules";

export function emptyBonus(){return {petals:0,mult:0}}

// Sums the petals, sparkle and rerolls a list of triggered charms grants.
export function charmTotals(charms){
  return charms.reduce((total,ch)=>{const e=ch.variant.effect(ch.rank);total.petals+=e.petals||0;total.mult+=e.mult||0;total.rerolls+=e.rerolls||0;return total},{petals:0,mult:0,rerolls:0});
}

export function createRunState(context) {
  function defaultState(){return {level:1,target:targetFor(1),roundScore:0,handsLeft:3,rerollsLeft:3,dice:rollFive(),initialDice:[],rerollsUsed:0,handLevels:Object.fromEntries(handsData.map(h=>[h.id,1])),charms:[],sound:context.audio.enabled,phase:"play",totalScore:0,bonus:emptyBonus(),refunded:[],charmChoices:[],runStarted:Date.now()}}
  function baseStats(){const hand=evaluate(context.state.dice),level=context.state.handLevels[hand.id]||1;return {hand,petals:sum(context.state.dice)+hand.base+(level-1)*levelPetals(hand),mult:hand.mult+(level-1)}}
  function gameContext(phase,extra={}){return {phase,dice:context.state.dice,hand:evaluate(context.state.dice),rerollsUsed:context.state.rerollsUsed,rerollsLeft:context.state.rerollsLeft,handsLeft:context.state.handsLeft,...extra}}
  function triggered(ctx){return context.state.charms.filter(ch=>{try{return ch.family.test(ctx)}catch{return false}})}
  function previewStats(){
    const base=baseStats(),list=triggered(gameContext("play")),totals=charmTotals(list),bonus=context.state.bonus||emptyBonus();
    const petals=base.petals+totals.petals+bonus.petals,mult=base.mult+totals.mult+bonus.mult;
    return {...base,petals,mult,total:petals*mult,triggers:list,rerollRefund:totals.rerolls,bonus}
  }
  return { defaultState, baseStats, gameContext, triggered, previewStats };
}
