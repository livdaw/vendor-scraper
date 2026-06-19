/**
 * Material Spec Quote — generator (standalone Web App)
 *
 * Setup:
 *   1. Files in this project: Code.gs + Dialog.html (Sidebar.html is not used).
 *   2. Deploy ▸ New deployment ▸ type "Web app", execute as "Me",
 *      access "Only myself". Open the web-app URL it gives you.
 *
 * Flow: in the scraper tool, tick products ▸ Build Quote ▸ Generate Quote JSON ▸ Copy.
 * Then open the web app ▸ paste JSON ▸ Create. A filled COPY of the template is saved
 * to your quotes folder; the master template stays untouched.
 */

var CURRENCY = '£';

// The "Material Spec Quote Master Template" Google Doc that gets copied.
var TEMPLATE_ID = '1tH2SGZGWGILrcWddeJzVMJE7dJ0zcpmtRX8XKDz04eI';

// Drive folder where finished quotes are saved.
var QUOTES_FOLDER_ID = '1_75_Ke_j0cctR7YnQ30RaEXdXQ-FohTS';

/** Direct open / manual use → serve the paste-JSON form. */
function doGet(e) { return serveForm_(e); }

/** The scraper POSTs JSON here → build the quote immediately and return a link page
 *  that pushes the new doc URL back to the scraper window. No "Create" click needed. */
function doPost(e) {
  var json = (e && e.parameter && e.parameter.json) ? e.parameter.json : '';
  try {
    var res = buildQuote(json);
    return HtmlService.createHtmlOutput(resultPage_(res.url, res.name))
      .setTitle('Quote created');
  } catch (err) {
    return HtmlService.createHtmlOutput(errorPage_(err.message, json))
      .setTitle('Quote error');
  }
}

function serveForm_(e) {
  var pre = (e && e.parameter && e.parameter.json) ? e.parameter.json : '';
  var html = FORM_HTML.replace('__PREFILL__', escapeHtml_(pre));
  return HtmlService.createHtmlOutput(html)
    .setTitle('Build quote from scraper JSON');
}

/** Confirmation page: shows the link and posts it back to the scraper window. */
function resultPage_(url, name) {
  return '<!DOCTYPE html><html><head><base target="_top"><style>' +
    'body{font-family:Arial,Helvetica,sans-serif;padding:24px;color:#222}' +
    'p{font-size:14px}a.btn{display:inline-block;background:#137333;color:#fff;' +
    'text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px;margin-top:10px}' +
    '</style></head><body>' +
    '<p>✔ Quote created: <b>' + escapeHtml_(name) + '</b></p>' +
    '<a class="btn" href="' + escapeHtml_(url) + '" target="_blank">Open quote</a>' +
    '<p style="color:#888;font-size:12px;margin-top:14px">The link has been sent back to the scraper. You can close this tab.</p>' +
    '<script>var p={type:"quoteCreated",url:"' + jsStr_(url) + '",name:"' + jsStr_(name) + '"};' +
    'try{if(window.opener)window.opener.postMessage(p,"*");}catch(e){}' +
    'try{if(window.top&&window.top.opener)window.top.opener.postMessage(p,"*");}catch(e){}' +
    '<\/script></body></html>';
}

/** Error page: shows the message and the form (pre-filled) so the quote can be retried. */
function errorPage_(msg, json) {
  var notice = '<div style="font-family:Arial;background:#fde8e8;color:#922;' +
    'padding:10px 14px;border-radius:6px;margin:14px">Error: ' + escapeHtml_(msg) +
    ' — review the JSON below and click Create.</div>';
  return notice + FORM_HTML.replace('__PREFILL__', escapeHtml_(json));
}

