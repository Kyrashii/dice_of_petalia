// @ts-nocheck

export function createPetSheetLoader(context) {
  function loadPetSheet(){
    const cssValue=getComputedStyle(document.documentElement).getPropertyValue("--pet-sheet").trim();
    const match=cssValue.match(/^url\((['"]?)(.*)\1\)$/);
    const source=match?match[2]:cssValue;
    context.petImage=new Image();
    context.petImage.onload=()=>{
      context.petImageReady=true;
      context.setPetFrame(context.lastPetState,context.lastPetFrame);
    };
    context.petImage.onerror=()=>context.toast("Lady Luma's sprite sheet could not be loaded.");
    context.petImage.src=source;
  }
  return { loadPetSheet };
}
