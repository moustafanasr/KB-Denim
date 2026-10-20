// KB Denim — WebGL fabric study.
// The included GLB is a lightweight illustrative drape, not a scan or measured physical fabric.
// Imports use the import map in index.html; WebGL / library failures retain a static CSS fallback.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canWebGL = () => {
  try {
    const c=document.createElement('canvas');
    return !!(c.getContext('webgl2')||c.getContext('webgl'));
  } catch (_) { return false; }
};
if (canWebGL()) initAll();
else document.getElementById('studioLoading')?.remove();

function textileTexture() {
  const canvas=document.createElement('canvas');
  canvas.width=384;canvas.height=384;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.fillStyle='#d7dce6';ctx.fillRect(0,0,384,384);
  let seed=19;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0; return seed/4294967296};
  // Diagonal 3/1 twill weave, woven-looking at multiple zoom levels.
  for(let y=0;y<384;y+=4){
    for(let x=0;x<384;x+=4){
      const alternating=(((x/4|0)+(y/4|0)*3)%7)<3;
      ctx.fillStyle=alternating?'rgba(8,28,62,.28)':'rgba(255,255,255,.19)';
      ctx.fillRect(x,y,1.4,4);
      ctx.fillStyle='rgba(8,29,62,.14)';
      ctx.fillRect(x+2,y,1,4);
    }
  }
  for(let i=0;i<7800;i++){
    ctx.fillStyle=rand()>.48?'rgba(255,255,255,.11)':'rgba(0,21,52,.11)';
    const x=rand()*384,y=rand()*384;
    ctx.fillRect(x,y,.6+rand()*1.4,.8+rand()*2.2);
  }
  const t=new THREE.CanvasTexture(canvas);
  t.colorSpace=THREE.SRGBColorSpace;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.repeat.set(2.7,3.3);
  t.anisotropy=8;
  return t;
}
const texture=textileTexture();
const fabrics={indigo:0x345b96,mid:0x91a9c8,black:0x46515e};

