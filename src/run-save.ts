// @ts-nocheck
import { charmFamilies, variants } from "./game-content";

export function createRunSave(context) {
  function save(){localStorage.setItem(context.saveKey,JSON.stringify(context.state));context.updateContinue()}
  function load(){
    try{
      const raw=JSON.parse(localStorage.getItem(context.saveKey));
      if(!raw||!raw.level)return false;
      context.state=raw;
      context.state.charms=(context.state.charms||[]).map(ch=>hydrateCharm(ch));
      return true;
    }catch{return false}
  }
  function serializeCharm(ch){return {familyIndex:ch.familyIndex,variantIndex:ch.variantIndex,rank:ch.rank}}
  function hydrateCharm(raw){
    const fi=raw.familyIndex??0,vi=raw.variantIndex??0;
    return {family:charmFamilies[fi],variant:variants[vi],familyIndex:fi,variantIndex:vi,rank:raw.rank||1};
  }
  function persistSafe(){const copy={...context.state,charms:context.state.charms.map(serializeCharm)};localStorage.setItem(context.saveKey,JSON.stringify(copy));context.updateContinue()}
  return { save, load, persistSafe };
}
