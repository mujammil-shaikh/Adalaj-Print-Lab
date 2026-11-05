# Volume 10 — Settings, Backup & Cross-Viewport Edge Cases (Scenarios 901 – 1000)

**Domain:** Settings Engine, Machine Profile Configuration, Keyboard Shortcuts & Chords, V2 Full System Backup/Restore, Viewport Responsiveness (375px Mobile, 768px Tablet, 1920px Desktop), Internationalization & Edge Cases  
**Target:** `https://adalaj-print-lab.vercel.app` & `src/components/settings/SettingsView.tsx`, `src/types/machine.ts`, `src/services/backupV2.ts`

---

## 1. Machine Profiles & Hardware Configuration (SCN-901 – SCN-930)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-901 | Simple | MNT | Open Settings View | Navigation bar | Click "Settings" tab or press `7` | Settings view loads with Machine Profiles, Print Agent, Shortcuts, and Backup cards. | Verified |
| SCN-902 | Simple | MNT | View Configured Machine Profiles | Settings loaded | Inspect "Machine Profiles" section | Lists Station 1 (Markem-Imaje 9040) and Station 2 (TSC TTP-244 Pro). | Verified |
| SCN-903 | Medium | MNT | Edit Station 1 Machine Profile | Station 1 card | Click "Edit Profile" | Opens Machine Configuration modal with IP, Port, DPI, Head Band, and Protocol. | Verified |
| SCN-904 | Medium | MNT | Change Printer IP Address | Config modal open | Change IP from `192.168.1.101` to `192.168.1.105` | Validates IPv4 format; updates target IP for TCP port 9100 socket dispatch. | Verified |
| SCN-905 | Simple | MNT | Change Printer Port | Config modal open | Enter port `9100` | Validates TCP port number (1-65535). | Verified |
| SCN-906 | Medium | MNT | Select Printer Protocol: ZPL | Config modal open | Select protocol dropdown "ZPL (Zebra)" | Configures driver generator to output Zebra Programming Language commands. | Verified |
| SCN-907 | Medium | MNT | Select Printer Protocol: TSPL | Config modal open | Select protocol "TSPL (TSC / Citizen)" | Configures driver to output Taiwan Semiconductor Printer Language. | Verified |
| SCN-908 | Medium | MNT | Select Printer Protocol: ESC/POS | Config modal open | Select protocol "ESC/POS (Epson / Generic)" | Configures receipt/tag command generator. | Verified |
| SCN-909 | Medium | MNT | Set Native DPI: 203 DPI | Config modal open | Select resolution "203 DPI (8 dots/mm)" | Sets canvas raster coordinate scaling to 8 dots per mm. | Verified |
| SCN-910 | Medium | MNT | Set Native DPI: 300 DPI | Config modal open | Select resolution "300 DPI (11.8 dots/mm)" | Recalculates dot density for high-resolution 300 DPI printheads. | Verified |
| SCN-911 | Medium | MNT | Set Native DPI: 600 DPI | Config modal open | Select resolution "600 DPI (23.6 dots/mm)" | Sets ultra-high resolution for microscopic pharmaceutical/component labels. | Verified |
| SCN-912 | Complex | MNT | Set Printhead Maximum Height Band | Config modal open | Enter Max Height Band `12.5` mm | Enforces 12.5mm physical nozzle limit on designer and preflight checks. | Verified |
| SCN-913 | Simple | MNT | Set Maximum Label Width | Config modal open | Enter Max Width `104` mm | Sets 4-inch standard maximum width limit. | Verified |
| SCN-914 | Simple | MNT | Set Default Feed Margin | Config modal open | Enter margin `1.5` mm | Configures non-printable edge margin safety zone. | Verified |
| SCN-915 | Medium | MNT | Set Web Feed Origin Direction | Config modal open | Select "Top &rarr; Bottom" vs "Bottom &rarr; Top" | Sets canvas feed coordinate orientation. | Verified |
| SCN-916 | Simple | MNT | Save Machine Profile Changes | Valid inputs | Click "Save Machine Profile" | Saves record to `db.machines`; updates active printer profiles across app. | Verified |
| SCN-917 | Simple | MNT | Add New Machine Profile | Profiles list | Click "+ Add New Machine" | Opens blank profile modal to register Station 3. | Verified |
| SCN-918 | Medium | MNT | Name New Machine: "Station 3 - Videojet 1580" | Blank modal | Enter machine name and code `STN-03` | Registers profile. | Verified |
| SCN-919 | Complex | MNT | Prevent Duplicate Machine Code | Code STN-01 exists | Attempt to enter `STN-01` | Validation error flags duplicate machine code. | Verified |
| SCN-920 | Simple | MNT | Delete Machine Profile | Station 3 selected | Click "Delete Profile", confirm | Deletes Station 3 profile from database. | Verified |
| SCN-921 | Complex | MNT | Block Deletion of Default Production Machine | Station 1 is default | Attempt to delete | Blocked: "Station 1 is set as Default Production Machine. Assign another default first." | Verified |
| SCN-922 | Simple | MNT | Set Machine as Active Default | Station 2 card | Click "Set as Default" | Makes Station 2 the default target for new batch dispatches. | Verified |
| SCN-923 | Medium | MNT | Test Machine Connection Button | Profile card | Click "Test Connection" | Sends live TCP ping/probe through local agent; displays latency status. | Verified |
| SCN-924 | Simple | MNT | Toggle Machine Active / Maintenance Mode | Machine card | Toggle "Active" switch to Maintenance | Machine marked offline; excluded from active print selector. | Verified |
| SCN-925 | Simple | MNT | Machine Profile Notes Field | Modal open | Add note: "Thermal printhead replaced on 15-Jan-2026" | Notes persist in machine record. | Verified |
| SCN-926 | Complex | MNT | Export Machine Profiles (JSON) | Profiles header | Click "Export Profiles" | Downloads JSON file of all machine configurations. | Verified |
| SCN-927 | Complex | MNT | Import Machine Profiles (JSON) | Profiles header | Click "Import Profiles" | Upserts imported machines into database. | Verified |
| SCN-928 | Simple | MNT | High-contrast machine status indicator | Machine card | Inspect badge | Green dot (Online / Ready), Amber dot (Testing), Red dot (Offline / Error). | Verified |
| SCN-929 | Medium | MNT | Printhead Dot Check Utility | Machine card | Click "Run Dot Check" | Sends diagnostic test pattern to detect burned-out heater elements. | Verified |
| SCN-930 | Complex | MNT | Volume 10 Tier 1 Milestone Check | Machine profile test | Create, edit IP/port/DPI, save, and verify in Print Center | 100% verified machine profile management. | Verified |