function fallbackModel() {
  const geo=new THREE.PlaneGeometry(3.6,4.55,72,86);
  const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i);
    pos.setZ(i, Math.sin(x*2.0+y*.55)*.36+Math.cos(y*2.7-x*1.5)*.2+Math.sin(x*5.2-y)*.11);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo);
}
async function prepareDrape() {
  try {
    const obj=await new GLTFLoader().loadAsync('assets/denim-drape.glb');
    let mesh=null;
    obj.scene.traverse(c=>{if(c.isMesh && !mesh)mesh=c});
    return mesh || fallbackModel();
  } catch(e){console.warn('Using procedural fallback 3D drape',e);return fallbackModel()}
}
async function initAll() {
  const source=await prepareDrape();
  const studioCanvas=document.getElementById('fabricCanvas');
  if(studioCanvas) try{const fn=createView(studioCanvas,source,false); fn.start()}catch(e){console.warn('Fabric viewer unavailable',e)}
  const heroCanvas=document.getElementById('heroCanvas');
  if(heroCanvas && innerWidth>720 && !reduceMotion) try{const fn=createView(heroCanvas,source,true);fn.start()}catch(e){console.warn('Hero fabric scene unavailable',e)}
}
function createView(canvas,source,isHero){
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(isHero?38:39,1,.1,100);
  camera.position.set(0,0,isHero?8.5:8.7);
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=isHero?1.35:1.55;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,isHero?1.25:1.6));
  scene.add(new THREE.HemisphereLight(0xe7efff,0x142740,isHero?3.0:2.9));
  const a=new THREE.DirectionalLight(0xe6eeff,3.5);a.position.set(-3,5,7);scene.add(a);
  const b=new THREE.DirectionalLight(0x7ea9e9,3.4);b.position.set(4,-1,3);scene.add(b);
  const c=new THREE.DirectionalLight(0xf0f6ff,2.1);c.position.set(-1,1,-4);scene.add(c);
  const material=new THREE.MeshPhysicalMaterial({
    map:texture,color:isHero?0x8baed9:fabrics.indigo,roughness:.96,metalness:.035,
    side:THREE.DoubleSide,clearcoat:.0,bumpMap:texture,bumpScale:.07
  });
  const mesh=source.clone();
  mesh.material=material;
  mesh.castShadow=false;mesh.receiveShadow=false;
  const drape=new THREE.Group();drape.add(mesh);scene.add(drape);
  drape.scale.setScalar(isHero?.93:1.01);
  drape.rotation.set(.04,isHero?-.54:-.28,isHero?-.18:-.11);
  let targetX=drape.rotation.x,targetY=drape.rotation.y;
  let targetColor=new THREE.Color(isHero?0x8baed9:fabrics.indigo);
  let hovering=false,dragging=false,lastX=0,lastY=0;
  const visible={value:!document.hidden};
  const element=isHero?canvas:document.getElementById('studioViewer');
  let raf=0,run=true,lastFrame=0,clock=0;
  const size=()=>{
    const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
    if(w<=1||h<=1)return;
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  };
  if('ResizeObserver' in window)new ResizeObserver(size).observe(canvas);
  else window.addEventListener('resize',size,{passive:true});
  size();
  if('IntersectionObserver' in window){
    new IntersectionObserver(entries=>{visible.value=entries[0].isIntersecting},{threshold:.05}).observe(element);
  }
  const visibility=()=>{if(document.hidden)visible.value=false;else visible.value=true};
  document.addEventListener('visibilitychange',visibility);
  function render(t){
    if(!run)return;
    raf=requestAnimationFrame(render);
    if(!visible.value || !canvas.clientHeight)return;
    if(!reduceMotion && t-lastFrame<24)return;
    lastFrame=t;
    if(!reduceMotion){
      clock+=.016;
      if(!dragging){
        targetY+=(isHero ? -.45+Math.sin(clock*.27)*.12 : -.25+Math.sin(clock*.32)*.15-targetY)*.008;
      }
      drape.rotation.y+=(targetY-drape.rotation.y)*.065;
      drape.rotation.x+=(targetX-drape.rotation.x)*.055;
      drape.position.y=Math.sin(clock*.52)*.08;
      drape.rotation.z=(isHero?-.19:-.10)+Math.sin(clock*.31)*.04;
    }
    material.color.lerp(targetColor,.085);
    renderer.render(scene,camera);
    if(reduceMotion)run=false;
  }
  if(!isHero){
    const fallback=document.getElementById('studioFallback');
    const loading=document.getElementById('studioLoading');
    if(fallback)fallback.style.opacity='0';
    if(loading)loading.style.display='none';
    canvas.style.cursor='grab';
    canvas.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse'&&e.button!==0)return;
      dragging=true;hovering=true;lastX=e.clientX;lastY=e.clientY;
      canvas.setPointerCapture?.(e.pointerId);canvas.style.cursor='grabbing';
    });
    canvas.addEventListener('pointermove',e=>{
      if(!dragging)return;
      targetY=Math.max(-1.55,Math.min(1.55,targetY+(e.clientX-lastX)*.008));
      targetX=Math.max(-.75,Math.min(.75,targetX+(e.clientY-lastY)*.006));
      lastX=e.clientX;lastY=e.clientY;
    });
    const up=()=>{dragging=false;canvas.style.cursor='grab'};
    canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
    window.addEventListener('kb:fabric-tone',e=>{targetColor=new THREE.Color(fabrics[e.detail.tone]||fabrics.indigo)});
    window.addEventListener('kb:reset-3d',()=>{targetX=.04;targetY=-.28});
  }
  const contextLost=(e)=>{e.preventDefault();run=false;cancelAnimationFrame(raf)};
  canvas.addEventListener('webglcontextlost',contextLost);
  return {start(){requestAnimationFrame(render)}};
}
