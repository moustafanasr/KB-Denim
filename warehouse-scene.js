// KB Denim — 3D warehouse concept, rebuilt from the supplied warehouse6.blend geometry.
// This is a generic warehouse model supplied by the client; it is NOT a surveyed representation
// of the KB Denim textile factory. Converted offline to light-weight glTF for the browser.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const lowMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const webgl=()=>{try{let c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'));}catch{return false;}};
const loader=new GLTFLoader();
const sceneClasses={architecture:['01.','02.','03.','04.','05.','06.'],storage:['07.','09.','10.','11.','15.','16.','17.'],equipment:['12.','13.','14.','18.','19.','20.','21.','22.','23.','24.','25.','26.','27.','28.']};
const colorPalette={overview:0xbecbcd,architecture:0x9ab3c4,storage:0xcdba9b,equipment:0xe9d2a6};
function sceneBase(canvas,mini=false){
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(mini?39:42,1,.05,250);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=mini?1.8:1.68;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,mini?1.15:1.5));
  scene.add(new THREE.HemisphereLight(0xffffff,0x223950,mini?3.6:3.3));
  const key=new THREE.DirectionalLight(0xfff9ec,4);key.position.set(-8,18,12);scene.add(key);
  const rim=new THREE.DirectionalLight(0x92bfe5,2.35);rim.position.set(10,8,-9);scene.add(rim);
  const controls=new OrbitControls(camera,canvas);
  controls.enableDamping=!lowMotion;controls.dampingFactor=.055;
  controls.enablePan=false;controls.minDistance=mini?4:4.5;controls.maxDistance=mini?20:72;
  controls.maxPolarAngle=Math.PI*.88;controls.minPolarAngle=.11;
  controls.rotateSpeed=.62;controls.zoomSpeed=.85;
  canvas.style.touchAction='none';
  let hasSize=false;
  function resize(){
    let w=canvas.clientWidth,h=canvas.clientHeight;if(w<2||h<2)return;
    if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);
    camera.aspect=w/h;camera.updateProjectionMatrix();hasSize=true;
  }
  if('ResizeObserver' in window)new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize',resize,{passive:true});
  resize();
  let visible=false,stopped=false,raf=0,autotour=false,t=0;
  const observer=new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible)resize()},{rootMargin:'100px',threshold:0});observer.observe(canvas);
  const target={x:0,y:0,z:0};
  function animate(ms){
    if(stopped)return;raf=requestAnimationFrame(animate);
    if(!visible||document.hidden||!hasSize)return;
    if(autotour&&!lowMotion){t+=.004;const r=38;camera.position.set(Math.cos(t)*r,13+Math.sin(t*.8)*3,Math.sin(t)*r);}
    controls.update();renderer.render(scene,camera);
  }
  raf=requestAnimationFrame(animate);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();stopped=true;cancelAnimationFrame(raf)});
  return {scene,camera,renderer,controls,resize,setAuto(v){autotour=v;},getAuto(){return autotour;},stop(){stopped=true;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();renderer.dispose()}};
}
function normalizeSource(gltf,mini){
  const model=gltf.scene;
  model.rotation.x=-Math.PI/2; // convert Blender Z-up to Three.js Y-up.
  model.updateMatrixWorld(true);
  let box=new THREE.Box3().setFromObject(model);
  const size=box.getSize(new THREE.Vector3());
  // Full scene is 31 m long; smaller studies are uniformly scaled to a consistent editorial stage.
  if(mini){const factor=6.4/Math.max(size.x,size.y,size.z);model.scale.setScalar(factor);model.updateMatrixWorld(true);box.setFromObject(model)}
  const center=box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  model.updateMatrixWorld(true);
  model.traverse(child=>{if(child.isMesh){child.frustumCulled=true;if(child.material){child.material.side=THREE.DoubleSide;child.material.roughness=.86;child.material.metalness=.06;}}});
  return model;
}
function fadeIn(canvas){canvas.classList.add('is-ready');const wrapper=canvas.parentElement;wrapper?.classList.add('model-loaded');}
function hideFallback(msg){const status=document.getElementById('warehouseStatus');if(status)status.textContent=msg;const live=document.getElementById('warehouseLive');if(live)live.textContent=msg.toUpperCase();}
async function loadFull(){
  const canvas=document.getElementById('warehouseCanvas');if(!canvas)return;
  if(!webgl()){hideFallback('3D not supported on this device');return;}
  let v;
  try{
    v=sceneBase(canvas,false);
    const response=await loader.loadAsync('assets/warehouse-tour.glb');
    const model=normalizeSource(response,false);v.scene.add(model);
    const sceneBox=new THREE.Box3().setFromObject(model);
    const centre=new THREE.Vector3(0,0,0);
    const focusRanges={overview:null,architecture:[],storage:[],equipment:[]};
    const cutawayPieces=[];
    model.traverse(o=>{if(!o.isMesh)return;const name=String(o.name).replace(/^Mesh_/, '');if(['02.','03.'].some(prefix=>name.startsWith(prefix)))cutawayPieces.push(o);for(const [k,prefixes] of Object.entries(sceneClasses)){if(prefixes.some(p=>name.startsWith(p)))focusRanges[k].push(o);}});
    // If exporters change the node naming, identify original names through parent groups.
    if(Object.values(focusRanges).every(a=>!a?.length)){
      model.children.forEach(o=>{for(const [k,prefixes] of Object.entries(sceneClasses))if(prefixes.some(p=>o.name.startsWith(p)))focusRanges[k].push(o)});
    }
    const camera=v.camera,controls=v.controls;
    const cutawayBtn=document.getElementById('tourCutaway');
    function setCutaway(active){cutawayPieces.forEach(piece=>piece.visible=!active);if(cutawayBtn){cutawayBtn.setAttribute('aria-pressed',String(active));cutawayBtn.classList.toggle('selected',active);cutawayBtn.title=active?'Show exterior walls':'Reveal inside the model';}}
    cutawayBtn?.addEventListener('click',()=>setCutaway(cutawayBtn.getAttribute('aria-pressed')!=='true'));
    setCutaway(false);
    const defaultPos=new THREE.Vector3(25,14,26);
    camera.position.copy(defaultPos);controls.target.copy(centre);controls.update();
    fadeIn(canvas);hideFallback('Drag to explore');document.querySelectorAll('.warehouse3d-stage-actions button').forEach(btn=>btn.disabled=false);
    function targetCamera(pos,look){
      v.setAuto(false);const auto=document.getElementById('toggleAutoTour');if(auto){auto.setAttribute('aria-pressed','false');auto.innerHTML='START CAMERA TOUR <span>↗</span>'};
      const g=window.gsap;
      if(g && !lowMotion){g.to(camera.position,{x:pos.x,y:pos.y,z:pos.z,duration:1.25,ease:'power2.inOut'});g.to(controls.target,{x:look.x,y:look.y,z:look.z,duration:1.25,ease:'power2.inOut',onUpdate:()=>controls.update()});}
      else{camera.position.copy(pos);controls.target.copy(look);controls.update();}
    }
    function focus(which){
      document.querySelectorAll('.warehouse-focus').forEach(btn=>{const active=btn.dataset.focus===which;btn.classList.toggle('is-active',active);btn.setAttribute('aria-pressed',String(active));});
      if(which==='overview'){setCutaway(false);targetCamera(defaultPos,centre);return;}
      setCutaway(which!=='architecture');
      const objs=focusRanges[which]||[];if(!objs.length){targetCamera(defaultPos,centre);return;}
      let bounds=new THREE.Box3();objs.forEach(o=>bounds.expandByObject(o));
      const center=bounds.getCenter(new THREE.Vector3());const extents=bounds.getSize(new THREE.Vector3());const radius=Math.max(6.5,extents.length()*.95);
      targetCamera(center.clone().add(new THREE.Vector3(radius*.72,Math.max(6,radius*.32),radius*.64)),center);
    }
    document.querySelectorAll('.warehouse-focus').forEach(b=>b.addEventListener('click',()=>focus(b.dataset.focus)));
    const reset=document.getElementById('tourReset');reset?.addEventListener('click',()=>focus('overview'));
    document.getElementById('tourZoomIn')?.addEventListener('click',()=>{camera.position.lerp(controls.target,.22);controls.update()});
    document.getElementById('tourZoomOut')?.addEventListener('click',()=>{camera.position.sub(controls.target).multiplyScalar(1.25).add(controls.target);controls.update()});
    const auto=document.getElementById('toggleAutoTour');auto?.addEventListener('click',()=>{const isOn=!v.getAuto();v.setAuto(isOn);auto.setAttribute('aria-pressed',String(isOn));auto.innerHTML=isOn?'PAUSE CAMERA TOUR <span>Ⅱ</span>':'START CAMERA TOUR <span>↗</span>';});
    controls.addEventListener('start',()=>{if(v.getAuto()){v.setAuto(false);auto?.setAttribute('aria-pressed','false');if(auto)auto.innerHTML='START CAMERA TOUR <span>↗</span>'}});
    window.addEventListener('keydown',e=>{if(document.activeElement===document.getElementById('warehouseStage')){if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();camera.position.applyAxisAngle(new THREE.Vector3(0,1,0),e.key==='ArrowLeft'?.12:-.12);controls.update()}}});
    window.__kbWarehouseLoaded=true;
  }catch(err){console.error('Warehouse 3D loading failed',err);hideFallback('3D unavailable — showing the factory photograph');v?.stop();}
}
async function loadDetail(slug,canvasId){
  const canvas=document.getElementById(canvasId);if(!canvas||!webgl())return;
  let v;
  try{
    v=sceneBase(canvas,true);
    const gltf=await loader.loadAsync(`assets/warehouse-${slug}.glb`);
    const model=normalizeSource(gltf,true);v.scene.add(model);
    v.camera.position.set(8,5.2,8.8);v.controls.target.set(0,0,0);v.controls.update();v.controls.minDistance=3;v.controls.maxDistance=17;
    fadeIn(canvas);
    canvas.addEventListener('pointerdown',()=>canvas.classList.add('user-interacting'));
    window[`__kbDetail_${slug}`]=true;
  }catch(err){console.warn('3D detail unavailable',slug,err);v?.stop()}
}
function lazyWhenVisible(element,cb){
  if(!element)return;
  if(!('IntersectionObserver' in window)){cb();return;}
  const ob=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){ob.disconnect();cb();}},{rootMargin:'380px',threshold:0});ob.observe(element);
}
lazyWhenVisible(document.getElementById('warehouseStage'),loadFull);
lazyWhenVisible(document.getElementById('detailArchitecture'),()=>loadDetail('architecture','detailArchitecture'));
lazyWhenVisible(document.getElementById('detailStorage'),()=>loadDetail('storage','detailStorage'));
lazyWhenVisible(document.getElementById('detailEquipment'),()=>loadDetail('equipment','detailEquipment'));
