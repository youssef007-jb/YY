
window.__hbiboInit = function (opts) {
  const __opts = opts || {};
  const canvas = document.getElementById("board");
  if (!canvas) return;
  if (window.__hbiboAc) { try { window.__hbiboAc.abort(); } catch (e) {} }
  window.__hbiboAc = new AbortController();
  const __hbSig = { signal: window.__hbiboAc.signal };

  const __origAdd = EventTarget.prototype.addEventListener;
  function __add(type, fn, opts) {
    if (opts && typeof opts === "object") {
      if (!opts.signal) opts = Object.assign({ signal: window.__hbiboAc.signal }, opts);
    } else if (opts === undefined || opts === false || opts === true) {
      opts = { capture: !!opts, signal: window.__hbiboAc.signal };
    }
    return __origAdd.call(this, type, fn, opts);
  }
  EventTarget.prototype.addEventListener = __add;
function lucideCreateIcons(opts){
  try { if (window.lucide && typeof lucide.createIcons === "function") lucide.createIcons(opts); } catch (e) {}
}

lucideCreateIcons();
const ctx=canvas.getContext("2d"),container=document.getElementById("canvas-container"),eraserCursor=document.getElementById("eraser-cursor"),laserCursor=document.getElementById("laser-cursor"),drawCursor=document.getElementById("draw-cursor");
if(!ctx||!container){ EventTarget.prototype.addEventListener = __origAdd; return; }

const THEME_COLORS=[
  {name:"Dark Slate",hex:"#232528"},
  {name:"Slate Grey",hex:"#4A5568"},
  {name:"Cool Grey",hex:"#94A3B8"},
  {name:"Pure White",hex:"#FFFFFF"},
  {name:"Rose Red",hex:"#E11D48"},
  {name:"Rose Pink",hex:"#EC4899"},
  {name:"Orange",hex:"#F97316"},
  {name:"Amber Gold",hex:"#F59E0B"},
  {name:"Sunshine Yellow",hex:"#EAB308"},
  {name:"Emerald Green",hex:"#10B981"},
  {name:"Forest Green",hex:"#16A34A"},
  {name:"Aqua Cyan",hex:"#06B6D4"},
  {name:"Sky Blue",hex:"#0284C7"},
  {name:"Royal Blue",hex:"#2563EB"},
  {name:"Deep Purple",hex:"#5C2D91"}
];
const PALETTE5=THEME_COLORS.map(c=>c.hex);
const PALETTE15=THEME_COLORS.map(c=>c.hex);
const TEXT8=PALETTE15;
const TEXT_FONTS=[
  {id:"Segoe UI,Inter,system-ui,sans-serif",label:"Segoe UI"},
  {id:"Inter,system-ui,sans-serif",label:"Inter"},
  {id:"Arial,Helvetica,sans-serif",label:"Arial"},
  {id:"Space Grotesk,sans-serif",label:"Space Grotesk"},
  {id:"Montserrat,sans-serif",label:"Montserrat"},
  {id:"Quicksand,sans-serif",label:"Quicksand"},
  {id:"Georgia,serif",label:"Georgia"},
  {id:"Playfair Display,serif",label:"Playfair Display"},
  {id:"Times New Roman,Times,serif",label:"Times New Roman"},
  {id:"Fira Code,monospace",label:"Fira Code"},
  {id:"Courier New,Courier,monospace",label:"Courier New"},
  {id:"Caveat,cursive",label:"Caveat"},
  {id:"Pacifico,cursive",label:"Pacifico"},
  {id:"Dancing Script,cursive",label:"Dancing Script"},
  {id:"Indie Flower,cursive",label:"Indie Flower"},
  {id:"Lobster,cursive",label:"Lobster"}
];
const TEXT_SIZES=[12,14,16,18,24,32,48,64,86,101,121,160];
const STICKY_COLORS=["#fef08a","#fed7aa","#fecaca","#bbf7d0","#bfdbfe","#e9d5ff","#fbcfe8","#99f6e4","#fde68a","#cbd5e1","#fed7e2","#ffffff"];
const DEFAULT_TEXT_COLOR="#000000";
const BLACK_BG="#111827";
const BG6=[
  "#ffffff",
  "#fafafa",
  "#f8fafc",
  "#f1f5f9",
  "#eff6ff",
  "#f0fdf4",
  "#fefce8",
  "#fdf2f8",
  "#f5f3ff",
  "#e2e8f0",
  "#1e293b",
  "#111827"
];
const PEN_STYLES=[
  {id:0,name:"Fine Tip",icon:"minus"},
  {id:1,name:"Fountain",icon:"pen-tool"},
  {id:2,name:"Neon",icon:"sparkles"},
  {id:3,name:"Dashed",icon:"slash"}
];
const VANISH_MODES=[
  {id:"comet",label:"Glowing Comet Trail"},
  {id:"ember",label:"Burning Ember"},
  {id:"ink",label:"Ink Evaporation"}
];
const POPOVER_ANCHORS={
  "pen-popover":"pen-btn",
  "highlighter-popover":"highlighter-btn",
  "eraser-popover":"eraser-btn",
  "vanishing-popover":"vanishing-btn",
  "shapes-popover":"shapes-menu-btn",
  "sticky-popover":"add-sticky-btn",
  "emoji-popover":"emoji-menu-btn",
  "settings-popover":"settings-menu-btn"
};
const BOX_TYPES=["rect","roundRect","circle","ellipse","image","text","emoji","sticky","triangle","diamond","star","hexagon","heart","ruler","protractor","axes","timer"];
const LINE_TYPES=["line","arrow","doubleArrow","dashed"];
const STROKE_TYPES=["pen","highlighter","vanishing"];
const GEOMETRIC_SHAPES=["line","arrow","doubleArrow","dashed","rect","roundRect","circle","ellipse","triangle","diamond","star","hexagon","heart","compass"];

function isGeometricShape(el){
  if(!el) return false;
  return GEOMETRIC_SHAPES.includes(el.type) || LINE_TYPES.includes(el.type) || ["rect","roundRect","circle","ellipse","triangle","diamond","star","hexagon","heart"].includes(el.type);
}

function toggleShapeBold(el){
  if(!el || !isGeometricShape(el)) return;
  if(el.isBoldShape){
    el.width = el.baseWidth || Math.max(1, Math.round((el.width || 2) / 3));
    el.isBoldShape = false;
  } else {
    el.baseWidth = el.width || 2;
    el.width = el.baseWidth * 3;
    el.isBoldShape = true;
  }
}

const state={
  tool:"select",color:"#1E1E1E",width:7,penStyle:0,highlighterStyle:0,vanishMode:"comet",eraserMode:"whole",gridSpacing:24,bgColor:"#ffffff",theme:"classlight",stickyAutoEdit:true,
  toolColors:{pen:"#1E1E1E",highlighter:"#FF6B00",vanishing:"#E52B50",shape:"#1E1E1E"},
  widths:{pen:7,highlighter:15,eraser:5,vanishing:4,rect:3,circle:3,line:2,arrow:2,triangle:3,diamond:3,star:3,hexagon:3,heart:3,dashed:2,roundRect:3,ellipse:3,doubleArrow:2},
  camera:{x:0,y:0,zoom:1},elements:[],undoStack:[],redoStack:[],currentElement:null,
  selectedIds:[],selectedId:null,transform:{mode:null,handle:null,startMouse:{},startEl:null,startBounds:null,center:{}},
  clicks:0,isTransforming:false,isDrawing:false,isPanning:false,panStart:{x:0,y:0},prevTool:null,tempPan:false,panDidMove:false,panButton:0,
  inlineEditingId:null,rightClickPos:{},pendingPlace:null,editArmed:null,hoveredId:null,spotlight:false,spotlightShape:"circle",spotlightDarkness:0.65,spotlightSize:220,alignmentGuides:[],wipeConfirm:null,
  lastMouse:{x:innerWidth/2,y:innerHeight/2,wx:0,wy:0},toolbarPos:"bottom",
  eraseTouched:false,eraseDidPush:false,hasMouseMoved:false,fireParticles:[],internalClipboard:null,
  whiteboards:[],currentBoardId:null,saveTimeout:null,swipe:{active:false,startY:0},_miniWorld:null,
  isHydrated:false,titleUserEdited:false
};
const ONE_SHOT_TOOLS=["text","rect","roundRect","circle","ellipse","triangle","diamond","star","hexagon","heart","compass"];
const PERSISTENT_TOOLS=["pen","highlighter","vanishing","eraser","hand","line","arrow","doubleArrow","dashed"];

function genId(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function roundRectPath(x,y,w,h,r){
  if(typeof ctx.roundRect==="function"){ctx.beginPath();ctx.roundRect(x,y,w,h,r);return;}
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}
function getReadableSize(){const z=clamp(state.camera.zoom,0.15,4);const world=18 / z;return clamp(world,10,72)}
function serializeElements(){return state.elements.map(e=>{const {img,_handles,_fadeInterval,fireStarted,opacity,_fresh,...r}=e;if(r.type==="vanishing")return {...r,opacity:1};return {...r};})}
function ensureImageLoaded(el){if(el.type==="image"&&el.src){if(!el.img||el.img.src!==el.src){const img=new Image();img.onload=()=>{render();};img.src=el.src;el.img=img;}}}

const Store=window.HbiboStore;
function currentBoardRecord(){
  return state.whiteboards.find(b=>b.id===state.currentBoardId)||null;
}

function applyBoardRecord(cur){
  if(Store && Store.normalizeBoard) Store.normalizeBoard(cur);
  state.currentBoardId=cur.id;
  let rawEls = Array.isArray(cur.elements) ? cur.elements : [];
  if(rawEls.length === 0 && Array.isArray(cur.layers) && cur.layers.length > 0 && Array.isArray(cur.layers[0].elements)){
    rawEls = cur.layers[0].elements;
  }
  state.elements = rawEls;
  state.elements.forEach(el=>{
    if(el.type==="image"&&el.src){
      const img=new Image();
      img.onload=render;
      img.src=el.src;
      el.img=img;
    }
    if(!el.id) el.id=genId();
    if(el.rotation==null) el.rotation=0;
    if(el.opacity==null) el.opacity=1;
  });

  const isNewConverted = cur.needsFitToScreen === true || cur.fitToScreenOnOpen === true;
  if(isNewConverted && state.elements.length > 0){
    fitToScreen(false);
    cur.needsFitToScreen = false;
    cur.fitToScreenOnOpen = false;
    cur.camera = { ...state.camera };
    if(Store && Store.putBoard) Store.putBoard(cur).catch(e=>console.warn(e));
  } else if(cur.camera && typeof cur.camera.zoom === "number" && typeof cur.camera.x === "number" && typeof cur.camera.y === "number"){
    state.camera = { zoom: cur.camera.zoom || 1, x: cur.camera.x, y: cur.camera.y };
  } else if(state.elements.length > 0){
    fitToScreen(false);
  } else {
    state.camera = { zoom: 1, x: innerWidth / 2, y: innerHeight / 2 };
  }
  state.fireParticles=[];
  const titleEl=document.getElementById("board-title");
  const validName = (cur.name && typeof cur.name === "string" && cur.name.trim()) ? cur.name.trim() : (cur.name || "Untitled Whiteboard");
  cur.name = validName;
  if(titleEl) titleEl.value = validName;
  state.gridSpacing=cur.gridSpacing||24;
  state.bgColor=cur.bgColor||"#ffffff";
  state.theme=cur.theme==="blueprint"?"blueprint":"classlight";
  state.toolbarPos=cur.toolbarPos||"bottom";
  state.stickyAutoEdit=cur.stickyAutoEdit!==false;
  state.toolColors.shape=cur.shapeColor||"#1E1E1E";
  state.toolColors.pen=cur.penColor||"#1E1E1E";
  state.toolColors.highlighter=cur.highlighterColor||"#FF6B00";
  state.toolColors.vanishing=cur.vanishingColor||"#E52B50";
  applyTheme(state.theme); applyToolbarPos(state.toolbarPos); applyGridStyle(cur.gridStyle||"bg-white"); applyBgColor(state.bgColor);
  const gs=document.getElementById("grid-spacing"); if(gs) gs.value=state.gridSpacing;
  const gsv=document.getElementById("grid-spacing-val"); if(gsv) gsv.innerText=state.gridSpacing+"px";
  const sae=document.getElementById("sticky-auto-edit"); if(sae) sae.checked=!!state.stickyAutoEdit;
  state.selectedId=null; state.selectedIds=[];
  updateGrid(); render();
}
async function loadBoards(){
  state.isHydrated = false;
  state.titleUserEdited = false;
  let routedBoard = __opts.board || null;
  try{
    if(Store){ await Store.migrateLegacy(); state.whiteboards=await Store.listBoards(); }
  }catch(e){ console.warn("Board storage unavailable",e); state.whiteboards=[]; }
  
  let target = null;
  const targetId = __opts.boardId || (routedBoard && routedBoard.id);
  if(targetId){
    target = state.whiteboards.find(b=>b.id === targetId);
  }
  if(!target && routedBoard){
    target = routedBoard;
    state.whiteboards.unshift(target);
  }
  if(target && routedBoard && target.id === routedBoard.id){
    if(routedBoard.name && typeof routedBoard.name === "string" && routedBoard.name.trim()){
      target.name = routedBoard.name.trim();
    }
    if(routedBoard.phase !== undefined) target.phase = routedBoard.phase;
    if(routedBoard.week !== undefined) target.week = routedBoard.week;
    if(routedBoard.phase_category !== undefined) target.phase_category = routedBoard.phase_category;
    if(routedBoard.week_category !== undefined) target.week_category = routedBoard.week_category;
    if(routedBoard.elements && Array.isArray(routedBoard.elements) && routedBoard.elements.length > 0 && (!target.elements || target.elements.length === 0)){
      target.elements = routedBoard.elements;
    }
  }
  if(!target) target=state.whiteboards[0];
  if(!target){
    target=Store?Store.blankBoard("My Whiteboard"):{id:genId(),name:"My Whiteboard",createdAt:Date.now(),updatedAt:Date.now(),elements:[],camera:{x:0,y:0,zoom:1},gridStyle:"bg-white",gridSpacing:24,bgColor:"#ffffff",theme:"classlight",toolbarPos:"bottom",stickyAutoEdit:false,thumb:null};
    state.whiteboards.unshift(target);
    if(Store) Store.putBoard(target).catch(e=>console.warn(e));
  }
  state.currentBoardId=target.id;
  syncBoardUrl(target.id);
  applyBoardRecord(target);
  state.isHydrated = true;
}
function syncBoardUrl(id){
  try{ const want="/board/"+id; if(location.pathname!==want) history.replaceState(null,"",want); }catch(e){}
}
function syncCurrentRecord(){
  const b=currentBoardRecord(); if(!b) return null;
  const serialized=serializeElements();
  b.elements=serialized;
  delete b.layers;
  delete b.activeLayerId;
  b.camera={...state.camera};
  b.updatedAt=Date.now();
  const t=document.getElementById("board-title");
  if(t && state.titleUserEdited){
    const v=t.value.trim();
    if(v && v!==b.name){
      b.name=v;
    }
    if(Store && Store.extractPhaseAndWeekCategories){
      const cats=Store.extractPhaseAndWeekCategories(b.name);
      if(cats.phase_category!==null){ b.phase=cats.phase; b.phase_category=cats.phase_category; }
      else { delete b.phase; b.phase_category=null; }
      if(cats.week_category!==null){ b.week=cats.week; b.week_category=cats.week_category; }
      else { delete b.week; b.week_category=null; }
    }
  }
  b.gridStyle=container.classList.contains("dot-grid")?"dot-grid":container.classList.contains("line-grid")?"line-grid":"bg-white";
  b.gridSpacing=state.gridSpacing;
  b.bgColor=state.bgColor;
  b.theme=state.theme==="blueprint"?"blueprint":"classlight";
  b.toolbarPos=state.toolbarPos;
  b.stickyAutoEdit=state.stickyAutoEdit;
  b.shapeColor=state.toolColors.shape||"#1E1E1E";
  b.penColor=state.toolColors.pen||"#1E1E1E";
  b.highlighterColor=state.toolColors.highlighter||"#FF6B00";
  b.vanishingColor=state.toolColors.vanishing||"#E52B50";
  return b;
}
function persistBoard(b){
  if(!b||!Store) return;
  try{ Store.putBoard(JSON.parse(JSON.stringify(b))).catch(e=>console.warn("Save failed",e)); }
  catch(e){ console.warn("Save failed",e); }
}
let _thumbTimer=null;
function scheduleThumb(){
  clearTimeout(_thumbTimer);
  _thumbTimer=setTimeout(()=>{
    const b=currentBoardRecord(); if(!b) return;
    try{ b.thumb=makeThumbnail(); }catch(e){ /* ignore */ }
    persistBoard(b);
  },1600);
}
function makeThumbnail(){
  const W=320,H=200;
  const c=document.createElement("canvas"); c.width=W; c.height=H;
  const g=c.getContext("2d");
  if(!g) return "";
  g.fillStyle=state.bgColor||"#ffffff"; g.fillRect(0,0,W,H);
  const els=state.elements;
  if(!els || !els.length) return c.toDataURL("image/jpeg",0.85);
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  els.forEach(el=>{
    const b=getBounds(el);
    minX=Math.min(minX,b.x);minY=Math.min(minY,b.y);
    maxX=Math.max(maxX,b.x+b.w);maxY=Math.max(maxY,b.y+b.h);
  });
  if(!isFinite(minX) || !isFinite(minY)){
    minX=0;minY=0;maxX=800;maxY=500;
  }
  const pad=36; minX-=pad;minY-=pad;maxX+=pad;maxY+=pad;
  const ww=Math.max(1,maxX-minX), hh=Math.max(1,maxY-minY);
  const scale=Math.min(W/ww,H/hh);
  g.translate((W-ww*scale)/2,(H-hh*scale)/2);
  g.scale(scale,scale);
  g.translate(-minX,-minY);
  els.forEach(el=>{
    const b=getBounds(el);
    g.save();
    if(el.rotation){
      const cx=b.x+b.w/2, cy=b.y+b.h/2;
      g.translate(cx,cy);
      g.rotate(el.rotation*Math.PI/180);
      g.translate(-cx,-cy);
    }
    if(STROKE_TYPES.includes(el.type)&&el.points&&el.points.length>1){
      g.beginPath(); el.points.forEach((pt,i)=>{i?g.lineTo(pt.x,pt.y):g.moveTo(pt.x,pt.y)});
      g.strokeStyle=el.color||"#1E1E1E"; g.lineWidth=Math.max(1,el.width||3); g.lineCap="round"; g.lineJoin="round";
      g.globalAlpha=el.type==="highlighter"?0.4:1; g.stroke(); g.globalAlpha=1;
    } else if(el.type==="sticky"){
      g.fillStyle=el.bg||"#fef08a"; g.fillRect(b.x,b.y,b.w,b.h);
      if(el.text){
        g.fillStyle=el.color||"#422006";
        g.font=`${el.size||16}px Segoe UI,Inter,sans-serif`;
        g.textBaseline="top";
        String(el.text).split("\n").slice(0,4).forEach((line,li)=>{
          g.fillText(line.slice(0,30), b.x+8, b.y+8+li*(el.size||16)*1.2);
        });
      }
    } else if(el.type==="text"){
      g.fillStyle=el.color||"#111827"; g.font=textFont(el); g.textBaseline="top";
      String(el.text||"").split("\n").forEach((l,i)=>g.fillText(l,el.x,el.y+i*((el.size||18)*1.25)));
    } else if(el.type==="emoji"){
      g.font=`${el.w||32}px sans-serif`; g.textBaseline="top"; g.fillText(el.text||"",el.x,el.y);
    } else if(el.type==="image"){
      const img=el.img||(typeof _imageCache!=="undefined"&&_imageCache[el.src]);
      if(img && (img.complete || img.naturalWidth > 0)){
        try{ g.drawImage(img,el.x,el.y,el.w,el.h); }catch(e){}
      } else {
        g.fillStyle="rgba(241,245,249,0.95)";
        g.fillRect(el.x,el.y,el.w,el.h);
        g.strokeStyle="#cbd5e1";
        g.lineWidth=1.5;
        g.strokeRect(el.x,el.y,el.w,el.h);
        g.fillStyle="#64748b";
        g.font="14px sans-serif";
        g.textAlign="center";
        g.textBaseline="middle";
        g.fillText("🖼️", el.x+el.w/2, el.y+el.h/2);
      }
    } else if(el.type==="circle"||el.type==="ellipse"){
      g.beginPath();
      g.ellipse(b.x+b.w/2, b.y+b.h/2, Math.abs(b.w/2), Math.abs(b.h/2), 0, 0, Math.PI*2);
      g.strokeStyle=el.color||"#0055FF"; g.lineWidth=Math.max(1,el.width||2);
      g.stroke();
    } else if(el.type==="rect"){
      g.strokeStyle=el.color||"#0055FF"; g.lineWidth=Math.max(1,el.width||2);
      g.strokeRect(b.x,b.y,b.w,b.h);
    } else if(el.type==="roundRect"){
      const r = Math.min(12, Math.abs(b.w)/4, Math.abs(b.h)/4);
      g.strokeStyle=el.color||"#0055FF"; g.lineWidth=Math.max(1,el.width||2);
      if(typeof g.roundRect==="function"){
        g.beginPath(); g.roundRect(b.x,b.y,b.w,b.h,r); g.stroke();
      } else {
        g.strokeRect(b.x,b.y,b.w,b.h);
      }
    } else if(el.type==="triangle"){
      g.beginPath();
      g.moveTo(b.x+b.w/2, b.y);
      g.lineTo(b.x, b.y+b.h);
      g.lineTo(b.x+b.w, b.y+b.h);
      g.closePath();
      g.strokeStyle=el.color||"#0055FF"; g.lineWidth=Math.max(1,el.width||2);
      g.stroke();
    } else if(el.type==="diamond"){
      g.beginPath();
      g.moveTo(b.x+b.w/2, b.y);
      g.lineTo(b.x+b.w, b.y+b.h/2);
      g.lineTo(b.x+b.w/2, b.y+b.h);
      g.lineTo(b.x, b.y+b.h/2);
      g.closePath();
      g.strokeStyle=el.color||"#0055FF"; g.lineWidth=Math.max(1,el.width||2);
      g.stroke();
    } else if(el.type==="star"){
      const scx=b.x+b.w/2, scy=b.y+b.h/2;
      const outerR=Math.min(Math.abs(b.w),Math.abs(b.h))/2, innerR=outerR*0.45;
      g.beginPath();
      for(let i=0;i<10;i++){
        const r=i%2===0?outerR:innerR;
        const a=(Math.PI/5)*i-Math.PI/2;
        g.lineTo(scx+Math.cos(a)*r, scy+Math.sin(a)*r);
      }
      g.closePath();
      g.strokeStyle=el.color||"#0055FF"; g.lineWidth=Math.max(1,el.width||2);
      g.stroke();
    } else if(el.type==="line"||el.type==="arrow"||el.type==="doubleArrow"||el.type==="dashed"){
      g.beginPath();
      g.moveTo(el.x, el.y);
      g.lineTo(el.x+el.w, el.y+el.h);
      g.strokeStyle=el.color||"#0055FF"; g.lineWidth=Math.max(1,el.width||2);
      if(el.type==="dashed") g.setLineDash([6,6]);
      g.stroke();
    } else {
      g.strokeStyle=el.color||"#0055FF"; g.lineWidth=Math.max(1,el.width||2);
      g.strokeRect(b.x,b.y,b.w,b.h);
    }
    g.restore();
  });
  return c.toDataURL("image/jpeg",0.85);
}
function saveBoards(immediate){
  if(!state.isHydrated) return;
  const save=()=>{
    const b=syncCurrentRecord();
    if(b){ persistBoard(b); scheduleThumb(); }
  };
  if(immediate) save(); else {clearTimeout(state.saveTimeout); state.saveTimeout=setTimeout(save,400)}
}
function goHome(){
  const b=syncCurrentRecord();
  if(b){
    try{ b.thumb=makeThumbnail(); }catch(e){}
    persistBoard(b);
  }
  setTimeout(()=>{ if(typeof __opts.onHome==="function") __opts.onHome(); else location.href="/"; },40);
}

function clearUndo(){state.undoStack=[];state.redoStack=[];updateUndoRedoUI();}

function showSmartToast(msg, icon="✨", duration=3000){
  const t = document.getElementById("smart-toast");
  const m = document.getElementById("smart-toast-msg");
  const ic = document.getElementById("smart-toast-icon");
  if(!t) return;
  if(m) m.textContent = msg;
  if(ic) ic.textContent = icon;
  t.classList.remove("opacity-0", "-translate-y-2");
  t.classList.add("opacity-100", "translate-y-0");
  clearTimeout(showSmartToast._timer);
  showSmartToast._timer = setTimeout(()=>{
    t.classList.remove("opacity-100", "translate-y-0");
    t.classList.add("opacity-0", "-translate-y-2");
  }, duration);
}

let _crc32Table = null;
function getPngCrcTable(){
  if(_crc32Table) return _crc32Table;
  const t = new Uint32Array(256);
  for(let n=0; n<256; n++){
    let c = n;
    for(let k=0; k<8; k++){
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    t[n] = c >>> 0;
  }
  _crc32Table = t;
  return t;
}

function calcPngCrc32(bytes, offset, length){
  const table = getPngCrcTable();
  let crc = 0xffffffff;
  for(let i=offset; i<offset+length; i++){
    crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function embedSmartPngMetadataFallback(blob, boardData){
  const buf = await blob.arrayBuffer();
  const sourceBytes = new Uint8Array(buf);
  if(sourceBytes.length < 8 || sourceBytes[0] !== 137 || sourceBytes[1] !== 80) return blob;
  const payload = {
    version: 1,
    appName: "Smart Canvas",
    exportedAt: Date.now(),
    name: boardData.name || "Untitled Whiteboard",
    bgColor: boardData.bgColor || "#ffffff",
    theme: boardData.theme || "classlight",
    gridStyle: boardData.gridStyle || "none",
    gridSpacing: boardData.gridSpacing || 24,
    camera: boardData.camera || { x: 0, y: 0, zoom: 1 },
    elements: (boardData.elements || []).map(el => {
      const { img, _handles, _fadeInterval, fireStarted, _fresh, ...clean } = el;
      if(clean.type === "vanishing") return { ...clean, opacity: 1 };
      return clean;
    })
  };
  const jsonStr = JSON.stringify(payload);
  const textPayload = "__HBIBO_SMART_CANVAS_V1__:" + jsonStr;
  const enc = new TextEncoder();
  const keyBytes = enc.encode("SmartCanvas");
  const dataBytes = enc.encode(textPayload);
  const chunkDataLen = keyBytes.length + 1 + dataBytes.length;
  const chunkData = new Uint8Array(chunkDataLen);
  chunkData.set(keyBytes, 0);
  chunkData[keyBytes.length] = 0;
  chunkData.set(dataBytes, keyBytes.length + 1);

  const chunk = new Uint8Array(4 + 4 + chunkDataLen + 4);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, chunkDataLen, false);
  chunk[4] = 116; chunk[5] = 69; chunk[6] = 88; chunk[7] = 116; // 'tEXt'
  chunk.set(chunkData, 8);
  const crc = calcPngCrc32(chunk, 4, 4 + chunkDataLen);
  view.setUint32(8 + chunkDataLen, crc, false);

  let insertOffset = 33;
  if(sourceBytes.length > 16){
    const type = String.fromCharCode(sourceBytes[12], sourceBytes[13], sourceBytes[14], sourceBytes[15]);
    if(type === "IHDR"){
      const ihdrLen = new DataView(sourceBytes.buffer).getUint32(8, false);
      insertOffset = 8 + 4 + 4 + ihdrLen + 4;
    }
  }
  const combined = new Uint8Array(sourceBytes.length + chunk.length);
  combined.set(sourceBytes.subarray(0, insertOffset), 0);
  combined.set(chunk, insertOffset);
  combined.set(sourceBytes.subarray(insertOffset), insertOffset + chunk.length);
  return new Blob([combined], { type: "image/png" });
}

async function extractSmartPngMetadataFallback(file){
  try {
    const arrayBuf = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);
    if(bytes.length < 8 || bytes[0] !== 137 || bytes[1] !== 80) return null;
    const view = new DataView(bytes.buffer);
    const decoder = new TextDecoder("utf-8");
    let offset = 8;
    while(offset + 8 <= bytes.length){
      const length = view.getUint32(offset, false);
      const type = String.fromCharCode(bytes[offset+4], bytes[offset+5], bytes[offset+6], bytes[offset+7]);
      const dataStart = offset + 8;
      const dataEnd = dataStart + length;
      if(dataEnd > bytes.length) break;
      if(type === "tEXt" || type === "iTXt"){
        let nullIdx = -1;
        for(let i = dataStart; i < dataEnd; i++){
          if(bytes[i] === 0){ nullIdx = i; break; }
        }
        if(nullIdx !== -1){
          const text = decoder.decode(bytes.subarray(nullIdx + 1, dataEnd));
          let clean = text.trim();
          if(clean.startsWith("__HBIBO_SMART_CANVAS_V1__:")){
            clean = clean.slice("__HBIBO_SMART_CANVAS_V1__:".length);
          }
          try {
            const parsed = JSON.parse(clean);
            if(parsed && (Array.isArray(parsed.elements) || Array.isArray(parsed))){
              const els = Array.isArray(parsed.elements) ? parsed.elements : (Array.isArray(parsed) ? parsed : []);
              return {
                name: parsed.name || "Imported Whiteboard",
                elements: els,
                bgColor: parsed.bgColor || "#ffffff",
                theme: parsed.theme || "classlight",
                gridStyle: parsed.gridStyle || "none",
                gridSpacing: parsed.gridSpacing || 24,
                camera: parsed.camera || { x: 0, y: 0, zoom: 1 }
              };
            }
          } catch(e){}
        }
      } else if(type === "IEND"){
        break;
      }
      offset = dataEnd + 4;
    }
    // Raw binary fallback scan
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const sig = "__HBIBO_SMART_CANVAS_V1__:";
    const idx = text.indexOf(sig);
    if(idx !== -1){
      const jsonStart = idx + sig.length;
      let depth = 0, jsonEnd = -1;
      for(let i=jsonStart; i<text.length; i++){
        if(text[i] === "{") depth++;
        else if(text[i] === "}"){
          depth--;
          if(depth === 0){ jsonEnd = i + 1; break; }
        }
      }
      if(jsonEnd !== -1){
        const parsed = JSON.parse(text.slice(jsonStart, jsonEnd));
        return {
          name: parsed.name || "Imported Whiteboard",
          elements: parsed.elements || [],
          bgColor: parsed.bgColor || "#ffffff",
          theme: parsed.theme || "classlight",
          gridStyle: parsed.gridStyle || "none",
          gridSpacing: parsed.gridSpacing || 24,
          camera: parsed.camera || { x: 0, y: 0, zoom: 1 }
        };
      }
    }
  } catch(err){
    console.warn("Smart PNG extraction failed", err);
  }
  return null;
}

async function getSmartPngEngine(){
  if(window.SmartPNG && typeof window.SmartPNG.embedSmartPngMetadata === "function"){
    return window.SmartPNG;
  }
  return {
    embedSmartPngMetadata: embedSmartPngMetadataFallback,
    extractSmartPngMetadata: extractSmartPngMetadataFallback
  };
}

function exportAllLayers(){
  const b=currentBoardRecord(); if(!b) return;
  syncCurrentRecord();
  const data=JSON.stringify(b,null,2);
  const blob=new Blob([data],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=(b.name || "whiteboard") + ".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

function exportLayer(id){
  exportAllLayers();
}

async function importBoardsFile(file){
  if(!file) return;
  const isPng = file.type === "image/png" || /\.png$/i.test(file.name||"");
  if(isPng){
    try {
      const engine = await getSmartPngEngine();
      const smartData = await engine.extractSmartPngMetadata(file);
      if(smartData && Array.isArray(smartData.elements) && smartData.elements.length > 0){
        pushUndo();
        const newIds = [];
        smartData.elements.forEach(el => {
          if(!el.id) el.id = genId();
          newIds.push(el.id);
          state.elements.push(el);
          ensureImageLoaded(el);
        });
        if(state.elements.length === smartData.elements.length){
          if(smartData.bgColor) state.bgColor = smartData.bgColor;
          if(smartData.theme) applyTheme(smartData.theme);
        }
        saveBoards(true);
        render();
        showSmartToast(`✨ Smart PNG imported: ${smartData.elements.length} editable elements!`, "✨");
        return;
      }
    } catch(err){
      console.warn("Smart PNG import check failed", err);
    }
  }

  const r=new FileReader();
  r.onload=e=>{
    try{
      const j=JSON.parse(e.target.result);
      const b=currentBoardRecord();
      if(!b) return;
      if(Array.isArray(j)){
        pushUndo();
        j.forEach(el=>{if(!el.id) el.id=genId(); state.elements.push(el); ensureImageLoaded(el);});
        saveBoards(true); render();
        showSmartToast(`Imported ${j.length} elements`, "📄");
      } else if(j.elements && Array.isArray(j.elements)){
        pushUndo();
        j.elements.forEach(el=>{if(!el.id) el.id=genId(); state.elements.push(el); ensureImageLoaded(el);});
        saveBoards(true); render();
        showSmartToast(`Imported ${j.elements.length} elements`, "📄");
      }
    }catch(err){showSmartToast("Invalid whiteboard file", "⚠️");}
  };
  r.readAsText(file);
}

function renderBoardsList(){
  // Layers removed - function kept safe for compatibility
}
function applyTheme(t){
  if(t!=="blueprint") t="classlight";
  state.theme=t;
  document.body.classList.remove("theme-dark","theme-light-glass","toolbar-theme-blueprint","toolbar-theme-classlight","toolbar-theme-nordic","toolbar-theme-synthwave","toolbar-theme-espresso");
  if(t==="blueprint"){
    document.body.classList.add("toolbar-theme-blueprint");
  } else {
    document.body.classList.add("toolbar-theme-classlight");
  }
  document.querySelectorAll(".theme-btn").forEach(b=>{
    const on=b.dataset.theme===t;
    b.classList.toggle("bg-slate-900",on);
    b.classList.toggle("text-white",on);
    b.classList.toggle("bg-slate-100",!on);
  });
  saveBoards();
}
function applyToolbarPos(pos){
  state.toolbarPos=pos;
  const wrap=document.getElementById("main-toolbar-wrapper");
  const toolbar=document.getElementById("main-toolbar");
  wrap.className="absolute z-20 flex items-center gap-2";
  toolbar.className="bg-white/90 border shadow-md flex items-center gap-1.5";
  if(pos==="top"){wrap.classList.add("top-4","left-1/2","-translate-x-1/2","flex-col"); toolbar.classList.add("rounded-full","px-3","py-1.5","flex-row");}
  else if(pos==="bottom"){wrap.classList.add("bottom-4","left-1/2","-translate-x-1/2","flex-col-reverse"); toolbar.classList.add("rounded-full","px-3","py-1.5","flex-row");}
  else if(pos==="left"){wrap.classList.add("left-4","top-1/2","-translate-y-1/2","flex-row","toolbar-side"); toolbar.classList.add("rounded-[1.5rem]","p-2","flex-col","toolbar-vertical");}
  else if(pos==="right"){wrap.classList.add("right-4","top-1/2","-translate-y-1/2","flex-row-reverse","toolbar-side"); toolbar.classList.add("rounded-[1.5rem]","p-2","flex-col","toolbar-vertical");}
  document.querySelectorAll(".pos-btn").forEach(b=>{b.classList.toggle("bg-slate-900",b.dataset.pos===pos); b.classList.toggle("text-white",b.dataset.pos===pos); b.classList.toggle("bg-slate-100",b.dataset.pos!==pos)});
  saveBoards();
}
function normalizeGridStyle(g){
  if(g==="dots" || g==="dot-grid" || g==="grid-dots") return "dot-grid";
  if(g==="lines" || g==="line-grid" || g==="grid-lines") return "line-grid";
  return "bg-white";
}
function syncGridButtons(g){
  const norm=normalizeGridStyle(g);
  const map={"dot-grid":"grid-dots","line-grid":"grid-lines","bg-white":"grid-none"};
  ["grid-dots","grid-lines","grid-none"].forEach(id=>{
    const b=document.getElementById(id); if(!b) return;
    const on=map[norm]===id;
    b.classList.toggle("bg-slate-900",on);
    b.classList.toggle("text-white",on);
    b.classList.toggle("bg-slate-100",!on);
  });
}
function applyGridStyle(g){
  const norm=normalizeGridStyle(g);
  container.classList.remove("dot-grid","line-grid","bg-white");
  container.classList.add("absolute","inset-0");
  if(norm==="bg-white"){
    container.classList.add("bg-white");
    container.style.backgroundImage="none";
  } else {
    container.classList.add(norm);
    container.style.backgroundImage="";
  }
  syncGridButtons(norm);
  updateGrid();
  saveBoards();
}
function isDarkColor(c){
  if(!c||typeof c!=="string") return false;
  const h=c.trim().replace("#","");
  if(h.length!==6&&h.length!==3) return c.toLowerCase()===BLACK_BG;
  const f=h.length===3?h.split("").map(x=>x+x).join(""):h;
  const r=parseInt(f.slice(0,2),16),g=parseInt(f.slice(2,4),16),b=parseInt(f.slice(4,6),16);
  return (0.2126*r+0.7152*g+0.0722*b)/255 < 0.4;
}
function applyBgColor(c){
  state.bgColor=c;
  container.style.backgroundColor=c;
  const sc=document.getElementById("stroke-color");
  const isDarkBg=isDarkColor(c);
  if(isDarkBg){
    if((state.toolColors.pen||"").toUpperCase()==="#1E1E1E"||!state.penColorUserSet){
      state.toolColors.pen="#FFFFFF";
      if(state.tool==="pen"){state.color="#FFFFFF"; if(sc) sc.value="#FFFFFF";}
    }
  } else if((state.toolColors.pen||"").toUpperCase()==="#FFFFFF" && !state.penColorUserSet){
    state.toolColors.pen="#1E1E1E";
    if(state.tool==="pen"){state.color="#1E1E1E"; if(sc) sc.value="#1E1E1E";}
  }
  updateCursor();
  saveBoards();
}
function resizeCanvas(){const dpr=window.devicePixelRatio||1; canvas.width=innerWidth*dpr; canvas.height=innerHeight*dpr; canvas.style.width=innerWidth+"px"; canvas.style.height=innerHeight+"px"; ctx.setTransform(dpr,0,0,dpr,0,0); render();}
addEventListener("resize",resizeCanvas,__hbSig);
function toWorld(x,y){return{x:(x-state.camera.x)/state.camera.zoom,y:(y-state.camera.y)/state.camera.zoom}}
function toScreen(x,y){return{x:x*state.camera.zoom+state.camera.x,y:y*state.camera.zoom+state.camera.y}}
function getViewportCenter(){return toWorld(innerWidth/2,innerHeight/2)}
function rotatePoint(px,py,cx,cy,deg){const rad=deg*Math.PI/180,dx=px-cx,dy=py-cy;return{x:cx+dx*Math.cos(rad)-dy*Math.sin(rad),y:cy+dx*Math.sin(rad)+dy*Math.cos(rad)}}
function updateGrid(){const z=state.camera.zoom,size=Math.max(4,state.gridSpacing*z); container.style.backgroundSize=`${size}px ${size}px`; container.style.backgroundPosition=`${state.camera.x}px ${state.camera.y}px`;}
function updateZoomLabel(){const el=document.getElementById("zoom-label"); if(el) el.innerText=Math.round(state.camera.zoom*100)+"%"; const oc=document.getElementById("object-counter"); if(oc) oc.innerText=`${Math.round(state.camera.zoom*100)}% • ${state.elements.length} • ∞`;}
function zoomAt(factor,sx,sy){const nz=Math.max(0.02,Math.min(20,state.camera.zoom*factor)); const mx=sx??innerWidth/2,my=sy??innerHeight/2,wb=toWorld(mx,my); state.camera.zoom=nz; state.camera.x=mx-wb.x*nz; state.camera.y=my-wb.y*nz; updateGrid(); render(); if(state.selectedId)positionToolbar(); if(inlineBox&&inlineWorldPos) updateInlineEditorTransform(); saveBoards();}

let _glideRaf=null;
function cinematicGlide(target, duration=420){
  if(_glideRaf) cancelAnimationFrame(_glideRaf);
  const startX=state.camera.x, startY=state.camera.y, startZ=state.camera.zoom;
  const startTime=performance.now();
  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
  function step(now){
    const elapsed=now - startTime;
    const progress=Math.min(1, elapsed / duration);
    const ease=easeOutCubic(progress);
    state.camera.x=startX + (target.x - startX)*ease;
    state.camera.y=startY + (target.y - startY)*ease;
    state.camera.zoom=startZ + (target.zoom - startZ)*ease;
    updateGrid();
    render();
    if(state.selectedId) positionToolbar();
    if(inlineBox&&inlineWorldPos) updateInlineEditorTransform();
    if(progress < 1){
      _glideRaf=requestAnimationFrame(step);
    } else {
      _glideRaf=null;
      saveBoards();
    }
  }
  _glideRaf=requestAnimationFrame(step);
}

function fitToScreen(animate=true){
  const els=state.elements;
  const vw = window.innerWidth || document.documentElement.clientWidth || 1024;
  const vh = window.innerHeight || document.documentElement.clientHeight || 768;

  if(!els || els.length===0){
    const centerCam = { x: Math.round(vw/2), y: Math.round(vh/2), zoom: 1 };
    if(animate) cinematicGlide(centerCam);
    else { state.camera = centerCam; updateGrid(); render(); saveBoards(); }
    return;
  }
  let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
  els.forEach(el=>{
    const b=getBounds(el);
    if(isFinite(b.x) && isFinite(b.y) && isFinite(b.w) && isFinite(b.h) && b.w > 0 && b.h > 0){
      minX=Math.min(minX, b.x);
      minY=Math.min(minY, b.y);
      maxX=Math.max(maxX, b.x + b.w);
      maxY=Math.max(maxY, b.y + b.h);
    }
  });

  if(!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)){
    const centerCam = { x: Math.round(vw/2), y: Math.round(vh/2), zoom: 1 };
    if(animate) cinematicGlide(centerCam);
    else { state.camera = centerCam; updateGrid(); render(); saveBoards(); }
    return;
  }

  const contentW=Math.max(10, maxX - minX);
  const contentH=Math.max(10, maxY - minY);
  const padX=Math.max(56, Math.round(vw*0.08));
  const padY=Math.max(56, Math.round(vh*0.08));
  const availW=Math.max(80, vw - padX*2);
  const availH=Math.max(80, vh - padY*2);
  const targetZoom=clamp(Math.min(availW / contentW, availH / contentH), 0.02, 2.5);
  const centerX=(minX + maxX)/2;
  const centerY=(minY + maxY)/2;
  const targetX=Math.round(vw/2 - centerX*targetZoom);
  const targetY=Math.round(vh/2 - centerY*targetZoom);

  if(animate){
    cinematicGlide({x:targetX, y:targetY, zoom:targetZoom});
  } else {
    state.camera.x=targetX;
    state.camera.y=targetY;
    state.camera.zoom=targetZoom;
    updateGrid();
    render();
    saveBoards();
  }
}

addEventListener("wheel",e=>{
  if(e.target.closest && e.target.closest("input,textarea,select,.popover-menu,#boards-modal,#selection-toolbar,#right-click-menu,#inline-text-editor")) return;
  const wp=toWorld(e.clientX,e.clientY);
  const stickyUnder=state.elements.find(el=>el.type==="sticky" && (el.id===state.selectedId || state.selectedIds.includes(el.id)) && wp.x>=el.x && wp.x<=el.x+el.w && wp.y>=el.y && wp.y<=el.y+el.h);
  if(stickyUnder && stickyMaxScroll(stickyUnder)>0){
    e.preventDefault();
    stickyUnder.scroll=clamp((stickyUnder.scroll||0)+e.deltaY*0.7, 0, stickyMaxScroll(stickyUnder));
    render();
    saveBoards();
    return;
  }
  e.preventDefault();
  const f=e.deltaY<0?1.1:0.9,nz=Math.max(0.02,Math.min(20,state.camera.zoom*f)),mx=e.clientX,my=e.clientY,wb=toWorld(mx,my);
  state.camera.zoom=nz;state.camera.x=mx-wb.x*nz;state.camera.y=my-wb.y*nz;
  updateGrid();render();if(state.selectedId)positionToolbar();
  if(inlineBox&&inlineWorldPos) updateInlineEditorTransform();
  saveBoards();
},{passive:false, signal: window.__hbiboAc.signal});

function isPointerOverUI(clientX, clientY, target){
  const el = target || (clientX != null && clientY != null ? document.elementFromPoint(clientX, clientY) : null);
  if(!el || el === canvas || el === container || el === document.body || el === document.documentElement) return false;
  return !!el.closest?.(
    "#main-toolbar-wrapper, #main-toolbar, #selection-toolbar, .popover-menu, #boards-modal, #right-click-menu, #zoom-controls, #minimap-container, .sticky-color-rail, #clear-overlay, [class*='top-4'], [class*='bottom-4'], [class*='right-4'], [class*='left-4'], #inline-text-editor, .inline-text-host, button, input, select, label, .teach-btn, .tool-btn"
  );
}

function updateCursor(targetEl){
  const overUI = isPointerOverUI(state.lastMouse.x, state.lastMouse.y, targetEl);
  const place=document.getElementById("place-cursor");
  if(place){
    if(!overUI && state.pendingPlace){
      place.style.display="block";
      place.style.left=state.lastMouse.x+"px";
      place.style.top=state.lastMouse.y+"px";
      place.style.color="#000000";
      place.style.textShadow="0 0 2px #fff, 0 0 4px #fff";
      if(state.pendingPlace.type==="emoji"){
        place.textContent=state.pendingPlace.text||"⭐";
        place.style.transform="translate(-50%,-50%)";
        place.style.fontSize="31px";
      } else if(state.pendingPlace.type==="sticky"){
        place.textContent="📝";
        place.style.transform="translate(-10%,-90%)";
        place.style.fontSize="28px";
      } else {
        const icons={ruler:"📏",protractor:"📐",axes:"➕",timer:"⏱️"};
        place.textContent=icons[state.pendingPlace.type]||"+";
        place.style.transform="translate(-50%,-50%)";
        place.style.fontSize="28px";
      }
    } else place.style.display="none";
  }
  if(laserCursor){
    if(!overUI && state.tool==="vanishing" && !state.pendingPlace){
      laserCursor.style.display="block";
      laserCursor.style.left=state.lastMouse.x+"px";
      laserCursor.style.top=state.lastMouse.y+"px";
      const col=state.toolColors.vanishing||"#E52B50";
      const lw=Math.max(8, Math.min(28, (state.widths.pen||12)*state.camera.zoom*1.15));
      laserCursor.style.width=lw+"px";
      laserCursor.style.height=lw+"px";
      laserCursor.style.borderColor="#fff";
      laserCursor.style.background=col;
      laserCursor.style.boxShadow=`0 0 0 1px rgba(15,23,42,.28), 0 0 10px ${col}`;
    } else laserCursor.style.display="none";
  }
  if(drawCursor){
    const drawing=state.tool==="pen"||state.tool==="highlighter";
    if(!overUI && drawing && !state.pendingPlace){
      drawCursor.style.display="block";
      drawCursor.style.left=state.lastMouse.x+"px";
      drawCursor.style.top=state.lastMouse.y+"px";
      const col=state.tool==="highlighter"?state.toolColors.highlighter:state.toolColors.pen;
      const w=Math.max(8, Math.min(28, (state.width||4)*state.camera.zoom*(state.tool==="highlighter"?0.85:1.15)));
      drawCursor.style.width=w+"px";
      drawCursor.style.height=w+"px";
      drawCursor.style.background=col;
      drawCursor.style.opacity=state.tool==="highlighter"?"0.55":"1";
    } else drawCursor.style.display="none";
  }
  const spot=document.getElementById("spotlight-layer");
  const spotPanel=document.getElementById("spotlight-controls-panel");
  if(spot){
    if(state.spotlight){
      spot.classList.add("on");
      spot.style.display="block";
      const darkness = state.spotlightDarkness || 0.65;
      const size = state.spotlightSize || 220;
      const shape = state.spotlightShape || "circle";
      const sx = state.lastMouse.x;
      const sy = state.lastMouse.y;
      spot.style.clipPath = "none";
      if(shape === "circle"){
        const r = Math.round(size / 2);
        const r0 = Math.round(r * 0.64);
        const r1 = Math.round(r * 0.88);
        spot.style.background = `radial-gradient(circle ${r}px at ${sx}px ${sy}px, rgba(0,0,0,0) 0%, rgba(0,0,0,0) ${r0}px, rgba(0,0,0,${darkness * 0.4}) ${r1}px, rgba(0,0,0,${darkness}) ${r}px)`;
      } else {
        const hw = Math.round(size * 0.72);
        const hh = Math.round(size * 0.48);
        const hw0 = Math.round(hw * 0.64);
        const hw1 = Math.round(hw * 0.88);
        spot.style.background = `radial-gradient(ellipse ${hw}px ${hh}px at ${sx}px ${sy}px, rgba(0,0,0,0) 0%, rgba(0,0,0,0) ${hw0}px, rgba(0,0,0,${darkness * 0.4}) ${hw1}px, rgba(0,0,0,${darkness}) ${hw}px)`;
      }
      if(spotPanel) spotPanel.classList.remove("hidden");
      if(!overUI){
        container.style.cursor="none";
        if(eraserCursor) eraserCursor.style.display="none";
        if(laserCursor) laserCursor.style.display="none";
        if(drawCursor) drawCursor.style.display="none";
        if(place) place.style.display="none";
        return;
      }
    } else {
      spot.classList.remove("on");
      spot.style.display="none";
      if(spotPanel) spotPanel.classList.add("hidden");
    }
  }
  if(!overUI && state.tool==="eraser"){
    if(eraserCursor){
      eraserCursor.style.display="block";
      eraserCursor.style.left=state.lastMouse.x+"px";
      eraserCursor.style.top=state.lastMouse.y+"px";
    }
    container.style.cursor="none";
    if(laserCursor) laserCursor.style.display="none";
    if(drawCursor) drawCursor.style.display="none";
    return;
  }
  if(eraserCursor) eraserCursor.style.display="none";
  if(overUI){
    container.style.cursor="default";
    return;
  }
  if(state.isTransforming)return;
  if(state.pendingPlace){container.style.cursor="none";return;}
  if(state.tool==="vanishing"){container.style.cursor="none";return;}
  if(state.tool==="pen"||state.tool==="highlighter"){container.style.cursor="none";return;}
  if(state.tool==="select")container.style.cursor="default";
  else if(state.tool==="hand")container.style.cursor=state.isPanning?"grabbing":"grab";
  else if(state.tool==="text")container.style.cursor="url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M8 4h8M12 4v16M8 20h8' stroke='%23ffffff' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M8 4h8M12 4v16M8 20h8' stroke='%230f172a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\") 12 12, text";
  else {
    container.style.cursor="url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M12 2v20M2 12h20' stroke='%23ffffff' stroke-width='3.5' stroke-linecap='square'/%3E%3Cpath d='M12 3v18M3 12h18' stroke='%23000000' stroke-width='1.8' stroke-linecap='square'/%3E%3C/svg%3E\") 12 12, crosshair";
  }
}

function normalizeBox(el){
  if(typeof el.w==="number" && el.w<0){el.x+=el.w; el.w=-el.w;}
  if(typeof el.h==="number" && el.h<0){el.y+=el.h; el.h=-el.h;}
}
function getBounds(el){
  const pad=Math.max(2,(el.width||2)*0.5);
  if(BOX_TYPES.includes(el.type)){
    let x=el.x,y=el.y,w=el.w||100,h=el.h||40;
    if(w<0){x+=w;w=-w;} if(h<0){y+=h;h=-h;}
    return{x,y,w:Math.max(1,w),h:Math.max(1,h)};
  }
  if(LINE_TYPES.includes(el.type)){
    const x1=el.x,y1=el.y,x2=el.x+el.w,y2=el.y+el.h;
    const mx=Math.min(x1,x2),my=Math.min(y1,y2);
    return{x:mx-pad,y:my-pad,w:Math.max(1,Math.abs(el.w))+pad*2,h:Math.max(1,Math.abs(el.h))+pad*2,raw:true};
  }
  if(STROKE_TYPES.includes(el.type)&&el.points){
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    el.points.forEach(p=>{minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y)});
    return{x:minX-pad,y:minY-pad,w:Math.max(1,maxX-minX)+pad*2,h:Math.max(1,maxY-minY)+pad*2};
  }
  return{x:el.x||0,y:el.y||0,w:40,h:40};
}
function getCenter(b){return{x:b.x+b.w/2,y:b.y+b.h/2}}
function textFont(el){return `${el.italic?"italic ":""}${el.bold?"bold ":""}${el.size||18}px ${el.font||"Segoe UI,Inter,system-ui,sans-serif"}`}
const _textMeasure=document.createElement("div");
_textMeasure.setAttribute("aria-hidden","true");
_textMeasure.style.cssText="position:absolute;left:-9999px;top:0;white-space:pre;visibility:hidden;pointer-events:none;line-height:1.25;padding:0;margin:0;border:0;";
document.body.appendChild(_textMeasure);
function fitTextElement(el){
  if(!el || el.type!=="text") return;
  const size=el.size||18;
  const text=String(el.text||"");
  _textMeasure.style.font=textFont(el);
  _textMeasure.style.lineHeight="1.25";
  const measureStr = (!text.length && el.isPlaceholder) ? "Type here" : (text.length ? text : "\u00a0");
  _textMeasure.textContent = measureStr;
  const caret = (!text.length && !el.isPlaceholder) ? Math.max(8, size * 0.6) : 4;
  el.w = Math.max(8, _textMeasure.offsetWidth + caret);
  el.h = Math.max(size * 1.25, _textMeasure.offsetHeight);
}
function stickyFont(el){return `${el.italic?"italic ":""}${el.bold?"bold ":""}${el.size||16}px ${el.font||"Segoe UI,Inter,system-ui,sans-serif"}`}
const STICKY_PAD=10;
function stickyLines(el){
  const maxW=Math.max(20,(el.w||180)-STICKY_PAD*2);
  ctx.save(); ctx.font=stickyFont(el);
  const out=[];
  String(el.isPlaceholder?"":(el.text||"")).split("\n").forEach(par=>{
    if(!par){out.push("");return}
    let line="";
    par.split(/(\s+)/).forEach(tok=>{
      const test=line+tok;
      if(ctx.measureText(test).width>maxW && line.trim()){ out.push(line.replace(/\s+$/,"")); line=tok.replace(/^\s+/,""); }
      else line=test;
    });
    out.push(line);
  });
  ctx.restore();
  return out;
}
function stickyContentHeight(el){
  const lh=(el.size||16)*1.35;
  return stickyLines(el).length*lh + STICKY_PAD*2;
}
function fitStickyElement(el){
  if(!el||el.type!=="sticky") return;
  const need=stickyContentHeight(el);
  el.h=Math.max(el.minH||130, need);
  el.scroll=0;
}
function stickyMaxScroll(el){ return Math.max(0, stickyContentHeight(el)-(el.h||130)); }
const _emojiCache=new Map();
function emojiMetrics(txt){
  if(_emojiCache.has(txt)) return _emojiCache.get(txt);
  ctx.save();
  ctx.font='100px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  ctx.textBaseline="alphabetic";
  const m=ctx.measureText(txt||"");
  ctx.restore();
  const w=(m.width||80)/100;
  const asc=(m.actualBoundingBoxAscent||78)/100;
  const desc=(m.actualBoundingBoxDescent||4)/100;
  const out={w:Math.max(0.2,w),asc:Math.max(0.2,asc),desc:Math.max(0,desc)};
  _emojiCache.set(txt,out);
  return out;
}
function emojiSpawnSize(txt,size){
  const m=emojiMetrics(txt);
  return {w:m.w*size, h:(m.asc+m.desc)*size};
}
function distToSegment(px,py,x1,y1,x2,y2){const l2=(x2-x1)*(x2-x1)+(y2-y1)*(y2-y1);if(l2===0)return Math.hypot(px-x1,py-y1);let t=((px-x1)*(x2-x1)+(py-y1)*(y2-y1))/l2;t=Math.max(0,Math.min(1,t));return Math.hypot(px-(x1+t*(x2-x1)),py-(y1+t*(y2-y1)));}
function drawStar(cx,cy,outerR,innerR,points){ctx.beginPath();for(let i=0;i<points*2;i++){const r=i%2===0?outerR:innerR;const a=(Math.PI/points)*i - Math.PI/2;ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}ctx.closePath();}
function drawHexagon(x,y,w,h){ctx.beginPath();const cx=x+w/2,cy=y+h/2,rx=w/2,ry=h/2;for(let i=0;i<6;i++){const a=Math.PI/3*i - Math.PI/6;const px=cx+Math.cos(a)*rx,py=cy+Math.sin(a)*ry;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();}
function drawHeart(x,y,w,h){const cx=x+w/2,cy=y+h/2;ctx.beginPath();ctx.moveTo(cx,cy+h*0.35);ctx.bezierCurveTo(cx+w*0.5,cy-h*0.2,cx+w*0.5,cy+h*0.1,cx,cy+h*0.35);ctx.bezierCurveTo(cx-w*0.5,cy+h*0.1,cx-w*0.5,cy-h*0.2,cx,cy+h*0.35);ctx.closePath();}
function shapePoints(el){
  const x=el.x,y=el.y,w=el.w,h=el.h;
  if(el.type==="triangle") return [{x:x+w/2,y},{x,y:y+h},{x:x+w,y:y+h}];
  if(el.type==="diamond") return [{x:x+w/2,y},{x:x+w,y:y+h/2},{x:x+w/2,y:y+h},{x,y:y+h/2}];
  if(el.type==="hexagon"){const cx=x+w/2,cy=y+h/2,rx=w/2,ry=h/2,pts=[]; for(let i=0;i<6;i++){const a=Math.PI/3*i-Math.PI/6; pts.push({x:cx+Math.cos(a)*rx,y:cy+Math.sin(a)*ry});} return pts;}
  if(el.type==="star"){const cx=x+w/2,cy=y+h/2,outer=Math.min(w,h)/2,inner=outer*0.45,pts=[]; for(let i=0;i<10;i++){const r=i%2===0?outer:inner; const a=Math.PI/5*i-Math.PI/2; pts.push({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r});} return pts;}
  return [{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];
}
function distToPoly(px,py,pts){let d=Infinity; for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length]; d=Math.min(d,distToSegment(px,py,a.x,a.y,b.x,b.y));} return d;}
function pointInPoly(px,py,pts){let inside=false; for(let i=0,j=pts.length-1;i<pts.length;j=i++){const xi=pts[i].x,yi=pts[i].y,xj=pts[j].x,yj=pts[j].y; const inter=((yi>py)!==(yj>py)) && (px<(xj-xi)*(py-yi)/((yj-yi)||1e-9)+xi); if(inter) inside=!inside;} return inside;}
function dashPattern(el){
  const z=Math.max(0.05,state.camera.zoom);
  const w=el.width||4;
  return [Math.max(8/z, w*2.4), Math.max(6/z, w*1.6)];
}
function drawRuler(el){
  const x=el.x,y=el.y,w=el.w,h=Math.max(28,el.h);
  ctx.fillStyle="rgba(255,248,220,0.94)";
  ctx.strokeStyle="#1E1E1E";
  ctx.lineWidth=1.2;
  roundRectPath(x,y,w,h,4); ctx.fill(); ctx.stroke();
  ctx.strokeStyle="#1E1E1E";
  ctx.fillStyle="#1E1E1E";
  const step=20;
  ctx.font=`${Math.max(8, Math.min(12,h*0.32))}px Segoe UI,sans-serif`;
  ctx.textBaseline="bottom";
  ctx.textAlign="left";
  ctx.beginPath();
  for(let i=0;i<=w;i+=step){
    const long=i%(step*5)===0;
    const tick=long?h*0.5:h*0.28;
    ctx.moveTo(x+i,y);
    ctx.lineTo(x+i,y+tick);
    if(long){
      ctx.fillText(String(Math.round(i/step)), x+i+2, y+h-4);
    }
  }
  ctx.stroke();
}
function drawProtractor(el){
  const x=el.x,y=el.y,w=el.w,h=el.h;
  const cx=x+w/2, cy=y+h, r=Math.min(w/2,h);
  ctx.fillStyle="rgba(219,234,254,0.78)";
  ctx.strokeStyle="#1E3A8A";
  ctx.lineWidth=1.4;
  ctx.beginPath();
  ctx.arc(cx,cy,r,Math.PI,0);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  for(let deg=0; deg<=180; deg+=10){
    const a=Math.PI+(deg*Math.PI/180);
    const long=deg%30===0;
    const inner=r*(long?0.78:0.88);
    ctx.moveTo(cx+Math.cos(a)*r, cy+Math.sin(a)*r);
    ctx.lineTo(cx+Math.cos(a)*inner, cy+Math.sin(a)*inner);
  }
  ctx.stroke();
  ctx.fillStyle="#1E3A8A";
  ctx.font=`${Math.max(8,r*0.12)}px Segoe UI,sans-serif`;
  ctx.textAlign="center"; ctx.textBaseline="middle";
  [0,30,60,90,120,150,180].forEach(deg=>{
    const a=Math.PI+(deg*Math.PI/180);
    const px=cx+Math.cos(a)*r*0.62, py=cy+Math.sin(a)*r*0.62;
    ctx.fillText(String(deg), px, py);
  });
}
function drawAxes(el){
  const x=el.x,y=el.y,w=el.w,h=el.h;
  const ox=x+w*0.12, oy=y+h*0.88;
  ctx.strokeStyle=el.color||"#1E1E1E";
  ctx.fillStyle=el.color||"#1E1E1E";
  ctx.lineWidth=1.6;
  ctx.beginPath(); ctx.moveTo(ox,y+8); ctx.lineTo(ox,oy); ctx.lineTo(x+w-8,oy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ox,y+8); ctx.lineTo(ox-5,y+18); ctx.moveTo(ox,y+8); ctx.lineTo(ox+5,y+18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+w-8,oy); ctx.lineTo(x+w-18,oy-5); ctx.moveTo(x+w-8,oy); ctx.lineTo(x+w-18,oy+5); ctx.stroke();
  const step=24;
  ctx.lineWidth=1;
  ctx.globalAlpha=0.35;
  for(let i=ox+step;i<x+w-16;i+=step){ctx.beginPath();ctx.moveTo(i,oy-4);ctx.lineTo(i,oy+4);ctx.stroke();}
  for(let j=oy-step;j>y+16;j-=step){ctx.beginPath();ctx.moveTo(ox-4,j);ctx.lineTo(ox+4,j);ctx.stroke();}
  ctx.globalAlpha=1;
  ctx.font="11px Segoe UI,sans-serif";
  ctx.fillText("x", x+w-16, oy+14);
  ctx.fillText("y", ox-14, y+16);
}
function drawTimer(el){
  const x=el.x, y=el.y, w=Math.max(60, el.w||140), h=Math.max(36, el.h||80);
  const r=Math.min(16, Math.min(w,h)*0.22);
  ctx.save();
  ctx.globalAlpha=1;
  ctx.globalCompositeOperation="source-over";
  ctx.shadowColor="rgba(0,0,0,0.35)";
  ctx.shadowBlur=16;
  ctx.shadowOffsetY=4;
  ctx.fillStyle=el.color || "#262626";
  roundRectPath(x,y,w,h,r);
  ctx.fill();
  ctx.shadowBlur=0;
  ctx.shadowOffsetY=0;
  ctx.strokeStyle="rgba(255,255,255,0.14)";
  ctx.lineWidth=1;
  roundRectPath(x+0.5,y+0.5,w-1,h-1,r);
  ctx.stroke();

  const isCountUp = el.mode === "countup";
  let displayStr = "00:00";
  let statusLabel = "tap to start";
  let isDanger = false;

  if(isCountUp){
    let elapsed = 0;
    if(el.running){
      elapsed = Math.max(0, Math.floor(((Date.now() - (el.startAt || Date.now())) + (el.elapsedOffset || 0)) / 1000));
    } else {
      elapsed = Math.max(0, Math.floor(el.elapsed || 0));
    }
    const hh = Math.floor(elapsed / 3600);
    const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
    const ss = String(elapsed % 60).padStart(2, "0");
    displayStr = hh > 0 ? `${String(hh).padStart(2, "0")}:${mm}:${ss}` : `${mm}:${ss}`;
    statusLabel = el.running ? "stopwatch • running" : "stopwatch • paused";

    const barH = Math.max(3, h * 0.06);
    const barY = y + h - barH - 4;
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    roundRectPath(x + 8, barY, w - 16, barH, 2);
    ctx.fill();
    ctx.fillStyle = el.running ? "#34d399" : "#60a5fa";
    roundRectPath(x + 8, barY, w - 16, barH, 2);
    ctx.fill();
  } else {
    const total = el.duration || 300;
    const remain = timerRemaining(el);
    const mm = String(Math.floor(remain / 60)).padStart(2, "0");
    const ss = String(remain % 60).padStart(2, "0");
    displayStr = `${mm}:${ss}`;
    isDanger = remain <= 10 && el.running;
    
    // Progress track and bar along the bottom
    const prog = Math.max(0, Math.min(1, remain / Math.max(1, total)));
    const barH = Math.max(3, h * 0.06);
    const barY = y + h - barH - 4;
    const barW = Math.max(0, (w - 16) * prog);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    roundRectPath(x + 8, barY, w - 16, barH, 2);
    ctx.fill();
    if(barW > 0){
      ctx.fillStyle = isDanger ? "#f87171" : (el.running ? "#34d399" : "#60a5fa");
      roundRectPath(x + 8, barY, barW, barH, 2);
      ctx.fill();
    }
    statusLabel = remain <= 0 ? "time's up! • tap to reset" : (el.running ? "running • tap to pause" : "tap to start");
  }

  ctx.fillStyle = isDanger ? "#f87171" : "#ffffff";
  const numSize = Math.max(12, Math.min(w * (displayStr.length > 5 ? 0.17 : 0.22), h * 0.42));
  ctx.font = `bold ${numSize}px ui-monospace,SFMono-Regular,Menlo,monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(displayStr, x + w / 2, y + h / 2 - numSize * 0.14);

  const labelSize = Math.max(8, Math.min(12, h * 0.15));
  ctx.font = `${labelSize}px Segoe UI,sans-serif`;
  ctx.fillStyle = (!isCountUp && timerRemaining(el) <= 0) ? "#f87171" : (el.running ? "#34d399" : "#9ca3af");
  ctx.fillText(statusLabel, x + w / 2, y + h - Math.max(10, h * 0.22));
  ctx.restore();
}
function timerRemaining(el){
  if(el.mode === "countup") return 0;
  const total = el.duration || 300;
  if(!el.running) return Math.max(0, Math.round(el.left != null ? el.left : total));
  const left = Math.max(0, Math.round(((el.endAt || Date.now()) - Date.now()) / 1000));
  return left;
}
function drawAlignmentGuides(){
  if(!state.alignmentGuides || !state.alignmentGuides.length) return;
  const z = Math.max(0.05, state.camera.zoom);
  ctx.save();
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 1.25 / z;
  ctx.setLineDash([4 / z, 4 / z]);
  state.alignmentGuides.forEach(g => {
    ctx.beginPath();
    ctx.moveTo(g.x1, g.y1);
    ctx.lineTo(g.x2, g.y2);
    ctx.stroke();
  });
  ctx.restore();
}
function drawCompassGuide(el){
  const r=Math.hypot(el.w||0, el.h||0);
  ctx.strokeStyle=el.color||"#0055FF";
  ctx.lineWidth=1.5;
  ctx.setLineDash([6,4]);
  ctx.beginPath(); ctx.arc(el.x,el.y,r,0,Math.PI*2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(el.x,el.y); ctx.lineTo(el.x+(el.w||0), el.y+(el.h||0)); ctx.stroke();
  ctx.fillStyle=el.color||"#0055FF";
  ctx.beginPath(); ctx.arc(el.x,el.y,3,0,Math.PI*2); ctx.fill();
  ctx.font="12px Segoe UI,sans-serif";
  ctx.fillText(Math.round(r)+" px", el.x+r*0.3, el.y-8);
}

function drawSmoothStrokePath(c, pts){
  if(!pts || pts.length === 0) return;
  if(pts.length === 1){
    c.beginPath();
    c.arc(pts[0].x, pts[0].y, Math.max(0.5, (c.lineWidth || 2) / 2), 0, Math.PI * 2);
    c.fill();
    return;
  }
  if(pts.length === 2){
    c.beginPath();
    c.moveTo(pts[0].x, pts[0].y);
    c.lineTo(pts[1].x, pts[1].y);
    c.stroke();
    return;
  }
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for(let i = 1; i < pts.length - 1; i++){
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    c.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  c.quadraticCurveTo(prev.x, prev.y, last.x, last.y);
  c.stroke();
}

function drawElement(el){
  ctx.save();
  const b=getBounds(el),cx=b.x+b.w/2,cy=b.y+b.h/2;
  if(el.rotation){ctx.translate(cx,cy);ctx.rotate(el.rotation*Math.PI/180);ctx.translate(-cx,-cy);}
  ctx.strokeStyle=el.color||"#1E1E1E";ctx.fillStyle=el.color||"#1E1E1E";ctx.lineWidth=el.width||2;ctx.lineCap="round";ctx.lineJoin="round";
  if(STROKE_TYPES.includes(el.type)){
    const style=el.penStyle!=null?el.penStyle:0;
    if(el.type==="highlighter"){
      const hs=el.highlighterStyle||0;
      if(hs===1){ctx.globalAlpha=.45;ctx.lineWidth=(el.width||15)*1.15;}
      else if(hs===2){ctx.globalAlpha=.25;ctx.shadowColor=el.color||"#000";ctx.shadowBlur=10;}
      else {ctx.globalAlpha=.35;}
      drawSmoothStrokePath(ctx, el.points);
    } else if(el.type==="vanishing"){
      ctx.globalAlpha=el.opacity!=null?el.opacity:1;
      const mode=el.vanishMode||state.vanishMode||"comet";
      const pts=el.points; const n=pts ? pts.length : 0;
      const cut=el.cometCut||0;
      if(n === 1){
        const core=el.color||"#E52B50";
        ctx.fillStyle=core; ctx.shadowColor=core; ctx.shadowBlur=12;
        ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, Math.max(1, (el.width||4)/2), 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur=0;
      } else if(n > 1){
        if(mode==="comet"){
          const core=el.color||"#E52B50";
          for(let i=1;i<n;i++){
            const t=i/(n-1);
            if(t<cut) continue;
            const p0=pts[i-1], p1=pts[i];
            const p_start = (i===1) ? p0 : {x:(p0.x+p1.x)/2, y:(p0.y+p1.y)/2};
            const p_ctrl = p1;
            const p_end = (i===n-1) ? p1 : {x:(p1.x+pts[i+1].x)/2, y:(p1.y+pts[i+1].y)/2};
            const along=(t-cut)/Math.max(0.001,1-cut);
            ctx.strokeStyle=core; ctx.shadowColor=core; ctx.shadowBlur=14*along;
            ctx.lineWidth=(el.width||4)*(0.3+1.4*along); ctx.globalAlpha=(el.opacity!=null?el.opacity:1)*Math.max(0.15,along);
            ctx.beginPath();ctx.moveTo(p_start.x,p_start.y);ctx.quadraticCurveTo(p_ctrl.x,p_ctrl.y,p_end.x,p_end.y);ctx.stroke();
          }
          ctx.shadowBlur=0;
        } else if(mode==="ember"){
          const base=el.color||"#FF6B00";
          const alpha=el.opacity!=null?el.opacity:1;
          for(let i=1;i<n;i++){
            const t=i/(n-1);
            if(t<cut) continue;
            const heat=Math.max(0, 1-(t-cut)*8);
            const p0=pts[i-1], p1=pts[i];
            const p_start = (i===1) ? p0 : {x:(p0.x+p1.x)/2, y:(p0.y+p1.y)/2};
            const p_ctrl = p1;
            const p_end = (i===n-1) ? p1 : {x:(p1.x+pts[i+1].x)/2, y:(p1.y+pts[i+1].y)/2};
            if(heat>0.05){
              ctx.strokeStyle=`rgb(255,${Math.round(90+140*(1-heat))},${Math.round(30+60*(1-heat))})`;
              ctx.shadowColor="#f97316"; ctx.shadowBlur=6+22*heat;
              ctx.lineWidth=(el.width||4)*(1+0.65*heat);
              ctx.globalAlpha=alpha;
            } else {
              ctx.strokeStyle=base; ctx.shadowColor="rgba(120,53,15,0.6)"; ctx.shadowBlur=3;
              ctx.lineWidth=el.width||4; ctx.globalAlpha=alpha*0.92;
            }
            ctx.beginPath();ctx.moveTo(p_start.x,p_start.y);ctx.quadraticCurveTo(p_ctrl.x,p_ctrl.y,p_end.x,p_end.y);ctx.stroke();
          }
          ctx.shadowBlur=0;
        } else {
          ctx.shadowBlur=6; ctx.shadowColor=el.color||"#334155";
          for(let i=1;i<n;i++){
            const p0=pts[i-1], p1=pts[i];
            const p_start = (i===1) ? p0 : {x:(p0.x+p1.x)/2, y:(p0.y+p1.y)/2};
            const p_ctrl = p1;
            const p_end = (i===n-1) ? p1 : {x:(p1.x+pts[i+1].x)/2, y:(p1.y+pts[i+1].y)/2};
            const nse=((i*17)%10)/10;
            ctx.globalAlpha=(el.opacity!=null?el.opacity:1)*(0.45+0.55*nse)*(el.inkMul!=null?el.inkMul:1);
            ctx.lineWidth=(el.width||4)*(0.7+nse*0.6);
            ctx.beginPath();ctx.moveTo(p_start.x,p_start.y);ctx.quadraticCurveTo(p_ctrl.x,p_ctrl.y,p_end.x,p_end.y);ctx.stroke();
          }
          ctx.shadowBlur=0;
        }
      }
    } else if(el.points&&el.points.length>=1){
      if(el.points.length===1){
        const dotR = Math.max(0.75, (el.width||4)/2);
        if(el.type==="pen" && style===2){
          const z=Math.max(0.05,state.camera.zoom);
          const core=el.color||"#00A86B";
          ctx.shadowColor=core; ctx.shadowBlur=18/z;
          ctx.fillStyle=core; ctx.beginPath(); ctx.arc(el.points[0].x, el.points[0].y, dotR*1.5, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle="#ffffff"; ctx.shadowBlur=8/z;
          ctx.beginPath(); ctx.arc(el.points[0].x, el.points[0].y, dotR*0.7, 0, Math.PI*2); ctx.fill();
          ctx.shadowBlur=0;
        } else {
          ctx.beginPath(); ctx.arc(el.points[0].x, el.points[0].y, dotR, 0, Math.PI*2); ctx.fill();
        }
      } else if(el.type==="pen"&&style===0){
        ctx.lineWidth=(el.width||4)*0.55;
        drawSmoothStrokePath(ctx, el.points);
      } else if(el.type==="pen"&&style===1){
        for(let i=1;i<el.points.length;i++){
          const p0=el.points[i-1],p1=el.points[i];
          const ang=Math.atan2(p1.y-p0.y,p1.x-p0.x);
          ctx.lineWidth=(el.width||4)*(0.35+Math.abs(Math.sin(ang))*1.35);
          const p_start = (i===1)?p0:{x:(p0.x+p1.x)/2, y:(p0.y+p1.y)/2};
          const p_ctrl = p1;
          const p_end = (i===el.points.length-1)?p1:{x:(p1.x+el.points[i+1].x)/2, y:(p1.y+el.points[i+1].y)/2};
          ctx.beginPath();ctx.moveTo(p_start.x,p_start.y);ctx.quadraticCurveTo(p_ctrl.x,p_ctrl.y,p_end.x,p_end.y);ctx.stroke();
        }
      } else if(el.type==="pen"&&style===2){
        const z=Math.max(0.05,state.camera.zoom);
        const core=el.color||"#00A86B";
        ctx.shadowColor=core; ctx.shadowBlur=18/z;
        ctx.strokeStyle=core; ctx.globalAlpha=0.75; ctx.lineWidth=(el.width||4)*1.85;
        drawSmoothStrokePath(ctx, el.points);
        ctx.globalAlpha=1; ctx.shadowBlur=8/z; ctx.lineWidth=(el.width||4)*0.65; ctx.strokeStyle="#ffffff";
        drawSmoothStrokePath(ctx, el.points);
        ctx.shadowBlur=0;
      } else if(el.type==="pen"&&style===3){
        ctx.setLineDash(dashPattern(el));
        drawSmoothStrokePath(ctx, el.points);
        ctx.setLineDash([]);
      } else {
        drawSmoothStrokePath(ctx, el.points);
      }
    }
    ctx.shadowBlur=0;ctx.globalAlpha=1;
  }else if(el.type==="rect"){if(el.fill)ctx.fillRect(el.x,el.y,el.w,el.h);else ctx.strokeRect(el.x,el.y,el.w,el.h)}
  else if(el.type==="roundRect"){const r=Math.min(12,Math.abs(el.w)/4,Math.abs(el.h)/4);ctx.beginPath();ctx.roundRect(el.x,el.y,el.w,el.h,r); if(el.fill)ctx.fill();else ctx.stroke();}
  else if(el.type==="circle"){ctx.beginPath();ctx.ellipse(el.x+el.w/2,el.y+el.h/2,Math.abs(el.w/2),Math.abs(el.h/2),0,0,Math.PI*2);if(el.fill)ctx.fill();else ctx.stroke()}
  else if(el.type==="ellipse"){ctx.beginPath();ctx.ellipse(el.x+el.w/2,el.y+el.h/2,Math.abs(el.w/2),Math.abs(el.h/2),0,0,Math.PI*2);if(el.fill)ctx.fill();else ctx.stroke()}
  else if(el.type==="triangle"){ctx.beginPath();ctx.moveTo(el.x+el.w/2,el.y);ctx.lineTo(el.x,el.y+el.h);ctx.lineTo(el.x+el.w,el.y+el.h);ctx.closePath();if(el.fill)ctx.fill();else ctx.stroke()}
  else if(el.type==="diamond"){ctx.beginPath();ctx.moveTo(el.x+el.w/2,el.y);ctx.lineTo(el.x+el.w,el.y+el.h/2);ctx.lineTo(el.x+el.w/2,el.y+el.h);ctx.lineTo(el.x,el.y+el.h/2);ctx.closePath();if(el.fill)ctx.fill();else ctx.stroke()}
  else if(el.type==="star"){const r=Math.min(Math.abs(el.w),Math.abs(el.h))/2;drawStar(el.x+el.w/2,el.y+el.h/2,r,r*0.45,5);if(el.fill)ctx.fill();else ctx.stroke()}
  else if(el.type==="hexagon"){drawHexagon(el.x,el.y,el.w,el.h);if(el.fill)ctx.fill();else ctx.stroke()}
  else if(el.type==="heart"){drawHeart(el.x,el.y,el.w,el.h);if(el.fill)ctx.fill();else ctx.stroke()}
  else if(el.type==="ruler"){drawRuler(el)}
  else if(el.type==="protractor"){drawProtractor(el)}
  else if(el.type==="axes"){drawAxes(el)}
  else if(el.type==="timer"){drawTimer(el)}
  else if(el.type==="compassGuide"){drawCompassGuide(el)}
  else if(el.type==="sticky"){
    ctx.save();
    ctx.shadowColor="rgba(15,23,42,0.20)"; ctx.shadowBlur=22; ctx.shadowOffsetY=10;
    ctx.fillStyle=el.bg||"#fef08a"; roundRectPath(el.x,el.y,el.w,el.h,14); ctx.fill();
    ctx.restore();
    ctx.save();
    const gg=ctx.createLinearGradient(el.x,el.y,el.x,el.y+el.h);
    gg.addColorStop(0,"rgba(255,255,255,0.55)"); gg.addColorStop(0.45,"rgba(255,255,255,0.06)"); gg.addColorStop(1,"rgba(15,23,42,0.06)");
    ctx.fillStyle=gg; roundRectPath(el.x,el.y,el.w,el.h,14); ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.75)"; ctx.lineWidth=1; roundRectPath(el.x+0.5,el.y+0.5,el.w-1,el.h-1,14); ctx.stroke();
    ctx.restore();
    if(state.inlineEditingId===el.id){ctx.restore();return;}
    const lines=stickyLines(el);
    const lh=(el.size||16)*1.35;
    const maxScroll=stickyMaxScroll(el);
    if(el.scroll==null) el.scroll=0;
    el.scroll=clamp(el.scroll,0,maxScroll);
    ctx.save();
    roundRectPath(el.x,el.y,el.w,el.h,14); ctx.clip();
    ctx.fillStyle=el.isPlaceholder?"rgba(100,116,139,0.75)":(el.color||"#422006");
    ctx.font=stickyFont(el); ctx.textBaseline="top";
    if(el.isPlaceholder){ ctx.fillText("Type here", el.x+STICKY_PAD, el.y+STICKY_PAD); }
    else lines.forEach((line,i)=>{
      const yy=el.y+STICKY_PAD+i*lh-el.scroll;
      if(yy>el.y+el.h||yy+lh<el.y) return;
      ctx.fillText(line,el.x+STICKY_PAD,yy);
      if(el.underline) ctx.fillRect(el.x+STICKY_PAD,yy+(el.size||16)+1,ctx.measureText(line).width,1);
    });
    if(maxScroll>0.5){
      const trackH=el.h-16, barH=Math.max(18, trackH*(el.h/(el.h+maxScroll)));
      const t=maxScroll?el.scroll/maxScroll:0;
      const bx=el.x+el.w-7, by=el.y+8+t*(trackH-barH);
      ctx.fillStyle="rgba(15,23,42,0.10)"; roundRectPath(bx,el.y+8,4,trackH,2); ctx.fill();
      ctx.fillStyle="rgba(15,23,42,0.38)"; roundRectPath(bx,by,4,barH,2); ctx.fill();
    }
    ctx.restore();
  }
  else if(LINE_TYPES.includes(el.type)){if(el.type==="dashed")ctx.setLineDash(dashPattern(el));ctx.beginPath();ctx.moveTo(el.x,el.y);ctx.lineTo(el.x+el.w,el.y+el.h);ctx.stroke();ctx.setLineDash([]); if(el.type==="arrow"||el.type==="doubleArrow"){const a=Math.atan2(el.h,el.w),hl=14;ctx.beginPath();ctx.moveTo(el.x+el.w,el.y+el.h);ctx.lineTo(el.x+el.w-hl*Math.cos(a-Math.PI/6),el.y+el.h-hl*Math.sin(a-Math.PI/6));ctx.moveTo(el.x+el.w,el.y+el.h);ctx.lineTo(el.x+el.w-hl*Math.cos(a+Math.PI/6),el.y+el.h-hl*Math.sin(a+Math.PI/6));ctx.stroke();} if(el.type==="doubleArrow"){const a=Math.atan2(el.h,el.w),hl=14;ctx.beginPath();ctx.moveTo(el.x,el.y);ctx.lineTo(el.x+hl*Math.cos(a-Math.PI/6),el.y+hl*Math.sin(a-Math.PI/6));ctx.moveTo(el.x,el.y);ctx.lineTo(el.x+hl*Math.cos(a+Math.PI/6),el.y+hl*Math.sin(a+Math.PI/6));ctx.stroke();}}
  else if(el.type==="text"){if(state.inlineEditingId===el.id){ctx.restore();return;}ctx.fillStyle=el.isPlaceholder?"#9ca3af":(el.color||DEFAULT_TEXT_COLOR);ctx.font=textFont(el);ctx.textBaseline="top";const txt=el.isPlaceholder?"Type here":(el.text||"");const lines=txt.split("\n");lines.forEach((l,i)=>{const yy=el.y+i*((el.size||18)*1.25);ctx.fillText(l,el.x,yy);if(el.underline){ctx.fillRect(el.x,yy+(el.size||18)+2,ctx.measureText(l).width,1);}})}
  else if(el.type==="image"){
    if(el.img&&el.img.complete&&el.img.naturalWidth>0){
      ctx.drawImage(el.img,el.x,el.y,el.w,el.h);
    } else if(el.src){
      ensureImageLoaded(el);
    }
  }
  else if(el.type==="emoji"){
    const m=emojiMetrics(el.text);
    const S=(el.h||32)/(m.asc+m.desc);
    const gw=m.w*S||1;
    ctx.save();
    ctx.translate(el.x, el.y+m.asc*S);
    ctx.scale((el.w||gw)/gw, 1);
    ctx.font=`${S}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
    ctx.textBaseline="alphabetic";
    ctx.fillText(el.text,0,0);
    ctx.restore();
  }
  ctx.restore();
}
let _renderPending=false; function scheduleRender(){ if(_renderPending) return; _renderPending=true; requestAnimationFrame(()=>{_renderPending=false; render();}); } function render(){
  ctx.clearRect(0,0,innerWidth,innerHeight);
  state.elements.forEach(el=>{
    if(el.type==="timer"&&el.pinned){
      const wp=toWorld(el.pinX!=null?el.pinX:innerWidth-180, el.pinY!=null?el.pinY:100);
      el.x=wp.x; el.y=wp.y; el.w=140/state.camera.zoom; el.h=80/state.camera.zoom;
    }
  });
  ctx.save();ctx.translate(state.camera.x,state.camera.y);ctx.scale(state.camera.zoom,state.camera.zoom);
  state.elements.forEach(drawElement);
  if(state.currentElement)drawElement(state.currentElement);
  if(state.selectedIds.length>1){drawMultiSelectionUnified(state.selectedIds);}
  if(state.selectedId && state.selectedIds.length<2){const s=state.elements.find(e=>e.id===state.selectedId);if(s)drawSelection(s)}
  if(state.isSelectingMarquee && state.marqueeStart && state.marqueeCurrent){
    const mx=Math.min(state.marqueeStart.x,state.marqueeCurrent.x);
    const my=Math.min(state.marqueeStart.y,state.marqueeCurrent.y);
    const mw=Math.abs(state.marqueeCurrent.x-state.marqueeStart.x);
    const mh=Math.abs(state.marqueeCurrent.y-state.marqueeStart.y);
    if(mw>1 || mh>1){
      ctx.save();
      ctx.fillStyle="rgba(37, 99, 235, 0.12)";
      ctx.strokeStyle="rgba(37, 99, 235, 0.85)";
      ctx.lineWidth=1.25/state.camera.zoom;
      ctx.setLineDash([5/state.camera.zoom, 4/state.camera.zoom]);
      ctx.fillRect(mx,my,mw,mh);
      ctx.strokeRect(mx,my,mw,mh);
      ctx.restore();
    }
  }
  drawGuideMeasurement();
  drawAlignmentGuides();
  state.fireParticles.forEach(p=>{ctx.save();ctx.globalAlpha=p.alpha;ctx.fillStyle=p.color||"#FF6B00";ctx.font=`${p.size}px sans-serif`;if(p.char==="*"){ctx.beginPath();ctx.arc(p.x,p.y,p.size/3,0,Math.PI*2);ctx.fill();} else ctx.fillText(p.char,p.x,p.y);ctx.restore();});
  ctx.restore();
  renderMinimap();
  updateZoomLabel();
}
function getMultiBounds(ids){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  (ids||[]).forEach(id=>{
    const el=state.elements.find(x=>x.id===id);
    if(!el) return;
    const b=getBounds(el);
    minX=Math.min(minX,b.x);
    minY=Math.min(minY,b.y);
    maxX=Math.max(maxX,b.x+b.w);
    maxY=Math.max(maxY,b.y+b.h);
  });
  if(minX===Infinity) return {x:0,y:0,w:0,h:0};
  return {x:minX,y:minY,w:maxX-minX,h:maxY-minY};
}
function drawMultiSelectionUnified(ids){
  const b=getMultiBounds(ids);
  if(b.w<=0||b.h<=0) return;
  const z=Math.max(0.05,state.camera.zoom);
  const pad=8/z;
  const cx=b.x+b.w/2, cy=b.y+b.h/2;
  ctx.save();
  ctx.strokeStyle="#2563eb";
  ctx.lineWidth=1.5/z;
  ctx.setLineDash([6/z,4/z]);
  ctx.strokeRect(b.x-pad,b.y-pad,b.w+pad*2,b.h+pad*2);
  ctx.setLineDash([]);
  const hs=5.5/z;
  function handle(x,y){
    ctx.beginPath();
    ctx.arc(x,y,hs,0,Math.PI*2);
    ctx.fillStyle="#ffffff";
    ctx.strokeStyle="#2563eb";
    ctx.lineWidth=1.5/z;
    ctx.fill();
    ctx.stroke();
  }
  const corners=[
    {x:b.x-pad,y:b.y-pad},
    {x:b.x+b.w+pad,y:b.y-pad},
    {x:b.x+b.w+pad,y:b.y+b.h+pad},
    {x:b.x-pad,y:b.y+b.h+pad}
  ];
  const sides=[
    {x:b.x-pad,y:b.y+b.h/2},
    {x:b.x+b.w+pad,y:b.y+b.h/2}
  ];
  corners.forEach(pt=>handle(pt.x,pt.y));
  sides.forEach(pt=>handle(pt.x,pt.y));
  const rhX=b.x+b.w/2, rhY=b.y+b.h+pad+20/z;
  ctx.strokeStyle="#2563eb"; ctx.lineWidth=1.25/z;
  ctx.beginPath(); ctx.moveTo(rhX,b.y+b.h+pad+2/z); ctx.lineTo(rhX,rhY-hs-1/z); ctx.stroke();
  handle(rhX,rhY);
  ctx.restore();
  state._multiHandles={corners,sides,rot:{x:rhX,y:rhY},center:{x:cx,y:cy},bounds:b};
}
function drawGuideMeasurement(){
  const cur=state.currentElement;
  if(!cur) return;
  const z=Math.max(0.05,state.camera.zoom);
  let a=null,b=null;
  if((state.activeRuler||state.activeProtractor)&&cur.points&&cur.points.length>1){a=cur.points[0];b=cur.points[cur.points.length-1];}
  else if(LINE_TYPES.includes(cur.type)){a={x:cur.x,y:cur.y};b={x:cur.x+cur.w,y:cur.y+cur.h};}
  if(!a||!b) return;
  const len=Math.hypot(b.x-a.x,b.y-a.y);
  if(len<2) return;
  let label=Math.round(len)+" px";
  if(state.activeProtractor){
    let deg=Math.atan2(-(b.y-a.y),b.x-a.x)*180/Math.PI;
    if(deg<0) deg+=360;
    label=Math.round(deg)+"° • "+Math.round(len)+" px";
  } else {
    label=Math.round(len)+" px  ("+(len/37.8).toFixed(1)+" cm)";
  }
  const mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
  ctx.save();
  ctx.font=`${12/z}px Segoe UI,sans-serif`;
  const tw=ctx.measureText(label).width;
  ctx.fillStyle="rgba(15,23,42,0.86)";
  roundRectPath(mx-tw/2-6/z, my-30/z, tw+12/z, 20/z, 6/z); ctx.fill();
  ctx.fillStyle="#fff"; ctx.textBaseline="middle"; ctx.textAlign="center";
  ctx.fillText(label, mx, my-20/z);
  ctx.restore();
}
function drawSelection(el){
  if(LINE_TYPES.includes(el.type)){
    const z=Math.max(0.05,state.camera.zoom);
    const hs=6/z;
    const pts=[{x:el.x,y:el.y},{x:el.x+el.w,y:el.y+el.h}];
    ctx.save();
    ctx.strokeStyle="#2563eb"; ctx.lineWidth=1.25/z;
    pts.forEach(pt=>{ctx.beginPath();ctx.arc(pt.x,pt.y,hs,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();ctx.stroke();});
    ctx.restore();
    el._handles={endpoints:pts,center:{x:el.x+el.w/2,y:el.y+el.h/2},corners:[],sides:[],rot:null};
    return;
  }
  const isText=el.type==="text";
  const b=getBounds(el);
  const cx=b.x+b.w/2,cy=b.y+b.h/2;
  ctx.save();
  if(el.rotation){ctx.translate(cx,cy);ctx.rotate(el.rotation*Math.PI/180);ctx.translate(-cx,-cy)}
  const z=Math.max(0.05,state.camera.zoom);
  const pad=(isText?6:3)/z;
  const hs=5/z;
  function handle(x,y){
    ctx.beginPath(); ctx.arc(x,y,hs,0,Math.PI*2);
    ctx.fillStyle="#fff"; ctx.strokeStyle="#2563eb"; ctx.lineWidth=1.4/z;
    ctx.fill(); ctx.stroke();
  }
  ctx.strokeStyle="#2563eb";
  ctx.lineWidth=1.25/z;
  ctx.setLineDash([7/z, 5/z]);
  ctx.strokeRect(b.x-pad,b.y-pad,b.w+pad*2,b.h+pad*2);
  ctx.setLineDash([]);
  const corners=[
    {x:b.x-pad,y:b.y-pad},
    {x:b.x+b.w+pad,y:b.y-pad},
    {x:b.x+b.w+pad,y:b.y+b.h+pad},
    {x:b.x-pad,y:b.y+b.h+pad}
  ];
  const sides=isText ? [] : [
    {x:b.x-pad,y:b.y+b.h/2},
    {x:b.x+b.w+pad,y:b.y+b.h/2}
  ];
  corners.forEach(h=>handle(h.x,h.y));
  sides.forEach(h=>handle(h.x,h.y));
  const rhX=b.x+b.w/2,rhY=b.y+b.h+pad+20/z;
  ctx.strokeStyle="#2563eb"; ctx.lineWidth=1.25/z;
  ctx.beginPath();ctx.moveTo(rhX,b.y+b.h+pad+2/z);ctx.lineTo(rhX,rhY-hs-1/z);ctx.stroke();
  handle(rhX,rhY);
  ctx.restore();
  el._handles={corners,sides,rot:{x:rhX,y:rhY},center:{x:cx,y:cy}};
}
function hitHandles(el,wp){
  if(state.selectedIds.length > 1){
    const b = getMultiBounds(state.selectedIds);
    if(b.w > 0 && b.h > 0){
      const tol = 20 / state.camera.zoom;
      const z = Math.max(0.05, state.camera.zoom);
      const pad = 8 / z;
      const rhX = b.x + b.w / 2, rhY = b.y + b.h + pad + 20 / z;
      if(Math.hypot(wp.x - rhX, wp.y - rhY) < tol + 8) return { mode: "rotateMulti" };
      const corners = [
        { x: b.x - pad, y: b.y - pad },
        { x: b.x + b.w + pad, y: b.y - pad },
        { x: b.x + b.w + pad, y: b.y + b.h + pad },
        { x: b.x - pad, y: b.y + b.h + pad }
      ];
      for(let i = 0; i < corners.length; i++){
        if(Math.hypot(wp.x - corners[i].x, wp.y - corners[i].y) < tol) return { mode: "resizeMulti", idx: i, type: "corner" };
      }
      const sides = [
        { x: b.x - pad, y: b.y + b.h / 2 },
        { x: b.x + b.w + pad, y: b.y + b.h / 2 }
      ];
      for(let i = 0; i < sides.length; i++){
        if(Math.hypot(wp.x - sides[i].x, wp.y - sides[i].y) < tol) return { mode: "sideMulti", idx: i, type: "side" };
      }
    }
    return null;
  }
  if(!el || !el._handles) return null;
  if(el._handles.endpoints){
    const tol=16/state.camera.zoom;
    for(let i=0;i<2;i++){const h=el._handles.endpoints[i]; if(Math.hypot(wp.x-h.x,wp.y-h.y)<tol) return {mode:"endpoint",idx:i};}
    return null;
  }
  const tol=20/state.camera.zoom;
  const center=el._handles.center;
  const localWp=el.rotation?rotatePoint(wp.x,wp.y,center.x,center.y,-el.rotation):wp;
  for(let i=0;i<el._handles.corners.length;i++){
    const h=el._handles.corners[i];
    if(Math.hypot(localWp.x-h.x,localWp.y-h.y)<tol) return {mode:"resize",idx:i,type:"corner"};
  }
  for(let i=0;i<(el._handles.sides||[]).length;i++){
    const h=el._handles.sides[i];
    if(Math.hypot(localWp.x-h.x,localWp.y-h.y)<tol) return {mode:"side",idx:i,type:"side"};
  }
  const rh=el._handles.rot;
  if(rh&&Math.hypot(localWp.x-rh.x,localWp.y-rh.y)<tol+8) return {mode:"rotate"};
  return null;
}
function isPointInElementGeometry(el, wp, hitTol = 8){
  if(!el) return false;
  const tol = hitTol;
  
  // 1. Strokes (pen, highlighter, vanishing)
  if(STROKE_TYPES.includes(el.type) && el.points && el.points.length){
    const b = getBounds(el);
    const c = getCenter(b);
    const lp = el.rotation ? rotatePoint(wp.x, wp.y, c.x, c.y, -el.rotation) : wp;
    const hitR = tol + (el.width || 2) * 0.5;
    if(el.points.length === 1){
      return Math.hypot(lp.x - el.points[0].x, lp.y - el.points[0].y) <= hitR;
    }
    for(let i = 1; i < el.points.length; i++){
      if(distToSegment(lp.x, lp.y, el.points[i-1].x, el.points[i-1].y, el.points[i].x, el.points[i].y) <= hitR){
        return true;
      }
    }
    return false;
  }
  
  // 2. Lines & Arrows
  if(LINE_TYPES.includes(el.type)){
    const b = getBounds(el);
    const c = getCenter(b);
    const lp = el.rotation ? rotatePoint(wp.x, wp.y, c.x, c.y, -el.rotation) : wp;
    const hitR = tol + (el.width || 2) * 0.5;
    return distToSegment(lp.x, lp.y, el.x, el.y, el.x + el.w, el.y + el.h) <= hitR;
  }
  
  // 3. Circle / Ellipse
  if(el.type === "circle" || el.type === "ellipse"){
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    const rx = Math.abs(el.w / 2);
    const ry = Math.abs(el.h / 2);
    if(rx < 1 || ry < 1) return false;
    const lp = el.rotation ? rotatePoint(wp.x, wp.y, cx, cy, -el.rotation) : wp;
    const nx = (lp.x - cx) / rx;
    const ny = (lp.y - cy) / ry;
    const normDist = Math.hypot(nx, ny);
    const hitR = tol + (el.width || 2) * 0.5;
    if(el.fill){
      return normDist <= 1 + hitR / Math.max(rx, ry, 1);
    } else {
      const distFromPerimeter = Math.abs(normDist - 1) * Math.min(rx, ry);
      return distFromPerimeter <= hitR;
    }
  }
  
  // 4. Rect / RoundRect
  if(el.type === "rect" || el.type === "roundRect"){
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    const lp = el.rotation ? rotatePoint(wp.x, wp.y, cx, cy, -el.rotation) : wp;
    const minX = Math.min(el.x, el.x + el.w);
    const maxX = Math.max(el.x, el.x + el.w);
    const minY = Math.min(el.y, el.y + el.h);
    const maxY = Math.max(el.y, el.y + el.h);
    const hitR = tol + (el.width || 2) * 0.5;
    if(el.fill){
      return lp.x >= minX - hitR && lp.x <= maxX + hitR && lp.y >= minY - hitR && lp.y <= maxY + hitR;
    } else {
      const pts = [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY }
      ];
      return distToPoly(lp.x, lp.y, pts) <= hitR;
    }
  }
  
  // 5. Polygons / Geometric Shapes (triangle, diamond, star, hexagon)
  if(["triangle", "diamond", "star", "hexagon"].includes(el.type)){
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    const lp = el.rotation ? rotatePoint(wp.x, wp.y, cx, cy, -el.rotation) : wp;
    const pts = shapePoints(el);
    const hitR = tol + (el.width || 2) * 0.5;
    if(el.fill){
      return pointInPoly(lp.x, lp.y, pts) || distToPoly(lp.x, lp.y, pts) <= hitR;
    } else {
      return distToPoly(lp.x, lp.y, pts) <= hitR;
    }
  }
  
  // 6. Heart shape
  if(el.type === "heart"){
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    const lp = el.rotation ? rotatePoint(wp.x, wp.y, cx, cy, -el.rotation) : wp;
    const hitR = tol + (el.width || 2) * 0.5;
    const w = el.w, h = el.h, x = el.x, y = el.y;
    const pts = [
      { x: cx, y: y + h * 0.35 },
      { x: x + w * 0.8, y: y },
      { x: x + w, y: y + h * 0.3 },
      { x: cx, y: y + h },
      { x: x, y: y + h * 0.3 },
      { x: x + w * 0.2, y: y }
    ];
    if(el.fill){
      return pointInPoly(lp.x, lp.y, pts) || distToPoly(lp.x, lp.y, pts) <= hitR;
    } else {
      return distToPoly(lp.x, lp.y, pts) <= hitR;
    }
  }

  // 7. Text, Sticky notes, Images, PDFs, Emoji, Ruler, Protractor, Axes, Compass, Timer
  const b = getBounds(el);
  const c = getCenter(b);
  const lp = el.rotation ? rotatePoint(wp.x, wp.y, c.x, c.y, -el.rotation) : wp;
  const pad = el.type === "text" ? 8 : 6;
  return lp.x >= b.x - pad && lp.x <= b.x + b.w + pad && lp.y >= b.y - pad && lp.y <= b.y + b.h + pad;
}

function hitElement(wp){
  for(let i = state.elements.length - 1; i >= 0; i--){
    const el = state.elements[i];
    if(isPointInElementGeometry(el, wp)){
      return el;
    }
  }
  return null;
}
const selToolbar=document.getElementById("selection-toolbar");
function showToolbar(el, opts={}){
  if(!selToolbar) return;
  if(!el && state.selectedIds.length<=1){
    selToolbar.classList.add("hidden");
    hideStickyRail();
    return;
  }
  if(state.selectedIds.length>1){
    showMultiToolbar();
    return;
  }
  selToolbar.classList.remove("hidden");
  const dot=document.getElementById("st-color-dot");
  if(dot) dot.style.background=el.color||DEFAULT_TEXT_COLOR;
  const lockBtn=document.getElementById("st-lock");
  if(lockBtn) lockBtn.innerHTML=`<i data-lucide="${el.locked?'lock':'lock-open'}" class="w-4 h-4 ${el.locked?'text-amber-600':''}"></i>`;
  const compact=!!(opts.compact || el._fresh);
  ["st-copy","st-duplicate","st-lock","st-more","st-edit"].forEach(id=>{
    const n=document.getElementById(id); if(n) n.classList.toggle("hidden", compact);
  });
  lucideCreateIcons({nodes:[lockBtn, selToolbar].filter(Boolean)});
  const isTextish=["text","sticky"].includes(el.type);
  const fontBtn=document.getElementById("st-font");
  const sizeBtn=document.getElementById("st-size");
  if(fontBtn) fontBtn.classList.toggle("hidden", !isTextish);
  if(sizeBtn) sizeBtn.classList.toggle("hidden", !isTextish);
  const boldBtn=document.getElementById("st-bold");
  const isBoldActive=!!(el && (el.bold || el.isBoldShape));
  if(boldBtn) boldBtn.classList.toggle("bg-slate-200", isBoldActive);
  positionToolbar();
  if(el.type==="sticky") showStickyRail(el); else hideStickyRail();
}
function showMultiToolbar(){
  if(!selToolbar || state.selectedIds.length<=1) return;
  selToolbar.classList.remove("hidden");
  const dot=document.getElementById("st-color-dot");
  if(dot) dot.style.background="#2563eb";
  const lockBtn=document.getElementById("st-lock");
  const anyLocked=state.selectedIds.some(id=>{const el=state.elements.find(e=>e.id===id); return el&&el.locked;});
  if(lockBtn) lockBtn.innerHTML=`<i data-lucide="${anyLocked?'lock':'lock-open'}" class="w-4 h-4 ${anyLocked?'text-amber-600':''}"></i>`;
  ["st-copy","st-duplicate","st-lock","st-more"].forEach(id=>{
    const n=document.getElementById(id); if(n) n.classList.remove("hidden");
  });
  const editBtn=document.getElementById("st-edit"); if(editBtn) editBtn.classList.add("hidden");
  const fontBtn=document.getElementById("st-font"); if(fontBtn) fontBtn.classList.add("hidden");
  const sizeBtn=document.getElementById("st-size"); if(sizeBtn) sizeBtn.classList.add("hidden");
  const boldBtn=document.getElementById("st-bold");
  const anyBold=state.selectedIds.some(id=>{const el=state.elements.find(x=>x.id===id); return el&&(el.bold||el.isBoldShape);});
  if(boldBtn) boldBtn.classList.toggle("bg-slate-200", anyBold);
  lucideCreateIcons({nodes:[lockBtn, selToolbar].filter(Boolean)});
  positionToolbar();
  hideStickyRail();
}
function hideToolbar(){
  if(selToolbar) selToolbar.classList.add("hidden");
  closeAllSmallPalettes();
  hideStickyRail();
}
function closeAllSmallPalettes(){
  const cp=document.getElementById("st-color-palette"); if(cp) cp.classList.add("hidden");
  const bp=document.getElementById("st-bold-palette"); if(bp) bp.classList.add("hidden");
  const mp=document.getElementById("st-more-palette"); if(mp) mp.classList.add("hidden");
  const fp=document.getElementById("st-font-palette"); if(fp) fp.classList.add("hidden");
  const sp=document.getElementById("st-size-palette"); if(sp) sp.classList.add("hidden");
}
function positionToolbar(){
  if(!selToolbar) return;
  const tw=selToolbar.offsetWidth||240, th=selToolbar.offsetHeight||40;
  const margin=8;
  const PALETTE=250;
  let left, top;
  const sel=state.elements.find(e=>e.id===state.selectedId)||state.elements.find(e=>e.id===state.inlineEditingId);
  if(inlineBox){
    const r=inlineBox.getBoundingClientRect();
    const spaceRight = innerWidth - r.right - margin;
    const spaceLeft = r.left - margin;
    
    // Position to the side of the box while editing so text remains completely visible
    if(spaceRight >= tw + 14 || spaceRight >= spaceLeft){
      left = r.right + 14;
      selToolbar.classList.remove("toolbar-on-left");
      selToolbar.classList.add("toolbar-on-right");
    } else {
      left = r.left - tw - 14;
      selToolbar.classList.remove("toolbar-on-right");
      selToolbar.classList.add("toolbar-on-left");
    }
    
    top = r.top;
    if(top + th + PALETTE > innerHeight && r.bottom > PALETTE){
      top = Math.max(margin, r.bottom - th);
      selToolbar.classList.add("flip-palettes");
    } else {
      selToolbar.classList.remove("flip-palettes");
    }
  } else if(state.selectedIds.length>1){
    selToolbar.classList.remove("toolbar-on-left", "toolbar-on-right");
    const b=getMultiBounds(state.selectedIds), sc=toScreen(b.x+b.w/2, b.y);
    left=sc.x-tw/2; top=sc.y-62;
    if(top<margin){
      const bottom=toScreen(b.x, b.y+b.h).y;
      top=Math.min(innerHeight-th-margin, bottom+14);
    }
  } else {
    if(!sel)return;
    selToolbar.classList.remove("toolbar-on-left", "toolbar-on-right");
    const b=getBounds(sel),sc=toScreen(b.x+b.w/2,b.y);
    left=sc.x-tw/2; top=sc.y-62;
    if(top<margin){
      const bottom=toScreen(b.x,b.y+b.h).y;
      top=Math.min(innerHeight-th-margin, bottom+14);
    }
  }
  left=Math.max(margin,Math.min(innerWidth-tw-margin,left));
  top=Math.max(margin,Math.min(innerHeight-th-margin,top));
  selToolbar.classList.toggle("palettes-down", top < 180);
  selToolbar.style.left=left+"px";selToolbar.style.top=top+"px";
  if(sel && sel.type==="sticky" && state.selectedIds.length<=1) positionStickyRail(sel);
}
function deselect(){
  if(state.selectedId||state.editArmed||state.selectedIds.length){
    state.selectedId=null; state.selectedIds=[]; state.editArmed=null; hideToolbar(); render();
  }
}

let inlineBox=null,inlineEditor=null,inlineWorldPos=null,inlineWorldAnchor=null;
function updateInlineEditorTransform(){
  if(!inlineBox||!inlineWorldPos) return;
  const existing=state.elements.find(e=>e.id===state.inlineEditingId);
  const host=container.parentElement;
  const hr=host.getBoundingClientRect();
  const z=state.camera.zoom;
  if(existing&&existing.type==="sticky"){
    const sc=toScreen(existing.x,existing.y);
    inlineBox.style.left=(sc.x-hr.left)+"px";
    inlineBox.style.top=(sc.y-hr.top)+"px";
    inlineBox.style.width=(existing.w*z)+"px";
    inlineBox.style.height=(existing.h*z)+"px";
    inlineBox.style.transformOrigin="center center";
    inlineBox.style.transform=existing.rotation?`rotate(${existing.rotation}deg)`:"none";
  } else {
    const el=existing;
    const x=el?el.x:inlineWorldPos.x;
    const y=el?el.y:inlineWorldPos.y;
    const w=el?el.w:inlineWorldPos.w;
    const h=el?el.h:(inlineWorldPos.h||(el?.size||18)*1.25);
    const sc=toScreen(x,y);
    inlineBox.style.display="block";
    inlineBox.style.left=(sc.x-hr.left)+"px";
    inlineBox.style.top=(sc.y-hr.top)+"px";
    inlineBox.style.width=Math.max(8,w*z)+"px";
    inlineBox.style.height=Math.max(12,h*z)+"px";
    inlineBox.style.minHeight=Math.max(12,h*z)+"px";
    inlineBox.style.transformOrigin="center center";
    const rot=el&&el.rotation?el.rotation:0;
    inlineBox.style.transform=rot?`rotate(${rot}deg)`:"none";
  }
  const sz=(existing?.size||inlineWorldPos.size||18)*z;
  if(inlineEditor){inlineEditor.style.fontSize=sz+"px";}
}
function placeCaretAtEnd(node){
  const range=document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  const sel=window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}
function syncTextAnchor(el){
  if(el && el.type==="text" && el.rotation && inlineWorldAnchor){
    const rad=el.rotation*Math.PI/180;
    const cos=Math.cos(rad), sin=Math.sin(rad);
    const w=el.w, h=el.h;
    el.x=inlineWorldAnchor.x - (w/2)*(1 - cos) - (h/2)*sin;
    el.y=inlineWorldAnchor.y - (h/2)*(1 - cos) + (w/2)*sin;
  }
}
function createInlineEditor(wp,existing=null,opts={}){
  if(inlineBox) commitInlineEditor();
  const isSticky=existing && existing.type==="sticky";
  const readable=getReadableSize();
  if(!existing){
    pushUndo();
    existing={id:genId(),type:"text",text:"",x:wp.x,y:wp.y,w:24,h:readable*1.25,color:DEFAULT_TEXT_COLOR,size:readable,font:"Segoe UI,Inter,system-ui,sans-serif",rotation:0,isPlaceholder:true,_fresh:true};
    fitTextElement(existing);
    state.elements.push(existing);
    state.selectedId=existing.id;
    saveBoards();
  } else if(existing.type==="text"){
    fitTextElement(existing);
  }
  if(existing.type==="text" && existing.rotation){
    const rad=(existing.rotation||0)*Math.PI/180;
    const cos=Math.cos(rad), sin=Math.sin(rad);
    const w=existing.w||24, h=existing.h||20;
    inlineWorldAnchor={
      x:existing.x + w/2 - (w/2)*cos + (h/2)*sin,
      y:existing.y + h/2 - (w/2)*sin - (h/2)*cos
    };
  } else {
    inlineWorldAnchor=null;
  }
  inlineWorldPos={x:existing.x,y:existing.y,w:existing.w||24,h:existing.h||40,size:existing.size||readable};
  const host=container.parentElement;
  const hr=host.getBoundingClientRect();
  const sc=toScreen(existing.x,existing.y), z=state.camera.zoom;
  inlineBox=document.createElement("div");
  const left=sc.x-hr.left, top=sc.y-hr.top;
  if(isSticky){
    inlineBox.className="inline-sticky-editor";
    inlineBox.style.cssText=`position:absolute;left:${left}px;top:${top}px;width:${existing.w*z}px;height:${existing.h*z}px;z-index:50;background:transparent;margin:0;padding:0;border:0;border-radius:14px;overflow:hidden;`;
    inlineBox.style.transformOrigin="center center";
    if(existing.rotation) inlineBox.style.transform=`rotate(${existing.rotation}deg)`;
  } else {
    inlineBox.className="inline-text-host";
    inlineBox.style.cssText=`position:absolute;left:${left}px;top:${top}px;width:${Math.max(8,(existing.w||24)*z)}px;height:${Math.max(12,(existing.h||(existing.size||18)*1.25)*z)}px;z-index:50;background:transparent;display:block;overflow:visible;margin:0;padding:0;border:0;`;
    inlineBox.style.transformOrigin="center center";
    if(existing.rotation) inlineBox.style.transform=`rotate(${existing.rotation}deg)`;
  }
  inlineEditor=document.createElement("div");
  inlineEditor.id="inline-text-editor";
  inlineEditor.contentEditable="true";
  inlineEditor.spellcheck=false;
  const initText=existing && !existing.isPlaceholder ? (existing.text||"") : "";
  inlineEditor.innerText=initText;
  const pad=isSticky ? 8*z : 0;
  if(isSticky){
    inlineEditor.style.cssText=`padding:${pad}px;padding-right:${Math.max(6, 8*z)}px;margin:0;border:0;color:${existing.color||DEFAULT_TEXT_COLOR};font-size:${(existing.size||16)*z}px;font-family:${existing.font||"Segoe UI,Inter,system-ui,sans-serif"};font-weight:${existing.bold?"700":"400"};font-style:${existing.italic?"italic":"normal"};text-decoration:${existing.underline?"underline":"none"};outline:none;line-height:1.35;width:100%;height:100%;background:transparent;white-space:pre-wrap;word-break:break-word;box-sizing:border-box;caret-color:${existing.color||DEFAULT_TEXT_COLOR};overflow-y:auto;overflow-x:hidden;`;
    inlineEditor.addEventListener("wheel", e => {
      e.stopPropagation();
    }, { passive: true });
  } else {
    inlineEditor.style.cssText=`padding:${pad}px;margin:0;border:0;color:${existing.color||DEFAULT_TEXT_COLOR};font-size:${(existing.size||18)*z}px;font-family:${existing.font||"Segoe UI,Inter,system-ui,sans-serif"};font-weight:${existing.bold?"700":"400"};font-style:${existing.italic?"italic":"normal"};text-decoration:${existing.underline?"underline":"none"};outline:none;line-height:1.25;width:100%;height:100%;background:transparent;white-space:pre;box-sizing:border-box;caret-color:${existing.color||DEFAULT_TEXT_COLOR};overflow:visible;`;
  }
  inlineBox.appendChild(inlineEditor);
  host.appendChild(inlineBox);
  state.inlineEditingId=existing.id;
  state.selectedId=existing.id;
  showToolbar(existing, {compact: !!existing._fresh});
  render();
  setTimeout(()=>{
    inlineEditor.focus();
    if(opts.selectAll) document.execCommand("selectAll",false,null);
    else placeCaretAtEnd(inlineEditor);
  },10);
  inlineEditor.addEventListener("keydown",e=>{
    if(e.key==="Escape"){e.preventDefault();commitInlineEditor();return;}
    if(e.key==="Enter" && (e.ctrlKey||e.metaKey)){e.preventDefault();commitInlineEditor();return;}
    if(e.key==="Enter" && !e.shiftKey){
      e.preventDefault();
      document.execCommand("insertLineBreak");
      inlineEditor.dispatchEvent(new Event("input",{bubbles:true}));
    }
  });
  inlineEditor.addEventListener("paste", e => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData)?.getData("text/plain") || "";
    document.execCommand("insertText", false, text);
    const el = state.elements.find(item => item.id === state.inlineEditingId);
    if(el){
      el.text = inlineEditor.innerText;
      el.isPlaceholder = !el.text.trim();
      if(el.type === "text"){
        fitTextElement(el);
        syncTextAnchor(el);
        updateInlineEditorTransform();
        positionToolbar();
        render();
      }
    }
  });
  inlineEditor.addEventListener("input",()=>{
    const t=inlineEditor.innerText;
    const el=state.elements.find(e=>e.id===state.inlineEditingId);
    if(el){
      el.text=t; el.isPlaceholder=!t.trim();
      if(el.type==="text"){
        fitTextElement(el);
        syncTextAnchor(el);
        updateInlineEditorTransform();
        positionToolbar();
        render();
      }
    }
  });
}
function commitInlineEditor(){
  if(!inlineEditor||!inlineBox) return;
  let text=inlineEditor.innerText;
  if(text.trim()==="Test"||text.trim()==="Type here") text="";
  const id=state.inlineEditingId;
  const el=id?state.elements.find(e=>e.id===id):null;
  if(el){
    if(!text.trim()){
      if(el.type==="sticky"){
        el.text=""; el.isPlaceholder=true; delete el._fresh;
      } else if(el._fresh || el.isPlaceholder){
        state.elements=state.elements.filter(e=>e.id!==el.id);
        if(state.selectedId===el.id) state.selectedId=null;
      } else {
        el.text=""; el.isPlaceholder=true;
        if(el.type==="text"){
          fitTextElement(el);
          syncTextAnchor(el);
        }
      }
    } else {
      el.text=text; el.isPlaceholder=false; delete el._fresh;
      if(el.type==="text"){
        fitTextElement(el);
        syncTextAnchor(el);
      }
    }
    saveBoards();
  }
  cleanupInlineEditor();
  render();
  setActiveTool("select", {keepSelection:true});
  if(state.selectedId){const s=state.elements.find(e=>e.id===state.selectedId); if(s) showToolbar(s);}
}
document.addEventListener("pointerdown",e=>{
  if(!inlineBox) return;
  const t=e.target;
  if(!(t instanceof Element)) return;
  if(inlineBox.contains(t)) return;
  if(t.closest("#selection-toolbar")||t.closest("#sticky-color-rail")||t.closest("#right-click-menu")||t.closest("#board")) return;
  commitInlineEditor();
},true);
addEventListener("blur",()=>{ if(inlineBox) commitInlineEditor(); });
function cleanupInlineEditor(){if(inlineBox)inlineBox.remove();inlineBox=null;inlineEditor=null;inlineWorldPos=null;inlineWorldAnchor=null;state.inlineEditingId=null;}
const rcMenu=document.getElementById("right-click-menu");
function showRC(sx,sy,wx,wy){
  state.rightClickPos={wx,wy};
  if(rcMenu){
    rcMenu.style.left=sx+"px";
    rcMenu.style.top=sy+"px";
    rcMenu.classList.remove("hidden");
  }
}
function hideRC(){if(rcMenu) rcMenu.classList.add("hidden");}
function copyElementToClipboard(el){
  if(state.selectedIds.length>1){
    copySelectedToClipboard();
    return;
  }
  if(!el) return;
  const clone=JSON.parse(JSON.stringify(el));
  delete clone.img; delete clone._handles; delete clone._fadeInterval;
  state.internalClipboard=clone;
  const text=el.type==="emoji"?el.text:(el.text||"");
  try{
    if(text) navigator.clipboard.writeText(text);
    else navigator.clipboard.writeText("");
  }catch(e){}
}
function targetCopyElement(){
  if(state.selectedId){
    const sel=state.elements.find(e=>e.id===state.selectedId);
    if(sel) return sel;
  }
  if(state.hoveredId){
    const h=state.elements.find(e=>e.id===state.hoveredId);
    if(h) return h;
  }
  const hit=hitElement({x:state.lastMouse.wx,y:state.lastMouse.wy});
  return hit||null;
}
const _rcCreateText = document.getElementById("rc-create-text");
if(_rcCreateText) _rcCreateText.onclick=()=>{hideRC();createInlineEditor({x:state.rightClickPos.wx,y:state.rightClickPos.wy});};
const _rcCopy = document.getElementById("rc-copy");
if(_rcCopy) _rcCopy.onclick=()=>{hideRC();if(state.selectedIds.length>1){copySelectedToClipboard();}else{const el=targetCopyElement(); if(el) copyElementToClipboard(el);}};
const _rcDup = document.getElementById("rc-duplicate");
if(_rcDup) _rcDup.onclick=()=>{hideRC(); if(state.selectedIds.length>1){duplicateSelected();return;} if(!state.selectedId){const el=targetCopyElement(); if(el) state.selectedId=el.id;} duplicateSelected()};
const _rcDel = document.getElementById("rc-delete");
if(_rcDel) _rcDel.onclick=()=>{hideRC(); if(state.selectedIds.length>1){deleteSelected();return;} if(!state.selectedId){const el=targetCopyElement(); if(el) state.selectedId=el.id;} deleteSelected()};
function hideImageImportModals(){
  const modals = [
    "image-import-choice-modal",
    "image-conversion-progress-modal",
    "image-conversion-summary-modal",
    "image-conversion-error-modal",
  ];
  modals.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.classList.add("hidden");
  });
}

