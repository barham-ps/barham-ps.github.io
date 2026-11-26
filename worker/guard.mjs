// Live defense for sensitive and unmatched routes. Public static assets remain asset-first.
const SECRET_PATH = /^\/(?:\.git(?:\/|$)|\.github(?:\/|$)|\.env(?:[./]|$)|database(?:\/|$)|scripts(?:\/|$)|supabase(?:\/|$)|worker(?:\/|$)|backups(?:\/|$)|wp-admin(?:\/|$)|wp-login\.php(?:\/|$))/i;
function blocked(status, label, method) {
  const headers = new Headers({
    "Cache-Control":"no-store",
    "X-Content-Type-Options":"nosniff",
    "X-Frame-Options":"DENY",
    "Content-Security-Policy":"default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    "Referrer-Policy":"no-referrer",
    "X-Family-Guard":label
  });
  if (status === 405) headers.set("Allow","GET, HEAD");
  if (status === 429) headers.set("Retry-After","60");
  return new Response(null,{status,headers});
}
function pathOf(url) {
  let p = new URL(url).pathname;
  for (let i=0; i<2; i++) {
    const decoded=decodeURIComponent(p);
    if(decoded===p)break;
    p=decoded;
  }
  return p.replace(/\\/g,"/").replace(/\/{2,}/g,"/");
}
export default {
  async fetch(request, env) {
    let path;
    try {path=pathOf(request.url);} catch {return blocked(400,"rejected",request.method);}
    if (!["GET","HEAD"].includes(request.method)) return blocked(405,"method-blocked",request.method);
    if (path==="/security-firewall-check") return blocked(204,"active",request.method);
    if (SECRET_PATH.test(path)) {
      // The binding applies per Cloudflare location; it is not a global WAF or IP log.
      // Failure of the limiter cannot make a private path available.
      try {
        const source=request.headers.get("CF-Connecting-IP") || "missing-edge-source";
        if (env.ABUSE_LIMIT && !(await env.ABUSE_LIMIT.limit({key:source})).success) return blocked(429,"limited",request.method);
      } catch {}
      return blocked(404,"path-blocked",request.method);
    }
    return env.ASSETS.fetch(request);
  }
};
