/**
 * Material Spec Quote — generator
 * Bind this script to your "Material Spec Quote Master Template" Google Doc
 * (Extensions ▸ Apps Script, paste this in, add the Dialog.html file too).
 *
 * Flow: in the scraper tool, tick products ▸ Build Quote ▸ Generate Quote JSON ▸ Copy.
 * Then in this Doc: Build Quote menu ▸ paste JSON ▸ Create. A filled COPY of the
 * template is created in the same Drive folder; the master template stays untouched.
 */

var CURRENCY = '£';

// Drive folder where finished quotes are saved.
var QUOTES_FOLDER_ID = '1_75_Ke_j0cctR7YnQ30RaEXdXQ-FohTS';

function onOpen() {
  DocumentApp.getUi()
    .createMenu('Build Quote')
    .addItem('Build quote from JSON…', 'showQuoteDialog')
    .addToUi();
}

function showQuoteDialog() {
  var html = HtmlService.createHtmlOutputFromFile('Dialog')
    .setWidth(520).setHeight(420);
  DocumentApp.getUi().showModalDialog(html, 'Build quote from scraper JSON');
}

/** Called from the dialog. Returns {url, name} of the new quote doc. */
function buildQuote(jsonStr) {
  var data = JSON.parse(jsonStr);

  // 1. Copy the template so the master is never edited.
  var templateId = DocumentApp.getActiveDocument().getId();
  var templateFile = DriveApp.getFileById(templateId);
  var docName = 'Quote ' + (data.quote_number || '') + ' — ' +
                (data.customer && data.customer.company ? data.customer.company :
                 (data.customer && data.customer.name) || 'Customer');
  var quotesFolder = DriveApp.getFolderById(QUOTES_FOLDER_ID);
  var newFile = templateFile.makeCopy(docName, quotesFolder);

  var doc = DocumentApp.openById(newFile.getId());
  var body = doc.getBody();

  // 2. Simple mustache placeholders.
  body.replaceText('\\{\\{quote_number\\}\\}', data.quote_number || '');
  body.replaceText('\\{\\{prepared_by\\}\\}', data.prepared_by || '');
  body.replaceText('\\{\\{quote_date\\}\\}', data.quote_date || '');
  body.replaceText('\\{\\{total_cost\\}\\}', money(data.materials_total));

  // 3. Header / customer fields (the template uses dotted placeholders after labels).
  var c = data.customer || {};
  var d = data.delivery || {};
  fillAfterLabel(body, 'Project Reference:', data.project_reference);
  fillAfterLabel(body, 'Customer Name:', c.name);
  fillAfterLabel(body, 'Email Address:', c.email);
  fillAfterLabel(body, 'Company:', c.company);
  fillAfterLabel(body, 'Customer Address:', c.address);
  fillAfterLabel(body, 'All deliveries to:', d.address);
  if (d.week || d.skus) {
    body.replaceText('Delivery\\s+w/c\\s+XXX', 'Delivery ' + (d.week || 'w/c TBC'));
    body.replaceText('SKU, SKU, SKU', d.skus || '');
  }

  // 4. Product list -> table, replacing the {{product_list}} paragraph.
  buildProductTable(body, data.line_items || []);

  doc.saveAndClose();
  return { url: newFile.getUrl(), name: docName };
}

/** Replace the run of dots/spaces after a label, keeping the label intact. */
function fillAfterLabel(body, label, value) {
  if (!value) return;
  var escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // match the label then any non-letter filler (dots, ellipses, spaces) up to next word
  body.replaceText(escaped + '[^A-Za-z0-9]*', label + ' ' + value + '   ');
}

function buildProductTable(body, items) {
  var found = body.findText('\\{\\{product_list\\}\\}');
  if (!found) return;
  var el = found.getElement();
  var para = el.getParent();
  while (para.getParent().getType() !== DocumentApp.ElementType.BODY_SECTION) {
    para = para.getParent();
  }
  var idx = body.getChildIndex(para);

  var rows = [['Product', 'Condition', 'Qty', 'Unit ' + CURRENCY, 'Total ' + CURRENCY]];
  items.forEach(function (it) {
    var name = it.title || '';
    if (it.description) name += '\n' + it.description;
    rows.push([
      name,
      it.condition || '',
      String(it.qty),
      money(it.unit_price),
      money(it.line_total)
    ]);
  });

  var table = body.insertTable(idx + 1, rows);
  // Style header row.
  var header = table.getRow(0);
  for (var i = 0; i < header.getNumCells(); i++) {
    header.getCell(i).editAsText().setBold(true);
  }
  body.removeChild(para); // drop the {{product_list}} placeholder line
}

function money(n) {
  n = Number(n) || 0;
  return CURRENCY + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
