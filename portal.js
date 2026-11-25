(function() {
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
  document.documentElement.setAttribute('dir', 'rtl');
  document.documentElement.setAttribute('lang', 'ar');
  var NAV = [
    ['home', 'الرئيسية'],
    ['news', 'الأخبار'],
    ['heritage', 'العائلة والتراث'],
    ['community', 'المجتمع العائلي'],
    ['membership', 'العضوية والتحقق']
  ];
  var FEAT = [
    ['heritage','landmark','العائلة والتراث','التاريخ والشجرة والأرشيف'],
    ['news','news','أخبار العائلة','الأخبار والإعلانات والتهاني'],
    ['community','heart','المجتمع العائلي','المبادرات والتواصل'],
    ['membership','shield','العضوية','الانضمام والتحقق من الشهادات']
  ];
  var SERV = [
    ['الهوية والملف', 'البطاقة الرقمية والشهادة والملف الشخصي.'],
    ['العائلة والكفاءات', 'سجل القرابات ودليل المهن الاختياري.'],
    ['الإشعارات والمحتوى', 'الرسائل الخاصة والأرشيف والمناسبات المنشورة.'],
    ['الطلبات والتكافل', 'المبادرات والمقترحات وطلبات التكافل الخاصة.']
  ];
  var $ = function(s, r) {
    return (r || document).querySelector(s)
  };
  var nav = $('#nav');
  var skip = $('.skip-link');
  if (skip) skip.addEventListener('click', e => {
    e.preventDefault();
    var main = $('#main-content');
    if (main) {
      main.focus();
      main.scrollIntoView({
        block: 'start'
      });
    }
  });
  nav.innerHTML = NAV.map(function(n) {
    return '<a href="#' + n[0] + '" data-r="' + n[0] + '">' + n[1] + '</a>'
  }).join('');

  $('#features').innerHTML = FEAT.map(function(f) {
    return '<a class="card" href="#' + f[0] + '"><div class="ic"><svg width="26" height="26"><use href="#i-' + f[
      1] + '"/></svg></div><h3>' + f[2] + '</h3><p>' + f[3] + '</p><span class="more">استكشف القسم ←</span></a>'
  }).join('');
  if ($('#services')) $('#services').innerHTML = SERV.map(function(s, i) {
    return '<div class="card"><span class="chip c-ok">للأعضاء المعتمدين</span><h3>' + s[0] + '</h3><p>' + s[1] +
      '</p></div>'
  }).join('');

  var h = new Date().getHours(),
    g = document.getElementById('greet');
  g.textContent = (h >= 5 && h < 12 ? 'صباح الخير' : h >= 12 && h < 17 ? 'نهارك سعيد' : h >= 17 && h < 21 ?
    'مساء الخير' : 'ليلتك سعيدة') + '، أهلًا بك في بيتنا';
  var views = [].slice.call(document.querySelectorAll('.view'));
  var hdr = $('#hdr'),
    btn = $('#menuBtn');

  const publicHomeTitle=document.title;
  function route() {
    var r = (location.hash || '#home').slice(1) || 'home';
    if (r.startsWith('verify/')) r = 'verify';
    if (r.startsWith('news/')) r = 'news';
    var el = document.getElementById('v-' + r) || document.getElementById('v-notfound');
    views.forEach(function(v) {
      v.hidden = v !== el
    });
    document.title = r==='home' ? publicHomeTitle : (el.dataset.title ? el.dataset.title + ' | ' : '') + 'آل برهم';
    [].forEach.call(nav.children, function(a) {
      if (a.dataset.r === r || (a.dataset.r === 'news' && r === 'events') || (a.dataset.r === 'heritage' && ['history', 'archive', 'tree', 'stories'].includes(
          r)) || (a.dataset.r === 'community' && ['initiatives', 'contact'].includes(r)) || (a.dataset
          .r === 'membership' && ['verify', 'certificate', 'card', 'verify-demo'].includes(r))) a.setAttribute(
        'aria-current', 'page');
      else a.removeAttribute('aria-current')
    });
    hdr.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    window.scrollTo({
      top: 0,
      behavior: 'instant'
    });
  }
  // Explicit entry via query string works even in browsers that strip URL fragments.
  var requestedPage = new URLSearchParams(location.search).get('page');
  if (['register', 'certificate', 'login', 'account', 'admin', 'member-hub', 'member-services-admin', 'reset',
      'news-admin', 'mfa', 'security'
    ].includes(requestedPage) && !/access_token=|error=|code=/.test(location.hash)) {
    var entry = new URL(location.href);
    entry.searchParams.delete('page');
    entry.hash = requestedPage;
    history.replaceState(null, '', entry.toString());
  }
  window.addEventListener('hashchange', route);
  route();
  btn.addEventListener('click', function() {
    var o = hdr.classList.toggle('open');
    btn.setAttribute('aria-expanded', o)
  });

  var same = $('#r-same');

  function syncWa() {
    $('#r-wa').disabled = same.checked;
    $('#r-wcc').disabled = same.checked;
  }
  same.addEventListener('change', syncWa);
  syncWa();

  function show(id, t, err) {
    var m = $(id);
    m.hidden = false;
    m.className = 'msg' + (err ? ' err' : '');
    m.textContent = t;
  }
  var authClient;

  function client() {
    if (!window.supabase) throw Error('تعذر تحميل مكتبة الاتصال؛ افتح الموقع في متصفح Chrome');
    return authClient || (authClient = window.supabase.createClient('https://vfxxghfmkmgdqrczeowx.supabase.co',
      'sb_publishable_-LW-iVjvk4hmvdzcR9jgYw_my4buOkw', {
        auth: {
          experimental: {passkey: window.FAMILY_SECURITY_CONFIG?.passkeysEnabled === true},
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }));
  }

  function phone(cc, v) {
    v = v.trim().replace(/[٠-٩]/g, x => String('٠١٢٣٤٥٦٧٨٩'.indexOf(x))).replace(/[\s()-]/g, '');
    if (v.startsWith('00')) v = '+' + v.slice(2);
    return v.startsWith('+') ? v : cc + v.replace(/^0+/, '');
  }
  function formatPortalTime(value){
    const d=new Date(value);if(!value||!Number.isFinite(d.getTime()))return 'غير متاح';
    return new Intl.DateTimeFormat('ar-PS',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Gaza'}).format(d)+' — توقيت غزة';
  }
  var statusLabels = {
    pending_email: 'بانتظار تأكيد البريد',
    under_review: 'قيد المراجعة',
    more_info: 'مطلوب استكمال معلومات',
    approved: 'معتمدة',
    rejected: 'مرفوضة',
    suspended: 'موقوفة',
    revoked: 'ملغاة'
  };
  var panel = document.createElement('section');
  panel.className = 'view';
  panel.id = 'v-account';
  panel.hidden = true;
  panel.dataset.title = 'حسابي';
  panel.innerHTML =
    '<div class="wrap sec"><h1>حسابي</h1><p id="account-status" role="status"></p><form id="completeForm" hidden><h2>استكمال طلب العضوية</h2><label class="f">الاسم الكامل<input id="c-name" required maxlength="200"></label><label class="f">الهاتف مع رمز الدولة<input id="c-phone" placeholder="+970..." required></label><label class="f">واتساب مع رمز الدولة<input id="c-wa" placeholder="+970..." required></label><label><input type="checkbox" id="c-ok" required> أوافق على حفظ بيانات طلبي وفق سياسة الخصوصية.</label><button class="btn" type="submit">إرسال طلب العضوية</button></form><p id="account-note"></p><button class="btn" id="logout" type="button">تسجيل الخروج</button></div>';
  document.querySelector('main').appendChild(panel);
  views.push(panel);
  async function account() {
    var session = await client().auth.getSession();
    if (session.error) {
      $('#account-status').textContent = 'تعذر استعادة الجلسة. تحقق من الاتصال ثم أعد المحاولة.';
      return;
    }
    if (!session.data.session) {
      location.hash = 'login';
      return;
    }
    var s = await client().auth.getUser();
    if (s.error || !s.data.user) {
      $('#account-status').textContent = 'تعذر التحقق من الحساب الآن. أعد المحاولة عند استقرار الاتصال.';
      return;
    }
    var u = s.data.user;
    $('#member-welcome').textContent = 'أهلًا بك، ' + (u.user_metadata?.full_name || u.email);
    $('#member-email').textContent = u.email;
    const adminCheck=client().rpc('family_is_admin');
    Promise.resolve(adminCheck).then(adm=>{if(location.hash==='#account'&&recoveredSession?.user.id===u.id)adminShortcut.hidden=adm.error||adm.data!==true;}).catch(()=>{});
    var q = await client().from('member_applications').select('full_name,status,membership_number,submitted_at').eq(
      'auth_user_id', u.id).maybeSingle();
    if(location.hash!=='#account'||recoveredSession?.user.id!==u.id)return;
    if (q.error) {
      $('#account-status').textContent = 'تعذر قراءة حالة الطلب.';
      return;
    }
    $('#account-status').textContent = q.data ? 'حالة العضوية: ' + (statusLabels[q.data.status] || 'قيد المراجعة') +
      (q.data.membership_number ? ' | رقم العضوية: ' + q.data.membership_number : '') :
      'أكمل طلب عضويتك بعد تأكيد البريد.';
    $('#completeForm').hidden = !!q.data;
    $('#member-number').textContent = q.data?.membership_number || 'لم يصدر بعد';
    $('#member-certificate').hidden = q.data?.status !== 'approved';
    hubLink.hidden = q.data?.status !== 'approved';
    memberQuick.hidden = q.data?.status !== 'approved';
    if(q.data?.full_name)$('#member-welcome').textContent='أهلًا بك، '+q.data.full_name;
    if (q.data?.status === 'approved') {
      hubLink.textContent='فتح خدماتي';
      Promise.resolve(client().from('family_member_notices').select('id',{count:'exact',head:true}).eq('user_id',u.id).is('read_at',null)).then(notice=>{if(location.hash==='#account'&&recoveredSession?.user.id===u.id)hubLink.textContent='فتح خدماتي'+(!notice.error&&notice.count?' ('+notice.count+' جديد)':'');}).catch(()=>{});
    }
    var m = u.user_metadata || {};
    $('#c-name').value = m.full_name || '';
    $('#c-phone').value = m.phone || '';
    $('#c-wa').value = m.whatsapp || '';
  }
  async function submitApplication(name, p, w) {
    var z = await client().rpc('submit_family_application', {
      p_name: name,
      p_phone: p,
      p_whatsapp: w,
      p_consent: true
    });
    if (z.error) throw Error('تعذر تقديم الطلب. تحقق من تأكيد البريد وصحة الأرقام.');
  }

  function validNewPassword(value) {
    const length = Array.from(value).length;
    return length >= 15 && length <= 128;
  }

  // Only the first five SHA-1 hex characters leave this browser, and only on submission.
  async function passwordLeakState(password, fetcher = fetch, cryptoApi = crypto) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const digest = await cryptoApi.subtle.digest('SHA-1', new TextEncoder().encode(password));
      const hash = Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2,'0')).join('').toUpperCase();
      const response = await fetcher('https://api.pwnedpasswords.com/range/' + hash.slice(0,5), {
        headers: {'Add-Padding':'true'}, credentials:'omit', cache:'no-store', referrerPolicy:'no-referrer', signal:controller.signal
      });
      if (!response.ok) return 'unavailable';
      const lines = (await response.text()).trim().split(/\r?\n/);
      if (!lines.length || !lines.every(x => /^[A-F0-9]{35}:\d+$/i.test(x))) return 'unavailable';
      return lines.some(x => x.slice(0,35).toUpperCase() === hash.slice(5) && Number(x.slice(36)) > 0) ? 'leaked' : 'not-found';
    } catch (_) { return 'unavailable'; }
    finally { clearTimeout(timer); }
  }

  async function requirePasswordScreen(password) {
    const result = await passwordLeakState(password);
    if (result === 'leaked') return 'كلمة المرور ظهرت في تسريبات سابقة. اختر كلمة مرور مختلفة.';
    if (result === 'unavailable') return 'تعذر فحص كلمة المرور المسربة. تحقق من الاتصال ثم أعد المحاولة.';
    return '';
  }

  for (const form of [$('#regForm')]) {
    make('p', form, 'تُفحص كلمة المرور الجديدة عند الإرسال عبر HIBP باستخدام خمسة محارف من بصمتها فقط؛ لا تُرسل كلمة المرور أو بصمتها الكاملة للخدمة.');
  }

  function authError(err) {
    var code = err.code || err.error_code || '';
    var messages = {
      email_address_not_authorized: 'خدمة البريد الحالية لا تسمح بهذا العنوان. يجب تفعيل SMTP في Supabase.',
      over_email_send_rate_limit: 'تم تجاوز حد إرسال رسائل التأكيد. حاول لاحقًا.',
      signup_disabled: 'إنشاء الحسابات معطل في إعدادات Supabase.',
      email_provider_disabled: 'مزود البريد غير مفعّل.',
      weak_password: 'كلمة المرور لا تحقق شروط الأمان.',
      email_exists: 'استلمت خدمة التسجيل الطلب. تحقق من صندوق البريد والرسائل غير المرغوب فيها، ثم سجل الدخول.',
      user_already_exists: 'استلمت خدمة التسجيل الطلب. تحقق من صندوق البريد والرسائل غير المرغوب فيها، ثم سجل الدخول.',
      captcha_failed: 'يلزم التحقق الأمني قبل التسجيل.',
      validation_failed: 'تحقق من صحة البريد والبيانات.'
    };
    return Object.prototype.hasOwnProperty.call(messages, code) ? messages[code] :
      'تعذر التسجيل. تحقق من الاتصال بالإنترنت وخدمة المصادقة.';
  }
  $('#regForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    var b = this.querySelector('button[type=submit]');
    if (b.disabled) return;
    var name = $('#r-name').value.trim(),
      email = $('#r-mail').value.trim(),
      pw = $('#r-pw').value,
      p = phone($('#r-cc').value, $('#r-phone').value),
      w = same.checked ? p : phone($('#r-wcc').value, $('#r-wa').value);
    if (name.length < 4 || name.length > 200) return show('#r-msg', 'أدخل الاسم الكامل.', 1);
    if (!/^\+[0-9]{7,15}$/.test(p)) return show('#r-msg', 'أدخل رقم الهاتف الصحيح واختر مفتاح الدولة.', 1);
    if (!/^\+[0-9]{7,15}$/.test(w)) return show('#r-msg', 'تحقق من رقم واتساب.', 1);
    if (!/^\S+@\S+\.\S+$/.test(email)) return show('#r-msg', 'أدخل بريدًا إلكترونيًا صحيحًا.', 1);
    if (!validNewPassword(pw)) return show('#r-msg', 'اختر كلمة مرور من ١٥ إلى ١٢٨ حرفًا.', 1);
    if (pw !== $('#r-pw2').value) return show('#r-msg', 'كلمتا المرور غير متطابقتين.', 1);
    if (!$('#r-ok').checked) return show('#r-msg', 'وافق على سياسة الخصوصية أولًا.', 1);
    b.disabled = true;
    show('#r-msg', 'جارٍ الاتصال بخدمة التسجيل...', 0);
    try {
      const leakMessage = await requirePasswordScreen(pw);
      if (leakMessage) return show('#r-msg', leakMessage, 1);
      if (window.familyCaptcha.enabled) {
        const captchaToken = await window.familyCaptcha.token(this);
        const signup = await client().auth.signUp({email, password: pw, options: {emailRedirectTo: location.origin + location.pathname, data: {full_name: name, phone: p, whatsapp: w}, captchaToken}});
        if (signup.error) return show('#r-msg', authError(signup.error), 1);
        if (signup.data.session) { location.hash = 'account'; await account(); return; }
        show('#r-msg', 'استلمت خدمة التسجيل الطلب. تحقق من صندوق البريد والرسائل غير المرغوب فيها، ثم سجل الدخول.', 0);
        this.reset(); syncWa(); return;
      }
      var endpoint = 'https://vfxxghfmkmgdqrczeowx.supabase.co/auth/v1/signup?redirect_to=' +
        encodeURIComponent(location.origin + location.pathname);
      var response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'sb_publishable_-LW-iVjvk4hmvdzcR9jgYw_my4buOkw'
        },
        body: JSON.stringify({
          email: email,
          password: pw,
          data: {
            full_name: name,
            phone: p,
            whatsapp: w
          }
        })
      });
      var data = await response.json();
      if (!response.ok) {
        const duplicate = ['email_exists', 'user_already_exists'].includes(data.code || data.error_code);
        return show('#r-msg', authError(data), duplicate ? 0 : 1);
      }
      if (data.access_token && data.refresh_token && window.supabase) {
        var sess = await client().auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });
        if (!sess.error) {
          location.hash = 'account';
          await account();
          return;
        }
      }
      show('#r-msg',
        'استلمت خدمة التسجيل الطلب. تحقق من صندوق البريد والرسائل غير المرغوب فيها، ثم سجل الدخول.', 0);
      this.reset();
      syncWa();
    } catch (err) {
      show('#r-msg', 'تعذر الوصول إلى خادم التسجيل. تحقق من الإنترنت ثم أعد المحاولة.', 1);
    } finally {
      window.familyCaptcha.reset(this);
      b.disabled = false;
    }
  });
  $('#logForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    var b = this.querySelector('button[type=submit]');
    if (b.disabled) return;
    b.disabled = true;
    try {
      var z = await client().auth.signInWithPassword({
        email: $('#l-mail').value.trim(),
        password: $('#l-pw').value,
        options: {captchaToken: await window.familyCaptcha.token(this)}
      });
      if (z.error) throw Error('تعذر الدخول. تأكد من البريد وكلمة المرور وتأكيد البريد الإلكتروني.');
      var next = sessionStorage.getItem('family_after_login');
      sessionStorage.removeItem('family_after_login');
      location.hash = ['certificate', 'admin', 'member-hub', 'member-services-admin', 'news-admin', 'mfa',
        'security'
      ].includes(next) ? next : 'account';
    } catch (err) {
      show('#l-msg', 'تعذر الدخول. تحقق من البيانات والاتصال وتأكيد البريد الإلكتروني.', 1);
    } finally {
      $('#l-pw').value = '';
      window.familyCaptcha.reset(this);
      b.disabled = false;
    }
  });
  $('#completeForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    var b = this.querySelector('button');
    b.disabled = true;
    try {
      await submitApplication($('#c-name').value.trim(), $('#c-phone').value.trim(), $('#c-wa').value.trim());
      $('#account-note').textContent = 'تم إرسال طلب العضوية للمراجعة.';
      await account();
    } catch (err) {
      $('#account-note').textContent = err.message;
    } finally {
      b.disabled = false;
    }
  });
  $('#logout').addEventListener('click', async function() {
    if (!confirm('هل تريد تسجيل الخروج من هذا الجهاز؟')) return;
    var z = await client().auth.signOut({
      scope: 'local'
    });
    if (z.error) {
      alert('تعذر تسجيل الخروج. حاول مجددًا.');
      return;
    }
    location.hash = 'home';
  });

  function make(tag, parent, t) {
    var e = document.createElement(tag);
    if (t !== undefined) e.textContent = t;
    parent.appendChild(e);
    return e;
  }

  function action(parent, label, fn) {
    var b = make('button', parent, label);
    b.className = 'btn btn-dark sm';
    b.type = 'button';
    b.onclick = fn;
    return b;
  }

  function newView(id, title) {
    var s = document.createElement('section');
    s.className = 'view';
    s.id = 'v-' + id;
    s.dataset.title = title;
    s.hidden = true;
    var c = make('div', s);
    c.className = 'wrap sec';
    make('h1', c, title);
    document.querySelector('main').appendChild(s);
    views.push(s);
    return c;
  }
  var admin = newView('admin', 'مركز إدارة العائلة'),
    adminMsg = make('p', admin),
    adminRows = make('div', admin);
  var adminRefresh=action(admin,'تحديث بيانات العضويات',()=>guardPrivate(loadAdmin));
  adminRefresh.hidden=true;
  adminRows.className = 'admin-members';
  var adminNavigation=make('div',admin);adminNavigation.className='dashboard-grid admin-navigation';adminNavigation.hidden=true;
  admin.insertBefore(adminNavigation,adminMsg);
  adminMsg.setAttribute('role','status');
  var activeAdminPanel='overview';
  var adminDirectory=make('div',admin);adminDirectory.className='card member-directory';adminDirectory.hidden=true;
  var directoryEpoch=0;
  var adminReports=make('div',admin);adminReports.className='card';adminReports.hidden=true;
  var adminIntro=make('p',admin,'اختر القسم المطلوب لإدارة شؤون العائلة.');adminIntro.hidden=true;

  var cms = make('div', admin); cms.className='card'; cms.hidden=true;
  var sectionsCMS={history:'تاريخ العائلة',tree:'شجرة العائلة',archive:'الأرشيف والحكايات'};
  async function renderPublicCMS(){
    const requested=location.hash.slice(1);
    for(const [key,label] of Object.entries(sectionsCMS)){
      if(key!==requested)continue;
      const host=document.querySelector('#v-'+key+' .sec .wrap'); if(!host) continue;
      let panel=host.querySelector('.public-cms'); if(!panel){panel=make('div',host);panel.className='public-cms grid';}
      const q=await client().from('family_public_content').select('id,title,body,image_path,created_at').eq('section',key).eq('published',true).order('created_at',{ascending:false});
      if(q.error){if(!panel.childElementCount){const note=make('p',panel,'تعذر تحميل المحتوى المنشور.');note.className='portal-loading';action(panel,'إعادة المحاولة',()=>{panel.replaceChildren();renderPublicCMS().catch(()=>{});});}continue;}panel.replaceChildren();
      for(const item of q.data){const card=make('article',panel);card.className='card';make('h3',card,item.title);const p=make('p',card,item.body);p.style.whiteSpace='pre-wrap';if(item.created_at)make('time',card,formatPortalTime(item.created_at)).dateTime=item.created_at;
        if(item.image_path){const signed=await client().storage.from('family-public-content').createSignedUrl(item.image_path,300);if(!signed.error){const im=make('img',card);im.src=signed.data.signedUrl;im.alt=item.title;im.loading='lazy';im.style.maxWidth='100%';}}
      }
    }
  }
  async function loadPublicCMS(){
    cms.hidden=true;cms.replaceChildren();
    const auth=await client().rpc('family_is_admin');if(auth.error||auth.data!==true)return;
    cms.hidden=activeAdminPanel!=='content';make('h2',cms,'إدارة المحتوى');
    const contentLinks=make('div',cms);contentLinks.className='row dashboard-content-links';
    dashboardLink(contentLinks,'#news-admin','الأخبار والإعلانات','تحرير ونشر الأخبار','news');
    const privateLink=dashboardLink(contentLinks,'#member-services-admin','الأرشيف والمناسبات الخاصة','مواد مخصصة للأعضاء','archive');privateLink.dataset.adminService='content';
    make('p',cms,'لا تنشر بيانات أو صورًا شخصية دون موافقة أصحابها.');
    const msg=make('p',cms);msg.setAttribute('role','status');const sectionLabel=make('label',cms,'القسم المراد تحريره');sectionLabel.className='f';const section=make('select',sectionLabel);
    for(const [key,label] of Object.entries(sectionsCMS)){const o=make('option',section,label);o.value=key;}
    const title=field(cms,'عنوان المحتوى','cms-title','text',200);
    const body=field(cms,'النص','cms-body','textarea',30000);
    const file=field(cms,'إضافة صورة (اختياري)','cms-file','file');file.accept='image/jpeg,image/png,image/webp';
    const label=make('label',cms,' نشر للعامة ');const pub=make('input',label);pub.type='checkbox';
    let current=null;
    action(cms,'حفظ المحتوى / المسودة',async function(){
      if(!title.value.trim()){msg.textContent='أدخل العنوان';return;}
      if(pub.checked&&!confirm('تأكيد النشر العام؟'))return;
      this.disabled=true;let uploaded=null;
      try{
        if(file.files[0]){const f=file.files[0];const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[f.type];if(!ext||f.size>5242880)throw Error('صورة غير مدعومة أو أكبر من 5 ميجابايت');uploaded=crypto.randomUUID()+'.'+ext;const u=await client().storage.from('family-public-content').upload(uploaded,f);if(u.error){uploaded=null;throw u.error;}}
        const row={section:section.value,title:title.value.trim(),body:body.value,published:pub.checked,image_path:uploaded||current?.image_path||null};
        const q=await (current?client().from('family_public_content').update(row).eq('id',current.id):client().from('family_public_content').insert(row)).select('id').single();if(q.error)throw q.error;
        if(uploaded&&current?.image_path)await client().storage.from('family-public-content').remove([current.image_path]);
        await loadPublicCMS();await renderPublicCMS();
      }catch(e){if(uploaded)await client().storage.from('family-public-content').remove([uploaded]);msg.textContent='تعذر الحفظ: '+e.message;}finally{this.disabled=false;}
    });
    action(cms,'محتوى جديد',()=>loadPublicCMS());
    const q=await client().from('family_public_content').select('*').order('created_at',{ascending:false});if(q.error){msg.textContent='تعذر تحميل المحتوى';return;}
    make('h3',cms,'المواد المحفوظة');const cmsRecords=[];
    for(const item of q.data){const record=make('details',cms);record.className='card dashboard-record';make('summary',record,sectionsCMS[item.section]+' — '+item.title+' — '+(item.published?'منشور':'مسودة'));const c=make('div',record);c.className='dashboard-record-body';cmsRecords.push({el:record,text:[sectionsCMS[item.section],item.title,item.body,item.published?'منشور':'مسودة'].join(' ')});
      action(c,'تعديل',()=>{current=item;section.value=item.section;title.value=item.title;body.value=item.body;pub.checked=item.published;file.value='';msg.textContent='تعديل: '+item.title;title.focus();});
      action(c,'حذف',async()=>{if(!confirm('حذف المحتوى نهائيًا؟'))return;const d=await client().from('family_public_content').delete().eq('id',item.id).select('id').single();if(d.error){msg.textContent='تعذر الحذف';return;}if(item.image_path)await client().storage.from('family-public-content').remove([item.image_path]);await loadPublicCMS();await renderPublicCMS();});
    }
    if(cmsRecords.length){const filter=make('div',cms);cms.insertBefore(filter,cmsRecords[0].el);attachSearch(filter,'بحث في المحتوى المحفوظ',cmsRecords);}
  }
  renderPublicCMS().catch(()=>{});

  function switchAdminPanel(key){
    activeAdminPanel=key;
    adminDirectory.hidden=key!=='directory';
    if(key!=='directory'){directoryEpoch++;adminDirectory.replaceChildren();clearMemberPrint();}
    adminRows.hidden=key!=='members';adminRefresh.hidden=key!=='members';cms.hidden=key!=='content';adminReports.hidden=key!=='reports';adminIntro.hidden=key!=='overview';
    adminNavigation.querySelectorAll('[data-admin-panel]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.adminPanel===key)));
  }
  function mountAdminNavigation(){
    adminNavigation.replaceChildren();
    for(const [key,title,description,icon] of [['members','إدارة الأعضاء','العضويات والشهادات','users'],['content','إدارة المحتوى','التاريخ والشجرة والأرشيف والأخبار','archive'],['reports','التقارير والإحصاءات','ملخص العضويات','chart']]){
      const tile=make('button',adminNavigation);tile.type='button';tile.className='dashboard-tile';tile.dataset.adminPanel=key;
      dashboardIcon(tile,icon);const text=make('span',tile);make('strong',text,title);make('small',text,description);
      tile.onclick=()=>switchAdminPanel(key);
    }
    const inboxLink=dashboardLink(adminNavigation,'#member-services-admin','الطلبات والرسائل','الشكاوى والمساهمات والردود','inbox');inboxLink.dataset.adminService='requests';
    dashboardLink(adminNavigation,'#security','الإعدادات والأمان','التحقق الثنائي وسجل العمليات','shield');
    dashboardLink(adminNavigation,'#account','حسابي','العودة إلى حساب العضو','user');
    adminNavigation.hidden=false;
  }
  function mountAdminReports(members){
    adminReports.replaceChildren();make('h2',adminReports,'تقارير العضوية');
    make('p',adminReports,'ملخص إجمالي من سجل العضويات المتاح للإدارة، دون تصدير الأسماء أو بيانات الاتصال.');
    make('p',adminReports,'تاريخ ووقت إعداد التقرير: '+formatPortalTime(new Date()));
    const report=[['إجمالي العضويات',members.length],...Object.entries(statusLabels).map(([key,label])=>[label,members.filter(m=>m.status===key).length])];
    const table=make('table',adminReports);const header=make('tr',table);make('th',header,'المؤشر');make('th',header,'العدد');
    for(const [label,n] of report){const row=make('tr',table);make('td',row,label);make('td',row,new Intl.NumberFormat('ar-EG').format(n));}
    action(adminReports,'تصدير تقرير CSV (Excel)',()=>{const csv='\ufeffالمؤشر,العدد\r\n'+report.map(([label,n])=>label+','+n).join('\r\n')+'\r\n\r\nتاريخ ووقت الإصدار,"'+formatPortalTime(new Date()).replace(/"/g,'""')+'"\r\nالجهة المصدرة,إدارة آل برهم';saveDownload(new Blob([csv],{type:'text/csv;charset=utf-8'}),'albarham-membership-report.csv',adminReports);});
  }
  // Private roster: use the existing MFA-protected administrative RPC, never public tables.
  async function readMemberDirectory(){
    if(ok(await client().rpc('family_is_admin'))!==true)throw Error('Forbidden');
    const records=[],size=500;
    for(let start=0;;start+=size){
      const rows=ok(await client().rpc('family_admin_list').order('submitted_at',{ascending:false}).order('id',{ascending:true}).range(start,start+size-1));
      records.push(...rows);
      if(rows.length<size)break;
    }
    return records;
  }
  const directoryFields=[['full_name','الاسم الكامل'],['membership_number','رقم العضوية'],['email','البريد الإلكتروني'],['phone','رقم الجوال'],['status','حالة العضوية']];
  function sortedMemberDirectory(rows,query,status,sort){
    const terms=normalizeSearch(query).replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).split(/\s+/).filter(Boolean);
    const list=rows.filter(r=>(status==='all'||r.status===status)&&terms.every(t=>normalizeSearch([r.full_name,r.membership_number,r.email,r.phone].filter(Boolean).join(' ')).replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).includes(t)));
    const collator=new Intl.Collator('ar',{numeric:true,sensitivity:'base'});
    return list.sort((a,b)=>sort==='number'?collator.compare(a.membership_number||'\uffff',b.membership_number||'\uffff'):sort==='recent'?String(b.submitted_at||'').localeCompare(String(a.submitted_at||'')):collator.compare(a.full_name||'',b.full_name||''));
  }
  function memberDirectoryTable(parent,rows){
    const table=make('table',parent);table.className='member-directory-table';table.dir='rtl';
    const cols=make('colgroup',table);for(const k of ['seq',...directoryFields.map(x=>x[0])])make('col',cols).className='member-col-'+k;
    const head=make('thead',table),header=make('tr',head);
    for(const label of ['م',...directoryFields.map(x=>x[1])]){const th=make('th',header,label);th.scope='col';}
    const body=make('tbody',table);
    rows.forEach((r,i)=>{
      const tr=make('tr',body);make('td',tr,new Intl.NumberFormat('ar-EG').format(i+1));
      for(const [key] of directoryFields){
        const value=key==='status'?(statusLabels[r.status]||r.status):r[key];
        const cell=make('td',tr,value||'—');
        if(['membership_number','email','phone'].includes(key))cell.dir='ltr';
      }
    });
    return table;
  }
  function clearMemberPrint(){
    document.body.classList.remove('printing-member-directory');
    document.getElementById('member-directory-print')?.remove();
  }
  window.addEventListener('afterprint',clearMemberPrint);
  window.addEventListener('hashchange',()=>{
    clearMemberPrint();
    if(location.hash!=='#admin'){
      directoryEpoch++;adminDirectory.replaceChildren();adminDirectory.hidden=true;
      if(activeAdminPanel==='directory')activeAdminPanel='members';
    }
  });
  async function loadMemberDirectory(){
    switchAdminPanel('directory');
    const epoch=++directoryEpoch;
    adminDirectory.replaceChildren();
    const heading=make('div',adminDirectory);heading.className='directory-heading';
    make('span',heading,'آل برهم · الإدارة').className='eyebrow';
    make('h2',heading,'سجل جميع الأعضاء');
    make('p',heading,'سجل إداري خاص، يشمل طلبات العضوية المسجلة بجميع حالاتها. الأرقام غير الصادرة والبيانات غير المسجلة تظهر بشرطة.');
    action(adminDirectory,'العودة إلى إدارة الأعضاء',()=>switchAdminPanel('members')).className='btn btn-ghost';
    const msg=make('p',adminDirectory,'جارٍ تحميل السجل…');msg.setAttribute('role','status');
    try{
      const records=await readMemberDirectory();
      if(epoch!==directoryEpoch||activeAdminPanel!=='directory'||location.hash!=='#admin')return;
      const tools=make('div',adminDirectory);tools.className='dashboard-filter';
      const query=field(tools,'البحث بالاسم أو رقم العضوية أو البريد أو الجوال','directory-search','search',150);
      const status=selectField(tools,'حالة العضوية','directory-status',{all:'جميع الحالات',...statusLabels});
      const sort=selectField(tools,'ترتيب السجل','directory-sort',{name:'الاسم أبجديًا',number:'رقم العضوية',recent:'الأحدث تسجيلًا'});
      const count=make('p',tools);count.setAttribute('aria-live','polite');
      const actions=make('div',adminDirectory);actions.className='row directory-actions';
      const print=action(actions,'تصدير PDF / طباعة',async function(){
        if(this.disabled)return;
        if(!confirm('يتضمن التقرير بيانات اتصال خاصة. احفظه في مكان آمن ولا تشاركه خارج الإدارة. هل تريد المتابعة؟'))return;
        this.disabled=true;
        try{
          // Recheck live admin authorization and refresh data immediately before exporting.
          const fresh=await readMemberDirectory();
          if(epoch!==directoryEpoch||activeAdminPanel!=='directory'||location.hash!=='#admin')return;
          const selected=sortedMemberDirectory(fresh,query.value,status.value,sort.value);
          if(!selected.length){msg.textContent='لا توجد سجلات مطابقة للتصدير.';return;}
          clearMemberPrint();
          const report=make('section',document.body);report.id='member-directory-print';report.dir='rtl';
          const banner=make('header',report);banner.className='directory-print-banner';
          const logo=make('img',banner);logo.src='./barham-emblem.webp';logo.alt='آل برهم';logo.width=48;logo.height=48;
          const brand=make('div',banner);make('strong',brand,'آل برهم');make('p',brand,'البوابة العائلية الرقمية · أصالة الجذور وعهد الأجيال');
          make('span',banner,'سري — للاستخدام الإداري').className='directory-confidential';
          make('h1',report,'سجل أعضاء عائلة برهم');
          const meta=make('div',report);meta.className='directory-print-meta';
          make('span',meta,'تاريخ ووقت الإصدار: '+formatPortalTime(new Date()));
          make('span',meta,'عدد السجلات: '+new Intl.NumberFormat('ar-EG').format(selected.length));
          make('span',meta,'النطاق: '+(status.value==='all'?'جميع حالات العضوية':statusLabels[status.value])+(query.value.trim()?' · نتائج البحث':''));
          memberDirectoryTable(report,selected);
          const foot=make('footer',report);foot.className='directory-print-footer';
          make('p',foot,'إدارة البوابة الرقمية لآل برهم — وثيقة داخلية تتضمن بيانات شخصية، يمنع تداولها خارج الإدارة.');
          make('p',foot,'السجل يعكس البيانات المتاحة وقت الإصدار، ولا يعد شهادة عضوية فردية.');
          const signature=make('div',foot);signature.className='directory-signature';make('strong',signature,'إدارة آل برهم');make('small',signature,'توقيع مؤسسي — سجل العضويات');
          document.body.classList.add('printing-member-directory');
          if(document.fonts?.ready)await document.fonts.ready;
          try{await logo.decode();}catch(_){}
          if(epoch!==directoryEpoch||location.hash!=='#admin'){clearMemberPrint();return;}
          window.print();
        }catch(e){clearMemberPrint();msg.textContent='تعذر تجهيز التقرير. تحقق من صلاحية حساب الإدارة والاتصال.';}
        finally{this.disabled=false;}
      });print.className='btn btn-gold';
      action(actions,'تحديث السجل',()=>guardPrivate(loadMemberDirectory)).className='btn btn-ghost';
      const wrap=make('div',adminDirectory);wrap.className='member-directory-tablewrap';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','جدول الأعضاء');
      function draw(){
        const selected=sortedMemberDirectory(records,query.value,status.value,sort.value);
        wrap.replaceChildren();
        if(selected.length)memberDirectoryTable(wrap,selected);else make('p',wrap,'لا توجد سجلات مطابقة.');
        count.textContent='عرض '+new Intl.NumberFormat('ar-EG').format(selected.length)+' من '+new Intl.NumberFormat('ar-EG').format(records.length)+' سجلًا';
        print.disabled=!selected.length;
      }
      query.oninput=status.onchange=sort.onchange=draw;
      msg.textContent='البيانات خاصة بالإدارة. عند التصدير اختر «حفظ بتنسيق PDF» من نافذة الطباعة.';
      draw();
    }catch(e){if(epoch===directoryEpoch){adminDirectory.replaceChildren();make('p',adminDirectory,'تعذر فتح السجل؛ يلزم حساب إدارة مخوّل وتحقق ثنائي نشط.');action(adminDirectory,'العودة',()=>switchAdminPanel('members'));}}
  }
  async function loadAdmin() {
    adminNavigation.hidden=true;adminRefresh.hidden=true;
    cms.hidden=true;cms.replaceChildren();adminReports.hidden=true;adminReports.replaceChildren();adminIntro.hidden=true;
    adminRows.replaceChildren();directoryEpoch++;adminDirectory.replaceChildren();adminDirectory.hidden=true;clearMemberPrint();
    adminMsg.textContent = 'جارٍ التحقق من الصلاحية';
    try {
      var q = await client().rpc('family_admin_list');
      if (q.error) {
        adminMsg.textContent = 'هذه الصفحة مخصصة للمشرف المعتمد. سجل الدخول بحساب الإدارة.';
        return;
      }
      mountAdminNavigation();
      if(activeAdminPanel==='directory')activeAdminPanel='members';
      switchAdminPanel(activeAdminPanel);
      adminMsg.textContent = 'الطلبات: ' + q.data.length + ' | المعتمدة: ' + q.data.filter(x => x.status ===
        'approved').length + ' | قيد المراجعة: ' + q.data.filter(x => x.status === 'under_review').length;
      const stats = make('div', adminRows); stats.className = 'family-admin-stats';
      for (const [label, n] of [['إجمالي الطلبات', q.data.length], ['معتمدة', q.data.filter(x=>x.status==='approved').length], ['قيد المراجعة', q.data.filter(x=>x.status==='under_review').length], ['تحتاج استكمالًا', q.data.filter(x=>x.status==='more_info').length]]) {
        const stat = make('div', stats); stat.className = 'card'; make('strong', stat, String(n)); make('p', stat, label);
      }
      const registryButton=action(adminRows,'سجل جميع الأعضاء — عرض وتصدير PDF',()=>guardPrivate(loadMemberDirectory));registryButton.className='btn btn-gold member-directory-entry';
      var filterBar = make('div', adminRows);
      filterBar.className = 'card dashboard-filter';
      var search = field(filterBar, 'بحث بالاسم أو رقم العضوية', 'search', 'search', 150),
        filter = selectField(filterBar, 'حالة العضوية', 'status', {
          all: 'الكل',
          ...statusLabels
        });
      var cards = [];
      var filteredCount=make('p',filterBar);filteredCount.setAttribute('role','status');
      var memberList=make('div',adminRows);memberList.className='dashboard-records';
      function applyFilter() {
        const terms=normalizeSearch(search.value).split(/\s+/).filter(Boolean);let count=0;
        cards.forEach(x=>{x.el.hidden=(filter.value!=='all'&&x.status!==filter.value)||!terms.every(t=>normalizeSearch(x.text).includes(t));if(!x.el.hidden)count++;});
        filteredCount.textContent='النتائج: '+new Intl.NumberFormat('ar-EG').format(count)+' من '+new Intl.NumberFormat('ar-EG').format(cards.length);
      }
      search.oninput = filter.onchange = applyFilter;
      for (var item of q.data) {
        let a = item;
        let entry=make('details',memberList);entry.className='card dashboard-record';
        let summary=make('summary',entry);make('strong',summary,a.full_name||'عضو');make('span',summary,statusLabels[a.status]||a.status).className='dashboard-state';
        let c=make('div',entry);c.className='dashboard-record-body';
        cards.push({
          el: entry,
          status: a.status,
          text: [a.full_name, a.email, a.membership_number, a.phone].join(' ').toLowerCase()
        });
        make('h3', c, 'بيانات العضوية');
        make('p', c, a.email + ' | ' + (a.phone || ''));
        make('p', c, (statusLabels[a.status] || a.status) + ' ' + (a.membership_number || ''));
        if (a.status === 'approved') {
          action(c, 'إعداد رسالة الشهادة بالبريد', () => {
            var subject = 'شهادة العضوية | آل برهم';
            var body = 'الأخ/الأخت ' + a.full_name +
              '، تم اعتماد عضويتك في البوابة الرقمية لآل برهم. رقم العضوية: ' + (a.membership_number || '') +
              '\nلعرض شهادتك وطباعتها، سجل الدخول عبر الرابط:\n' + location.origin + location.pathname +
              '?page=certificate\nإدارة البوابة الرقمية لآل برهم';
            location.href = 'mailto:' + encodeURIComponent(a.email) + '?subject=' + encodeURIComponent(
              subject) + '&body=' + encodeURIComponent(body);
          });
        }
        let note = field(c,'ملاحظة المراجعة','review-note','text',1000);
        let choiceLabel=make('label',c,'قرار العضوية');choiceLabel.className='f';
        let choices = make('select', choiceLabel);
        for (let k of ['approved', 'more_info', 'rejected', 'suspended', 'revoked']) {
          let o = make('option', choices, statusLabels[k]);
          o.value = k;
        }
        choices.value = ['approved', 'more_info', 'rejected', 'suspended', 'revoked'].includes(a.status) ? a
          .status : 'more_info';
        action(c, 'حفظ القرار', async function() {
          if (!confirm('تأكيد تغيير حالة العضوية؟')) return;
          this.disabled = true;
          let z = await client().rpc('family_admin_review', {
            p_id: a.id,
            p_action: choices.value,
            p_note: note.value
          });
          if (z.error) {
            adminMsg.textContent = 'تعذر تنفيذ القرار.';
            this.disabled = false;
          } else {
            if (choices.value === 'approved') adminMsg.textContent = 'تم اعتماد العضوية.';
            await loadAdmin();
          }
        });
      }
      applyFilter();
      mountAdminReports(q.data);
      try{await loadPublicCMS();switchAdminPanel(activeAdminPanel);}catch(e){cms.replaceChildren();make('p',cms,'تعذر تحميل إدارة المحتوى. حدّث الصفحة ثم أعد المحاولة.');switchAdminPanel(activeAdminPanel);}
    } catch (e) {
      adminMsg.textContent = 'تعذر الاتصال بالخدمة.';
    }
  }
  // Export files locally; retry links expire and never persist in storage.
  const downloadLinks=new Map();
  function clearDownloads(){
    for(const [url,entry] of downloadLinks){clearTimeout(entry.timer);entry.link.remove();URL.revokeObjectURL(url);}
    downloadLinks.clear();
  }
  window.addEventListener('hashchange',clearDownloads);
  function saveDownload(blob,name,parent){
    if(!(blob instanceof Blob)||!blob.size||!parent.isConnected)throw Error('File unavailable');
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=String(name).replace(/[\u0000-\u001f\u007f<>:"/\\|?*\u202a-\u202e\u2066-\u2069]/g,'-').trim()||'albarham-file';
    link.className='btn btn-ghost sm';link.textContent='إعادة محاولة التنزيل';link.rel='noopener';
    parent.appendChild(link);
    const timer=setTimeout(()=>{link.remove();URL.revokeObjectURL(url);downloadLinks.delete(url);},120000);
    downloadLinks.set(url,{link,timer});try{link.click();}catch(e){/* retry link remains available */}
  }
  function fileExtension(file){
    return ({'application/pdf':'.pdf','image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp','image/gif':'.gif','text/plain':'.txt','text/csv':'.csv','application/zip':'.zip','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'.docx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'.xlsx'})[(file.type||'').split(';')[0].toLowerCase()]||'.bin';
  }
  function canvasBytes(canvas,mime,quality){
    const data=canvas.toDataURL(mime,quality);
    if(!data.startsWith('data:'+mime+';base64,'))throw Error('Image export failed');
    return Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0));
  }
  function jpegPdf(jpeg,width,height){
    const encoder=new TextEncoder(),parts=[],offsets=[0];let length=0;
    const add=x=>{const bytes=typeof x==='string'?encoder.encode(x):x;parts.push(bytes);length+=bytes.length;};
    const obj=(i,s)=>{offsets[i]=length;add(i+' 0 obj\n'+s+'\nendobj\n');};
    add('%PDF-1.4\n');
    obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
    obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
    offsets[4]=length;
    add('4 0 obj\n<< /Type /XObject /Subtype /Image /Width '+width+' /Height '+height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n');add(jpeg);add('\nendstream\nendobj\n');
    const commands='q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n';
    obj(5,'<< /Length '+commands.length+' >>\nstream\n'+commands+'endstream');
    const xref=length;add('xref\n0 6\n0000000000 65535 f \n');
    for(let i=1;i<=5;i++)add(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
    add('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
    return new Blob(parts,{type:'application/pdf'});
  }
  function certificatePdf(box){
    // A4 export of the same glass membership-document design (portal.css).
    const c=document.createElement('canvas');c.width=1240;c.height=1754;
    const ctx=c.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
    const W=c.width,H=c.height,center=W/2,white='#f4f8ff',muted='#d0e0ef',blue='#bcd9ef';
    const bodyFont=getComputedStyle(box).fontFamily,displayFont=getComputedStyle(box.querySelector('.md-name')).fontFamily;
    const read=selector=>box.querySelector(selector)?.textContent.trim()||'';
    function round(x,y,w,h,r,fill,stroke,line=2){
      ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
      if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}
    }
    function text(value,x,y,size=32,color=white,bold=false,align='right',dir='rtl',max=1080,font=bodyFont){
      ctx.direction=dir;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillStyle=color;
      ctx.font=(bold?'700 ':'400 ')+size+'px '+font;ctx.fillText(String(value||''),x,y,max);
    }
    function wrapped(value,x,y,size,max,lineHeight,limit,color=muted,bold=false,align='right',dir='rtl'){
      ctx.font=(bold?'700 ':'400 ')+size+'px '+bodyFont;
      const words=String(value||'').split(/\s+/),lines=[];let line='';
      for(const word of words){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>max){lines.push(line);line=word;}else line=next;}
      if(line)lines.push(line);
      if(lines.length>limit){lines[limit-1]=lines.slice(limit-1).join(' ');lines.length=limit;}
      lines.forEach((l,i)=>text(l,x,y+i*lineHeight,size,color,bold,align,dir,max));
    }
    function glow(x,y,rx,ry,color,stop){
      ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
      const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,color);g.addColorStop(stop,'transparent');g.addColorStop(1,'transparent');
      ctx.fillStyle=g;ctx.fillRect(-2,-2,4,4);ctx.restore();
    }
    ctx.fillStyle='#101e35';ctx.fillRect(0,0,W,H);
    round(22,22,W-44,H-44,34);ctx.save();ctx.clip();
    const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#101e35');bg.addColorStop(.65,'#263d54');bg.addColorStop(1,'#18283d');
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    glow(W*.90,H*.80,W*1.30,H*.82,'#655477',.68);
    glow(W*.12,H*.08,W*1.20,H*.70,'#426d83',.65);
    ctx.fillStyle='#dcecff0b';ctx.fillRect(22,22,W-44,196);
    ctx.strokeStyle='#dcecff35';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(22,218);ctx.lineTo(W-22,218);ctx.stroke();
    const logo=box.querySelector('.md-head img');
    if(!logo||!logo.complete||!logo.naturalWidth)throw Error('Certificate logo not ready');
    const ratio=Math.min(138/logo.naturalWidth,138/logo.naturalHeight);
    const lw=logo.naturalWidth*ratio,lh=logo.naturalHeight*ratio;ctx.drawImage(logo,145-lw/2,120-lh/2,lw,lh);
    text(read('.md-head small'),1150,76,22,blue,false,'right','ltr',910,'Arial');
    text(read('.md-head h3'),1150,139,46,white,true,'right','rtl',910,displayFont);
    text(read('.md-head p'),1150,181,25,muted,false,'right','rtl',910);
    text(read('.md-kicker'),1150,263,20,blue,false,'right','ltr',1060,'Arial');
    text(read('.md-main h1'),1150,332,65,white,true,'right','rtl',1060,displayFont);
    text(read('.md-en'),1150,374,28,blue,false,'right','ltr',1060,'Arial');
    wrapped(read('.md-intro'),1150,434,32,1060,44,2);
    const person=ctx.createLinearGradient(80,500,1160,690);person.addColorStop(0,'#e1f1ff24');person.addColorStop(1,'#e1f1ff09');
    round(80,505,1080,200,24,person,'#d6eaff55',3);
    text(read('.md-person small'),1125,552,27,muted);
    text(read('.md-name'),1125,626,62,white,true,'right','rtl',1010,displayFont);
    text(read('.md-person span'),1125,677,29,muted,false,'right','rtl',1010);
    Array.from(box.querySelectorAll('.md-fields > div')).forEach((field,i)=>{
      const x=i%2===0?630:80,y=730+Math.floor(i/2)*115;
      round(x,y,530,102,17,'#dcecff0d','#dcecff28',2);
      text(field.querySelector('small').textContent,x+505,y+33,24,muted,false,'right','rtl',480);
      wrapped(field.querySelector('strong').textContent,x+505,y+70,30,480,29,2,white,true,'right',i===0?'ltr':'rtl');
    });
    ctx.fillStyle='#a8c9e4';ctx.fillRect(1154,1085,4,110);
    text(read('.md-statement strong'),1134,1119,32,white,true);
    wrapped(read('.md-statement p'),1134,1161,27,1025,36,2);
    round(80,1220,1080,264,24,'#c7dfff0b','#c7dfff30',2);
    const signX=975;
    text(read('.md-signature'),signX,1323,46,'#e0edff',true,'center','rtl',300,displayFont);
    ctx.strokeStyle='#b9d6ed66';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(830,1342);ctx.lineTo(1120,1342);ctx.stroke();
    text(read('.md-sign strong'),signX,1376,26,white,true,'center','rtl',300);
    text(read('.md-sign small'),signX,1413,23,muted,false,'center','rtl',300);
    ctx.save();ctx.translate(center,1351);ctx.rotate(-9*Math.PI/180);
    const sealFill=ctx.createRadialGradient(0,0,0,0,0,107);sealFill.addColorStop(0,'#c6e3ff20');sealFill.addColorStop(1,'#c6e3ff06');
    ctx.beginPath();ctx.arc(0,0,105,0,Math.PI*2);ctx.fillStyle=sealFill;ctx.fill();ctx.strokeStyle='#c2d9ee';ctx.lineWidth=3;ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,92,0,Math.PI*2);ctx.setLineDash([5,5]);ctx.strokeStyle='#c2d9eea0';ctx.stroke();ctx.setLineDash([]);
    text('AL BARHAM · PORTAL',0,-52,15,blue,false,'center','ltr',166,'Arial');
    text('♔',0,-12,36,blue,false,'center','ltr',160,'Arial');
    text(read('.md-seal strong'),0,24,34,white,true,'center','rtl',160,displayFont);
    text(read('.md-seal small'),0,51,18,blue,false,'center','rtl',160);
    text('VERIFIED',0,76,15,blue,true,'center','ltr',160,'Arial');ctx.restore();
    const verify=box.querySelector('.md-qr a');
    if(!verify||!window.QRCode)throw Error('Certificate QR not ready');
    const qrNode=document.createElement('div');
    new QRCode(qrNode,{text:verify.href,width:196,height:196,correctLevel:QRCode.CorrectLevel.M});
    const qr=qrNode.querySelector('canvas');
    if(!qr||!qr.width)throw Error('Certificate QR unavailable');
    round(149,1233,240,240,9,'#ffffff');ctx.imageSmoothingEnabled=false;ctx.drawImage(qr,173,1257,192,192);ctx.imageSmoothingEnabled=true;
    text('رابط التحقق الإلكتروني',center,1522,27,white,true,'center');
    text(verify.href,center,1558,22,blue,false,'center','ltr',1080,'Arial');
    text(read('.certificate-copy-time'),center,1598,23,muted,false,'center','rtl',1080);
    wrapped(read('.md-note'),center,1636,22,1080,28,2,'#c6d8e9',false,'center');
    ctx.fillStyle='#07152840';ctx.fillRect(22,1687,W-44,45);
    ctx.strokeStyle='#dcecff35';ctx.beginPath();ctx.moveTo(22,1687);ctx.lineTo(W-22,1687);ctx.stroke();
    text(read('.md-foot span'),1150,1717,22,'#dcecff',false,'right','rtl',740);
    text('barham-ps.github.io',90,1717,20,'#dcecff',false,'left','ltr',350,'Arial');
    ctx.restore();
    round(22,22,W-44,H-44,34,null,'#a9c7df80',2);
    round(38,38,W-76,H-76,23,null,'#d9eaff35',2);
    return jpegPdf(canvasBytes(c,'image/jpeg',0.96),W,H);
  }
  var cert = newView('certificate', 'شهادة العضوية الرقمية'),
    certBody = make('div', cert);
  certBody.className = 'cert-prev';
  var certControls = make('div', cert);
  certControls.className = 'row';
  var printButton = action(certControls, 'طباعة / حفظ PDF', () => {const stamp=certBody.querySelector('.certificate-copy-time');if(stamp)stamp.textContent='تاريخ ووقت إعداد النسخة: '+formatPortalTime(new Date());window.print();});
  var downloadCertificate=action(certControls,'تنزيل الشهادة PDF',async()=>{
    const box=certBody.querySelector('.membership-document');
    if(!box||location.hash!=='#certificate'||!recoveredSession)return;
    const sessionId=recoveredSession.user.id;
    if(downloadCertificate.disabled)return;
    downloadCertificate.disabled=true;
    try{
      const logo=box.querySelector('.md-head img');
      const ready=Promise.all([ensureQR(),document.fonts?.ready,logo?.decode?.()]);
      let timer;try{await Promise.race([ready,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Assets timed out')),10000);})]);}finally{clearTimeout(timer);}
      if(!box.isConnected||location.hash!=='#certificate'||recoveredSession?.user.id!==sessionId)return;
      box.querySelector('.certificate-copy-time').textContent='تاريخ ووقت إعداد النسخة: '+formatPortalTime(new Date());
      const number=box.querySelector('.md-fields strong').textContent;
      saveDownload(certificatePdf(box),'albarham-certificate-'+number+'.pdf',certControls);
    }catch(e){alert('تعذر إنشاء ملف PDF أو تحميل عناصر الشهادة. أعد المحاولة أو استخدم الطباعة.');}finally{downloadCertificate.disabled=false;}
  });
  printButton.textContent='طباعة الشهادة';
  printButton.hidden = downloadCertificate.hidden = true;
  var qrLoad = null;
  async function ensureQR() {
    if (window.QRCode) return true;
    if (!qrLoad) qrLoad = new Promise(resolve => {
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
      script.integrity = 'sha384-3zSEDfvllQohrq0PHL1fOXJuC/jSOO34H46t6UQfobFOmxE5BpjjaIJY5F2/bMnU';
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve(!!window.QRCode);
      script.onerror = () => {
        script.remove();
        qrLoad = null;
        resolve(false);
      };
      document.head.appendChild(script);
    });
    return qrLoad;
  }
  async function loadCertificate() {
    certBody.replaceChildren();
    printButton.hidden = downloadCertificate.hidden = true;
    const sessionId=recoveredSession?.user.id;
    try {
      var q = await client().rpc('family_my_certificate');
      if(location.hash!=='#certificate'||recoveredSession?.user.id!==sessionId)return;
      if (q.error) throw q.error;
      if (!q.data.length) {
        var session = await client().auth.getSession();
        if (!session.data.session) {
          sessionStorage.setItem('family_after_login', 'certificate');
          make('p', certBody, 'سجل الدخول أولًا لعرض شهادتك.');
          var l = make('a', certBody, 'تسجيل الدخول');
          l.href = '#login';
          l.className = 'btn btn-dark';
        } else {
          make('p', certBody, 'لا توجد شهادة عضوية سارية لهذا الحساب. تصدر الشهادة بعد اعتماد الطلب.');
          var l = make('a', certBody, 'متابعة حالة العضوية');
          l.href = '#account';
          l.className = 'btn btn-dark';
        }
        return;
      }
      var d = q.data[0];
      var box = make('article', certBody);
      box.className = 'membership-document';
      box.innerHTML = '<header class="md-head"><div><small>AL BARHAM / MEMBERSHIP OFFICE</small><h3>البوابة العائلية لآل برهم</h3><p>سجل العضوية الإلكتروني</p></div><img src="./barham-emblem.webp" alt="شعار آل برهم"></header><div class="md-main"><div class="md-kicker">MEMBERSHIP CERTIFICATE · 01</div><h1>شهادة اعتماد العضوية</h1><div class="md-en">OFFICIAL PORTAL MEMBERSHIP</div><p class="md-intro">بناءً على مراجعة طلب الانتساب واعتماده في سجل البوابة العائلية، تُمنح هذه الشهادة إلى</p><div class="md-person"><small>الاسم الكامل للعضو</small><h2 class="md-name"></h2><span>عضو معتمد في البوابة العائلية الرقمية</span></div><div class="md-fields"></div><div class="md-statement"><strong>نطاق الاعتماد</strong><p>تؤكد هذه الشهادة اعتماد صاحبها للاستفادة من خدمات العضوية والمشاركة في أنشطة المنصة وفق سياساتها المعمول بها.</p></div><div class="md-auth"><div class="md-sign"><div class="md-signature">إدارة آل برهم</div><strong>إدارة العضوية</strong><small>اعتماد مؤسسي إلكتروني</small></div><div class="md-seal"><span>AL BARHAM · PORTAL</span><span aria-hidden="true" style="font-size:19px;line-height:1.2">♔</span><strong>آل برهم</strong><small>اعتماد العضوية</small><span>✦ VERIFIED ✦</span></div><div class="md-qr"></div></div><p class="md-note">تُراجع صلاحية الوثيقة إلكترونيًا عند استخدامها. هذه شهادة عضوية خاصة بالبوابة وليست وثيقة حكومية أو إثبات نسب.</p></div><footer class="md-foot"><span>آل برهم | أصالة الجذور وعهد الأجيال</span><span dir="ltr">barham-ps.github.io</span></footer>';
      box.querySelector('.md-name').textContent = d.full_name;
      var fields = box.querySelector('.md-fields');
      var issued = formatPortalTime(d.issued_at);
      [['رقم العضوية',d.membership_number],['تاريخ ووقت الإصدار',issued],['حالة العضوية','معتمدة وسارية'],['الجهة المصدرة','إدارة بوابة آل برهم'],['نوع الوثيقة','شهادة عضوية رقمية'],['نطاق العضوية','البوابة العائلية']].forEach(([label,value]) => {
        var item = make('div',fields); make('small',item,label); var val=make('strong',item,value); if(label==='رقم العضوية'||label==='مرجع السجل') val.dir='ltr';
      });
      var url = location.origin + location.pathname + '#verify/' + d.verification_token;
      var qr = box.querySelector('.md-qr');
      var link = make('a',qr,'تحقق من صحة الوثيقة'); link.href=url;
      make('small',qr,'امسح الرمز أو استخدم الرابط');
      const copyStamp=make('p',box.querySelector('.md-main'),'تاريخ ووقت إعداد النسخة: '+formatPortalTime(new Date()));copyStamp.className='certificate-copy-time';
      printButton.hidden = downloadCertificate.hidden = false;
      const renderQR=()=>{if(box.isConnected&&location.hash==='#certificate'&&recoveredSession?.user.id===sessionId){try{const qrBox=make('div',qr);qr.prepend(qrBox);new QRCode(qrBox,{text:url,width:112,height:112,correctLevel:QRCode.CorrectLevel.M});}catch(e){}}};
      if(window.QRCode)renderQR();else ensureQR().then(ready=>{if(ready)renderQR();});
    } catch (e) {
      make('p', certBody, 'تعذر تحميل الشهادة.');
    }
  }
  var verify = newView('verify', 'التحقق من العضوية'),
    verifyBody = make('div', verify);
  verifyBody.className = 'card verify-result';
  const verifyForm=make('div',verify);verifyForm.className='verify-form';
  verify.insertBefore(verifyForm,verifyBody);
  make('h2',verifyForm,'تحقق من صحة العضوية');
  make('p',verifyForm,'أدخل رقم العضوية أو رمز التحقق الموجود على الشهادة. هذه الخدمة متاحة للجميع دون حساب.');
  const verifyRow=make('div',verifyForm);verifyRow.className='verify-row';
  var tokenInput = make('input', verifyRow);
  tokenInput.type = 'text';
  tokenInput.placeholder = 'رقم العضوية أو رمز التحقق';
  tokenInput.dir = 'ltr';
  tokenInput.maxLength=80;tokenInput.autocomplete='off';tokenInput.setAttribute('aria-label','رقم العضوية أو رمز التحقق');
  verifyBody.setAttribute('aria-live','polite');
  let verificationEpoch=0;
  const verifyButton=action(verifyRow, 'تحقق', () => verifyToken(tokenInput.value.trim()));
  tokenInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();verifyToken(tokenInput.value.trim());}});
  window.addEventListener('hashchange',()=>{verificationEpoch++;verifyBody.removeAttribute('aria-busy');verifyButton.disabled=false;});
  async function verifyToken(token) {
    const epoch=++verificationEpoch, requestedHash=location.hash;
    const current=()=>epoch===verificationEpoch&&location.hash===requestedHash;
    verifyBody.replaceChildren();verifyBody.removeAttribute('aria-busy');verifyButton.disabled=false;
    token = String(token || '').trim().replace(/[٠-٩]/g, c => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));
    const byNumber = /^AB-\d{4}-\d{6}$/i.test(token);
    if (!byNumber && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
      make('p', verifyBody, 'أدخل رقم العضوية بصيغة AB-2026-000001 أو رمز التحقق الصحيح.');
      return;
    }
    verifyBody.setAttribute('aria-busy','true');verifyButton.disabled=true;
    make('p',verifyBody,'جارٍ التحقق…');
    try {
      let q = byNumber ? await client().rpc('family_verify_membership_number', {p_number: token.toUpperCase()}) : await client().rpc('family_verify_certificate', {p_token: token.toLowerCase()});
      if(!current())return;
      verifyBody.replaceChildren();
      if (q.error) {
        make('p', verifyBody, 'تعذر التحقق الآن.');
        return;
      }
      if (!q.data.length) {
        make('h2', verifyBody, 'لم يتم العثور على عضوية بهذا الرقم أو الرمز');
        return;
      }
      let d = q.data[0];
      make('h2', verifyBody, d.valid ? 'عضوية سارية ومعتمدة' : 'عضوية غير سارية').className=d.valid?'verify-valid':'verify-invalid';
      make('p', verifyBody, 'رقم العضوية: ' + d.membership_number);
      make('p', verifyBody, 'تاريخ الإصدار: ' + formatPortalTime(d.issued_at));
    } catch (e) {
      if(current()){verifyBody.replaceChildren();make('p',verifyBody,'تعذر الاتصال.');}
    } finally {
      if(current()){verifyBody.removeAttribute('aria-busy');verifyButton.disabled=false;}
    }
  }
  var memberBox = make('div', panel.querySelector('.wrap'));
  memberBox.className = 'card account-summary';
  memberBox.innerHTML =
    '<h2 id="member-welcome">حساب العضو</h2><p id="member-email" dir="ltr"></p><p>رقم العضوية: <strong id="member-number">—</strong></p><p>يظل تسجيل دخولك محفوظًا على هذا المتصفح حتى تسجيل الخروج أو انتهاء صلاحية الجلسة.</p>';
  panel.querySelector('.wrap').insertBefore(memberBox, $('#account-status'));
  var accountLinks = make('div', panel.querySelector('.wrap'));
  accountLinks.className = 'row account-actions';
  panel.querySelector('.wrap').insertBefore(accountLinks,$('#completeForm'));
  var certShortcut = make('a', accountLinks, 'شهادتي الرقمية');
  certShortcut.id = 'member-certificate';
  certShortcut.href = '#certificate';
  certShortcut.className = 'btn btn-dark';
  certShortcut.hidden = true;
  var adminShortcut = make('a', accountLinks, 'لوحة الإدارة');
  adminShortcut.href = '#admin';
  adminShortcut.className = 'btn btn-dark';
  adminShortcut.hidden = true;
  var pwBox = make('details', panel.querySelector('.wrap'));
  pwBox.className = 'card';
  pwBox.innerHTML =
    '<summary>إعدادات وأمان الحساب</summary><form id="change-password"><label class="f">كلمة مرور جديدة<input type="password" minlength="15" maxlength="128" autocomplete="new-password" required></label><button class="btn btn-dark" type="submit">تغيير كلمة المرور</button><p role="status"></p></form>';
  pwBox.appendChild($('#logout'));
  $('#logout').className='btn btn-ghost';
  $('#change-password').onsubmit = async function(e) {
    e.preventDefault();
    var f = this,
      b = f.querySelector('button'),
      p = f.querySelector('input'),
      msg = f.querySelector('p');
    if (b.disabled) return;
    if (!validNewPassword(p.value)) {
      msg.textContent = 'اختر كلمة مرور من ١٥ إلى ١٢٨ حرفًا.';
      return;
    }
    b.disabled = true;
    try {
      const password = p.value;
      const leakMessage = await requirePasswordScreen(password);
      if (leakMessage) { msg.textContent = leakMessage; return; }
      var z = await client().auth.updateUser({
        password: password
      });
      msg.textContent = z.error ? 'تعذر تغيير كلمة المرور؛ قد يلزم تسجيل الدخول مجددًا.' :
      'تم تغيير كلمة المرور.';
      if (!z.error) f.reset();
    } catch (e) {
      msg.textContent = 'تعذر الاتصال.';
    } finally {
      b.disabled = false;
    }
  };

  if (window.FAMILY_SECURITY_CONFIG?.passkeysEnabled === true && window.PublicKeyCredential && window.isSecureContext) {
    const loginPasskey = action($('#logForm'), 'دخول بمفتاح المرور', async () => {
      if (loginPasskey.disabled) return;
      loginPasskey.disabled = true;
      try {
        const z = await client().auth.signInWithPasskey();
        if (z.error) throw z.error;
        location.hash = 'account';
      } catch (_) { show('#l-msg', 'تعذر الدخول بمفتاح المرور. يمكنك الدخول بالطريقة المعتادة.', 1); }
      finally { loginPasskey.disabled = false; }
    });
    loginPasskey.type = 'button';
    const registerPasskey = action(pwBox, 'إضافة مفتاح مرور', async () => {
      if (registerPasskey.disabled) return;
      registerPasskey.disabled = true;
      try {
        const level = ok(await client().auth.mfa.getAuthenticatorAssuranceLevel());
        if (level.nextLevel === 'aal2' && level.currentLevel !== 'aal2') { location.hash = 'mfa'; return; }
        const z = await client().auth.registerPasskey();
        if (z.error) throw z.error;
        alert('تم تسجيل مفتاح المرور. احتفظ بطريقة استعادة الحساب.');
      } catch (_) { alert('تعذر تسجيل مفتاح المرور. تحقق من إعدادات المصادقة والجهاز.'); }
      finally { registerPasskey.disabled = false; }
    });
    registerPasskey.type = 'button';
  }

  var hub = newView('member-hub', 'خدماتي العائلية'),
    hubBody = make('div', hub),
    hubLink = make('a', accountLinks, 'مجلس العضو الرقمي');
  hubLink.href = '#member-hub';
  hubLink.className = 'btn btn-gold';
  hubLink.hidden = true;
  var memberQuick = make('div',panel.querySelector('.wrap'));
  memberQuick.className='dashboard-grid account-quick';memberQuick.hidden=true;
  panel.querySelector('.wrap').insertBefore(memberQuick,pwBox);
  for(const [key,title,description,icon] of [['requests','إرسال طلب أو مساهمة','الشكاوى والمقترحات والمعلومات العائلية','heart'],['notices','رسائل الإدارة','الاطلاع على الإشعارات الخاصة','file'],['profile','ملفي الشخصي','تحديث المعلومات المسجلة في ملفي','users'],['identity','بطاقتي الرقمية','عرض بطاقة العضوية والشهادة','shield'],['archive','أرشيف العائلة','الوثائق المتاحة للأعضاء','archive'],['occasions','المناسبات','متابعة المناسبات والتهاني','cal']]){
    const l=dashboardLink(memberQuick,'#member-hub',title,description,icon);l.dataset.hubTarget=key;
  }
  hubLink.dataset.hubTarget='overview';
  var adminServices = newView('member-services-admin', 'إدارة خدمات الأعضاء'),
    adminServiceBody = make('div', adminServices);
  var adminServiceLink = make('a', admin, 'إدارة خدمات الأعضاء');
  adminServiceLink.href = '#member-services-admin';
  adminServiceLink.hidden=true;
  adminServiceLink.className = 'btn btn-dark';
  var kinds = {
    initiative: 'مبادرة',
    suggestion: 'مقترح',
    occasion: 'مناسبة أو تهنئة',
    solidarity: 'طلب تكافل خاص',
    archive: 'مساهمة أرشيفية أو تصحيح بيانات الشجرة',
    complaint: 'شكوى'
  };

  function field(form, label, name, type, max) {
    var l = make('label', form, label);
    l.className = 'f';
    var e = make(type === 'textarea' ? 'textarea' : 'input', l);
    e.name = name;
    if (type !== 'textarea') e.type = type || 'text';
    if (max) e.maxLength = max;
    return e;
  }

  function selectField(form, label, name, options) {
    var l = make('label', form, label);
    l.className = 'f';
    var e = make('select', l);
    e.name = name;
    Object.entries(options).forEach(([k, v]) => {
      var o = make('option', e, v);
      o.value = k;
    });
    return e;
  }

  function section(parent, title) {
    var c = make('div', parent);
    c.className = 'card';
    c.style.marginBottom = '16px';
    make('h2', c, title);
    if(parent===hubBody)c.dataset.hubService=hubCardKeys[title]||'overview';
    return c;
  }
  var activeHubGroup = 'overview';
  var hubNavigate = null;

  // Explicit service keys prevent a missing or reordered card from changing the navigation.
  const hubServices = [
    ['identity','بطاقتي وشهادتي','البطاقة الرقمية ووثيقة العضوية','shield'],
    ['profile','ملفي الشخصي','تحديث معلوماتي ودليل الكفاءات','users'],
    ['lineage','سجل قراباتي','إدارة سجل النسب الخاص','network'],
    ['directory','دليل الكفاءات','التخصصات والمهارات المتاحة','landmark'],
    ['notices','الإشعارات','الرسائل الخاصة من الإدارة','file'],
    ['archive','الأرشيف','الوثائق والمصادر المتاحة للأعضاء','archive'],
    ['occasions','المناسبات','التهاني والمواعيد','cal'],
    ['requests','طلباتي ومساهماتي','شكوى أو مقترح أو مادة أرشيفية','heart']
  ];
  const hubGroups=[
    ['membership-group','عضويتي','البطاقة والشهادة والملف الشخصي','user',['identity','profile']],
    ['family-group','عائلتي','سجل القرابة ودليل الكفاءات','network',['lineage','directory']],
    ['requests','طلباتي','الشكاوى والمساهمات والمقترحات','inbox',['requests']],
    ['notices','الإشعارات','رسائل الإدارة الخاصة','bell',['notices']],
    ['library-group','المكتبة العائلية','الأرشيف والوثائق والمناسبات','archive',['archive','occasions']]
  ];
  const hubGroupFor=key=>hubGroups.find(g=>g[0]===key||g[4].includes(key));
  const hubCardKeys = {
    'بطاقتي العائلية الرقمية':'identity','البطاقة الرقمية':'identity',
    'ملفي الشخصي':'profile','الملف الشخصي':'profile',
    'شجرة نسبي الشخصية':'lineage','سجل القرابة':'lineage',
    'دليل المهن والكفاءات':'directory','دليل الكفاءات':'directory',
    'صندوق الإشعارات الخاص':'notices','الإشعارات':'notices',
    'الأرشيف الحصري':'archive','الأرشيف':'archive',
    'المناسبات والتهاني':'occasions','المناسبات':'occasions',
    'الطلبات والمساهمات والشكاوى':'requests','الطلبات':'requests'
  };
  function dashboardIcon(parent,name){
    const icon=make('span',parent);icon.className='dashboard-icon';
    icon.innerHTML='<svg width="24" height="24" aria-hidden="true"><use href="#i-'+name+'"/></svg>';
  }
  function dashboardLink(parent,href,title,description,icon){
    const link=make('a',parent);link.className='dashboard-tile';link.href=href;
    dashboardIcon(link,icon);const text=make('span',link);make('strong',text,title);make('small',text,description);
    return link;
  }
  function decorateHub(app) {
    const cards=Array.from(hubBody.children).filter(x=>x.classList.contains('card'));
    if(!cards.length)return;
    const shell=make('div',hubBody);shell.className='dashboard-shell';hubBody.prepend(shell);
    const heading=make('div',shell);heading.className='dashboard-heading';
    const intro=make('div',heading);
    make('span',intro,'مساحتي الخاصة').className='eyebrow';
    make('h2',intro,'أهلًا بك، '+app.full_name);
    make('p',intro,'عضوية معتمدة • '+(app.membership_number||'رقم العضوية غير متاح'));
    const back=make('a',heading,'إعدادات حسابي');back.href='#account';back.className='btn btn-ghost';
    const menu=make('nav',shell);menu.className='dashboard-tabs';menu.setAttribute('aria-label','خدمات العضو');
    const content=make('div',shell);content.className='dashboard-content';
    const overview=make('div',content);overview.className='dashboard-overview';
    make('h3',overview,'اختر الخدمة التي تحتاج إليها');
    const grid=make('div',overview);grid.className='dashboard-grid';
    const toolbar=make('div',shell);toolbar.className='dashboard-search';
    const search=field(toolbar,'البحث داخل خدماتي','hub-search','search',150);
    search.placeholder='مثال: شكوى، شهادة، وثيقة';
    const result=make('p',toolbar);result.setAttribute('role','status');shell.insertBefore(toolbar,content);
    const backServices=action(menu,'← جميع الخدمات',()=>showGroup('overview'));backServices.className='btn btn-ghost';
    const currentLabel=make('strong',menu);
    function showGroup(key,resetSearch=true){
      const group=hubGroupFor(key);
      if(key!=='overview'&&!group)key='overview';
      activeHubGroup=key;if(resetSearch)search.value='';
      const term=normalizeSearch(search.value);
      overview.hidden=key!=='overview'||!!term;menu.hidden=key==='overview'&&!term;
      currentLabel.textContent=term?'نتائج البحث':group?.[1]||'';
      let count=0;
      cards.forEach(card=>{
        const service=card.dataset.hubService;
        card.hidden=term?!normalizeSearch(card.textContent).includes(term):!(group&&(key===group[0]?group[4].includes(service):service===key));
        if(!card.hidden)count++;
      });
      result.textContent=term?'الأقسام المطابقة: '+new Intl.NumberFormat('ar-EG').format(count):'';
    }
    for(const [key,title,description,icon] of hubGroups){
      const tile=make('button',grid);tile.type='button';tile.className='dashboard-tile';dashboardIcon(tile,icon);
      const text=make('span',tile);make('strong',text,title);make('small',text,description);tile.addEventListener('click',()=>showGroup(key));
    }
    for(const card of cards)content.appendChild(card);
    search.addEventListener('input',()=>showGroup(activeHubGroup,false));
    hubNavigate=showGroup;
    showGroup(activeHubGroup);
  }
  document.addEventListener('click',e=>{
    const serviceLink=e.target.closest?.('[data-admin-service]');if(serviceLink)activeServicePanel=serviceLink.dataset.adminService;
    const adminLink=e.target.closest?.('[data-admin-target]');if(adminLink)activeAdminPanel=adminLink.dataset.adminTarget;
    const link=e.target.closest?.('[data-hub-target]');
    if(!link)return;
    activeHubGroup=link.dataset.hubTarget;
    if(location.hash==='#member-hub'&&hubNavigate){e.preventDefault();hubNavigate(activeHubGroup);}
  });

  function formAction(f, label, fn) {
    var b = make('button', f, label);
    b.type = 'submit';
    b.className = 'btn btn-dark';
    var msg = make('p', f);
    msg.setAttribute('role', 'status');
    f.onsubmit = async e => {
      e.preventDefault();
      if (b.disabled) return;
      b.disabled = true;
      try {
        await fn();
        msg.textContent = 'تم الحفظ بنجاح.';
      } catch (err) {
        msg.textContent = 'تعذر الحفظ. تحقق من الصلاحية والبيانات.';
      } finally {
        b.disabled = false;
      }
    };
  }

  function ok(q) {
    if (q.error) throw q.error;
    return q.data;
  }
  function normalizeSearch(value) {
    return String(value || '').normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').toLocaleLowerCase().trim();
  }

  function attachSearch(parent, label, records) {
    const search = field(parent, label, 'filter', 'search', 150);
    const count = make('p', parent);
    count.setAttribute('aria-live', 'polite');
    const draw = () => {
      const terms = normalizeSearch(search.value).split(/\s+/).filter(Boolean);
      let visible = 0;
      for (const record of records) {
        record.el.hidden = !terms.every(term => normalizeSearch(record.text).includes(term));
        if (!record.el.hidden) visible++;
      }
      count.textContent = 'النتائج: ' + visible + ' من ' + records.length;
    };
    search.addEventListener('input', draw);
    draw();
  }

  function mountEventCalendar(parent, rows) {
    const dated = rows.filter(x => x.event_at && Number.isFinite(Date.parse(x.event_at)))
      .sort((a,b) => Date.parse(a.event_at) - Date.parse(b.event_at));
    const upcoming = dated.filter(x => Date.parse(x.event_at) >= Date.now());
    const card = make('div', parent); card.className = 'family-calendar';
    make('h3', card, 'تقويم المناسبات القادمة');
    if (!upcoming.length) make('p', card, 'لا توجد مناسبات مستقبلية محددة التاريخ.');
    for (const event of upcoming) {
      const row = make('div', card); row.className = 'family-calendar-row';
      const time = make('time', row, new Intl.DateTimeFormat('ar', {dateStyle:'full', timeStyle:'short', timeZone:'Asia/Gaza'}).format(new Date(event.event_at)));
      time.dateTime = new Date(event.event_at).toISOString();
      make('strong', row, event.title);
    }
    make('p', card, 'تُعرض المواعيد بتوقيت غزة. هذه القائمة للأعضاء المعتمدين فقط.');
  }

  const requestFilesBucket='family-request-files';
  async function prepareRequestFile(file){
    if(!file)return null;
    if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type)||file.size>10485760)throw Error('اختر صورة أو PDF بحجم لا يتجاوز ١٠ ميجابايت.');
    return checkArchiveFile(file);
  }
  async function scanRequestFile(row){
    const result=await client().functions.invoke('scan-request-attachment',{body:{request_id:row.id}});
    if(result.error)throw result.error;
    row.attachment_scan_status=result.data.status;row.attachment_scanned_at=result.data.scanned_at;return result.data.status;
  }
  async function uploadRequestFile(row,uid,file){
    const result=ok(await client().storage.from(requestFilesBucket).upload(uid+'/'+row.id,file,{contentType:file.type,upsert:false}));
    try{await scanRequestFile(row);}catch(e){row.attachment_scan_status='pending';}
    return result;
  }
  function requestDownload(parent,row,uid){
    const labels={pending:'بانتظار الفحص',awaiting_scanner:'معزول — محرك الفحص غير متصل',clean:'اجتاز فحص ClamAV',blocked:'محظور — لم يجتز الفحص',error:'معزول — تعذر الفحص'};
    const state=make('p',parent);state.className='attachment-scan-state';
    const refreshState=()=>{state.textContent='حالة المرفق: '+(labels[row.attachment_scan_status]||labels.pending)+(row.attachment_scanned_at?' · '+formatPortalTime(row.attachment_scanned_at):'');download.disabled=row.attachment_scan_status!=='clean';check.hidden=['clean','blocked'].includes(row.attachment_scan_status);};
    const download=action(parent,'تنزيل المرفق',async function(){
      this.disabled=true;
      try{
        const file=ok(await client().storage.from(requestFilesBucket).download(uid+'/'+row.id));
        if(!parent.isConnected||!recoveredSession||!['#member-hub','#member-services-admin'].includes(location.hash))return;
        saveDownload(file,'albarham-request-'+row.id+fileExtension(file),parent);
      }catch(e){alert('المرفق غير متاح أو لم يكتمل رفعه. تحقق من صلاحية الوصول.');}
      finally{refreshState();}
    });
    const check=action(parent,'فحص / تحديث حالة المرفق',async function(){this.disabled=true;try{await scanRequestFile(row);refreshState();}catch(e){state.textContent='تعذر تأكيد نتيجة الفحص. يبقى المرفق معزولًا.';}finally{this.disabled=false;}});
    refreshState();
  }
  async function loadHub() {
    hubNavigate=null;
    hubBody.replaceChildren();
    make('p', hubBody, 'جارٍ تحميل خدمات العضوية…');
    try {
      var user = ok(await client().auth.getUser()).user;
      if (!user) throw Error();
      var uid = user.id;
      var app = ok(await client().from('member_applications').select('status,membership_number,full_name').eq(
        'auth_user_id', uid).maybeSingle());
      hubBody.replaceChildren();
      if (!app || app.status !== 'approved') {
        make('p', hubBody, 'هذه الخدمات مخصصة للأعضاء المعتمدين.');
        var l = make('a', hubBody, 'متابعة حسابي');
        l.href = '#account';
        return;
      }
      if(location.hash!=='#member-hub'||recoveredSession?.user.id!==uid)return;
      const loading=make('div',hubBody);loading.className='row';
      const quickCert=make('a',loading,'عرض الشهادة وتنزيلها');quickCert.href='#certificate';quickCert.className='btn btn-gold';
      make('p',loading,'جارٍ تجهيز بقية الخدمات…').setAttribute('role','status');
      // Start independent reads concurrently after approval; each section handles its own failure.
      const read=query=>Promise.resolve(query).catch(error=>({error}));
      const prefetched={certificate:read(client().rpc('family_my_certificate')),
        profile:read(client().from('family_profiles').select('*').eq('user_id', uid).maybeSingle()),
        lineage:read(client().from('family_lineage').select('*').eq('user_id', uid).order(
          'created_at')),
        directory:read(client().from('family_profiles').select('display_name,profession,city,bio').eq(
            'directory_opt_in', true).order('display_name').limit(100)),
        notices:read(client().from('family_member_notices').select('*').eq('user_id', uid).order(
            'created_at', {
              ascending: false
            }).limit(100)),
        content:read(client().from('family_member_content').select('*').eq('published', true).order(
            'created_at', {
              ascending: false
            }).limit(100))};
      {
        var beforeCount = hubBody.children.length;
        try {
          var card = section(hubBody, 'بطاقتي العائلية الرقمية');
          card.style.cssText =
            'background:#123b30;color:#fff;border:2px solid #c4a45b;border-radius:16px;padding:24px;margin-bottom:16px';
          make('p', card, 'آل برهم • أصالة الجذور وعهد الأجيال');
          make('h2', card, app.full_name);
          make('p', card, 'رقم العضوية: ' + app.membership_number);
          make('p', card, 'عضوية معتمدة');
          var cq = ok(await prefetched.certificate);
          if(cq.length)make('p',card,'تاريخ ووقت اعتماد الشهادة: '+formatPortalTime(cq[0].issued_at));
          if (cq.length) await Promise.race([ensureQR(),new Promise(resolve=>setTimeout(resolve,1800))]);
          if (cq.length && window.QRCode) {
            var qr = make('div', card);
            new QRCode(qr, {
              text: location.origin + location.pathname + '#verify/' + cq[0].verification_token,
              width: 120,
              height: 120
            });
          }
          if (cq.length && window.QRCode) {
            action(card, 'حفظ البطاقة كصورة', () => {
              var canvas = document.createElement('canvas');
              canvas.width = 1200;
              canvas.height = 720;
              var ctx = canvas.getContext('2d');
              ctx.fillStyle = '#123b30';
              ctx.fillRect(0, 0, 1200, 720);
              ctx.strokeStyle = '#c4a56a';
              ctx.lineWidth = 5;
              ctx.strokeRect(25, 25, 1150, 670);
              ctx.textAlign = 'center';
              ctx.fillStyle = '#e6cc99';
              ctx.font = 'bold 76px Arial';
              ctx.fillText('آل برهم', 600, 130);
              ctx.fillStyle = '#fff';
              ctx.font = 'bold 45px Arial';
              ctx.fillText(app.full_name, 600, 245, 1080);
              ctx.font = '32px Arial';
              ctx.fillText(app.membership_number, 600, 315);
              var qrc = card.querySelector('canvas');
              if (qrc) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(480, 355, 240, 240);
                ctx.drawImage(qrc, 490, 365, 220, 220);
              }
              ctx.fillStyle = '#e6cc99';
              ctx.font = '30px Arial';
              ctx.fillText('إدارة آل برهم — بطاقة عضوية رقمية',600,632,1090);
              ctx.font='23px Arial';ctx.fillText('إعداد النسخة: '+formatPortalTime(new Date()),600,665,1090);
              try{saveDownload(new Blob([canvasBytes(canvas,'image/png')],{type:'image/png'}),'albarham-membership.png',card);}catch(e){alert('تعذر حفظ البطاقة. أعد المحاولة.');}
            });
          }
          var certA = make('a', card, 'عرض الشهادة وتنزيلها');
          certA.href = '#certificate';
          certA.className = 'btn btn-gold';
        } catch (e) {
          var existing = Array.from(hubBody.children).slice(beforeCount);
          existing.forEach(x => x.remove());
          var unavailable = section(hubBody, 'البطاقة الرقمية');
          make('p', unavailable, 'تعذر تحميل هذا القسم.');
          action(unavailable, 'إعادة المحاولة', loadHub);
        }
      } {
        var beforeCount = hubBody.children.length;
        try {
          var profile = section(hubBody, 'ملفي الشخصي');
          var p = ok(await prefetched.profile) || {};
          var f = make('form', profile),
            dn = field(f, 'الاسم المعروض', 'name', 'text', 150),
            job = field(f, 'المهنة أو التخصص', 'profession', 'text', 150),
            city = field(f, 'المدينة', 'city', 'text', 100),
            bio = field(f, 'نبذة شخصية', 'bio', 'textarea', 1000);
          dn.required = true;
          dn.value = p.display_name || app.full_name;
          job.value = p.profession || '';
          city.value = p.city || '';
          bio.value = p.bio || '';
          var consent = field(f, 'أوافق على عرض جميع حقول هذا الملف للأعضاء في دليل الكفاءات', 'consent',
            'checkbox');
          consent.checked = !!p.directory_opt_in;
          formAction(f, 'حفظ الملف', async () => {
            ok(await client().from('family_profiles').upsert({
              user_id: uid,
              display_name: dn.value.trim(),
              profession: job.value.trim(),
              city: city.value.trim(),
              bio: bio.value.trim(),
              directory_opt_in: consent.checked,
              updated_at: new Date().toISOString()
            }));
          });
        } catch (e) {
          var existing = Array.from(hubBody.children).slice(beforeCount);
          existing.forEach(x => x.remove());
          var unavailable = section(hubBody, 'الملف الشخصي');
          make('p', unavailable, 'تعذر تحميل هذا القسم.');
          action(unavailable, 'إعادة المحاولة', loadHub);
        }
      } {
        var beforeCount = hubBody.children.length;
        try {
          var tree = section(hubBody, 'شجرة نسبي الشخصية');
          make('p', tree, 'سجل خاص بك؛ المعلومات مدخلة ذاتيًا وليست إثباتًا للنسب.');
          var rels = {
            father: 'الأب',
            mother: 'الأم',
            grandfather: 'الجد',
            grandmother: 'الجدة',
            other: 'صلة أخرى'
          };
          var entries = ok(await prefetched.lineage);
          var diagram = make('div', tree);
          diagram.className = 'card';
          make('h3', diagram, app.full_name);
          var branches = make('div', diagram);
          branches.className = 'grid';
          Object.keys(rels).forEach(k => {
            var matches = entries.filter(x => x.relationship === k);
            if (matches.length) {
              var branch = make('details', branches);
              branch.className = 'card family-tree-branch';
              branch.open = true;
              make('summary', branch, rels[k] + ' (' + matches.length + ')');
              matches.forEach(x => make('p', branch, x.relative_name));
            }
          });
          entries.forEach(x => {
            var line = make('div', tree);
            make('p', line, rels[x.relationship] + ' — ' + x.relative_name + ' | ' + x.source_note);
            action(line, 'حذف', async () => {
              if (confirm('حذف هذا السجل؟')) {
                try {
                  ok(await client().from('family_lineage').delete().eq('id', x.id));
                  loadHub();
                } catch (e) {
                  alert('تعذر الحذف');
                }
              }
            });
          });
          var tf = make('form', tree),
            rn = field(tf, 'اسم القريب', 'name', 'text', 150),
            rr = selectField(tf, 'صلة القرابة', 'relationship', rels),
            rs = field(tf, 'المصدر أو الملاحظة', 'source', 'text', 500);
          rn.required = true;
          formAction(tf, 'إضافة قريب', async () => {
            ok(await client().from('family_lineage').insert({
              user_id: uid,
              relative_name: rn.value.trim(),
              relationship: rr.value,
              source_note: rs.value.trim()
            }));
            loadHub();
          });
        } catch (e) {
          var existing = Array.from(hubBody.children).slice(beforeCount);
          existing.forEach(x => x.remove());
          var unavailable = section(hubBody, 'سجل القرابة');
          make('p', unavailable, 'تعذر تحميل هذا القسم.');
          action(unavailable, 'إعادة المحاولة', loadHub);
        }
      } {
        var beforeCount = hubBody.children.length;
        try {
          var dir = section(hubBody, 'دليل المهن والكفاءات');
          make('p', dir, 'يضم فقط الملفات التي وافق أصحابها على المشاركة.');
          var ds = ok(await prefetched.directory);
          if (!ds.length) make('p', dir, 'لا توجد ملفات مشاركة بعد.');
          var search = field(dir, 'بحث في الدليل', 'search', 'search', 150),
            list = make('div', dir);

          function drawDir() {
            list.replaceChildren();
            ds.filter(x => Object.values(x).join(' ').includes(search.value)).forEach(x => {
              var c = section(list, x.display_name);
              make('p', c, [x.profession, x.city, x.bio].filter(Boolean).join(' • '));
            });
          }
          search.oninput = drawDir;
          drawDir();
        } catch (e) {
          var existing = Array.from(hubBody.children).slice(beforeCount);
          existing.forEach(x => x.remove());
          var unavailable = section(hubBody, 'دليل الكفاءات');
          make('p', unavailable, 'تعذر تحميل هذا القسم.');
          action(unavailable, 'إعادة المحاولة', loadHub);
        }
      } {
        var beforeCount = hubBody.children.length;
        try {
          var inbox = section(hubBody, 'صندوق الإشعارات الخاص');
          var ns = ok(await prefetched.notices);
          var unread = ns.filter(x => !x.read_at).length;
          make('p', inbox, 'غير مقروءة: ' + unread);
          if (!ns.length) make('p', inbox, 'لا إشعارات حتى الآن.');
          const noticeFilter = selectField(inbox, 'عرض الإشعارات', 'notice_filter', {all:'الكل',unread:'غير المقروءة فقط',read:'المقروءة فقط'});
          const noticeRows = [];
          noticeFilter.onchange = () => noticeRows.forEach(x => { x.el.hidden = noticeFilter.value !== 'all' && (noticeFilter.value === 'unread' ? x.read : !x.read); });
          ns.forEach(x => {
            var c = section(inbox, x.title);
            noticeRows.push({el:c,read:Boolean(x.read_at)});
            make('time', c, formatPortalTime(x.created_at));
            make('p', c, x.body);
            make('p', c, x.read_at ? 'مقروء' : 'جديد');
            if (!x.read_at) action(c, 'تحديد كمقروء', async () => {
              try {
                ok(await client().from('family_member_notices').update({
                  read_at: new Date().toISOString()
                }).eq('id', x.id));
                loadHub();
              } catch (e) {
                alert('تعذر الحفظ');
              }
            });
          });
        } catch (e) {
          var existing = Array.from(hubBody.children).slice(beforeCount);
          existing.forEach(x => x.remove());
          var unavailable = section(hubBody, 'الإشعارات');
          make('p', unavailable, 'تعذر تحميل هذا القسم.');
          action(unavailable, 'إعادة المحاولة', loadHub);
        }
      } {
        var beforeCount = hubBody.children.length;
        try {
          var content = ok(await prefetched.content);
          for (var k of ['archive', 'occasion']) {
            var c = section(hubBody, k === 'archive' ? 'الأرشيف الحصري' : 'المناسبات والتهاني');
            var rows = content.filter(x => x.kind === k);
            if (k === 'occasion') mountEventCalendar(c, rows);
            if (!rows.length) make('p', c, 'لم تنشر الإدارة مواد بعد.');
            const records = [];
            const list = make('div', c);
            rows.forEach(x => {
              const item = make('article', list);
              item.className = 'family-content-record';
              make('h3', item, x.title);
              make('p', item, x.body);
              if (x.source_note) make('p', item, 'المصدر: ' + x.source_note).className = 'family-source';
              if (x.event_at) make('p', item, 'موعد المناسبة: ' + formatPortalTime(x.event_at));
              records.push({el:item, text:[x.title,x.body,x.source_note].filter(Boolean).join(' ')});
              if (x.attachment_path) action(item, 'تنزيل المرفق', async function() {
                this.disabled = true;
                try {
                  var file = ok(await client().storage.from('family-archive').download(x
                  .attachment_path));
                  if(!item.isConnected||!recoveredSession||location.hash!=='#member-hub')return;
                  saveDownload(file,x.title+fileExtension(file),item);
                } catch (e) {
                  alert('تعذر تنزيل المرفق.');
                } finally {
                  this.disabled = false;
                }
              });
            });
            attachSearch(c, k === 'archive' ? 'بحث في الأرشيف والمصادر' : 'بحث في المناسبات', records);
          }
        } catch (e) {
          var existing = Array.from(hubBody.children).slice(beforeCount);
          existing.forEach(x => x.remove());
          for (const name of ['الأرشيف', 'المناسبات']) {
            var unavailable = section(hubBody, name);
            make('p', unavailable, 'تعذر تحميل هذا القسم.');
            action(unavailable, 'إعادة المحاولة', loadHub);
          }
        }
      } {
        var beforeCount = hubBody.children.length;
        try {
          var req = section(hubBody, 'الطلبات والمساهمات والشكاوى');
          make('p', req, 'تُرسل طلباتك إلى الإدارة بسرية. يمكنك إرسال طلبات مستقلة متعددة (حتى ١٠ خلال ٢٤ ساعة). لا تدرج بيانات طبية أو مالية حساسة.');
          var rf = make('form', req),
            rk = selectField(rf, 'نوع الطلب', 'kind', kinds),
            rt = field(rf, 'العنوان', 'title', 'text', 150),
            rb = field(rf, 'التفاصيل', 'body', 'textarea', 3000);
          rt.required = rb.required = true;
          rt.minLength = 3; rb.minLength = 5;
          const attachment=field(rf,'مرفق اختياري (صورة أو PDF حتى ١٠ ميجابايت)','request-attachment','file');
          attachment.accept='image/jpeg,image/png,image/webp,application/pdf';
          make('p',rf,'المرفق خاص بصاحب الطلب والإدارة، ولا يُنشر تلقائيًا. تُعاد معالجة الصور لتقليل الحجم. لا تُرسل وثائق حساسة دون ضرورة.').className='hint';
          var send = make('button', rf, 'إرسال طلب جديد');
          send.type = 'submit'; send.className = 'btn btn-gold';
          var requestMsg = make('p', rf); requestMsg.setAttribute('role','status'); requestMsg.setAttribute('aria-live','polite');
          var list = make('div', req); list.className = 'request-history';
          var states = {pending:'قيد المراجعة',accepted:'مقبول',declined:'مرفوض',completed:'مكتمل'};
          var mine = [];
          const uploadedHere=new Set();
          function drawRequests(){
            list.replaceChildren();
            make('h3',list,'سجل طلباتي — '+new Intl.NumberFormat('ar-EG').format(mine.length));
            if(!mine.length)make('p',list,'لم ترسل طلبات بعد.');
            for(const x of mine){
              var card=section(list,(kinds[x.kind]||x.kind)+' — '+x.title);
              make('p',card,'الحالة: '+(states[x.status]||x.status));
              if(x.created_at)make('time',card,formatPortalTime(x.created_at)).dateTime=x.created_at;
              make('p',card,x.body).className='request-body';
              make('p',card,'رد الإدارة: '+(x.reply||'لا رد بعد'));
              if(x.attachment_requested){
                requestDownload(card,x,uid);
                if(x.status==='pending'&&!uploadedHere.has(x.id)){
                  const retry=make('details',card);make('summary',retry,'استكمال رفع المرفق عند الحاجة');const input=field(retry,'اختر الملف','retry-attachment','file');input.accept=attachment.accept;
                  const msg=make('p',retry);msg.setAttribute('role','status');
                  action(retry,'رفع المرفق',async function(){if(!input.files[0]){msg.textContent='اختر الملف أولًا.';return;}this.disabled=true;try{const file=await prepareRequestFile(input.files[0]);await uploadRequestFile(x,uid,file);uploadedHere.add(x.id);drawRequests();requestMsg.textContent='تم رفع المرفق إلى العزل؛ تابع نتيجة الفحص.';}catch(e){msg.textContent='تعذر الرفع أو يوجد مرفق محفوظ مسبقًا. جرّب زر التنزيل للتحقق.';}finally{this.disabled=false;}});
                }
              }
            }
          }
          async function refreshRequests(){
            mine=ok(await client().from('family_member_requests').select('*').eq('user_id',uid).order('created_at',{ascending:false}).limit(100));
            drawRequests();
          }
          var refresh = action(req,'تحديث سجل الطلبات',async()=>{
            refresh.disabled=true;try{await refreshRequests();requestMsg.textContent='تم تحديث السجل.';}catch(e){requestMsg.textContent='تعذر تحديث السجل، حاول مجددًا.';}finally{refresh.disabled=false;}
          });
          rf.onsubmit=async e=>{
            e.preventDefault();
            if(send.disabled)return;
            const title=rt.value.trim(),body=rb.value.trim(),kind=rk.value;
            if(title.length<3||body.length<5){requestMsg.textContent='اكتب عنوانًا من ٣ أحرف على الأقل وتفاصيل من ٥ أحرف على الأقل.';return;}
            send.disabled=true;requestMsg.textContent='جارٍ إرسال طلبك…';
            try{
              let file=null;
              try{file=await prepareRequestFile(attachment.files[0]);}catch(e){requestMsg.textContent=e.message||'ملف غير صالح.';return;}
              const created=ok(await client().from('family_member_requests').insert({user_id:uid,kind,title,body,attachment_requested:!!file}).select('id,kind,title,body,status,reply,created_at,attachment_requested,attachment_scan_status,attachment_scanned_at').single());
              mine=[created,...mine.filter(x=>x.id!==created.id)];
              if(file){
                try{await uploadRequestFile(created,uid,file);uploadedHere.add(created.id);}
                catch(e){drawRequests();rf.reset();requestMsg.textContent='تم حفظ الطلب، لكن لم يتأكد رفع المرفق. استخدم استكمال الرفع في سجل الطلبات دون إعادة إرسال الطلب.';return;}
              }
              drawRequests();rf.reset();
              requestMsg.textContent=file?'تم حفظ الطلب والمرفق. يبقى المرفق معزولًا حتى اجتياز الفحص.':'تم إرسال الطلب بنجاح. يمكنك الآن إرسال طلب آخر.';
            }catch(err){
              const msg=String(err?.message||'');
              requestMsg.textContent=msg.includes('Daily request limit')?'بلغت الحد الوقائي: ١٠ طلبات خلال ٢٤ ساعة. حاول لاحقًا.':err?.code==='42501'?'تعذر الإرسال: تحقق من اعتماد العضوية وصلاحية الجلسة.':err?.code==='23514'?'تعذر الإرسال: تحقق من طول العنوان والتفاصيل ونوع الطلب.':'تعذر تأكيد إرسال الطلب. حدّث السجل أولًا لتجنب التكرار ثم حاول مجددًا.';
            }finally{send.disabled=false;}
          };
          try{await refreshRequests();}catch(e){drawRequests();requestMsg.textContent='تعذر تحميل الطلبات السابقة؛ يمكنك تحديث السجل.';}
        } catch (e) {
          var existing = Array.from(hubBody.children).slice(beforeCount);
          existing.forEach(x => x.remove());
          var unavailable = section(hubBody, 'الطلبات');
          make('p', unavailable, 'تعذر تحميل هذا القسم.');
          action(unavailable, 'إعادة المحاولة', loadHub);
        }
      }
      loading.remove();
      if(location.hash!=='#member-hub'||recoveredSession?.user.id!==uid)return;
      decorateHub(app);
    } catch (e) {
      hubBody.replaceChildren();
      make('p', hubBody, 'تعذر تحميل الخدمات؛ سجل الدخول بحساب معتمد ثم حاول مجددًا.');
      var l = make('a', hubBody, 'حسابي');
      l.href = '#account';
    }
  }
  var activeServicePanel='requests';
  async function loadServicesAdmin() {
    adminServiceBody.replaceChildren();
    const nav=make('div',adminServiceBody);nav.className='dashboard-subnav';
    const back=make('a',nav,'العودة إلى لوحة الإدارة');back.href='#admin';back.className='btn btn-ghost';back.dataset.adminTarget='overview';
    try {
      if (ok(await client().rpc('family_is_admin')) !== true) {
        make('p', adminServiceBody, 'هذه الصفحة للإدارة فقط.');
        return;
      }
      var states = {
        pending: 'قيد المراجعة',
        accepted: 'مقبول',
        declined: 'مرفوض',
        completed: 'مكتمل'
      };
      var req = section(adminServiceBody, 'صندوق طلبات الأعضاء');
      var rows = ok(await client().from('family_member_requests').select('*').order('created_at', {
        ascending: false
      }).limit(200));
      if (!rows.length) make('p', req, 'لا طلبات جديدة.');
      const senderMap = new Map();
      if(rows.length){
        const identity=await client().rpc('family_admin_request_senders',{p_request_ids:rows.map(x=>x.id)});
        if(identity.error)make('p',req,'تعذر تحميل بيانات المرسلين. الطلبات محفوظة؛ تحقق من صلاحيات الإدارة ثم أعد التحميل.');
        else for(const person of identity.data||[])senderMap.set(person.request_id,person);
      }
      const stats=make('div',req);stats.className='family-admin-stats';
      for(const [label,n] of [['الطلبات المعروضة',rows.length],['قيد المراجعة',rows.filter(x=>x.status==='pending').length],['الشكاوى',rows.filter(x=>x.kind==='complaint').length],['المساهمات الأرشيفية',rows.filter(x=>x.kind==='archive').length]]){
        const stat=make('div',stats);stat.className='card';make('strong',stat,new Intl.NumberFormat('ar-EG').format(n));make('p',stat,label);
      }
      const filters=make('div',req);filters.className='request-admin-filters dashboard-filter';
      const search=field(filters,'بحث في الاسم أو رقم العضوية أو الطلب','search','search',150);
      const type=selectField(filters,'نوع الطلب','kind',{all:'كل الأنواع',...kinds});
      const state=selectField(filters,'حالة الطلب','status',{all:'كل الحالات',...states});
      const results=make('p',filters);results.setAttribute('role','status');
      const records=[];
      rows.forEach(x => {
        const person=senderMap.get(x.id);
        const entry=make('details',req);entry.className='card dashboard-record';
        const summary=make('summary',entry);make('strong',summary,(kinds[x.kind]||x.kind)+' — '+x.title);make('small',summary,person?.full_name||'مرسل غير متاح');make('span',summary,states[x.status]||x.status).className='dashboard-state';
        var c=make('div',entry);c.className='dashboard-record-body';
        const identityBox=make('div',c);identityBox.className='request-identity';
        make('h3',identityBox,'بيانات المرسل المسجلة');
        const fields=[['الاسم الكامل',person?.full_name],['رقم العضوية',person?.membership_number],['البريد الإلكتروني',person?.email],['الهاتف',person?.phone],['واتساب',person?.whatsapp],['حالة العضوية',statusLabels[person?.member_status]||person?.member_status],['تاريخ التسجيل',person?.submitted_at?formatPortalTime(person.submitted_at):null]];
        const dl=make('dl',identityBox);
        for(const [label,value] of fields){const cell=make('div',dl);make('dt',cell,label);make('dd',cell,value||'غير متاح');}
        if(!person?.full_name)make('p',identityBox,'لم يُعثر على سجل عضوية مرتبط بهذا الطلب.');
        if(x.created_at)make('p',c,'تاريخ الإرسال: '+new Date(x.created_at).toLocaleString('ar-EG',{timeZone:'Asia/Gaza'}));
        const stateText=make('p',c,'الحالة: '+(states[x.status]||x.status));
        make('p', c, x.body).className='request-body';
        if(x.attachment_requested){make('p',c,'مرفق خاص بالطلب؛ لا يمكن تنزيله إلا بعد اجتياز الفحص ولا يُنشر تلقائيًا.');requestDownload(c,x,x.user_id);}
        const record={el:entry,kind:x.kind,status:x.status,text:[x.title,x.body,kinds[x.kind],states[x.status],person?.full_name,person?.membership_number,person?.email,person?.phone,person?.whatsapp].filter(Boolean).join(' ')};records.push(record);
        var f = make('form', c),
          st = selectField(f, 'القرار', 'status', states),
          rp = field(f, 'رد الإدارة', 'reply', 'textarea', 2000);
        st.value = x.status;
        rp.value = x.reply;
        formAction(f, 'حفظ القرار', async () => {
          ok(await client().from('family_member_requests').update({
            status: st.value,
            reply: rp.value
          }).eq('id', x.id).select('id').single());
          record.status=st.value;record.text=[x.title,x.body,kinds[x.kind],states[st.value],person?.full_name,person?.membership_number,person?.email,person?.phone,person?.whatsapp].filter(Boolean).join(' ');summary.querySelector('.dashboard-state').textContent=states[st.value]||st.value;stateText.textContent='الحالة: '+(states[st.value]||st.value);applyRequestFilters();
        });
        var nf = make('form', c),
          nt = field(nf, 'عنوان الإشعار', 'title', 'text', 150),
          nb = field(nf, 'رسالة خاصة للعضو', 'body', 'textarea', 3000);
        nt.required = nb.required = true;
        formAction(nf, 'إرسال إشعار خاص', async () => {
          ok(await client().from('family_member_notices').insert({
            user_id: x.user_id,
            title: nt.value,
            body: nb.value
          }));
          nf.reset();
        });
      });
      function applyRequestFilters(){
        const terms=normalizeSearch(search.value).split(/\s+/).filter(Boolean);let count=0;
        for(const r of records){r.el.hidden=(type.value!=='all'&&r.kind!==type.value)||(state.value!=='all'&&r.status!==state.value)||!terms.every(t=>normalizeSearch(r.text).includes(t));if(!r.el.hidden)count++;}
        results.textContent='النتائج: '+new Intl.NumberFormat('ar-EG').format(count)+' من '+new Intl.NumberFormat('ar-EG').format(records.length);
      }
      search.oninput=type.onchange=state.onchange=applyRequestFilters;applyRequestFilters();
      action(req,'تحديث الطلبات',()=>guardPrivate(loadServicesAdmin));
      var pub = section(adminServiceBody, 'نشر الأرشيف والمناسبات'),
        f = make('form', pub),
        k = selectField(f, 'القسم', 'kind', {
          archive: 'الأرشيف',
          occasion: 'المناسبات'
        }),
        t = field(f, 'العنوان', 'title', 'text', 150),
        b = field(f, 'المحتوى', 'body', 'textarea', 10000);
      t.required = b.required = true;
      const sourceNote = field(f, 'مصدر الوثيقة أو مرجعها (اختياري)', 'source_note', 'text', 500);
      const eventDate = field(f, 'موعد المناسبة (بتوقيت جهازك؛ تأكد من المنطقة الزمنية)', 'event_at', 'datetime-local');
      eventDate.parentNode.hidden = k.value !== 'occasion';
      var file = field(f, 'مرفق اختياري للأرشيف (صورة أو PDF، حتى 10 MB)', 'attachment', 'file');
      file.accept = 'image/jpeg,image/png,image/webp,application/pdf';
      file.hidden = k.value !== 'archive';
      file.parentNode.hidden = file.hidden;
      k.onchange = () => {
        file.hidden = file.parentNode.hidden = k.value !== 'archive';
        eventDate.parentNode.hidden = k.value !== 'occasion';
        if (eventDate.parentNode.hidden) eventDate.value = '';
        if (file.hidden) file.value = '';
      };
      formAction(f, 'نشر للأعضاء', async () => {
        var path = null;
        var selected = file.files[0];
        if (selected && k.value === 'archive') {
          selected = await checkArchiveFile(selected);
          path = crypto.randomUUID() + '.' + ({
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'application/pdf': 'pdf'
          } [selected.type]);
          ok(await client().storage.from('family-archive').upload(path, selected, {
            contentType: selected.type,
            upsert: false
          }));
        }
        try {
          ok(await client().from('family_member_content').insert({
            kind: k.value,
            title: t.value,
            body: b.value,
            published: true,
            source_note: sourceNote.value.trim() || null,
            event_at: k.value === 'occasion' && eventDate.value ? new Date(eventDate.value).toISOString() : null,
            attachment_path: path
          }));
        } catch (e) {
          if (path) await client().storage.from('family-archive').remove([path]);
          throw e;
        }
        loadServicesAdmin();
      });
      const serviceTabs=make('div',nav);serviceTabs.className='dashboard-tabs';
      const requestsButton=action(serviceTabs,'طلبات الأعضاء',()=>showServices('requests'));
      const contentButton=action(serviceTabs,'الأرشيف والمناسبات',()=>showServices('content'));
      function showServices(key){activeServicePanel=key;req.hidden=key!=='requests';pub.hidden=key!=='content';requestsButton.setAttribute('aria-pressed',String(key==='requests'));contentButton.setAttribute('aria-pressed',String(key==='content'));}
      showServices(activeServicePanel);
      var items = ok(await client().from('family_member_content').select('*').order('created_at', {
        ascending: false
      }).limit(100));
      items.forEach(x => {
        var c = section(pub, x.title);
        make('p', c, x.published ? 'منشور' : 'غير منشور');
        if (x.event_at) make('p', c, 'الموعد: ' + formatPortalTime(x.event_at));
        if (x.source_note) make('p', c, 'المصدر: ' + x.source_note);
        action(c, x.published ? 'إخفاء' : 'إعادة نشر', async () => {
          try {
            ok(await client().from('family_member_content').update({
              published: !x.published
            }).eq('id', x.id));
            loadServicesAdmin();
          } catch (e) {
            alert('تعذر الحفظ');
          }
        });
      });
    } catch (e) {
      make('p', adminServiceBody, 'تعذر تحميل خدمات الإدارة.');
    }
  }

  var heritage = newView('heritage', 'العائلة والتراث'),
    community = newView('community', 'الأخبار والمجتمع');

  function collection(parent, items) {
    var g = make('div', parent);
    g.className = 'grid';
    items.forEach(function(x) {
      var l = make('a', g);
      l.className = 'card';
      l.href = '#' + x[0];
      var ic = make('div', l);
      ic.className = 'ic';
      ic.innerHTML = '<svg width="26" height="26" aria-hidden="true"><use href="#i-' + x[2] + '"/></svg>';
      make('h3', l, x[1]);
      make('p', l, x[3]);
    });
  }
  collection(heritage, [
    ['history', 'تاريخ العائلة', 'landmark', 'الجذور والذاكرة'],
    ['tree', 'شجرة العائلة', 'network', 'صلة الأجيال'],
    ['archive', 'الأرشيف والحكايات', 'archive', 'الوثائق والصور والروايات']
  ]);
  collection(community, [
    ['initiatives', 'المبادرات', 'heart', 'العطاء والتعاون'],
    ['contact', 'التواصل', 'users', 'الاستفسارات والمقترحات']
  ]);

  var publicSearch = newView('search','البحث في الموقع');
  const searchForm=make('form',publicSearch);searchForm.className='card';
  make('p',searchForm,'ابحث في أقسام البوابة وأحدث الأخبار والمواد العامة المنشورة. لا يشمل البحث بيانات العضوية أو المراسلات أو أسماء الأفراد في الشجرة.');
  const publicQuery=field(searchForm,'عبارة البحث','public-query','search',120);publicQuery.required=true;publicQuery.minLength=2;
  const searchSubmit=make('button',searchForm,'بحث');searchSubmit.type='submit';searchSubmit.className='btn btn-gold';
  const searchStatus=make('p',searchForm);searchStatus.setAttribute('role','status');
  const searchResults=make('div',publicSearch);searchResults.className='public-search-results';
  const publicRoutes=[
    ['تاريخ العائلة','الجذور والذاكرة والتاريخ والروايات','history'],
    ['شجرة العائلة','الأنساب والأجيال والفروع','tree'],
    ['الأرشيف والحكايات','الوثائق والصور والروايات','archive'],
    ['أخبار العائلة','الأخبار والإعلانات والتهاني والمناسبات','news'],
    ['المبادرات','التكافل والتعاون والمقترحات','initiatives'],
    ['العضوية','التسجيل والتحقق من الشهادات','membership'],
    ['التواصل','مراسلة الإدارة وتصحيح المعلومات','contact'],
    ['الخصوصية','حماية البيانات والمعلومات','privacy']
  ];
  searchForm.onsubmit=async e=>{
    e.preventDefault();if(searchSubmit.disabled)return;
    const terms=normalizeSearch(publicQuery.value).split(/\s+/).filter(Boolean);if(!terms.length)return;
    searchSubmit.disabled=true;searchStatus.textContent='جارٍ البحث…';searchResults.replaceChildren();
    try{
      const matching=(v)=>terms.every(t=>normalizeSearch(v).includes(t));
      const found=publicRoutes.filter(x=>matching(x[0]+' '+x[1])).map(x=>({title:x[0],desc:x[1],url:'#'+x[2]}));
      const requests=[
        ()=>client().from('family_news').select('id,title,body,category').eq('published',true).order('created_at',{ascending:false}).limit(100),
        ()=>client().from('family_public_content').select('section,title,body').eq('published',true).order('created_at',{ascending:false}).limit(100)
      ];
      const settled=await Promise.allSettled(requests.map(fn=>Promise.resolve().then(fn)));
      let partial=false;
      for(let i=0;i<settled.length;i++){
        const r=settled[i];if(r.status!=='fulfilled'||r.value.error){partial=true;continue;}
        for(const item of r.value.data||[]){
          if(!matching([item.title,item.body,item.category,sectionsCMS[item.section]].filter(Boolean).join(' ')))continue;
          if(i===0&&/^[0-9a-f-]{36}$/i.test(item.id))found.push({title:item.title,desc:(item.body||'').slice(0,180),url:'#news/'+item.id});
          if(i===1&&Object.hasOwn(sectionsCMS,item.section))found.push({title:item.title,desc:(item.body||'').slice(0,180),url:'#'+item.section});
        }
      }
      for(const item of found){const card=make('article',searchResults);card.className='card';make('h3',card,item.title);make('p',card,item.desc);const link=make('a',card,'فتح القسم أو الخبر');link.href=item.url;link.className='btn btn-ghost';}
      if(!found.length)make('p',searchResults,'لا توجد نتائج مطابقة. جرّب عبارة أخرى.');
      searchStatus.textContent='النتائج: '+new Intl.NumberFormat('ar-EG').format(found.length)+(partial?' — تعذر تحميل بعض المحتوى، والنتائج جزئية.':' — البحث يشمل آخر ١٠٠ مادة من كل مصدر.');
    }catch(err){searchStatus.textContent='تعذر إكمال البحث. حاول مجددًا.';}finally{searchSubmit.disabled=false;}
  };
  var newsEditor = newView('news-admin', 'إدارة الأخبار'),
    newsEditorBody = make('div', newsEditor);
  const newsBack=make('a',newsEditor,'العودة إلى إدارة المحتوى');newsBack.href='#admin';newsBack.className='btn btn-ghost';newsBack.dataset.adminTarget='content';newsEditor.insertBefore(newsBack,newsEditorBody);
  var newsLink = make('a', admin, 'إدارة الأخبار والمناسبات');
  newsLink.href = '#news-admin';
  newsLink.hidden=true;
  newsLink.className = 'btn btn-gold';
  var newsLabels = {
    news: 'خبر عائلي',
    occasion: 'مناسبة',
    announcement: 'إعلان عائلي'
  };
  var newsEpoch = 0;

  function newsPhotos(row) {
    return [...new Set([...(row.image_paths || []), ...(row.image_path ? [row.image_path] : [])])];
  }

  function newsCover(row) {
    return (row.cover_paths || []).filter(p => newsPhotos(row).includes(p)).slice(0, 3);
  }

  var photoCache = new Map();
  async function photoURLs(paths) {
    var now = Date.now();
    for (const [key, entry] of photoCache) if (entry.until < now) photoCache.delete(key);
    var missing = [...new Set(paths)].filter(p => !photoCache.has(p) || photoCache.get(p).until < now);
    if (missing.length) {
      var z = await client().storage.from('family-news').createSignedUrls(missing, 900);
      if (z.error) throw z.error;
      for (const item of z.data || []) {
        if (item.signedUrl) photoCache.set(item.path, {
          url: item.signedUrl,
          until: now + 780000
        });
      }
    }
    return paths.map(p => { const entry = photoCache.get(p); return entry && entry.until >= Date.now() ? entry.url : null; });
  }

  function showPhotoGallery(urls, title, index) {
    var d = make('dialog', document.body);
    d.className = 'photo-dialog';
    d.setAttribute('aria-label', 'معرض الصور');
    var close = make('button', d, 'إغلاق ×');
    close.className = 'btn btn-ghost';
    close.onclick = () => d.close();
    var img = make('img', d);
    img.alt = title;
    var controls = make('div', d);
    controls.className = 'photo-controls';
    var prev = make('button', controls, 'السابق'),
      count = make('span', controls),
      next = make('button', controls, 'التالي');
    prev.className = next.className = 'btn btn-ghost';

    function draw() {
      img.src = urls[index];
      count.textContent = (index + 1) + ' / ' + urls.length;
      prev.disabled = index === 0;
      next.disabled = index === urls.length - 1;
    }
    prev.onclick = () => {
      if (index > 0) {
        index--;
        draw();
      }
    };
    next.onclick = () => {
      if (index < urls.length - 1) {
        index++;
        draw();
      }
    };
    var x = 0;
    img.addEventListener('touchstart', e => {
      x = e.changedTouches[0].clientX;
    }, {
      passive: true
    });
    img.addEventListener('touchend', e => {
      var delta = e.changedTouches[0].clientX - x;
      if (Math.abs(delta) > 45) {
        index = Math.max(0, Math.min(urls.length - 1, index + (delta > 0 ? 1 : -1)));
        draw();
      }
    }, {
      passive: true
    });
    d.addEventListener('close', () => d.remove());
    draw();
    d.showModal();
  }

  // Public news images are requested close to the viewport, not for the entire feed.
  function nearViewport(element, callback, immediate = false) {
    if (immediate || typeof IntersectionObserver !== 'function') { callback(); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        if (element.isConnected) callback();
      }
    }, {rootMargin:'250px 0px'});
    observer.observe(element);
    // Disconnect observers for galleries removed by navigation.
    const cleanup = () => { observer.disconnect(); };
    window.addEventListener('hashchange', cleanup, {once:true});
  }

  function newsGallery(parent, paths, title, cover) {
    if (!paths.length) return;
    var g = make('div', parent);
    g.className = 'news-gallery' + (cover ? ' news-cover' : '');
    g.dataset.count = String(paths.length);
    var urls = [];
    var items = paths.map((path, i) => {
      var a = make('button', g);
      a.type = 'button';
      a.className = 'news-gallery-item';
      a.setAttribute('aria-label', 'عرض الصورة ' + (i + 1));
      var im = make('img', a);
      im.alt = title + ' — صورة ' + (i + 1);
      const priority = parent.classList.contains('home-news-card') && i === 0;
      im.loading = priority ? 'eager' : 'lazy';
      im.fetchPriority = priority ? 'high' : 'low';
      im.decoding = 'async';
      a.disabled = true;
      a.onclick = () => {
        var valid = urls.filter(Boolean);
        showPhotoGallery(valid, title, valid.indexOf(urls[i]));
      };
      return {
        a,
        im
      };
    });
    if (cover && paths.length > 1) make('p', parent, 'اسحب لمشاهدة الصور • ' + paths.length + ' صور').className =
      'gallery-hint';
    const load = () => photoURLs(paths).then(result => {
      if (!g.isConnected) return;
      urls = result;
      items.forEach(({
        a,
        im
      }, i) => {
        if (urls[i] && im.isConnected) {
          im.src = urls[i];
          a.disabled = false;
        } else a.remove();
      });
    }).catch(() => {
      if (!g.isConnected) return;
      g.replaceChildren();
      make('p', g, 'تعذر تحميل الصور.');
    });
    nearViewport(g, load, parent.classList.contains('home-news-card'));
  }

  async function loadPublicNews() {
    var epoch = ++newsEpoch,
      feed = $('#public-news-list'),
      home = $('#home-latest-news'),
      hash = location.hash || '#home',
      isHome = hash === '#home';
    if (!isHome && hash !== '#news' && !hash.startsWith('#news/')) return;
    var target = isHome ? home : feed;
    target.setAttribute('aria-busy','true');
    try {
      var selected = hash.startsWith('#news/') ? hash.slice(6) : '';
      if (selected && !/^[0-9a-f-]{36}$/i.test(selected)) {
        target.replaceChildren();
        make('p', target, 'رابط الخبر غير صالح.');
        return;
      }
      var query = client().from('family_news').select(
        'id,title,body,category,image_path,image_paths,cover_paths,created_at').eq('published', true);
      var rows = ok(await (selected ? query.eq('id', selected) : query.order('created_at', {
        ascending: false
      }).limit(isHome ? 1 : 50)));
      if (epoch !== newsEpoch || (location.hash || '#home') !== hash) return;
      target.replaceChildren();
      if (!rows.length) {
        make('p', target, selected ? 'الخبر غير متاح.' : 'لا أخبار منشورة حاليًا.');
        if (selected) {
          var a = make('a', target, 'جميع الأخبار');
          a.href = '#news';
        }
        return;
      }
      if (isHome) {
        var latest = rows[0],
          teaser = make('article', home);
        teaser.className = 'home-news-card';
        make('span', teaser, newsLabels[latest.category] || 'آخر الأخبار').className = 'home-news-label';
        make('h3', teaser, latest.title);
        make('time', teaser, formatPortalTime(latest.created_at)).className = 'news-date';
        newsGallery(teaser, newsCover(latest), latest.title, true);
        var excerpt = latest.body.split('\n').filter(x => x.trim() && !x.startsWith('بسم') && !x.startsWith('﴿'))[
          0] || latest.body;
        make('p', teaser, excerpt.slice(0, 260));
        var read = make('a', teaser, 'قراءة الخبر');
        read.href = '#news/' + latest.id;
        read.className = 'btn btn-gold';
        return;
      }
      var visible = rows;
      const newsRecords = [];
      if (selected) {
        var back = make('a', feed, 'جميع الأخبار');
        back.href = '#news';
        back.className = 'btn btn-ghost';
      }
      if (!visible.length) make('p', feed, 'الخبر غير متاح.');
      for (const x of visible) {
        var c = make('article', feed);
        c.className = 'card lux-news-card';
        newsRecords.push({el:c, text:[x.title,x.body,newsLabels[x.category]].filter(Boolean).join(' ')});
        make('span', c, newsLabels[x.category] || 'خبر').className = 'lux-badge';
        make('h2', c, x.title).className = 'lux-title';
        make('time', c, formatPortalTime(x.created_at)).className = 'news-date';
        if (!selected) {
          newsGallery(c, newsCover(x), x.title, true);
          var excerpt = make('p', c, x.body.split(/\n\s*\n/).filter(v => !v.startsWith('بسم'))[0]?.slice(0, 250) ||
            x.body.slice(0, 250));
          var open = make('a', c, 'قراءة الإعلان الكامل' + (newsPhotos(x).length ? ' • ' + newsPhotos(x).length +
            ' صور' : ''));
          open.className = 'btn btn-gold';
          open.href = '#news/' + x.id;
          continue;
        }
        newsGallery(c, newsCover(x), x.title, true);
        var blocks = x.body.split(/\n\s*\n/);
        for (const block of blocks) {
          if (block.startsWith('بسم الله الرحمن الرحيم') && block.includes('﴿')) {
            var verse = make('div', c);
            verse.className = 'lux-verse-box';
            make('p', verse, 'بسم الله الرحمن الرحيم').className = 'lux-bismillah';
            make('blockquote', verse, block.split('\n').slice(1).join('\n')).className = 'lux-verse';
          } else if (block.startsWith('أعضاء المجلس\n')) {
            make('h3', c, 'أعضاء المجلس').className = 'lux-section-title';
            var ol = make('ol', c);
            ol.className = 'lux-members';
            block.split('\n').slice(1).filter(Boolean).forEach(n => make('li', ol, n));
          } else {
            var para = make('p', c, block);
            para.style.whiteSpace = 'pre-line';
          }
        }
        var rest = newsPhotos(x).filter(path => !newsCover(x).includes(path));
        if (rest.length) {
          make('h3', c, 'صور من الإعلان').className = 'lux-section-title';
          newsGallery(c, rest, x.title, false);
        }
        var share = make('a', c, 'مشاركة عبر واتساب');
        share.className = 'btn btn-gold';
        share.target = '_blank';
        share.rel = 'noopener noreferrer';
        share.href = 'https://wa.me/?text=' + encodeURIComponent(x.title + '\n' + location.origin + location
          .pathname + '#news/' + x.id);
      }
      if (!selected) { const searchBox = make('div', feed); feed.prepend(searchBox); attachSearch(searchBox, 'بحث في الأخبار المنشورة (آخر ٥٠ خبرًا)', newsRecords); }
    } catch (e) {
      if (epoch !== newsEpoch || (location.hash || '#home') !== hash) return;
      target.replaceChildren();
      make('p', target, 'تعذر تحميل الأخبار. تحقق من الاتصال.');
      action(target, 'إعادة المحاولة', loadPublicNews);
    } finally {
      if (epoch === newsEpoch) target.removeAttribute('aria-busy');
    }
  }

  async function loadNewsEditor() {
    newsEditorBody.replaceChildren();
    try {
      if (ok(await client().rpc('family_is_admin')) !== true) {
        make('p', newsEditorBody, 'هذه الصفحة للإدارة فقط.');
        return;
      }
      var list = ok(await client().from('family_news').select('*').order('created_at', {
        ascending: false
      }).limit(100));

      function editor(parent, item) {
        var d = make('details', parent);
        d.className = 'card';
        d.open = !item;
        make('summary', d, item ? (item.published ? 'منشور: ' : 'مسودة: ') + item.title : 'نشر خبر جديد');
        var f = make('form', d),
          t = field(f, 'العنوان', 'title', 'text', 180),
          b = field(f, 'النص', 'body', 'textarea', 12000),
          k = selectField(f, 'التصنيف', 'kind', newsLabels),
          im = field(f, 'اختيار الصور', 'image', 'file'),
          p = field(f, 'إظهار الخبر للعامة', 'published', 'checkbox');
        im.accept = 'image/*';
        im.multiple = true;
        im.parentNode.hidden = true;
        t.required = b.required = true;
        t.value = item?.title || '';
        b.value = item?.body || '';
        k.value = item?.category || 'announcement';
        p.checked = item ? item.published : false;
        var original = item ? newsPhotos(item) : [],
          entries = original.map(path => ({
            path,
            cover: newsCover(item).includes(path)
          }));
        var panel = make('div', f);
        make('p', panel, 'حدد حتى ثلاث صور للواجهة. باقي الصور تظهر داخل الخبر.').className = 'note';
        var controls = make('div', panel);
        controls.className = 'row';
        var coverBtn = make('button', controls, 'إضافة صور للواجهة');
        coverBtn.type = 'button';
        coverBtn.className = 'btn btn-gold';
        var insideBtn = make('button', controls, 'إضافة صور داخل الإعلان');
        insideBtn.type = 'button';
        insideBtn.className = 'btn btn-dark';
        var mode = 'cover';
        coverBtn.onclick = () => {
          mode = 'cover';
          im.click();
        };
        insideBtn.onclick = () => {
          mode = 'inside';
          im.click();
        };
        make('p', panel, 'يمكنك الضغط على زر الإضافة مرة أخرى لاختيار صورة جديدة دون فقد الصور السابقة.')
          .className = 'note';
        var status = make('p', panel),
          grid = make('div', panel);
        grid.className = 'news-edit-grid';
        var saving = false;

        function draw() {
          grid.replaceChildren();
          status.textContent = 'الصور: ' + entries.length + ' / 20 — الواجهة: ' + entries.filter(e => e.cover)
            .length + ' / 3';
          entries.forEach((entry, i) => {
            var c = make('div', grid);
            c.className = 'news-edit-photo';
            var img = make('img', c);
            img.alt = 'صورة ' + (i + 1);
            img.loading = 'lazy';
            if (entry.file) img.src = entry.preview;
            else client().storage.from('family-news').createSignedUrl(entry.path, 900).then(z => {
              if (!z.error && img.isConnected) img.src = z.data.signedUrl;
            }).catch(() => {});
            var l = make('label', c),
              check = make('input', l);
            check.type = 'checkbox';
            check.checked = entry.cover;
            make('span', l, ' عرض في الواجهة');
            check.onchange = () => {
              if (saving) {
                check.checked = entry.cover;
                return;
              }
              if (check.checked && entries.filter(e => e.cover).length >= 3) {
                check.checked = false;
                alert('يمكن اختيار ثلاث صور للواجهة كحد أقصى.');
                return;
              }
              entry.cover = check.checked;
              status.textContent = 'الصور: ' + entries.length + ' / 20 — الواجهة: ' + entries.filter(e => e
                .cover).length + ' / 3';
            };
            var del = make('button', c, 'إزالة');
            del.type = 'button';
            del.className = 'btn btn-ghost';
            del.onclick = () => {
              if (saving) return;
              if (entry.preview) URL.revokeObjectURL(entry.preview);
              entries = entries.filter(e => e !== entry);
              draw();
            };
          });
        }
        im.onchange = async () => {
          var files = Array.from(im.files),
            target = mode;
          im.value = '';
          if (saving || !files.length) return;
          coverBtn.disabled = insideBtn.disabled = true;
          try {
            for (const file of files) {
              if (entries.length >= 20) {
                alert('وصلت إلى الحد الأقصى: 20 صورة.');
                break;
              }
              if (target === 'cover' && entries.filter(e => e.cover).length >= 3) {
                alert('اكتملت صور الواجهة؛ استخدم زر إضافة صور داخل الإعلان.');
                break;
              }
              var prepared;
              try {
                prepared = await cleanImage(file, 5242880);
              } catch (e) {
                alert('تعذر قراءة الصورة: ' + file.name);
                continue;
              }
              entries.push({
                file: prepared,
                preview: URL.createObjectURL(prepared),
                cover: target === 'cover'
              });
              draw();
            }
          } finally {
            coverBtn.disabled = insideBtn.disabled = false;
          }
        };
        draw();
        formAction(f, 'حفظ الخبر', async () => {
          if (saving || coverBtn.disabled) throw Error('انتظر تجهيز الصور');
          saving = true;
          im.disabled = coverBtn.disabled = insideBtn.disabled = true;
          var uploaded = [];
          try {
            var paths = [],
              covers = [],
              total = entries.filter(e => e.file).length;
            status.textContent = 'جارٍ رفع ' + total + ' صور…';
            for (const entry of entries) {
              var path = entry.path;
              if (entry.file) {
                path = crypto.randomUUID() + '.' + ({
                  'image/jpeg': 'jpg',
                  'image/png': 'png',
                  'image/webp': 'webp'
                } [entry.file.type]);
                ok(await client().storage.from('family-news').upload(path, entry.file, {
                  contentType: entry.file.type,
                  upsert: false
                }));
                uploaded.push(path);
                status.textContent = 'تم رفع ' + uploaded.length + ' من ' + total + ' صور';
              }
              paths.push(path);
              if (entry.cover) covers.push(path);
            }
            var data = {
              title: t.value.trim(),
              body: b.value.trim(),
              category: k.value,
              image_path: paths[0] || null,
              image_paths: paths,
              cover_paths: covers,
              published: p.checked
            };
            if (item) ok(await client().from('family_news').update({
              ...data,
              updated_at: new Date().toISOString()
            }).eq('id', item.id));
            else ok(await client().from('family_news').insert(data));
          } catch (e) {
            if (uploaded.length) await client().storage.from('family-news').remove(uploaded);
            throw e;
          } finally {
            saving = false;
            im.disabled = coverBtn.disabled = insideBtn.disabled = false;
          }
          entries.forEach(e => {
            if (e.preview) URL.revokeObjectURL(e.preview);
          });
          await loadNewsEditor();
          loadPublicNews();
        });
      }
      editor(newsEditorBody, null);
      list.forEach(x => editor(newsEditorBody, x));
    } catch (e) {
      make('p', newsEditorBody, 'تعذر تحميل إدارة الأخبار. تحقق من الاتصال والصلاحية.');
    }
  }

  function extraRoute() {
    var nh = location.hash;
    if (['#account', '#admin', '#member-hub', '#member-services-admin', '#news-admin', '#certificate', '#mfa',
        '#security'
      ].includes(nh) && !authReady) return;
    if (nh === '#mfa') {
      loadMfa();
      return;
    }
    if (nh === '#security') {
      guardPrivate(loadSecurity);
      return;
    }
    if (nh === '' || nh === '#home' || nh === '#news' || nh.startsWith('#news/')) loadPublicNews();
    if (nh === '#news-admin') guardPrivate(loadNewsEditor);
    if (['#history','#tree','#archive'].includes(nh))renderPublicCMS().catch(()=>{});
    if (location.hash === '#reset') showReset();
    var hash = location.hash.slice(1);
    if (hash === 'admin') guardPrivate(loadAdmin);
    if (hash === 'member-hub') guardPrivate(loadHub);
    if (hash === 'member-services-admin') guardPrivate(loadServicesAdmin);
    if (hash === 'certificate') guardPrivate(loadCertificate);
    if (hash === 'verify' || hash.startsWith('verify/')) {
      if (hash.startsWith('verify/')) {
        tokenInput.value = hash.slice(7);
        verifyToken(tokenInput.value);
      } else verifyBody.textContent = 'امسح رمز QR أو أدخل رمز التحقق.';
    }
  }
  window.addEventListener('hashchange', extraRoute);
  var reset = newView('reset', 'استعادة كلمة المرور'),
    resetBox = make('div', reset);
  resetBox.className = 'card';
  var resetMsg = make('p', resetBox);
  var resetForm = make('form', resetBox),
    resetInput = field(resetForm, 'البريد الإلكتروني', 'email', 'email', 254);
  resetInput.required = true;
  formAction(resetForm, 'إرسال رابط الاستعادة', async () => {
    try {
      var z = await client().auth.resetPasswordForEmail(resetInput.value.trim(), {
        redirectTo: location.origin + location.pathname + '?page=reset',
        captchaToken: await window.familyCaptcha.token(resetForm)
      });
      if (z.error) throw z.error;
      resetMsg.textContent = 'إذا كان الحساب موجودًا فستصلك رسالة الاستعادة.';
    } finally { window.familyCaptcha.reset(resetForm); }
  });
  var changeForm = make('form', resetBox),
    newPass = field(changeForm, 'كلمة المرور الجديدة', 'password', 'password', 128);
  newPass.required = true;
  newPass.minLength = 15;
  changeForm.hidden = true;
  formAction(changeForm, 'حفظ كلمة المرور الجديدة', async () => {
    if (!validNewPassword(newPass.value)) throw Error('كلمة المرور غير صالحة');
    const password = newPass.value;
    const leakMessage = await requirePasswordScreen(password);
    if (leakMessage) { alert(leakMessage); throw Error('Password screening failed'); }
    var z = await client().auth.updateUser({
      password: password
    });
    if (z.error) throw z.error;
    changeForm.reset();
    location.hash = 'account';
  });

  function prepareCaptcha() {
    const routes = {'#register': $('#regForm'), '#login': $('#logForm'), '#reset': resetForm};
    const form = routes[location.hash];
    if (form && !form.hidden) window.familyCaptcha.prepare(form).catch(() => {});
  }
  window.addEventListener('hashchange', prepareCaptcha);
  prepareCaptcha();

  function showReset() {
    resetMsg.textContent = changeForm.hidden ? 'أدخل بريد حسابك لاستعادة كلمة المرور.' : 'اختر كلمة مرور جديدة.';
  }
  var forgot = make('a', $('#logForm'), 'نسيت كلمة المرور؟');
  forgot.href = '#reset';
  forgot.className = 'more';
  try {
    client().auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        resetForm.hidden = true;
        changeForm.hidden = false;
        location.hash = 'reset';
        resetMsg.textContent = 'اختر كلمة مرور جديدة.';
      }
    });
  } catch (e) {}

  var mfaPage = newView('mfa', 'التحقق الثنائي'),
    mfaBody = make('div', mfaPage);
  mfaBody.className = 'card';
  var mfaReturn = '#account',
    mfaBusy = false;
  var mfaLink = make('a', pwBox, 'التحقق الثنائي');
  mfaLink.href = '#mfa';
  mfaLink.className = 'btn btn-dark';
  async function guardPrivate(fn) {
    const requestedHash = location.hash;
    try {
      var session = await client().auth.getSession();
      if (location.hash !== requestedHash) return;
      if (session.error) throw session.error;
      if (!session.data.session) {
        clearPrivate();
        if (location.hash !== '#account') sessionStorage.setItem('family_after_login', location.hash.slice(1));
        location.hash = 'login';
        return;
      }
      const [verifiedUser,assurance] = await Promise.all([client().auth.getUser(),client().auth.mfa.getAuthenticatorAssuranceLevel()]);
      if (location.hash !== requestedHash) return;
      if (verifiedUser.error || !verifiedUser.data.user || verifiedUser.data.user.id !== session.data.session.user.id) throw Error('Session verification failed');
      var level = ok(assurance);
      if (location.hash !== requestedHash) return;
      if (level.nextLevel === 'aal2' && level.currentLevel !== 'aal2') {
        mfaReturn = location.hash;
        location.hash = 'mfa';
        return;
      }
      const view = document.getElementById('v-' + requestedHash.slice(1));
      view?.querySelector('.access-error')?.remove();
      await fn();
      if (!recoveredSession || recoveredSession.user.id !== verifiedUser.data.user.id) clearPrivate();
    } catch (e) {
      if (location.hash !== requestedHash) return;
      clearPrivate();
      var view = document.getElementById('v-' + location.hash.slice(1));
      if (view && !view.querySelector('.access-error')) {
        var msg = make('p', view.querySelector('.wrap') || view,
          'تعذر التحقق من الحساب. أعد فتح الصفحة عند استقرار الاتصال.');
        msg.className = 'access-error';
      }
    }
  }
  async function loadMfa() {
    if (mfaBusy) return;
    mfaBusy = true;
    mfaBody.replaceChildren();
    try {
      var session = await client().auth.getSession();
      if (!session.data.session) {
        location.hash = 'login';
        return;
      }
      var factors = ok(await client().auth.mfa.listFactors()),
        level = ok(await client().auth.mfa.getAuthenticatorAssuranceLevel());
      var verified = factors.totp || [];

      function verifyForm(factorId) {
        var f = make('form', mfaBody),
          code = field(f, 'رمز التطبيق (6 أرقام)', 'code', 'text', 6);
        code.required = true;
        code.inputMode = 'numeric';
        code.autocomplete = 'one-time-code';
        code.pattern = '[0-9]{6}';
        formAction(f, 'تأكيد الرمز', async () => {
          var challenge = ok(await client().auth.mfa.challenge({
            factorId
          }));
          ok(await client().auth.mfa.verify({
            factorId,
            challengeId: challenge.id,
            code: code.value.trim()
          }));
          f.reset();
          mfaBody.replaceChildren();
          location.hash = mfaReturn === '#mfa' ? 'account' : mfaReturn;
        });
      }
      if (verified.length) {
        make('p', mfaBody, level.currentLevel === 'aal2' ? 'التحقق الثنائي مفعّل وهذه الجلسة مؤكدة.' :
          'أدخل الرمز من تطبيق المصادقة للمتابعة.');
        if (level.currentLevel !== 'aal2') verifyForm(verified[0].id);
        return;
      }
      make('p', mfaBody, 'أضف تطبيق مصادقة مثل Google Authenticator. احتفظ بمفتاح الاسترداد الخاص بك في مكان آمن.');
      var enroll = action(mfaBody, 'إعداد التحقق الثنائي', async () => {
        enroll.disabled = true;
        try {
          var pending = (factors.all || []).filter(x => x.factor_type === 'totp' && x.status ===
          'unverified');
          for (const p of pending) ok(await client().auth.mfa.unenroll({
            factorId: p.id
          }));
          var data = ok(await client().auth.mfa.enroll({
            factorType: 'totp',
            friendlyName: 'Al Barham'
          }));
          mfaBody.replaceChildren();
          make('p', mfaBody, 'امسح الرمز بتطبيق المصادقة أو أدخل المفتاح يدويًا. لا تشاركه مع أحد.');
          await ensureQR();
          if (window.QRCode) {
            var qr = make('div', mfaBody);
            new QRCode(qr, {
              text: data.totp.uri,
              width: 180,
              height: 180
            });
          }
          var secret = make('p', mfaBody, data.totp.secret);
          secret.dir = 'ltr';
          secret.style.overflowWrap = 'anywhere';
          verifyForm(data.id);
        } catch (e) {
          make('p', mfaBody, 'تعذر إعداد التحقق الثنائي. تحقق من إعدادات المصادقة.');
          enroll.disabled = false;
        }
      });
    } catch (e) {
      make('p', mfaBody, 'تعذر قراءة إعدادات المصادقة.');
    } finally {
      mfaBusy = false;
    }
  }

  var secPage = newView('security', 'مركز الأمن الرقمي'),
    secBody = make('div', secPage);
  var secLink = make('a', admin, 'مركز الأمن الرقمي');
  secLink.href = '#security';
  secLink.hidden=true;
  secLink.className = 'btn btn-dark';
  async function loadSecurity() {
    secBody.replaceChildren();
    make('p', secBody, 'جارٍ تحميل سجل الحماية…');
    try {
      var d = ok(await client().rpc('family_security_summary'));
      secBody.replaceChildren();
      var overview = section(secBody, 'حالة الحماية');
      make('p', overview, 'التحقق الثنائي: ' + (d.mfa_enabled ? 'مفعّل' : 'يحتاج إلى تفعيل'));
      make('p', overview, 'مستوى التحقق الحالي: ' + (d.current_aal === 'aal2' ? 'AAL2 — تحقق ثنائي مؤكد' : 'غير مؤكد'));
      make('p', overview, 'الجلسات المسجلة: ' + d.sessions);
      make('p', overview, 'مخازن الملفات الخاصة: ' + d.private_buckets);
      make('p',overview,'مرفقات الطلبات: عزل إجباري حتى اجتياز فحص ClamAV. عند غياب المحرك تبقى المرفقات معزولة.');
      make('p',overview,'آخر تحديث للعرض: '+formatPortalTime(new Date()));
      make('p', overview, 'عمليات آخر سبعة أيام: ' + d.events_7d);
      var m = make('a', overview, 'إعداد التحقق الثنائي');
      m.href = '#mfa';
      m.className = 'btn btn-gold';
      var sessions = section(secBody, 'إدارة الجلسات');
      make('p', sessions, 'يمكنك إنهاء جلسات أجهزتك الأخرى مع بقاء هذه الجلسة.');
      action(sessions, 'إنهاء الجلسات الأخرى', async function() {
        if (!confirm('إنهاء جميع الجلسات الأخرى؟')) return;
        this.disabled = true;
        try {
          ok(await client().auth.signOut({
            scope: 'others'
          }));
          alert('تم طلب إنهاء الجلسات الأخرى.');
          loadSecurity();
        } catch (e) {
          alert('تعذر إنهاء الجلسات.');
        } finally {
          this.disabled = false;
        }
      });
      action(sessions, 'تسجيل الخروج من كل الأجهزة', async function() {
        if (!confirm('سيُسجّل خروجك من جميع الأجهزة بما فيها هذا الجهاز. هل تريد المتابعة؟')) return;
        this.disabled = true;
        try {
          ok(await client().auth.signOut({
            scope: 'global'
          }));
          location.hash = 'home';
        } catch (e) {
          alert('تعذر تسجيل الخروج.');
          this.disabled = false;
        }
      });
      var log = section(secBody, 'سجل العمليات الحساسة');
      var names = {
          family_news: 'الأخبار',
          family_member_content: 'المحتوى',
          family_member_requests: 'الطلبات',
          family_member_notices: 'الإشعارات'
        },
        ops = {
          INSERT: 'إضافة',
          UPDATE: 'تعديل',
          DELETE: 'حذف'
        };
      if (!d.recent_events.length) make('p', log, 'لا عمليات مسجلة بعد.');
      for (const e of d.recent_events) {
        make('p', log, (names[e.resource] || e.resource) + ' • ' + (ops[e.action] || e.action) + ' • ' + new Date(e
          .occurred_at).toLocaleString('ar'));
      }
      var reviews = section(secBody, 'قرارات العضوية الأخيرة');
      for (const e of d.recent_reviews) make('p', reviews, statusLabels[e.action] || e.action);
      await mountSecurityScanner(secBody);
    } catch (e) {
      secBody.replaceChildren();
      make('p', secBody, 'تعذر الوصول إلى مركز الحماية. هذه الخدمة للإدارة المعتمدة فقط.');
    }
  }

  var scanNames = {
    rls: ['عزل بيانات الجداول (RLS)', 'جداول عامة دون حماية'],
    private_tables: ['حماية السجلات الداخلية', 'صلاحيات زائدة مكتشفة'],
    admin_rpc: ['حماية دوال الإدارة', 'دوال متاحة للزوار'],
    mfa: ['التحقق الثنائي', 'عوامل مصادقة مؤكدة'],
    session: ['سلامة جلسة الإدارة', 'جلسة الإدارة الحالية'],
    storage: ['خصوصية مخازن الملفات', 'مخازن خاصة من أصل 2'],
    upload_limits: ['قيود رفع الملفات', 'مخازن مطابقة من أصل 2'],
    files: ['سلامة مراجع الملفات', 'ملفات غير موجودة'],
    audit: ['التدقيق الأمني', 'آليات تدقيق مفعّلة من أصل 4'],
    rate: ['تقييد طلبات الأعضاء', 'آلية تقييد مفعّلة'],
    certificates: ['اتساق حالات الشهادات', 'شهادات بحالة غير متسقة']
  };

  function renderScan(target, report) {
    target.replaceChildren();
    var checks = Array.isArray(report.checks) ? report.checks : [],
      passed = checks.filter(x => x.state === 'pass').length,
      warnings = checks.filter(x => x.state === 'warn').length,
      failed = checks.filter(x => x.state === 'fail').length;
    var sum = make('div', target);
    sum.className = 'scan-summary';
    for (const x of [
        [passed, 'اجتاز', 'pass'],
        [warnings, 'تنبيه', 'warn'],
        [failed, 'خلل', 'fail']
      ]) {
      var c = make('div', sum);
      c.className = 'scan-stat ' + x[2];
      make('strong', c, String(x[0]));
      make('span', c, x[1]);
    }
    make('p', target, 'وقت الفحص: ' + new Date(report.scanned_at).toLocaleString('ar')).className = 'scan-time';
    if (report.cached) make('p', target, 'عرض آخر نتيجة حديثة لتجنب تكرار الطلبات.');
    for (const x of checks) {
      var row = make('div', target);
      row.className = 'scan-result';
      var label = make('div', row),
        name = scanNames[x.id] || [x.id, 'النتيجة'];
      make('strong', label, name[0]);
      make('small', label, name[1] + ': ' + x.value);
      var state = make('span', row, x.state === 'pass' ? '✓ اجتاز' : x.state === 'warn' ? '! تنبيه' : '× خلل');
      state.className = 'scan-state ' + x.state;
      if (x.id === 'mfa' && x.state === 'warn') {
        var a = make('a', label, 'تفعيل التحقق الثنائي');
        a.href = '#mfa';
        a.className = 'more';
      }
    }
  }
  function assessSecurityHeaders(headers) {
    const csp = headers.get('content-security-policy') || '';
    const xfo = (headers.get('x-frame-options') || '').trim().toUpperCase();
    const hsts = headers.get('strict-transport-security') || '';
    const maxAge = hsts.match(/(?:^|;)\s*max-age\s*=\s*(\d+)/i);
    const pp = headers.get('permissions-policy') || '';
    const ref = (headers.get('referrer-policy') || '').trim().toLowerCase();
    return [
      ['CSP عبر ترويسة HTTP', Boolean(csp.trim())],
      ['منع التأطير Clickjacking', /(?:^|;)\s*frame-ancestors\s+'none'\s*(?:;|$)/i.test(csp) || xfo === 'DENY'],
      ['HSTS لمدة سنة على الأقل', Boolean(maxAge && Number(maxAge[1]) >= 31536000)],
      ['منع تخمين MIME', (headers.get('x-content-type-options') || '').trim().toLowerCase() === 'nosniff'],
      ['سياسة عدم إرسال المرجع', ref === 'no-referrer'],
      ['تقييد الكاميرا والميكروفون والموقع', ['camera','microphone','geolocation'].every(k => new RegExp('(?:^|,)\\s*' + k + '\\s*=\\s*\\(\\s*\\)').test(pp))]
    ];
  }

  function verifiedCheckState(report, required) {
    const checks = Array.isArray(report?.checks) ? report.checks : [];
    const matching = required.map(id => checks.find(x => x.id === id));
    if (matching.some(x => x?.state === 'fail')) return 'fail';
    if (matching.every(x => x?.state === 'pass')) return 'pass';
    return 'warn';
  }

  function mountInfrastructureStatus(parent) {
    const panel = section(parent, 'طبقات الحماية — ما يعمل وما ينقص');
    make('p', panel, 'حالة الخدمات الخارجية لا تُعدّ مفعّلة لمجرد وجود ملف إعداد. افحصها بعد الربط والنشر.');
    const items = [
      ['mfa','MFA / Zero Trust','تفرض قاعدة البيانات AAL2 على الإدارة. يلزم الفحص للتحقق من الجلسة الحالية.','warn','بانتظار الفحص'],
      ['data','RLS / RBAC / تخزين خاص','فحص مباشر للجداول والسجلات الخاصة ودوال الإدارة ومخازن الملفات.','warn','بانتظار الفحص'],
      ['ci','DevSecOps / CodeQL / SRI','يُقرأ آخر تشغيل للفرع الرئيسي من GitHub.','warn','بانتظار النتيجة'],
      ['edge','WAF / WAAP / DDoS / Bot Management','تحتاج حماية خارجية على مزود الاستضافة، وحماية API بصورة مستقلة.','warn','غير مؤكد'],
      ['captcha','CAPTCHA (hCaptcha / Turnstile)',window.familyCaptcha.enabled ? 'مفتاح عام موجود؛ يلزم إثبات فرض CAPTCHA في Auth.' : 'التكامل جاهز برمجيًا؛ لا يوجد مفتاح موقع مفعّل.','warn',window.familyCaptcha.enabled ? 'بانتظار التحقق' : 'غير مفعّل'],
      ['passkeys','Passkeys / FIDO2','تم تجهيز تسجيل مفتاح المرور والدخول به؛ يلزم تفعيل Supabase وتحديد نطاق WebAuthn واختبار الاستعادة.','warn','غير مفعّل'],
      ['pqc','PQC / RASP','يلزم دعم مزود TLS أو بيئة تشغيل خلفية مناسبة.','warn','غير مؤكد'],
      ['siem','SIEM / XDR','سجل التدقيق الداخلي ليس SIEM؛ يلزم مزود تنبيهات ومراقبة مستقل.','warn','غير متكامل'],
      ['backup','Immutable Backups','يلزم وجهة مستقلة ذات قفل احتفاظ واختبار استعادة البيانات والملفات.','warn','غير مؤكد'],
      ['password','كلمات المرور المسربة','فحص HIBP في واجهة إنشاء وتغيير كلمة المرور؛ فرضه على خادم Supabase يتطلب خطة Pro وتفعيل الإعداد.','warn','فحص الواجهة فقط']
    ];
    const marks = new Map();
    for (const [id,name,detail,status,statusLabel] of items) {
      const row = make('div', panel); row.className = 'scan-result';
      const label = make('div', row); make('strong', label, name); make('small', label, detail);
      const mark = make('span', row, statusLabel); mark.className = 'scan-state ' + status;
      marks.set(id,mark);
    }
    const update = (id,state,label) => {
      const mark = marks.get(id);
      if (!mark) return;
      mark.className = 'scan-state ' + state;
      mark.textContent = label;
    };
    const links = section(parent, 'استكمال إعدادات الحماية');
    for (const [name, url] of [
      ['Vercel — إعداد الحماية والاستضافة', 'https://vercel.com/dashboard'],
      ['hCaptcha — حماية المصادقة', 'https://dashboard.hcaptcha.com/'],
      ['Supabase — إعداد المصادقة', 'https://supabase.com/dashboard/project/vfxxghfmkmgdqrczeowx/auth/providers'],
      ['Supabase — مستشار الأمان', 'https://supabase.com/dashboard/project/vfxxghfmkmgdqrczeowx/advisors/security'],
      ['GitHub — إعدادات المستودع', 'https://github.com/barham-ps/barham-ps.github.io/settings']
    ]) {
      const a = make('a', links, name); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.className = 'btn btn-ghost';
    }
    return update;
  }

  async function mountSecurityScanner(parent) {
    var scanner = section(parent, 'فحص الحماية المباشر');
    parent.prepend(scanner);
    scanner.classList.add('security-scan');
    make('p', scanner,
      'افحص إعدادات الحماية الحقيقية في قاعدة البيانات دون مغادرة الموقع. لا يغيّر الفحص بيانات الأعضاء.');
    var run = action(scanner, 'فحص الحماية الآن', async () => {
      run.disabled = true;
      run.textContent = 'جارٍ الفحص…';
      msg.textContent = 'جارٍ التحقق من الصلاحيات والملفات…';
      try {
        var result = ok(await client().rpc('family_run_security_scan'));
        renderScan(results, result);
        for (const [id, required] of [['mfa',['mfa','session']],['data',['rls','private_tables','admin_rpc','storage','upload_limits']]]) {
          const state = verifiedCheckState(result, required);
          updateInfrastructure(id,state,state === 'pass' ? 'اجتاز الفحص' : state === 'fail' ? 'خلل مكتشف' : 'يحتاج مراجعة');
        }
        msg.textContent = 'اكتمل فحص قاعدة البيانات.';
        await refreshHistory();
      } catch (e) {
        updateInfrastructure('mfa','warn','تعذر التحقق');
        updateInfrastructure('data','warn','تعذر التحقق');
        msg.textContent = 'تعذر إجراء الفحص. تحقق من الاتصال وصلاحية الإدارة.';
      } finally {
        run.disabled = false;
        run.textContent = 'إعادة فحص الحماية';
      }
    });
    run.className = 'btn btn-gold scan-run';
    var msg = make('p', scanner);
    msg.setAttribute('role', 'status');
    var results = make('div', scanner);
    var local = section(parent, 'فحص اتصال الموقع');
    var secure = location.protocol === 'https:' && window.isSecureContext;
    make('p', local, 'الاتصال الآمن HTTPS: ' + (secure ? 'متاح' : 'غير مؤكد'));
    var policy = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    make('p', local, 'سياسة CSP في الصفحة: ' + (policy && policy.content.includes("object-src 'none'") ? 'موجودة' :
      'غير مكتشفة'));
    make('p', local, 'هذه مؤشرات للمتصفح، وليست اختبار اختراق.');
    make('p', local, 'CAPTCHA: ' + (window.familyCaptcha.enabled ? 'مهيأ في الواجهة؛ يلزم التحقق من فرضه في Supabase.' : 'بانتظار مفتاح hCaptcha أو Turnstile.'));
    const headerResults = make('div', local);
    headerResults.setAttribute('aria-live', 'polite');
    const headerBtn = action(local, 'فحص ترويسات الخادم الآن', async () => {
      if (headerBtn.disabled) return;
      headerBtn.disabled = true;
      headerResults.textContent = 'جارٍ التحقق من استجابة الخادم…';
      try {
        const url = new URL(location.pathname, location.origin);
        const response = await fetch(url, {credentials: 'omit', cache: 'no-store', redirect: 'error'});
        if (!response.ok) throw Error('Response unavailable');
        headerResults.replaceChildren();
        make('p', headerResults, 'نتيجة استجابة الموقع الحالية (ليست فحصًا لمزود WAF أو TLS).');
        for (const [name, present] of assessSecurityHeaders(response.headers)) {
          const row = make('div', headerResults); row.className = 'scan-result';
          make('strong', row, name);
          const mark = make('span', row, present ? 'مكتشف' : 'غير مكتشف');
          mark.className = 'scan-state ' + (present ? 'pass' : 'warn');
        }
      } catch (e) {
        headerResults.textContent = 'تعذر التحقق من الترويسات. لا يمكن تأكيد حالة الخادم.';
      } finally { headerBtn.disabled = false; }
    });
    headerBtn.className = 'btn btn-dark';
    const updateInfrastructure = mountInfrastructureStatus(parent);
    var gh = section(parent, 'نتائج فحص الكود في GitHub');
    var ghMsg = make('p', gh, 'يمكنك قراءة آخر نتيجة متاحة للفرع الرئيسي من سجل GitHub Actions.');
    ghMsg.setAttribute('role', 'status');
    var ghBtn = action(gh, 'قراءة نتيجة فحص الكود', async () => {
      ghBtn.disabled = true;
      ghMsg.textContent = 'جارٍ قراءة نتيجة الفحص…';
      try {
        var response = await fetch(
          'https://api.github.com/repos/barham-ps/barham-ps.github.io/actions/workflows/security.yml/runs?branch=main&event=push&per_page=1', {
            credentials: 'omit',
            cache: 'no-store',
            headers: {
              Accept: 'application/vnd.github+json'
            }
          });
        if (!response.ok) throw Error('HTTP ' + response.status);
        var data = await response.json(),
          item = data.workflow_runs?.[0];
        if (!item) {
          ghMsg.textContent = 'لا يوجد تشغيل ظاهر للفحص حتى الآن.';
          return;
        }
        const ciState = item.status === 'completed' ? (item.conclusion === 'success' ? 'pass' : item.conclusion === 'failure' ? 'fail' : 'warn') : 'warn';
        updateInfrastructure('ci',ciState,ciState === 'pass' ? 'نجح آخر تشغيل' : ciState === 'fail' ? 'فشل آخر تشغيل' : 'غير مكتمل');
        var labels = {
          success: 'نجح',
          failure: 'فشل',
          cancelled: 'أُلغي',
          timed_out: 'انتهت المهلة',
          skipped: 'تم تخطيه',
          action_required: 'يتطلب إجراءً',
          neutral: 'محايد'
        };
        ghMsg.textContent = 'آخر تشغيل: ' + (item.status === 'completed' ? (labels[item.conclusion] ||
            'نتيجة غير معروفة') : 'لم يكتمل بعد') + ' • ' + new Date(item.updated_at || item.created_at)
          .toLocaleString('ar');
        var old = gh.querySelector('.ci-details');
        if (old) old.remove();
        var detail = make('div', gh);
        detail.className = 'ci-details';
        var jobsResponse = await fetch('https://api.github.com/repos/barham-ps/barham-ps.github.io/actions/runs/' +
          Number(item.id) + '/jobs?per_page=30', {
            credentials: 'omit',
            cache: 'no-store',
            headers: {
              Accept: 'application/vnd.github+json'
            }
          });
        if (jobsResponse.ok) {
          var jobs = await jobsResponse.json();
          for (const job of jobs.jobs || []) {
            make('p', detail, job.name + ' — ' + (labels[job.conclusion] || job.status));
            for (const step of job.steps || []) {
              if (step.conclusion === 'failure') make('p', detail, 'الخطوة المتعثرة: ' + step.name);
            }
          }
        } else make('p', detail, 'تعذر جلب تفاصيل المهام.');
        var link = make('a', detail, 'فتح سجل التشغيل التفصيلي');
        link.href = 'https://github.com/barham-ps/barham-ps.github.io/actions/runs/' + Number(item.id);
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'more';
      } catch (e) {
        updateInfrastructure('ci','warn','تعذر التحقق');
        ghMsg.textContent = 'تعذر إكمال قراءة تفاصيل GitHub من المتصفح. لا يمكن تأكيد نجاح الفحص.';
      } finally {
        ghBtn.disabled = false;
      }
    });
    ghBtn.className = 'btn btn-dark';
    make('p', gh, 'قراءة النتيجة لا تعيد تشغيل CodeQL. تشغيل الفحص يتم عند تحديث الكود أو حسب الجدولة.');
    var history = section(parent, 'سجل فحوص الحماية');
    var historyList = make('div', history);
    async function refreshHistory() {
      historyList.replaceChildren();
      try {
        var reports = ok(await client().rpc('family_security_scan_history'));
        if (!reports.length) {
          make('p', historyList, 'لم تُسجّل فحوص بعد.');
          return;
        }
        for (const report of reports) {
          var d = make('details', historyList);
          d.className = 'scan-history';
          var count = report.checks.filter(x => x.state === 'pass').length;
          make('summary', d, new Date(report.scanned_at).toLocaleString('ar') + ' • ' + count + ' من ' + report
            .checks.length + ' اجتاز');
          var body = make('div', d);
          renderScan(body, report);
        }
      } catch (e) {
        make('p', historyList, 'تعذر قراءة سجل الفحوص.');
      }
    }
    await refreshHistory();
    make('p', scanner,
      'نطاق الفحص: إعدادات قاعدة البيانات ومؤشرات الواجهة. لا يشمل فحص البرمجيات الخبيثة أو اختبار اختراق شامل.');
  }
  async function cleanImage(file, max) {
    if (!file || file.size > 25 * 1024 * 1024 || !file.type.startsWith('image/') || file.type === 'image/svg+xml')
      throw Error('صورة غير مسموحة');
    var url = URL.createObjectURL(file);
    try {
      var im = new Image();
      im.src = url;
      await im.decode();
      if (!im.width || !im.height || im.width * im.height > 60000000) throw Error('أبعاد الصورة كبيرة');
      var ratio = Math.min(1, 2000 / Math.max(im.width, im.height)),
        c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(im.width * ratio));
      c.height = Math.max(1, Math.round(im.height * ratio));
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(im, 0, 0, c.width, c.height);
      var blob = await new Promise(resolve => c.toBlob(resolve, 'image/jpeg', 0.86));
      if (!blob || blob.size > max) throw Error('الصورة كبيرة');
      return blob;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  async function checkArchiveFile(file) {
    if (file.type === 'application/pdf') {
      if (file.size > 10485760) throw Error('ملف كبير');
      var head = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
      if (head !== '%PDF-') throw Error('ملف PDF غير صالح');
      return file;
    }
    return cleanImage(file, 10485760);
  }

  var dock = document.createElement('nav');
  dock.className = 'mobile-dock';
  dock.setAttribute('aria-label', 'التنقل السريع');
  [
    ['home', 'الرئيسية', 'home'],
    ['news', 'الأخبار', 'news'],
    ['heritage', 'العائلة', 'landmark'],
    ['account', 'حسابي', 'user']
  ].forEach(x => {
    var l = make('a', dock);
    l.href = '#' + x[0];
    l.innerHTML = '<svg width="22" height="22" aria-hidden="true"><use href="#i-' + x[2] + '"/></svg>';
    make('span', l, x[1]);
  });
  document.body.appendChild(dock);

  function markDock() {
    var r = (location.hash || '#home').slice(1).split('/')[0];
    if (['login', 'register', 'reset', 'member-hub', 'member-services-admin', 'news-admin', 'admin', 'certificate',
        'verify', 'membership', 'security', 'mfa'
      ].includes(r)) r = 'account';
    if (['history', 'tree', 'archive', 'stories'].includes(r)) r = 'heritage';
    if (r === 'events' || r === 'community' || r === 'initiatives' || r === 'contact') r = 'news';
    Array.from(dock.querySelectorAll('a')).forEach(a => {
      if (a.getAttribute('href') === '#' + r) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }
  window.addEventListener('hashchange', markDock);
  markDock();
  var headerActs = document.querySelector('header.site .acts'),
    guestLogin = headerActs.querySelector('a[href="#login"]'),
    guestRegister = headerActs.querySelector('a[href="#register"]');
  var signedAccount = make('a', headerActs, 'حسابي');
  signedAccount.href = '#account';
  signedAccount.className = 'btn btn-gold sm';
  signedAccount.hidden = true;

  function updateHeader(session) {
    guestLogin.hidden = !!session;
    guestRegister.hidden = true;
    signedAccount.hidden = !session;
    document.querySelectorAll('[data-guest-entry]').forEach(a => {
      a.href = session ? '#account' : '#login';
      a.textContent = session ? 'حسابي' : 'دخول / إنشاء حساب';
    });
  }
  var authReady = false,
    recoveredSession = null;

  function clearPrivate() {
    hubNavigate=null;activeHubGroup='overview';activeServicePanel='requests';memberQuick.hidden=true;
    hubBody.replaceChildren();
    cms.replaceChildren();cms.hidden=true;
    adminNavigation.hidden=true;adminRefresh.hidden=true;adminMsg.textContent='';activeAdminPanel='overview';adminReports.replaceChildren();adminReports.hidden=true;adminIntro.hidden=true;
    adminRows.replaceChildren();directoryEpoch++;adminDirectory.replaceChildren();adminDirectory.hidden=true;clearMemberPrint();
    adminServiceBody.replaceChildren();
    newsEditorBody.replaceChildren();
    certBody.replaceChildren();
    mfaBody.replaceChildren();
    secBody.replaceChildren();
    $('#member-welcome').textContent = 'حساب العضو';
    $('#member-email').textContent = '';
    $('#member-number').textContent = '—';
    $('#account-status').textContent = '';
    $('#completeForm').reset();
    $('#completeForm').hidden = true;
    hubLink.hidden = true;
    adminShortcut.hidden = true;
    certShortcut.hidden = true;
    printButton.hidden = downloadCertificate.hidden = true;
    clearDownloads();
    $('#change-password').reset();
  }
  guestLogin.hidden = false;
  signedAccount.hidden = true;

  function reconcileSession(session) {
    recoveredSession = session;
    updateHeader(session);
    if (session && ['#login', '#account'].includes(location.hash)) {
      if (location.hash !== '#account') location.hash = 'account';
      else guardPrivate(account);
    }
  }
  window.addEventListener('hashchange', function() {
    if (!authReady) return;
    if (location.hash === '#login' && recoveredSession) {
      location.hash = 'account';
      return;
    }
    if (location.hash === '#account') guardPrivate(account);
  });
  route();
  // Public routes must not wait for authentication recovery on slow connections.
  const initialHash=location.hash;
  const initialPublicRoute=initialHash===''||initialHash==='#home'||initialHash==='#news'||initialHash.startsWith('#news/')||['#history','#tree','#archive','#verify'].includes(initialHash)||initialHash.startsWith('#verify/');
  if(initialPublicRoute)extraRoute();
  try {
    client().auth.onAuthStateChange((event, session) => {
      if (!authReady) return;
      const previousUser=recoveredSession?.user.id;
      if(previousUser&&previousUser!==session?.user.id)clearPrivate();
      recoveredSession = session;
      updateHeader(session);
      if (event === 'SIGNED_OUT') {
        clearPrivate();
        if (['#account', '#admin', '#member-hub', '#member-services-admin', '#news-admin', '#certificate',
            '#security', '#mfa'
          ].includes(location.hash)) location.hash = 'home';
      }
      if (event === 'SIGNED_IN' && location.hash === '#login') setTimeout(() => {
        if (location.hash === '#login') location.hash = 'account';
      }, 0);
    });
    client().auth.getSession().then(z => {
      authReady = true;
      if (z.error) {
        updateHeader(null);
        return;
      }
      reconcileSession(z.data.session);
      route();
      if(!initialPublicRoute||location.hash!==initialHash)extraRoute();
      if (location.hash === '#account' && !z.data.session) location.hash = 'login';
    }).catch(() => {
      authReady = true;
      updateHeader(null);
    });
  } catch (e) {
    authReady = true;
    updateHeader(null);
  }
})();

;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js?v=31').catch(() => {});
}
let installPrompt;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installPrompt = e;
  const b = document.getElementById('install-app');
  if (b) b.hidden = false;
});
document.addEventListener('DOMContentLoaded', () => {
  const b = document.createElement('button');
  b.id = 'install-app';
  b.className = 'btn btn-gold sm';
  b.textContent = 'تثبيت تطبيق العائلة';
  b.hidden = !installPrompt;
  b.onclick = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      installPrompt = null;
      b.hidden = true;
    }
  };
  document.querySelector('footer.site .copy').appendChild(b);
});
