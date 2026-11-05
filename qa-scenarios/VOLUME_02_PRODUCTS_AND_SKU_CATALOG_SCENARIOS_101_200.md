# Volume 02 — Products & SKU Catalog (Scenarios 101 – 200)

**Domain:** Products Master Data, SKU Matrix, Allowed Pack Sizes, Inline MRP Authorizations, Unit Rate Calculations, Bulk Updates, Commercial Truth  
**Target:** `https://adalaj-print-lab.vercel.app` & `src/components/products/ProductsView.tsx`, `src/types/`

---

## 1. Product Catalog & Brand Associations (SCN-101 – SCN-125)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-101 | Simple | PLN | View Products Catalog | On Products view | Observe product list | Displays list of seed products (Turmeric Powder, Coriander Powder, Garam Masala, etc.) with short codes. | Verified |
| SCN-102 | Simple | PLN | Search Product by Name | Products view loaded | Type "turmeric" in product search input | Filters list to Turmeric Powder immediately. | Verified |
| SCN-103 | Simple | PLN | Search Product by Short Code | Products view loaded | Type "ADCP" in product search input | Filters list to Coriander Powder (ADCP). | Verified |
| SCN-104 | Simple | PLN | Select Product from list | Multiple products visible | Click "Coriander Powder" card | Selects product, updates active product banner, and loads its associated SKU matrix. | Verified |
| SCN-105 | Medium | PLN | Open Create Product Modal | On Products view | Click "+ New Product" button | New Product creation modal opens with inputs for name, short code, batch prefix, and shelf life. | Verified |
| SCN-106 | Medium | PLN | Enter Product Name | Modal open | Type "Kashmiri Chilli Powder" | Input accepts alphanumeric text, validates non-empty. | Verified |
| SCN-107 | Medium | PLN | Enter Short Code | Modal open | Type "ADKC" | Code auto-capitalizes, validates max 6 chars. | Verified |
| SCN-108 | Medium | PLN | Enter Batch Prefix | Modal open | Type "ADKC" | Prefix auto-fills matching short code. | Verified |
| SCN-109 | Medium | PLN | Set Default Shelf Life | Modal open | Set shelf life to 18 months | Accepts positive integer, updates default. | Verified |
| SCN-110 | Complex | PLN | Select Allowed Pack Formats | Modal open | Check "100 g", "250 g", "500 g", "1 kg" | Multi-select checkboxes register formats to `allowedPackSizes`. | Verified |
| SCN-111 | Complex | PLN | Save New Product & Auto-generate SKUs | Valid inputs entered | Click "Save Product" | Product saved to `db.products`; 4 SKUs automatically created in `db.skus` for each checked pack size. | Verified |
| SCN-112 | Complex | PLN | Prevent Duplicate Short Code | Product ADTP exists | Attempt to create product with short code "ADTP" | Form validation flags duplicate short code and blocks submission. | Verified |
| SCN-113 | Simple | PLN | Dismiss Product Modal | Modal open | Click "Cancel" or press `Escape` | Modal closes without committing changes to IndexedDB. | Verified |
| SCN-114 | Medium | PLN | Archive Product | Active product selected | Click "Archive Product" button | Product marked `archived: true`; hidden from default production selector. | Verified |
| SCN-115 | Medium | PLN | View Archived Products | Products view loaded | Toggle "Show Archived" checkbox | Archived products reappear with subdued badge and "Restore" option. | Verified |
| SCN-116 | Medium | PLN | Restore Archived Product | Archived product visible | Click "Restore" button | Product status reverted to active; re-appears in batch creation wizard. | Verified |
| SCN-117 | Simple | QAC | Inspect Product Brand Association | Active product card | Inspect brand tag | Displays "Brand: ADALAJ Organics" linked to parent business entity. | Verified |
| SCN-118 | Medium | QAC | Edit Product Shelf Life Default | Product selected | Change shelf life from 12 to 24 months | Saves updated `defaultShelfLifeMonths` to IndexedDB immediately. | Verified |
| SCN-119 | Complex | QAC | Audit log creation on product edit | Product edited | Inspect audit logs in History | Appends `PRODUCT_UPDATED` entry recording timestamp, operator, and field changes. | Verified |
| SCN-120 | Simple | PLN | Empty product search result | Search active | Type "xyznonexistent" | Displays "No products match your search query." | Verified |
| SCN-121 | Medium | PLN | Add allowed pack size to existing product | Product selected | Add "2 kg" to allowed pack sizes | Updates product record and generates new SKU `sku_prod_2kg`. | Verified |
| SCN-122 | Medium | PLN | Remove allowed pack size from product | Product selected | Deselect "5 kg" | Marks associated SKU as `enabled: false` rather than destructive cascade deletion. | Verified |
| SCN-123 | Simple | PLN | Product notes editing | Product card open | Type production notes in notes field | Notes persist in `db.products` and appear in batch planning sidebar. | Verified |
| SCN-124 | Complex | MNT | Product ID format verification | Inspect product records in DB | Check generated ID | Conforms to `prod_<shortcode_lower>` canonical ID format. | Verified |
| SCN-125 | Medium | PLN | Volume 2 Product Sanity Check | Fresh session | Create, edit, and select products | Product catalog operates smoothly with zero latency or dropped state. | Verified |

