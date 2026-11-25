(function(){
  'use strict';
  // Calendar labels follow Gaza civil time even for visitors abroad.
  function footerDateParts(now){
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Gaza',year:'numeric',month:'long'}).formatToParts(now);
    const year=parts.find(p=>p.type==='year').value;
    const month=parts.find(p=>p.type==='month').value;
    const monthNumber=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Gaza',month:'2-digit'}).format(now);
    return {year,month,iso:year+'-'+monthNumber};
  }
  function updateFooterDate(){
    const date=footerDateParts(new Date());
    document.querySelectorAll('[data-footer-year]').forEach(el=>{el.textContent=date.year;});
    const month=document.getElementById('footer-month');
    if(month){month.textContent=date.month;month.dateTime=date.iso;}
  }
  updateFooterDate();
  setInterval(updateFooterDate,30000);
  window.addEventListener('pageshow',updateFooterDate);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateFooterDate();});
})();

/* Shared appearance: presentation preference only; no account information is stored. */
(function(){
  'use strict';
  const button=document.querySelector('[data-family-theme]');
  if(!button)return;
  const root=document.documentElement;
  const key='barham-appearance-v1';
  let choice=null;
  try{const saved=localStorage.getItem(key);if(saved==='light'||saved==='dark')choice=saved;}catch(_){}
  function apply(){
    const theme=choice||'dark'; // Original emerald appearance is the default.
    root.dataset.theme=theme;
    button.setAttribute('aria-pressed',String(theme==='dark'));
    const next=theme==='dark'?'نهاري':'ليلي';
    button.querySelector('[data-theme-label]').textContent=next;
    button.querySelector('[data-theme-icon]').textContent=theme==='dark'?'☀':'☾';
    button.setAttribute('aria-label','الوضع '+next);
    button.title='الوضع '+next;
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.content=theme==='dark'?(document.querySelector('.mem-top')?'#0b101c':'#03251c'):'#f7f5ed';
  }
  button.addEventListener('click',()=>{
    choice=root.dataset.theme==='dark'?'light':'dark';
    try{localStorage.setItem(key,choice);}catch(_){}
    apply();
  });
  window.addEventListener('storage',event=>{
    if(event.key!==key&&event.key!==null)return;
    choice=event.newValue==='light'||event.newValue==='dark'?event.newValue:null;
    apply();
  });
  apply();
  button.hidden=false;
  button.disabled=false;
})();
