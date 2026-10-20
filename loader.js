/* KB DENIM / MATERIAL INTRO. Self-contained, deterministic and always skippable.
   The percentage is the illustrative intro sequence progress, not a network-load claim. */
(()=>{
  'use strict';
  const root=document.getElementById('kbOpening');
  if(!root)return;
  const skip=document.getElementById('kbIntroSkip');
  const stage=document.getElementById('kbIntroStage');
  const percent=document.getElementById('kbIntroPercent');
  const bar=document.getElementById('kbIntroProgress');
  const fill=document.getElementById('kbIntroProgressFill');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const directLink=location.hash && location.hash!=='#top';
  const LENGTH=4150;
  let start=0,raf=0,finished=false;
  function notifyReady(){window.dispatchEvent(new CustomEvent('kb:intro-finished'));window.ScrollTrigger?.refresh?.();}
  function finish(immediate=false){
    if(finished)return;
    finished=true;
    cancelAnimationFrame(raf);
    root.classList.remove('is-playing');
    if(immediate){root.hidden=true;root.setAttribute('aria-hidden','true');document.body.classList.remove('kb-preloading');notifyReady();return}
    root.classList.add('is-leaving');
    setTimeout(()=>{root.hidden=true;root.setAttribute('aria-hidden','true');document.body.classList.remove('kb-preloading');notifyReady();},640);
  }
  skip?.addEventListener('click',()=>{
    finish(true);
    const hero=document.getElementById('heroTitle');
    if(hero){hero.setAttribute('tabindex','-1');hero.focus({preventScroll:true})}
  });
  if(reduced||directLink){finish(true);return;}
  window.scrollTo(0,0);
  root.classList.add('is-playing');
  function tick(now){
    if(finished)return;
    if(!start)start=now;
    const progress=Math.min(1,(now-start)/LENGTH);
    const n=Math.round(progress*100);
    if(percent)percent.textContent=`${String(n).padStart(2,'0')}%`;
    if(fill)fill.style.width=`${n}%`;
    if(bar)bar.setAttribute('aria-valuenow',String(n));
    if(stage){
      if(progress<.33)stage.textContent='01 / RAW FABRIC ENTERS THE MILL';
      else if(progress<.68)stage.textContent='02 / WEAVING & FINISHING';
      else stage.textContent='03 / FINISHED DENIM — READY';
    }
    if(progress>=1){finish();return}
    raf=requestAnimationFrame(tick);
  }
  raf=requestAnimationFrame(tick);
  // Handle severely throttled tabs: never leave the page locked behind an intro.
  setTimeout(()=>{if(!finished)finish()},7500);
})();