function showImageImportChoiceModal(file, originX, originY){
  hideImageImportModals();
  const modal = document.getElementById("image-import-choice-modal");
  const thumb = document.getElementById("image-import-preview-thumb");
  const nameEl = document.getElementById("image-import-filename");
  const dimsEl = document.getElementById("image-import-dims");
  if(!modal) return;

  const reader = new FileReader();
  reader.onload = ev => {
    const dataUrl = ev.target.result;
    if(thumb) thumb.src = dataUrl;
    if(nameEl) nameEl.textContent = file.name || "screenshot.png";

    const img = new Image();
    img.onload = () => {
      if(dimsEl) dimsEl.textContent = `${img.naturalWidth || img.width} × ${img.naturalHeight || img.height} px`;
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);

  modal.classList.remove("hidden");
  if(window.lucide && window.lucide.createIcons) window.lucide.createIcons();

  const btnConvert = document.getElementById("btn-choice-convert-whiteboard");
  const btnInsertImg = document.getElementById("btn-choice-insert-image");
  const btnClose = document.getElementById("btn-close-image-import");
  const btnCancel = document.getElementById("btn-cancel-image-import");

  if(btnConvert){
    btnConvert.onclick = () => {
      hideImageImportModals();
      startImageConversion(file, originX, originY);
    };
  }

  if(btnInsertImg){
    btnInsertImg.onclick = () => {
      hideImageImportModals();
      insertFileAsStandardImage(file, originX, originY);
    };
  }

  if(btnClose) btnClose.onclick = () => hideImageImportModals();
  if(btnCancel) btnCancel.onclick = () => hideImageImportModals();
}

async function startImageConversion(file, originX, originY){
  hideImageImportModals();
  const progressModal = document.getElementById("image-conversion-progress-modal");
  const progressStatus = document.getElementById("conversion-progress-status");
  if(progressModal) progressModal.classList.remove("hidden");
  if(progressStatus) progressStatus.textContent = "Analyzing image with AI vision...";
  if(window.lucide && window.lucide.createIcons) window.lucide.createIcons();

  try {
    const importer = window.SmartImageImporter;
    if(!importer){
      throw new Error("Smart Image Importer module is initializing, please try again in a moment.");
    }

    const prepared = await importer.prepareImageForAnalysis(file);
    if(progressStatus) progressStatus.textContent = "Recognizing shapes, text & diagrams...";

    const aiResult = await importer.analyzeWhiteboardImage(prepared, (status) => {
      if(progressStatus) progressStatus.textContent = status;
    });

    if(progressStatus) progressStatus.textContent = "Reconstructing whiteboard objects...";

    const targetCenter = (originX != null && originY != null) ? { x: originX, y: originY } : getViewportCenter();
    const reconstructed = importer.reconstructWhiteboardElements(aiResult, prepared.originalImg, {
      targetCenter,
    });

    if(progressModal) progressModal.classList.add("hidden");
    showConversionSummary(reconstructed, prepared, targetCenter, file);
  } catch(err){
    console.error("Conversion failed:", err);
    if(progressModal) progressModal.classList.add("hidden");
    showConversionError(err, file, originX, originY);
  }
}

function showConversionSummary(reconstructed, prepared, targetCenter, file){
  hideImageImportModals();
  const modal = document.getElementById("image-conversion-summary-modal");
  if(!modal) return;

  const counts = {
    text: 0,
    sticky: 0,
    shapes: 0,
    arrows: 0,
    drawings: 0,
    images: 0
  };

  reconstructed.elements.forEach(el => {
    if(el.type === "text") counts.text++;
    else if(el.type === "sticky") counts.sticky++;
    else if(el.type === "arrow" || el.type === "line" || el.type === "doubleArrow" || el.type === "dashed") counts.arrows++;
    else if(el.type === "pen" || el.type === "highlighter") counts.drawings++;
    else if(el.type === "image") counts.images++;
    else counts.shapes++;
  });

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if(el) el.textContent = String(val);
  };

  setText("sum-text-count", counts.text);
  setText("sum-sticky-count", counts.sticky);
  setText("sum-shapes-count", counts.shapes);
  setText("sum-arrows-count", counts.arrows);
  setText("sum-drawings-count", counts.drawings);
  setText("sum-images-count", counts.images);

  const chkBackup = document.getElementById("chk-keep-original-image");
  if(chkBackup) chkBackup.checked = false;

  modal.classList.remove("hidden");
  if(window.lucide && window.lucide.createIcons) window.lucide.createIcons();

  const btnInsertCurrent = document.getElementById("btn-insert-reconstructed-current");
  const btnInsertNew = document.getElementById("btn-insert-reconstructed-new");
  const btnFallback = document.getElementById("btn-fallback-insert-image");
  const btnClose = document.getElementById("btn-close-summary-modal");

  if(btnInsertCurrent){
    btnInsertCurrent.onclick = () => {
      hideImageImportModals();
      applyReconstructedElementsToCurrentBoard(reconstructed, chkBackup?.checked, prepared.originalImg);
    };
  }

  if(btnInsertNew){
    btnInsertNew.onclick = () => {
      hideImageImportModals();
      applyReconstructedElementsToNewBoard(reconstructed, chkBackup?.checked, prepared.originalImg, reconstructed.title);
    };
  }

  if(btnFallback){
    btnFallback.onclick = () => {
      hideImageImportModals();
      insertSingleStandardImage(prepared.dataUrl, prepared.originalImg, targetCenter.x, targetCenter.y);
    };
  }

  if(btnClose){
    btnClose.onclick = () => hideImageImportModals();
  }
}

