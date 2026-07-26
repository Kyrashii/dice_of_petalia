// @ts-nocheck

export function createGardenState(context) {
  function defaultGarden(){return {selected:"default",moonDrops:0,packs:Object.fromEntries(context.skinPacks.map(pack=>[pack.id,{progress:{},skipped:false,skippedTask:null}]))}}
  function loadGarden(){
    try{
      const saved=JSON.parse(localStorage.getItem(context.gardenKey)||"null"),fresh=defaultGarden();
      if(!saved)return fresh;
      context.skinPacks.forEach(pack=>{
        const old=saved.packs?.[pack.id]||{};
        fresh.packs[pack.id]={progress:old.progress||{},skipped:!!old.skipped,skippedTask:old.skippedTask||null};
      });
      fresh.moonDrops=Math.max(0,Number(saved.moonDrops)||0);
      fresh.selected=saved.selected==="default"||context.skinPacks.some(pack=>pack.id===saved.selected)?saved.selected:"default";
      return fresh;
    }catch{return defaultGarden()}
  }
  function saveGarden(){localStorage.setItem(context.gardenKey,JSON.stringify(context.garden))}
  function taskDone(pack,task){return (context.garden.packs[pack.id]?.progress?.[task.id]||0)>=task.target}
  function completedTasks(pack){return pack.tasks.filter(task=>taskDone(pack,task)).length}
  function isUnlocked(pack){return completedTasks(pack)>=5}
  function effectUnlocked(pack){return completedTasks(pack)===pack.tasks.length}
  function activeSkin(){const pack=context.skinPacks.find(item=>item.id===context.garden.selected);return pack&&isUnlocked(pack)?pack:null}
  return { defaultGarden, loadGarden, saveGarden, taskDone, completedTasks, isUnlocked, effectUnlocked, activeSkin };
}
