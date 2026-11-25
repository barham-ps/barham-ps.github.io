/* Admin-only editor. RLS is the authoritative permission boundary. */
window.mountMemorialAdmin=function(host,client,autoOpen=false){
 const el=(t,p,s)=>{const n=document.createElement(t);if(s!==undefined)n.textContent=s;p.append(n);return n;};
 const root=el('details',host);root.className='card dashboard-record memorial-admin';el('summary',root,'إدارة سجل الشهداء والصور');
 root.open=autoOpen;
 const panel=el('div',root);panel.className='dashboard-record-body';const status=el('p',panel);status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const search=el('input',panel);search.type='search';search.placeholder='بحث بالاسم';search.setAttribute('aria-label','بحث بالاسم');
 const list=el('div',panel);list.className='memorial-admin-list';const form=el('form',panel);form.className='card';form.hidden=true;
 const fields={};
 function field(key,label,max,t='text'){const l=el('label',form,label);l.className='f';const n=el(t==='textarea'?'textarea':'input',l);if(t!=='textarea')n.type=t;if(max)n.maxLength=max;fields[key]=n;return n;}
 const rl=el('label',form,'المنطقة');rl.className='f';const region=el('select',rl);fields.region=region;
 for(const [v,t] of [['gaza','غزة'],['westbank','الضفة الغربية']]){const o=el('option',region,t);o.value=v;}
 field('full_name','الاسم الكامل',200).required=true;field('date_label','تاريخ الاستشهاد',120);field('place','المكان',250);field('age_label','العمر',120);field('narrative','النبذة',5000,'textarea');field('sources','المصادر المنشورة',3000,'textarea');field('featured_caption','عبارة التمييز',160);
 const order=field('sort_order','ترتيب السجل',0,'number');order.min=0;order.max=100000;order.step=1;order.required=true;
 const pub=el('input',el('label',form,' نشر السجل للعامة '));pub.type='checkbox';
 const save=el('button',form,'حفظ السجل');save.type='submit';save.className='btn btn-gold';
 const photos=el('div',panel);photos.className='memorial-admin-gallery';photos.hidden=true;
 let items=[],current=null,busy=false,epoch=0;
 async function auth(){const r=await client().rpc('family_is_admin');if(r.error||r.data!==true||!root.isConnected)throw Error('صلاحية الإدارة غير متاحة.');}
 const check=r=>{if(r.error)throw Error('تعذرت العملية. تحقق من صلاحية الإدارة وإعداد قاعدة البيانات.');return r.data;};
 function button(p,t,fn){const b=el('button',p,t);b.type='button';b.className='btn btn-dark';b.onclick=()=>{if(!busy)run(fn);};return b;}
 async function run(fn){if(busy)return;busy=true;try{await auth();await fn();}catch(e){if(root.isConnected)status.textContent=e.message||'تعذرت العملية.';}finally{busy=false;}}
 function render(){list.replaceChildren();for(const row of items.filter(x=>x.full_name.includes(search.value.trim()))){button(list,row.full_name+' — '+(row.published?'منشور':'مسودة'),()=>edit(row));}}
 async function load(){items=check(await client().from('family_martyrs').select('*').order('sort_order').order('id'));if(root.isConnected){render();form.hidden=false;}}
 async function edit(row){current=row;epoch++;for(const [k,n] of Object.entries(fields))n.value=row?.[k]??(k==='region'?'gaza':k==='sort_order'?100:'');pub.checked=!!row?.published;status.textContent=row?'تعديل: '+row.full_name:'إضافة سجل';form.hidden=false;await gallery();}
 button(panel,'إضافة شهيد جديد',()=>edit(null));search.oninput=render;
 root.addEventListener('toggle',()=>{if(root.open&&!items.length)run(async()=>{await load();await edit(null);});});
 if(autoOpen)run(async()=>{await load();await edit(null);});
 form.onsubmit=e=>{e.preventDefault();run(async()=>{const p={};for(const [k,n] of Object.entries(fields))p[k]=k==='sort_order'?Number(n.value):n.value.trim();p.published=pub.checked;if(!p.full_name)throw Error('أدخل الاسم.');if(!confirm('تأكيد حفظ السجل وحالة النشر؟'))return;const t=client().from('family_martyrs');const result=check(await(current?t.update(p).eq('id',current.id):t.insert(p)).select('id').single());await load();await edit(items.find(x=>x.id===result.id));status.textContent='تم الحفظ.';});};
 async function gallery(){
  const token=epoch,id=current?.id;photos.replaceChildren();photos.hidden=!id;if(!id)return;
  const table=()=>client().from('family_martyr_photos'),bucket=()=>client().storage.from('family-martyr-photos');
  const data=check(await table().select('*').eq('martyr_id',id).order('position'));if(token!==epoch||!root.isConnected)return;
  el('h3',photos,'معرض الصور — '+data.length+' / 30');
  el('p',photos,'الصورة المنشورة ذات الترتيب الأصغر تظهر أولاً في المعرض. JPEG / PNG / WebP، حتى 5 ميجابايت للصورة. الصور الجديدة مخفية حتى اعتمادها.');
  const picker=el('input',photos);picker.type='file';picker.multiple=true;picker.accept='image/jpeg,image/png,image/webp';picker.setAttribute('aria-label','اختيار صور الشهيد');
  button(photos,'رفع الصور المختارة',async()=>{
   const files=[...picker.files],free=Array.from({length:30},(_,i)=>i+1).filter(i=>!data.some(p=>p.position===i));
   if(!files.length||files.length>free.length)throw Error('اختر عددًا ضمن المساحة المتبقية.');
   const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
   if(files.some(f=>!types[f.type]||f.size>5242880||!f.size))throw Error('بعض الصور غير مدعومة أو تتجاوز 5 ميجابايت.');
   if(!confirm('رفع '+files.length+' صورة كمسودات؟'))return;
   let count=0;try{for(let i=0;i<files.length;i++){if(!root.isConnected)throw Error('انتهت جلسة التحرير.');status.textContent='رفع الصور: '+(i+1)+' / '+files.length;const f=files[i],path=id+'/'+crypto.randomUUID()+'.'+types[f.type];check(await bucket().upload(path,f,{contentType:f.type,upsert:false}));const r=await table().insert({martyr_id:id,position:free[i],object_path:path});if(r.error){await bucket().remove([path]);throw Error('توقف الرفع بعد '+count+' صورة.');}count++;}}finally{await gallery();}status.textContent='تم رفع '+count+' صورة.';
  });
  const pending=data.filter(p=>!p.published);
  if(pending.length)button(photos,'نشر جميع الصور المخفية ('+pending.length+')',async()=>{if(!confirm('هل توافق على نشر جميع الصور المخفية لهذا السجل؟'))return;const changed=check(await table().update({published:true}).eq('martyr_id',id).in('id',pending.map(p=>p.id)).select('id'));if(changed.length!==pending.length)throw Error('لم تُنشر جميع الصور. حدّث المعرض وحاول مجددًا.');await gallery();status.textContent='تم نشر الصور.';});
  const grid=el('div',photos);grid.className='memorial-admin-grid';
  const signedBatch=data.length?await bucket().createSignedUrls(data.map(p=>p.object_path),300):{data:[]};
  for(const p of data){const card=el('article',grid);card.className='card';el('strong',card,'الصورة '+p.position+(p.published?' — منشورة':' — مخفية'));
   const url=signedBatch.data?.find(x=>x.path===p.object_path)?.signedUrl;if(url&&token===epoch&&root.isConnected){const im=el('img',card);im.src=url;im.alt=p.caption||'معاينة الصورة';im.loading='lazy';im.width=160;}
   const label=el('label',card,'وصف الصورة');const cap=el('input',label);cap.maxLength=250;cap.value=p.caption;
   const pos=el('input',el('label',card,'الترتيب (خانة فارغة)'));pos.type='number';pos.min=1;pos.max=30;pos.step=1;pos.value=p.position;
   const publish=el('input',el('label',card,' نشر الصورة '));publish.type='checkbox';publish.checked=p.published;
   button(card,'حفظ الصورة',async()=>{if(!Number.isInteger(+pos.value)||+pos.value<1||+pos.value>30)throw Error('الترتيب من 1 إلى 30.');if(data.some(x=>x.id!==p.id&&x.position===+pos.value))throw Error('الترتيب مستخدم؛ اختر خانة فارغة.');if(!confirm('تأكيد تعديل الصورة وحالة النشر؟'))return;check(await table().update({caption:cap.value.trim(),position:+pos.value,published:publish.checked}).eq('id',p.id).select('id').single());await gallery();});
   button(card,'حذف الصورة',async()=>{if(!confirm('حذف الصورة نهائيًا؟'))return;check(await table().update({published:false}).eq('id',p.id).select('id').single());check(await bucket().remove([p.object_path]));check(await table().delete().eq('id',p.id).select('id').single());await gallery();});
  }
 }
};
