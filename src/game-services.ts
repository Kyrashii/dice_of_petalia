// @ts-nocheck

export function createGameServices(context) {
  const burst=(x,y,n)=>context.effects.burst(x,y,n);
  const popScore=n=>context.effects.popScore(n);
  const lumaHearts=()=>context.effects.lumaHearts();
  const lumaStars=mult=>context.effects.lumaStars(mult);
  const clickSound=(f=440,v=.03)=>context.audio.click(f,v);
  const rollSound=()=>context.audio.roll();
  const scoreSound=mult=>context.audio.score(mult);
  const winSound=()=>context.audio.win();
  const failSound=()=>context.audio.fail();
  function updateSound(){context.audio.persist()}
  return { burst, popScore, lumaHearts, lumaStars, clickSound, rollSound, scoreSound, winSound, failSound, updateSound };
}