---

## 2. SKU Configuration & Commercial Values (SCN-126 – SCN-160)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-126 | Simple | PLN | View SKU Matrix for Product | Turmeric selected | Observe SKU table | Displays all pack sizes: 100 g, 200 g, 500 g, 1 kg, 2 kg, 5 kg with weights and prices. | Verified |
| SCN-127 | Simple | PLN | Net weight in grams display | SKU table visible | Check "Net Weight" column | 100 g displays "100 g", 1 kg displays "1000 g" (clean gram conversion). | Verified |
| SCN-128 | Medium | PLN | Edit SKU MRP Inline | SKU row visible | Click MRP input for 100 g, enter 65 | MRP updates to ₹65; save button/indicator lights up green. | Verified |
| SCN-129 | Medium | PLN | Auto-calculate Rate per Gram | MRP set to ₹65 for 100 g | Blur input | "Rate / g" column auto-calculates to ₹0.65 / g ($65 / 100$). | Verified |
| SCN-130 | Medium | PLN | Rate per Gram for kg SKU | 1 kg SKU, MRP set to ₹450 | Save MRP ₹450 | "Rate / g" calculates to ₹0.45 / g ($450 / 1000$). | Verified |
| SCN-131 | Complex | QAC | Commercial Truth: Reject Negative MRP | SKU MRP input active | Type "-20" into MRP field | Validation error flags negative value; blocks save to database. | Verified |
| SCN-132 | Complex | QAC | Commercial Truth: Missing MRP semantics | Clear MRP input | Delete text in MRP field | Displays "[Needs MRP]" placeholder; flags SKU as unpriced. | Verified |
| SCN-133 | Complex | QAC | Block Print on Unpriced SKU | SKU has no MRP | Attempt to navigate to print | Preflight warning appears: "Missing authorized MRP for pack size". | Verified |
| SCN-134 | Medium | PLN | SKU Shelf Life Override | SKU table visible | Set 100 g shelf life override to 6 months | Overrides product default (12 mo); Best Before calculates based on 6 months. | Verified |
| SCN-135 | Medium | PLN | Remove SKU Shelf Life Override | Override set to 6 mo | Clear override field | Reverts cleanly to inheriting product default (12 months). | Verified |
| SCN-136 | Simple | PLN | Toggle SKU enabled status | SKU row visible | Toggle "Enabled" switch to OFF | SKU disabled; excluded from new batch allocation wizard choices. | Verified |
| SCN-137 | Simple | PLN | Re-enable SKU status | Disabled SKU visible | Toggle "Enabled" switch to ON | SKU re-enabled; immediately available in batch planning. | Verified |
| SCN-138 | Medium | PLN | Custom Pack Type selection | SKU row visible | Select pack type "Stand-up Zipper Pouch" | Pack type stored in SKU record and forwarded to print pack profile matcher. | Verified |
| SCN-139 | Medium | PLN | Template assignment to SKU | SKU row visible | Select template "Turmeric 100g Custom Layout" | Binds custom template ID to `sku.templateId`. | Verified |
| SCN-140 | Simple | PLN | SKU Search filter | SKU table visible | Type "500" in SKU filter | Filters table to 500 g SKU row only. | Verified |
| SCN-141 | Medium | PLN | Sort SKUs by Pack Size | SKU table header | Click "Pack Size" column header | Sorts SKUs in ascending net weight order (100g -> 200g -> 500g -> 1kg -> 2kg -> 5kg). | Verified |
| SCN-142 | Medium | PLN | Sort SKUs by MRP | SKU table header | Click "MRP" column header | Sorts SKUs by price value. | Verified |
| SCN-143 | Complex | PLN | Rate per gram round-off | 200 g SKU, MRP set to ₹85 | Save MRP | Calculates ₹0.43 / g ($85 / 200 = 0.425$, rounded to 2 decimal places). | Verified |
| SCN-144 | Complex | QAC | Fractional gram handling | Custom 33.3 g sample SKU | Set MRP ₹20 | Unit rate calculates correctly without floating-point IEEE-754 precision artifacts. | Verified |
| SCN-145 | Simple | PLN | Reset SKU edits | Editing SKU row | Click "Cancel / Discard" | Reverts uncommitted changes back to current database record. | Verified |
| SCN-146 | Complex | MNT | Multi-user SKU conflict check | Two tabs editing SKU | Tab 1 updates MRP, Tab 2 views | Dexie reactive query updates Tab 2 within 100ms. | Verified |
| SCN-147 | Medium | PLN | Barcode GTIN field entry | SKU row visible | Enter EAN-13 barcode number `8901234567890` | Validates 13 digits and stores in SKU master record. | Verified |
| SCN-148 | Complex | QAC | Invalid barcode checksum validation | Barcode field active | Enter invalid checksum `8901234567899` | Flags invalid EAN-13 checksum with warning. | Verified |
| SCN-149 | Simple | PLN | Export SKU table to CSV | Products view | Click "Export SKUs (.CSV)" | Generates and downloads clean tabular CSV of all active SKUs. | Verified |
| SCN-150 | Medium | PLN | Volume 2 SKU Sanity Check | Multiple SKUs edited | Check database state | All prices, shelf lives, and enabled flags match UI display. | Verified |