function applyReconstructedElementsToCurrentBoard(reconstructed, keepBackup, originalImg){
  pushUndo();
  const elementsToAdd = [...reconstructed.elements];

  if(keepBackup && originalImg){
    const backupW = reconstructed.bounds.width;
    const backupH = reconstructed.bounds.height;
    const backupX = reconstructed.bounds.x - backupW - 48;
    const backupY = reconstructed.bounds.y;
    const backupEl = {
      id: genId(),
      type: "image",
      src: originalImg.src,
      img: originalImg,
      x: backupX,
      y: backupY,
      w: backupW,
      h: backupH,
      rotation: 0
    };
    elementsToAdd.unshift(backupEl);
  }

  elementsToAdd.forEach(el => {
    if(el.type === "image" && !el.img && el.src){
      const img = new Image();
      img.onload = render;
      img.src = el.src;
      el.img = img;
    }
  });

  state.elements.push(...elementsToAdd);
  const newIds = elementsToAdd.map(e => e.id);
  state.selectedIds = newIds;
  state.selectedId = newIds.length === 1 ? newIds[0] : null;
  setActiveTool("select", { keepSelection: true });

  if(newIds.length === 1 && elementsToAdd[0]) showToolbar(elementsToAdd[0]);
  else if(newIds.length > 1) showMultiToolbar();

  saveBoards(true);
  render();
  showSmartToast(`✨ Reconstructed ${reconstructed.elements.length} editable whiteboard objects!`, "✨");
}

