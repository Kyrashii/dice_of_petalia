// @ts-nocheck

// The last two poses in ladyluma_sad_keyed.png are separated at x=1766,
// rather than the regular 362px grid line. Keeping the fifth crop open to
// x=1810 includes the left edge of the sixth pose.
const sadFrameCrops = [
  { x: 0, width: 362 },
  { x: 362, width: 362 },
  { x: 724, width: 362 },
  { x: 1086, width: 362 },
  { x: 1448, width: 318 },
  { x: 1766, width: 406 },
];

export function createPetSpriteRenderer(context) {
  function drawPetFrame(canvas,petState,frame){
    const isSad=petState==="sad";
    const image=isSad?context.sadPetImage:context.petImage;
    const imageReady=isSad?context.sadPetImageReady:context.petImageReady;
    const rows=isSad?1:3;
    const row=isSad?0:context.petRows[petState];
    canvas.dataset.petState=petState;
    canvas.dataset.petFrame=String(frame);
    if(!imageReady)return;
    const drawingContext=canvas.getContext("2d");
    const sadCrop=isSad?sadFrameCrops[frame%sadFrameCrops.length]:null;
    const sourceX=sadCrop?sadCrop.x:frame*(image.naturalWidth/4);
    const sourceWidth=sadCrop?sadCrop.width:image.naturalWidth/4;
    const sourceHeight=image.naturalHeight/rows;
    const scale=Math.min(canvas.width/sourceWidth,canvas.height/sourceHeight);
    const width=sourceWidth*scale,height=sourceHeight*scale;
    drawingContext.clearRect(0,0,canvas.width,canvas.height);
    drawingContext.drawImage(
      image,
      sourceX,row*sourceHeight,sourceWidth,sourceHeight,
      (canvas.width-width)/2,(canvas.height-height)/2,width,height
    );
  }
  function setPetFrame(petState,frame){
    context.lastPetState=petState;context.lastPetFrame=frame;
    document.querySelectorAll("canvas.pet-sprite").forEach(canvas=>drawPetFrame(canvas,petState,frame));
  }
  function setLossPetFrame(frame){
    context.lastLossPetFrame=frame;
    document.querySelectorAll("canvas.loss-pet-sprite").forEach(canvas=>drawPetFrame(canvas,"sad",frame));
  }
  return { setPetFrame, setLossPetFrame };
}
