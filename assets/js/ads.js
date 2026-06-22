/* =====================================================================
   AXIOM — Google AdSense activation
   The .ad slots render as labelled placeholders until you set ADSENSE_CLIENT
   below (your "ca-pub-…" after AdSense approves the site). When set, this
   swaps each slot for a real <ins class="adsbygoogle"> unit and loads the
   AdSense loader.

   IMPORTANT — when you set ADSENSE_CLIENT you must ALSO widen the CSP on each
   page (index/category/article) to allow AdSense, e.g. add to the meta CSP:
     script-src ... https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com;
     frame-src https://googleads.g.doubleclick.net https://*.google.com https://*.googlesyndication.com;
     img-src ... https://*.g.doubleclick.net https://*.googlesyndication.com;
   and in vercel.json. Give each slot a real unit id via data-ad-slot="...".
   ===================================================================== */
(function () {
  "use strict";
  var ADSENSE_CLIENT = ""; // e.g. "ca-pub-1234567890123456"
  if (!ADSENSE_CLIENT) return; // not configured → keep placeholders

  var loader = document.createElement("script");
  loader.async = true;
  loader.crossOrigin = "anonymous";
  loader.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(ADSENSE_CLIENT);
  document.head.appendChild(loader);

  Array.prototype.forEach.call(document.querySelectorAll(".ad"), function (box) {
    var slot = box.getAttribute("data-ad-slot") || "";
    box.innerHTML = '<ins class="adsbygoogle" style="display:block;width:100%;height:100%" ' +
      'data-ad-client="' + ADSENSE_CLIENT + '"' + (slot ? ' data-ad-slot="' + slot + '"' : "") +
      ' data-ad-format="auto" data-full-width-responsive="true"></ins>';
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  });
})();