function applyReconstructedElementsToNewBoard(reconstructed, keepBackup, originalImg, title){
  const elementsToAdd = [...reconstructed.elements];

  if(keepBackup && originalImg){
    const backupW = reconstructed.bounds.width;
    const backupH = reconstructed.bounds.height;
    const backupX = reconstructed.bounds.x - backupW - 48;
    const backupY = reconstructed.bounds.y;
    const backupEl = {
      id: genId(),
      type: "image",
      src: originalImg.src,
      img: originalImg,
      x: backupX,
      y: backupY,
      w: backupW,
      h: backupH,
      rotation: 0
    };
    elementsToAdd.unshift(backupEl);
  }

  elementsToAdd.forEach(el => {
    if(el.type === "image" && !el.img && el.src){
      const img = new Image();
      img.onload = render;
      img.src = el.src;
      el.img = img;
    }
  });

  const boardName = title || "Imported Whiteboard";
  const newBoard = Store && Store.blankBoard ? Store.blankBoard(boardName) : {
    id: "b" + Math.random().toString(36).slice(2) + Date.now().toString(36),
    name: boardName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    elements: [],
    camera: { x: 0, y: 0, zoom: 1 },
    gridStyle: "none",
    gridSpacing: 24,
    bgColor: "#ffffff",
    theme: "classlight",
    toolbarPos: "bottom",
    stickyAutoEdit: true,
    thumb: null,
  };

  newBoard.elements = elementsToAdd;

  const boundsCenterX = reconstructed.bounds.x + reconstructed.bounds.width / 2;
  const boundsCenterY = reconstructed.bounds.y + reconstructed.bounds.height / 2;
  newBoard.camera = {
    x: Math.round(window.innerWidth / 2 - boundsCenterX),
    y: Math.round(window.innerHeight / 2 - boundsCenterY),
    zoom: 1
  };

  state.whiteboards.unshift(newBoard);
  if(Store && Store.putBoard){
    Store.putBoard(newBoard).catch(e => console.warn(e));
  }
  state.currentBoardId = newBoard.id;
  syncBoardUrl(newBoard.id);
  applyBoardRecord(newBoard);
  saveBoards(true);
  render();
  showSmartToast(`✨ Created new whiteboard with ${reconstructed.elements.length} editable objects!`, "✨");
}

function showConversionError(err, file, originX, originY){
  hideImageImportModals();
  const modal = document.getElementById("image-conversion-error-modal");
  const msgEl = document.getElementById("conversion-error-msg");
  if(msgEl){
    msgEl.textContent = err?.message || "Could not analyze the image. You can try again or insert it as a standard image.";
  }
  if(modal) modal.classList.remove("hidden");
  if(window.lucide && window.lucide.createIcons) window.lucide.createIcons();

  const btnRetry = document.getElementById("btn-error-retry");
  const btnInsertAsImg = document.getElementById("btn-error-insert-as-image");
  const btnCancel = document.getElementById("btn-error-cancel");

  if(btnRetry){
    btnRetry.onclick = () => {
      hideImageImportModals();
      startImageConversion(file, originX, originY);
    };
  }

  if(btnInsertAsImg){
    btnInsertAsImg.onclick = () => {
      hideImageImportModals();
      insertFileAsStandardImage(file, originX, originY);
    };
  }

  if(btnCancel){
    btnCancel.onclick = () => hideImageImportModals();
  }
}

function insertFileAsStandardImage(file, originX, originY){
  const reader = new FileReader();
  reader.onload = ev => {
    const dataUrl = ev.target.result;
    const img = new Image();
    img.onload = () => {
      const targetCenter = (originX != null && originY != null) ? { x: originX, y: originY } : getViewportCenter();
      insertSingleStandardImage(dataUrl, img, targetCenter.x, targetCenter.y);
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

function insertSingleStandardImage(dataUrl, img, centerX, centerY){
  const maxDim = 520;
  let w = img.naturalWidth || img.width || 480;
  let h = img.naturalHeight || img.height || 360;
  if(w > maxDim || h > maxDim){
    if(w >= h){ h = Math.round((h / w) * maxDim); w = maxDim; }
    else { w = Math.round((w / h) * maxDim); h = maxDim; }
  }

  const posX = Math.round(centerX - w / 2);
  const posY = Math.round(centerY - h / 2);
  const id = genId();

  pushUndo();
  const el = {
    id,
    type: "image",
    src: dataUrl,
    img,
    x: posX,
    y: posY,
    w,
    h,
    rotation: 0
  };
  state.elements.push(el);
  state.selectedIds = [id];
  state.selectedId = id;
  setActiveTool("select", { keepSelection: true });
  showToolbar(el);
  saveBoards(true);
  render();
}

async function insertClipboardImageBlobs(imageBlobs, targetX, targetY){
  const allBlobs = Array.from(imageBlobs || []).filter(Boolean);
  if(!allBlobs.length) return;

  const loadedList = [];
  for(const blob of allBlobs){
    await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target.result;
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
          let w = img.naturalWidth || img.width || 480;
          let h = img.naturalHeight || img.height || 360;
          if(w > maxDim || h > maxDim){
            if(w >= h){ h = Math.round((h / w) * maxDim); w = maxDim; }
            else { w = Math.round((w / h) * maxDim); h = maxDim; }
          }
          loadedList.push({ src: dataUrl, img, w, h });
          resolve();
        };
        img.onerror = () => resolve();
        img.src = dataUrl;
      };
      reader.onerror = () => resolve();
      reader.readAsDataURL(blob);
    });
  }

  if(!loadedList.length) return;

  const N = loadedList.length;
  const cols = N === 1 ? 1 : (N <= 4 ? 2 : (N <= 9 ? 3 : 4));
  const gap = 32;
  const colWidths = new Array(cols).fill(0);
  const rowsCount = Math.ceil(N / cols);
  const rowHeights = new Array(rowsCount).fill(0);

  for(let i = 0; i < N; i++){
    const c = i % cols, r = Math.floor(i / cols);
    colWidths[c] = Math.max(colWidths[c], loadedList[i].w);
    rowHeights[r] = Math.max(rowHeights[r], loadedList[i].h);
  }

  const totalW = colWidths.reduce((a, b) => a + b, 0) + (cols - 1) * gap;
  const totalH = rowHeights.reduce((a, b) => a + b, 0) + (rowsCount - 1) * gap;

  const colXOffsets = [0];
  for(let c = 1; c < cols; c++) colXOffsets[c] = colXOffsets[c - 1] + colWidths[c - 1] + gap;
  const rowYOffsets = [0];
  for(let r = 1; r < rowsCount; r++) rowYOffsets[r] = rowYOffsets[r - 1] + rowHeights[r - 1] + gap;

  const targetCenter = (targetX != null && targetY != null) ? { x: targetX, y: targetY } : getMouseOrViewportWorld();
  const startX = Math.round(targetCenter.x - totalW / 2);
  const startY = Math.round(targetCenter.y - totalH / 2);

  pushUndo();
  const newEls = [];
  const newIds = [];
  loadedList.forEach((item, idx) => {
    const c = idx % cols, r = Math.floor(idx / cols);
    const cellX = startX + colXOffsets[c];
    const cellY = startY + rowYOffsets[r];
    const posX = Math.round(cellX + (colWidths[c] - item.w) / 2);
    const posY = Math.round(cellY + (rowHeights[r] - item.h) / 2);
    const id = genId();
    newIds.push(id);
    newEls.push({
      id,
      type: "image",
      src: item.src,
      img: item.img,
      x: posX,
      y: posY,
      w: item.w,
      h: item.h,
      rotation: 0
    });
  });

  state.elements.push(...newEls);
  state.selectedIds = newIds;
  state.selectedId = newIds.length === 1 ? newIds[0] : null;
  setActiveTool("select", { keepSelection: true });
  if(newIds.length === 1) showToolbar(newEls[0]);
  else if(newIds.length > 1) showMultiToolbar();
  saveBoards(true);
  render();
}

