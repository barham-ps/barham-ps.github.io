// Al Barham transaction mail — text and routing are controlled on the server.
// No recipient, name, complaint, attachment, password, or real OTP is embedded.
const SITE = 'https://barham-ps.github.io/';
const portal = route => `${SITE}#${route}`;
const brand = ' | بوابة آل برهم';
const commonSafety = 'لا تطلب إدارة البوابة كلمة المرور أو رمز التحقق، ولا ترسل أي وثائق شخصية عبر البريد. افتح البوابة الرسمية بنفسك للتأكد من التفاصيل.';
const codeSafety = 'هذا الرمز سري ويُستخدم مرة واحدة ضمن مدة الصلاحية التي تحددها الخدمة. لا تشاركه حتى مع إدارة البوابة. إذا لم تطلب هذا الإجراء، فتجاهل الرسالة.';
const linkSafety = 'الرابط مخصص لك وقد تنتهي صلاحيته. لا تعِد توجيه هذه الرسالة. إذا لم تطلب هذا الإجراء، فلا تفتح الرابط.';
const auth = (title, paragraphs, options={}) => ({title, subject:title+brand, paragraphs, ...options});
export const AUTH_TEMPLATES = Object.freeze({
  confirmation: auth('تأكيد بريدك الإلكتروني', ['مرحباً بك في البوابة العائلية الرقمية لآل برهم. وصل طلب إنشاء حساب باستخدام هذا البريد.', 'أكّد ملكية البريد بالضغط على الزر أدناه، ثم سجّل الدخول واستكمل تقديم طلب العضوية. تأكيد البريد لا يعني اعتماد العضوية؛ تخضع جميع الطلبات لمراجعة الإدارة.'], {action:'تأكيد البريد الإلكتروني', link:'confirmation', safety:linkSafety}),
  recovery: auth('رمز استعادة كلمة المرور', ['تلقينا طلباً لاستعادة كلمة مرور حسابك. أدخل رمز التحقق التالي في صفحة الاستعادة الرسمية المخصصة لهذا الإجراء.', 'بعد التحقق من الرمز، اختر كلمة مرور جديدة وقوية لا تستخدمها في أي خدمة أخرى.'], {code:true, action:'فتح صفحة إدخال الرمز', link:portal('reset'), safety:codeSafety}),
  invite: auth('دعوة للانضمام إلى بوابة العائلة', ['تلقّيت دعوة لإنشاء حساب في بوابة آل برهم. اتبع الرابط الرسمي لإتمام تسجيل الحساب، ثم استكمل الخطوات المطلوبة.', 'الدعوة لا تعني الموافقة التلقائية على طلب العضوية.'], {link:'confirmation', action:'قبول الدعوة', safety:linkSafety}),
  magic_link: auth('رابط الدخول الآمن', ['تلقينا طلباً لتسجيل الدخول إلى حسابك. استخدم الرابط المخصص للدخول إلى البوابة.', 'إذا لم تكن أنت من بدأ هذا الطلب، فلا تستخدم الرابط.'], {link:'confirmation', action:'تسجيل الدخول الآمن', safety:linkSafety}),
  email_change: auth('تأكيد تغيير البريد الإلكتروني', ['تلقينا طلباً لتغيير عنوان البريد المرتبط بحسابك. أكّد الطلب فقط إذا كنت أنت من بدأه من إعدادات الحساب.', 'قد تتطلب العملية تأكيد البريد السابق والجديد. لا تشارك رابط التأكيد مع أي شخص.'], {link:'confirmation', action:'تأكيد تغيير البريد', safety:linkSafety}),
  reauthentication: auth('رمز تأكيد الهوية', ['لإتمام إجراء حساس في حسابك، يُرجى إدخال رمز تأكيد الهوية التالي في الشاشة التي طلبته.', 'لا تستخدم الرمز في أي صفحة أو تطبيق غير البوابة الرسمية.'], {code:true, action:'العودة إلى حسابي', link:portal('account'), safety:codeSafety}),
  password_changed: auth('تنبيه أمني: تم تغيير كلمة المرور', ['تم تغيير كلمة المرور لحسابك. إذا كنت أنت من أجريت التغيير، فلا يلزم أي إجراء آخر.', 'إذا لم تكن أنت، استخدم صفحة استعادة الحساب الرسمية واتصل بالإدارة من البوابة في أقرب وقت.'], {action:'استعادة أمان الحساب', link:portal('reset')}),
  email_changed: auth('تنبيه أمني: تم تغيير البريد', ['تغيّر عنوان البريد الإلكتروني للحساب. إذا لم تقم بهذا التغيير، راجع إعدادات حسابك وتواصل مع الإدارة عبر القنوات الرسمية.'], {action:'مراجعة حسابي',link:portal('account')}),
  phone_changed: auth('تنبيه أمني: تم تغيير رقم الهاتف', ['تم تحديث رقم الهاتف المرتبط بالحساب. إذا لم تقم أنت بالتحديث، راجع حسابك وتواصل مع الإدارة.'], {action:'مراجعة حسابي',link:portal('account')}),
  identity_linked: auth('تنبيه أمني: إضافة طريقة دخول', ['أضيفت طريقة تسجيل دخول إلى حسابك. راجع طرق الدخول المتاحة وتأكد من أن جميعها تخصك.'], {action:'مراجعة أمان الحساب',link:portal('mfa')}),
  identity_unlinked: auth('تنبيه أمني: إزالة طريقة دخول', ['أُزيلت طريقة تسجيل دخول من حسابك. إذا لم تجْرِ هذا التغيير، تواصل مع الإدارة وراجع أمان الحساب.'], {action:'مراجعة أمان الحساب',link:portal('mfa')}),
  mfa_factor_enrolled: auth('تنبيه أمني: إضافة وسيلة تحقق ثنائي', ['تمت إضافة وسيلة تحقق إضافية إلى حسابك. لا تشارك رموز المصادقة أو مفاتيح الاسترداد مع أي شخص.'], {action:'مراجعة التحقق الثنائي',link:portal('mfa')}),
  mfa_factor_unenrolled: auth('تنبيه أمني: إزالة وسيلة تحقق ثنائي', ['تمت إزالة وسيلة تحقق إضافية من حسابك. إذا لم تكن أنت، راجع حسابك فوراً وأبلغ الإدارة.'], {action:'مراجعة التحقق الثنائي',link:portal('mfa')}),
});
const event = (title, paragraphs, route='account', audience='member') => ({title,subject:title+brand,paragraphs, link:portal(route), action:route==='correspondence'?'فتح مراسلاتي':route==='member-hub'?'فتح خدمات الأعضاء':route==='admin'?'فتح لوحة الإدارة':route==='certificate'?'فتح الشهادة في حسابي':'متابعة حسابي',audience});
const events = {
  membership_under_review:event('استلمنا طلب عضويتك',['نشكرك على تقديم طلب العضوية في بوابة آل برهم. تم تسجيله بنجاح وأصبح قيد المراجعة لدى الإدارة المعنية.','أدخل إلى حسابك لمتابعة الحالة أو استكمال ما قد تطلبه الإدارة. لا يعني هذا الإشعار صدور العضوية بعد.']),
  membership_more_info:event('طلب استكمال بيانات العضوية',['تحتاج الإدارة إلى معلومات إضافية لاستكمال مراجعة طلب العضوية.','افتح حسابك للاطلاع على تعليمات المتابعة. لا ترسل الهوية أو وثائقك في الرد على هذه الرسالة.']),
  membership_approved:event('مبارك! تم اعتماد عضويتك',['يسر إدارة بوابة آل برهم إبلاغك باعتماد طلب عضويتك. نرحب بك في البوابة العائلية.','سجّل الدخول للاطلاع على رقم العضوية والشهادة والخدمات المخصصة وفق صلاحياتك. حافظ على سرية بيانات الدخول.']),
  membership_rejected:event('نتيجة مراجعة طلب العضوية',['اكتملت مراجعة طلب العضوية ولم تتم الموافقة عليه في هذه المرحلة.','يمكنك الدخول إلى حسابك للاطلاع على الحالة والتواصل مع الإدارة عبر القنوات الرسمية إذا كانت لديك استفسارات أو معلومات إضافية.']),
  membership_suspended:event('إشعار بشأن حالة العضوية',['تم تعليق عضويتك وفق قرار الإدارة. قد تتأثر صلاحية الوصول إلى الخدمات المخصصة للأعضاء.','للتفاصيل والاستفسار أو متابعة أي إجراءات لازمة، راجع حسابك وقنوات التواصل الرسمية.']),
  membership_revoked:event('إشعار إلغاء العضوية',['تم إلغاء اعتماد العضوية. لا تستخدم أي وثيقة أو رمز تحقق سبق إصداره باعتباره صالحاً.','يمكنك مراجعة حسابك والتواصل مع الإدارة للاستفسار عن الإجراءات المتاحة.']),
  membership_pending_email:event('أكمل تأكيد بريدك',['طلب حسابك بانتظار تأكيد البريد الإلكتروني. ابحث عن رسالة التأكيد الرسمية واتبع تعليماتها.','لا يلزم إنشاء حساب آخر بالبريد نفسه. إذا تعذر الوصول إلى الرسالة فتواصل مع الإدارة.']),
  certificate_issued:event('شهادة العضوية جاهزة',['أصبحت شهادة العضوية متاحة في حسابك. سجّل الدخول للحصول عليها والتحقق من حالتها.','لأمان بيانات العائلة، لا نرفق الشهادة أو معرّف التحقق في هذه الرسالة.'],'certificate'),
  certificate_revoked:event('إشعار بشأن شهادة العضوية',['تغيّرت صلاحية شهادة العضوية المرتبطة بحسابك. لا تستخدم النسخة السابقة للتحقق من العضوية.','راجع حالة الشهادة في حسابك أو تواصل مع الإدارة.'],'account'),
  correspondence_received:event('استلمنا مراسلتك',['تم تسجيل مراسلتك لدى القسم المختص بنجاح. سنراجعها ونوافيك بالتحديثات في صندوق المراسلات داخل البوابة.','احتفظ بمرجع المراسلة ولا ترسل وثائق حساسة عبر البريد.'],'correspondence'),
  correspondence_read:event('مراسلتك قيد المتابعة',['اطّلعت الإدارة على مراسلتك وأصبحت قيد المتابعة. يمكنك الاطلاع على آخر حالة في صندوق المراسلات.'],'correspondence'),
  correspondence_answered:event('وصل رد على مراسلتك',['أضافت الإدارة رداً إلى مراسلتك. سجّل الدخول وافتح صندوق المراسلات للاطلاع على الرد الكامل بشكل آمن.','لا نضمّن نص الرسالة أو الرد هنا، حمايةً لخصوصيتك.'],'correspondence'),
  correspondence_closed:event('تم إغلاق مراسلتك',['تم إغلاق المراسلة بعد معالجتها. يمكنك الاطلاع على الحالة والردود المسجلة في حسابك.','إذا بقي لديك استفسار جديد، يمكنك إرسال مراسلة جديدة عبر البوابة.'],'correspondence'),
  notice_received:event('لديك إشعار جديد من الإدارة',['وصل إشعار جديد إلى حسابك في بوابة آل برهم. سجّل الدخول للاطلاع عليه.','لا نعرض محتوى الإشعار الشخصي في البريد.'],'member-hub'),
  admin_membership:event('تنبيه الإدارة: طلب عضوية جديد',['وصل طلب عضوية جديد إلى البوابة ويحتاج إلى المراجعة.','افتح لوحة الإدارة من حسابك المخوّل. لا يتضمن البريد بيانات صاحب الطلب.'],'admin','admin'),
  admin_correspondence:event('تنبيه الإدارة: مراسلة جديدة',['وصلت مراسلة جديدة إلى أحد الأقسام. راجع الصندوق المخصص للإدارة من خلال البوابة.','لا يتضمن البريد المحتوى أو عنوان الرسالة أو بيانات المرسل.'],'admin','admin'),
  admin_request:event('تنبيه الإدارة: طلب خدمة جديد',['أُضيف طلب خدمة جديد بانتظار المراجعة. افتح لوحة الإدارة للاطلاع على التفاصيل بعد التحقق من هويتك.','لا تُرسل مرفقات أو بيانات شخصية عبر هذا التنبيه.'],'admin','admin'),
  privacy_received:event('استلمنا طلب الخصوصية',['وصل طلب متعلق ببياناتك أو حقوق الخصوصية. تراجع الإدارة الطلب وتتحقق من هوية مقدّمه قبل أي إفصاح أو تعديل.','تابع الطلب عبر القنوات الرسمية، ولا ترسل بيانات الهوية بالبريد دون توجيه آمن.'],'correspondence'),
  privacy_completed:event('تحديث طلب الخصوصية',['اكتملت معالجة طلب الخصوصية أو أضيف تحديث إليه. يمكنك مراجعة الرد الآمن عبر حسابك.','لم نرفق أي نسخة من بياناتك في هذا البريد.'],'correspondence'),
};
export const REQUEST_KINDS=Object.freeze({initiative:'المبادرة',suggestion:'المقترح',occasion:'المناسبة',solidarity:'التكافل',archive:'الأرشيف',complaint:'الشكوى',birth:'إضافة مولود',correction:'تصحيح البيانات'});
for (const [kind,label] of Object.entries(REQUEST_KINDS)) {
  const privacy = ['complaint','birth','correction','solidarity'].includes(kind) ? 'حفاظاً على خصوصيتك، تبقى التفاصيل والمرفقات داخل البوابة فقط.' : 'يمكنك مراجعة تفاصيل الطلب والردود المسجلة داخل البوابة.';
  events[`request_${kind}_received`] = event(`استلام طلب ${label}`,[`وصل طلبك بشأن ${label} إلى الإدارة وأصبح قيد المراجعة.`,privacy,'ستظهر أي تحديثات وحالة الطلب في سجل طلباتك.'],'member-hub');
  events[`request_${kind}_accepted`] = event(`قبول طلب ${label}`,[`راجعت الإدارة طلب ${label} وتم قبوله.`,`تابع سجل طلباتك لمعرفة الإجراءات التالية؛ قبول الطلب لا يعني اكتمال تنفيذه بعد.`,privacy],'member-hub');
  events[`request_${kind}_declined`] = event(`نتيجة مراجعة طلب ${label}`,[`اكتملت مراجعة طلب ${label} ولم يتم قبوله في هذه المرحلة.`,`راجع سجل الطلبات للاطلاع على ما سجلته الإدارة، ويمكنك التواصل للاستفسار إن لزم.`,privacy],'member-hub');
  events[`request_${kind}_completed`] = event(`اكتمال معالجة طلب ${label}`,[`تم إغلاق إجراءات معالجة طلب ${label} ووضعه في حالة مكتمل.`,`راجع السجل للتأكد من النتيجة وأي تعليمات متبقية.`,privacy],'member-hub');
  events[`request_${kind}_updated`] = event(`تحديث طلب ${label}`,[`أضيف تحديث إلى طلب ${label}. يمكنك الاطلاع على آخر التفاصيل أو الرد من داخل البوابة.`,privacy],'member-hub');
}
export const EVENT_TEMPLATES=Object.freeze(events);
const esc = value => String(value).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function shell(t, {code, link, ref}={}) {
  const paras=t.paragraphs.map(p=>`<p style="margin:0 0 14px">${esc(p)}</p>`).join('');
  const codeBlock=code?`<p style="margin:12px 0 6px;font-weight:bold">رمز التحقق</p><div dir="ltr" style="text-align:center;font-size:32px;letter-spacing:6px;color:#16382b;background:#f7f1df;border:1px solid #bfa46b;padding:18px;border-radius:10px;font-weight:bold">${code}</div>`:'';
  const button=link?`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px"><tr><td align="center"><a href="${link}" style="display:inline-block;padding:13px 25px;border-radius:8px;background:#184c3a;color:#fff;text-decoration:none;font-weight:bold;font-size:16px">${esc(t.action)}</a></td></tr></table>`:'';
  const reference=ref?`<p style="margin:20px 0 0;color:#55675e;font-size:13px">مرجع الطلب: <span dir="ltr">${esc(ref)}</span></p>`:'';
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t.title)}</title></head><body style="margin:0;background:#f2f1ed;padding:16px;font-family:Tahoma,Arial,sans-serif;color:#183a2e;font-size:16px;line-height:1.85"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#fff;border:1px solid #c9b17d;border-radius:14px;overflow:hidden;text-align:right"><tr><td style="background:#123b30;color:#f9e8bc;text-align:center;padding:24px 16px;border-bottom:4px solid #c9a95f"><p style="margin:0;font-size:26px;font-weight:bold">آل برهم</p><p style="margin:4px 0 0;font-size:14px">البوابة العائلية الرقمية | أصالة الجذور وعهد الأجيال</p></td></tr><tr><td style="padding:24px"><h1 style="font-size:22px;line-height:1.5;margin:0 0 20px;color:#123b30">${esc(t.title)}</h1><p style="margin:0 0 14px">السلام عليكم ورحمة الله وبركاته،</p>${paras}${codeBlock}${button}${reference}<p style="margin:24px 0 0;padding:12px;border-right:3px solid #c9a95f;background:#f7f4e9;color:#334c41;font-size:14px">${esc(t.safety||commonSafety)}</p><p style="margin:20px 0 0">مع التقدير،<br>إدارة بوابة آل برهم</p></td></tr><tr><td style="padding:16px;text-align:center;background:#f3f5f2;color:#455b4f;font-size:12px"><a style="color:#184c3a" href="${SITE}">الموقع الرسمي</a> • <a style="color:#184c3a" href="${portal('contact')}">التواصل</a> • <a style="color:#184c3a" href="${portal('privacy')}">الخصوصية</a><br>هذه رسالة آلية متعلقة بخدمات الحساب. لا تتضمن مرفقات أو كلمات مرور.</td></tr></table></td></tr></table></body></html>`;
}
export function renderNative(key) {
  const t=Object.hasOwn(AUTH_TEMPLATES,key)&&AUTH_TEMPLATES[key];if(!t)throw new Error('Unknown auth template');
  return {subject:t.subject,html:shell(t,{code:t.code?'{{ .Token }}':undefined,link:t.link==='confirmation'?'{{ .ConfirmationURL }}':t.link})};
}
export function renderEvent(key, reference) {
  const t=Object.hasOwn(EVENT_TEMPLATES,key)&&EVENT_TEMPLATES[key];if(!t)throw new Error('Unknown event template');
  // References, if provided, are UUIDs from the database. Never accept free text or HTML.
  if(reference!==undefined&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reference))throw new Error('Invalid reference');
  return {subject:t.subject, html:shell(t,{link:t.link,ref:reference}),audience:t.audience};
}