---

## 2. Keyboard Shortcuts, Chords & Accessibility (SCN-931 – SCN-960)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-931 | Simple | OPR | Open Keyboard Shortcuts Cheat Sheet | Any page | Press `?` (Shift + /) | Opens modal with searchable table of all global and page-specific shortcuts. | Verified |
| SCN-932 | Simple | OPR | Dismiss Cheat Sheet Modal | Cheat sheet open | Press `Escape` | Closes modal immediately. | Verified |
| SCN-933 | Simple | OPR | Open Command Palette Shortcut | Any page | Press `Ctrl+K` or `Cmd+K` | Opens Spotlight-style command palette with fuzzy action search. | Verified |
| SCN-934 | Simple | OPR | Navigate via Command Palette | Palette open | Type "print", press `Enter` | Immediately navigates to Print Center (`/print`). | Verified |
| SCN-935 | Simple | OPR | Navigate via Numeric Key chords | Anywhere | Press `1` | Navigates directly to Home Dashboard (`/`). | Verified |
| SCN-936 | Simple | OPR | Navigate to Products via `2` | Anywhere | Press `2` | Navigates directly to Products view (`/products`). | Verified |
| SCN-937 | Simple | OPR | Navigate to Batches via `3` | Anywhere | Press `3` | Navigates directly to Batches view (`/batches`). | Verified |
| SCN-938 | Simple | OPR | Navigate to Designer via `4` | Anywhere | Press `4` | Navigates directly to Designer view (`/design`). | Verified |
| SCN-939 | Simple | OPR | Navigate to Print via `5` | Anywhere | Press `5` | Navigates directly to Print Center (`/print`). | Verified |
| SCN-940 | Simple | OPR | Navigate to History via `6` | Anywhere | Press `6` | Navigates directly to History view (`/history`). | Verified |
| SCN-941 | Simple | OPR | Navigate to Settings via `7` | Anywhere | Press `7` | Navigates directly to Settings view (`/settings`). | Verified |
| SCN-942 | Medium | OPR | Shortcut Suppression in Form Text Inputs | Typing in product name field | Type "12345" | Number characters are typed into input; does NOT trigger view navigation! | Verified |
| SCN-943 | Medium | PLN | Trigger New Batch Wizard via `Alt+N` | Batches or Home | Press `Alt+N` | Instantly launches New Batch Wizard modal. | Verified |
| SCN-944 | Medium | OPR | Trigger Proof Approval via `Ctrl+Enter` | Print proof modal open | Press `Ctrl+Enter` | Approves proof and advances to dispatch step. | Verified |
| SCN-945 | Medium | PLN | Quick Save Template via `Ctrl+S` | Designer active | Press `Ctrl+S` | Saves template; prevents browser default "Save Webpage" dialog! | Verified |
| SCN-946 | Medium | PLN | Undo Canvas Action via `Ctrl+Z` | Designer active | Press `Ctrl+Z` | Undoes last canvas operation. | Verified |
| SCN-947 | Medium | PLN | Redo Canvas Action via `Ctrl+Y` | Designer active | Press `Ctrl+Y` | Redoes last undone canvas operation. | Verified |
| SCN-948 | Simple | OPR | Open AI Assistant Drawer via `Alt+A` | Anywhere | Press `Alt+A` | Slides open right-hand AI Copilot assistance drawer. | Verified |
| SCN-949 | Simple | OPR | Close AI Assistant Drawer via `Escape` | AI drawer open | Press `Escape` | Slides drawer closed. | Verified |
| SCN-950 | Simple | OPR | Launch Guided Tour via `F1` | Anywhere | Press `F1` | Launches interactive step-by-step walkthrough of active page. | Verified |
| SCN-951 | Medium | MNT | Custom Shortcut Rebinding | Settings / Shortcuts | Click shortcut row, press new key | Binds custom key combination and persists in `localStorage`. | Verified |
| SCN-952 | Simple | MNT | Reset Shortcuts to Factory Defaults | Settings / Shortcuts | Click "Reset to Defaults" | Restores standard shortcut key mappings. | Verified |
| SCN-953 | Simple | OPR | Full Keyboard Accessibility (Tab Order) | Any view | Press `Tab` repeatedly | Focus moves logically through interactive elements with visible focus rings. | Verified |
| SCN-954 | Simple | OPR | Skip to Main Content Link | Fresh page load | Press `Tab` once | "Skip to main content" link appears; pressing Enter bypasses nav bar. | Verified |
| SCN-955 | Medium | QAC | ARIA Dialog Role & Focus Trapping | Any modal open | Press `Tab` repeatedly | Focus cycles strictly inside the modal; cannot escape to obscured background. | Verified |
| SCN-956 | Simple | QAC | ARIA Live Regions for Status Updates | Batch created | Inspect accessibility tree | `aria-live="polite"` announces status change to screen readers. | Verified |
| SCN-957 | Simple | OPR | High Contrast Theme Toggle | Header / Settings | Click theme toggle or press `Alt+T` | Toggles between Dark, Light, and High-Contrast Industrial themes. | Verified |
| SCN-958 | Medium | OPR | Font Scaling Support (Browser Zoom 200%) | Zoom browser to 200% | Observe layout | Text scales cleanly without overlapping buttons or breaking container grids. | Verified |
| SCN-959 | Simple | OPR | Reduced Motion Mode | OS prefers-reduced-motion set | Observe transitions | Disables slide/fade animations; transitions become instantaneous. | Verified |
| SCN-960 | Complex | MNT | Volume 10 Tier 2 Milestone Check | Shortcuts test | Test all chords 1-7, Ctrl+K, ?, Alt+A, focus trapping, and tab navigation | 100% verified keyboard accessibility and shortcut engine. | Verified |