async function handlePastedOrUploadedImages(fileList, originX, originY){
  const allFiles = Array.from(fileList||[]);
  if(!allFiles.length) return;
  
  const regularImageFiles = [];
  const loadedList = [];

  for(const file of allFiles){
    if(!file) continue;

    // Check if file is a Smart PNG with embedded canvas metadata
    const isPng = file.type === "image/png" || /\.png$/i.test(file.name||"");
    if(isPng){
      let smartData = null;
      try {
        const engine = await getSmartPngEngine();
        smartData = await engine.extractSmartPngMetadata(file);
      } catch(e){
        console.warn("Smart PNG extraction error:", e);
      }

      if(smartData && Array.isArray(smartData.elements) && smartData.elements.length > 0){
        // Calculate bounding box of restored elements
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        smartData.elements.forEach(el => {
          const b = getBounds(el);
          minX = Math.min(minX, b.x);
          minY = Math.min(minY, b.y);
          maxX = Math.max(maxX, b.x + b.w);
          maxY = Math.max(maxY, b.y + b.h);
        });

        const isCurrentCanvasEmpty = state.elements.length === 0;
        let dx = 0, dy = 0;
        if(!isCurrentCanvasEmpty && originX != null && originY != null && isFinite(minX)){
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          dx = Math.round(originX - centerX);
          dy = Math.round(originY - centerY);
        }

        pushUndo();
        const newIds = [];
        const restoredEls = [];

        smartData.elements.forEach(el => {
          const clone = JSON.parse(JSON.stringify(el));
          clone.id = genId();
          newIds.push(clone.id);
          if(dx !== 0 || dy !== 0){
            if(clone.points && Array.isArray(clone.points)){
              clone.points = clone.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
            }
            if(clone.x != null) clone.x += dx;
            if(clone.y != null) clone.y += dy;
          }
          if(clone.type === "image" && clone.src){
            const img = new Image();
            img.onload = render;
            img.src = clone.src;
            clone.img = img;
          }
          restoredEls.push(clone);
        });

        if(isCurrentCanvasEmpty){
          if(smartData.bgColor) state.bgColor = smartData.bgColor;
          if(smartData.theme) applyTheme(smartData.theme);
          if(smartData.gridStyle) state.gridStyle = smartData.gridStyle;
          if(smartData.gridSpacing) state.gridSpacing = smartData.gridSpacing;
          if(smartData.name){
            const titleEl = document.getElementById("board-title");
            if(titleEl) titleEl.value = smartData.name;
            const curB = currentBoardRecord();
            if(curB) curB.name = smartData.name;
          }
        }

        state.elements.push(...restoredEls);
        state.selectedIds = newIds;
        state.selectedId = newIds.length === 1 ? newIds[0] : null;
        setActiveTool("select", { keepSelection: true });
        if(newIds.length === 1 && restoredEls[0]) showToolbar(restoredEls[0]);
        else if(newIds.length > 1) showMultiToolbar();
        saveBoards(true);
        render();
        showSmartToast(`✨ Smart PNG: ${restoredEls.length} editable elements restored!`, "✨");
        continue;
      }
    }

    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name||"");
    if(isPdf && typeof window.renderPdfToImages === "function"){
      try{
        const pdfImgs = await window.renderPdfToImages(file);
        for(const item of pdfImgs){
          await new Promise(resolve => {
            const pdfSrc = item.dataUrl || item.src;
            if(!pdfSrc){ resolve(); return; }
            const img = new Image();
            img.onload = () => {
              const maxDim = 560;
              let w = img.naturalWidth || img.width || 480;
              let h = img.naturalHeight || img.height || 360;
              if(w > maxDim || h > maxDim){
                if(w >= h){ h = Math.round((h / w) * maxDim); w = maxDim; }
                else { w = Math.round((w / h) * maxDim); h = maxDim; }
              }
              loadedList.push({ src: pdfSrc, img, w, h });
              resolve();
            };
            img.onerror = () => resolve();
            img.src = pdfSrc;
          });
        }
      }catch(err){
        console.error("Failed to render PDF:", err);
      }
      continue;
    }

    const isImage = file.type?.startsWith("image/") || /\.(png|jpe?g|webp|svg|gif)$/i.test(file.name||"");
    if(isImage){
      regularImageFiles.push(file);
    }
  }

  // If a single regular image was provided, prompt user to Convert to Whiteboard or Insert as Image
  if(regularImageFiles.length === 1 && loadedList.length === 0){
    showImageImportChoiceModal(regularImageFiles[0], originX, originY);
    return;
  }

  // Otherwise, load all regular images for standard multi-grid placement
  for(const file of regularImageFiles){
    await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target.result;
        const img = new Image();
        img.onload = () => {
          const maxDim = 520;
          let w = img.naturalWidth || img.width || 480;
          let h = img.naturalHeight || img.height || 360;
          if(w > maxDim || h > maxDim){
            if(w >= h){ h = Math.round((h / w) * maxDim); w = maxDim; }
            else { w = Math.round((w / h) * maxDim); h = maxDim; }
          }
          loadedList.push({ src: dataUrl, img, w, h });
          resolve();
        };
        img.onerror = () => resolve();
        img.src = dataUrl;
      };
      reader.onerror = () => resolve();
      reader.readAsDataURL(file);
    });
  }

  if(!loadedList.length) return;
  
  const N = loadedList.length;
  const cols = N === 1 ? 1 : (N <= 4 ? 2 : (N <= 9 ? 3 : 4));
  const gap = 32;
  const colWidths = new Array(cols).fill(0);
  const rowsCount = Math.ceil(N / cols);
  const rowHeights = new Array(rowsCount).fill(0);

  for(let i = 0; i < N; i++){
    const c = i % cols, r = Math.floor(i / cols);
    colWidths[c] = Math.max(colWidths[c], loadedList[i].w);
    rowHeights[r] = Math.max(rowHeights[r], loadedList[i].h);
  }

  const totalW = colWidths.reduce((a, b) => a + b, 0) + (cols - 1) * gap;
  const totalH = rowHeights.reduce((a, b) => a + b, 0) + (rowsCount - 1) * gap;

  const colXOffsets = [0];
  for(let c = 1; c < cols; c++) colXOffsets[c] = colXOffsets[c - 1] + colWidths[c - 1] + gap;
  const rowYOffsets = [0];
  for(let r = 1; r < rowsCount; r++) rowYOffsets[r] = rowYOffsets[r - 1] + rowHeights[r - 1] + gap;

  const targetCenter = (originX != null && originY != null) ? { x: originX, y: originY } : getViewportCenter();
  const startX = Math.round(targetCenter.x - totalW / 2);
  const startY = Math.round(targetCenter.y - totalH / 2);

  pushUndo();
  const newEls = [];
  const newIds = [];
  loadedList.forEach((item, idx) => {
    const c = idx % cols, r = Math.floor(idx / cols);
    const cellX = startX + colXOffsets[c];
    const cellY = startY + rowYOffsets[r];
    const posX = Math.round(cellX + (colWidths[c] - item.w) / 2);
    const posY = Math.round(cellY + (rowHeights[r] - item.h) / 2);
    const id = genId();
    newIds.push(id);
    newEls.push({
      id,
      type: "image",
      src: item.src,
      img: item.img,
      x: posX,
      y: posY,
      w: item.w,
      h: item.h,
      rotation: 0
    });
  });

  state.elements.push(...newEls);
  state.selectedIds = newIds;
  state.selectedId = newIds.length === 1 ? newIds[0] : null;
  setActiveTool("select", { keepSelection: true });
  if(newIds.length === 1) showToolbar(newEls[0]);
  else if(newIds.length > 1) showMultiToolbar();
  saveBoards(true);
  render();
}

function getMouseOrViewportWorld(){
  if(state.lastMouse && typeof state.lastMouse.x === "number" && isFinite(state.lastMouse.x) && typeof state.lastMouse.y === "number" && isFinite(state.lastMouse.y) && state.hasMouseMoved){
    return toWorld(state.lastMouse.x, state.lastMouse.y);
  }
  return getViewportCenter();
}

function getPasteTargetCoord(wx,wy){
  if(typeof wx === "number" && isFinite(wx) && typeof wy === "number" && isFinite(wy)){
    return { x: wx, y: wy };
  }
  return getMouseOrViewportWorld();
}

function pasteTextAsObject(text, wx, wy){
  if(!text || typeof text !== "string" || !text.trim().length) return;
  const target = getPasteTargetCoord(wx, wy);
  wx = target.x;
  wy = target.y;

  // Strip rich text / HTML tags and normalize line endings
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  try{
    const parsed = JSON.parse(text);
    if(Array.isArray(parsed) && parsed[0]?.type){
      state.internalClipboard = parsed;
      pasteInternalAt(wx, wy);
      return;
    }
    if(parsed && (parsed.__whiteboardElement || parsed.type) && (typeof parsed.type === "string" || (parsed.element && parsed.element.type))){
      state.internalClipboard = parsed.element || parsed;
      pasteInternalAt(wx, wy);
      return;
    }
  }catch(err){}

  // Brand new text item using current tool defaults, ignoring any previously copied styling
  state.internalClipboard = null;

  pushUndo();
  const readable = getReadableSize();
  const newEl = {
    id: genId(),
    type: "text",
    text: text,
    x: wx,
    y: wy,
    w: 220,
    h: 40,
    color: DEFAULT_TEXT_COLOR,
    size: readable,
    font: "Segoe UI,Inter,system-ui,sans-serif",
    bold: false,
    italic: false,
    underline: false,
    rotation: 0,
    isPlaceholder: false
  };
  fitTextElement(newEl);
  newEl.x = Math.round(wx - (newEl.w || 220) / 2);
  newEl.y = Math.round(wy - (newEl.h || 40) / 2);
  state.elements.push(newEl);
  state.selectedId = newEl.id;
  state.selectedIds = [newEl.id];
  setActiveTool("select", { keepSelection: true });
  showToolbar(newEl);
  saveBoards(true);
  render();
}

let _lastPasteTimestamp = 0;

async function handleClipboardPaste(targetCoord){
  const now = Date.now();
  if(now - _lastPasteTimestamp < 150) return;

  const coord = getPasteTargetCoord(targetCoord?.x, targetCoord?.y);
  const wx = coord.x;
  const wy = coord.y;

  // 1. Try reading items from system clipboard API
  if(navigator.clipboard && typeof navigator.clipboard.read === "function"){
    try{
      const clipItems = await navigator.clipboard.read();
      if(clipItems && clipItems.length){
        const imgBlobs = [];
        let foundText = null;

        for(const item of clipItems){
          const imgType = item.types.find(t => t.startsWith("image/"));
          if(imgType){
            const blob = await item.getType(imgType);
            if(blob) imgBlobs.push(blob);
          } else if(item.types.includes("text/plain") && !foundText){
            const blob = await item.getType("text/plain");
            const txt = await blob.text();
            if(txt && txt.trim().length > 0){
              foundText = txt;
            }
          }
        }

        if(imgBlobs.length > 0){
          _lastPasteTimestamp = Date.now();
          await insertClipboardImageBlobs(imgBlobs, wx, wy);
          return;
        }

        if(foundText){
          _lastPasteTimestamp = Date.now();
          pasteTextAsObject(foundText, wx, wy);
          return;
        }
      }
    }catch(err){
      // proceed to readText
    }
  }

  // 2. Fallback to readText
  if(navigator.clipboard && typeof navigator.clipboard.readText === "function"){
    try{
      const txt = await navigator.clipboard.readText();
      if(txt && txt.trim().length > 0){
        _lastPasteTimestamp = Date.now();
        pasteTextAsObject(txt, wx, wy);
        return;
      }
    }catch(err){
      // proceed to internal fallback
    }
  }

  // 3. Fallback to internal clipboard if available
  if(state.internalClipboard){
    _lastPasteTimestamp = Date.now();
    pasteInternalAt(wx, wy);
  }
}

function pasteInternalAt(wx,wy){
  const coord = getPasteTargetCoord(wx, wy);
  wx = coord.x;
  wy = coord.y;
  if(state.internalClipboard){
    pushUndo();
    const src=state.internalClipboard;
    if(Array.isArray(src)){
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      src.forEach(el=>{
        const eb=getBounds(el);
        minX=Math.min(minX,eb.x);
        minY=Math.min(minY,eb.y);
        maxX=Math.max(maxX,eb.x+eb.w);
        maxY=Math.max(maxY,eb.y+eb.h);
      });
      const bx=isFinite(minX)?minX:0, by=isFinite(minY)?minY:0;
      const bw=(isFinite(maxX)&&isFinite(minX))?(maxX-minX):0;
      const bh=(isFinite(maxY)&&isFinite(minY))?(maxY-minY):0;
      const startX=wx - bw/2;
      const startY=wy - bh/2;
      const newIds=[];
      const newEls=src.map(el=>{
        const nid=genId(); newIds.push(nid);
        const cl={...el,id:nid,locked:false};
        if(cl.points){
          cl.points=cl.points.map(p=>({x:p.x-bx+startX,y:p.y-by+startY}));
          delete cl.x; delete cl.y;
        } else {
          cl.x=(el.x||0)-bx+startX; cl.y=(el.y||0)-by+startY;
        }
        if(cl.type==="image"&&cl.src){
          ensureImageLoaded(cl);
        }
        return cl;
      });
      state.elements.push(...newEls);
      state.selectedIds=newIds;
      state.selectedId=newIds.length===1?newIds[0]:null;
      saveBoards(true); render();
      if(newIds.length>1) showMultiToolbar();
      else if(newIds.length===1) showToolbar(newEls[0]);
      return;
    }
    const eb=getBounds(src);
    const bw=eb.w||100, bh=eb.h||100;
    const cl={...src,id:genId(),x:Math.round(wx-bw/2),y:Math.round(wy-bh/2),locked:false};
    if(src.points){
      const b=(()=>{let minX=Infinity,minY=Infinity; src.points.forEach(p=>{minX=Math.min(minX,p.x);minY=Math.min(minY,p.y)}); return {minX,minY};})();
      cl.points=src.points.map(p=>({x:p.x-b.minX+Math.round(wx-bw/2),y:p.y-b.minY+Math.round(wy-bh/2)}));
      delete cl.x; delete cl.y;
    }
    if(cl.type==="image"&&cl.src){
      ensureImageLoaded(cl);
    }
    state.elements.push(cl); state.selectedId=cl.id; state.selectedIds=[cl.id]; saveBoards(true); render(); showToolbar(cl); return;
  }
}

function pasteAt(wx,wy){
  handleClipboardPaste({ x: wx, y: wy });
}
const _rcPaste = document.getElementById("rc-paste");
if(_rcPaste) _rcPaste.onclick=()=>{hideRC(); handleClipboardPaste({ x: state.rightClickPos.wx, y: state.rightClickPos.wy });};

function addSwatch(c,col,title,onPick){
  const b=document.createElement("button");
  b.type="button";
  b.className="w-6 h-6 rounded-full border border-white shadow hover:scale-110 transition";
  b.style.background=col;
  if(col.toLowerCase()==="#ffffff") b.style.borderColor="#999";
  b.title=title||col;
  b.onclick=(e)=>{e.stopPropagation(); onPick(col);};
  c.appendChild(b);
}
function addCustomSwatch(c,onPick){
  const lab=document.createElement("label");
  lab.className="custom-swatch";
  lab.title="Custom color";
  const inp=document.createElement("input");
  inp.type="color";
  inp.value=state.color||"#1E1E1E";
  inp.addEventListener("input",()=>onPick(inp.value,{keepOpen:true}));
  inp.addEventListener("pointerdown",e=>e.stopPropagation());
  inp.addEventListener("click",e=>e.stopPropagation());
  lab.appendChild(inp);
  c.appendChild(lab);
}
function createColorGrid(id){
  const c=document.getElementById(id); if(!c) return; c.innerHTML="";
  THEME_COLORS.forEach(col=>addSwatch(c,col.hex,col.name,(hex,opts={})=>{
    if(id==="highlighter-colors"){state.toolColors.highlighter=hex; if(state.tool==="highlighter") state.color=hex;}
    else if(id==="vanishing-colors"){state.toolColors.vanishing=hex; if(state.tool==="vanishing") state.color=hex;}
    else if(id==="pen-colors"){state.toolColors.pen=hex; if(state.tool==="pen") state.color=hex;}
    else {state.toolColors.shape=hex; if(GEOMETRIC_SHAPES.includes(state.tool)) state.color=hex;}
    const sc=document.getElementById("stroke-color");
    if(sc) sc.value=state.color;
    updateCursor();
    saveBoards();
    if(!opts.keepOpen) hidePopovers();
  }));
  addCustomSwatch(c,(hex,opts={})=>{
    if(id==="highlighter-colors"){state.toolColors.highlighter=hex; if(state.tool==="highlighter") state.color=hex;}
    else if(id==="vanishing-colors"){state.toolColors.vanishing=hex; if(state.tool==="vanishing") state.color=hex;}
    else if(id==="pen-colors"){state.toolColors.pen=hex; if(state.tool==="pen") state.color=hex;}
    else {state.toolColors.shape=hex; if(GEOMETRIC_SHAPES.includes(state.tool)) state.color=hex;}
    const sc=document.getElementById("stroke-color");
    if(sc) sc.value=state.color;
    updateCursor();
    saveBoards();
    if(!opts.keepOpen) hidePopovers();
  });
}
createColorGrid("pen-colors");createColorGrid("highlighter-colors");createColorGrid("vanishing-colors");
function createToolbarColorGrid(){
  const c=document.getElementById("st-color-palette"); c.innerHTML="";
  TEXT8.forEach(col=>addSwatch(c,col,col,(hex)=>{
    if(state.selectedIds.length>1){
      pushUndo();
      state.selectedIds.forEach(id=>{
        const el=state.elements.find(x=>x.id===id);
        if(el){ el.color=hex; el.isPlaceholder=false; if(GEOMETRIC_SHAPES.includes(el.type)) state.toolColors.shape=hex; }
      });
      saveBoards(); render(); document.getElementById("st-color-dot").style.background=hex;
      c.classList.add("hidden");
      return;
    }
    const el=state.elements.find(x=>x.id===state.selectedId||x.id===state.inlineEditingId);
    if(el){pushUndo();el.color=hex;el.isPlaceholder=false;if(GEOMETRIC_SHAPES.includes(el.type)) state.toolColors.shape=hex;saveBoards();render();document.getElementById("st-color-dot").style.background=hex; if(inlineEditor&&state.inlineEditingId===el.id) inlineEditor.style.color=hex;}
    c.classList.add("hidden");
  }));
  addCustomSwatch(c,(hex)=>{
    if(state.selectedIds.length>1){
      pushUndo();
      state.selectedIds.forEach(id=>{
        const el=state.elements.find(x=>x.id===id);
        if(el){ el.color=hex; el.isPlaceholder=false; if(GEOMETRIC_SHAPES.includes(el.type)) state.toolColors.shape=hex; }
      });
      saveBoards(); render(); document.getElementById("st-color-dot").style.background=hex;
      return;
    }
    const el=state.elements.find(x=>x.id===state.selectedId||x.id===state.inlineEditingId);
    if(el){pushUndo();el.color=hex;el.isPlaceholder=false;if(GEOMETRIC_SHAPES.includes(el.type)) state.toolColors.shape=hex;saveBoards();render();document.getElementById("st-color-dot").style.background=hex; if(inlineEditor&&state.inlineEditingId===el.id) inlineEditor.style.color=hex;}
  });
}
function createPenStyles(){
  const c=document.getElementById("pen-styles");c.innerHTML="";PEN_STYLES.forEach(s=>{
    const b=document.createElement("button");b.className=`px-2 py-1.5 border rounded text-[10px] flex flex-col items-center gap-1 ${state.penStyle===s.id?'bg-slate-900 text-white':'bg-slate-50'}`;
    b.innerHTML=`<i data-lucide="${s.icon}" class="w-3 h-3"></i>${s.name}`;
    b.onclick=()=>{state.penStyle=s.id; createPenStyles(); saveBoards();};
    c.appendChild(b);
  }); lucideCreateIcons({nodes:[c]});
}
function createVanishAnims(){
  const c=document.getElementById("vanish-anims");c.innerHTML="";VANISH_MODES.forEach(m=>{
    const b=document.createElement("button");b.className=`px-2 py-1.5 rounded text-[10px] border ${state.vanishMode===m.id?'bg-slate-900 text-white':'bg-slate-50'}`; b.textContent=m.label; b.onclick=()=>{state.vanishMode=m.id; const g=document.getElementById("global-vanish"); if(g) g.value=m.id; createVanishAnims(); saveBoards();}; c.appendChild(b);
  });
}
createPenStyles(); createVanishAnims();

function closeAllPopovers(){
  document.querySelectorAll(".popover-menu").forEach(x=>{
    x.classList.add("hidden");
    x.classList.remove("open");
    x.style.display="none";
  });
  closeAllSmallPalettes();
}
function positionPopover(p, btn){
  const host=document.getElementById("popover-container")||container.parentElement;
  const hr=host.getBoundingClientRect();
  p.style.position="absolute";
  p.style.zIndex="80";
  p.style.margin="0";
  p.style.transform="none";
  p.style.right="auto";
  p.style.bottom="auto";
  p.style.display="block";
  p.classList.add("open");
  p.classList.remove("hidden");
  const pw=p.offsetWidth||260;
  const ph=p.offsetHeight||180;
  const gap=6;
  const pos=state.toolbarPos;
  if(!btn){
    p.style.left=Math.max(8,(hr.width-pw)/2)+"px";
    p.style.top="72px";
    return;
  }
  const r=btn.getBoundingClientRect();
  let left, top;
  if(pos==="bottom"){
    left=r.left-hr.left+r.width/2-pw/2;
    top=r.top-hr.top-ph-gap;
  } else if(pos==="left"){
    left=r.right-hr.left+gap;
    top=r.top-hr.top;
  } else if(pos==="right"){
    left=r.left-hr.left-pw-gap;
    top=r.top-hr.top;
  } else {
    left=r.left-hr.left+r.width/2-pw/2;
    top=r.bottom-hr.top+gap;
  }
  left=Math.max(8, Math.min(hr.width-pw-8, left));
  top=Math.max(8, Math.min(hr.height-ph-8, top));
  p.style.left=left+"px";
  p.style.top=top+"px";
}
function openPopover(id){
  const p=document.getElementById(id); if(!p) return;
  const wasHidden=p.classList.contains("hidden")||p.style.display==="none"||!p.classList.contains("open");
  closeAllPopovers();
  if(wasHidden){
    deselect();
    const anchor=POPOVER_ANCHORS[id];
    const btn=anchor?document.getElementById(anchor):null;
    positionPopover(p, btn);
  }
}
function hidePopovers(){closeAllPopovers()}
function hideAll(){hidePopovers();hideToolbar();hideRC();}
function pushUndo(){state.undoStack.push(JSON.stringify(serializeElements()));if(state.undoStack.length>100)state.undoStack.shift();state.redoStack=[];updateUndoRedoUI();saveBoards()}
function restoreSnap(snap){const arr=JSON.parse(snap);arr.forEach(el=>{if(el._fadeInterval)clearInterval(el._fadeInterval);if(el.type==="image"&&el.src){const img=new Image();img.onload=render;img.src=el.src;el.img=img}if(el.rotation==null)el.rotation=0;});state.elements=arr}
function undo(){if(!state.undoStack.length)return;state.redoStack.push(JSON.stringify(serializeElements()));restoreSnap(state.undoStack.pop());state.selectedId=null;hideAll();saveBoards(true);render();updateUndoRedoUI()}
function redo(){if(!state.redoStack.length)return;state.undoStack.push(JSON.stringify(serializeElements()));restoreSnap(state.redoStack.pop());state.selectedId=null;hideAll();saveBoards(true);render();updateUndoRedoUI()}
function updateUndoRedoUI(){
  const ub=document.getElementById("undo-btn");
  if(ub) ub.disabled=state.undoStack.length===0;
  const rb=document.getElementById("redo-btn");
  if(rb) rb.disabled=state.redoStack.length===0;
}
function openSettingsForTool(t){
  if(t==="pen") openPopover("pen-popover");
  else if(t==="highlighter") openPopover("highlighter-popover");
  else if(t==="eraser") openPopover("eraser-popover");
  else if(t==="vanishing") openPopover("vanishing-popover");
}
function highlightTool(t){
  document.querySelectorAll(".tool-btn").forEach(x=>{
    const on=x.dataset.tool===t;
    x.classList.toggle("bg-slate-900",on);
    x.classList.toggle("text-white",on);
    x.classList.toggle("hover:bg-slate-100",!on);
    x.classList.toggle("text-slate-600",!on);
  });
}

function rulerEdge(el){
  const b={x:el.x,y:el.y,w:el.w,h:Math.max(28,el.h)};
  let a={x:b.x,y:b.y}, c={x:b.x+b.w,y:b.y};
  if(el.rotation){
    const cx=b.x+b.w/2, cy=b.y+b.h/2;
    a=rotatePoint(a.x,a.y,cx,cy,el.rotation);
    c=rotatePoint(c.x,c.y,cx,cy,el.rotation);
  }
  return {a,c};
}
function findRulerFor(wp){
  const tol=20/state.camera.zoom;
  let best=null,bestD=Infinity;
  state.elements.forEach(el=>{
    if(el.type!=="ruler") return;
    const {a,c}=rulerEdge(el);
    const d=distToSegment(wp.x,wp.y,a.x,a.y,c.x,c.y);
    if(d<tol && d<bestD){bestD=d;best={a,c};}
  });
  return best;
}
function findProtractorFor(wp){
  let best=null,bestD=Infinity;
  state.elements.forEach(el=>{
    if(el.type!=="protractor") return;
    const cx=el.x+el.w/2, cy=el.y+el.h, r=Math.min(el.w/2,el.h);
    let c={x:cx,y:cy};
    if(el.rotation){const bx=el.x+el.w/2, by=el.y+el.h/2; c=rotatePoint(cx,cy,bx,by,el.rotation);}
    const d=Math.hypot(wp.x-c.x,wp.y-c.y);
    if(d<=r*1.15 && d<bestD){bestD=d; best={c,r,rotation:el.rotation||0};}
  });
  return best;
}
function snapFromProtractor(pr,wp){
  const dx=wp.x-pr.c.x, dy=wp.y-pr.c.y;
  const len=Math.hypot(dx,dy)||1;
  let deg=Math.atan2(dy,dx)*180/Math.PI - pr.rotation;
  const step=15;
  const snapped=Math.round(deg/step)*step + pr.rotation;
  const rad=snapped*Math.PI/180;
  return {x:pr.c.x+Math.cos(rad)*len, y:pr.c.y+Math.sin(rad)*len};
}
function projectOnEdge(edge,wp){
  const dx=edge.c.x-edge.a.x, dy=edge.c.y-edge.a.y;
  const l2=dx*dx+dy*dy || 1;
  let t=((wp.x-edge.a.x)*dx+(wp.y-edge.a.y)*dy)/l2;
  t=Math.max(0,Math.min(1,t));
  return {x:edge.a.x+t*dx, y:edge.a.y+t*dy};
}
function finalizeShape(cur){
  if(LINE_TYPES.includes(cur.type)){
    if(Math.hypot(cur.w||0, cur.h||0)<2){ cur.w=3; cur.h=0; }
    return true;
  }
  normalizeBox(cur);
  if((cur.w||0)<2 && (cur.h||0)<2){
    cur.w=3; cur.h=3;
  }
  return true;
}

