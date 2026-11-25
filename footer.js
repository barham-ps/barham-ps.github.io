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
