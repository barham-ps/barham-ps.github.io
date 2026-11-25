/* No telemetry transport, cookies, identifiers, URL collection or error text. */
(function(){
  'use strict';
  // Paint-time greeting, independent of the remote account SDK.
  function familyGreeting(now) {
    var hour = Number(new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Gaza', hour: '2-digit', hourCycle: 'h23'
    }).format(now));
    return (hour >= 5 && hour < 12 ? 'صباح الخير' :
      hour >= 12 && hour < 17 ? 'نهارك سعيد' : 'مساء الخير') + '، أهلًا بك في بيتنا';
  }
  function updateFamilyGreeting() {
    var greet = document.getElementById('greet');
    if (!greet) return;
    try {
      var message = familyGreeting(new Date());
      if (greet.textContent !== message) greet.textContent = message;
    } catch (error) {
      greet.textContent = 'أهلًا بك في بيتنا';
    }
  }
  updateFamilyGreeting();
  window.setInterval(updateFamilyGreeting, 15000);
  window.addEventListener('pageshow', updateFamilyGreeting);
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) updateFamilyGreeting();
  });

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
  // Public anonymous read only. RLS still applies; do not persist, cache, or forward auth tokens.
  let initialNews=null;
  const home=location.hash===''||location.hash==='#home';
  if(home&&navigator.onLine!==false){
    const url=new URL('https://vfxxghfmkmgdqrczeowx.supabase.co/rest/v1/family_news');
    url.search=new URLSearchParams({select:'id,title,body,category,image_path,image_paths,cover_paths,created_at',published:'eq.true',order:'created_at.desc',limit:'1'}).toString();
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),5000);
    initialNews=fetch(url,{method:'GET',headers:{apikey:'sb_publishable_-LW-iVjvk4hmvdzcR9jgYw_my4buOkw',Accept:'application/json'},credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal}).then(async response=>{
      if(!response.ok)throw Error('Public news unavailable');
      const rows=await response.json();if(!Array.isArray(rows)||rows.length>1||rows.some(r=>!r||typeof r.id!=='string'||typeof r.title!=='string'||typeof r.body!=='string'))throw Error('Invalid public news');
      return rows;
    }).catch(()=>null).finally(()=>clearTimeout(timeout));
  }
  function takeInitialNews(){const pending=initialNews;initialNews=null;return pending;}
  window.familyRuntime=Object.freeze({lowData,online:()=>navigator.onLine!==false,takeInitialNews});
  // Load decorative fonts only for other routes. Home keeps stable system font metrics.
  function routeFonts(){
    const isHome=location.hash===''||location.hash==='#home';
    document.documentElement.dataset.homeRoute=String(isHome);
    if(isHome||lowData()||document.getElementById('route-webfonts'))return;
    const link=document.createElement('link');link.id='route-webfonts';link.rel='stylesheet';link.href='https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=optional';document.head.append(link);
  }
  window.addEventListener('hashchange',routeFonts);window.addEventListener('family-network-change',routeFonts);routeFonts();
  render();
})();
