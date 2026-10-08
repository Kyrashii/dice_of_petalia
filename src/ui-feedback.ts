// @ts-nocheck

export function createUiFeedback(context) {
  let returnFocus=null;
  function showModal(html){
    const modal=context.query("#modal"),overlay=context.query("#overlay");
    if(!overlay.classList.contains("show"))returnFocus=document.activeElement;
    modal.classList.remove("loss-modal");modal.innerHTML=html;overlay.classList.add("show");
    // Move focus into the dialog so keyboard and screen-reader users land on its choices.
    const target=[".choice","button.upgrade",".primary","button"].map(s=>modal.querySelector?.(s)).find(Boolean);
    target?.focus?.({preventScroll:true});
  }
  function closeModal(){
    context.stopSadPet?.();
    const modal=context.query("#modal");modal.classList.remove("loss-modal");context.query("#overlay").classList.remove("show");delete modal.dataset.view;
    if(returnFocus?.isConnected)returnFocus.focus?.({preventScroll:true});
    returnFocus=null;
  }
  function toast(msg){
    const t=context.query("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(t._timer);
    t._timer=setTimeout(()=>t.classList.remove("show"),Math.min(4500,1600+msg.length*35));
  }
  function wait(ms){return new Promise(r=>setTimeout(r,context.reduceMotion?Math.min(ms,120):ms))}
  function flashCharms(list){
    list.forEach(ch=>{const i=context.state.charms.indexOf(ch);const el=document.querySelector(`[data-charm="${i}"]`);if(el){el.classList.remove("active");void el.offsetWidth;el.classList.add("active")}});
  }
  return { showModal, closeModal, toast, wait, flashCharms };
}
