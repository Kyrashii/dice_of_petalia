// @ts-nocheck

export function createGardenProgress(context) {
  function recordGardenEvent(event){
    let changed=false,justUnlocked=[];
    context.skinPacks.forEach(pack=>pack.tasks.forEach(task=>{
      if(context.taskDone(pack,task)||!task.when(event))return;
      const progress=context.garden.packs[pack.id].progress;progress[task.id]=Math.min(task.target,(progress[task.id]||0)+1);changed=true;
      if(context.taskDone(pack,task))justUnlocked.push(`${pack.name}: ${task.label}`);
    }));
    if(!changed)return;context.saveGarden();if(justUnlocked.length)context.toast(`Garden task complete: ${justUnlocked[0]}`);
    if(document.querySelector("#overlay").classList.contains("show")&&document.querySelector("#modal")?.dataset.view==="skins")context.showSkinMenu();
  }
  function grantMoonDropForRun(){if(context.state.level<5||context.state.gardenRewarded)return;context.state.gardenRewarded=true;context.garden.moonDrops++;context.saveGarden();context.toast("Lady Luma saved a Moon Drop for this journey.")}
  return { recordGardenEvent, grantMoonDropForRun };
}