canvas.addEventListener("pointerdown",e=>{
  const rail=document.getElementById("sticky-color-rail");
  const boardsModal=document.getElementById("boards-modal");
  if(inlineBox&&!inlineBox.contains(e.target)&&!(selToolbar&&selToolbar.contains(e.target))&&!(rcMenu&&rcMenu.contains(e.target))&&!(boardsModal&&boardsModal.contains(e.target))&&!(rail&&rail.contains(e.target))){
    if(e.button===0){ commitInlineEditor(); return; }
  }
  if(e.button===0) closeAllPopovers();
  if(e.button===2||e.button===1){
    e.preventDefault(); hideRC();
    state.isPanning=true; state.tempPan=true; state.panDidMove=false; state.panButton=e.button;
    state.prevTool=state.tool==="hand"?(state.prevTool||"select"):state.tool;
    highlightTool("hand");
    state.panOrigin={x:e.clientX,y:e.clientY};
    state.panStart={x:e.clientX-state.camera.x,y:e.clientY-state.camera.y};
    container.style.cursor="grabbing";
    if(eraserCursor) eraserCursor.style.display="none";
    if(laserCursor) laserCursor.style.display="none";
    return;
  }
  if(state.tool==="hand"||state.spacePan){state.isPanning=true;state.tempPan=false;state.panStart={x:e.clientX-state.camera.x,y:e.clientY-state.camera.y};container.style.cursor="grabbing";return;}
  const wPos=toWorld(e.clientX,e.clientY);state.lastMouse={x:e.clientX,y:e.clientY,wx:wPos.x,wy:wPos.y};
  if(state.pendingPlace){
    const p=state.pendingPlace;
    if(p.type==="sticky"){pushUndo();const newSticky={id:genId(),type:"sticky",text:"",x:wPos.x-90,y:wPos.y-65,w:180,h:130,color:"#422006",bg:p.bg||"#fef08a",size:16,font:"Segoe UI,Inter,system-ui,sans-serif",rotation:0,isPlaceholder:true}; state.elements.push(newSticky); saveBoards(); render();
      if(state.stickyAutoEdit||document.getElementById("sticky-auto-edit")?.checked){createInlineEditor({x:newSticky.x,y:newSticky.y},newSticky)}
      state.pendingPlace=null; setActiveTool("select"); updateCursor(); return;
    }
    else if(p.type==="emoji"){pushUndo();const dim=emojiSpawnSize(p.text,32); state.elements.push({id:genId(),type:"emoji",text:p.text,x:wPos.x-dim.w/2,y:wPos.y-dim.h/2,w:dim.w,h:dim.h,rotation:0});saveBoards();render(); updateCursor(); return;}
    else if(p.type==="ruler"){pushUndo(); state.elements.push({id:genId(),type:"ruler",x:wPos.x-150,y:wPos.y-18,w:300,h:36,rotation:0,color:"#1E1E1E"}); saveBoards(); render(); state.pendingPlace=null; setActiveTool("select"); return;}
    else if(p.type==="protractor"){pushUndo(); state.elements.push({id:genId(),type:"protractor",x:wPos.x-110,y:wPos.y-110,w:220,h:110,rotation:0}); saveBoards(); render(); state.pendingPlace=null; setActiveTool("select"); return;}
    else if(p.type==="axes"){pushUndo(); const gs=state.gridSpacing||24; const ax=Math.round((wPos.x-20)/gs)*gs, ay=Math.round((wPos.y-220)/gs)*gs; state.elements.push({id:genId(),type:"axes",x:ax,y:ay,w:260,h:240,rotation:0,color:"#1E1E1E"}); saveBoards(); render(); state.pendingPlace=null; setActiveTool("select"); return;}
    else if(p.type==="timer"){pushUndo(); state.elements.push({id:genId(),type:"timer",x:wPos.x-70,y:wPos.y-40,w:140,h:80,duration:300,left:300,running:false,rotation:0,color:"#262626"}); saveBoards(); render(); state.pendingPlace=null; setActiveTool("select"); return;}
    state.pendingPlace=null; setActiveTool("select"); updateCursor(); return;
  }
  if(state.tool==="select"){
    const multiKey=e.ctrlKey||e.metaKey||e.shiftKey;
    if(multiKey){
      const h=hitElement(wPos);
      if(h){
        if(state.selectedId && !state.selectedIds.includes(state.selectedId)) state.selectedIds.push(state.selectedId);
        const i=state.selectedIds.indexOf(h.id);
        if(i>=0) state.selectedIds.splice(i,1); else state.selectedIds.push(h.id);
        state.selectedId=state.selectedIds.length===1?state.selectedIds[0]:null;
        if(state.selectedIds.length>1){
          showMultiToolbar();
        } else if(state.selectedId){
          const one=state.elements.find(x=>x.id===state.selectedId);
          if(one) showToolbar(one);
        } else {
          hideToolbar();
        }
        render(); return;
      }
      state.isSelectingMarquee=true;
      state.marqueeStart={...wPos};
      state.marqueeCurrent={...wPos};
      state.marqueeAdditive=true;
      state.marqueeBaseIds=[...state.selectedIds];
      render(); return;
    }
    if(state.selectedIds.length>1){
      const hh=hitHandles(null,wPos);
      if(hh){
        state.isTransforming=true;
        state.transform.didPush=false;
        state.transform.mode=hh.mode;
        state.transform.handle=hh;
        state.transform.startMouse={...wPos};
        state.transform.startMultiBounds=getMultiBounds(state.selectedIds);
        state.transform.center=getCenter(state.transform.startMultiBounds);
        state.transform.startMulti=state.selectedIds.map(id=>{
          const el=state.elements.find(x=>x.id===id);
          return el?{id,x:el.x,y:el.y,w:el.w,h:el.h,size:el.size,rotation:el.rotation||0,points:el.points?el.points.map(pt=>({...pt})):null}:null;
        }).filter(Boolean);
        return;
      }
      const h=hitElement(wPos);
      if(h && state.selectedIds.includes(h.id)){
        state.isTransforming=true; state.transform.didPush=false; state.transform.mode="moveMulti";
        state.transform.startMouse={...wPos};
        state.transform.startMulti=state.selectedIds.map(id=>{
          const el=state.elements.find(x=>x.id===id);
          return el?{id,x:el.x,y:el.y,w:el.w,h:el.h,size:el.size,rotation:el.rotation||0,points:el.points?el.points.map(pt=>({...pt})):null}:null;
        }).filter(Boolean);
        return;
      }
      state.selectedIds=[];
      state.selectedId=null;
      hideToolbar();
    }
    const sel=state.elements.find(el=>el.id===state.selectedId);
    if(sel&&!sel.locked){const hh=hitHandles(sel,wPos);if(hh){state.isTransforming=true;state.transform.didPush=false;state.transform.mode=hh.mode;state.transform.handle=hh;state.transform.startMouse={...wPos};state.transform.startEl={...sel,points:sel.points?sel.points.map(p=>({...p})):null,w:sel.w,h:sel.h,x:sel.x,y:sel.y,size:sel.size,rotation:sel.rotation};state.transform.startBounds=getBounds(sel);state.transform.center=getCenter(state.transform.startBounds);return;}}
    const hit=hitElement(wPos);
    if(hit){
      if(hit.locked){state.selectedId=hit.id;state.selectedIds=[hit.id];showToolbar(hit);render();return;}
      if(hit.isPlaceholder&&hit.type==="text"){createInlineEditor({x:hit.x,y:hit.y},hit,{selectAll:false});return;}
      state.selectedId=hit.id;state.selectedIds=[hit.id];state.isTransforming=true;state.transform.didPush=false;state.transform.mode="move";state.transform.startMouse={...wPos};state.transform.startEl={...hit,points:hit.points?hit.points.map(p=>({...p})):null,x:hit.x,y:hit.y};
      showToolbar(hit);render();return;
    }
    state.selectedId=null; state.selectedIds=[]; state.editArmed=null; hideToolbar();
    state.isSelectingMarquee=true;
    state.marqueeStart={...wPos};
    state.marqueeCurrent={...wPos};
    state.marqueeAdditive=false;
    state.marqueeBaseIds=[];
    render(); return;
  }
  if(state.tool==="text"){if(e.button===0){state.clicks++;const cc=document.getElementById("click-counter");if(cc)cc.innerText=`Text • ${state.clicks}`;createInlineEditor(wPos);}return;}
  deselect();
  if(state.tool==="eraser"){state.isDrawing=true;state.eraseTouched=false;state.eraseDidPush=false;eraseAt(wPos);return;}
  state.isDrawing=true;
  if(e.button===0){state.clicks++;const cc=document.getElementById("click-counter");if(cc)cc.innerText=`${state.tool.charAt(0).toUpperCase()+state.tool.slice(1)} • ${state.clicks}`;}
  if(STROKE_TYPES.includes(state.tool)){
    state.activeRuler=findRulerFor(wPos);
    state.activeProtractor=state.activeRuler?null:findProtractorFor(wPos);
    if(state.activeRuler){ const sp=projectOnEdge(state.activeRuler,wPos); wPos.x=sp.x; wPos.y=sp.y; }
    else if(state.activeProtractor){ state.protractorStart={...wPos}; }
    state.currentElement={id:genId(),type:state.tool,color:state.tool==="highlighter"?state.toolColors.highlighter:state.tool==="vanishing"?state.toolColors.vanishing:state.toolColors.pen,width:state.width,penStyle:state.tool==="pen"?state.penStyle:0,highlighterStyle:state.highlighterStyle,vanishMode:state.vanishMode,points:[wPos],rotation:0,opacity:1,fireStarted:false,cometCut:0,inkMul:1};
  }else if(state.tool==="compass"){
    state.currentElement={id:genId(),type:"compassGuide",x:wPos.x,y:wPos.y,w:0,h:0,color:state.toolColors.shape||"#1E1E1E",width:state.width||2};
  }else{
    const shapeColor=(GEOMETRIC_SHAPES.includes(state.tool)?state.toolColors.shape:state.color)||"#1E1E1E";
    state.currentElement={id:genId(),type:state.tool,color:shapeColor,width:state.width,fill:false,x:wPos.x,y:wPos.y,w:0,h:0,rotation:0};
  }
});

addEventListener("pointermove",e=>{
  state.hasMouseMoved=true;
  const wPos=toWorld(e.clientX,e.clientY);state.lastMouse={x:e.clientX,y:e.clientY,wx:wPos.x,wy:wPos.y};
  if(!state.isDrawing && !state.isTransforming && !state.isPanning){
    const h=hitElement(wPos);
    state.hoveredId=h?h.id:null;
  }
  updateCursor(e.target);
  if(state.isPanning){
    if(state.panOrigin && Math.hypot(e.clientX-state.panOrigin.x, e.clientY-state.panOrigin.y)>4) state.panDidMove=true;
    state.camera.x=e.clientX-state.panStart.x;state.camera.y=e.clientY-state.panStart.y;updateGrid();scheduleRender();if(state.selectedId)positionToolbar();if(inlineBox) updateInlineEditorTransform();return;
  }
  if(state.isSelectingMarquee){
    state.marqueeCurrent={...wPos};
    const minX=Math.min(state.marqueeStart.x,state.marqueeCurrent.x);
    const minY=Math.min(state.marqueeStart.y,state.marqueeCurrent.y);
    const maxX=Math.max(state.marqueeStart.x,state.marqueeCurrent.x);
    const maxY=Math.max(state.marqueeStart.y,state.marqueeCurrent.y);
    const mw=maxX-minX, mh=maxY-minY;
    const found=new Set(state.marqueeAdditive?state.marqueeBaseIds:[]);
    if(mw>2 || mh>2){
      state.elements.forEach(el=>{
        if(el.locked) return;
        const b=getBounds(el);
        if(!(b.x+b.w<minX || b.x>maxX || b.y+b.h<minY || b.y>maxY)){
          found.add(el.id);
        }
      });
    }
    state.selectedIds=Array.from(found);
    state.selectedId=state.selectedIds.length===1?state.selectedIds[0]:null;
    scheduleRender();
    return;
  }
  if(state.tool==="select"&&!state.isTransforming){
    if(state.selectedIds.length>1){
      const hh=hitHandles(null,wPos);
      if(hh){
        if(hh.mode==="rotateMulti") container.style.cursor="grab";
        else if(hh.type==="side") container.style.cursor="ew-resize";
        else container.style.cursor=hh.idx%2===0?"nwse-resize":"nesw-resize";
        return;
      }
      const h=hitElement(wPos);
      if(h&&state.selectedIds.includes(h.id)){container.style.cursor="grab";return;}
      container.style.cursor="default";
    } else if(state.selectedId){
      const sel=state.elements.find(ee=>ee.id===state.selectedId);
      if(sel){const hh=hitHandles(sel,wPos);if(hh){if(hh.mode==="endpoint")container.style.cursor="crosshair";else if(hh.mode==="rotate")container.style.cursor="grab";else if(hh.type==="side")container.style.cursor="ew-resize";else container.style.cursor=hh.idx%2===0?"nwse-resize":"nesw-resize";return;}if(hitElement(wPos)?.id===state.selectedId){container.style.cursor="grab";return;}container.style.cursor="default";}
    }
  }
  if(state.isTransforming){
    if(state.transform.mode==="moveMulti"||state.transform.mode==="resizeMulti"||state.transform.mode==="sideMulti"||state.transform.mode==="rotateMulti"){
      const moved=Math.hypot(wPos.x-state.transform.startMouse.x,wPos.y-state.transform.startMouse.y)>1.5;
      if(!state.transform.didPush && (moved||state.transform.mode!=="moveMulti")){pushUndo();state.transform.didPush=true;}
      if(state.transform.mode==="moveMulti"){
        const dx=wPos.x-state.transform.startMouse.x,dy=wPos.y-state.transform.startMouse.y;
        (state.transform.startMulti||[]).forEach(st=>{
          const t=state.elements.find(x=>x.id===st.id); if(!t||t.locked) return;
          if(st.points) t.points=st.points.map(pt=>({x:pt.x+dx,y:pt.y+dy}));
          else {t.x=st.x+dx; t.y=st.y+dy;}
        });
        render(); positionToolbar(); return;
      }
      if(state.transform.mode==="resizeMulti"||state.transform.mode==="sideMulti"){
        const sb=state.transform.startMultiBounds;
        if(!sb) return;
        const idx=state.transform.handle.idx;
        const isSide=state.transform.mode==="sideMulti";
        const MIN_DIM = 20;
        let nx=sb.x, ny=sb.y, nw=sb.w, nh=sb.h;
        if(!isSide){
          if(idx===0){
            nx = Math.min(wPos.x, sb.x + sb.w - MIN_DIM);
            ny = Math.min(wPos.y, sb.y + sb.h - MIN_DIM);
            nw = sb.x + sb.w - nx;
            nh = sb.y + sb.h - ny;
          } else if(idx===1){
            nx = sb.x;
            ny = Math.min(wPos.y, sb.y + sb.h - MIN_DIM);
            nw = Math.max(wPos.x, sb.x + MIN_DIM) - sb.x;
            nh = sb.y + sb.h - ny;
          } else if(idx===2){
            nx = sb.x;
            ny = sb.y;
            nw = Math.max(wPos.x, sb.x + MIN_DIM) - sb.x;
            nh = Math.max(wPos.y, sb.y + MIN_DIM) - sb.y;
          } else {
            nx = Math.min(wPos.x, sb.x + sb.w - MIN_DIM);
            ny = sb.y;
            nw = sb.x + sb.w - nx;
            nh = Math.max(wPos.y, sb.y + MIN_DIM) - sb.y;
          }
        } else {
          if(idx===0){
            nx = Math.min(wPos.x, sb.x + sb.w - MIN_DIM);
            nw = sb.x + sb.w - nx;
          } else {
            nx = sb.x;
            nw = Math.max(wPos.x, sb.x + MIN_DIM) - sb.x;
          }
        }
        nw=Math.max(MIN_DIM,nw);
        nh=Math.max(MIN_DIM,nh);
        const scaleX=nw/Math.max(1,sb.w);
        const scaleY=isSide?1:(nh/Math.max(1,sb.h));
        (state.transform.startMulti||[]).forEach(st=>{
          const item=state.elements.find(x=>x.id===st.id);
          if(!item||item.locked) return;
          if(st.points){
            item.points=st.points.map(p=>({
              x:nx+(p.x-sb.x)*scaleX,
              y:ny+(p.y-sb.y)*scaleY
            }));
          } else {
            item.x=nx+(st.x-sb.x)*scaleX;
            item.y=ny+(st.y-sb.y)*scaleY;
            item.w=Math.max(8,(st.w||100)*scaleX);
            item.h=Math.max(8,(st.h||100)*scaleY);
            if(item.type==="text"||item.type==="sticky"){
              const fontScale=isSide?scaleX:(scaleX+scaleY)/2;
              item.size=clamp(Math.round((st.size||(item.type==="sticky"?16:18))*fontScale),8,400);
              if(item.type==="text") fitTextElement(item);
            }
          }
        });
        render(); positionToolbar(); return;
      }
      if(state.transform.mode==="rotateMulti"){
        container.style.cursor="grabbing";
        const c=state.transform.center;
        let ang=Math.atan2(wPos.y-c.y,wPos.x-c.x)*180/Math.PI-90;
        while(ang>180) ang-=360;
        while(ang<-180) ang+=360;
        if(e.shiftKey){
          ang=Math.round(ang/15)*15;
        }
        const initialAng=Math.atan2(state.transform.startMouse.y-c.y,state.transform.startMouse.x-c.x)*180/Math.PI-90;
        const dDeg=ang-initialAng;
        const rad=(dDeg*Math.PI)/180;
        const cos=Math.cos(rad), sin=Math.sin(rad);

        (state.transform.startMulti||[]).forEach(st=>{
          const item=state.elements.find(x=>x.id===st.id);
          if(!item||item.locked) return;
          if(st.points){
            item.points=st.points.map(p=>{
              return {
                x:c.x+(p.x-c.x)*cos-(p.y-c.y)*sin,
                y:c.y+(p.x-c.x)*sin+(p.y-c.y)*cos
              };
            });
          } else {
            const elCenterX=st.x+(st.w||0)/2;
            const elCenterY=st.y+(st.h||0)/2;
            const ox=elCenterX-c.x;
            const oy=elCenterY-c.y;
            const rotCenterX=c.x+ox*cos-oy*sin;
            const rotCenterY=c.y+ox*sin+oy*cos;
            item.x=rotCenterX-(st.w||0)/2;
            item.y=rotCenterY-(st.h||0)/2;
            item.rotation=((st.rotation||0)+dDeg)%360;
          }
        });
        render(); positionToolbar(); return;
      }
    }
    const el=state.elements.find(ee=>ee.id===state.selectedId);if(!el||el.locked)return;
    const moved=Math.hypot(wPos.x-state.transform.startMouse.x,wPos.y-state.transform.startMouse.y)>1.5;
    if(!state.transform.didPush && (moved || state.transform.mode!=="move")){pushUndo();state.transform.didPush=true;}
    if(state.transform.mode==="endpoint"){
      const idx=state.transform.handle.idx;
      let px=wPos.x, py=wPos.y;
      if(e.shiftKey){
        const ax=idx===0?el.x+el.w:el.x, ay=idx===0?el.y+el.h:el.y;
        const ang=Math.atan2(py-ay,px-ax), len=Math.hypot(px-ax,py-ay);
        const snap=Math.round(ang/(Math.PI/12))*(Math.PI/12);
        px=ax+Math.cos(snap)*len; py=ay+Math.sin(snap)*len;
      }
      if(idx===0){ el.w=(el.x+el.w)-px; el.h=(el.y+el.h)-py; el.x=px; el.y=py; }
      else { el.w=px-el.x; el.h=py-el.y; }
      render(); positionToolbar(); return;
    }
    if(state.transform.mode==="move"){
      let dx=wPos.x-state.transform.startMouse.x, dy=wPos.y-state.transform.startMouse.y;
      state.alignmentGuides = [];
      if(!el.points && !e.shiftKey){
        const startBounds = state.transform.startBounds || getBounds(state.transform.startEl || el);
        const testX = startBounds.x + dx;
        const testY = startBounds.y + dy;
        const testW = startBounds.w;
        const testH = startBounds.h;
        const SNAP_DIST = 6 / state.camera.zoom;
        
        let bestSnapX = null, bestDistX = SNAP_DIST;
        let bestSnapY = null, bestDistY = SNAP_DIST;
        let guideX = null, guideY = null;

        const curLeft = testX, curRight = testX + testW, curCenterX = testX + testW / 2;
        const curTop = testY, curBottom = testY + testH, curCenterY = testY + testH / 2;

        state.elements.forEach(other => {
          if(other.id === el.id || other.locked) return;
          const ob = getBounds(other);
          const oLeft = ob.x, oRight = ob.x + ob.w, oCenterX = ob.x + ob.w / 2;
          const oTop = ob.y, oBottom = ob.y + ob.h, oCenterY = ob.y + ob.h / 2;

          const xPairs = [
            { cur: curLeft, target: oLeft, offset: 0 },
            { cur: curRight, target: oRight, offset: testW },
            { cur: curCenterX, target: oCenterX, offset: testW / 2 },
            { cur: curLeft, target: oRight, offset: 0 },
            { cur: curRight, target: oLeft, offset: testW }
          ];
          xPairs.forEach(p => {
            const diff = Math.abs(p.cur - p.target);
            if(diff < bestDistX){
              bestDistX = diff;
              bestSnapX = p.target - p.offset;
              guideX = { x1: p.target, y1: Math.min(testY, ob.y) - 20, x2: p.target, y2: Math.max(testY + testH, ob.y + ob.h) + 20 };
            }
          });

          const yPairs = [
            { cur: curTop, target: oTop, offset: 0 },
            { cur: curBottom, target: oBottom, offset: testH },
            { cur: curCenterY, target: oCenterY, offset: testH / 2 },
            { cur: curTop, target: oBottom, offset: 0 },
            { cur: curBottom, target: oTop, offset: testH }
          ];
          yPairs.forEach(p => {
            const diff = Math.abs(p.cur - p.target);
            if(diff < bestDistY){
              bestDistY = diff;
              bestSnapY = p.target - p.offset;
              guideY = { x1: Math.min(testX, ob.x) - 20, y1: p.target, x2: Math.max(testX + testW, ob.x + ob.w) + 20, y2: p.target };
            }
          });
        });

        if(bestSnapX !== null){
          dx = bestSnapX - startBounds.x;
          if(guideX) state.alignmentGuides.push(guideX);
        }
        if(bestSnapY !== null){
          dy = bestSnapY - startBounds.y;
          if(guideY) state.alignmentGuides.push(guideY);
        }
      }

      if(el.points){el.points=state.transform.startEl.points.map(p=>({x:p.x+dx,y:p.y+dy}));}
      else{el.x=state.transform.startEl.x+dx;el.y=state.transform.startEl.y+dy;}
      render();positionToolbar();if(inlineBox) updateInlineEditorTransform();return;
    }
    if(state.transform.mode==="resize"||state.transform.mode==="side"){
      const sb=state.transform.startBounds,idx=state.transform.handle.idx,isSide=state.transform.mode==="side";
      const MIN_W = el.type === "sticky" ? 80 : 10;
      const MIN_H = 10;
      let nx=sb.x,ny=sb.y,nw=sb.w,nh=sb.h;

      if(!isSide){
        if(idx===0){
          nx = Math.min(wPos.x, sb.x + sb.w - MIN_W);
          ny = Math.min(wPos.y, sb.y + sb.h - MIN_H);
          nw = sb.x + sb.w - nx;
          nh = sb.y + sb.h - ny;
        } else if(idx===1){
          nx = sb.x;
          ny = Math.min(wPos.y, sb.y + sb.h - MIN_H);
          nw = Math.max(wPos.x, sb.x + MIN_W) - sb.x;
          nh = sb.y + sb.h - ny;
        } else if(idx===2){
          nx = sb.x;
          ny = sb.y;
          nw = Math.max(wPos.x, sb.x + MIN_W) - sb.x;
          nh = Math.max(wPos.y, sb.y + MIN_H) - sb.y;
        } else {
          nx = Math.min(wPos.x, sb.x + sb.w - MIN_W);
          ny = sb.y;
          nw = sb.x + sb.w - nx;
          nh = Math.max(wPos.y, sb.y + MIN_H) - sb.y;
        }
      } else {
        if(idx===0){
          nx = Math.min(wPos.x, sb.x + sb.w - MIN_W);
          nw = sb.x + sb.w - nx;
        } else {
          nx = sb.x;
          nw = Math.max(wPos.x, sb.x + MIN_W) - sb.x;
        }
        if(el.type==="sticky"){
          el.w = Math.max(80, nw);
          el.x = nx;
          render();
          positionToolbar();
          if(inlineBox) updateInlineEditorTransform();
          return;
        }
      }

      nw = Math.max(MIN_W, nw);
      nh = Math.max(MIN_H, nh);

      if(el.type==="text"){
        const startSize=state.transform.startEl.size||18;
        const scale=isSide?(nw/Math.max(1,sb.w)):((nw/Math.max(1,sb.w)+nh/Math.max(1,sb.h))/2);
        el.size=clamp(startSize*Math.max(0.05,scale),6,400);
        fitTextElement(el);
        if(isSide){ el.y=sb.y; el.x=(idx===0)?(sb.x+sb.w-el.w):sb.x; }
        else if(idx===0){ el.x=sb.x+sb.w-el.w; el.y=sb.y+sb.h-el.h; }
        else if(idx===1){ el.x=sb.x; el.y=sb.y+sb.h-el.h; }
        else if(idx===2){ el.x=sb.x; el.y=sb.y; }
        else { el.x=sb.x+sb.w-el.w; el.y=sb.y; }
        render();positionToolbar();if(inlineBox) updateInlineEditorTransform();return;
      }
      if(LINE_TYPES.includes(el.type)){
        el.w=nw; el.h=nh;
        if(idx===0||idx===3){ el.x=nx; el.y=ny; }
        else if(idx===1){ el.x=sb.x; el.y=ny; }
      } else {
        if(el.points){
          const sx=nw/sb.w, sy=isSide?1:nh/sb.h;
          el.points=state.transform.startEl.points.map(p=>({x:nx+(p.x-sb.x)*sx,y:ny+(p.y-sb.y)*sy}));
        } else {
          el.x=nx; el.y=ny; el.w=Math.abs(nw); el.h=Math.abs(nh);
          if((el.type==="text"||el.type==="sticky")&&!isSide){
            const scale=(nw/sb.w+nh/sb.h)/2;
            el.size=Math.max(10,(state.transform.startEl.size||(el.type==="sticky"?16:18))*scale);
          }
        }
      }
      render();positionToolbar();return;
    }
    if(state.transform.mode==="rotate"){
      container.style.cursor="grabbing";
      const c=state.transform.center;
      let ang=Math.atan2(wPos.y-c.y,wPos.x-c.x)*180/Math.PI-90;
      while(ang>180) ang-=360;
      while(ang<-180) ang+=360;
      if(e.shiftKey){
        ang=Math.round(ang/15)*15;
      } else {
        const snaps=[0,45,-45,90,-90,135,-135,180,-180];
        const SNAP=3;
        for(const s of snaps){ if(Math.abs(ang-s)<SNAP){ ang=s===-180?180:s; break; } }
      }
      el.rotation=ang;
      render();positionToolbar();if(inlineBox) updateInlineEditorTransform();return;
    }
  }
  if(state.tool==="eraser"&&state.isDrawing){eraseAt(wPos);return;}
  if(!state.isDrawing)return;
  if(STROKE_TYPES.includes(state.tool)){
    if(state.activeRuler){
      const sp=projectOnEdge(state.activeRuler,wPos);
      const pts=state.currentElement.points;
      pts.length=1;
      pts.push(sp);
    } else if(state.activeProtractor){
      const sp=snapFromProtractor(state.activeProtractor,wPos);
      const pts=state.currentElement.points;
      pts.length=1;
      pts.push(sp);
    } else {
      const evs = (typeof e.getCoalescedEvents === "function") ? e.getCoalescedEvents() : [e];
      for(const ev of evs){
        const p = toWorld(ev.clientX, ev.clientY);
        const pts = state.currentElement.points;
        const last = pts[pts.length - 1];
        if(!last || Math.hypot(p.x - last.x, p.y - last.y) >= 0.75){
          pts.push(p);
        }
      }
    }
  }
  else if(state.currentElement){
    let w=wPos.x-state.currentElement.x,h=wPos.y-state.currentElement.y;
    if(e.shiftKey && ["rect","roundRect","circle","ellipse","triangle","diamond","star","hexagon","heart"].includes(state.currentElement.type)){
      const s=Math.max(Math.abs(w),Math.abs(h))||1;
      w=Math.sign(w||1)*s; h=Math.sign(h||1)*s;
    }
    state.currentElement.w=w;state.currentElement.h=h;
  }
  render();
});

window.addEventListener("pointerup",(e)=>{
  if(state.tempPan){
    const moved=state.panDidMove; const btn=state.panButton;
    state.isPanning=false; state.tempPan=false; state.panDidMove=false;
    const restore=state.prevTool||"select";
    setActiveTool(restore, {keepSelection:true});
    if(!moved && btn===2){
      const wPos=toWorld(e.clientX,e.clientY);
      const hit=hitElement(wPos);
      if(hit){state.selectedId=hit.id;showToolbar(hit);render();}
      showRC(e.clientX,e.clientY,wPos.x,wPos.y);
    }
    updateCursor(); saveBoards(); return;
  }
  if(state.isSelectingMarquee){
    state.isSelectingMarquee=false;
    if(state.selectedIds.length===1){
      state.selectedId=state.selectedIds[0];
      const el=state.elements.find(x=>x.id===state.selectedId);
      if(el) showToolbar(el);
    } else if(state.selectedIds.length>1){
      state.selectedId=null;
      showToolbar(null);
    } else {
      state.selectedId=null;
      hideToolbar();
    }
    render();
  }
  if(state.isTransforming){
    state.alignmentGuides = [];
    const noMove=!state.transform.didPush && state.transform.mode==="move";
    const el=state.elements.find(ee=>ee.id===state.selectedId);
    state.isTransforming=false;state.transform.mode=null;
    if(state.selectedIds.length>1){
      saveBoards(); updateCursor(); render();
    } else if(noMove && el && el.type==="timer" && !el.locked){
      toggleTimer(el); saveBoards(); render(); updateCursor(); return;
    } else if(noMove && el && ["text","sticky"].includes(el.type) && !el.locked){
      if(state.editArmed===el.id){
        createInlineEditor({x:el.x,y:el.y}, el, {selectAll:false});
        state.editArmed=null;
      } else {
        state.editArmed=el.id;
      }
    } else {
      state.editArmed=null;
    }
    saveBoards();updateCursor();
  }
  if(!state.spacePan) state.isPanning=false;
  if(state.tool==="eraser"&&state.isDrawing){
    if(state.eraseTouched) saveBoards();
    state.eraseTouched=false;state.eraseDidPush=false;
  }
  if(state.isDrawing&&state.currentElement){
    const cur=state.currentElement;
    if(cur.type==="compassGuide"){
      const r=Math.hypot(cur.w||0, cur.h||0);
      if(r>6){
        pushUndo();
        state.elements.push({id:genId(),type:"circle",x:cur.x-r,y:cur.y-r,w:r*2,h:r*2,color:cur.color||state.color,width:state.width||2,fill:false,rotation:0});
        saveBoards();
      }
      state.currentElement=null;
      setActiveTool("select");
    }else if(cur.points&&cur.points.length>=1){
      const el=cur;
      if(el.type==="vanishing"){
        state.elements.push(el);
        startLaserVanish(el);
      } else {
        pushUndo();
        state.elements.push(el);
        saveBoards();
      }
      if(ONE_SHOT_TOOLS.includes(el.type)) setActiveTool("select");
    }else if(cur.type && !cur.points){
      finalizeShape(cur);
      if(Math.abs(cur.w)>0.5||Math.abs(cur.h)>0.5){pushUndo();state.elements.push(cur);saveBoards(); if(ONE_SHOT_TOOLS.includes(cur.type)) setActiveTool("select");}
    }
    state.currentElement=null;
  }
  state.isDrawing=false;state.activeRuler=null;state.activeProtractor=null;render();updateCursor();
});

function splitStroke(el, erasePos, radius){
  if(!el.points||el.points.length<2) return [];
  const pts=el.points;
  const out=[]; let current=[];
  const r=radius+(el.width||2)*0.5;
  for(let i=0;i<pts.length;i++){
    const p=pts[i];
    const inside=Math.hypot(p.x-erasePos.x,p.y-erasePos.y)<=r;
    const segHit=i>0 && distToSegment(erasePos.x,erasePos.y,pts[i-1].x,pts[i-1].y,p.x,p.y)<=r;
    if(inside || segHit){
      if(current.length>=2) out.push(current);
      current=[];
    } else {
      current.push(p);
    }
  }
  if(current.length>=2) out.push(current);
  return out.map(seg=>({id:genId(),type:el.type,color:el.color,width:el.width,penStyle:el.penStyle,highlighterStyle:el.highlighterStyle,points:seg,rotation:0,opacity:1}));
}
let _laserLoopActive = false;
function tickLaserVanish(){
  const now = performance.now();
  let anyActive = false;

  for(let i = state.elements.length - 1; i >= 0; i--){
    const el = state.elements[i];
    if(el.type !== "vanishing") continue;
    anyActive = true;
    if(!el._vanishStart) el._vanishStart = now;
    
    const mode = el.vanishMode || state.vanishMode || "comet";
    const hold = mode === "ember" ? 400 : (mode === "ink" ? 800 : 60);
    const duration = mode === "comet" ? 650 : (mode === "ember" ? 800 : 1000);
    const elapsed = now - el._vanishStart;

    if(elapsed < hold) continue;

    const prog = Math.min(1, (elapsed - hold) / duration);
    if(mode === "comet"){
      el.cometCut = prog;
      el.opacity = 1 - prog * 0.15;
    } else if(mode === "ember"){
      el.cometCut = prog;
      el.opacity = 1 - prog * 0.25;
      if(el.points && el.points.length > 1 && state.fireParticles.length < 24){
        const idx = Math.min(el.points.length - 1, Math.floor(prog * (el.points.length - 1)));
        const p = el.points[idx];
        state.fireParticles.push({
          x: p.x + (Math.random() - 0.5) * 6,
          y: p.y + (Math.random() - 0.5) * 6,
          alpha: 1,
          size: 1.5 + Math.random() * 3,
          char: "*",
          color: ["#fde047", "#fb923c", "#ef4444"][Math.floor(Math.random() * 3)],
          vx: (Math.random() - 0.5) * 0.8,
          vy: -Math.random() * 1.5 - 0.4
        });
      }
    } else {
      el.inkMul = 1 - prog;
      el.opacity = 1 - prog * 0.7;
    }

    if(prog >= 1){
      state.elements.splice(i, 1);
      if(state.selectedId === el.id){
        state.selectedId = null;
        hideToolbar();
      }
    }
  }

  if(state.fireParticles.length > 0){
    anyActive = true;
    for(let j = state.fireParticles.length - 1; j >= 0; j--){
      const fp = state.fireParticles[j];
      fp.x += fp.vx;
      fp.y += fp.vy;
      fp.alpha -= 0.035;
      fp.vy -= 0.01;
      fp.vx *= 0.98;
      fp.size *= 0.98;
      if(fp.alpha <= 0 || fp.size <= 0.3){
        state.fireParticles.splice(j, 1);
      }
    }
  }

  render();

  if(anyActive){
    requestAnimationFrame(tickLaserVanish);
  } else {
    _laserLoopActive = false;
    state.fireParticles = [];
  }
}

function startLaserVanish(el){
  el._vanishStart = performance.now();
  if(!_laserLoopActive){
    _laserLoopActive = true;
    requestAnimationFrame(tickLaserVanish);
  }
}
function hitsErase(el, wPos, radius){
  if(el.locked) return false;
  const r=radius;
  if(STROKE_TYPES.includes(el.type)&&el.points){
    const hitR=r+(el.width||2)*0.5;
    for(let i=1;i<el.points.length;i++){
      if(distToSegment(wPos.x,wPos.y,el.points[i-1].x,el.points[i-1].y,el.points[i].x,el.points[i].y)<=hitR) return true;
    }
    if(el.points.length===1 && Math.hypot(wPos.x-el.points[0].x,wPos.y-el.points[0].y)<=hitR) return true;
    return false;
  }
  if(LINE_TYPES.includes(el.type)){
    return distToSegment(wPos.x,wPos.y,el.x,el.y,el.x+el.w,el.y+el.h)<=r+(el.width||2)*0.5;
  }
  if(["circle","ellipse"].includes(el.type)){
    const cx=el.x+el.w/2, cy=el.y+el.h/2, rx=Math.abs(el.w/2), ry=Math.abs(el.h/2);
    const nx=rx?(wPos.x-cx)/rx:0, ny=ry?(wPos.y-cy)/ry:0;
    const d=Math.hypot(nx,ny);
    if(el.fill) return d<=1+r/Math.max(rx,ry,1);
    return Math.abs(d-1)*Math.min(rx,ry)<=r+(el.width||2)*0.5;
  }
  if(["rect","roundRect","triangle","diamond","star","hexagon","heart"].includes(el.type)){
    const pts=shapePoints(el);
    if(el.fill) return pointInPoly(wPos.x,wPos.y,pts) || distToPoly(wPos.x,wPos.y,pts)<=r;
    return distToPoly(wPos.x,wPos.y,pts)<=r+(el.width||2)*0.5;
  }
  const b=getBounds(el);
  return wPos.x>=b.x && wPos.x<=b.x+b.w && wPos.y>=b.y && wPos.y<=b.y+b.h;
}
function eraseAt(wPos){
  const radius=Math.max(2,state.widths.eraser);
  let removed=false; const newElements=[]; const keep=[];
  for(const el of state.elements){
    if(el.locked){keep.push(el);continue;}
    if(!hitsErase(el,wPos,radius)){keep.push(el);continue;}
    if(STROKE_TYPES.includes(el.type)&&el.points&&state.eraserMode==="partial"){
      const splits=splitStroke(el,wPos,radius);
      if(splits.length) newElements.push(...splits);
      removed=true;
      if(el._fadeInterval)clearInterval(el._fadeInterval);
      continue;
    }
    removed=true;
    if(el._fadeInterval)clearInterval(el._fadeInterval);
  }
  if(removed||newElements.length){
    if(!state.eraseDidPush){pushUndo();state.eraseDidPush=true;}
    state.eraseTouched=true;state.elements=[...keep,...newElements];
    if(state.selectedId&&!state.elements.find(e=>e.id===state.selectedId)){state.selectedId=null;hideToolbar();}
    render();
  }
}

