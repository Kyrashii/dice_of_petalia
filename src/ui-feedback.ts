// @ts-nocheck

export function createUiFeedback(context) {
  function showModal(html){const modal=context.query("#modal");modal.classList.remove("loss-modal");modal.innerHTML=html;context.query("#overlay").classList.add("show")}
  function closeModal(){context.stopSadPet?.();const modal=context.query("#modal");modal.classList.remove("loss-modal");context.query("#overlay").classList.remove("show");delete modal.dataset.view}
  function toast(msg){const t=context.query("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove("show"),1500)}
  function wait(ms){return new Promise(r=>setTimeout(r,ms))}
  function flashCharms(list){
    list.forEach(ch=>{const i=context.state.charms.indexOf(ch);const el=document.querySelector(`[data-charm="${i}"]`);if(el){el.classList.remove("active");void el.offsetWidth;el.classList.add("active")}});
  }
  return { showModal, closeModal, toast, wait, flashCharms };
}
