// Defense in depth for sensitive and unmatched routes. Public assets remain asset-first.
const SECRET_PATH = /^\/(?:\.git(?:\/|$)|\.github(?:\/|$)|\.env(?:[./]|$)|database(?:\/|$)|scripts(?:\/|$)|tests(?:\/|$)|supabase(?:\/|$)|worker(?:\/|$)|backups(?:\/|$)|compliance(?:\/|$)|isms(?:\/|$)|dist(?:\/|$)|node_modules(?:\/|$)|vendor(?:\/|$)|wp-admin(?:\/|$)|wp-login\.php(?:\/|$))/i;
const DEVELOPMENT_FILE = /(?:^|\/)(?:_config\.yml|_headers|wrangler\.jsonc|vercel\.json|package(?:-lock)?\.json)(?:\/|$)|\.(?:sql|sh|py|cjs|mjs|ts|md|toml|ya?ml|bak|backup|old|dump)(?:\/|$)/i;
const PUBLIC_DISCLOSURE = "/.well-known/security.txt";

function blocked(status, label) {
  const headers = new Headers({
    "Cache-Control":"no-store",
    "X-Content-Type-Options":"nosniff",
    "X-Frame-Options":"DENY",
    "Content-Security-Policy":"default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    "Referrer-Policy":"no-referrer",
    "Strict-Transport-Security":"max-age=31536000",
    "X-Family-Guard":label
  });
  if (status === 405) headers.set("Allow","GET, HEAD");
  if (status === 429 || status === 503) headers.set("Retry-After","60");
  return new Response(null,{status,headers});
}

function pathOf(url) {
  let p = new URL(url).pathname;
  if (p.length > 4096) throw new Error("path budget");
  // Decode to a bounded fixed point. Never pass ambiguous nested encoding through.
  for (let i=0; i<5; i++) {
    if (!p.includes("%")) break;
    p = decodeURIComponent(p);
  }
  if (p.includes("%") || /[\x00-\x1f\x7f?#]/.test(p)) throw new Error("ambiguous path");
  const parts = [];
  for (const part of p.replace(/\\/g,"/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") { parts.pop(); continue; }
    parts.push(part);
  }
  return "/" + parts.join("/");
}

function sensitive(path) {
  if (path === PUBLIC_DISCLOSURE) return false;
  return SECRET_PATH.test(path) || DEVELOPMENT_FILE.test(path) ||
    path.split("/").some(part => part.startsWith("."));
}

export default {
  async fetch(request, env) {
    let path;
    try { path=pathOf(request.url); } catch { return blocked(400,"rejected"); }
    if (!["GET","HEAD"].includes(request.method)) return blocked(405,"method-blocked");
    if (path === "/security-firewall-check") return blocked(204,"active");
    if (sensitive(path)) {
      // Per-location rate limiter. A missing or failed limiter never opens a protected path.
      try {
        const source=request.headers.get("CF-Connecting-IP") || "missing-edge-source";
        if (env.ABUSE_LIMIT && !(await env.ABUSE_LIMIT.limit({key:source})).success) return blocked(429,"limited");
      } catch {}
      return blocked(404,"path-blocked");
    }
    try { return await env.ASSETS.fetch(request); }
    catch { return blocked(503,"unavailable"); }
  }
};
