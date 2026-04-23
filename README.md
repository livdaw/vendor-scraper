# Vendor Scraper → Medusa CSV

Internal tool for scraping product data from vendor websites and exporting as Medusa-compatible CSV files.

## Supported Platforms

| Platform | Detection | Notes |
|----------|-----------|-------|
| **WooCommerce** | Auto | Most vendors (ORS, Watling, Jowett Stone, Office Chairman, etc.) |
| **Shopify** | Auto | Uses JSON API — fastest and cleanest (Renew2U, etc.) |
| **BigCommerce** | Auto | Standard BC product grid selectors |
| **Brothers Office Furniture** | Auto | Custom platform handler |

## Access the Tool

**Live URL:** [https://materialindex.github.io/vendor-scraper/](https://materialindex.github.io/vendor-scraper/)

Bookmark this link. Updates are instant — when the repo is updated, refresh the page to get the latest version.

## Quick Start

1. Open the tool at the URL above
2. Paste a **vendor category page URL** (e.g. `https://ors-recycle.co.uk/product-category/used/seating-used/`)
3. Click **Generate Script** — it copies to your clipboard
4. Open the **vendor's website** in a new Chrome tab (navigate to that category URL)
5. Open **DevTools**: press `F12` or `Cmd+Option+J` (Mac) / `Ctrl+Shift+J` (Windows)
6. **Paste** the script into the Console tab → press Enter
7. Wait — progress logs in the console as it scrapes each product
8. When done, run: `copy(JSON.stringify(window.__scrapedProducts))`
9. Go back to the scraper tool → paste into the **Paste JSON** area
10. Click **Export Medusa CSV**

### Full Site Scrape

Same steps but click **Full Site** instead of Generate Script. Run from the vendor's **homepage** — it discovers all categories from the nav and scrapes each one.

### Stop Early

Type `window.__stopScraper = true` in the console to stop mid-scrape. Products already scraped are kept.

## Troubleshooting

### "Found 0 products"

The scraper can't find product links on the page.

**Run this diagnostic** in the console on the category page:

```javascript
// Check what product links exist in the DOM
var links = [];
document.querySelectorAll('.product a, .products a, li.product a, .woocommerce a').forEach(function(a) {
  if (a.href && a.href.indexOf(location.origin) >= 0) links.push(a.href);
});
console.log('Product links found:', [...new Set(links)].length);
[...new Set(links)].slice(0, 5).forEach(function(u) { console.log('  ', u); });
```

**Common causes:**
- Products loaded via AJAX — scroll down to load all products first, then re-run
- Site uses non-standard URL paths (not `/product/` or `/shop/`)
- Cookie consent plugin has a `/product/` URL that gets picked up instead

### CORS errors / "Failed to fetch"

The scraper picked up an external URL (from a cookie plugin, analytics, etc.). Report the vendor URL so the tool can be updated.

### Products scraped but missing prices or descriptions

The product page uses different HTML selectors than expected.

**Run this diagnostic** on a single product page:

```javascript
var price = document.querySelector('.price .amount, .woocommerce-Price-amount, [class*="price"]');
console.log('Price:', price ? price.textContent : 'NOT FOUND');

var desc = document.querySelector('.woocommerce-product-details__short-description, .product-description, #tab-description');
console.log('Description:', desc ? desc.textContent.substring(0, 100) : 'NOT FOUND');

var title = document.querySelector('.product_title, h1.entry-title, h1');
console.log('Title:', title ? title.textContent : 'NOT FOUND');

var imgs = document.querySelectorAll('.woocommerce-product-gallery img, .product-gallery img');
console.log('Images:', imgs.length);
```

Share the output when reporting issues.

### Category pages scraped as products (£0.00 prices)

Some sites have category URLs that look like product URLs. After export, filter the CSV to remove rows where `price_gbp = 0.00`.

### Shopify — empty results or HTTP 401

The store may have disabled their JSON API. Check if `https://storename.com/products.json?limit=1` returns data in your browser.

## Reporting a New Site That Doesn't Work

When you find a vendor site the scraper can't handle, collect:

1. **Vendor URL** — the category page you tried
2. **Console output** — screenshot or copy the log
3. **Platform detected** — shown in the console as "Detected platform: ..."
4. **Sample product URL** — right-click a product on the page → Copy Link

Raise an issue in this repo or message directly with the above info.

## CSV Output

Exports Medusa v2 compatible CSV with:

- `product_title`, `product_description`, `product_images` (semicolon-separated URLs)
- `variant_sku`, `price_gbp`, `quantity`
- `product_category`, `condition_attr`, `manufacturer_attr`, `materials_attr`
- Dimensions: `product_weight`, `product_length`, `product_height`, `product_width`

Files are auto-named: `medusa-import-{vendor}-{path}-{date}.csv`

## Repo Setup (Admin)

This repo is configured with GitHub Pages to serve the tool directly. To update:

```bash
git clone git@github.com:materialindex/vendor-scraper.git
cd vendor-scraper
# Make changes to index.html
git add .
git commit -m "description of change"
git push
```

Changes go live within a minute at the Pages URL.
