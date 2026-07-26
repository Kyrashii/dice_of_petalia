// @ts-nocheck
import { evaluate, handsData, rollFive, sum, targetFor } from "./game-rules";

export function createRunState(context) {
  function defaultState(){return {level:1,target:targetFor(1),roundScore:0,handsLeft:3,rerollsLeft:3,dice:rollFive(),initialDice:[],rerollsUsed:0,handLevels:Object.fromEntries(handsData.map(h=>[h.id,1])),charms:[],sound:context.audio.enabled,phase:"play",totalScore:0,runStarted:Date.now()}}
  function baseStats(){const hand=evaluate(context.state.dice),level=context.state.handLevels[hand.id]||1;return {hand,petals:sum(context.state.dice)+hand.base+(level-1)*(4+Math.ceil(hand.base*.22)),mult:hand.mult+(level-1)}}
  function gameContext(phase,extra={}){return {phase,dice:context.state.dice,hand:evaluate(context.state.dice),rerollsUsed:context.state.rerollsUsed,rerollsLeft:context.state.rerollsLeft,handsLeft:context.state.handsLeft,...extra}}
  function triggered(ctx){return context.state.charms.filter(ch=>ch.family.test(ctx))}
  function previewStats(){const base=baseStats(),list=triggered(gameContext("play"));let petals=base.petals,mult=base.mult;list.forEach(ch=>{const e=ch.variant.effect(ch.rank);petals+=e.petals;mult+=e.mult});return {...base,petals,mult,total:petals*mult,triggers:list}}
  return { defaultState, baseStats, gameContext, triggered, previewStats };
}
