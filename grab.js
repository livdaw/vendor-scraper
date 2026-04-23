// Single-product grabber - loaded by the "Grab Product" bookmarklet
(function(){
// ── Status toast ──
var _toast=document.createElement("div");
_toast.style.cssText="position:fixed;top:10px;right:10px;z-index:999999;background:#1a1d27;color:#e4e6ef;font-family:monospace;font-size:13px;padding:12px 20px;border-radius:8px;border:1px solid #6c72ff;box-shadow:0 4px 20px rgba(0,0,0,0.4);max-width:400px;";
_toast.innerHTML='<span style="color:#fb923c">\u1F4CC</span> Extracting product...';
document.body.appendChild(_toast);

try{
// ── SCRAPER CORE ──

var DELAY=1500;
var wait=function(ms){return new Promise(function(r){setTimeout(r,ms);});};
window.__scrapedProducts=window.__scrapedProducts||[];
window.__stopScraper=false;
console.log("Type window.__stopScraper=true to stop early");

async function fetchDoc(u){var r=await fetch(u,{credentials:"include"});return new DOMParser().parseFromString(await r.text(),"text/html");}

// ── Platform detection ──
function detectPlatform(doc){
  // Shopify detection (check before others)
  if(doc.querySelector('link[href*="cdn.shopify"]')||doc.querySelector('script[src*="cdn.shopify"]')||doc.querySelector('meta[name="shopify-checkout-api-token"]')||doc.querySelector('#shopify-section-header')||window.Shopify)return "shopify";
  if(doc.querySelector('link[href*="bigcommerce"]')||doc.querySelector('script[src*="bigcommerce"]')||doc.querySelector('.productView')||doc.querySelector('[data-content-region]')||doc.querySelector('meta[name="platform"][content*="BigCommerce"]'))return "bigcommerce";
  // Brothers Office Furniture (custom platform)
  if(doc.querySelector('.detailspage')||doc.querySelector('.proditemno')||doc.querySelector('a[href*="d-url-"]'))return "brothers";
  if(doc.querySelector('.woocommerce')||doc.querySelector('body.woocommerce')||doc.querySelector('.woocommerce-breadcrumb')||doc.querySelector('meta[name="generator"][content*="WooCommerce"]')||doc.querySelector('.product_title'))return "woocommerce";
  // Fallback: check URL patterns
  if(document.querySelector('.productView'))return "bigcommerce";
  if(location.hostname.indexOf("brothersofficefurniture")>=0)return "brothers";
  return "woocommerce";
}
var PLATFORM=detectPlatform(document);
console.log("Detected platform: "+PLATFORM);

// ── Clean title ──
function cleanTitle(t){
  t=t.replace(/\\u00a3[\\d,.]+\\s*(?:\\+\\s*vat|inc\\s*vat|per\\s+\\w+|each)?[^a-zA-Z]*/gi,"");
  t=t.replace(/(?:discounted|clearance|sale|special offer|end of line|from \\u00a3)[^a-zA-Z]*/gi,"");
  t=t.replace(/(?:these are not sold|not sold|please contact|contact to|make sure|we have available|check availability)[^.]*\\.?/gi,"");
  t=t.replace(/(?:price|prices)\\s*(?:from|:)?\\s*\\u00a3?[\\d,.]*[^a-zA-Z]*/gi,"");
  t=t.replace(/\\breclaimed\\b/gi,"").replace(/\\s{2,}/g," ").trim();
  // Strip trailing SKU/model numbers like "- 1318", "- 1306 x", "- 1239 x"
  t=t.replace(/\\s*[-–]\\s*\\d{3,}\\s*x?\\s*$/i,"").trim();
  t=t.replace(/\\s*[-–]\\s*[A-Z]*\\d{3,}[A-Z]*\\s*x?\\s*$/i,"").trim();
  t=t.replace(/\\s*\\(\\d{3,}\\)\\s*$/,"").trim();
  // Strip trailing SKU codes like "U-O-BL-99", "U-MC-B-R(L)-01"
  t=t.replace(/\\s+U-[A-Z0-9][-A-Z0-9()]*\\s*$/,"").trim();
  t=t.replace(/\\s*\\.\\s*$/,"").trim();
  if(t===t.toUpperCase()&&t.length>5){t=t.toLowerCase().replace(/(?:^|\\s|-)\\w/g,function(c){return c.toUpperCase();});t=t.replace(/\\b(\\d+)(x)(\\d+)\\b/gi,"$1x$3").replace(/\\b(Mm|Vat|Inc|Uk)\\b/g,function(m){return m.toLowerCase();});}
  if(t===t.toLowerCase()&&t.length>5){t=t.replace(/(?:^|\\s)\\w/g,function(c){return c.toUpperCase();});}
  return t;
}

// ── Clean description ──
function isJunkDesc(d){
  if(!d)return true;
  var dl=d.toLowerCase();
  // Form text from popups
  if(dl.indexOf("name phone company message submit")>=0)return true;
  if(dl.indexOf("sign up to our newsletter")>=0)return true;
  if(dl.indexOf("email name i agree")>=0)return true;
  // Navigation text
  if(dl.indexOf("all used storage")>=0||dl.indexOf("all new storage")>=0)return true;
  if(dl.indexOf("all used seating")>=0||dl.indexOf("all new seating")>=0)return true;
  if(dl.indexOf("cupboards pedestals filing cabinets")>=0)return true;
  // Too short after trimming
  if(dl.trim().length<15)return true;
  return false;
}
function cleanDesc(d){
  if(!d)return"";
  d=d.replace(/^\\s*description\\s*/i,"");
  d=d.replace(/\\u00a3[\\d,.]+\\s*(?:\\+\\s*vat|inc\\s*vat|exc?\\.?\\s*vat|per\\s+\\w+|each|a\\s+\\w+)?/gi,"");
  d=d.replace(/\\d+p\\s+a\\s+\\w+\\s*(?:\\+\\s*vat)?/gi,"");
  d=d.replace(/price\\s*:?[^.\\n]*/gi,"");
  d=d.replace(/(?:the\\s+)?buy\\s+it\\s+now[^.\\n]*/gi,"");
  d=d.replace(/you\\s+are\\s+buying[^.\\n]*/gi,"");
  d=d.replace(/please\\s+(?:contact|call|check|see|do not)[^.\\n]*/gi,"");
  d=d.replace(/for\\s+individual[^.\\n]*/gi,"");
  d=d.replace(/this\\s+listing\\s+is[^.\\n]*/gi,"");
  d=d.replace(/we\\s+(?:also\\s+)?(?:sell|have|do)[^.\\n]*/gi,"");
  d=d.replace(/delivery[^.\\n]*/gi,"");
  d=d.replace(/stock\\s*:?\\s*\\d+/gi,"");
  d=d.replace(/\\d+\\s*(?:available|in stock|remaining|left)/gi,"");
  d=d.replace(/pack\\s*(?:price|size)?\\s*:?[^.\\n]*/gi,"");
  d=d.replace(/\\+\\s*vat\\.?/gi,"");
  d=d.replace(/condition\\s+is\\s+\\w+\\.?/gi,"");
  d=d.replace(/dimensions\\s*:?[^.\\n]*/gi,"");
  d=d.replace(/width\\s*[:=]?\\s*\\d+\\s*(?:mm|cm)\\.?/gi,"");
  d=d.replace(/height\\s*[:=]?\\s*\\d+\\s*(?:mm|cm)\\.?/gi,"");
  d=d.replace(/depth\\s*[:=]?\\s*\\d+\\s*(?:mm|cm)\\.?/gi,"");
  d=d.replace(/length\\s*[:=]?\\s*\\d+\\s*(?:mm|cm)\\.?/gi,"");
  d=d.replace(/weight\\s*[:=]?\\s*[\\d.]+\\s*(?:kg|g)\\.?/gi,"");
  d=d.replace(/\\d+\\s*(?:mm|cm)?\\s*[x\u00d7]\\s*\\d+\\s*(?:mm|cm)?\\s*[x\u00d7]\\s*\\d+\\s*(?:mm|cm)?/gi,"");
  d=d.replace(/updated\\s+[\\d.]+\\s*[-–]\\s*tbc\\.?/gi,"");
  d=d.replace(/updated\\s+[\\d.\/]+\\s*[-–]\\s*[A-Z]{1,4}\\.?/gi,"");
  d=d.replace(/approximate\\s+lead\\s+time[^.\\n]*/gi,"");
  d=d.replace(/\\d+\\s+working\\s+days[^.\\n]*/gi,"");
  d=d.replace(/used\\s+furniture\\s+may\\s+show[^.\\n]*/gi,"");
  d=d.replace(/or\\s+earlier\\s+if\\s+required[^.\\n]*/gi,"");
  // Remove leading SKU codes like "U-BT-BL-02 Product Name"
  d=d.replace(/^\\s*U-[A-Z0-9][-A-Z0-9()]*\\s+/i,"");
  d=d.replace(/\\breclaimed\\b/gi,"");
  d=d.replace(/\\n\\s*\\n/g,"\\n").replace(/\\s{2,}/g," ").trim();
  if(d===d.toUpperCase()&&d.length>10){d=d.charAt(0)+d.slice(1).toLowerCase();d=d.replace(/\\.\\s+(\\w)/g,function(m,c){return". "+c.toUpperCase();});}
  d=d.replace(/^\\s*[.,;:\\-]+/,"").trim();
  d=d.replace(/[.,;:\\-]+\\s*$/,"").trim();
  if(d.length>500)d=d.substring(0,500);
  return d;
}

// ── WooCommerce product detection ──
function isWooProductUrl(h){
  var a=h.includes("/shop/"),b=h.includes("/product/");
  if(!a&&!b)return false;
  if(b){if(h.includes("/product-category/")||h.includes("/product-tag/"))return false;return(h.split("/product/")[1]||"").split("/").filter(Boolean).length>=1;}
  if(a){if(h.endsWith("/shop/")||h.endsWith("/shop"))return false;return(h.split("/shop/")[1]||"").split("/").filter(Boolean).length>=2;}
  return false;
}

// ── BigCommerce product detection ──
function isBCProductUrl(doc){
  // A BigCommerce product page has .productView or product schema
  return !!doc.querySelector('.productView')||!!doc.querySelector('[itemtype*="schema.org/Product"]');
}

// ── WooCommerce extract ──
function extractWoo(doc,url){
  var title="";var te=doc.querySelector(".product_title")||doc.querySelector("h1.entry-title")||doc.querySelector("h1.elementor-heading-title")||doc.querySelector(".summary h1")||doc.querySelector("h1");
  if(te)title=te.textContent.trim();if(!title)return null;
  title=cleanTitle(title);if(!title)return null;

  var price=0;
  doc.querySelectorAll('script[type="application/ld+json"]').forEach(function(s){try{var d=JSON.parse(s.textContent);if(d.offers){var p=d.offers.price||(d.offers[0]&&d.offers[0].price);if(p)price=parseFloat(p);}if(d["@graph"])d["@graph"].forEach(function(i){if(i["@type"]==="Product"&&i.offers)[].concat(i.offers).forEach(function(o){if(o.price&&parseFloat(o.price)>0)price=parseFloat(o.price);if(o.lowPrice)price=parseFloat(o.lowPrice);});})}catch(e){}});
  if(price===0){var m=doc.querySelector('meta[property="product:price:amount"]');if(m)price=parseFloat(m.content)||0;}
  if(price===0){[".price ins .woocommerce-Price-amount bdi",".price .woocommerce-Price-amount bdi",".price .woocommerce-Price-amount",".summary .price",".price"].forEach(function(sel){if(price>0)return;var el=doc.querySelector(sel);if(el){var ms=el.textContent.match(/[\\d,]+\\.?\\d*/g);if(ms)ms.forEach(function(x){if(price>0)return;var v=parseFloat(x.replace(",",""));if(v>0)price=v;});}});}
  // Fallback: scan page text for "Our Price £XX" or "Price: £XX" patterns
  if(price===0){
    var bodyText=doc.body?doc.body.textContent:"";
    var pricePatterns=["our price","sale price","your price","now price","offer price","price:"];
    pricePatterns.forEach(function(pat){
      if(price>0)return;
      var idx=bodyText.toLowerCase().indexOf(pat);
      if(idx>=0){
        var after=bodyText.substring(idx,idx+60);
        var pm=after.match(/[£$][ \t]*([0-9,]+\.?[0-9]*)/);
        if(pm){var v=parseFloat(pm[1].replace(",",""));if(v>0)price=v;}
      }
    });
  }
  var desc="";var de=null;
  // 1. Try JSON-LD description (most reliable, bypasses layout issues)
  doc.querySelectorAll('script[type="application/ld+json"]').forEach(function(s){if(desc)return;try{var d=JSON.parse(s.textContent);var checkDesc=function(obj){if(obj&&obj["@type"]==="Product"&&obj.description){var dd=obj.description.trim();if(dd.length>20&&!isJunkDesc(dd))desc=dd.substring(0,800);}};checkDesc(d);if(d["@graph"])d["@graph"].forEach(checkDesc);}catch(e){}});
  // 2. Try standard WooCommerce selectors
  if(!desc||desc.length<30||isJunkDesc(desc)){
    var descSels=[
      ".woocommerce-product-details__short-description",
      "#tab-description .woocommerce-Tabs-panel--description",
      ".woocommerce-Tabs-panel--description",
      "#tab-description",
      ".product-description"
    ];
    for(var di=0;di<descSels.length;di++){if(desc&&desc.length>30)break;de=doc.querySelector(descSels[di]);if(de){
      var lis=de.querySelectorAll("li");
      if(lis.length>1){var parts=[];lis.forEach(function(li){var t=li.textContent.trim();if(t)parts.push(t);});desc=parts.join(". ").substring(0,800);}
      else{var dt=de.textContent.trim();if(dt.length>20)desc=dt.substring(0,800);}
    }}
  }
  // 3. Try summary area lists and paragraphs
  if(!desc||desc.length<30||isJunkDesc(desc)){
    // First try: any UL in the product/summary/content area (covers Elementor layouts)
    var prodContainers=doc.querySelectorAll(".summary,.product-summary,.entry-summary,.product,.elementor-widget-woocommerce-product-content,.elementor-widget-theme-post-content,.site-content,#content");
    for(var ci=0;ci<prodContainers.length;ci++){
      if(desc&&desc.length>30&&!isJunkDesc(desc))break;
      var cont=prodContainers[ci];
      if(cont.closest("nav,header,.elementor-location-header"))continue;
      var uls=cont.querySelectorAll("ul");
      for(var ui=0;ui<uls.length;ui++){
        var ul=uls[ui];
        // Skip if UL is inside nav or is a menu
        if(ul.closest("nav,header,.navPages,.menu,.elementor-nav-menu"))continue;
        if(ul.classList.contains("products")||ul.classList.contains("woocommerce-error"))continue;
        var lis=ul.querySelectorAll("li");
        if(lis.length>=2&&lis.length<=20){
          var parts=[];lis.forEach(function(li){
            var t=li.textContent.trim();
            if(t&&t.length>2&&t.length<200&&t.indexOf("Add to")<0&&t.indexOf("\\u00a3")<0&&t.indexOf("All Used")<0&&t.indexOf("All New")<0&&!li.querySelector("a[href*=product-category]"))parts.push(t);
          });
          var joined=parts.join(". ");
          if(joined.length>30&&!isJunkDesc(joined)){desc=joined.substring(0,800);break;}
        }
      }
    }
    // Also try summary paragraphs
    if(!desc||desc.length<30||isJunkDesc(desc)){
      var summ=doc.querySelector(".summary,.product-summary,.entry-summary");
      if(summ){
        var ps=[];summ.querySelectorAll("p").forEach(function(p){
          var t=p.textContent.trim();
          if(t.length>20&&t.indexOf("\\u00a3")<0&&t.indexOf("SKU")<0&&!p.closest("nav,.navPages,header"))ps.push(t);
        });
        if(ps.length)desc=ps.join(" ").substring(0,800);
      }
    }
  }
  // 4. Fallback: Elementor content blocks NOT inside nav
  if(!desc||desc.length<30||isJunkDesc(desc)){
    doc.querySelectorAll(".elementor-widget-container,.product .entry-content,.product-info").forEach(function(el){
      if(el.closest("nav,header,.navPages,.elementor-location-header"))return;
      var t=el.textContent.trim();
      // Skip if it looks like navigation (contains category listing keywords)
      if(t.indexOf("All Used")>=0||t.indexOf("All New")>=0||t.indexOf("VIEW PRODUCTS")>=0)return;
      if(t.indexOf("Add to cart")>=0||t.indexOf("Add to basket")>=0)return;
      if(t.length>30&&t.length<2000&&t.length>(desc||"").length)desc=t.substring(0,800);
    });
  }
  // 5. Try og:description meta tag as last resort
  if(!desc||desc.length<30||isJunkDesc(desc)){var ogd=doc.querySelector('meta[property="og:description"]');if(ogd&&ogd.content&&ogd.content.length>20&&!isJunkDesc(ogd.content))desc=ogd.content.substring(0,800);}
  var rawDesc=desc||""; // Save before cleaning for dimension parsing
  desc=cleanDesc(desc);
  // Final junk check
  if(isJunkDesc(desc))desc="";

  // Extract dimensions from raw description + product area text
  var prodArea=doc.querySelector(".summary,.product-summary,.entry-summary,.product,#content,.site-content,.elementor[data-elementor-type=product]");
  var bodyText=doc.body?doc.body.textContent:"";
  var allProdText=(rawDesc+" "+(de?de.textContent:"")+" "+(prodArea?prodArea.textContent:bodyText)).toLowerCase();
  // Debug: log what we're searching
  var hasWidth=allProdText.indexOf("width")>=0;
  var hasHeight=allProdText.indexOf("height")>=0;
  console.log("  [dims] rawDesc length:"+rawDesc.length+", de:"+(de?"yes":"null")+", prodArea:"+(prodArea?prodArea.tagName:"null")+", allProdText has width:"+hasWidth+", height:"+hasHeight+", total length:"+allProdText.length);

  var imgs=[],seen=new Set();
  // 1. Try JSON-LD for images (often has full gallery)
  doc.querySelectorAll('script[type="application/ld+json"]').forEach(function(s){try{var d=JSON.parse(s.textContent);var checkImgs=function(obj){if(!obj||obj["@type"]!=="Product")return;if(obj.image){var oi=Array.isArray(obj.image)?obj.image:[obj.image];oi.forEach(function(im){var src=typeof im==="string"?im:(im.url||im.contentUrl||"");if(src&&!seen.has(src)){seen.add(src);imgs.push(src);}});}};checkImgs(d);if(d["@graph"])d["@graph"].forEach(checkImgs);}catch(e){}});
  // 2. WooCommerce gallery: get full-size URLs from gallery divs and their child <a> tags
  doc.querySelectorAll(".woocommerce-product-gallery__image").forEach(function(div){
    var src=div.getAttribute("data-large_image")||div.getAttribute("data-thumb");
    var a=div.querySelector("a");if(a&&a.href&&a.href.indexOf("http")===0)src=src||a.href;
    var img=div.querySelector("img");
    if(img){src=src||img.getAttribute("data-large_image")||img.getAttribute("data-src")||img.getAttribute("data-lazy-src")||img.src;}
    if(src&&!seen.has(src)&&src.indexOf("placeholder")<0&&src.indexOf("data:image")<0){seen.add(src);imgs.push(src);}
  });
  // 3. Broader selectors for Elementor/other gallery structures
  [".woocommerce-product-gallery img",".wp-post-image",".product-gallery img",".elementor-widget-woocommerce-product-images img"].forEach(function(sel){doc.querySelectorAll(sel).forEach(function(el){
    var src=el.getAttribute("data-large_image")||el.getAttribute("data-src")||el.getAttribute("data-lazy-src")||el.src;
    // Skip tiny thumbnails
    if(src&&src.match(/[0-9]+x[0-9]+/)){var m=src.match(/([0-9]+)x([0-9]+)/);if(m&&parseInt(m[1])<200)return;}
    if(src&&!seen.has(src)&&src.indexOf("placeholder")<0&&src.indexOf("data:image")<0){seen.add(src);imgs.push(src);}
  });});
  // 3b. Elementor lightbox gallery links (full-size image URLs in href)
  doc.querySelectorAll('a[data-elementor-open-lightbox],a.gallery-item,a.elementor-gallery-item').forEach(function(a){
    var src=a.href||a.getAttribute("href");
    if(src&&(src.indexOf(".jpg")>0||src.indexOf(".jpeg")>0||src.indexOf(".png")>0||src.indexOf(".webp")>0)){
      if(!seen.has(src)&&src.indexOf("placeholder")<0){seen.add(src);imgs.push(src);}
    }
  });
  // 3c. Generic: find all content images not in nav/header/footer (for custom platforms)
  if(imgs.length<=1){
    var skipImgPats=["logo","banner","icon","dot0","shadow","nextday","delivery-side","favicon","payment","footer","header","social","sprite"];
    doc.querySelectorAll("img[src]").forEach(function(el){
      if(el.closest("nav,header,footer,.menu,.sidebar,#sidebar"))return;
      var src=el.getAttribute("data-large_image")||el.getAttribute("data-src")||el.src;
      if(!src||src.indexOf("data:image")===0)return;
      // Skip site chrome images
      var dominated=false;skipImgPats.forEach(function(p){if(src.toLowerCase().indexOf(p)>=0)dominated=true;});
      if(dominated)return;
      // Skip tiny images (likely icons)
      var w=el.naturalWidth||parseInt(el.getAttribute("width"))||0;
      if(w>0&&w<100)return;
      if(!seen.has(src)){seen.add(src);imgs.push(src);}
    });
  }
  // 4. Scan raw HTML source for product image URLs (Elementor stores gallery in JS config, not as img tags)
  if(imgs.length<=1){
    var html=doc.documentElement?doc.documentElement.outerHTML:(doc.body?doc.body.innerHTML:"");
    // Build product pattern from SKU or first image filename
    var prodPattern=null;
    // Try SKU first (most reliable)
    var skuForImg=doc.querySelector(".sku");
    if(skuForImg&&skuForImg.textContent.trim()&&skuForImg.textContent.trim()!=="N/A"){
      prodPattern=skuForImg.textContent.trim();
    }
    // Fallback: extract from first known image filename
    if(!prodPattern&&imgs.length){
      var fn=imgs[0].split("/").pop().split(".")[0];
      fn=fn.replace(/-[0-9]+x[0-9]+$/,"").replace(/-[0-9]+$/,"");
      if(fn.length>3)prodPattern=fn;
    }
    // Only proceed if we have a pattern to match against
    if(prodPattern){
      var chunks=html.split("wp-content/uploads/");
      var rawUrls=[];
      for(var ci=1;ci<chunks.length;ci++){
        var before=chunks[ci-1].slice(-200);
        var httpIdx=before.lastIndexOf("http");
        if(httpIdx<0)continue;
        var urlStart=before.substring(httpIdx);
        var after=chunks[ci];
        var endIdx=0;
        for(var ei=0;ei<after.length&&ei<300;ei++){
          var ch=after[ei];
          if(ch==='"'||ch==="'"||ch===' '||ch===')'||ch==='>'||ch==='\\\\')break;
          endIdx=ei+1;
        }
        var fullUrl=urlStart+"wp-content/uploads/"+after.substring(0,endIdx);
        // Clean up JSON-escaped URLs (Elementor stores \/ instead of /)
        fullUrl=fullUrl.split("\\\\").join("");
        // Fix protocol - ensure https:// has double slash
        fullUrl=fullUrl.replace(/^https?:[/](?![/])/,"https://");
        if(fullUrl.indexOf(".jpg")>0||fullUrl.indexOf(".jpeg")>0||fullUrl.indexOf(".png")>0||fullUrl.indexOf(".webp")>0){
          fullUrl=fullUrl.replace(/&quot;$/,"").replace(/&amp;/g,"&");
          rawUrls.push(fullUrl);
        }
      }
      // Filter to only URLs containing our product pattern
      var fullSize={};
      rawUrls.forEach(function(u){
        if(u.indexOf(prodPattern)<0)return;
        // Skip tiny thumbnails (keep originals and medium+ sizes)
        var fn=u.split("/").pop();
        var dimMatch=fn.match(/-([0-9]+)x([0-9]+)[.]/);
        if(dimMatch&&parseInt(dimMatch[1])<200)return;
        // Group by base URL (without dimensions)
        var baseUrl=u.replace(/-[0-9]+x[0-9]+[.]/,".");
        if(!fullSize[baseUrl])fullSize[baseUrl]={full:null,any:u};
        if(!dimMatch)fullSize[baseUrl].full=u;
      });
      Object.keys(fullSize).forEach(function(base){
        var src=fullSize[base].full||fullSize[base].any;
        if(src&&!seen.has(src)){seen.add(src);imgs.push(src);}
      });
    }
  }
  // 5. Fallback: og:image
  if(!imgs.length){var og=doc.querySelector('meta[property="og:image"]');if(og&&og.content)imgs.push(og.content);}

  var sku="";var se=doc.querySelector(".sku");if(se){sku=se.textContent.trim();if(sku==="N/A")sku="";}
  // If no SKU from markup, try extracting from original title (before cleaning)
  if(!sku){var origTitle=(te?te.textContent.trim():"");var skuMatch=origTitle.match(/\\s+(U-[A-Z0-9][-A-Z0-9()]*)\\s*$/);if(skuMatch)sku=skuMatch[1];var skuMatch2=origTitle.match(/\\s*[-–]\\s*(\\d{3,}\\s*x?)\\s*$/i);if(!sku&&skuMatch2)sku=skuMatch2[1].trim();}
  // Text-based SKU: "Item No: XX", "REF: XX", "Product Code: XX", "SKU: XX"
  if(!sku){
    var bodyT=doc.body?doc.body.textContent:"";
    var skuPats=["item no","ref:","product code","sku:","article no","model no"];
    skuPats.forEach(function(pat){
      if(sku)return;
      var idx=bodyT.toLowerCase().indexOf(pat);
      if(idx>=0){
        var after=bodyT.substring(idx+pat.length,idx+pat.length+30).trim();
        after=after.replace(/^[: ]+/,"").split(/ /)[0].trim();
        if(after.length>=2&&after.length<=20)sku=after;
      }
    });
  }
  var tags=[];doc.querySelectorAll(".tagged_as a,.posted_in a,.product_meta a[rel=tag]").forEach(function(a){var t=a.textContent.trim();if(t&&tags.indexOf(t)<0)tags.push(t);});

  var weight="",dims={};
  doc.querySelectorAll(".woocommerce-product-attributes tr,.additional_information tr,table.shop_attributes tr").forEach(function(row){var th=row.querySelector("th,td:first-child"),td=row.querySelector("td:last-child");if(th&&td){var l=th.textContent.toLowerCase(),v=td.textContent.trim();if(l.indexOf("weight")>=0)weight=v;if(l.indexOf("dimension")>=0){var d=v.match(/([\\d.]+)/g);if(d&&d.length>=3){dims.length=d[0];dims.width=d[1];dims.height=d[2];}}}});
  // Also try Elementor spec tables, custom spec rows, and description text
  if(!dims.width&&!dims.height){
    doc.querySelectorAll(".elementor-widget-container table tr,table tr,.product-specs tr,.specification tr").forEach(function(row){
      var cells=row.querySelectorAll("td,th");if(cells.length<2)return;
      var l=cells[0].textContent.toLowerCase().trim(),v=cells[cells.length-1].textContent.trim();
      if(l.indexOf("width")>=0&&!dims.width)dims.width=v;
      if(l.indexOf("height")>=0&&!dims.height)dims.height=v;
      if((l.indexOf("depth")>=0||l.indexOf("length")>=0)&&!dims.length)dims.length=v;
      if(l.indexOf("weight")>=0&&!weight)weight=v;
    });
  }
  // Try parsing WxHxD from product area text
  if(!dims.width&&!dims.height){
    // Simple line-by-line parsing (avoids regex escaping issues in template literals)
    var lines=allProdText.split(/[\\n\\r.]+/);
    for(var li=0;li<lines.length;li++){
      var ln=lines[li].trim().toLowerCase();
      if(!dims.width&&ln.indexOf("width")>=0){var nm=ln.replace(/[^0-9]/g,"");if(nm.length>=3&&nm.length<=5)dims.width=nm+"mm";}
      if(!dims.height&&ln.indexOf("height")>=0){var nm=ln.replace(/[^0-9]/g,"");if(nm.length>=3&&nm.length<=5)dims.height=nm+"mm";}
      if(!dims.length&&(ln.indexOf("depth")>=0||ln.indexOf("length")>=0)){var nm=ln.replace(/[^0-9]/g,"");if(nm.length>=3&&nm.length<=5)dims.length=nm+"mm";}
      if(!weight&&ln.indexOf("weight")>=0){var nm=ln.match(/([0-9.]+)/);if(nm)weight=nm[1]+"kg";}
    }
    // Also try WxHxD pattern: "1200 x 800 x 750"
    var xm=allProdText.match(/([0-9]{3,5})[^0-9]*x[^0-9]*([0-9]{3,5})[^0-9]*x[^0-9]*([0-9]{3,5})/);
    if(xm&&!dims.width){dims.width=xm[1]+"mm";dims.height=xm[2]+"mm";dims.length=xm[3]+"mm";}
    console.log("  [dims] Parsed: w="+JSON.stringify(dims.width)+" h="+JSON.stringify(dims.height)+" l="+JSON.stringify(dims.length));
  }
  var variants=[];var vf=doc.querySelector("form.variations_form");
  if(vf&&vf.getAttribute("data-product_variations")){try{var vd=JSON.parse(vf.getAttribute("data-product_variations"));if(vd&&vd.length)vd.forEach(function(v){var at=v.attributes||{},vs=Object.values(at).filter(Boolean),ok=Object.keys(at)[0]||"",on=ok.replace("attribute_pa_","").replace("attribute_","").replace(/-/g," ");variants.push({title:vs.join(" / ")||"Default",sku:v.sku||sku,price:v.display_price||price,option_name:on||"Option",option_value:vs[0]||"Default"});});}catch(e){}}
  if(!variants.length)variants=[{title:"Default",sku:sku,price:price}];

  var qty=0;var stockEl=doc.querySelector(".stock.in-stock,.stock");
  if(stockEl){var sm=stockEl.textContent.match(/(\\d[\\d,]*)\\s*in\\s*stock/i);if(sm)qty=parseInt(sm[1].replace(",",""));else if(stockEl.classList.contains("in-stock"))qty=1;}
  if(qty===0){var qtyInput=doc.querySelector("input.qty,input[name=quantity]");if(qtyInput){var mx=qtyInput.getAttribute("max");if(mx&&parseInt(mx)>0)qty=parseInt(mx);else qty=1;}}
  if(qty===0){var allText=(doc.body?doc.body.textContent:"");var qm=allText.match(/(?:available *(?:quantity)?|quantity *available|in *stock) *[: ]*([0-9][0-9,]*)/i);if(qm)qty=parseInt(qm[1].replace(",",""));}
  if(qty===0){var qm2=(desc+" "+title).replace(/,/g,"").match(/([0-9]+)[ \t]*(?:available|in stock|remaining|left)/i);if(qm2)qty=parseInt(qm2[1]);}
  if(qty===0){var addBtn=doc.querySelector(".single_add_to_cart_button,button[name=add-to-cart]");if(addBtn&&!addBtn.disabled)qty=1;}

  var breadCat="";doc.querySelectorAll(".woocommerce-breadcrumb a,.breadcrumbs a,.posted_in a,.breadcrumb a").forEach(function(a){var t=a.textContent.trim();var h=a.href||"";if((h.indexOf("/product-category/")>=0||h.indexOf("/category/")>=0)&&t.length>1&&t.toLowerCase()!=="home")breadCat=t;});
  // Fallback: parse text breadcrumb (e.g. "Home > Seating > Operator Chairs")
  if(!breadCat){
    var bcText=doc.body?doc.body.textContent:"";
    var bcMatch=bcText.match(/Home *> *([^>]+) *> *([^>]+)/i);
    if(bcMatch){breadCat=(bcMatch[2]||bcMatch[1]).trim();}
  }

  // Sold/out-of-stock detection
  var isSold=false;
  var oos=doc.querySelector(".out-of-stock,.stock.out-of-stock");
  if(oos)isSold=true;
  var soldText=doc.body?doc.body.textContent.toLowerCase():"";
  if(soldText.indexOf("sold out")>=0||soldText.indexOf("out of stock")>=0||soldText.indexOf("no longer available")>=0)isSold=true;
  if(qty===0&&!doc.querySelector(".single_add_to_cart_button:not([disabled]),button[name=add-to-cart]:not([disabled]),[name=quantity]"))isSold=true;
  if(isSold)qty=0;
  if(isSold&&typeof SKIP_SOLD!=="undefined"&&SKIP_SOLD)return null;

  return{title:title,description:desc,price:price,url:url,images:imgs.slice(0,10),thumbnail:imgs[0]||"",sku:sku,weight:weight,dimensions:dims,tags:tags,variants:variants,quantity:qty,vendorCategory:breadCat};
}

// ── BigCommerce extract ──
function extractBC(doc,url){
  var title="";var te=doc.querySelector("h1.productView-title")||doc.querySelector("h1");
  if(te)title=te.textContent.trim();if(!title)return null;
  title=cleanTitle(title);if(!title)return null;

  var price=0;
  // Try displayed price first (most reliable for BC)
  var priceEls=[".productView-price .price--withoutTax .price-value","[data-product-price-without-tax]",".productView-price .price--main .price-value",".productView-price"];
  for(var pi=0;pi<priceEls.length;pi++){
    if(price>0)break;
    var pe=doc.querySelector(priceEls[pi]);
    if(pe){var pm=pe.textContent.match(/[\u00a3$]?([0-9,]+\.?[0-9]*)/);if(pm){var pv=parseFloat(pm[1].replace(",",""));if(pv>0&&pv<1000000)price=pv;}}
  }
  // Fallback: JSON-LD (but BC may store in cents)
  if(price===0){doc.querySelectorAll('script[type="application/ld+json"]').forEach(function(s){try{var d=JSON.parse(s.textContent);var offers=[];if(d["@type"]==="Product"&&d.offers)offers=[].concat(d.offers);if(d["@graph"])d["@graph"].forEach(function(i){if(i["@type"]==="Product"&&i.offers)offers=offers.concat([].concat(i.offers));});offers.forEach(function(o){if(o.price&&price===0){var pv=parseFloat(o.price);if(pv>0){if(pv>10000&&o.priceCurrency){price=pv/100;}else{price=pv;}}}});}catch(e){}});}
  var desc="";var de=doc.querySelector("#tab-description .productView-description")||doc.querySelector("#tab-description")||doc.querySelector(".productView-description");
  if(de)desc=de.textContent.trim().substring(0,800);
  desc=cleanDesc(desc);

  var imgs=[],seen=new Set();
  // BC uses full-size images linked from thumbnails or main image
  doc.querySelectorAll(".productView-thumbnail a,.productView-image a").forEach(function(a){var h=a.href;if(h&&h.indexOf("bigcommerce.com")>=0&&!seen.has(h)){seen.add(h);imgs.push(h);}});
  doc.querySelectorAll(".productView-image img,.productView-thumbnail img").forEach(function(img){var src=img.getAttribute("data-src")||img.src;if(src&&src.indexOf("loading.svg")<0&&src.indexOf("data:image")<0&&!seen.has(src)){seen.add(src);imgs.push(src);}});
  if(!imgs.length){var og=doc.querySelector('meta[property="og:image"]');if(og&&og.content)imgs.push(og.content);}

  var sku="";
  doc.querySelectorAll(".productView-info-value,.productView-info dd").forEach(function(el){var prev=el.previousElementSibling;if(prev&&prev.textContent.toLowerCase().indexOf("sku")>=0)sku=el.textContent.trim();});

  var weight="",dims={},condition="";
  doc.querySelectorAll(".productView-info-value,.productView-info dd,.productView-properties dd").forEach(function(el){
    var prev=el.previousElementSibling;if(!prev)return;
    var label=prev.textContent.toLowerCase().trim().replace(/:$/,"");
    var val=el.textContent.trim();
    if(label.indexOf("width")>=0)dims.width=val;
    if(label.indexOf("height")>=0)dims.height=val;
    if(label.indexOf("depth")>=0||label.indexOf("length")>=0)dims.length=val;
    if(label.indexOf("weight")>=0)weight=val;
    if(label.indexOf("condition")>=0)condition=val;
  });

  var qty=0;
  // BC shows "Current Stock:" or stock level
  doc.querySelectorAll(".productView-info-value,.productView-info dd").forEach(function(el){var prev=el.previousElementSibling;if(prev&&prev.textContent.toLowerCase().indexOf("current stock")>=0){var sv=el.textContent.trim().match(/\\d+/);if(sv)qty=parseInt(sv[0]);}});
  if(qty===0){var addBtn=doc.querySelector("#form-action-addToCart,button[data-button-type=add-cart],.button--addToCart");if(addBtn&&!addBtn.disabled)qty=1;}

  // BC breadcrumb
  var breadCat="";doc.querySelectorAll(".breadcrumb a,.breadcrumbs a").forEach(function(a){var t=a.textContent.trim();if(t.toLowerCase()!=="home"&&t.length>1)breadCat=t;});

  // Sold detection
  var isSold=false;
  var soldBadge=doc.querySelector('.sale-flag-side--sold,.product-badge--sold,[class*="sold"]');
  if(soldBadge)isSold=true;
  if(!isSold){var allText=doc.body?doc.body.textContent:"";if(allText.match(/\\bSOLD\\b/)&&!doc.querySelector('#form-action-addToCart:not([disabled])'))isSold=true;}
  if(qty===0&&!doc.querySelector('#form-action-addToCart:not([disabled]),button[data-button-type=add-cart]:not([disabled])'))isSold=true;
  if(isSold)qty=0;
  if(isSold&&typeof SKIP_SOLD!=="undefined"&&SKIP_SOLD)return null;

  var tags=[];
  var manufacturer="";doc.querySelectorAll(".productView-brand a,.productView-info-value").forEach(function(el){var prev=el.previousElementSibling;if(prev&&prev.textContent.toLowerCase().indexOf("brand")>=0)manufacturer=el.textContent.trim();if(el.closest(".productView-brand"))manufacturer=el.textContent.trim();});

  return{title:title,description:desc,price:price,url:url,images:imgs.slice(0,10),thumbnail:imgs[0]||"",sku:sku,weight:weight,dimensions:dims,tags:tags,variants:[{title:"Default",sku:sku,price:price}],quantity:qty,vendorCategory:breadCat,manufacturer:manufacturer||"",condition:condition};
}

// ── Unified extract ──
// ── Brothers Office Furniture extract ──
function extractBrothers(doc,url){
  // Title from h1
  var te=doc.querySelector("h1");
  var title=te?te.textContent.trim():"";
  title=title.replace(/[ \t]*-[ \t]*$/,"").trim(); // remove trailing dash
  title=cleanTitle(title);if(!title)return null;

  // SKU from .proditemno or Item No pattern
  var sku="";
  var skuEl=doc.querySelector(".proditemno");
  if(skuEl){var sm=skuEl.textContent.match(/Item No[: ]*([A-Z0-9]+)/i);if(sm)sku=sm[1];}
  if(!sku){var rm=doc.body.innerHTML.match(/REF[: ]*([A-Z0-9]+)/);if(rm)sku=rm[1];}

  // Parse productname01/productname02 label-value pairs
  var fields={};
  doc.querySelectorAll(".productname01").forEach(function(label){
    var key=label.textContent.trim().toLowerCase().replace(/[ \t]+/g," ");
    var val=label.nextElementSibling;
    if(val)fields[key]=val;
  });

  // Price from "Our Price" field
  var price=0;
  var priceEl=fields["our price"];
  if(priceEl){var pm=priceEl.textContent.match(/[\u00a3][ \t]*([0-9,]+\.?[0-9]*)/);if(pm)price=parseFloat(pm[1].replace(",",""));}
  // Fallback: "Regular Retail Price"
  if(price===0){var rrpEl=fields["regular retail price"];if(rrpEl){var pm2=rrpEl.textContent.match(/[\u00a3][ \t]*([0-9,]+\.?[0-9]*)/);if(pm2)price=parseFloat(pm2[1].replace(",",""));}}

  // Description from "Product Description" field
  var desc="";
  var descEl=fields["product description"];
  if(descEl)desc=descEl.textContent.trim().substring(0,800);
  desc=cleanDesc(desc);

  // Quantity from "Available Quantity"
  var qty=0;
  var qtyEl=fields["available quantity"];
  if(qtyEl){var qm=qtyEl.textContent.match(/([0-9]+)/);if(qm)qty=parseInt(qm[1]);}

  // Images from flexslider (skip clones)
  var imgs=[],seen=new Set();
  doc.querySelectorAll("#pslider .slides li:not(.clone) img, .flexslider .slides li:not(.clone) img").forEach(function(img){
    var src=img.src||img.getAttribute("src");
    if(src&&src.indexOf("contentpicture")>=0&&!seen.has(src)){seen.add(src);imgs.push(src);}
  });
  // Fallback: any contentpicture/slide images
  if(imgs.length===0){
    doc.querySelectorAll("img[src*=contentpicture]").forEach(function(img){
      var src=img.src;
      if(src&&src.indexOf("/slide/")>=0&&!seen.has(src)){seen.add(src);imgs.push(src);}
    });
  }
  if(imgs.length>10)imgs=imgs.slice(0,10);

  // Dimensions from description text
  var dims={width:"",height:"",length:""};
  var allText=(desc+" "+(descEl?descEl.innerHTML:"")).toLowerCase();
  var wm=allText.match(/([0-9]+)[ \t]*(?:mm|cm)?[ \t]*(?:w[^a-z]|wide|width)/i);
  var hm=allText.match(/([0-9]+)[ \t]*(?:mm|cm)?[ \t]*(?:h[^a-z]|high|height)/i);
  var dm=allText.match(/([0-9]+)[ \t]*(?:mm|cm)?[ \t]*(?:d[^a-z]|deep|depth)/i);
  if(wm)dims.width=wm[1]+"mm";
  if(hm)dims.height=hm[1]+"mm";
  if(dm)dims.length=dm[1]+"mm";

  return {
    title:title,description:desc,price:price,url:url,
    images:imgs,thumbnail:imgs[0]||"",sku:sku,weight:"",
    dimensions:dims,tags:[],
    variants:[{title:"Default",sku:sku,price:price}],
    quantity:qty,vendorCategory:""
  };
}

// ── Shopify JSON extractor ──
function extractShopifyProduct(p, collectionName){
  var title=p.title||"";
  var desc=(p.body_html||"").replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&nbsp;/g," ").replace(/&lt;/g,"<").replace(/&gt;/g,">").trim();
  desc=desc.replace(/  +/g," ").trim();
  var vendor=p.vendor||"";
  var prodType=p.product_type||"";
  var tags=(p.tags||[]).join(", ");
  var imgs=(p.images||[]).map(function(im){return im.src;}).slice(0,10);
  var url=location.origin+"/products/"+p.handle;
  var variants=(p.variants||[]).map(function(v){
    return{title:v.title||"Default",sku:v.sku||"",price:parseFloat(v.price||0),compareAt:parseFloat(v.compare_at_price||0),available:v.available!==false};
  });
  var mainVariant=variants[0]||{};
  var price=mainVariant.price||0;
  var sku=mainVariant.sku||"";
  var qty=0;variants.forEach(function(v){if(v.available)qty++;});
  if(variants.length<=1)qty=mainVariant.available?1:0;
  return{
    title:title,description:desc,price:price,url:url,
    images:imgs,thumbnail:imgs[0]||"",
    sku:sku,weight:"",dimensions:{},
    tags:tags?tags.split(", "):[],
    variants:variants.length>1?variants:[{title:"Default",sku:sku,price:price}],
    quantity:qty,
    vendorCategory:collectionName||prodType||"",
    manufacturer:vendor,
    condition:"Refurbished",
    _compareAt:mainVariant.compareAt||0,
    _shopifyId:p.id
  };
}

// ── Shopify JSON fetcher: gets all products from a collection ──
async function fetchShopifyCollection(collectionUrl){
  // Determine the collection handle from URL
  var path=collectionUrl.replace(location.origin,"");
  if(path.charAt(0)==="/")path=path.substring(1);
  if(path.charAt(path.length-1)==="/")path=path.substring(0,path.length-1);
  // e.g. "collections/washing-machines" or just the current page
  var handle=path.split("collections/")[1]||path;
  if(!handle)handle="all";
  var allProducts=[];var page=1;var maxPages=20;
  while(page<=maxPages){
    var jsonUrl=location.origin+"/collections/"+handle+"/products.json?limit=250&page="+page;
    console.log("  Fetching Shopify JSON page "+page+"...");
    try{
      var resp=await fetch(jsonUrl);
      if(!resp.ok){console.log("  HTTP "+resp.status);break;}
      var data=await resp.json();
      var prods=data.products||[];
      if(!prods.length)break;
      allProducts=allProducts.concat(prods);
      console.log("    Got "+prods.length+" products (total: "+allProducts.length+")");
      if(prods.length<250)break;
      page++;
      await wait(300);
    }catch(e){console.log("  Fetch error: "+e.message);break;}
  }
  return allProducts;
}

// ── Shopify collection discovery ──
function findShopifyCollections(doc){
  var cols={};
  doc.querySelectorAll('a[href*="/collections/"]').forEach(function(a){
    var h=a.href||a.getAttribute("href");
    var name=(a.textContent||"").trim();
    if(!h||!name||name.length>80||name.length<2)return;
    if(h.indexOf("#")>=0||h.indexOf("/collections/all")>=0)return;
    // Skip non-collection pages
    if(h.indexOf("/products/")>=0)return;
    // Resolve relative
    if(h.indexOf("http")!==0)try{h=new URL(h,location.origin).href;}catch(e){return;}
    if(h.indexOf(location.origin)<0)return;
    // Only /collections/xxx paths
    var cidx=h.indexOf("/collections/");
    if(cidx<0)return;
    var after=h.substring(cidx+13).split("/")[0].split("?")[0].split("#")[0];
    if(after&&!cols[h]){cols[h]=name;}
  });
  return Object.keys(cols).map(function(u){return{url:u,name:cols[u]};});
}

function extract(doc,url){
  if(PLATFORM==="bigcommerce")return extractBC(doc,url);
  if(PLATFORM==="brothers")return extractBrothers(doc,url);
  if(PLATFORM==="shopify")return extractWoo(doc,url); // fallback for single product pages
  return extractWoo(doc,url);
}

// ── Discover product URLs from a category page ──
function findProductUrls(doc){
  var urls=new Set();
  if(PLATFORM==="bigcommerce"){
    // BC: product cards link to product pages
    doc.querySelectorAll('.card .card-title a,.product-item-title a,.card-figure a,.listItem-title a,article.card a[href]').forEach(function(a){
      var h=a.href;if(h&&h.indexOf("/cart")<0&&h.indexOf("/login")<0&&h.indexOf("/account")<0&&h.indexOf("#")<0&&h.indexOf("javascript")<0){
        // Exclude category-like URLs (those in the nav)
        var isNav=!!a.closest('nav,.navPages,.header');
        if(!isNav)urls.add(h);
      }
    });
  } else if(PLATFORM==="brothers"){
    // Brothers: product links match /d-url-*.html
    doc.querySelectorAll('a[href]').forEach(function(a){
      var h=a.href||a.getAttribute("href");
      if(!h)return;
      if(h.indexOf("http")!==0)try{h=new URL(h,location.origin).href;}catch(e){return;}
      if(h.indexOf("/d-url-")>=0&&h.indexOf(".html")>0){
        if(!a.closest('nav,header,footer'))urls.add(h.split("#")[0]);
      }
    });
  } else {
    // Standard: look for /product/ or /shop/ URLs (same origin only)
    doc.querySelectorAll("a[href]").forEach(function(a){
      var h=a.href||a.getAttribute("href");
      if(h&&isWooProductUrl(h)&&h.indexOf(location.origin)>=0){var clean=h.split("#")[0];if(clean)urls.add(clean.startsWith("http")?clean:new URL(clean,location.origin).href);}
    });
    // If none found: try WooCommerce product grid selectors (for sites with custom permalinks)
    if(urls.size===0){
      var skip=["/my-account","/cart","/checkout","/contact","/about","/delivery","/faq","/terms","/privacy","/blog","/news","/gallery","/wp-","/feed","/cookie"];
      doc.querySelectorAll('.products .product a.woocommerce-LoopProduct-link,.products .product > a,.woocommerce-loop-product__link,ul.products li.product a[href],.product-grid a[href],.products a[href],.wc-block-grid a[href],.woocommerce a[href]').forEach(function(a){
        var h=a.href||a.getAttribute("href");
        if(!h||h.indexOf("#")===0||h.indexOf("javascript")===0||h.indexOf("?add-to-cart")>=0)return;
        // Resolve relative URLs
        if(h.indexOf("http")!==0)try{h=new URL(h,location.origin).href;}catch(e){return;}
        // Skip non-product pages
        if(h.indexOf("/product-category/")>=0||h.indexOf("/product-tag/")>=0)return;
        for(var si=0;si<skip.length;si++){if(h.indexOf(skip[si])>=0)return;}
        // Must be same origin
        if(h.indexOf(location.origin)>=0){
          var clean=h.split("#")[0];
          urls.add(clean);
        }
      });
    }
    // Last resort: if still none, look for any links inside elements with product-like classes
    if(urls.size===0){
      doc.querySelectorAll('a[href]').forEach(function(a){
        if(!a.closest('.product,.type-product,.post-type-product'))return;
        var h=a.href||a.getAttribute("href");
        if(!h||h.indexOf("#")===0||h.indexOf("javascript")===0)return;
        if(h.indexOf("http")!==0)try{h=new URL(h,location.origin).href;}catch(e){return;}
        if(h.indexOf("/product-category/")>=0||h.indexOf("/product-tag/")>=0)return;
        if(h.indexOf(location.origin)>=0)urls.add(h.split("#")[0]);
      });
    }
    // Generic: look for product-like links by URL pattern (e.g. /d-url-*.html, /product/*)
    if(urls.size===0){
      var skip=["/my-account","/cart","/checkout","/contact","/about","/delivery","/faq","/terms","/privacy","/blog","/news","/gallery","/wp-","/feed","/find-us","/wishlist","/category/","/pepsi-"];
      doc.querySelectorAll('a[href]').forEach(function(a){
        if(a.closest('nav,header,footer,.menu'))return;
        var h=a.href||a.getAttribute("href");
        if(!h)return;
        if(h.indexOf("http")!==0)try{h=new URL(h,location.origin).href;}catch(e){return;}
        if(h.indexOf(location.origin)<0)return;
        // Check for product-like URL patterns
        var path=h.replace(location.origin,"");
        var isProduct=false;
        if(path.indexOf("/d-url-")>=0&&path.indexOf(".html")>0)isProduct=true;
        if(path.indexOf("/product/")>=0)isProduct=true;
        if(path.match(/[/][^/]+-[a-z]{1,3}[0-9]{2,5}[.]html/i))isProduct=true;
        if(!isProduct)return;
        for(var si=0;si<skip.length;si++){if(h.indexOf(skip[si])>=0)return;}
        var txt=(a.textContent||"").trim();
        if(txt==="VIEW DETAILS"||txt.length>3)urls.add(h.split("#")[0]);
      });
    }
  }
  return Array.from(urls);
}

// ── Discover categories from homepage ──
function findCategories(doc){
  var catLinks={};
  if(PLATFORM==="bigcommerce"){
    doc.querySelectorAll("a[href]").forEach(function(a){
      var h=a.href;var name=a.textContent.trim();
      // BC categories are usually in nav, avoid home/cart/login etc
      if(!h||!name||name.length>80||name.length<2)return;
      if(h.indexOf("/cart")>=0||h.indexOf("/login")>=0||h.indexOf("/account")>=0||h===location.origin+"/")return;
      if(h.indexOf("#")>=0)return;
      // Check if it's a nav link (likely a category)
      var isNav=!!a.closest('nav,.navPages,ul.navPages-list,.header');
      if(isNav&&h.indexOf(location.origin)===0){
        // Exclude product pages (they tend to have very specific slugs)
        var path=h.replace(location.origin,"");
        if(path.split("/").filter(Boolean).length<=2)catLinks[h]=name;
      }
    });
  } else if(PLATFORM==="brothers"){
    // Brothers: leaf categories from nav menu (deepest /category/ links)
    var skipBros=["/contact","/find-us","/faq","/wishlist","/pepsi","/used-office-furniture","/new-office-furniture"];
    doc.querySelectorAll("a[href]").forEach(function(a){
      var h=a.href||a.getAttribute("href");var name=a.textContent.trim();
      if(!h||!name||name.length>80||name.length<2)return;
      if(h.indexOf("/category/")<0)return;
      if(h.indexOf(location.origin)<0)return;
      for(var si=0;si<skipBros.length;si++){if(h.indexOf(skipBros[si])>=0)return;}
      // Prefer leaf categories (2+ segments under /category/)
      var path=h.replace(location.origin,"").replace(/^\/|\/$/g,"");
      var segs=path.split("/").filter(Boolean);
      if(segs.length>=2&&!catLinks[h])catLinks[h]=name;
    });
    // If no leaf cats, take top-level category links
    if(Object.keys(catLinks).length===0){
      doc.querySelectorAll("a[href]").forEach(function(a){
        var h=a.href||a.getAttribute("href");var name=a.textContent.trim();
        if(!h||!name)return;
        if(h.indexOf("/category/")>=0&&h.indexOf(location.origin)>=0&&!catLinks[h])catLinks[h]=name;
      });
    }
  } else {
    // First try: standard /product-category/ links
    doc.querySelectorAll("a[href]").forEach(function(a){
      var h=a.href||a.getAttribute("href");var name=a.textContent.trim();
      if(h&&h.indexOf("/product-category/")>=0&&name&&name.length<80&&!catLinks[h])catLinks[h]=name;
    });
    // Also try /category/ links (custom sites like Brothers Office Furniture)
    if(Object.keys(catLinks).length===0){
      doc.querySelectorAll("a[href]").forEach(function(a){
        var h=a.href||a.getAttribute("href");var name=a.textContent.trim();
        if(!h||!name||name.length>80||name.length<2)return;
        if(h.indexOf("/category/")>=0&&h.indexOf(location.origin)>=0&&!catLinks[h]){
          // Only leaf categories (deepest level in nav)
          var path=h.replace(location.origin,"").replace(/^\/|\/$/g,"");
          var segs=path.split("/").filter(Boolean);
          if(segs.length>=2)catLinks[h]=name;
        }
      });
    }
    // If none found: scan nav/menu links for category-like pages
    if(Object.keys(catLinks).length===0){
      var skip=["/my-account","/cart","/checkout","/contact","/about","/delivery","/faq","/terms","/privacy","/blog","/news","/gallery","/wp-","/feed","/xmlrpc"];
      doc.querySelectorAll("nav a[href],ul.menu a[href],.main-navigation a[href],.primary-menu a[href],.elementor-nav-menu a[href],#mega-menu a[href],header a[href]").forEach(function(a){
        var h=a.href||a.getAttribute("href");var name=a.textContent.trim();
        if(!h||!name||name.length>80||name.length<2)return;
        if(h.indexOf("#")>=0||h===location.origin+"/"||h===location.origin)return;
        if(h.indexOf(location.origin)<0)return;
        var dominated=false;skip.forEach(function(s){if(h.toLowerCase().indexOf(s)>=0)dominated=true;});
        if(dominated)return;
        // Only add if it's a path with 1-2 segments (likely a category, not a product)
        var path=h.replace(location.origin,"").replace(/^\/|\/$/g,"");
        var segs=path.split("/").filter(Boolean);
        if(segs.length>=1&&segs.length<=3&&!catLinks[h])catLinks[h]=name;
      });
    }
  }
  return Object.keys(catLinks).map(function(u){return{url:u,name:catLinks[u]};}).filter(function(c){return c.name.length>0&&c.name.indexOf("Uncategorized")<0;});
}

// ── Find next page link ──
function findNextPage(doc){
  if(PLATFORM==="bigcommerce"){
    var nx=doc.querySelector('.pagination-item--next a,a.pagination-link--next');
    return nx?(nx.href||null):null;
  }
  if(PLATFORM==="brothers"){
    // Brothers uses numbered page links
    var nx=doc.querySelector('.pagination a.next,a.next-page,.paging a.next');
    if(nx)return nx.href||null;
    // Try to find "next" or ">" link in pagination
    var pLinks=doc.querySelectorAll('.pagination a,.paging a,a[href*="page="]');
    var curPage=1;var nextUrl=null;
    var pm=location.search.match(/page=([0-9]+)/);
    if(pm)curPage=parseInt(pm[1]);
    pLinks.forEach(function(a){
      var hm=(a.href||"").match(/page=([0-9]+)/);
      if(hm&&parseInt(hm[1])===curPage+1)nextUrl=a.href;
    });
    return nextUrl;
  }
  var nx=doc.querySelector("a.next.page-numbers,.woocommerce-pagination a.next,a.next");
  var href=nx?(nx.href||nx.getAttribute("href")):null;
  if(href&&!href.startsWith("http"))href=new URL(href,location.origin).href;
  return href;
}


// ── Extract current page ──
var p=extract(document,location.href);
if(p&&p.title){
  var j=JSON.stringify([p]);
  navigator.clipboard.writeText(j).then(function(){
    _toast.innerHTML='<div style="color:#34d399;font-weight:bold;margin-bottom:6px">\u2714 Product Grabbed!</div>'+
      '<div style="margin-bottom:4px"><strong>'+p.title+'</strong></div>'+
      '<div style="color:#34d399;font-family:monospace">\u00a3'+(parseFloat(p.price)||0).toFixed(2)+'</div>'+
      '<div style="color:#8b8fa3;font-size:11px;margin-top:4px">'+(p.images||[]).length+' images | SKU: '+(p.sku||'none')+'</div>'+
      '<div style="color:#8b8fa3;font-size:11px;margin-top:6px">Copied to clipboard \u2014 Ctrl+V on Scraper Tool</div>';
    setTimeout(function(){_toast.style.transition="opacity 0.5s";_toast.style.opacity="0";setTimeout(function(){_toast.remove();},500);},5000);
  }).catch(function(){
    _toast.innerHTML='<div style="color:#34d399;font-weight:bold">\u2714 Product Grabbed!</div><div style="font-size:11px;margin-top:4px">Run in console: copy(JSON.stringify(window.__lastGrab))</div>';
  });
  window.__lastGrab=[p];
  console.log("Grabbed:",p.title,"\u00a3"+p.price,p.images.length+" images");
}else{
  _toast.innerHTML='<div style="color:#f87171">\u274C Could not extract product from this page.</div><div style="color:#8b8fa3;font-size:11px;margin-top:4px">Make sure you are on a single product page, not a category.</div>';
  setTimeout(function(){_toast.remove();},5000);
}
}catch(e){
  _toast.innerHTML='<div style="color:#f87171">\u274C Error: '+e.message+'</div>';
  console.error("Grab error:",e);
  setTimeout(function(){_toast.remove();},5000);
}
})();
