// @ts-nocheck

export function createSkinPresentation(context) {
  function pips(n){const map={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};return map[n].map(i=>`<i class="pip p${i}"></i>`).join("")}
  function prepareSkinSheets(){context.skinFaceLoader.prepare()}
  function skinFace(packId,value,preview=false){
    if(packId==="default")return `<span class="preview-pips preview-${value}" aria-hidden="true">${pips(value)}</span>`;
    const source=context.skinFaceLoader.face(packId,value);
    return source?`<img class="skin-face${preview?" preview-face":""}" src="${source}" alt="" aria-hidden="true">`:`<span class="skin-loading" aria-hidden="true"></span>`;
  }
  return { pips, prepareSkinSheets, skinFace };
}
