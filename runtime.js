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
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',updateFamilyGreeting,{once:true});
  else updateFamilyGreeting();
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
  let initialNews=null,initialCover=null,initialTeaser=null,initialConsumed=false;
  const publicHeaders=()=>({apikey:'sb_publishable_-LW-iVjvk4hmvdzcR9jgYw_my4buOkw',Accept:'application/json'});
  // Start signing the published cover immediately after the public row arrives.
  // The existing storage RLS authorizes this read; no session, cache or secret key.
  function beginCover(row){
    if(lowData()||!row||!Array.isArray(row.cover_paths))return;
    const allowed=new Set([...(Array.isArray(row.image_paths)?row.image_paths:[]),row.image_path]);
    const paths=[...new Set(row.cover_paths.filter(p=>typeof p==='string'&&allowed.has(p)))].slice(0,3);
    if(!paths.length)return;
    const endpoint=new URL('https://vfxxghfmkmgdqrczeowx.supabase.co/storage/v1/object/sign/family-news');
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),4000);
    const pending=fetch(endpoint,{method:'POST',headers:{...publicHeaders(),'Content-Type':'application/json'},body:JSON.stringify({expiresIn:900,paths}),credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal}).then(async response=>{
      if(!response.ok)return null;
      const data=await response.json();if(!Array.isArray(data))return null;
      const signed=paths.map(path=>{
        const item=data.find(x=>x?.path===path);if(typeof item?.signedURL!=='string')return null;
        if(!item.signedURL.startsWith('/object/sign/family-news/'))return null;
        const url=new URL('/storage/v1'+item.signedURL,endpoint.origin);
        return url.origin===endpoint.origin&&url.pathname.startsWith('/storage/v1/object/sign/family-news/')&&url.searchParams.has('token')?url.href:null;
      });
      // Warm only the first authorized published cover, before the portal SDK finishes.
      // Match the eventual image request mode; do not cache manually or preload on data saver.
      if(signed[0]&&!lowData()&&(location.hash===''||location.hash==='#home')){
        const hint=document.createElement('link');hint.rel='preload';hint.as='image';hint.href=signed[0];hint.fetchPriority='high';hint.referrerPolicy='no-referrer';document.head.append(hint);
        hint.addEventListener('load',()=>hint.remove(),{once:true});hint.addEventListener('error',()=>hint.remove(),{once:true});
        setTimeout(()=>hint.remove(),15000);
      }
      return signed;
    }).catch(()=>null).finally(()=>clearTimeout(timer));
    initialCover={paths,pending,until:Date.now()+60000};
  }
  function takeInitialCover(paths){
    const cover=initialCover;initialCover=null;
    if(!cover||cover.until<Date.now()||JSON.stringify(cover.paths)!==JSON.stringify(paths))return null;
    return cover.pending;
  }
  const home=location.hash===''||location.hash==='#home';
  if(home&&navigator.onLine!==false){
    const url=new URL('https://vfxxghfmkmgdqrczeowx.supabase.co/rest/v1/family_news');
    url.search=new URLSearchParams({select:'id,title,body,category,image_path,image_paths,cover_paths,created_at',published:'eq.true',order:'created_at.desc',limit:'1'}).toString();
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),5000);
    initialNews=fetch(url,{method:'GET',headers:publicHeaders(),credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal}).then(async response=>{
      if(!response.ok)throw Error('Public news unavailable');
      const rows=await response.json();if(!Array.isArray(rows)||rows.length>1||rows.some(r=>!r||typeof r.id!=='string'||typeof r.title!=='string'||typeof r.body!=='string'))throw Error('Invalid public news');
      if(rows.length)beginCover(rows[0]);
      return rows;
    }).catch(()=>null).finally(()=>clearTimeout(timeout));
  }
  // Render the real, published homepage card as soon as its anonymous query returns.
  // The portal adopts these same nodes, rather than repainting the LCP image after SDK startup.
  function paintInitialTeaser(row){
    if(initialConsumed||initialTeaser||lowData()||navigator.onLine===false||
      (location.hash!==''&&location.hash!=='#home')||!row||!/^[0-9a-f-]{36}$/i.test(row.id))return;
    const target=document.getElementById('home-latest-news');
    if(!target){
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>paintInitialTeaser(row),{once:true});
      return;
    }
    const allowed=new Set([...(Array.isArray(row.image_paths)?row.image_paths:[]),row.image_path]);
    const paths=(Array.isArray(row.cover_paths)?row.cover_paths:[]).filter(p=>typeof p==='string'&&allowed.has(p)).slice(0,3);
    const cover=initialCover;
    if(!paths.length||!cover||JSON.stringify(cover.paths)!==JSON.stringify(paths))return;
    const make=(tag,parent,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;parent.appendChild(el);return el;};
    const card=document.createElement('article');card.className='home-news-card';
    const labels={news:'خبر عائلي',occasion:'مناسبة',announcement:'إعلان عائلي'};
    make('span',card,Object.hasOwn(labels,row.category)?labels[row.category]:'آخر الأخبار').className='home-news-label';
    make('h3',card,row.title);
    const date=new Date(row.created_at);
    let displayDate='غير متاح';
    if(row.created_at&&Number.isFinite(date.getTime()))try{displayDate=new Intl.DateTimeFormat('ar-PS',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Gaza'}).format(date)+' — توقيت غزة';}catch{}
    make('time',card,displayDate).className='news-date';
    const gallery=make('div',card);gallery.className='news-gallery news-cover';gallery.dataset.count=String(paths.length);
    const items=paths.map((path,i)=>{
      const a=make('button',gallery);a.type='button';a.className='news-gallery-item';a.disabled=true;
      a.setAttribute('aria-label','عرض الصورة '+(i+1));
      const im=make('img',a);im.alt=row.title+' — صورة '+(i+1);im.loading=i===0?'eager':'lazy';im.fetchPriority=i===0?'high':'low';im.decoding='async';im.referrerPolicy='no-referrer';
      return {a,im};
    });
    if(paths.length>1)make('p',card,'اسحب لمشاهدة الصور • '+paths.length+' صور').className='gallery-hint';
    const excerpt=row.body.split('\n').filter(x=>x.trim()&&!x.startsWith('بسم')&&!x.startsWith('﴿'))[0]||row.body;
    const summary=make('p',card,excerpt.slice(0,260));
    const read=make('a',card,'قراءة الخبر');read.href='#news/'+row.id;read.className='btn btn-gold';
    target.replaceChildren(card);
    initialTeaser={row,card,gallery,items,summary,paths};
    cover.pending.then(signed=>{
      if(!signed||!card.isConnected||gallery.hidden||lowData()||(location.hash!==''&&location.hash!=='#home'))return;
      items.forEach(({im},i)=>{if(signed[i]&&im.isConnected&&im.src!==signed[i])im.src=signed[i];});
    });
  }
  function takeInitialTeaser(row){
    const teaser=initialTeaser;initialTeaser=null;
    return teaser&&teaser.row===row&&teaser.card.isConnected?teaser:null;
  }
  initialNews?.then(rows=>{if(rows?.length)paintInitialTeaser(rows[0]);}).catch(()=>{});
  function takeInitialNews(){initialConsumed=true;const pending=initialNews;initialNews=null;return pending;}
  window.familyRuntime=Object.freeze({lowData,online:()=>navigator.onLine!==false,takeInitialNews,takeInitialCover,takeInitialTeaser});
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