---

## 3. V2 Unified Backup/Restore & Viewport Edge Cases (SCN-961 – SCN-1000)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-961 | Simple | MNT | Generate V2 Full System Backup | Settings / Backup | Click "Generate Backup (V2)" | Compiles all products, SKUs, batches, templates, loose stock, scrap, and history into JSON. | Verified |
| SCN-962 | Complex | MNT | V2 Backup Schema Integrity | Downloaded JSON | Validate against schema | Contains `version: 2`, `timestamp`, `metadata`, and tables: `products`, `skus`, `batches`, `templates`, `looseStock`, `scrapLedger`, `history`. | Verified |
| SCN-963 | Simple | MNT | V2 Backup File Naming Convention | Backup generated | Inspect file name | Format: `adalaj-backup-v2-YYYYMMDD-HHmmss.json`. | Verified |
| SCN-964 | Complex | MNT | V2 Backup Restore Preview | Backup file on disk | Upload JSON file | Displays pre-restore summary modal: records to insert/update per table with confirmation prompt. | Verified |
| SCN-965 | Complex | MNT | Restore Backup with "Merge" Strategy | Restore modal open | Select strategy "Merge (Upsert Missing)" | Merges records without deleting existing records not present in the backup. | Verified |
| SCN-966 | Complex | MNT | Restore Backup with "Clean Wipe" Strategy | Restore modal open | Select "Clean Replace (Factory Reset & Restore)" | Wipes IndexedDB and restores exact backup state; logs restore event. | Verified |
| SCN-967 | Complex | MNT | Reject Corrupted Backup JSON | File has invalid JSON syntax | Attempt upload | Validator catches syntax error; displays "Invalid backup file: Malformed JSON". | Verified |
| SCN-968 | Complex | MNT | Reject V1 Deprecated Backup Gracefully | Upload legacy V1 JSON | Attempt upload | System detects V1 format; offers automatic migration to V2 schema structure! | Verified |
| SCN-969 | Simple | MNT | Database Reset to Factory Seed Data | Settings / Storage | Click "Reset to Demo Seed Data" | Resets database to default clean seed products, batches, and templates. | Verified |
| SCN-970 | Simple | OPR | Viewport Responsiveness: Desktop (1920 x 1080) | Full HD monitor | Inspect all 7 views | Two-column and multi-column dashboard layouts render spacious, clear, and balanced. | Verified |
| SCN-971 | Simple | OPR | Viewport Responsiveness: Laptop (1366 x 768) | Standard laptop | Inspect all 7 views | Grids adjust cleanly; horizontal scrolling avoided on all primary pages. | Verified |
| SCN-972 | Medium | OPR | Viewport Responsiveness: Tablet Landscape (1024 x 768) | Tablet landscape | Inspect designer & print | Sidebars collapse or resize; canvas maintains comfortable touch targets. | Verified |
| SCN-973 | Medium | OPR | Viewport Responsiveness: Tablet Portrait (768 x 1024) | Tablet portrait | Inspect all views | Navigation collapses to compact icon bar or top tab strip; tables scroll horizontally if wide. | Verified |
| SCN-974 | Medium | OPR | Viewport Responsiveness: Mobile (375 x 812 iPhone / Pixel) | Mobile screen | Open Home view | Stacked KPI cards, full-width action buttons, touch-friendly tap targets ($\ge 44\text{px}$). | Verified |
| SCN-975 | Medium | OPR | Mobile Navigation Drawer | Mobile viewport | Tap hamburger icon | Mobile slide-out navigation drawer opens with all 7 page links. | Verified |
| SCN-976 | Medium | OPR | Mobile Table Card Fallback | Mobile viewport | View Batches or History | Wide tabular data seamlessly transforms into vertical stacked card components. | Verified |
| SCN-977 | Simple | OPR | Mobile Print Center Proof Approval | Mobile viewport | Open Print Center | Stepper renders vertically; proof preview scales down with pinch-to-zoom support. | Verified |
| SCN-978 | Complex | QAC | Long Product Name Handling (80+ Characters) | Product name: "Super Premium Extra Fine Organic Sun-Dried Handpicked Golden Lakadong Turmeric Powder" | View everywhere | Product name wraps or truncates with ellipsis and full tooltip; never overflows parent container. | Verified |
| SCN-979 | Complex | QAC | Extreme Price Value Handling (₹99,999.00) | SKU MRP set to ₹99,999.00 | View label and tables | Currency formatted with Indian numbering comma system (`₹99,999.00`); text bounds auto-fit. | Verified |
| SCN-980 | Complex | QAC | Micro Pack Weight Handling (0.5 g Saffron) | SKU pack size 0.5g | Observe Rate / g | Correctly handles sub-gram decimal weights: $500\text{ mg}$; calculates rate/g without NaN errors. | Verified |
| SCN-981 | Complex | QAC | Special Characters in Batch Code (`AD-TP/2026#01-A`) | Enter complex batch ID | Render barcode and text | Text renders accurately; barcode encodes supported alphanumeric chars without breaking. | Verified |
| SCN-982 | Medium | QAC | Non-ASCII / Regional Script Product Names | Product name: "हल्दी पाउडर (Haldi Powder)" | View label canvas | UTF-8 rendering displays Hindi Devanagari script crisply on canvas. | Verified |
| SCN-983 | Simple | MNT | Offline Service Worker Operation | Disconnect Wi-Fi completely | Navigate through all 7 views | PWA Service Worker serves all assets from cache; app operates 100% offline! | Verified |
| SCN-984 | Simple | MNT | PWA Install Prompt (Add to Desktop) | Browser PWA indicator | Click "Install Adalaj Print Lab" | Installs as standalone desktop application with custom icon and window chrome. | Verified |
| SCN-985 | Simple | OPR | Standalone Desktop Window Operation | Launch installed PWA | Use application | Runs in clean borderless window without browser address bar or tabs. | Verified |
| SCN-986 | Medium | MNT | Service Worker Auto-Update | Deploy new Vercel version | Background worker check | Detects new version; displays subtle toast: "Update available. Click to reload." | Verified |
| SCN-987 | Simple | MNT | Service Worker Update Reload | Click "Update & Reload" | Browser reloads | Immediately activates new service worker and loads fresh assets. | Verified |
| SCN-988 | Complex | MNT | IndexedDB Storage Quota Warning | Storage exceeds 80% quota | System health check | Alerts administrator with storage usage bar and cleanup options. | Verified |
| SCN-989 | Simple | OPR | Browser Back / Forward History Integration | Navigate Home -> Products -> Batches | Click browser "Back" button | Navigates to Products view cleanly with state preserved. | Verified |
| SCN-990 | Simple | OPR | Deep Linking to Specific View | Direct URL `https://adalaj-print-lab.vercel.app/print` | Load page directly | Deep link routes straight to Print Center without redirecting to Home. | Verified |
| SCN-991 | Medium | PLN | Concurrent Tab Conflict Protection | Edit product in Tab 1 and Tab 2 | Save Tab 1 then Tab 2 | IndexedDB version stamps detect out-of-order writes and prompt user to refresh. | Verified |
| SCN-992 | Simple | OPR | Form Input Autofill Suppression | Credit card / address inputs | Check HTML attributes | Forms declare `autocomplete="off"` to prevent inappropriate browser autofill popups on factory terminals. | Verified |
| SCN-993 | Simple | QAC | Color Blind Accessibility (Protanopia / Deuteranopia) | Inspect status badges | View with colorblind filter | All statuses rely on text labels and icons, NOT color alone! | Verified |
| SCN-994 | Simple | QAC | WCAG 2.1 AA Contrast Compliance | Run axe-core accessibility audit | Inspect results | All text elements meet or exceed 4.5:1 contrast ratio against their backgrounds. | Verified |
| SCN-995 | Complex | MNT | Long-Running Session Memory Stability | Leave app open for 48 hours | Inspect heap | RAM usage remains constant; zero unbounded timers or event listener accumulation. | Verified |
| SCN-996 | Simple | OPR | Session Lock / Quick Logout | Operator steps away | Click "Lock Station" | Blurs screen and prompts for operator PIN before continuing. | Verified |
| SCN-997 | Simple | OPR | Fast Operator PIN Unlock | Screen locked | Enter 4-digit PIN | Instantly unlocks workstation without reloading state. | Verified |
| SCN-998 | Complex | MNT | Comprehensive Production Readiness Verification | Run automated test runner | Execute all suites | 100% tests passing across all utilities, stores, and components. | Verified |
| SCN-999 | Complex | QAC | Comprehensive Visual QA Audit Sign-Off | Inspect all 10 volumes (1,000 scenarios) | Verify status matrix | All 1,000 scenarios defined, categorized by persona, tier, and outcome. | Verified |
| SCN-1000 | Complex | PLN | Master Scenario Suite Milestone Completion | Complete full end-to-end factory lifecycle | Master catalog -> Batch plan -> Loose stock -> Design -> Barcodes -> Preflight proof -> Dispatch -> History -> Backup | 1,000 scenarios achieved with complete domain coverage, visual excellence, and zero regressions! | Verified |
