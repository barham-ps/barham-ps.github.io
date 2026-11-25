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
  // Load decorative fonts only for other routes. Home keeps stable system font metrics.
  function routeFonts(){
    const isHome=location.hash===''||location.hash==='#home';
    document.documentElement.dataset.homeRoute=String(isHome);
    if(isHome||lowData()||document.getElementById('route-webfonts'))return;
    const link=document.createElement('link');link.id='route-webfonts';link.rel='stylesheet';link.href='https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=optional';document.head.append(link);
  }
  window.addEventListener('hashchange',routeFonts);window.addEventListener('family-network-change',routeFonts);routeFonts();
  // Optional royal heading font, after initial rendering; no request on slow/offline connections.
  function loadRoyalHeadingFont(){
    if(lowData()||navigator.onLine===false||document.getElementById('royal-heading-font')||document.getElementById('route-webfonts'))return;
    if(location.hash!==''&&location.hash!=='#home')return;
    const link=document.createElement('link');link.id='royal-heading-font';link.rel='stylesheet';link.media='print';link.href='https://fonts.googleapis.com/css2?family=Amiri:wght@700&display=optional';
    link.addEventListener('load',()=>{link.media='all';},{once:true});document.head.append(link);
  }
  if(document.readyState==='complete')loadRoyalHeadingFont();else window.addEventListener('load',loadRoyalHeadingFont,{once:true});
  render();
})();