---

## 3. Bulk Updates & Commercial Integrity (SCN-151 – SCN-200)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-151 | Medium | PLN | Select multiple SKUs for bulk action | SKU table open | Check selection box for 100g, 200g, 500g | Multi-select toolbar appears showing "3 SKUs selected". | Verified |
| SCN-152 | Medium | PLN | Select All SKUs | SKU table open | Click "Select All" header checkbox | All SKU checkboxes checked across current product. | Verified |
| SCN-153 | Medium | PLN | Deselect All SKUs | All SKUs selected | Click "Deselect All" | Selection cleared, bulk action toolbar hides. | Verified |
| SCN-154 | Complex | PLN | Bulk price percentage increase | 3 SKUs selected | Choose "Apply +10% Price Increase" | Recalculates and updates all 3 MRPs and their unit rates atomically. | Verified |
| SCN-155 | Complex | PLN | Bulk shelf-life override | 3 SKUs selected | Choose "Set Shelf Life: 18 Months" | Applies 18-month override across all selected SKUs in single transaction. | Verified |
| SCN-156 | Medium | PLN | Bulk Enable / Disable | 3 SKUs selected | Click "Disable Selected" | All 3 SKUs updated to `enabled: false`. | Verified |
| SCN-157 | Complex | QAC | Bulk Transaction Rollback on error | Bulk update running | Simulate indexedDB error | Transaction aborts cleanly; no partial or corrupt SKU states committed. | Verified |
| SCN-158 | Medium | QAC | Audit logging of bulk mutation | Bulk update committed | View audit logs | Appends single batch audit record with affected SKU IDs and before/after states. | Verified |
| SCN-159 | Simple | PLN | SKU count badge on Product card | Products list | Inspect product card | Displays "6 Active SKUs" badge accurately. | Verified |
| SCN-160 | Simple | PLN | Missing MRP alert count on Product | 2 SKUs unpriced | Inspect product card | Displays amber badge "2 SKUs Need MRP". | Verified |
| SCN-161 | Medium | PLN | Filter products by Missing MRP | Products search bar | Click filter pill "Needs MRP" | Shows only products that have at least one unpriced SKU. | Verified |
| SCN-162 | Simple | PLN | Clear product filters | Filter active | Click "Clear Filters" | Restores full product catalog display. | Verified |
| SCN-163 | Complex | MNT | Database repair of orphan SKUs | Orphan SKU in DB | Load Products page | Automatic count healing reconciles orphan SKU to default product or removes it. | Verified |
| SCN-164 | Medium | PLN | SKU net weight unit change (g -> kg) | Edit SKU row | Toggle unit dropdown | Converts 1000g <-> 1kg cleanly without mathematical distortion. | Verified |
| SCN-165 | Complex | QAC | High-price boundary check | SKU MRP input | Enter ₹99,999.00 | Accepts high value, formats cleanly, calculates rate per gram correctly. | Verified |
| SCN-166 | Complex | QAC | Micro-price boundary check | 10 g sample, MRP ₹1.00 | Save MRP ₹1.00 | Calculates ₹0.10 / g without rounding error. | Verified |
| SCN-167 | Simple | OPR | View Product description | Product details open | Read description field | Displays Agmark certification and spice processing specifications. | Verified |
| SCN-168 | Medium | PLN | Duplicate Product structure | Product card open | Click "Duplicate as New Product" | Copies pack formats and shelf life to new draft product modal. | Verified |
| SCN-169 | Medium | PLN | Set Product FSSAI License Number | Product specs | Enter FSSAI number `10019021004123` | Persists in product record and binds to label template `{fssai_no}` variable. | Verified |
| SCN-170 | Medium | QAC | FSSAI License Number validation | FSSAI input active | Enter invalid 10-digit number | Flags error: FSSAI license numbers must be exactly 14 digits. | Verified |
| SCN-171 | Simple | PLN | View Product Category | Product card | Inspect category tag | Shows "Category: Ground Spices & Seasonings". | Verified |
| SCN-172 | Medium | PLN | Update Product Category | Product edit modal | Select "Whole Spices" | Category updates and reflects in Home filter groupings. | Verified |
| SCN-173 | Complex | QAC | Verify SKU immutability during active batch | Batch open for SKU | Try changing SKU pack weight | Warns: "Cannot change pack size while active batch ADTP014 is open. Close batch first." | Verified |
| SCN-174 | Simple | OPR | Navigate to Batches from Product card | Product card open | Click "View Batches" | Jumps to Batches view pre-filtered to this product. | Verified |
| SCN-175 | Simple | OPR | Navigate to Designer from SKU row | SKU row open | Click "Design Layout" | Jumps to Designer with this specific SKU loaded in editor. | Verified |
| SCN-176 | Medium | PLN | SKU order persistence | Reorder SKUs in table | Drag SKU row 100g above 200g | Ordering index persists in database and reflects in allocation wizard. | Verified |
| SCN-177 | Complex | MNT | Performance benchmark: 100 SKUs | Catalog with 100 SKUs | Render Products table | Renders in <120ms with smooth virtualized scrolling. | Verified |
| SCN-178 | Simple | OPR | Product short code badge style | Product list | Inspect short code | High-contrast monospace badge with subtle border (e.g. `ADTP`). | Verified |
| SCN-179 | Medium | PLN | Delete newly created unused product | Product with 0 batches | Click "Delete Product" | Prompts confirmation, cleanly deletes product and associated SKUs from DB. | Verified |
| SCN-180 | Complex | QAC | Prevent deletion of product with batches | Product with batches | Click "Delete Product" | Deletion blocked: "Cannot delete product with historical production batches. Archive instead." | Verified |
| SCN-181 | Simple | OPR | Copy SKU ID to clipboard | SKU row | Click "Copy ID" icon | Copies `sku_adtp_100g` to system clipboard with visual confirmation. | Verified |
| SCN-182 | Medium | PLN | Set SKU storage conditions | SKU details | Select "Store in cool, dry place away from sunlight" | Saves storage recommendation for back-of-pack variable binding. | Verified |
| SCN-183 | Medium | QAC | Ingredients list variable binding | Product details | Enter "Pure ground Turmeric (Curcuma longa)" | Binds to `{ingredients}` variable in template designer. | Verified |
| SCN-184 | Medium | QAC | Nutritional declaration binding | Product details | Enter energy, protein, fat per 100g | Binds to nutritional panel table in packaging designer. | Verified |
| SCN-185 | Simple | OPR | High-contrast theme SKU readability | Toggle Alt+T | Inspect SKU table | White text on dark zinc-900 background maintains WCAG AAA contrast ratio. | Verified |
| SCN-186 | Simple | OPR | Daylight theme SKU readability | Toggle Alt+T | Inspect SKU table | Dark zinc-900 text on clean light gray background with sharp borders. | Verified |
| SCN-187 | Medium | PLN | Quick shortcut from Products to New Batch | On Products | Press `N` | Opens Batch creation wizard with currently selected product prefilled. | Verified |
| SCN-188 | Complex | QAC | Zero-price prevention in production | SKU has ₹0.00 MRP | Try initiating batch | Blocked: ₹0.00 is not an authorized commercial price. | Verified |
| SCN-189 | Simple | PLN | SKU table column resize | Table visible | Drag column divider | Column resizes smoothly to accommodate long pack descriptions. | Verified |
| SCN-190 | Medium | PLN | Customer-specific SKU variants | Product selected | Add SKU "100 g - Export Format" | Creates distinct SKU variant with dedicated export template link. | Verified |
| SCN-191 | Complex | QAC | Multi-currency SKU support | Business currency = "$" | Check SKU MRP inputs | Displays "$" prefix; calculates rate per gram in cents/grams. | Verified |
| SCN-192 | Simple | OPR | Mobile responsive SKU view | 375px viewport | Inspect SKU list | Table converts to responsive cards with clear price and weight tags. | Verified |
| SCN-193 | Medium | PLN | Keyboard navigation inside SKU table | Focus first cell | Use `Tab` and `Arrow` keys | Moves focus cleanly across input fields without trapping focus. | Verified |
| SCN-194 | Complex | MNT | Concurrent tab product rename | Tab 1 renames product | Switch to Tab 2 | Tab 2 updates product header name immediately. | Verified |
| SCN-195 | Simple | PLN | Brand name change reflection | Settings brand changed | Return to Products | Product breadcrumbs and brand tags update to new brand name. | Verified |
| SCN-196 | Medium | QAC | Mandatory allergen declaration | Product specs | Check "May contain traces of mustard/gluten" | Displays allergen warning badge on product and preview. | Verified |
| SCN-197 | Simple | OPR | SKU row hover effect | Hover mouse over SKU | Observe row background | Row highlights with subtle amber tint for easy horizontal tracking. | Verified |
| SCN-198 | Complex | MNT | Export backup includes all SKUs | Trigger backup export | Inspect exported JSON | All SKU records, prices, and relationships present in `tables.skus`. | Verified |
| SCN-199 | Complex | MNT | Restore backup restores all SKUs | Restore backup JSON | Refresh Products | All SKUs restored with exact price and configuration snapshots intact. | Verified |
| SCN-200 | Simple | PLN | Volume 2 End-to-End SKU Verification | Complete SKU lifecycle | Create product, configure 4 SKUs, set prices, verify rates | Complete catalog ready for batch planning with 100% commercial integrity. | Verified |
