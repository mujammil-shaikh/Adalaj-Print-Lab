# Comprehensive Visual QA Audit & Defect Report

**App URL:** `https://adalaj-label-studio.vercel.app`  
**GitHub Repository:** `https://github.com/mujammil-shaikh/adalaj-label-studio`  
**Audit Date:** 05-Nov-2026  
**Auditor:** Antigravity Autonomous Visual QA Agent  
**Inspection Tool:** Chrome DevTools Protocol (`chrome-devtools-mcp`)  
**Tested Viewports:**
- Desktop: `1920 × 1080` & `1440 × 900`
- Tablet: `768 × 1024` (Portrait) & `1024 × 768` (Landscape)
- Mobile: `375 × 812` (iPhone / Pixel Viewport)

---

## 1. Executive Summary & Defect Inventory

| Defect ID | Severity | Category | Affected Component / View | Description | Remediation Plan |
|---|---|---|---|---|---|
| **DEF-VIS-01** | High | Accessibility / A11y | `HomeView.tsx` | Form field missing `id`, `name`, and explicit `<label htmlFor>` on SKU Preview selector. | Add `id="home-preview-sku"`, `name="previewSku"`, and explicit `<label htmlFor="home-preview-sku">`. |
| **DEF-VIS-02** | High | Accessibility / A11y | `ProductsView.tsx` | Search input, filter dropdown, and checkboxes lack `id`, `name`, and accessible `aria-label`s. | Add unique IDs, names, and explicit labels/aria-labels for table bulk controls. |
| **DEF-VIS-03** | High | Accessibility / A11y | `DesignerView.tsx` | Toolbar property inputs (font family, font size, X/Y/W/H coords, color) lack `id`, `name`, and labels. | Add `id`, `name`, `htmlFor` label bindings, and `aria-label` attributes to all toolbar inputs. |
| **DEF-VIS-04** | High | Accessibility / A11y | `PrintView.tsx` | Batch selector, SKU selector, quantity input, and proof sign-off checkboxes lack explicit `id` & `name`. | Add `id="print-batch-select"`, `id="print-sku-select"`, `id="print-quantity-input"`, and associate labels. |
| **DEF-VIS-05** | High | Accessibility / A11y | `BatchesView.tsx` | New Batch Wizard inputs (Batch ID, Product, MFD, Weight) lack full accessible form associations. | Add explicit `id`, `name`, and `<label htmlFor>` across all 3 wizard steps. |
| **DEF-VIS-06** | Medium | Responsive / Layout | `App.tsx` (Top Nav & Header) | Header status chips (`Product: ...`, `Batch: ...`) and navigation buttons crowd and wrap awkwardly on 375px mobile viewports. | Make navigation scroll horizontally on mobile (`overflow-x-auto no-scrollbar`), hide secondary status chips on `<sm`, and improve touch tap targets. |
| **DEF-VIS-07** | Medium | Responsive / Layout | `ProductsView.tsx` | SKU master table causes unstyled horizontal scroll and header action wrap on mobile/tablet viewports. | Wrap table in sleek smooth horizontal container (`overflow-x-auto border rounded-lg`), make header actions responsive (`flex-col sm:flex-row`). |
| **DEF-VIS-08** | Medium | Responsive / Layout | `HistoryView.tsx` | Filter bar inputs compress and overflow on 768px tablet viewports. | Use responsive grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3` for history filter controls. |
| **DEF-VIS-09** | Medium | UI / Visual Polish | `BatchesView.tsx` | Mass balance progress bar text contrast is weak when unallocated or scrap slices are small. | Add high-contrast drop-shadow or text badge with clear readable font weight. |
| **DEF-VIS-10** | Low | UI / Visual Polish | `SettingsView.tsx` | Machine configuration modal feed origin selects had raw unescaped characters; add clean visual badges and helper text. | Ensure all entity references are clean, cards have consistent borders and padding. |

---

## 2. Screenshot Visual Evidence Catalog

The following screenshots were captured live via Chrome DevTools during visual inspection and archived in `qa-scenarios/screenshots/`:

1. `01_desktop_home.png` — Desktop Home Dashboard (1440×900)
2. `02_desktop_products.png` — Desktop Products & SKU Master Matrix (1440×900)
3. `03_desktop_batches.png` — Desktop Batches & Mass Balance View (1440×900)
4. `04_desktop_new_batch_modal.png` — New Batch Creation Wizard (1440×900)
5. `05_desktop_designer.png` — Label Designer 2D Canvas & Properties (1440×900)
6. `06_desktop_print.png` — Print Center Preflight & Proofing View (1440×900)
7. `07_desktop_history.png` — Print History, Reprints & Audit Trail (1440×900)
8. `08_desktop_settings.png` — Machine Profiles & System Settings (1440×900)
9. `09_command_palette.png` — Command Palette Overlay (`Ctrl+K`)
10. `10_keyboard_cheat_sheet.png` — Keyboard Shortcuts Cheat Sheet Overlay (`?`)
11. `11_ai_copilot_drawer.png` — AI Copilot Assistant Drawer (`Alt+A`)
12. `12_tablet_home.png` — Tablet Portrait Viewport (768×1024)
13. `13_mobile_home.png` — Mobile Viewport (375×812)

---

## 3. Detailed Component Audit & Remediation Specifications

### 3.1 Header & Navigation (`src/App.tsx`)
- **Issue:** Navigation items in header can break into multi-line clutter on screens $< 1024\text{px}$. The status indicators (`Product: Turmeric Powder`, `Batch: ADTP013`) consume horizontal space.
- **Fix:**
  - Wrap `<nav>` in an `overflow-x-auto` container with `-webkit-overflow-scrolling: touch` and `scrollbar-none`.
  - Add `min-w-max` to navigation buttons so keyboard chord badges (`Alt+1`) remain on one line.
  - Hide secondary batch/product pill on extra small mobile screens (`hidden md:flex`).
  - Add `aria-label="Main Navigation"` to `<nav>`.

### 3.2 Home View (`src/components/home/HomeView.tsx`)
- **Issue:** "Preview SKU:" label is a raw `<span>` and `<select>` lacks `id` and `name` attributes, causing Chrome DevTools accessibility warning.
- **Fix:**
  - Change `<span>Preview SKU:</span>` to `<label htmlFor="home-preview-sku-select" className="...">Preview SKU:</label>`.
  - Add `id="home-preview-sku-select"`, `name="previewSku"`, `aria-label="Preview SKU for active batch"`.

### 3.3 Products View (`src/components/products/ProductsView.tsx`)
- **Issue:** Search textbox lacks `id`, `name`, and `<label>`/`aria-label`. Filter select lacks `id`, `name`, and `<label htmlFor>`. Checkboxes lack `aria-label`.
- **Fix:**
  - Search input: `id="products-search"`, `name="productsSearch"`, `aria-label="Search products and SKUs"`.
  - Product select: `id="products-filter"`, `name="productFilter"`, `<label htmlFor="products-filter">Product:</label>`.
  - Master checkbox: `id="products-select-all"`, `aria-label="Select all SKUs"`.
  - Row checkboxes: `id={`sku-select-${sku.id}`}`, `aria-label={`Select ${sku.name}`}`.

### 3.4 Batches View (`src/components/batches/BatchesView.tsx`)
- **Issue:** Modal form fields in New Batch wizard lack explicit `id`, `name`, and `<label htmlFor>` pairings.
- **Fix:**
  - Associate all input elements with their corresponding `<label htmlFor="...">`.
  - Add `name` attributes matching field names (`batchId`, `productId`, `mfd`, `rawMassKg`).
  - Ensure mass balance bar has high-contrast typography and clear percentage callouts.

### 3.5 Designer View (`src/components/designer/`)
- **Issue:** Inspector toolbar contains text inputs for element X, Y, Width, Height, Font Size, Text Content that lack `id`, `name`, and `aria-label`s.
- **Fix:**
  - Add explicit `id` and `aria-label` attributes to each input control (e.g. `id="elem-pos-x"`, `aria-label="X position in millimeters"`).
  - Add accessible names to alignment buttons and font style toggles.

### 3.6 Print View (`src/components/print/PrintView.tsx`)
- **Issue:** Select elements for Batch and SKU lack associated labels and IDs. Quantity input lacks ID. Proof checklist checkboxes lack explicit `<label htmlFor="...">`.
- **Fix:**
  - Add `id="print-batch-select"` with `<label htmlFor="print-batch-select">Batch:</label>`.
  - Add `id="print-sku-select"` with `<label htmlFor="print-sku-select">Target SKU:</label>`.
  - Add `id="print-quantity-input"` with `<label htmlFor="print-quantity-input">Print Quantity:</label>`.
  - Ensure proof sign-off checkboxes have unique IDs (`proof-check-text`, `proof-check-barcode`, `proof-check-commercial`) tied to their label text.

### 3.7 History View (`src/components/history/HistoryView.tsx`)
- **Issue:** Search and filter controls lack explicit `id` and `name` attributes.
- **Fix:**
  - Add `id="history-search-input"`, `id="history-status-filter"`, `id="history-date-filter"`.
  - Improve mobile responsiveness by allowing the table to scroll smoothly on touch devices with a sticky action column or card layout.

---

## 4. Verification & Sign-Off Criteria

1. Chrome DevTools console must report **0 accessibility form issues** (`A form field element should have an id or name attribute: 0`).
2. All 7 page views and 4 overlays must render without horizontal layout clipping at 375px, 768px, and 1440px.
3. Automated test suite must pass with 100% green tests (`pnpm test`).
4. TypeScript check must pass with 0 errors (`pnpm lint`).
5. Live production deployment on Vercel must be updated and verified.
