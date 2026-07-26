// @ts-nocheck

export function createPetInteraction(context) {
  function petTap(){
    context.animatePet("happy",1);context.clickSound(720,.05);context.lumaHearts();
    const lines=["You found my secret ticklish ear!","I am supervising the dice very carefully.","The moon says your next roll feels lucky.","One tiny hop for moral support!"];
    if(context.state)context.query("#speech").textContent=lines[Math.floor(Math.random()*lines.length)];
  }
  return { petTap };
}