// Separate internal delivery test, never emitted by member-facing event triggers.
export function renderDeliveryTest() {
  const t=event('اختبار الربط الآلي مع Supabase',['هذه رسالة اختبار تقنية مخصصة لبريد إدارة آل برهم. تم توليدها من مسار الطابور الخادمي، ولا تشير إلى أي طلب عضوية أو شكوى حقيقية.','لا يلزم اتخاذ أي إجراء.'],'admin','admin');
  return {subject:t.subject,html:shell(t,{link:t.link}),audience:'admin'};
}

// Signed/privileged Auth Hook inputs only. URLs are pinned to this portal.
export function renderAuthEmail(action, token, tokenHash) {
  const actionToKey={
    signup:'confirmation',invite:'invite',magiclink:'magic_link',email:'magic_link',
    recovery:'recovery',email_change:'email_change',reauthentication:'reauthentication',
    password_changed_notification:'password_changed',email_changed_notification:'email_changed',phone_changed_notification:'phone_changed',
    identity_linked_notification:'identity_linked',identity_unlinked_notification:'identity_unlinked',
    mfa_factor_enrolled_notification:'mfa_factor_enrolled',mfa_factor_unenrolled_notification:'mfa_factor_unenrolled'
  };
  if(!Object.hasOwn(actionToKey,action))throw new Error('Unknown Auth event');
  const t=AUTH_TEMPLATES[actionToKey[action]];
  let code,link=t.link;
  if(t.code){if(typeof token!=='string'||!/^\d{4,10}$/.test(token))throw new Error('Invalid OTP');code=esc(token);}
  if(link==='confirmation'){
    if(typeof tokenHash!=='string'||!(/^[A-Za-z0-9_-]{16,255}$/).test(tokenHash))throw new Error('Invalid token hash');
    const u=new URL('https://vfxxghfmkmgdqrczeowx.supabase.co/auth/v1/verify');
    u.searchParams.set('token',tokenHash);u.searchParams.set('type',action);u.searchParams.set('redirect_to',SITE);
    link=esc(u.toString());
  }
  return {subject:t.subject,html:shell(t,{code,link})};
}