function escapeHtml_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function jsStr_(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

var FORM_HTML =
'<!DOCTYPE html><html><head><base target="_top"><style>' +
'body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:18px;color:#222}' +
'p{font-size:13px;color:#555;margin:0 0 8px}' +
'textarea{width:100%;height:260px;box-sizing:border-box;font-family:Menlo,Consolas,monospace;' +
'font-size:11px;border:1px solid #ccc;border-radius:6px;padding:8px;resize:vertical}' +
'.row{margin-top:10px;display:flex;gap:8px;align-items:center}' +
'button{background:#137333;color:#fff;border:0;border-radius:6px;padding:9px 16px;font-size:13px;cursor:pointer}' +
'button.sec{background:#eee;color:#333}#status{font-size:12px;color:#555}a{color:#137333}' +
'</style></head><body>' +
'<p>Paste the <b>Quote JSON</b> copied from the scraper tool, then click Create. ' +
'A filled copy of the template is saved to your quotes folder.</p>' +
'<textarea id="json" placeholder=\'{ "quote_number": "...", "line_items": [ ... ] }\'>__PREFILL__</textarea>' +
'<div class="row">' +
'<button onclick="run()">Create quote</button>' +
'<span id="status"></span></div>' +
'<script>' +
'function run(){var s=document.getElementById("status");' +
'var txt=document.getElementById("json").value.trim();' +
'if(!txt){s.textContent="Paste the JSON first.";return;}' +
'try{JSON.parse(txt);}catch(e){s.textContent="That is not valid JSON.";return;}' +
's.textContent="Building\\u2026";' +
'google.script.run' +
'.withSuccessHandler(function(r){s.innerHTML="Done: <a href=\\""+r.url+"\\" target=\\"_blank\\">"+r.name+"</a>";})' +
'.withFailureHandler(function(err){s.textContent="Error: "+err.message;})' +
'.buildQuote(txt);}' +
'<\/script></body></html>';

/** Called from the web page. Returns {url, name} of the new quote doc. */
function buildQuote(jsonStr) {
  var data = JSON.parse(jsonStr);

  // 1. Copy the template so the master is never edited.
  var templateFile = DriveApp.getFileById(TEMPLATE_ID);
  var docName = 'Quote ' + (data.quote_number || '') + ' — ' +
                (data.customer && data.customer.company ? data.customer.company :
                 (data.customer && data.customer.name) || 'Customer');
  var quotesFolder = DriveApp.getFolderById(QUOTES_FOLDER_ID);
  var newFile = templateFile.makeCopy(docName, quotesFolder);

  var doc = DocumentApp.openById(newFile.getId());
  var body = doc.getBody();

  // 2. Mustache placeholders — header + customer details (the new template uses
  //    proper {{tokens}} in tables, so these are clean find/replace.)
  var c = data.customer || {};
  var d = data.delivery || {};
  setToken(body, 'quote_number', data.quote_number);
  setToken(body, 'prepared_by', data.prepared_by);
  setToken(body, 'quote_date', data.quote_date);
  setToken(body, 'project_reference', data.project_reference);
  setToken(body, 'customer_name', c.name);
  setToken(body, 'contact_email', c.email);
  setToken(body, 'company_name', c.company);
  setToken(body, 'customer_address', c.address);

  var materials = Number(data.materials_total) || 0;
  var logistics = Number(data.logistics_cost) || 0;
  var totalDisplay = money(materials) + ' (excl. VAT)';
  setToken(body, 'total_cost', totalDisplay);                          // Materials Total
  setToken(body, 'total_incl_logistics',                              // Total Cost (+ logistics)
           money(materials + logistics) + ' (excl. VAT)');
  styleMaterialsTotal(body, totalDisplay);

  // 3. Logistics (still plain labels / static text in the template).
  fillAfterLabel(body, 'All deliveries to:', d.address);
  if (d.week || d.skus) {
    body.replaceText('Delivery\\s+w/c\\s+XXX', 'Delivery ' + (d.week || 'w/c TBC'));
    body.replaceText('SKU, SKU, SKU', d.skus || '');
  }

  // 4. Product list -> table, replacing the {{product_list}} paragraph.
  buildProductTable(body, data.line_items || []);

  // 5. Tidy pass: consistent font, spacing, and margins on the whole doc.
  tidyDoc(body);

  doc.saveAndClose();
  return { url: newFile.getUrl(), name: docName };
}

/** Tidies every generated quote: breathing room at the top (stops header overlap),
 *  consistent Helvetica Neue body text, and even line spacing. Tables keep their own
 *  styling. {{tokens}} and labels are untouched. */
function tidyDoc(body) {
  body.setMarginTop(90);     // ~3.2cm — clears the header
  body.setMarginBottom(60);
  body.setMarginLeft(60);
  body.setMarginRight(60);
  var n = body.getNumChildren();
  for (var i = 0; i < n; i++) {
    var el = body.getChild(i);
    var t = el.getType();
    if (t === DocumentApp.ElementType.PARAGRAPH || t === DocumentApp.ElementType.LIST_ITEM) {
      el.editAsText().setFontFamily(FONT);
      try { el.setLineSpacing(1.15); } catch (e) {}
    }
  }
}

/** Replace a {{token}} with a value (blank if missing). */
function setToken(body, token, value) {
  body.replaceText('\\{\\{' + token + '\\}\\}', value || '');
}

/** Replace the run of dots/spaces after a label, keeping the label intact. */
function fillAfterLabel(body, label, value) {
  if (!value) return;
  var escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // match the label then any non-letter filler (dots, ellipses, spaces) up to next word
  body.replaceText(escaped + '[^A-Za-z0-9]*', label + ' ' + value + '   ');
}

var FONT = 'Helvetica Neue';
var INK = '#1a1a1a';

/**
 * Replaces {{product_list}} with one block per item:
 *   "SKU  Name" heading ▸ borderless [image | details] table ▸ right-aligned
 *   Subtotal ▸ horizontal rule. Formatting mirrors the Quote Assistant reference.
 */
function buildProductTable(body, items) {
  var found = body.findText('\\{\\{product_list\\}\\}');
  if (!found) return;
  var para = found.getElement().getParent();
  while (para.getParent().getType() !== DocumentApp.ElementType.BODY_SECTION) {
    para = para.getParent();
  }
  var at = body.getChildIndex(para);
  body.removeChild(para); // remove placeholder; insert blocks at this index

  // Keep each product on one page: estimate its height and push to a fresh page
  // if it wouldn't fit in the space left. (Heights are estimates in points — tune
  // PAGE_USABLE / FIRST_PAGE if pagination needs nudging.)
  var PAGE_USABLE = 700;   // approx printable height of an A4 page
  var FIRST_PAGE = 330;    // approx height used by header + customer details first
  var pageY = FIRST_PAGE;

  items.forEach(function (it) {
    var h = estimateBlockHeight(it);
    if (pageY + h > PAGE_USABLE && pageY > 80) {
      body.insertParagraph(at, '').appendPageBreak();
      at++;
      pageY = 40; // top of the fresh page
    }
    at = insertProductBlock(body, at, it);
    pageY += h;
  });
}

/** Rough height (pt) of a product block, for page-break decisions. */
function estimateBlockHeight(it) {
  var descLen = (it.description || '').length;
  var lines = 4 + Math.ceil(descLen / 48);   // asset/qty/dims/condition/cost + wrapped details
  var detailsH = lines * 15;
  var imageH = it.image ? 210 : 0;
  return 26 + Math.max(detailsH, imageH) + 34; // title + row + subtotal/divider/spacing
}

/** Inserts one product block at `at`; returns the next insert index. */
function insertProductBlock(body, at, it) {
  // 1. Title line: "SKU  Name"
  var titleText = it.sku ? it.sku + '  ' + (it.title || '') : (it.title || '');
  var titlePara = body.insertParagraph(at, '');
  titlePara.setHeading(DocumentApp.ParagraphHeading.NORMAL).setSpacingAfter(4);
  titlePara.editAsText().insertText(0, titleText)
    .setFontFamily(FONT).setFontSize(11).setForegroundColor(INK);
  at++;

  // 2. Outer borderless table: [image] [details]
  var table = body.insertTable(at, [['', '']]);
  at++;
  styleTableNoBorder(table);
  var row = table.getRow(0);

  // Left cell — image
  var imageCell = row.getCell(0);
  imageCell.setWidth(200);
  imageCell.setPaddingRight(12);
  if (imageCell.getNumChildren() > 0) imageCell.getChild(0).removeFromParent();
  insertCellImage(imageCell, it.image);

  // Right cell — details as a nested label/value table
  var detailsCell = row.getCell(1);
  if (detailsCell.getNumChildren() > 0) detailsCell.getChild(0).removeFromParent();

  var priceDisplay = (it.unit_price != null) ? plain(it.unit_price) : '—';
  var subtotalDisplay = (it.line_total != null) ? plain(it.line_total) : '—';

  var fields = [
    ['Asset:', it.title || '—'],
    ['Quantity:', String(it.qty)],
    ['Dimensions:', it.dimensions || '—'],
    ['Condition:', it.condition || '—'],
    ['Details:', it.description || '—'],
    ['Material Cost:', priceDisplay]
  ];
  var detailsTable = detailsCell.appendTable(fields.map(function () { return ['', '']; }));
  styleTableNoBorder(detailsTable);
  fields.forEach(function (pair, i) {
    var dRow = detailsTable.getRow(i);
    var labelCell = dRow.getCell(0);
    labelCell.setWidth(100).setPaddingTop(1).setPaddingBottom(1).setPaddingRight(4);
    if (labelCell.getNumChildren() > 0) labelCell.getChild(0).removeFromParent();
    labelCell.appendParagraph(pair[0]).editAsText()
      .setFontFamily(FONT).setFontSize(10).setForegroundColor(INK);
    var valueCell = dRow.getCell(1);
    valueCell.setPaddingTop(1).setPaddingBottom(1);
    if (valueCell.getNumChildren() > 0) valueCell.getChild(0).removeFromParent();
    valueCell.appendParagraph(pair[1]).editAsText()
      .setFontFamily(FONT).setFontSize(10).setForegroundColor(INK);
  });

  // 3. Subtotal (right-aligned)
  var subtotalPara = body.insertParagraph(at, 'Subtotal: ' + subtotalDisplay + ' (excl. VAT)');
  subtotalPara.setAlignment(DocumentApp.HorizontalAlignment.RIGHT).setSpacingAfter(12);
  subtotalPara.editAsText().setFontFamily(FONT).setFontSize(10).setForegroundColor(INK);
  at++;

  // 4. Horizontal rule
  var hrPara = body.insertParagraph(at, '');
  hrPara.setSpacingBefore(4).setSpacingAfter(8);
  hrPara.appendHorizontalRule();
  at++;

  return at;
}

/** Fetches an image into a cell; converts WebP to JPEG via proxy; falls back gracefully. */
function insertCellImage(cell, imageUrl) {
  if (!imageUrl) { cell.appendParagraph('[No image]').setFontSize(9); return; }
  try {
    var resp = UrlFetchApp.fetch(imageUrl, { muteHttpExceptions: true, followRedirects: true });
    var bytes = resp.getContent();
    var headers = resp.getHeaders();
    var contentType = (headers['Content-Type'] || headers['content-type'] || 'image/jpeg').split(';')[0].trim();

    // Google Docs can't embed WebP — re-fetch as JPEG through a public image proxy.
    if (contentType === 'image/webp' || imageUrl.indexOf('.webp') !== -1) {
      var proxyUrl = 'https://images.weserv.nl/?url=' + encodeURIComponent(imageUrl) + '&output=jpg&w=800';
      var proxyResp = UrlFetchApp.fetch(proxyUrl, { muteHttpExceptions: true, followRedirects: true });
      if (proxyResp.getResponseCode() === 200) { bytes = proxyResp.getContent(); contentType = 'image/jpeg'; }
    }

    var blob = Utilities.newBlob(bytes, contentType, 'product-image');
    var img = cell.appendParagraph('').appendInlineImage(blob);
    var fixedWidth = 190;
    var scaledHeight = Math.round((img.getHeight() / img.getWidth()) * fixedWidth);
    img.setWidth(fixedWidth).setHeight(scaledHeight);
  } catch (e) {
    cell.appendParagraph('[Image unavailable]').setFontSize(9);
  }
}

/** Sets the Materials Total amount to Helvetica Neue 12 to match the body styling. */
function styleMaterialsTotal(body, totalDisplay) {
  for (var i = 0; i < body.getNumChildren(); i++) {
    var child = body.getChild(i);
    if (child.getType() !== DocumentApp.ElementType.PARAGRAPH) continue;
    var t = child.asText();
    var txt = t.getText();
    if (txt.indexOf('Materials Total') === -1) continue;
    var start = txt.indexOf(totalDisplay);
    if (start === -1) return;
    t.setFontFamily(start, start + totalDisplay.length - 1, FONT)
     .setFontSize(start, start + totalDisplay.length - 1, 12);
    return;
  }
}

function styleTableNoBorder(table) {
  var style = {};
  style[DocumentApp.Attribute.BORDER_WIDTH] = 0;
  style[DocumentApp.Attribute.BORDER_COLOR] = '#ffffff';
  table.setAttributes(style);
  for (var r = 0; r < table.getNumRows(); r++) {
    var row = table.getRow(r);
    for (var c = 0; c < row.getNumCells(); c++) row.getCell(c).setAttributes(style);
  }
}

/** Plain currency, no thousands separator (matches per-line subtotals in the example). */
function plain(n) {
  return CURRENCY + (Number(n) || 0).toFixed(2);
}

/** Currency with thousands separator (for the Materials Total). */
function money(n) {
  n = Number(n) || 0;
  return CURRENCY + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
