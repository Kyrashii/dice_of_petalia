// @ts-nocheck

export function createPetAnimation(context) {
  let lossPetTimer = null;
  function startPetIdle(){
    clearInterval(context.petTimer);clearTimeout(context.petTimer);
    if(context.reduceMotion){context.setPetFrame("idle",0);return}
    const sequence=[0,0,1,2,3,0],step=()=>{context.setPetFrame("idle",sequence[index]);index=(index+1)%sequence.length};
    let index=0;step();context.petTimer=setInterval(step,620);
  }
  function animatePet(petState,loops=1){
    clearInterval(context.petTimer);clearTimeout(context.petTimer);
    if(context.reduceMotion){context.setPetFrame(petState,3);context.petTimer=setTimeout(startPetIdle,500);return}
    let step=0;const total=4*Math.max(1,loops),speed=petState==="dice"?180:145;
    context.setPetFrame(petState,0);
    context.petTimer=setInterval(()=>{
      step++;
      if(step>=total){startPetIdle();return}
      context.setPetFrame(petState,step%4);
    },speed);
  }
  function showSadPet(){
    clearInterval(lossPetTimer);
    let frame=0;
    context.setLossPetFrame(frame);
    if(context.reduceMotion)return;
    lossPetTimer=setInterval(()=>{
      frame=(frame+1)%6;
      context.setLossPetFrame(frame);
    },260);
  }
  function stopSadPet(){clearInterval(lossPetTimer);lossPetTimer=null}
  return { startPetIdle, animatePet, showSadPet, stopSadPet };
}
