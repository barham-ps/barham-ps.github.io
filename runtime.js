/* No telemetry transport, cookies, identifiers, URL collection or error text. */
(function(){
  'use strict';
  const preferenceKey='barham-low-data-v1';
  const connection=navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  let choice=null;
  try { const value=localStorage.getItem(preferenceKey); if(value==='on'||value==='off') choice=value; } catch {}
  function lowData(){
    return choice===null ? Boolean(connection?.saveData || ['slow-2g','2g','3g'].includes(connection?.effectiveType)) : choice==='on';
  }
  const metrics={lcpMs:null,cls:null,errors:0,rejections:0};
  let clsWindow=0, first=null,last=null;
  function observe(type,fn){
    try { if(typeof PerformanceObserver==='function') new PerformanceObserver(list=>{for(const entry of list.getEntries())fn(entry);}).observe({type,buffered:true}); } catch {}
  }
  observe('largest-contentful-paint',e=>{metrics.lcpMs=Math.round(e.startTime);});
  observe('layout-shift',e=>{
    if(e.hadRecentInput)return;
    if(first===null || e.startTime-last>1000 || e.startTime-first>5000){first=e.startTime;clsWindow=0;}
    last=e.startTime;clsWindow+=e.value;metrics.cls=Math.max(metrics.cls??0,clsWindow);
  });
  window.addEventListener('error',()=>{metrics.errors=Math.min(1000,metrics.errors+1);},true);
  window.addEventListener('unhandledrejection',()=>{metrics.rejections=Math.min(1000,metrics.rejections+1);});
  function render(){
    const on=lowData();
    document.documentElement.dataset.lowData=String(on);
    const b=document.getElementById('bandwidth-toggle');
    if(b){b.setAttribute('aria-pressed',String(on));b.textContent=on?'إلغاء توفير البيانات':'وضع توفير البيانات';}
    const status=document.getElementById('network-status');
    if(status) status.textContent=navigator.onLine===false?'لا يوجد اتصال بالإنترنت':on?'توفير البيانات مفعّل':'';
  }
  function update(){render();window.dispatchEvent(new Event('family-network-change'));}
  window.addEventListener('online',update);
  window.addEventListener('offline',update);
  try { if(connection && typeof connection.addEventListener==='function') connection.addEventListener('change',update); } catch {}
  // One in-flight anonymous request for exactly the existing published-news projection.
  // Never use session tokens, cookies, localStorage records or private data for this path.
  let initialNews=null, newsAbort=null;
  function prefetchHomeNews(){
    if(location.hash!==''&&location.hash!=='#home')return;
    if(navigator.onLine===false||typeof fetch!=='function'||typeof AbortController!=='function')return;
    newsAbort=new AbortController();
    const controller=newsAbort;
    const timeout=setTimeout(()=>controller.abort(),7000);
    const url=new URL('https://vfxxghfmkmgdqrczeowx.supabase.co/rest/v1/family_news');
    url.search=new URLSearchParams({select:'id,title,body,category,image_path,image_paths,cover_paths,created_at',published:'eq.true',order:'created_at.desc',limit:'1'}).toString();
    initialNews=fetch(url,{method:'GET',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',headers:{apikey:'sb_publishable_-LW-iVjvk4hmvdzcR9jgYw_my4buOkw',Accept:'application/json'},signal:controller.signal})
      .then(async response=>{
        if(!response.ok)return null;
        const rows=await response.json();
        if(!Array.isArray(rows)||rows.length>1||rows.some(x=>!x||typeof x.id!=='string'||typeof x.title!=='string'||typeof x.body!=='string'))return null;
        return rows;
      }).catch(()=>null).finally(()=>{clearTimeout(timeout);if(newsAbort===controller)newsAbort=null;});
  }
  prefetchHomeNews();
  window.addEventListener('hashchange',()=>{if(location.hash!==''&&location.hash!=='#home'){if(newsAbort)newsAbort.abort();initialNews=null;}});
  function takeInitialNews(){const pending=initialNews;initialNews=null;return pending;}
  window.familyRuntime=Object.freeze({lowData,online:()=>navigator.onLine!==false,takeInitialNews});
  const toggle=document.getElementById('bandwidth-toggle');
  toggle?.addEventListener('click',()=>{choice=lowData()?'off':'on';try{localStorage.setItem(preferenceKey,choice);}catch{}update();});
  document.getElementById('local-diagnostics')?.addEventListener('click',()=>{
    const node=document.getElementById('local-diagnostics-result');
    if(!node)return;
    const lcp=metrics.lcpMs===null?'غير متاح':metrics.lcpMs+' ms';
    const cls=metrics.cls===null?'غير متاح':metrics.cls.toFixed(3);
    node.textContent='قياس محلي لهذه الزيارة فقط — LCP: '+lcp+'؛ CLS: '+cls+'؛ أخطاء المتصفح: '+metrics.errors+'؛ العمليات المرفوضة غير المعالجة: '+metrics.rejections+'. لا تُرسل هذه البيانات إلى أي خادم.';
    node.hidden=false;
  });
  // Load decorative fonts only for other routes. Home keeps stable system font metrics.
  function routeFonts(){
    const isHome=location.hash===''||location.hash==='#home';
    document.documentElement.dataset.homeRoute=String(isHome);
    if(isHome||lowData()||document.getElementById('route-webfonts'))return;
    const link=document.createElement('link');link.id='route-webfonts';link.rel='stylesheet';link.href='https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=optional';document.head.append(link);
  }
  window.addEventListener('hashchange',routeFonts);window.addEventListener('family-network-change',routeFonts);routeFonts();
  render();
  if(toggle)toggle.disabled=false;
  const diagnosticButton=document.getElementById('local-diagnostics');
  if(diagnosticButton)diagnosticButton.disabled=false;
})();