canvas.addEventListener("dblclick",e=>{
  const wp=toWorld(e.clientX,e.clientY);
  const hitTimer=state.elements.find(el=>{
    if(el.type!=="timer"||el.locked) return false;
    const b=getBounds(el);
    if(el.rotation){
      const c=getCenter(b);
      const lp=rotatePoint(wp.x,wp.y,c.x,c.y,-el.rotation);
      return lp.x>=b.x&&lp.x<=b.x+b.w&&lp.y>=b.y&&lp.y<=b.y+b.h;
    }
    return wp.x>=b.x&&wp.x<=b.x+b.w&&wp.y>=b.y&&wp.y<=b.y+b.h;
  });
  if(hitTimer){
    openTimerEditModal(hitTimer);
    return;
  }
  const hit=state.elements.find(el=>{if(el.type!=="text"&&el.type!=="sticky")return false;if(el.locked)return false;const b=getBounds(el);if(el.rotation){const c=getCenter(b);const lp=rotatePoint(wp.x,wp.y,c.x,c.y,-el.rotation);return lp.x>=b.x&&lp.x<=b.x+b.w&&lp.y>=b.y&&lp.y<=b.y+b.h;}return wp.x>=b.x&&wp.x<=b.x+b.w&&wp.y>=b.y&&wp.y<=b.y+b.h;});
  if(hit){createInlineEditor({x:hit.x,y:hit.y},hit,{selectAll:false});return;}
});

document.getElementById("pen-btn").addEventListener("dblclick",e=>{e.stopPropagation();openPopover("pen-popover");});
document.getElementById("highlighter-btn").addEventListener("dblclick",e=>{e.stopPropagation();openPopover("highlighter-popover");});
document.getElementById("eraser-btn").addEventListener("dblclick",e=>{e.stopPropagation();openPopover("eraser-popover");});
document.getElementById("vanishing-btn").addEventListener("dblclick",e=>{e.stopPropagation();openPopover("vanishing-popover");});
document.querySelectorAll(".tool-btn").forEach(b=>b.addEventListener("click",()=>{
  const t=b.dataset.tool;
  if(t==="select"){
    state.pendingPlace=null;
    syncPlaceButtons();
    updateCursor();
  }
  if(state.tool===t){
    if(t!=="select"){ openSettingsForTool(t); }
    return;
  }
  setActiveTool(t); closeAllPopovers();
}));
function setActiveTool(t, opts={}){
  if(state.widths[t]!=null){state.width=state.widths[t];}
  state.tool=t;
  if(!opts.keepPending) state.pendingPlace=null;
  if(!opts.keepSelection && t!=="select") deselect();
  const sc=document.getElementById("stroke-color");
  if(t==="pen"){state.color=state.toolColors.pen||"#1E1E1E"; if(sc) sc.value=state.color;}
  else if(t==="highlighter"){state.color=state.toolColors.highlighter||"#FF6B00"; if(sc) sc.value=state.color;}
  else if(t==="vanishing"){state.color=state.toolColors.vanishing||"#E52B50"; if(sc) sc.value=state.color;}
  else if(GEOMETRIC_SHAPES.includes(t)){state.color=state.toolColors.shape||"#1E1E1E"; if(sc) sc.value=state.color;}
  if(t==="pen"||t==="highlighter"||t==="vanishing"||t==="eraser"){document.getElementById("stroke-width").value=state.widths[t];}
  highlightTool(t);
  syncPlaceButtons();
  updateCursor();
  const cc = document.getElementById("click-counter");
  if(cc) cc.innerText=`${t.charAt(0).toUpperCase()+t.slice(1)} • ${state.clicks}`;
  hideRC();
}
function syncPlaceButtons(){
  const stickyBtn=document.getElementById("add-sticky-btn");
  const emojiBtn=document.getElementById("emoji-menu-btn");
  if(stickyBtn) stickyBtn.classList.toggle("active", !!(state.pendingPlace&&state.pendingPlace.type==="sticky"));
  if(emojiBtn) emojiBtn.classList.toggle("active", !!(state.pendingPlace&&state.pendingPlace.type==="emoji"));
  document.querySelectorAll(".teach-btn").forEach(b=>{
    const on=(state.pendingPlace&&state.pendingPlace.type===b.dataset.teach) || (b.dataset.teach==="compass"&&state.tool==="compass") || (b.dataset.teach==="spotlight"&&state.spotlight);
    b.classList.toggle("active", !!on);
  });
}
const _shapesMenuBtn = document.getElementById("shapes-menu-btn");
if(_shapesMenuBtn) _shapesMenuBtn.onclick=e=>{e.stopPropagation();openPopover("shapes-popover");};
const _emojiMenuBtn = document.getElementById("emoji-menu-btn");
if(_emojiMenuBtn) _emojiMenuBtn.onclick=e=>{e.stopPropagation();openPopover("emoji-popover");};
const _addStickyBtn = document.getElementById("add-sticky-btn");
if(_addStickyBtn) _addStickyBtn.onclick=e=>{
  e.stopPropagation();
  setActiveTool("select",{keepPending:true,keepSelection:true});
  state.pendingPlace={type:"sticky",bg:"#fef08a"};
  document.querySelectorAll(".sticky-color").forEach(b=>{
    const on=b.dataset.sticky==="#fef08a";
    b.classList.toggle("border-2", on);
    b.classList.toggle("border-slate-900", on);
  });
  openPopover("sticky-popover");
  syncPlaceButtons();
  updateCursor();
};
const _settingsMenuBtn = document.getElementById("settings-menu-btn");
if(_settingsMenuBtn) _settingsMenuBtn.onclick=e=>{e.stopPropagation();openPopover("settings-popover");};
const _boardsBtn = document.getElementById("boards-btn");
if(_boardsBtn) _boardsBtn.onclick=e=>{e.stopPropagation(); const m=document.getElementById("boards-modal"); if(m){ m.classList.toggle("hidden"); if(!m.classList.contains("hidden")) renderBoardsList(); }};
const _closeBoardsBtn = document.getElementById("close-boards");
if(_closeBoardsBtn) _closeBoardsBtn.onclick=()=>{ const m=document.getElementById("boards-modal"); if(m) m.classList.add("hidden"); };
const _newBoardBtn = document.getElementById("new-board-btn");
if(_newBoardBtn) _newBoardBtn.onclick=createNewLayer;
const _exportBoardBtn = document.getElementById("export-board-btn");
if(_exportBoardBtn) _exportBoardBtn.onclick=()=>exportLayer(state.activeLayerId);
const _exportAllBtn = document.getElementById("export-all-btn");
if(_exportAllBtn) _exportAllBtn.onclick=exportAllLayers;
const _importBoardBtn = document.getElementById("import-board-btn");
if(_importBoardBtn) _importBoardBtn.onclick=()=>{ const f=document.getElementById("import-file"); if(f) f.click(); };
const _importFileInput = document.getElementById("import-file");
if(_importFileInput) _importFileInput.onchange=e=>{const f=e.target.files[0]; if(f) importBoardsFile(f); e.target.value=""};

function doClearBoard(){state.elements.forEach(el=>{if(el._fadeInterval)clearInterval(el._fadeInterval)});pushUndo();state.elements=[];state.selectedId=null;hideAll();saveBoards(true);render();}
function closeClearOverlay(){
  const o=document.getElementById("clear-overlay");
  o.classList.remove("open","danger");
  o.setAttribute("aria-hidden","true");
  state.wipeConfirm=null;
}
function setWipeProgress(p){
  const slider=document.getElementById("clear-slider");
  const knob=document.getElementById("clear-knob");
  const fill=document.getElementById("clear-fill");
  const overlay=document.getElementById("clear-overlay");
  const max=Math.max(1, slider.clientWidth - knob.offsetWidth - 8);
  const x=Math.max(0, Math.min(max, p*max));
  knob.style.top="4px";
  knob.style.left=(4+x)+"px";
  if(fill) fill.style.width=(48+x)+"px";
  const hot=p>0.72;
  slider.classList.toggle("hot", hot);
  overlay.classList.toggle("danger", hot);
}
function openWipeOverlay({title, sub, label, onConfirm}){
  const o=document.getElementById("clear-overlay");
  document.getElementById("clear-title").textContent=title||"Wipe Board";
  document.getElementById("clear-sub").textContent=sub||"Slide to permanently clear this whiteboard";
  document.getElementById("clear-slide-label").textContent=label||"slide to wipe";
  o.classList.add("open"); o.classList.remove("danger"); o.setAttribute("aria-hidden","false");
  state.wipeConfirm=onConfirm;
  const knob=document.getElementById("clear-knob");
  const slider=document.getElementById("clear-slider");
  let dragging=false, startX=0, startLeft=4;
  setWipeProgress(0);
  const max = ()=> Math.max(1, slider.clientWidth - knob.offsetWidth - 8);
  const onDown=(ev)=>{dragging=true; startX=ev.clientX; startLeft=parseFloat(knob.style.left)||4; knob.setPointerCapture(ev.pointerId); ev.stopPropagation();};
  const onMove=(ev)=>{
    if(!dragging)return;
    const dx=ev.clientX-startX;
    const p=Math.max(0, Math.min(1, (startLeft-4+dx)/max()));
    setWipeProgress(p);
  };
  const onUp=()=>{
    if(!dragging)return; dragging=false;
    const p=((parseFloat(knob.style.left)||4)-4)/max();
    if(p>0.85){
      const fn=state.wipeConfirm;
      closeClearOverlay();
      if(fn) fn();
    } else setWipeProgress(0);
  };
  knob.onpointerdown=onDown;
  slider.onpointermove=onMove;
  slider.onpointerup=onUp;
  slider.onpointercancel=onUp;
}
function openClearOverlay(){
  openWipeOverlay({
    title:"Wipe Board",
    sub:"Slide to permanently clear this whiteboard",
    label:"slide to wipe",
    onConfirm:doClearBoard
  });
}
const _clearCancel = document.getElementById("clear-cancel");
if(_clearCancel) _clearCancel.onclick=closeClearOverlay;
const _clearBtn = document.getElementById("clear-btn");
if(_clearBtn) _clearBtn.onclick=()=>openClearOverlay();

document.querySelectorAll(".close-pop").forEach(b=>b.onclick=()=>closeAllPopovers());
document.querySelectorAll(".sticky-color").forEach(b=>{b.onclick=()=>{
  document.querySelectorAll(".sticky-color").forEach(x=>{x.classList.remove("border-2","border-slate-900");});
  b.classList.add("border-2","border-slate-900");
  state.pendingPlace={type:"sticky",bg:b.dataset.sticky};
  closeAllPopovers();
  deselect();
  syncPlaceButtons();
  updateCursor();
};});
document.querySelectorAll(".emoji-option").forEach(b=>{b.onclick=()=>{
  closeAllPopovers();
  deselect();
  setActiveTool("select",{keepPending:true,keepSelection:true});
  state.pendingPlace={type:"emoji",text:(b.textContent||"").trim()};
  syncPlaceButtons();
  updateCursor();
};});
const _strokeColor = document.getElementById("stroke-color");
if(_strokeColor) _strokeColor.oninput=e=>{
  const col=e.target.value;
  if(state.tool==="highlighter") state.toolColors.highlighter=col;
  else if(state.tool==="vanishing") state.toolColors.vanishing=col;
  else if(isGeometricShape({type: state.tool})) state.toolColors.shape=col;
  else {state.toolColors.pen=col; state.penColorUserSet=true;}
  state.color=col;
  updateCursor();
};
const _strokeWidth = document.getElementById("stroke-width");
if(_strokeWidth) _strokeWidth.oninput=e=>{
  const v=parseInt(e.target.value);state.width=v;
  if(state.widths[state.tool]!=null) state.widths[state.tool]=v;
  ["pen-thick","highlighter-thick","vanishing-thick","eraser-thick"].forEach(id=>{const el=document.getElementById(id);if(el){el.value=v;const valEl=document.getElementById(id+"-val"); if(valEl) valEl.innerText=v+"px";}});
};
const _penThick = document.getElementById("pen-thick");
if(_penThick) _penThick.oninput=e=>{const v=parseInt(e.target.value);state.width=v;state.widths.pen=v;const sw=document.getElementById("stroke-width");if(sw)sw.value=v;const ptVal=document.getElementById("pen-thick-val");if(ptVal)ptVal.innerText=v+"px";};
const _highlighterThick = document.getElementById("highlighter-thick");
if(_highlighterThick) _highlighterThick.oninput=e=>{const v=parseInt(e.target.value);state.widths.highlighter=v;if(state.tool==="highlighter")state.width=v;const htVal=document.getElementById("highlighter-thick-val");if(htVal)htVal.innerText=v+"px";};
const _vanishingThick = document.getElementById("vanishing-thick");
if(_vanishingThick) _vanishingThick.oninput=e=>{const v=parseInt(e.target.value);state.widths.vanishing=v;if(state.tool==="vanishing")state.width=v;const vtVal=document.getElementById("vanishing-thick-val");if(vtVal)vtVal.innerText=v+"px";};
const _eraserThick = document.getElementById("eraser-thick");
if(_eraserThick) _eraserThick.oninput=e=>{const v=parseInt(e.target.value);state.widths.eraser=v;if(state.tool==="eraser")state.width=v;const etVal=document.getElementById("eraser-thick-val");if(etVal)etVal.innerText=v+"px";};
const _eraserModeWhole = document.getElementById("eraser-mode-whole");
const _eraserModePartial = document.getElementById("eraser-mode-partial");
if(_eraserModeWhole) _eraserModeWhole.onclick=()=>{state.eraserMode="whole"; if(_eraserModeWhole)_eraserModeWhole.className="flex-1 px-2 py-1.5 rounded-full bg-slate-900 text-white text-xs"; if(_eraserModePartial)_eraserModePartial.className="flex-1 px-2 py-1.5 rounded-full bg-slate-100 text-xs";};
if(_eraserModePartial) _eraserModePartial.onclick=()=>{state.eraserMode="partial"; if(_eraserModeWhole)_eraserModeWhole.className="flex-1 px-2 py-1.5 rounded-full bg-slate-100 text-xs"; if(_eraserModePartial)_eraserModePartial.className="flex-1 px-2 py-1.5 rounded-full bg-slate-900 text-white text-xs";};
const _exportPngBtn = document.getElementById("export-png-btn");
if(_exportPngBtn) _exportPngBtn.onclick=async ()=>{
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  state.elements.forEach(el=>{const b=getBounds(el);minX=Math.min(minX,b.x);minY=Math.min(minY,b.y);maxX=Math.max(maxX,b.x+b.w);maxY=Math.max(maxY,b.y+b.h);});
  if(!isFinite(minX)){showSmartToast("Whiteboard is empty — draw something first!", "ℹ️");return;}
  const pad=80; const dpr=Math.min(2, window.devicePixelRatio||1); const w=Math.ceil(maxX-minX+pad*2), h=Math.ceil(maxY-minY+pad*2);
  const exp=document.createElement("canvas"); exp.width=w*dpr; exp.height=h*dpr; const ec=exp.getContext("2d"); ec.scale(dpr,dpr);
  ec.fillStyle=state.bgColor||"#ffffff"; ec.fillRect(0,0,w,h); ec.translate(-minX+pad,-minY+pad);
  
  function drawToCtx(el, c){
    c.save(); const b=getBounds(el), cx=b.x+b.w/2, cy=b.y+b.h/2; if(el.rotation){c.translate(cx,cy); c.rotate(el.rotation*Math.PI/180); c.translate(-cx,-cy);}
    c.strokeStyle=el.color||"#1E1E1E"; c.fillStyle=el.color||"#1E1E1E"; c.lineWidth=el.width||2; c.lineCap="round"; c.lineJoin="round";
    if(STROKE_TYPES.includes(el.type) && el.points){
      if(el.type==="highlighter") c.globalAlpha = 0.35;
      drawSmoothStrokePath(c, el.points);
      c.globalAlpha = 1;
    }
    else if(el.type==="rect"){ if(el.fill) c.fillRect(el.x,el.y,el.w,el.h); else c.strokeRect(el.x,el.y,el.w,el.h); }
    else if(el.type==="roundRect"){ const r=Math.min(12,Math.abs(el.w)/4,Math.abs(el.h)/4); c.beginPath(); if(c.roundRect) c.roundRect(el.x,el.y,el.w,el.h,r); else c.rect(el.x,el.y,el.w,el.h); if(el.fill) c.fill(); else c.stroke(); }
    else if(["circle","ellipse"].includes(el.type)){ c.beginPath(); c.ellipse(el.x+el.w/2,el.y+el.h/2,Math.abs(el.w/2),Math.abs(el.h/2),0,0,Math.PI*2); if(el.fill) c.fill(); else c.stroke(); }
    else if(el.type==="triangle"){ c.beginPath(); c.moveTo(el.x+el.w/2,el.y); c.lineTo(el.x,el.y+el.h); c.lineTo(el.x+el.w,el.y+el.h); c.closePath(); if(el.fill) c.fill(); else c.stroke(); }
    else if(el.type==="diamond"){ c.beginPath(); c.moveTo(el.x+el.w/2,el.y); c.lineTo(el.x+el.w,el.y+el.h/2); c.lineTo(el.x+el.w/2,el.y+el.h); c.lineTo(el.x,el.y+el.h/2); c.closePath(); if(el.fill) c.fill(); else c.stroke(); }
    else if(el.type==="star"){ const r=Math.min(Math.abs(el.w),Math.abs(el.h))/2; drawStar(el.x+el.w/2,el.y+el.h/2,r,r*0.45,5); if(el.fill) c.fill(); else c.stroke(); }
    else if(el.type==="hexagon"){ drawHexagon(el.x,el.y,el.w,el.h); if(el.fill) c.fill(); else c.stroke(); }
    else if(el.type==="heart"){ drawHeart(el.x,el.y,el.w,el.h); if(el.fill) c.fill(); else c.stroke(); }
    else if(el.type==="sticky"){
      c.fillStyle=el.bg||"#fef08a"; roundRectPath(el.x,el.y,el.w,el.h,14); c.fill();
      c.fillStyle=el.color||"#422006"; c.font=`${el.size||16}px Segoe UI,Inter,sans-serif`; c.textBaseline="top";
      (el.isPlaceholder?"":(el.text||"")).split("\n").forEach((ln,i)=>{c.fillText(ln,el.x+12,el.y+12+i*(el.size||16)*1.35)});
    }
    else if(LINE_TYPES.includes(el.type)){
      if(el.type==="dashed") c.setLineDash([8,6]);
      c.beginPath(); c.moveTo(el.x,el.y); c.lineTo(el.x+el.w,el.y+el.h); c.stroke(); c.setLineDash([]);
      if(el.type==="arrow"||el.type==="doubleArrow"){const a=Math.atan2(el.h,el.w),hl=14;c.beginPath();c.moveTo(el.x+el.w,el.y+el.h);c.lineTo(el.x+el.w-hl*Math.cos(a-Math.PI/6),el.y+el.h-hl*Math.sin(a-Math.PI/6));c.moveTo(el.x+el.w,el.y+el.h);c.lineTo(el.x+el.w-hl*Math.cos(a+Math.PI/6),el.y+el.h-hl*Math.sin(a+Math.PI/6));c.stroke();}
      if(el.type==="doubleArrow"){const a=Math.atan2(el.h,el.w),hl=14;c.beginPath();c.moveTo(el.x,el.y);c.lineTo(el.x+hl*Math.cos(a-Math.PI/6),el.y+hl*Math.sin(a-Math.PI/6));c.moveTo(el.x,el.y);c.lineTo(el.x+hl*Math.cos(a+Math.PI/6),el.y+hl*Math.sin(a+Math.PI/6));c.stroke();}
    }
    else if(el.type==="text"){
      c.fillStyle=el.color||"#1E1E1E"; c.font=`${el.bold?"bold ":""}${el.italic?"italic ":""}${el.size||18}px ${el.font||"Segoe UI,Inter,sans-serif"}`; c.textBaseline="top";
      (el.isPlaceholder?"":(el.text||"")).split("\n").forEach((ln,i)=>{c.fillText(ln,el.x,el.y+i*(el.size||18)*1.25)});
    }
    else if(el.type==="image"&&el.img&&el.img.complete) c.drawImage(el.img,el.x,el.y,el.w,el.h);
    else if(el.type==="emoji"){ c.font=`${el.w||32}px sans-serif`; c.textBaseline="top"; c.fillText(el.text,el.x,el.y); }
    c.restore();
  }

  state.elements.forEach(el=>drawToCtx(el,ec));
  const bTitle=document.getElementById("board-title");
  const rawTitle=((bTitle&&bTitle.value)||"whiteboard");
  const filename=`${rawTitle}.png`;

  exp.toBlob(async (blob) => {
    if(!blob) return;
    try {
      const curB = currentBoardRecord() || {};
      const payload = {
        name: rawTitle,
        elements: (state.elements||[]).map(el => {
          const { img, _handles, _fadeInterval, fireStarted, _fresh, ...clean } = el;
          if(clean.type === "vanishing") return { ...clean, opacity: 1 };
          return clean;
        }),
        bgColor: state.bgColor,
        theme: state.theme,
        gridStyle: state.gridStyle,
        gridSpacing: state.gridSpacing,
        camera: state.camera,
        ...curB,
      };

      const engine = await getSmartPngEngine();
      const smartBlob = await engine.embedSmartPngMetadata(blob, payload);
      const url = URL.createObjectURL(smartBlob);
      const a = document.createElement("a");
      a.download = filename;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showSmartToast("✨ Smart PNG Exported with editable canvas data!", "💾");
    } catch(err){
      console.warn("Smart PNG export fallback:", err);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.download = filename;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  }, "image/png");
};
const _undoBtn = document.getElementById("undo-btn");
if(_undoBtn) _undoBtn.onclick=undo;
const _redoBtn = document.getElementById("redo-btn");
if(_redoBtn) _redoBtn.onclick=redo;
const _toggleMinimapBtn = document.getElementById("toggle-minimap-btn");
if(_toggleMinimapBtn) _toggleMinimapBtn.onclick=()=>{
  const m=document.getElementById("minimap-container");
  if(m){
    m.classList.toggle("hidden");
    if(!m.classList.contains("hidden")) renderMinimap();
  }
};
const _closeMinimapBtn = document.getElementById("close-minimap");
if(_closeMinimapBtn) _closeMinimapBtn.onclick=()=>{ const m=document.getElementById("minimap-container"); if(m) m.classList.add("hidden"); };
document.querySelectorAll(".pos-btn").forEach(b=>{
  b.onclick=()=>{applyToolbarPos(b.dataset.pos)}
});
document.querySelectorAll(".theme-btn").forEach(b=>{
  b.onclick=()=>{applyTheme(b.dataset.theme)}
});
const _stDeleteBtn = document.getElementById("st-delete");
if(_stDeleteBtn) _stDeleteBtn.onclick=()=>{deleteSelected()};
function deleteSelected(){
  if(state.selectedIds.length>1){
    pushUndo();
    const ids=new Set(state.selectedIds);
    state.elements.forEach(el=>{if(ids.has(el.id)&&el._fadeInterval)clearInterval(el._fadeInterval)});
    state.elements=state.elements.filter(el=>!ids.has(el.id)||el.locked);
    state.selectedIds=[]; state.selectedId=null; hideToolbar(); saveBoards(true); render();
    return;
  }
  if(!state.selectedId)return;
  if(inlineBox && state.inlineEditingId===state.selectedId) cleanupInlineEditor();
  const cur=state.elements.find(e=>e.id===state.selectedId);if(cur&&cur.locked)return;if(cur&&cur._fadeInterval)clearInterval(cur._fadeInterval);pushUndo();state.elements=state.elements.filter(e=>e.id!==state.selectedId);state.selectedId=null;state.editArmed=null;hideToolbar();saveBoards(true);render();
}
function duplicateSelected(){
  if(state.selectedIds.length>1){
    pushUndo();
    const newIds=[];
    const duplicates=[];
    state.selectedIds.forEach(id=>{
      const el=state.elements.find(e=>e.id===id);
      if(!el) return;
      const cl={...el,id:genId(),x:(el.x||0)+24,y:(el.y||0)+24,points:el.points?el.points.map(p=>({x:p.x+24,y:p.y+24})):null,img:el.img,locked:false,_handles:null,_fresh:false};
      if(cl.points){delete cl.x;delete cl.y;}
      duplicates.push(cl);
      newIds.push(cl.id);
    });
    state.elements.push(...duplicates);
    state.selectedIds=newIds;
    state.selectedId=null;
    saveBoards(true);render();showMultiToolbar();
    return;
  }
  const el=state.elements.find(e=>e.id===state.selectedId);if(!el)return;pushUndo();const cl={...el,id:genId(),x:(el.x||0)+24,y:(el.y||0)+24,points:el.points?el.points.map(p=>({x:p.x+24,y:p.y+24})):null,img:el.img,locked:false,_handles:null,_fresh:false};if(cl.points){delete cl.x;delete cl.y;}state.elements.push(cl);state.selectedId=cl.id;saveBoards(true);render();showToolbar(cl);
}
function copySelectedToClipboard(){
  if(state.selectedIds.length>1){
    const list=state.selectedIds.map(id=>{
      const el=state.elements.find(e=>e.id===id);
      if(!el) return null;
      const clone=JSON.parse(JSON.stringify(el));
      delete clone.img; delete clone._handles; delete clone._fadeInterval;
      return clone;
    }).filter(Boolean);
    state.internalClipboard=list;
    try{ navigator.clipboard.writeText(JSON.stringify(list)); }catch(e){}
    return;
  }
  const el=targetCopyElement(); if(el) copyElementToClipboard(el);
}
const _stDup = document.getElementById("st-duplicate");
if(_stDup) _stDup.onclick=duplicateSelected;
const _stCopy = document.getElementById("st-copy");
if(_stCopy) _stCopy.onclick=()=>{if(state.selectedIds.length>1) copySelectedToClipboard(); else {const el=targetCopyElement(); if(el) copyElementToClipboard(el);}};
const _stLock = document.getElementById("st-lock");
if(_stLock) _stLock.onclick=()=>{
  if(state.selectedIds.length>1){
    pushUndo();
    const anyLocked=state.selectedIds.some(id=>{const el=state.elements.find(e=>e.id===id); return el&&el.locked;});
    const targetLocked=!anyLocked;
    state.selectedIds.forEach(id=>{
      const el=state.elements.find(e=>e.id===id);
      if(el) el.locked=targetLocked;
    });
    saveBoards(true); render(); showMultiToolbar();
    return;
  }
  const el=state.elements.find(e=>e.id===state.selectedId);if(el){pushUndo();el.locked=!el.locked;saveBoards(true);render();showToolbar(el);}
};
const _stEdit = document.getElementById("st-edit");
if(_stEdit) _stEdit.onclick=()=>{const el=state.elements.find(e=>e.id===state.selectedId);if(el&&!el.locked&&["text","sticky"].includes(el.type))createInlineEditor({x:el.x,y:el.y},el,{selectAll:false});};
const _stColor = document.getElementById("st-color");
if(_stColor) _stColor.onclick=e=>{e.stopPropagation();const p=document.getElementById("st-color-palette");if(!p)return;const wasHidden=p.classList.contains("hidden");closeAllSmallPalettes();if(wasHidden){createToolbarColorGrid();p.classList.remove("hidden");}};
const _stBold = document.getElementById("st-bold");
if(_stBold) _stBold.onclick=e=>{
  e.stopPropagation();
  const selectedEls = state.selectedIds.length > 1
    ? state.selectedIds.map(id => state.elements.find(x => x.id === id)).filter(Boolean)
    : [state.elements.find(x => x.id === state.selectedId || x.id === state.inlineEditingId)].filter(Boolean);
  
  const hasTextish = selectedEls.some(el => ["text","sticky"].includes(el.type));
  const hasShapes = selectedEls.some(el => isGeometricShape(el));
  
  if(hasShapes && !hasTextish){
    pushUndo();
    const anyNotBold = selectedEls.some(el => !el.isBoldShape);
    selectedEls.forEach(el => {
      if(anyNotBold){
        if(!el.isBoldShape){
          el.baseWidth = el.width || 2;
          el.width = el.baseWidth * 3;
          el.isBoldShape = true;
        }
      } else {
        if(el.isBoldShape){
          el.width = el.baseWidth || Math.max(1, Math.round((el.width || 2) / 3));
          el.isBoldShape = false;
        }
      }
    });
    saveBoards(true);
    render();
    if(state.selectedIds.length > 1) showMultiToolbar();
    else if(selectedEls[0]) showToolbar(selectedEls[0]);
    return;
  }

  const p=document.getElementById("st-bold-palette");
  if(!p)return;
  const wasHidden=p.classList.contains("hidden");
  closeAllSmallPalettes();
  if(wasHidden) p.classList.remove("hidden");
};
const _stMore = document.getElementById("st-more");
if(_stMore) _stMore.onclick=e=>{e.stopPropagation();const p=document.getElementById("st-more-palette");if(!p)return;const wasHidden=p.classList.contains("hidden");closeAllSmallPalettes();if(wasHidden) p.classList.remove("hidden");};
document.querySelectorAll("#st-bold-palette button[data-style]").forEach(b=>{
  b.onclick=()=>{
    const st=b.dataset.style;
    if(state.selectedIds.length>1){
      pushUndo();
      const anyNotBold = state.selectedIds.some(id => {
        const el = state.elements.find(x => x.id === id);
        return el && (isGeometricShape(el) ? !el.isBoldShape : (["text","sticky"].includes(el.type) ? !el.bold : false));
      });
      state.selectedIds.forEach(id=>{
        const el=state.elements.find(x=>x.id===id);
        if(!el) return;
        if(isGeometricShape(el) && st==="bold"){
          if(anyNotBold){
            if(!el.isBoldShape){
              el.baseWidth = el.width || 2;
              el.width = el.baseWidth * 3;
              el.isBoldShape = true;
            }
          } else {
            if(el.isBoldShape){
              el.width = el.baseWidth || Math.max(1, Math.round((el.width || 2) / 3));
              el.isBoldShape = false;
            }
          }
        } else if(["text","sticky"].includes(el.type)){
          if(st==="bold") el.bold=anyNotBold;
          if(st==="italic") el.italic=!el.italic;
          if(st==="underline") el.underline=!el.underline;
          el.isPlaceholder=false;
          if(el.type==="text"){fitTextElement(el); syncTextAnchor(el);}
        }
      });
      saveBoards(true); render(); positionToolbar(); showMultiToolbar();
      return;
    }
    const el=state.elements.find(x=>x.id===state.selectedId||x.id===state.inlineEditingId);
    if(!el)return;
    pushUndo();
    if(isGeometricShape(el) && st==="bold"){
      toggleShapeBold(el);
    } else if(["text","sticky"].includes(el.type)){
      if(st==="bold") el.bold=!el.bold;
      if(st==="italic") el.italic=!el.italic;
      if(st==="underline") el.underline=!el.underline;
      el.isPlaceholder=false;
      if(inlineEditor&&state.inlineEditingId===el.id){
        inlineEditor.style.fontWeight=el.bold?"700":"400";
        inlineEditor.style.fontStyle=el.italic?"italic":"normal";
        inlineEditor.style.textDecoration=el.underline?"underline":"none";
      }
      if(el.type==="text"){fitTextElement(el); syncTextAnchor(el);}
    }
    saveBoards(true); render();
    if(inlineBox) updateInlineEditorTransform();
    positionToolbar();
    showToolbar(el);
  };
});
function applyTextFont(el, font){
  if(state.selectedIds.length>1){
    pushUndo();
    state.selectedIds.forEach(id=>{
      const item=state.elements.find(x=>x.id===id);
      if(item && ["text","sticky"].includes(item.type)){
        item.font=font; item.isPlaceholder=false;
        if(item.type==="text"){ fitTextElement(item); syncTextAnchor(item); }
      }
    });
    saveBoards(true); render(); positionToolbar();
    return;
  }
  el.font=font; el.isPlaceholder=false;
  if(inlineEditor&&state.inlineEditingId===el.id) inlineEditor.style.fontFamily=font;
  if(el.type==="text"){fitTextElement(el); syncTextAnchor(el);}
  if(inlineBox) updateInlineEditorTransform();
  saveBoards(true); render(); positionToolbar();
}
function applyTextSize(el, size){
  if(state.selectedIds.length>1){
    pushUndo();
    state.selectedIds.forEach(id=>{
      const item=state.elements.find(x=>x.id===id);
      if(item && ["text","sticky"].includes(item.type)){
        item.size=size; item.isPlaceholder=false;
        if(item.type==="text"){ fitTextElement(item); syncTextAnchor(item); }
      }
    });
    saveBoards(true); render(); positionToolbar();
    return;
  }
  el.size=size; el.isPlaceholder=false;
  if(inlineEditor&&state.inlineEditingId===el.id) inlineEditor.style.fontSize=(size*state.camera.zoom)+"px";
  if(el.type==="text"){fitTextElement(el); syncTextAnchor(el);}
  if(inlineBox) updateInlineEditorTransform();
  saveBoards(true); render(); positionToolbar();
}
function fillFontPalette(){
  const c=document.getElementById("st-font-palette"); if(!c) return;
  const el=state.elements.find(x=>x.id===state.selectedId||x.id===state.inlineEditingId);
  c.innerHTML="";
  TEXT_FONTS.forEach(f=>{
    const b=document.createElement("button");
    b.type="button";
    b.className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-xs transition-colors flex items-center justify-between";
    b.style.fontFamily=f.id;
    b.textContent=f.label;
    if(el && (el.font||"").startsWith(f.id.split(",")[0])) b.classList.add("bg-slate-100","dark:bg-white/10","font-bold");
    b.onclick=(ev)=>{ev.stopPropagation(); if(!el) return; pushUndo(); applyTextFont(el,f.id); fillFontPalette();};
    c.appendChild(b);
  });
}
function fillSizePalette(){
  const c=document.getElementById("st-size-palette"); if(!c) return;
  const el=state.elements.find(x=>x.id===state.selectedId||x.id===state.inlineEditingId);
  c.innerHTML="";
  const grid=document.createElement("div");
  grid.className="grid grid-cols-4 gap-1.5";
  TEXT_SIZES.forEach(sz=>{
    const b=document.createElement("button");
    b.type="button";
    const isActive = el && el.size === sz;
    b.className=`py-1.5 px-1 rounded-md text-[11px] font-medium text-center transition-colors ${isActive ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-sm" : "bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20"}`;
    b.textContent=sz;
    b.onclick=(ev)=>{ev.stopPropagation(); if(!el) return; pushUndo(); applyTextSize(el,sz); fillSizePalette();};
    grid.appendChild(b);
  });
  c.appendChild(grid);
}
const _stFont = document.getElementById("st-font");
if(_stFont) _stFont.onclick=e=>{
  e.stopPropagation();
  const p=document.getElementById("st-font-palette");
  const s=document.getElementById("st-size-palette");
  if(!p) return;
  const was=p.classList.contains("hidden");
  if(s) s.classList.add("hidden");
  if(was){ fillFontPalette(); p.classList.remove("hidden"); } else p.classList.add("hidden");
};
const _stSize = document.getElementById("st-size");
if(_stSize) _stSize.onclick=e=>{
  e.stopPropagation();
  const p=document.getElementById("st-size-palette");
  const f=document.getElementById("st-font-palette");
  if(!p) return;
  const was=p.classList.contains("hidden");
  if(f) f.classList.add("hidden");
  if(was){ fillSizePalette(); p.classList.remove("hidden"); } else p.classList.add("hidden");
};
document.querySelectorAll("#st-more-palette button").forEach(b=>{
  b.onclick=()=>{
    const act=b.dataset.action;
    if(state.selectedIds.length>1){
      pushUndo();
      const ids=new Set(state.selectedIds);
      const selectedEls=state.elements.filter(x=>ids.has(x.id));
      const nonSelectedEls=state.elements.filter(x=>!ids.has(x.id));
      if(act==="front"){
        state.elements=[...nonSelectedEls, ...selectedEls];
      } else if(act==="backward"){
        state.elements=[...selectedEls, ...nonSelectedEls];
      } else if(act==="forward"){
        // Shift selected block forward by one index relative to non-selected elements
        for(let i=state.elements.length-2; i>=0; i--){
          if(ids.has(state.elements[i].id) && !ids.has(state.elements[i+1].id)){
            [state.elements[i], state.elements[i+1]] = [state.elements[i+1], state.elements[i]];
          }
        }
      } else if(act==="back"){
        // Shift selected block backward by one index relative to non-selected elements
        for(let i=1; i<state.elements.length; i++){
          if(ids.has(state.elements[i].id) && !ids.has(state.elements[i-1].id)){
            [state.elements[i], state.elements[i-1]] = [state.elements[i-1], state.elements[i]];
          }
        }
      }
      saveBoards(true);render();const mp=document.getElementById("st-more-palette");if(mp)mp.classList.add("hidden");
      return;
    }
    const el=state.elements.find(x=>x.id===state.selectedId);if(!el)return;pushUndo();
    const idx=state.elements.findIndex(x=>x.id===el.id);
    if(act==="front"){state.elements.splice(idx,1);state.elements.push(el);}
    if(act==="forward"){if(idx<state.elements.length-1){[state.elements[idx],state.elements[idx+1]]=[state.elements[idx+1],state.elements[idx]];}}
    if(act==="back"){if(idx>0){[state.elements[idx],state.elements[idx-1]]=[state.elements[idx-1],state.elements[idx]];}}
    if(act==="backward"){state.elements.splice(idx,1);state.elements.unshift(el);}
    saveBoards(true);render();const mp=document.getElementById("st-more-palette");if(mp)mp.classList.add("hidden");
  }
});
const _imageUpload = document.getElementById("image-upload");
if(_imageUpload){
  _imageUpload.addEventListener("change",async e=>{
    const files=e.target.files;
    if(!files||!files.length)return;
    await handlePastedOrUploadedImages(files);
    e.target.value="";
  });
}
container.addEventListener("dragover",e=>e.preventDefault(),__hbSig);
container.addEventListener("drop",async e=>{
  e.preventDefault();
  const files=e.dataTransfer?.files;
  if(!files||!files.length)return;
  const wp=toWorld(e.clientX,e.clientY);
  await handlePastedOrUploadedImages(files, wp.x, wp.y);
});
const _gridDots = document.getElementById("grid-dots");
if(_gridDots) _gridDots.onclick=()=>{applyGridStyle("dot-grid");};
const _gridLines = document.getElementById("grid-lines");
if(_gridLines) _gridLines.onclick=()=>{applyGridStyle("line-grid");};
const _gridNone = document.getElementById("grid-none");
if(_gridNone) _gridNone.onclick=()=>{applyGridStyle("bg-white");};
const gridSpacing=document.getElementById("grid-spacing");
if(gridSpacing){
  ["pointerdown","pointerup","pointermove","mousedown","click","touchstart"].forEach(ev=>gridSpacing.addEventListener(ev,e=>e.stopPropagation()));
  gridSpacing.oninput=e=>{state.gridSpacing=parseInt(e.target.value); const gsv=document.getElementById("grid-spacing-val"); if(gsv) gsv.innerText=state.gridSpacing+"px"; updateGrid(); saveBoards();};
}
document.querySelectorAll(".popover-menu").forEach(p=>{
  p.addEventListener("pointerdown",e=>e.stopPropagation());
  p.addEventListener("pointermove",e=>e.stopPropagation());
});
const stickyRailEl=document.getElementById("sticky-color-rail");
if(stickyRailEl){
  stickyRailEl.addEventListener("pointerdown",e=>e.stopPropagation());
  stickyRailEl.addEventListener("pointermove",e=>e.stopPropagation());
}
(function setupBgSwatches(){
  const wrap=document.getElementById("bg-swatches"); if(!wrap) return;
  wrap.innerHTML="";
  BG6.forEach(col=>{
    const b=document.createElement("button");
    b.className="w-7 h-7 rounded-full border shadow-sm";
    b.style.background=col; if(col==="#ffffff") b.style.borderColor="#cbd5e1";
    b.onclick=()=>{
      applyBgColor(col);
      [...wrap.children].forEach(x=>x.style.outline="");
      b.style.outline="2px solid #0f172a";
    };
    wrap.appendChild(b);
  });
})();
const _zoomIn = document.getElementById("zoom-in");
if(_zoomIn) _zoomIn.onclick=()=>zoomAt(1.15);
const _zoomOut = document.getElementById("zoom-out");
if(_zoomOut) _zoomOut.onclick=()=>zoomAt(1/1.15);
const _zfit=document.getElementById("zoom-fit");
if(_zfit) _zfit.onclick=()=>fitToScreen(true);
const _zrst=document.getElementById("zoom-reset");
if(_zrst) _zrst.onclick=()=>{
  const wp=getViewportCenter();
  cinematicGlide({x:innerWidth/2 - wp.x, y:innerHeight/2 - wp.y, zoom:1});
};

document.querySelectorAll("#shapes-grid .tool-btn, .stealth-shape-btn").forEach(b=>{
  b.onclick=(e)=>{
    e.stopPropagation();
    const t=b.dataset.tool;
    if(!t) return;
    setActiveTool(t);
    document.querySelectorAll("#shapes-grid .tool-btn, .stealth-shape-btn").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    closeAllPopovers();
  };
});

const _gv=document.getElementById("global-vanish");
if(_gv) _gv.oninput=e=>{state.vanishMode=e.target.value; createVanishAnims(); saveBoards();};
const _sae=document.getElementById("sticky-auto-edit");
if(_sae) _sae.onchange=e=>{state.stickyAutoEdit=e.target.checked; saveBoards();};
function hideStickyRail(){
  const rail=document.getElementById("sticky-color-rail");
  if(rail) rail.classList.add("hidden");
}
function showStickyRail(el){
  const rail=document.getElementById("sticky-color-rail");
  if(!rail||!el) return;
  rail.innerHTML="";
  STICKY_COLORS.forEach(col=>{
    const b=document.createElement("button");
    b.type="button";
    b.style.background=col;
    if(col==="#ffffff") b.style.borderColor="#cbd5e1";
    if((el.bg||"#fef08a").toLowerCase()===col) b.classList.add("active");
    b.title="Note color";
    b.onclick=(ev)=>{
      ev.stopPropagation();
      pushUndo();
      el.bg=col;
      saveBoards(true);
      render();
      showStickyRail(el);
    };
    rail.appendChild(b);
  });
  rail.classList.remove("hidden");
  positionStickyRail(el);
}
function positionStickyRail(el){
  const rail=document.getElementById("sticky-color-rail");
  if(!rail||rail.classList.contains("hidden")||!el) return;
  const b=getBounds(el);
  const left=toScreen(b.x, b.y+b.h/2);
  const right=toScreen(b.x+b.w, b.y+b.h/2);
  const host=container.parentElement;
  const hr=host.getBoundingClientRect();
  const rh=rail.offsetHeight||160;
  const rw=rail.offsetWidth||34;
  const gap=14;
  let x, y=left.y-rh/2;
  const spaceLeft=left.x;
  const spaceRight=innerWidth-right.x;
  if(spaceRight>=spaceLeft){
    x=right.x+gap;
  } else {
    x=left.x-gap-rw;
  }
  x=Math.max(8, Math.min(innerWidth-rw-8, x));
  y=Math.max(8, Math.min(innerHeight-rh-8, y));
  rail.style.left=(x-hr.left)+"px";
  rail.style.top=(y-hr.top)+"px";
}
function playTimerChime(){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    const chimeFrequencies = [587.33, 739.99, 880.00, 1174.66]; // Soft harmonic alert chime chord (D5, F#5, A5, D6)
    chimeFrequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.0001, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.08 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.72);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.76);
    });
  }catch(e){}
}

