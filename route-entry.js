/* Static-host fallback. Forward only explicitly supported same-origin paths. */
(function(){
  'use strict';
  const match=location.pathname.match(/^\/(news|verify)(?:\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))?\/?$/i);
  if(!match)return;
  const kind=match[1].toLowerCase();
  // A fragment is not transmitted in HTTP requests. Never forward arbitrary query strings.
  const fragment=location.hash.slice(1);
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const id=match[2]|| (uuid.test(fragment)?fragment:'');
  location.replace('/#'+kind+(id?'/'+id.toLowerCase():''));
})();
