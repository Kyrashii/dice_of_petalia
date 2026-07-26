// @ts-nocheck

export function createPetSpriteRenderer(context) {
  function setPetFrame(petState,frame){
    context.lastPetState=petState;context.lastPetFrame=frame;
    document.querySelectorAll("canvas.pet-sprite").forEach(canvas=>{
      canvas.dataset.petState=petState;
      canvas.dataset.petFrame=String(frame);
      if(!context.petImageReady)return;
      const drawingContext=canvas.getContext("2d");
      const sourceWidth=context.petImage.naturalWidth/4,sourceHeight=context.petImage.naturalHeight/3;
      drawingContext.clearRect(0,0,canvas.width,canvas.height);
      drawingContext.drawImage(
        context.petImage,
        frame*sourceWidth,context.petRows[petState]*sourceHeight,sourceWidth,sourceHeight,
        0,0,canvas.width,canvas.height
      );
    });
  }
  return { setPetFrame };
}
