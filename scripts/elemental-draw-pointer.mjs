/**
 * Exclusive, temporary pointer capture for a circular area on the Foundry v14
 * canvas. DOM capture runs before PIXI dispatch (including Token handlers), so
 * drawing over a token never selects or drags that token.
 * No listeners are retained after commit, cancellation or canvas teardown.
 */
export function canvasPointerPosition(event,{view,renderer,stage}){
  if(!view||!stage||!Number.isFinite(Number(event?.clientX))||!Number.isFinite(Number(event?.clientY)))return null;
  const rect=view.getBoundingClientRect?.();
  if(!rect||!rect.width||!rect.height)return null;
  const global={x:0,y:0};
  if(typeof renderer?.events?.mapPositionToPoint==='function'){
    renderer.events.mapPositionToPoint(global,event.clientX,event.clientY);
  }else{
    const screen=renderer?.screen;
    global.x=(event.clientX-rect.left)*Number(screen?.width??rect.width)/rect.width;
    global.y=(event.clientY-rect.top)*Number(screen?.height??rect.height)/rect.height;
  }
  const local=stage.toLocal?.(global)??global;
  return Number.isFinite(local?.x)&&Number.isFinite(local?.y)?{x:local.x,y:local.y}:null;
}
export function captureCanvasCircle({view,renderer,stage,doc,win,hooks,onStart,onMove,onFinish,onCancel}){
  if(!view||!doc?.addEventListener||!win?.addEventListener)throw new Error('Canvas não disponível para desenho.');
  let disposed=false,dragging=false,pointerId=null;
  const pos=e=>canvasPointerPosition(e,{view,renderer,stage});
  const stop=e=>{e.preventDefault?.();e.stopImmediatePropagation?.();};
  const onCanvas=e=>e.target===view||!!e.composedPath?.().includes(view)||!!view.contains?.(e.target);
  const cleanup=()=>{
    if(disposed)return;
    disposed=true;
    for(const [kind,handler] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel],['contextmenu',contextMenu]])
      doc.removeEventListener(kind,handler,true);
    win.removeEventListener('keydown',key,true);
    win.removeEventListener('blur',cancel);
    if(hooks&&teardownId!=null)hooks.off('canvasTearDown',teardownId);
  };
  const fail=()=>{if(disposed)return;cleanup();onCancel?.();};
  const down=e=>{
    if(disposed||dragging||e.button!==0||!onCanvas(e))return;
    const p=pos(e);
    if(!p)return;
    stop(e);dragging=true;pointerId=e.pointerId;
    onStart?.(p);
  };
  const move=e=>{
    if(!dragging||disposed||e.pointerId!==pointerId)return;
    stop(e);
    const p=pos(e);
    if(p)onMove?.(p);
  };
  const up=e=>{
    if(!dragging||disposed||e.pointerId!==pointerId)return;
    stop(e);
    const p=pos(e);
    cleanup();
    if(p)onFinish?.(p);else onCancel?.();
  };
  const cancel=e=>{
    if(disposed)return;
    if(e?.type==='pointercancel'&&(!dragging||e.pointerId!==pointerId))return;
    if(e?.type==='pointercancel')stop(e);
    fail();
  };
  const contextMenu=e=>{if(!onCanvas(e)&&!dragging)return;stop(e);fail();};
  const key=e=>{if(e.key!=='Escape')return;e.preventDefault?.();fail();};
  let teardownId=null;
  for(const [kind,handler] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel],['contextmenu',contextMenu]])
    doc.addEventListener(kind,handler,true);
  win.addEventListener('keydown',key,true);
  win.addEventListener('blur',cancel);
  if(hooks?.on)teardownId=hooks.on('canvasTearDown',fail);
  return {cancel:fail};
}

/** Two-click segment placement based on the Elemental Barrier v5 macro.
 * Capture-phase DOM listeners prevent token clicks from moving/selecting tokens.
 * First click chooses start, mouse move previews end, second click commits.
 */
export function captureCanvasWall({view,renderer,stage,doc,win,hooks,onStart,onMove,onFinish,onCancel}){
  if(!view||!doc?.addEventListener||!win?.addEventListener)throw new Error('Canvas não disponível para desenhar barreira.');
  let disposed=false,start=null;
  const point=e=>canvasPointerPosition(e,{view,renderer,stage});
  const stop=e=>{e.preventDefault?.();e.stopImmediatePropagation?.();};
  const onCanvas=e=>e.target===view||!!e.composedPath?.().includes(view)||!!view.contains?.(e.target);
  const cleanup=()=>{
    if(disposed)return;disposed=true;
    for(const [kind,handler] of [['pointerdown',down],['pointermove',move],['contextmenu',contextMenu]])
      doc.removeEventListener(kind,handler,true);
    win.removeEventListener('keydown',key,true);win.removeEventListener('blur',cancel);
    if(hooks&&teardownId!=null)hooks.off('canvasTearDown',teardownId);
  };
  const cancel=()=>{if(disposed)return;cleanup();onCancel?.();};
  const down=e=>{
    if(disposed||e.button!==0||!onCanvas(e))return;
    const p=point(e);if(!p)return;stop(e);
    if(!start){start=p;onStart?.(p);return;}
    // Invalid end points do not end placement: user can choose another.
    if(onFinish?.(start,p)===false)return;
    cleanup();
  };
  const move=e=>{
    if(disposed||!start||!onCanvas(e))return;
    const p=point(e);if(p)onMove?.(start,p);
  };
  const contextMenu=e=>{if(!onCanvas(e))return;stop(e);cancel();};
  const key=e=>{if(e.key==='Escape'){e.preventDefault?.();cancel();}};
  let teardownId=null;
  for(const [kind,handler] of [['pointerdown',down],['pointermove',move],['contextmenu',contextMenu]])
    doc.addEventListener(kind,handler,true);
  win.addEventListener('keydown',key,true);win.addEventListener('blur',cancel);
  if(hooks?.on)teardownId=hooks.on('canvasTearDown',cancel);
  return {cancel};
}
