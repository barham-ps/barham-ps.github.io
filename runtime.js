/* No telemetry transport, cookies, identifiers, URL collection or error text. */
(function(){
  'use strict';
  const preferenceKey='barham-low-data-v1';
  const connection=navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  // Follow the browser's data-saving preference automatically; obsolete manual settings no longer apply.
  try { localStorage.removeItem(preferenceKey); } catch {}
  function lowData(){return Boolean(connection?.saveData || ['slow-2g','2g','3g'].includes(connection?.effectiveType));}
  function render(){document.documentElement.dataset.lowData=String(lowData());}
  function update(){render();window.dispatchEvent(new Event('family-network-change'));}
  window.addEventListener('online',update);
  window.addEventListener('offline',update);
  try { if(connection && typeof connection.addEventListener==='function') connection.addEventListener('change',update); } catch {}
  window.familyRuntime=Object.freeze({lowData,online:()=>navigator.onLine!==false});
  // Fonts are bundled, same-origin and loaded by CSS only when used by rendered text.
  function markRoute(){
    document.documentElement.dataset.homeRoute=String(location.hash===''||location.hash==='#home');
  }
  window.addEventListener('hashchange',markRoute);markRoute();
  render();
})();
(function(){
  'use strict';
  const key='barham-text-size-v1', choices=['normal','large','largest'];
  function render(value){
    if(!choices.includes(value))value='normal';
    document.documentElement.dataset.familyTextSize=value;
    document.querySelectorAll('[data-family-text-size]').forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.familyTextSize===value));
    });
    return value;
  }
  let size='normal';try{size=localStorage.getItem(key)||size;}catch{}
  function init(){
    render(size);
    document.querySelectorAll('[data-family-text-size]').forEach(button=>button.addEventListener('click',()=>{
      size=render(button.dataset.familyTextSize);
      try{localStorage.setItem(key,size);}catch{}
    }));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
