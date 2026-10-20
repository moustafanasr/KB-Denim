(()=>{
  'use strict';
  const $=(q,r=document)=>r.querySelector(q);
  const $$=(q,r=document)=>Array.from(r.querySelectorAll(q));
  const prefersReduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const year=$('#year'); if(year)year.textContent=String(new Date().getFullYear());
  window.smoothscroll?.polyfill?.();
  const menuBtn=$('#menuTrigger'),nav=$('#mobileNav'),header=$('#siteHead');
  function setMenu(open){
    menuBtn?.setAttribute('aria-expanded',String(open));
    menuBtn?.setAttribute('aria-label',open?'Close navigation':'Open navigation');
    nav?.classList.toggle('open',open);if(nav)nav.inert=!open;
    document.body.classList.toggle('menu-open',open);
  }
  if(nav&&menuBtn){setMenu(false);menuBtn.addEventListener('click',()=>setMenu(menuBtn.getAttribute('aria-expanded')!=='true'));
    $$('#mobileNav a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
    window.addEventListener('resize',()=>{if(innerWidth>1050)setMenu(false)},{passive:true});
  }
  const progress=$('#readingLine');let ticking=false;
  function onScroll(){if(ticking)return;ticking=true;requestAnimationFrame(()=>{const range=Math.max(1,document.documentElement.scrollHeight-innerHeight);progress.style.width=`${Math.min(100,scrollY/range*100)}%`;header?.classList.toggle('is-scrolled',scrollY>20);ticking=false})}
  addEventListener('scroll',onScroll,{passive:true});onScroll();
  if(window.Swiper){new window.Swiper('.collection-swiper',{slidesPerView:'auto',spaceBetween:19,speed:680,grabCursor:true,watchOverflow:true,navigation:{nextEl:'.swiper-next',prevEl:'.swiper-prev'},keyboard:{enabled:true,onlyInViewport:true},a11y:{enabled:true},breakpoints:{700:{spaceBetween:23},1100:{spaceBetween:30}}})}
  else { // Native, working carousel controls when the optional Swiper CDN is blocked.
    const rail=$('.collection-swiper');
    function moveSlide(dir){const card=$('.fabric-card',rail);if(!rail||!card)return;rail.scrollBy({left:dir*(card.getBoundingClientRect().width+20),behavior:'smooth'});}
    $('.swiper-prev')?.addEventListener('click',()=>moveSlide(-1));
    $('.swiper-next')?.addEventListener('click',()=>moveSlide(1));
  }
  const descriptions=[
    'The right fabric starts with the right yarn. Every choice matters before a single metre is woven.',
    'Our weaving know-how gives structure, character and reliability to the material.',
    'Finishing determines the final feel, appearance and purpose of every construction.',
    'Consistency is built into the work, from first preparation to the finished fabric.'
  ];
  const imgs=[
    ['factory-spinning.webp','Yarn preparation machinery in the KB Denim mill'],
    ['factory-hero.webp','Long rows of weaving machinery at KB Denim'],
    ['factory-finishing.webp','Finishing equipment inside KB Denim'],
    ['factory-machinery.webp','Textile manufacturing equipment inside KB Denim']
  ];
  imgs.forEach(([p])=>{const img=new Image();img.src=`assets/${p}`});
  const processImg=$('#makingImage'),processCaption=$('#makingCaption'),detail=$('#makingDetail');
  $$('.making-stage').forEach(b=>b.addEventListener('click',()=>{
    const i=Number(b.dataset.stage);$$('.making-stage').forEach(el=>{const active=el===b;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active))});
    if(!processImg)return;
    processImg.classList.add('changing');const next=new Image();
    next.onload=()=>{processImg.src=next.src;processImg.alt=imgs[i][1];processCaption.textContent=`FIG. 03 / THE MILL AT WORK — STEP ${String(i+1).padStart(2,'0')}`;detail.textContent=descriptions[i];requestAnimationFrame(()=>processImg.classList.remove('changing'))};
    next.onerror=()=>processImg.classList.remove('changing');next.src=`assets/${imgs[i][0]}`;
  }));
  function syncFabricUI(tone){
    $$('.fabric-option').forEach(el=>{const selected=el.dataset.tone===tone;el.classList.toggle('active',selected);el.setAttribute('aria-pressed',String(selected));const hint=$('b',el);if(hint)hint.textContent=selected?'SELECTED':'SELECT';});
    const fallback=$('.fabric-fallback-sheet');if(fallback)fallback.style.filter=tone==='mid'?'brightness(1.6)':tone==='black'?'brightness(.58)':'none';
  }
  window.addEventListener('kb:fabric-auto-select',e=>syncFabricUI(e.detail.tone));
  $$('.fabric-option').forEach(b=>b.addEventListener('click',()=>{syncFabricUI(b.dataset.tone);
    const tone=b.dataset.tone;
    window.dispatchEvent(new CustomEvent('kb:fabric-tone',{detail:{tone}}));
  }));
  $('#resetView')?.addEventListener('click',()=>window.dispatchEvent(new Event('kb:reset-3d')));
  // A real working fallback if WebGL or CDN modules cannot load. It remains useful
  // for browsing individual objects rather than leaving inert buttons on screen.
  const warehouseImages={
    overview:'warehouse-preview.png',
    architecture:'warehouse-architecture-poster.webp',
    storage:'warehouse-storage-poster.webp',
    equipment:'warehouse-equipment-poster.webp'
  };
  $$('.warehouse-focus').forEach(b=>b.addEventListener('click',()=>{
    if(window.__kbWarehouseLoaded)return;
    $$('.warehouse-focus').forEach(el=>{const active=el===b;el.classList.toggle('is-active',active);el.setAttribute('aria-pressed',String(active));});
    const img=$('#warehouseFallback img');if(img)img.src=`assets/${warehouseImages[b.dataset.focus]||warehouseImages.overview}`;
    const status=$('#warehouseStatus');if(status)status.textContent='Static model preview · 3D loads on supported devices';
  }));
  $('#toggleAutoTour')?.addEventListener('click',()=>{
    if(window.__kbWarehouseLoaded)return;
    const s=$('#warehouseStatus');if(s)s.textContent='Camera tour available when interactive 3D is loaded';
  });
  setTimeout(()=>{if(!window.__kbWarehouseLoaded){
    const s=$('#warehouseStatus');if(s&&s.textContent.includes('Preparing'))s.textContent='Preview mode · Interactive 3D requires WebGL and an internet connection';
    const live=$('#warehouseLive');if(live&&live.textContent.includes('READY'))live.textContent='MODEL PREVIEW';
  }},6500);
  setTimeout(()=>{const l=$('#studioLoading');if(l)l.style.display='none'},6500);
  // Intentional editorial depth: subtle motion tied to pointer, without shifting text.
  const heroVisual=$('.hero-visual');if(heroVisual&&!prefersReduced){
    heroVisual.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const r=heroVisual.getBoundingClientRect();heroVisual.style.setProperty('--hero-shift-x',`${((e.clientX-r.left)/r.width-.5)*12}px`);heroVisual.style.setProperty('--hero-shift-y',`${((e.clientY-r.top)/r.height-.5)*12}px`);});
    heroVisual.addEventListener('pointerleave',()=>{heroVisual.style.setProperty('--hero-shift-x','0px');heroVisual.style.setProperty('--hero-shift-y','0px');});
  }
  const modal=$('#enquiryModal'),closeBtn=$('#modalClose'),modalPanel=$('.modal-content');let prevFocus=null;
  function closeModal(){if(!modal||modal.hidden)return;modal.hidden=true;document.body.classList.remove('modal-open');prevFocus?.focus?.()}
  function openModal(type){if(!modal)return;setMenu(false);prevFocus=document.activeElement;modal.hidden=false;document.body.classList.add('modal-open');const sel=$('#collectionSelect');if(sel){sel.value=type; if(!sel.value)sel.value='General enquiry'}closeBtn?.focus()}
  $$('[data-request]').forEach(btn=>btn.addEventListener('click',()=>openModal(btn.dataset.request)));
  closeBtn?.addEventListener('click',closeModal);modal?.addEventListener('click',e=>{if(e.target===modal)closeModal()});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){closeModal();setMenu(false)}
    if(e.key==='Tab'&&!modal?.hidden){const focusables=$$('button:not([disabled]),a[href],input,select,textarea',modalPanel);const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
  });
  $('#enquiryForm')?.addEventListener('submit',e=>{
    e.preventDefault();if(!e.currentTarget.reportValidity())return;
    const data=new FormData(e.currentTarget);const type=String(data.get('collection')||'General enquiry');
    const subject=`KB Denim | ${type}`;
    const body=`Company / contact: ${data.get('company')}\nEmail: ${data.get('email')}\nCollection: ${type}\n\nRequirements:\n${data.get('details')||'Please get in touch to discuss my fabric enquiry.'}`;
    window.location.href=`mailto:info@kbdenim.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
  if(window.gsap && !prefersReduced){
    const g=window.gsap;if(window.ScrollTrigger)g.registerPlugin(window.ScrollTrigger);
    function startHeroEntrance(){
      g.from('.hero-type .type-mask>span',{yPercent:110,duration:1.1,stagger:.13,ease:'power4.out',delay:.12,clearProps:'transform'});
      g.from('.hero-kicker,.hero-intro,.hero-micro',{opacity:0,y:18,duration:.75,stagger:.14,delay:.65,ease:'power2.out',clearProps:'opacity,transform'});
      g.from('.hero-photograph img',{scale:1.12,opacity:.7,duration:1.9,ease:'power2.out',clearProps:'opacity,transform'});
    }
    if(document.body.classList.contains('kb-preloading')) window.addEventListener('kb:intro-finished',startHeroEntrance,{once:true});
    else startHeroEntrance();
    if(window.ScrollTrigger){
      g.utils.toArray('.section-display').forEach(el=>g.from(el,{opacity:0,y:50,duration:1.05,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 90%',once:true},clearProps:'opacity,transform'}));
      g.utils.toArray('.image-reveal img').forEach(el=>g.from(el,{scale:1.08,duration:1.35,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 86%',once:true},clearProps:'transform'}));
      g.to('.hero-photograph img',{yPercent:9,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});
      g.to('.editorial-bridge>img',{yPercent:8,ease:'none',scrollTrigger:{trigger:'.editorial-bridge',start:'top bottom',end:'bottom top',scrub:true}});
    }
  }
})();
