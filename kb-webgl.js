/* KB Denim / WebGL2 GLB Engine — local, zero-CDN, real meshes and real pointer interaction.
   Supplied warehouse6.blend -> assets/*.glb; those original meshes are rendered here.
   This is NOT a scanned or verified reconstruction of KB Denim's real factory. */
(()=>{'use strict';
const $=(id)=>document.getElementById(id);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const V={add:(a,b)=>a.map((x,i)=>x+b[i]),sub:(a,b)=>a.map((x,i)=>x-b[i]),scale:(a,s)=>a.map(x=>x*s),len:a=>Math.hypot(...a),norm:a=>{let l=Math.hypot(...a)||1;return a.map(x=>x/l)},cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]};
const ident=()=>[1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
function mul(a,b){const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function nodeMatrix(n){if(n.matrix)return n.matrix;const t=n.translation||[0,0,0],s=n.scale||[1,1,1],q=n.rotation||[0,0,0,1], [x,y,z,w]=q;const m=[1-2*(y*y+z*z),2*(x*y+z*w),2*(x*z-y*w),0,2*(x*y-z*w),1-2*(x*x+z*z),2*(y*z+x*w),0,2*(x*z+y*w),2*(y*z-x*w),1-2*(x*x+y*y),0,t[0],t[1],t[2],1];for(let c=0;c<3;c++)for(let r=0;r<3;r++)m[c*4+r]*=s[c];return m;}
function lookAt(eye,at){const z=V.norm(V.sub(eye,at)),x=V.norm(V.cross([0,1,0],z)),y=V.cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2]),-(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2]),-(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2]),1];}
function perspective(fovy,asp,near=0.1,far=400){let f=1/Math.tan(fovy/2);return [f/asp,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];}
const VS=`#version 300 es
in vec3 aPos; in vec4 aCol; in vec2 aUV; uniform mat4 uVP; uniform vec3 uShift; uniform float uModelScale; uniform float uTime; uniform float uFabric; out vec3 vPos; out vec3 vColor; out vec2 vUV;
void main(){vec3 p=aPos*uModelScale; if(uFabric>0.5){float h=clamp((p.y+2.6)/5.2,0.0,1.0);p.z+=sin(p.x*1.6+uTime*1.28)*.14*(1.0-h);p.x+=sin(p.y*1.35+uTime*.62)*.045;}vPos=p+uShift;vColor=aCol.rgb;vUV=aUV;gl_Position=uVP*vec4(vPos,1.0);}`;
const FS=`#version 300 es
precision highp float;in vec3 vPos;in vec3 vColor;in vec2 vUV;uniform vec3 uTint;uniform float uFabric;uniform sampler2D uMap;uniform int uHasMap;uniform int uMode;out vec4 outColor;
void main(){vec3 n=normalize(cross(dFdx(vPos),dFdy(vPos)));if(!gl_FrontFacing)n=-n;
float light=.54+.56*max(dot(n,normalize(vec3(-.36,.83,.49))),0.0)+.17*max(dot(n,normalize(vec3(.7,.3,-.6))),0.0);
vec3 col=mix(vColor,vec3(1.0),uFabric)*uTint; if(uHasMap==1){vec3 texCol=texture(uMap,vUV).rgb;col=uFabric>0.5?uTint*(.70+.65*dot(texCol,vec3(.3333))):texCol;} if(uMode==1){float grey=dot(col,vec3(.299,.587,.114));col=mix(vec3(.052,.17,.31),vec3(.35,.69,.9),grey);} if(uMode==2){col=mix(col,vec3(.19,.37,.51),.3);}
if(uFabric>0.5){float weave=sin(vPos.x*137.0+vPos.y*98.0)*sin(vPos.y*171.0);col*=.91+.075*weave;}
col=pow(max(col*light,0.0),vec3(.93));outColor=vec4(col,1.0);}`;
function shader(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
function program(gl){const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,VS));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,FS));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;}
function parseGLB(data){const d=new DataView(data);if(d.getUint32(0,true)!==0x46546c67)throw Error('Invalid GLB header');if(d.getUint32(4,true)!==2)throw Error('GLB version not supported');let off=12,json=null,bin=null;while(off<data.byteLength){const len=d.getUint32(off,true),type=d.getUint32(off+4,true);off+=8;if(type===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(new Uint8Array(data,off,len)));if(type===0x004e4942)bin=data.slice(off,off+len);off+=len;}if(!json||!bin)throw Error('GLB missing binary content');return {json,bin};}
function glbMeshes({json:j,bin},fabric,mini=false,upright=false){const dv=new DataView(bin),bytes=new Uint8Array(bin),parts=[],overallMin=[Infinity,Infinity,Infinity],overallMax=[-Infinity,-Infinity,-Infinity];
 const formats={5120:[1,'getInt8'],5121:[1,'getUint8'],5122:[2,'getInt16'],5123:[2,'getUint16'],5125:[4,'getUint32'],5126:[4,'getFloat32']};
 const ncom={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
 function accessor(index){const a=j.accessors[index],bv=j.bufferViews[a.bufferView],fmt=formats[a.componentType];if(!fmt)throw Error('Invalid accessor format');const nc=ncom[a.type],st=bv.byteStride||nc*fmt[0],start=(bv.byteOffset||0)+(a.byteOffset||0),res=new Array(a.count*nc);for(let i=0;i<a.count;i++)for(let c=0;c<nc;c++){const v=dv[fmt[1]](start+i*st+c*fmt[0],true);res[i*nc+c]=(a.normalized? v/(a.componentType===5121?255:a.componentType===5123?65535:1):v);}return {data:res,nc};}
 function visit(ni,parent){const n=j.nodes[ni];const m=mul(parent,nodeMatrix(n));if(n.mesh!==undefined){const mesh=j.meshes[n.mesh];for(const p of mesh.primitives){if(p.mode!==undefined&&p.mode!==4)continue;const a=accessor(p.attributes.POSITION),uvs=p.attributes.TEXCOORD_0!==undefined?accessor(p.attributes.TEXCOORD_0):null,colors=p.attributes.COLOR_0!==undefined?accessor(p.attributes.COLOR_0):null,indices=p.indices!==undefined?accessor(p.indices).data:Array.from({length:a.data.length/3},(_,i)=>i);
 const pos=new Float32Array(a.data.length),uv=new Float32Array(a.data.length/3*2),col=new Uint8Array(a.data.length/3*4),mn=[Infinity,Infinity,Infinity],mx=[-Infinity,-Infinity,-Infinity];
 let safeColor=[.7,.76,.8];
 for(let i=0;i<a.data.length/3;i++){
 const x=a.data[3*i],y=a.data[3*i+1],z=a.data[3*i+2];const xx=m[0]*x+m[4]*y+m[8]*z+m[12], yy=m[1]*x+m[5]*y+m[9]*z+m[13], zz=m[2]*x+m[6]*y+m[10]*z+m[14];
 // The supplied warehouse GLB uses Blender's Z-up geometry; the fabric model is already upright.
 const v=(fabric||upright)?[xx,yy,zz]:[xx,zz,-yy];
 for(let k=0;k<3;k++){pos[3*i+k]=v[k];mn[k]=Math.min(mn[k],v[k]);mx[k]=Math.max(mx[k],v[k]);overallMin[k]=Math.min(overallMin[k],v[k]);overallMax[k]=Math.max(overallMax[k],v[k]);}
 uv[i*2]=uvs?uvs.data[i*2]:0;uv[i*2+1]=uvs?uvs.data[i*2+1]:0;
 for(let k=0;k<3;k++)col[4*i+k]=Math.round(clamp(colors?(colors.data[i*colors.nc+k]??.7):safeColor[k],0,1)*255);col[4*i+3]=255;
 }
 const mat=j.materials?.[p.material??-1],map=mat?.pbrMetallicRoughness?.baseColorTexture?.index;const src=(map!==undefined)?j.textures?.[map]?.source:undefined;
 parts.push({name:n.name||mesh.name||'Mesh',pos,col,uv,imageId:src,indices:new Uint32Array(indices),min:mn,max:mx});
 }}(n.children||[]).forEach(k=>visit(k,m));}
 const roots=j.scenes?.[j.scene||0]?.nodes||[0];roots.forEach(i=>visit(i,ident()));
 const center=overallMin.map((v,i)=>(v+overallMax[i])/2),maxExtent=Math.max(...overallMin.map((v,i)=>overallMax[i]-v));const scale=(mini && maxExtent)?8/maxExtent:1;
 for(const p of parts){for(let i=0;i<p.pos.length;i+=3)for(let k=0;k<3;k++)p.pos[i+k]=(p.pos[i+k]-center[k])*scale;for(let k=0;k<3;k++){p.min[k]=(p.min[k]-center[k])*scale;p.max[k]=(p.max[k]-center[k])*scale;}}
 return {parts,maxExtent,centre:center,images:j.images||[],bufferViews:j.bufferViews||[],binary:bin};
}
class Viewer{
 constructor(canvas,opts={}){this.canvas=canvas;this.opts=opts;this.fabric=!!opts.fabric;this.mini=!!opts.mini;this.upright=!!opts.upright;this.mode=0;this.explode=0;this.hiddenIds=new Set();this.stage=canvas.parentElement;this.gl=canvas.getContext('webgl2',{alpha:true,antialias:true,depth:true,powerPreference:'high-performance'});if(!this.gl)throw Error('WebGL2 is unavailable');const gl=this.gl;this.program=program(gl);this.loc={pos:gl.getAttribLocation(this.program,'aPos'),col:gl.getAttribLocation(this.program,'aCol'),uv:gl.getAttribLocation(this.program,'aUV'),shift:gl.getUniformLocation(this.program,'uShift'),modelScale:gl.getUniformLocation(this.program,'uModelScale'),time:gl.getUniformLocation(this.program,'uTime'),mode:gl.getUniformLocation(this.program,'uMode'),map:gl.getUniformLocation(this.program,'uMap'),hasMap:gl.getUniformLocation(this.program,'uHasMap'),vp:gl.getUniformLocation(this.program,'uVP'),tint:gl.getUniformLocation(this.program,'uTint'),fabric:gl.getUniformLocation(this.program,'uFabric')};
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
 this.gallery=!!opts.gallery;this.yaw=opts.yaw??-.75;this.pitch=opts.pitch??.48;this.radius=opts.radius??(this.fabric?9.8:this.mini?18:47);this.homeRadius=this.radius;this.homeTarget=[0,0,0];this.target=[0,0,0];this.tint=[1,1,1];this.tintGoal=[1,1,1];this.paletteIndex=0;this.auto=!!opts.auto;this.onInteract=null;this.motionTime=0;this.running=false;this.visible=false;this.parts=[];this.dirty=true;this.pointers=new Map();this.touchSep=0;this.last=0;this.clock=0;this.cutaway=false;
 this.resize=()=>{const rect=canvas.getBoundingClientRect(),w=Math.floor(rect.width),h=Math.floor(rect.height);if(!w||!h)return;const dpr=Math.min(devicePixelRatio||1,this.mini?1:this.fabric?1.4:(w<700?1:1.2)),W=Math.floor(w*dpr),H=Math.floor(h*dpr);if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;gl.viewport(0,0,W,H);this.dirty=true;}};
 this.ro=new ResizeObserver(this.resize);this.ro.observe(canvas);this.resize();this.bindControls();
 this.io=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;if(this.visible)this.dirty=true;},{rootMargin:'180px',threshold:0});this.io.observe(canvas);
 this.running=true;requestAnimationFrame(t=>this.frame(t));
 }
 async load(url){const resp=await fetch(url);if(!resp.ok)throw Error(`${url}: HTTP ${resp.status}`);const data=glbMeshes(parseGLB(await resp.arrayBuffer()),this.fabric,this.mini,this.upright);this.maxExtent=data.maxExtent;
 const gl=this.gl;this.parts=data.parts.map(p=>{const vao=gl.createVertexArray();gl.bindVertexArray(vao);const pb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,pb);gl.bufferData(gl.ARRAY_BUFFER,p.pos,gl.STATIC_DRAW);gl.vertexAttribPointer(this.loc.pos,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(this.loc.pos);
 const cb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,cb);gl.bufferData(gl.ARRAY_BUFFER,p.col,gl.STATIC_DRAW);gl.vertexAttribPointer(this.loc.col,4,gl.UNSIGNED_BYTE,true,0,0);gl.enableVertexAttribArray(this.loc.col);
 const uvb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,uvb);gl.bufferData(gl.ARRAY_BUFFER,p.uv,gl.STATIC_DRAW);gl.vertexAttribPointer(this.loc.uv,2,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(this.loc.uv);
 const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,p.indices,gl.STATIC_DRAW);gl.bindVertexArray(null);return {...p,vao,count:p.indices.length};});
 // Textures are embedded in the GLB, so viewing stays fully local/offline.
 this.textures=[];
 await Promise.all(data.images.map(async(im,i)=>{
  if(im.bufferView===undefined)return;
  const bv=data.bufferViews[im.bufferView],slice=data.binary.slice(bv.byteOffset||0,(bv.byteOffset||0)+bv.byteLength);
  const blob=new Blob([slice],{type:im.mimeType||'image/jpeg'});
  const bitmap=await createImageBitmap(blob,{imageOrientation:'flipY'});
  const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,bitmap);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
  gl.generateMipmap(gl.TEXTURE_2D);bitmap.close?.();this.textures[i]=tex;
 }));
 this.ready=true;this.stage.classList.add('model-loaded');this.canvas.classList.add('is-ready');this.dirty=true;this.resize();this.render();return data;}
 render(){if(!this.ready)return;const gl=this.gl;this.resize();gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
 const eye=[this.target[0]+this.radius*Math.sin(this.yaw)*Math.cos(this.pitch),this.target[1]+this.radius*Math.sin(this.pitch),this.target[2]+this.radius*Math.cos(this.yaw)*Math.cos(this.pitch)];
 const vp=mul(perspective((this.fabric?41:43)*Math.PI/180,this.canvas.width/this.canvas.height),lookAt(eye,this.target));
 gl.uniformMatrix4fv(this.loc.vp,false,new Float32Array(vp));gl.uniform1f(this.loc.fabric,this.fabric?1:0);gl.uniform1f(this.loc.time,this.motionTime);gl.uniform1i(this.loc.mode,this.mode);gl.uniform1i(this.loc.map,0);
 const draw=(shift,scale,tint)=>{gl.uniform3fv(this.loc.shift,new Float32Array(shift));gl.uniform1f(this.loc.modelScale,scale);gl.uniform3fv(this.loc.tint,new Float32Array(tint));for(const p of this.parts){if(this.cutaway&&/^(02\.|03\.)/.test(p.name))continue;if(this.hiddenIds.has(p.name))continue;
 if(this.upright){gl.uniform3fv(this.loc.shift,new Float32Array([this.explode*(this.parts.indexOf(p)-1)*4,0,0]));}
 gl.uniform1i(this.loc.hasMap,(p.imageId!==undefined&&this.textures[p.imageId])?1:0);if(p.imageId!==undefined&&this.textures[p.imageId]){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.textures[p.imageId]);}gl.bindVertexArray(p.vao);gl.drawElements(gl.TRIANGLES,p.count,gl.UNSIGNED_INT,0);}};
 if(this.gallery){const palettes=[[.18,.37,.64],[.68,.79,.91],[.18,.22,.29]];const left=(this.paletteIndex+1)%3,right=(this.paletteIndex+2)%3;draw([-2.8,-.18,-1.5],.56,palettes[left]);draw([2.8,-.18,-1.5],.56,palettes[right]);draw([0,0,.36],1.0,this.tint);}else{draw([0,0,0],1,this.tint);}gl.bindVertexArray(null);
 }
 frame(t){if(!this.running)return;requestAnimationFrame(t2=>this.frame(t2));if(!this.visible||document.hidden){this.last=t;return;}const dt=Math.min(55,t-this.last||16),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;if(this.auto&&!reduced){this.yaw+=dt*(this.fabric?.00022:.00016);this.dirty=true;}if(this.fabric&&!reduced){this.motionTime+=dt*.001;this.dirty=true;}const lerp=Math.min(1,dt*.004);for(let i=0;i<3;i++){if(Math.abs(this.tint[i]-this.tintGoal[i])>.002){this.tint[i]+=(this.tintGoal[i]-this.tint[i])*lerp;this.dirty=true;}else this.tint[i]=this.tintGoal[i];}if(this.dirty&&t-this.clock>(this.mini?70:this.fabric?34:46)){this.render();this.dirty=false;this.clock=t;}this.last=t;}
 bindControls(){const c=this.canvas;let drag=null;const release=()=>{drag=null;c.style.cursor='grab';};c.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;this.auto=false;this.onInteract?.();this.pointers.set(e.pointerId,[e.clientX,e.clientY]);if(this.pointers.size===1)drag=[e.clientX,e.clientY];c.setPointerCapture(e.pointerId);c.style.cursor='grabbing';});
 c.addEventListener('pointermove',e=>{if(!this.pointers.has(e.pointerId))return;this.pointers.set(e.pointerId,[e.clientX,e.clientY]);if(this.pointers.size===2){let a=[...this.pointers.values()];let sep=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);if(this.touchSep){this.radius=clamp(this.radius*this.touchSep/Math.max(1,sep),this.fabric?4:this.mini?5:9,this.fabric?24:this.mini?33:120);}this.touchSep=sep;this.dirty=true;return;}
 if(!drag)return;const dx=e.clientX-drag[0],dy=e.clientY-drag[1];this.yaw-=dx*.009;this.pitch=clamp(this.pitch+dy*.007,-1.25,1.43);drag=[e.clientX,e.clientY];this.dirty=true;});
 const stop=e=>{this.pointers.delete(e.pointerId);this.touchSep=0;release()};c.addEventListener('pointerup',stop);c.addEventListener('pointercancel',stop);c.addEventListener('lostpointercapture',stop);
 c.addEventListener('wheel',e=>{e.preventDefault();this.auto=false;this.onInteract?.();this.zoom(e.deltaY>0?1.12:.89);},{passive:false});c.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();this.yaw+=e.key==='ArrowLeft'?.18:-.18;this.dirty=true;}});}
 flyTo(o={},ms=650){this.auto=false;const initial={yaw:this.yaw,pitch:this.pitch,radius:this.radius,target:[...this.target]};const dest={yaw:o.yaw??this.yaw,pitch:o.pitch??this.pitch,radius:o.radius??this.radius,target:o.target||this.target};const t0=performance.now();const tick=()=>{const t=Math.min(1,(performance.now()-t0)/ms),ease=1-Math.pow(1-t,3);for(const k of ['yaw','pitch','radius'])this[k]=initial[k]+(dest[k]-initial[k])*ease;this.target=initial.target.map((v,i)=>v+(dest.target[i]-v)*ease);this.dirty=true;if(t<1)requestAnimationFrame(tick)};requestAnimationFrame(tick);}
 focusPart(index){const p=this.parts[index];if(!p)return;const pt=p.min.map((v,i)=>(v+p.max[i])/2);const spread=Math.max(...p.min.map((v,i)=>p.max[i]-v));this.flyTo({target:pt,radius:Math.max(11,spread*1.85),yaw:-.78,pitch:.35});}
 resetMachine(){this.hiddenIds.clear();this.explode=0;this.mode=0;this.flyTo({target:[0,0,0],radius:this.homeRadius,yaw:-.87,pitch:.39});this.dirty=true;}
 zoom(factor){this.radius=clamp(this.radius*factor,this.fabric?4:this.mini?5:9,this.fabric?24:this.mini?40:120);this.dirty=true;}
 setTint(hex,immediate=false){this.tintGoal=[(hex>>16&255)/255,(hex>>8&255)/255,(hex&255)/255];if(immediate)this.tint=[...this.tintGoal];this.dirty=true;}
 focus(parts){if(parts==='overview'){this.target=[0,0,0];this.radius=this.mini?18:47;this.cutaway=false;}else{const selected=this.parts.filter(p=>p.name.startsWith((({architecture:'01.',storage:'09.',equipment:'13.'})[parts])||'---'));if(selected.length){let mn=[Infinity,Infinity,Infinity],mx=[-Infinity,-Infinity,-Infinity];selected.forEach(p=>{for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],p.min[k]);mx[k]=Math.max(mx[k],p.max[k]);}});this.target=mn.map((v,k)=>(v+mx[k])/2);this.radius=clamp(Math.max(...mn.map((v,k)=>mx[k]-v))*2.4,13,43);}else{this.target=[0,0,0];this.radius=41;}this.cutaway=parts!=='architecture';}this.yaw=-.8;this.pitch=.48;this.auto=false;this.dirty=true;}
}
const lazy=(element,go)=>{if(!element)return;if(!('IntersectionObserver'in window)){go();return;}const io=new IntersectionObserver(([e])=>{if(e.isIntersecting){io.disconnect();go();}},{rootMargin:'500px'});io.observe(element);};
function state(message,bad=false){if($('warehouseStatus'))$('warehouseStatus').textContent=message;if($('warehouseLive'))$('warehouseLive').textContent=bad?'3D UNAVAILABLE':'3D INTERACTIVE';}
async function initWarehouse(){const canvas=$('warehouseCanvas');if(!canvas)return;try{state('Loading local 3D model…');const v=new Viewer(canvas,{radius:innerWidth<640?54:47});await v.load('assets/warehouse-tour.glb');window.__kbWarehouseLoaded=true;window.KB3D=window.KB3D||{};window.KB3D.warehouse=v;
 state('3D READY · AUTO TOUR PLAYING');$('warehouseStage')?.classList.add('interactive-ready');document.querySelectorAll('.warehouse3d-stage-actions button').forEach(b=>b.disabled=false);
 const btn=$('tourCutaway'),auto=$('toggleAutoTour'),discovery=$('warehouseTourDiscovery'),progress=$('warehouseProgress');
 let playing=false,task=null,step=-1;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const entries=[
  {focus:'overview',yaw:-.65,pitch:.53,radius:innerWidth<650?52:44,target:[0,0,0],cutaway:false,title:'THE COMPLETE SPACE',description:'Orbiting around the warehouse concept'},
  {focus:'storage',yaw:-1.12,pitch:.31,radius:innerWidth<650?35:27,target:[0,0,0],cutaway:true,title:'LOOK INSIDE',description:'The roof lifts away to reveal the interior'},
  {focus:'equipment',yaw:.58,pitch:.46,radius:innerWidth<650?34:27,target:[0,0,0],cutaway:true,title:'VIEW ANOTHER ANGLE',description:'Explore the details with an open view'},
  {focus:'architecture',yaw:2.15,pitch:.34,radius:innerWidth<650?49:42,target:[0,0,0],cutaway:false,title:'STRUCTURE & FORM',description:'Another perspective on the architecture'}
 ];
 function markFocus(which){document.querySelectorAll('.warehouse-focus').forEach(b=>{const on=b.dataset.focus===which;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',String(on));});if(btn){btn.setAttribute('aria-pressed',String(v.cutaway));btn.classList.toggle('selected',v.cutaway);}}
 function updateButton(){if(auto){auto.setAttribute('aria-pressed',String(playing));auto.innerHTML=playing?'PAUSE AUTO TOUR <span>Ⅱ</span>':'REPLAY CAMERA TOUR <span>↻</span>';}discovery?.classList.toggle('paused',!playing);}
 function setPlaying(on){playing=on&&!reduced;clearInterval(task);task=null;updateButton();if(progress){progress.style.animation='none';void progress.offsetWidth;progress.style.animation=playing?'tourProgress 5200ms linear infinite':'none';}if(playing){next();task=setInterval(()=>{if(v.visible&&!document.hidden)next();},5200);}else{if($('warehouseTourHeading'))$('warehouseTourHeading').textContent='YOU ARE IN CONTROL';if($('warehouseTourSubtitle'))$('warehouseTourSubtitle').textContent='Drag, zoom or choose any viewpoint.';}}
 function next(){step=(step+1)%entries.length;const s=entries[step];v.cutaway=s.cutaway;v.flyTo({yaw:s.yaw,pitch:s.pitch,radius:s.radius,target:s.target},2100);markFocus(s.focus);if($('warehouseTourHeading'))$('warehouseTourHeading').textContent=s.title;if($('warehouseTourSubtitle'))$('warehouseTourSubtitle').textContent=s.description;if($('warehouseStatus'))$('warehouseStatus').textContent='AUTO TOUR / '+String(step+1).padStart(2,'0')+' OF 04';}
 function pause(){if(playing)setPlaying(false);}
 v.onInteract=pause;
 function focus(which){pause();v.focus(which);markFocus(which);if($('warehouseTourHeading'))$('warehouseTourHeading').textContent='VIEWPOINT SELECTED';if($('warehouseTourSubtitle'))$('warehouseTourSubtitle').textContent='Drag the model or zoom in to inspect.';}
 document.querySelectorAll('.warehouse-focus').forEach(b=>b.addEventListener('click',()=>focus(b.dataset.focus)));
 $('tourReset')?.addEventListener('click',()=>focus('overview'));$('tourZoomIn')?.addEventListener('click',()=>{pause();v.zoom(.8)});$('tourZoomOut')?.addEventListener('click',()=>{pause();v.zoom(1.22)});btn?.addEventListener('click',()=>{pause();v.cutaway=!v.cutaway;markFocus('overview');v.dirty=true;});
 auto?.addEventListener('click',()=>setPlaying(!playing));
 const stage=$('warehouseStage');stage?.addEventListener('keydown',e=>{if(e.key==='+'||e.key==='='){pause();v.zoom(.82)}if(e.key==='-'){pause();v.zoom(1.2)}});
 if(!reduced)setPlaying(true);else{updateButton();if($('warehouseTourSubtitle'))$('warehouseTourSubtitle').textContent='Motion disabled by device accessibility settings.';}
 }catch(err){console.error('[KB 3D] warehouse:',err);state('Model did not load. Please serve the site over HTTP.',true);}}
async function initDetail(slug,id){const c=$(id);if(!c)return;try{const v=new Viewer(c,{mini:true,radius:17,yaw:-.7,auto:true});await v.load(`assets/warehouse-${slug}.glb`);window.KB3D=window.KB3D||{};window.KB3D[slug]=v;}catch(err){console.error('[KB 3D] detail:',slug,err);}}
async function initFabric(){const c=$('fabricCanvas');if(!c)return;try{const v=new Viewer(c,{fabric:true,gallery:true,radius:12.8,yaw:-.12,pitch:.06,auto:true});await v.load('assets/denim-drape.glb');v.setTint(0x315c91,true);window.KB3D=window.KB3D||{};window.KB3D.fabric=v;$('studioLoading')?.remove();$('studioFallback')?.remove();
 const names=['indigo','mid','black'],palette=[0x315c91,0xa1b8d2,0x353f4c];let playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,interval=null,index=0,manualTime=0;
 const toggle=$('fabricAutoPlay'),status=$('fabricAutoStatus'),motion=$('fabricMotionLabel');
 function pick(i,isAutomatic=false){index=i;v.paletteIndex=i;v.setTint(palette[i]);window.dispatchEvent(new CustomEvent('kb:fabric-auto-select',{detail:{tone:names[i],automatic:isAutomatic}}));if(motion)motion.textContent=`COLOUR ${String(i+1).padStart(2,'0')} OF 03 / ${['DEEP INDIGO','WASHED BLUE','CHARCOAL'][i]}`;}
 function update(){if(toggle){toggle.setAttribute('aria-pressed',String(playing));toggle.innerHTML=playing?'PAUSE <span aria-hidden="true">Ⅱ</span>':'PLAY <span aria-hidden="true">↻</span>';}if(status)status.textContent=playing?'AUTO COLOUR STORY / PLAYING':'MANUAL COLOUR STUDY / PAUSED';}
 function setAuto(on){playing=on;clearInterval(interval);if(on){v.auto=true;interval=setInterval(()=>{if(v.visible&&!document.hidden&&Date.now()-manualTime>5000)pick((index+1)%3,true)},3600);}update();}
 window.addEventListener('kb:fabric-tone',e=>{let i=names.indexOf(e.detail.tone);if(i<0)return;manualTime=Date.now();pick(i,false);setAuto(false);});
 window.addEventListener('kb:reset-3d',()=>{v.yaw=-.12;v.pitch=.06;v.radius=12.8;v.target=[0,0,0];v.dirty=true;});
 v.onInteract=()=>{manualTime=Date.now();setAuto(false)};
 toggle?.addEventListener('click',()=>setAuto(!playing));setAuto(playing);
 }catch(err){console.error('[KB 3D] fabric:',err);if($('studioLoading'))$('studioLoading').textContent='Fabric preview available';}}
async function initHero(){const c=$('heroFabricCanvas');if(!c)return;try{const v=new Viewer(c,{fabric:true,radius:10,yaw:.13,pitch:.16,auto:true});await v.load('assets/denim-drape.glb');v.setTint(0x315c91,true);window.KB3D=window.KB3D||{};window.KB3D.hero=v;$('hero3dStage')?.classList.add('hero-ready');
 const tones=[0x315c91,0xa1b8d2,0x353f4c];let i=0;setInterval(()=>{if(v.visible&&!document.hidden&&v.auto){i=(i+1)%3;v.setTint(tones[i]);}},4200);v.onInteract=()=>{if($('hero3dHint'))$('hero3dHint').textContent='YOU’RE IN CONTROL ↔';};}catch(e){console.warn('[KB3D] hero preview fallback',e);}}
 async function initMachine(){const c=$('machineCanvas');if(!c)return;const status=$('machineStatus');try{
  if(status)status.textContent='Loading the textured mechanical study…';
  const v=new Viewer(c,{upright:true,radius:42,yaw:-.87,pitch:.39});
  await v.load('assets/device5-machinery.glb');v.auto=!matchMedia('(prefers-reduced-motion: reduce)').matches;window.KB3D=window.KB3D||{};window.KB3D.machine=v;
  $('machineStage')?.classList.add('machine-ready');if(status)status.textContent='LIVE 3D · Auto rotating · Drag to take control';$('machineOrbit')?.setAttribute('aria-pressed',String(v.auto));
  document.querySelectorAll('[data-machine-view]').forEach((btn)=>{btn.disabled=false;btn.addEventListener('click',()=>{
   const view=btn.dataset.machineView;document.querySelectorAll('[data-machine-view]').forEach(b=>{b.classList.toggle('is-active',b===btn);b.setAttribute('aria-pressed',String(b===btn));});
   if(view==='all')v.resetMachine();else if(view==='grey')v.focusPart(0);else if(view==='steel')v.focusPart(1);else if(view==='weathered')v.focusPart(2);
   const descriptions={all:'Complete industrial assembly / supplied 3D concept',grey:'Grey housing and external drive elements',steel:'Inner mechanisms and primary working assembly',weathered:'Second machine assembly with weathered finish'};
   if($('machineInfo'))$('machineInfo').textContent=descriptions[view];
  });});
  const actions={machineZoomIn:()=>v.zoom(.8),machineZoomOut:()=>v.zoom(1.25),machineReset:()=>{v.resetMachine();document.querySelectorAll('[data-machine-view]').forEach(b=>{b.classList.toggle('is-active',b.dataset.machineView==='all');b.setAttribute('aria-pressed',String(b.dataset.machineView==='all'));});['machineTechnical','machineExplode','machineOrbit'].forEach(id=>$(id)?.setAttribute('aria-pressed','false'));if($('machineInfo'))$('machineInfo').textContent='Complete industrial assembly / supplied 3D concept';},machineExplode:()=>{v.explode=v.explode?0:1;$('machineExplode').setAttribute('aria-pressed',String(!!v.explode));v.dirty=true;},machineTechnical:()=>{v.mode=v.mode===1?0:1;$('machineTechnical').setAttribute('aria-pressed',String(v.mode===1));v.dirty=true;},machineOrbit:()=>{v.auto=!v.auto;$('machineOrbit').setAttribute('aria-pressed',String(v.auto));v.dirty=true;},machineFullscreen:()=>{if(document.fullscreenElement){document.exitFullscreen();}else{$('machineStage')?.requestFullscreen?.();}}};
  Object.entries(actions).forEach(([id,fn])=>{$(id)?.addEventListener('click',fn);if($(id))$(id).disabled=false;});
  v.onInteract=()=>{$('machineOrbit')?.setAttribute('aria-pressed','false');if(status)status.textContent='Manual mode · Rotate / zoom to inspect';};
 }catch(e){console.error('[KB3D] machinery load failed:',e);if(status)status.textContent='The machinery preview could not load on this device. Please try Chrome / Edge.';}}
 lazy($('hero3dStage'),initHero);lazy($('warehouseStage'),initWarehouse);lazy($('detailArchitecture'),()=>initDetail('architecture','detailArchitecture'));lazy($('detailStorage'),()=>initDetail('storage','detailStorage'));lazy($('detailEquipment'),()=>initDetail('equipment','detailEquipment'));lazy($('studioViewer'),initFabric);lazy($('machineStage'),initMachine);
})();
