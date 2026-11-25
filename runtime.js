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
  connection?.addEventListener?.('change',update);
  window.familyRuntime=Object.freeze({lowData,online:()=>navigator.onLine!==false});
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
  render();
  if(toggle)toggle.disabled=false;
  const diagnosticButton=document.getElementById('local-diagnostics');
  if(diagnosticButton)diagnosticButton.disabled=false;
})();
