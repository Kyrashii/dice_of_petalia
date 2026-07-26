// @ts-nocheck
import { evaluate } from "./game-rules";

export function createLumaSpeech(context) {
  function speechForHand(){
    const h=evaluate(context.state.dice),lines={
      high:["A gentle start. The next roll may bloom.","Every little petal still counts."],
      pair:["A tiny pair found each other!","Two matching friends. How sweet."],
      twoPair:["Two pairs are having a garden picnic!"],
      three:["Three of a kind! A proper little club."],
      straight:["A perfect staircase of stars!"],
      full:["A full house! Everyone is home."],
      four:["Four matching blooms! The garden is impressed."],
      five:["Five of a kind! Even the moon blinked twice."]
    };
    const a=lines[h.id];context.query("#speech").textContent=a[Math.floor(Math.random()*a.length)];
  }
  function roundSpeech(){
    const lines=["The moon path grows brighter.","New round, new little possibilities.","Your charms are humming softly.","The gate is closer than it looks."];
    return lines[Math.floor(Math.random()*lines.length)];
  }
  return { speechForHand, roundSpeech };
}