function toggleTimer(el){
  if(el.mode === "countup"){
    if(el.running){
      el.running = false;
      const curElapsed = ((Date.now() - (el.startAt || Date.now())) + (el.elapsedOffset || 0)) / 1000;
      el.elapsed = Math.max(0, Math.floor(curElapsed));
      el.elapsedOffset = el.elapsed * 1000;
      el.startAt = null;
    } else {
      el.running = true;
      el.startAt = Date.now();
      el.elapsedOffset = (el.elapsed || 0) * 1000;
    }
    render();
    return;
  }
  const left=timerRemaining(el);
  if(el.running){
    el.running=false;
    el.left=left;
    el.endAt=null;
  } else {
    let startingSecs = left;
    if(startingSecs <= 0){
      startingSecs = el.duration || 300;
      el.left = startingSecs;
      el._chimed = false;
    }
    el.running=true;
    el.endAt=Date.now() + (startingSecs * 1000);
  }
  render();
}
setInterval(()=>{
  let needRender = false;
  state.elements.forEach(el=>{
    if(el.type==="timer" && el.running){
      if(el.mode === "countup"){
        needRender = true;
      } else {
        needRender = true;
        if(timerRemaining(el)<=0){
          el.running=false; el.left=0; el.endAt=null;
          if(!el._chimed){
            el._chimed=true;
            playTimerChime();
          }
        }
      }
    }
  });
  if(needRender) render();
},200);

let activeEditingTimerId = null;
function openTimerEditModal(el){
  const modal = document.getElementById("timer-edit-modal");
  const input = document.getElementById("manual-timer-input");
  if(!modal || !input || !el) return;
  activeEditingTimerId = el.id;
  const rem = el.mode === "countup" ? (el.elapsed || 0) : (el.left != null ? el.left : (el.duration || 300));
  const mm = String(Math.floor(rem / 60)).padStart(2, "0");
  const ss = String(rem % 60).padStart(2, "0");
  input.value = `${mm}:${ss}`;
  modal.classList.remove("hidden");
  setTimeout(() => { input.focus(); input.select(); }, 50);
}
function closeTimerEditModal(){
  const modal = document.getElementById("timer-edit-modal");
  if(modal) modal.classList.add("hidden");
  activeEditingTimerId = null;
}
function saveManualTimer(){
  const input = document.getElementById("manual-timer-input");
  if(!input || !activeEditingTimerId) return;
  const el = state.elements.find(x => x.id === activeEditingTimerId);
  if(!el){ closeTimerEditModal(); return; }
  const raw = input.value.trim();
  let totalSecs = 0;
  if(raw.includes(":")){
    const parts = raw.split(":").map(p => parseInt(p, 10) || 0);
    if(parts.length === 2) totalSecs = parts[0] * 60 + parts[1];
    else if(parts.length === 3) totalSecs = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else {
    totalSecs = parseInt(raw, 10) || 0;
  }
  totalSecs = Math.max(5, Math.min(86400, totalSecs));
  pushUndo();
  if(el.mode === "countup"){
    el.elapsed = totalSecs;
    el.elapsedOffset = totalSecs * 1000;
    if(el.running) el.startAt = Date.now();
  } else {
    el.duration = totalSecs;
    el.left = totalSecs;
    el.running = true;
    el.endAt = Date.now() + totalSecs * 1000;
    el._chimed = false;
  }
  saveBoards(true);
  render();
  closeTimerEditModal();
}

const _closeTimerEdit = document.getElementById("close-timer-edit");
if(_closeTimerEdit) _closeTimerEdit.onclick = closeTimerEditModal;
const _cancelTimerEdit = document.getElementById("btn-cancel-manual-timer");
if(_cancelTimerEdit) _cancelTimerEdit.onclick = closeTimerEditModal;
const _saveTimerEdit = document.getElementById("btn-save-manual-timer");
if(_saveTimerEdit) _saveTimerEdit.onclick = saveManualTimer;
const _manualTimerInput = document.getElementById("manual-timer-input");
if(_manualTimerInput){
  _manualTimerInput.addEventListener("keydown", e => {
    if(e.key === "Enter") saveManualTimer();
    if(e.key === "Escape") closeTimerEditModal();
  });
}

const _closeTimerConfig = document.getElementById("close-timer-modal");
if(_closeTimerConfig) _closeTimerConfig.onclick = () => {
  const modal = document.getElementById("timer-config-modal");
  if(modal) modal.classList.add("hidden");
};

function createTimerAtCenter(options = {}){
  const modal = document.getElementById("timer-config-modal");
  if(modal) modal.classList.add("hidden");
  pushUndo();
  const wp = getViewportCenter();
  const isCountUp = options.mode === "countup";
  const duration = options.duration || 300;
  const newTimer = {
    id: genId(),
    type: "timer",
    mode: isCountUp ? "countup" : "countdown",
    duration: duration,
    left: duration,
    elapsed: 0,
    elapsedOffset: 0,
    running: true,
    startAt: isCountUp ? Date.now() : null,
    endAt: isCountUp ? null : (Date.now() + duration * 1000),
    x: wp.x - 75,
    y: wp.y - 45,
    w: 150,
    h: 86,
    rotation: 0,
    color: "#18181b"
  };
  state.elements.push(newTimer);
  state.selectedId = newTimer.id;
  state.selectedIds = [newTimer.id];
  setActiveTool("select", { keepSelection: true });
  showToolbar(newTimer);
  saveBoards(true);
  render();
}

const _btnTimerCountUp = document.getElementById("btn-timer-countup");
if(_btnTimerCountUp) _btnTimerCountUp.onclick = () => createTimerAtCenter({ mode: "countup" });

document.querySelectorAll(".btn-preset-timer").forEach(btn => {
  btn.onclick = () => {
    const sec = parseInt(btn.dataset.duration, 10) || 300;
    createTimerAtCenter({ mode: "countdown", duration: sec });
  };
});

const _btnTimerCustom = document.getElementById("btn-timer-custom");
if(_btnTimerCustom) _btnTimerCustom.onclick = () => {
  const inp = document.getElementById("custom-timer-min");
  const mins = Math.max(1, parseInt(inp?.value, 10) || 5);
  createTimerAtCenter({ mode: "countdown", duration: mins * 60 });
};

// Spotlight Controls Panel Functions
function exitSpotlightMode(){
  state.spotlight = false;
  setActiveTool("select");
  syncPlaceButtons();
  updateCursor();
  render();
}

const _spotExitBtn = document.getElementById("spotlight-exit-btn");
if(_spotExitBtn) _spotExitBtn.onclick = exitSpotlightMode;
const _spotOff = document.getElementById("spotlight-off");
if(_spotOff) _spotOff.onclick = exitSpotlightMode;

const _spotShapeCircle = document.getElementById("spotlight-shape-toggle-circle");
const _spotShapeRect = document.getElementById("spotlight-shape-toggle-rect");
if(_spotShapeCircle) _spotShapeCircle.onclick = () => {
  state.spotlightShape = "circle";
  _spotShapeCircle.className = "spot-shape-btn px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-900 text-white flex items-center gap-1";
  if(_spotShapeRect) _spotShapeRect.className = "spot-shape-btn px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1";
  updateCursor();
};
if(_spotShapeRect) _spotShapeRect.onclick = () => {
  state.spotlightShape = "rect";
  _spotShapeRect.className = "spot-shape-btn px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-900 text-white flex items-center gap-1";
  if(_spotShapeCircle) _spotShapeCircle.className = "spot-shape-btn px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1";
  updateCursor();
};

document.querySelectorAll("#spotlight-darkness-options button[data-darkness]").forEach(btn => {
  btn.onclick = () => {
    state.spotlightDarkness = parseFloat(btn.dataset.darkness) || 0.65;
    document.querySelectorAll("#spotlight-darkness-options button[data-darkness]").forEach(b => {
      b.className = "spot-dark-btn px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700";
    });
    btn.className = "spot-dark-btn px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-900 text-white shadow-xs";
    updateCursor();
  };
});

const _spotQuickSize = document.getElementById("spotlight-quick-size");
if(_spotQuickSize){
  _spotQuickSize.oninput = () => {
    state.spotlightSize = parseInt(_spotQuickSize.value, 10) || 220;
    updateCursor();
  };
}

document.querySelectorAll(".btn-spotsize").forEach(btn => {
  btn.onclick = () => {
    state.spotlightSize = parseInt(btn.dataset.spotsize, 10) || 240;
    document.querySelectorAll(".btn-spotsize").forEach(b => {
      b.className = "btn-spotsize px-2 py-0.5 rounded-full hover:bg-slate-100 text-[11px] font-medium text-slate-600";
    });
    btn.className = "btn-spotsize px-2 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-medium";
    updateCursor();
  };
});

document.querySelectorAll(".teach-btn").forEach(b=>{
  b.onclick=e=>{
    e.stopPropagation();
    const kind=b.dataset.teach;
    if(kind==="spotlight"){
      state.spotlight=!state.spotlight;
      state.pendingPlace=null;
      closeAllPopovers();
      if(state.spotlight){
        updateCursor();
      } else {
        exitSpotlightMode();
      }
      syncPlaceButtons();
      return;
    }
    if(kind==="timer"){
      closeAllPopovers();
      const modal = document.getElementById("timer-config-modal");
      if(modal) modal.classList.remove("hidden");
      return;
    }
    if(kind==="compass"){
      closeAllPopovers();
      setActiveTool("compass");
      syncPlaceButtons();
      return;
    }
    closeAllPopovers();
    deselect();
    setActiveTool("select",{keepPending:true,keepSelection:true});
    state.pendingPlace={type:kind};
    syncPlaceButtons();
    updateCursor();
  };
});
const _boardTitleInput = document.getElementById("board-title");
if(_boardTitleInput){
  _boardTitleInput.oninput=()=>{
    state.titleUserEdited = true;
    saveBoards();
    renderBoardsList();
  };
}
document.querySelectorAll(".hstyle-btn").forEach(b=>{b.onclick=()=>{document.querySelectorAll(".hstyle-btn").forEach(x=>{x.classList.remove("bg-slate-900","text-white"); x.classList.add("bg-slate-100")}); b.classList.add("bg-slate-900","text-white"); state.highlighterStyle=parseInt(b.dataset.hstyle);}});

addEventListener("keydown",e=>{
  const isTyping = e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA"||e.target.isContentEditable;
  // Shift + V : paste at the current cursor position (alternative to Ctrl/Cmd + V)
  if(e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && e.code==="KeyV"){
    const typingNow = isTyping || (document.activeElement && (document.activeElement.tagName==="INPUT" || document.activeElement.tagName==="TEXTAREA" || document.activeElement.isContentEditable)) || !!inlineBox;
    if(!typingNow){
      e.preventDefault();
      handleClipboardPaste(getMouseOrViewportWorld());
      return;
    }
  }
  if(!isTyping && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey){

    if(e.code==="Space"){e.preventDefault(); if(!state.spacePan){state.spacePan=true; state.isPanning=true; state.tempPan=false; state.prevTool=state.tool; highlightTool("hand"); state.panStart={x:state.lastMouse.x-state.camera.x,y:state.lastMouse.y-state.camera.y}; container.style.cursor="grabbing";} return;}
    if(e.key.toLowerCase()==="v"){setActiveTool("select")}
    else if(e.key.toLowerCase()==="p"){setActiveTool("pen")}
    else if(e.key.toLowerCase()==="h"){setActiveTool("highlighter")}
    else if(e.key.toLowerCase()==="e"){setActiveTool("eraser")}
    else if(e.key.toLowerCase()==="t"){setActiveTool("text")}
    else if(e.key.toLowerCase()==="n"){openPopover("sticky-popover")}
    else if(e.key.toLowerCase()==="l"){setActiveTool("line")}
    else if(e.key==="Delete"||e.key==="Backspace"){
      if(state.selectedIds.length>1 || state.selectedId){
        e.preventDefault();
        deleteSelected();
      }
    }
    else if(e.key==="Escape"){
      const co=document.getElementById("clear-overlay");
      if(co && co.classList.contains("open")){closeClearOverlay()} 
      else if(inlineBox){commitInlineEditor()} 
      else if(state.selectedId||state.selectedIds.length){deselect()} 
      else {setActiveTool("select"); closeAllPopovers();}
    }
  }
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();if(e.shiftKey)redo();else undo();}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y"){e.preventDefault();redo();}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="d"){e.preventDefault(); duplicateSelected();}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="c"){if(!isTyping){if(state.selectedIds.length>1) copySelectedToClipboard(); else {const el=targetCopyElement(); if(el){e.preventDefault(); copyElementToClipboard(el);}}}}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="v"){
    const isTyping = e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA"||e.target.isContentEditable || (document.activeElement && (document.activeElement.tagName==="INPUT" || document.activeElement.tagName==="TEXTAREA" || document.activeElement.isContentEditable)) || !!inlineBox;
    if(!isTyping){
      e.preventDefault();
      const targetCoord = getMouseOrViewportWorld();
      handleClipboardPaste(targetCoord);
    }
  }
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="a"){
    if(isTyping) return;
    e.preventDefault();
    state.selectedIds=state.elements.filter(el=>!el.locked).map(el=>el.id);
    state.selectedId=state.selectedIds.length===1?state.selectedIds[0]:null;
    if(state.selectedIds.length>1){ showMultiToolbar(); }
    else if(state.selectedId){const one=state.elements.find(x=>x.id===state.selectedId); if(one) showToolbar(one);}
    else hideToolbar();
    setActiveTool("select",{keepSelection:true});
    render();
  }
});
addEventListener("keyup",e=>{
  if(e.code==="Space" && state.spacePan){state.spacePan=false; state.isPanning=false; setActiveTool(state.prevTool||"select", {keepSelection:true}); state.prevTool=null; updateCursor(); saveBoards();}
});
document.addEventListener("contextmenu",e=>{if(!e.target.closest("input,textarea,[contenteditable]"))e.preventDefault();});
window.addEventListener("paste",e=>{
  const isTyping = e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA"||e.target.isContentEditable || (document.activeElement && (document.activeElement.tagName==="INPUT" || document.activeElement.tagName==="TEXTAREA" || document.activeElement.isContentEditable)) || !!inlineBox;
  if(isTyping) return;
  const targetCoord = getMouseOrViewportWorld();
  const targetX = targetCoord.x;
  const targetY = targetCoord.y;
  const items = e.clipboardData?.items;
  if(items && items.length){
    const imageFiles = [];
    for(let i=0; i<items.length; i++){
      if(items[i].type.indexOf("image") !== -1){
        const blob = items[i].getAsFile();
        if(blob) imageFiles.push(blob);
      }
    }
    if(imageFiles.length > 0){
      e.preventDefault();
      _lastPasteTimestamp = Date.now();
      insertClipboardImageBlobs(imageFiles, targetX, targetY);
      return;
    }
    const text = e.clipboardData?.getData("text/plain");
    if(text && text.trim().length > 0){
      e.preventDefault();
      _lastPasteTimestamp = Date.now();
      pasteTextAsObject(text, targetX, targetY);
      return;
    }
  }
  handleClipboardPaste(targetCoord);
});
addEventListener("mousemove",e=>{
  state.hasMouseMoved=true;
  const wp = toWorld(e.clientX, e.clientY);
  state.lastMouse.x=e.clientX;
  state.lastMouse.y=e.clientY;
  state.lastMouse.wx=wp.x;
  state.lastMouse.wy=wp.y;
  updateCursor(e.target);
});
document.addEventListener("auxclick",e=>{if(e.button===1) e.preventDefault();});
addEventListener("click",e=>{
  const insideMenu=e.target.closest(".popover-menu")||e.target.closest("#shapes-menu-btn")||e.target.closest("#emoji-menu-btn")||e.target.closest("#add-sticky-btn")||e.target.closest("#settings-menu-btn")||e.target.closest("#pen-btn")||e.target.closest("#highlighter-btn")||e.target.closest("#eraser-btn")||e.target.closest("#vanishing-btn")||e.target.closest("#selection-toolbar")||e.target.closest("#boards-btn")||e.target.closest("#boards-modal")||e.target.closest("#sticky-color-rail")||e.target.closest("#clear-overlay");
  if(!insideMenu){ closeAllPopovers(); }
  if(!e.target.closest("#boards-modal")&&!e.target.closest("#boards-btn")){
    const bm=document.getElementById("boards-modal");
    if(bm) bm.classList.add("hidden");
  }
  if(!e.target.closest("#right-click-menu")) hideRC();
});
addEventListener("beforeunload",()=>saveBoards(true),__hbSig);
addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")saveBoards(true);});

const miniCanvas=document.getElementById("minimap-canvas");
let miniDragging=false;
if(miniCanvas){
  miniCanvas.addEventListener("pointerdown",e=>{
    miniDragging=true; miniCanvas.setPointerCapture(e.pointerId); handleMiniMove(e);
  });
  miniCanvas.addEventListener("pointermove",e=>{if(miniDragging) handleMiniMove(e)});
  miniCanvas.addEventListener("pointerup",()=>{miniDragging=false});
}
function getMinimapWorld(){
  const all=[...state.elements];
  if(state.currentElement) all.push(state.currentElement);
  const vpTL=toWorld(0,0), vpBR=toWorld(innerWidth,innerHeight);
  let minX=vpTL.x, minY=vpTL.y, maxX=vpBR.x, maxY=vpBR.y;
  all.forEach(el=>{const b=getBounds(el); minX=Math.min(minX,b.x); minY=Math.min(minY,b.y); maxX=Math.max(maxX,b.x+b.w); maxY=Math.max(maxY,b.y+b.h);});
  const pad=120;
  minX-=pad; minY-=pad; maxX+=pad; maxY+=pad;
  return {minX,minY,maxX,maxY,all,vpTL,vpBR};
}
function handleMiniMove(e){
  if(!miniCanvas) return;
  const rect=miniCanvas.getBoundingClientRect();
  const x=(e.clientX-rect.left)/rect.width, y=(e.clientY-rect.top)/rect.height;
  const w=state._miniWorld||getMinimapWorld();
  const worldW=Math.max(200,w.maxX-w.minX), worldH=Math.max(200,w.maxY-w.minY);
  const scale=Math.min(miniCanvas.width/worldW,miniCanvas.height/worldH);
  const offsetX=(miniCanvas.width-worldW*scale)/2,offsetY=(miniCanvas.height-worldH*scale)/2;
  const worldX=w.minX+(x*miniCanvas.width-offsetX)/scale;
  const worldY=w.minY+(y*miniCanvas.height-offsetY)/scale;
  state.camera.x=innerWidth/2-worldX*state.camera.zoom;
  state.camera.y=innerHeight/2-worldY*state.camera.zoom;
  updateGrid(); render(); saveBoards();
}

function renderMinimap(){
  const wrap=document.getElementById("minimap-container");
  if(!wrap || wrap.classList.contains("hidden")) return;
  const m=document.getElementById("minimap-canvas");
  if(!m) return;
  const mc=m.getContext("2d");
  mc.clearRect(0,0,m.width,m.height);
  mc.fillStyle=state.bgColor||"#fafafa";
  mc.fillRect(0,0,m.width,m.height);
  const world=getMinimapWorld();
  state._miniWorld=world;
  const worldW=Math.max(200,world.maxX-world.minX),worldH=Math.max(200,world.maxY-world.minY);
  const scale=Math.min(m.width/worldW,m.height/worldH);
  const offsetX=(m.width-worldW*scale)/2,offsetY=(m.height-worldH*scale)/2;
  world.all.forEach(el=>{
    const b=getBounds(el);
    const x=(b.x-world.minX)*scale+offsetX,y=(b.y-world.minY)*scale+offsetY,w=b.w*scale,h=b.h*scale;
    if(STROKE_TYPES.includes(el.type) && el.points && el.points.length>1){
      mc.beginPath();
      el.points.forEach((p,i)=>{
        const px=(p.x-world.minX)*scale+offsetX, py=(p.y-world.minY)*scale+offsetY;
        if(i===0) mc.moveTo(px,py); else mc.lineTo(px,py);
      });
      mc.strokeStyle=el.color||"#1E1E1E";
      mc.lineWidth=el.type==="highlighter"?2.2:1.4;
      mc.stroke();
    } else {
      if(el.type==="image")mc.fillStyle="#f59e0b";else if(el.type==="text")mc.fillStyle=el.color||"#1E1E1E";else if(el.type==="sticky")mc.fillStyle=el.bg||"#facc15";else if(el.type==="emoji")mc.fillStyle="#ec4899";else mc.fillStyle=el.color||"#0055FF";
      mc.fillRect(x,y,Math.max(2,w),Math.max(2,h));
    }
  });
  const vx=(world.vpTL.x-world.minX)*scale+offsetX,vy=(world.vpTL.y-world.minY)*scale+offsetY,vw=(world.vpBR.x-world.vpTL.x)*scale,vh=(world.vpBR.y-world.vpTL.y)*scale;
  mc.strokeStyle="#ef4444";mc.lineWidth=1.5;mc.strokeRect(vx,vy,vw,vh);
  mc.fillStyle="rgba(239,68,68,0.08)";mc.fillRect(vx,vy,vw,vh);
}

resizeCanvas();updateCursor();updateUndoRedoUI();lucideCreateIcons();
const _homeBtn=document.getElementById("home-btn");
if(_homeBtn) _homeBtn.onclick=()=>goHome();
const _homeBtn2=document.getElementById("boards-home-btn");
if(_homeBtn2) _homeBtn2.onclick=()=>goHome();
loadBoards().then(()=>{
  resizeCanvas();
  const cur = currentBoardRecord();
  if(cur && (cur.needsFitToScreen === true || cur.fitToScreenOnOpen === true) && state.elements.length > 0){
    fitToScreen(false);
    cur.needsFitToScreen = false;
    cur.fitToScreenOnOpen = false;
    cur.camera = { ...state.camera };
    if(Store && Store.putBoard) Store.putBoard(cur).catch(e=>console.warn(e));
  }
  updateGrid();
  updateCursor();
  lucideCreateIcons();
}).catch(e=>console.error(e));
syncGridButtons(container && container.classList.contains("line-grid")?"line-grid":container && container.classList.contains("dot-grid")?"dot-grid":"bg-white");
syncPlaceButtons();

  window.__hbiboDestroy = function(){
    try{ if(inlineBox) commitInlineEditor(); }catch(e){}
    try{ saveBoards(true); }catch(e){}
    try{ window.__hbiboAc.abort(); }catch(e){}
    document.body.classList.remove("theme-dark","theme-light-glass");
  };

  EventTarget.prototype.addEventListener = __origAdd;

};
