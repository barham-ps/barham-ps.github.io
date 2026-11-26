'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('auth templates use pinned links and recovery consumes OTP only',async()=>{
 const {renderAuthEmail}=await import('../supabase/functions/_shared/mail-catalog.mjs');
 const hash='synthetic_1234567890abcdef';
 const otp='123456';
 const recovery=renderAuthEmail('recovery',otp,hash);
 assert.match(recovery.html,/123456/);
 assert.match(recovery.html,/https:\/\/barham-ps\.github\.io\/#reset/);
 assert.doesNotMatch(recovery.html,/synthetic_1234567890abcdef/);
 for(const action of ['signup','invite','magiclink','email','email_change']){
  const m=renderAuthEmail(action,otp,hash);
  assert.match(m.html,/https:\/\/vfxxghfmkmgdqrczeowx\.supabase\.co\/auth\/v1\/verify\?token=/);
  assert.match(m.html,new RegExp('type='+action));
 }
 for(const action of ['password_changed_notification','email_changed_notification','phone_changed_notification','identity_linked_notification','identity_unlinked_notification','mfa_factor_enrolled_notification','mfa_factor_unenrolled_notification']){
  assert.doesNotMatch(renderAuthEmail(action,otp,hash).html,/123456/);
 }
 assert.throws(()=>renderAuthEmail('recovery','<img>','test'));
 assert.throws(()=>renderAuthEmail('signup',otp,'https://evil.invalid'));
 assert.throws(()=>renderAuthEmail('constructor',otp,hash));
});
test('auth jobs encrypt and erase one-time payloads, are limited and inaccessible to clients',()=>{
 const sql=fs.readFileSync('database/auth_mail_hook.sql','utf8');
 assert.match(sql,/enabled boolean NOT NULL DEFAULT false/);
 assert.match(sql,/pgp_sym_encrypt/);
 assert.match(sql,/state='sending',payload_cipher=null/);
 assert.match(sql,/expires_at>now\(\) FOR UPDATE/);
 assert.match(sql,/REVOKE ALL ON family_private.auth_mail_settings,family_private.auth_mail_jobs FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION family_private.family_auth_mail_hook\(jsonb\) TO supabase_auth_admin/);
 assert.match(sql,/hash_new\)\);/);
});
