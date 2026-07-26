// @ts-nocheck
import { sum } from "./game-rules";
import sakuraPetalSheet from "./assets/sakura-petal-pack_keyed.png";
import mintFairySheet from "./assets/mint-fairy-pack_keyed.png";
import moonlitPearlSheet from "./assets/moonlit-pearl-pack_keyed.png";
import twilightCrystalSheet from "./assets/twilight-crystal-pack_keyed.png";

export const burstColors = ["#f5a9cf", "#c8b6ff", "#a8e6cf", "#ffd98e", "#a9d8f5"];

// Goals only observe dice events; they never alter a roll, score, or reroll.
export const skinPacks = [
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

export const charmFamilies = [
  {name:"Daisy Charm",test:c=>c.phase==="play"&&c.dice.includes(1),desc:"Play a hand containing a 1"}, {name:"Royal Ribbon",test:c=>c.phase==="play"&&c.dice.includes(6),desc:"Play a hand containing a 6"}, {name:"Cloud Charm",test:c=>c.phase==="play"&&c.rerollsUsed===0,desc:"Play without rerolling"}, {name:"Rainy Charm",test:c=>c.phase==="play"&&c.rerollsLeft===0,desc:"Play with no rerolls left"}, {name:"Tea Charm",test:c=>c.phase==="play"&&sum(c.dice)<15,desc:"Play dice totaling less than 15"}, {name:"Sunbeam Charm",test:c=>c.phase==="play"&&sum(c.dice)>22,desc:"Play dice totaling more than 22"}, {name:"Twin Charm",test:c=>c.phase==="play"&&c.hand.id==="pair",desc:"Play exactly one Pair"}, {name:"Picnic Charm",test:c=>c.phase==="play"&&["twoPair","full"].includes(c.hand.id),desc:"Play Two Pair or a Full House"}, {name:"Crown Charm",test:c=>c.phase==="play"&&["three","four","five"].includes(c.hand.id),desc:"Play at least Three of a Kind"}, {name:"Rainbow Charm",test:c=>c.phase==="play"&&c.hand.id==="straight",desc:"Play a Straight"}, {name:"Evening Charm",test:c=>c.phase==="play"&&c.dice.every(n=>n%2===0),desc:"Play only even dice"}, {name:"Morning Charm",test:c=>c.phase==="play"&&c.dice.every(n=>n%2===1),desc:"Play only odd dice"}, {name:"Mirror Charm",test:c=>c.phase==="play"&&c.dice[0]===c.dice[4]&&c.dice[1]===c.dice[3],desc:"Play mirrored outer dice"}, {name:"Bouquet Charm",test:c=>c.phase==="play"&&new Set(c.dice).size<=3,desc:"Play three or fewer unique values"}, {name:"Butterfly Charm",test:c=>c.phase==="play"&&Math.max(...c.dice)-Math.min(...c.dice)<=2,desc:"Largest and smallest differ by 2 or less"}, {name:"Lucky Seven",test:c=>c.phase==="play"&&(c.dice[0]+c.dice[4]===7),desc:"First and last dice total 7"}, {name:"Moon Charm",test:c=>c.phase==="play"&&sum(c.dice)%5===0,desc:"Dice total is divisible by 5"}, {name:"Comet Charm",test:c=>c.phase==="play"&&c.dice.every((n,i,a)=>i===0||n>=a[i-1]),desc:"Dice never descend left to right"}, {name:"Frog Charm",test:c=>c.phase==="reroll"&&c.newDice.some((n,i)=>c.changed[i]&&n===6),desc:"Reroll at least one die into a 6"}, {name:"Berry Charm",test:c=>c.phase==="reroll"&&c.newDice.some((n,i)=>c.changed[i]&&n===1),desc:"Reroll at least one die into a 1"}, {name:"Wish Charm",test:c=>c.phase==="reroll"&&c.oldHand.id===c.newHand.id,desc:"Reroll without changing hand type"}, {name:"Acorn Charm",test:c=>c.phase==="reroll"&&c.changed.filter(Boolean).length===1,desc:"Reroll exactly one die"}, {name:"Confetti Charm",test:c=>c.phase==="reroll"&&c.changed.filter(Boolean).length===5,desc:"Reroll all five dice"}, {name:"Swan Charm",test:c=>c.phase==="play"&&c.dice[0]===c.dice[4],desc:"First and last dice match"}
];

export const variants = [
  {id:"petals",tone:"#a8e6cf",label:"Mint",effect:rank=>({petals:8+rank*4,mult:0,rerolls:0})}, {id:"mult",tone:"#f5a9cf",label:"Rose",effect:rank=>({petals:0,mult:1+Math.floor(rank/2),rerolls:0})}, {id:"both",tone:"#c8b6ff",label:"Lilac",effect:rank=>({petals:4+rank*2,mult:1,rerolls:0})}, {id:"reroll",tone:"#ffd98e",label:"Golden",effect:rank=>({petals:0,mult:0,rerolls:1})}
];
