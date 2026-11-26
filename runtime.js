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
