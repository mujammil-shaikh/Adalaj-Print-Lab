# Volume 01 — Home & Shell Navigation (Scenarios 001 – 100)

**Domain:** Home Dashboard, Global App Shell, Navigation Shortcuts, Live Preview Sync, Preflight Readiness, Command Palette, Tour  
**Target:** `https://adalaj-label-studio.vercel.app` & `src/components/home/HomeView.tsx`, `src/components/shell/`

---

## 1. Dashboard Loading & Active Context (SCN-001 – SCN-020)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-001 | Simple | OPR | Initial app launch | First visit, empty cache | Open `https://adalaj-label-studio.vercel.app` | Splash screen with animated "AD" pulse displays, IndexedDB initializes, redirects cleanly to Home. | Verified |
| SCN-002 | Simple | OPR | View default header banner | App loaded | Observe top header bar | Header displays "ADALAJ Studio", active product "Turmeric Powder", and active batch "ADTP013". | Verified |
| SCN-003 | Simple | OPR | Verify machine profile tag | App loaded | Check machine specs in Home hero | Displays active machine name, technology (TIJ Inkjet / Laser), head width, usable band, and DPI. | Verified |
| SCN-004 | Simple | OPR | Navigate via Top Nav buttons | On Home | Click "Products & SKUs" button in header | Route updates to `/products`, nav button gains active amber indicator, Products view renders. | Verified |
| SCN-005 | Simple | OPR | Navigate to Batches via Nav | On Products | Click "Batches" button in header | Route updates to `/batches`, active batch ADTP013 is selected, allocation list renders. | Verified |
| SCN-006 | Simple | OPR | Navigate to Designer via Nav | On Batches | Click "Design" button in header | Route updates to `/design`, 2D canvas with mm rulers renders active template. | Verified |
| SCN-007 | Simple | OPR | Navigate to Print & USB via Nav | On Design | Click "Print & USB" button in header | Route updates to `/print`, 1-bit BMP preview renders with pass plan summary. | Verified |
| SCN-008 | Simple | OPR | Navigate to History via Nav | On Print | Click "History" button in header | Route updates to `/history`, Print Jobs Archive and Batch tables render. | Verified |
| SCN-009 | Simple | OPR | Navigate to Settings via Nav | On History | Click "Settings" button in header | Route updates to `/settings`, Machine profiles and hardware configuration render. | Verified |
| SCN-010 | Simple | OPR | Return to Home via Nav | On Settings | Click "Home" button in header | Route returns to `/home`, hero preview and KPI cards render without reload. | Verified |
| SCN-011 | Medium | OPR | Alt+1 Keyboard Navigation | On any route | Press `Alt+1` | Immediately navigates to Home view without full page reload. | Verified |
| SCN-012 | Medium | OPR | Alt+2 Keyboard Navigation | On Home | Press `Alt+2` | Immediately navigates to Products & SKUs view. | Verified |
| SCN-013 | Medium | OPR | Alt+3 Keyboard Navigation | On Products | Press `Alt+3` | Immediately navigates to Batches view. | Verified |
| SCN-014 | Medium | OPR | Alt+4 Keyboard Navigation | On Batches | Press `Alt+4` | Immediately navigates to Designer view. | Verified |
| SCN-015 | Medium | OPR | Alt+5 Keyboard Navigation | On Designer | Press `Alt+5` | Immediately navigates to Print & USB view. | Verified |
| SCN-016 | Medium | OPR | Alt+6 Keyboard Navigation | On Print | Press `Alt+6` | Immediately navigates to History view. | Verified |
| SCN-017 | Medium | OPR | Alt+7 Keyboard Navigation | On History | Press `Alt+7` | Immediately navigates to Settings view. | Verified |
| SCN-018 | Medium | OPR | G-then-key chord navigation | On Home | Press `G` then `B` in quick succession | Focus/chord registers and navigates to Batches view. | Verified |
| SCN-019 | Medium | OPR | G-then-key Designer chord | On Batches | Press `G` then `D` in quick succession | Navigates to Designer view. | Verified |
| SCN-020 | Medium | OPR | G-then-key Print chord | On Designer | Press `G` then `U` in quick succession | Navigates to Print & USB view. | Verified |

---

## 2. Live Label Preview & SKU Filtering (SCN-021 – SCN-040)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-021 | Simple | OPR | View live label preview | On Home | Observe center label card | Shows packaging preview with M.R.P., Batch No., Net Wt, MFD, Best Before, and Rate/g. | Verified |
| SCN-022 | Medium | OPR | Filter Preview SKU by active product | Active product: Turmeric | Open "Preview SKU" dropdown | Dropdown lists only SKUs for Turmeric Powder; does not show SKUs from Coriander or Garam Masala. | Verified |
| SCN-023 | Medium | OPR | Select 100 g preview SKU | Active product: Turmeric | Select "ADTP 100 g (₹50)" | Live preview updates Net Wt to "100 G", M.R.P. to "₹50", and Unit Rate to "₹0.50". | Verified |
| SCN-024 | Complex | OPR | Select SKU with missing MRP | Active product: Turmeric | Select "ADTP 500 g (Needs MRP)" | Preview shows "[Needs MRP]" in amber font and displays alert: Missing authorized MRP. | Verified |
| SCN-025 | Medium | OPR | Switch to Pouch Mockup tab | On Home preview card | Click "Pouch Mockup" toggle button | Preview displays physical pouch illustration with printed variable band in place. | Verified |
| SCN-026 | Medium | OPR | Switch to Head Band (1:1) tab | On Home preview card | Click "Head Band (1:1)" toggle button | Preview zooms into 12.5mm physical print nozzle band with mm grid lines. | Verified |
| SCN-027 | Medium | OPR | Switch to 1-Bit Machine Raster tab | On Home preview card | Click "1-Bit Machine Raster" button | Preview renders pixel-accurate 1-bit monochrome binary representation for printer controller. | Verified |
| SCN-028 | Simple | OPR | Customize in Designer CTA | On Home preview card | Click "Customize in Label Designer" | Navigates to Designer with current product and SKU active in canvas. | Verified |
| SCN-029 | Simple | OPR | Print & Export CTA | On Home preview card | Click "Print & Export 1-Bit BMP" | Navigates to Print Center with active batch and allocation selected. | Verified |
| SCN-030 | Medium | PLN | Start New Batch CTA | On Home hero banner | Click "Start New Batch N" button | Navigates directly to Batches view and automatically opens New Batch Wizard. | Verified |
| SCN-031 | Medium | PLN | Press 'N' shortcut on Home | On Home, no input focused | Press key `N` | Opens New Batch Wizard immediately. | Verified |
| SCN-032 | Complex | PLN | Press 'N' while typing in input | In a text input field | Press key `N` | Types the letter 'n' into the input; does not trigger New Batch Wizard modal. | Verified |
| SCN-033 | Simple | OPR | Active Batches card render | On Home | Observe "Active Production Batches" | Displays active batch ADTP013 with 20 kg raw, 1 allocation, date 2026-03-01, status COMPLETED. | Verified |
| SCN-034 | Simple | OPR | View All Batches button | On Home active batches card | Click "View all (1)" | Navigates to Batches view with batch table focused. | Verified |
| SCN-035 | Simple | PLN | Loose Material Balances render | On Home | Observe "Loose Material Balances" card | Lists all catalog products with unallocated loose kg balances. | Verified |
| SCN-036 | Medium | PLN | Unallocated loose stock display | 5 kg residual in Turmeric | Observe Turmeric loose balance | Shows residual 5 kg loose stock available for packaging. | Verified |
| SCN-037 | Simple | OPR | Quick workflow card: Plan & Allocate | On Home footer cards | Click "Plan & Allocate Batch" card | Navigates to Batches view. | Verified |
| SCN-038 | Simple | OPR | Quick workflow card: Print & Transfer | On Home footer cards | Click "Print & Hardware Transfer" card | Navigates to Print Center view. | Verified |
| SCN-039 | Simple | OPR | Quick workflow card: Label Designer | On Home footer cards | Click "Label Designer" card | Navigates to Designer view. | Verified |
| SCN-040 | Medium | QAC | Commercial payload truth check | Home data payload table | Inspect "Current Print Data Payload" | Table matches visual label preview exactly: M.R.P. ₹50, Batch ADTP013, MFD 01/03/26, EXP 28/02/27. | Verified |

---

## 3. Command Palette, Cheat Sheet & Tour (SCN-041 – SCN-070)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-041 | Simple | OPR | Open Command Palette via button | On Home | Click "Ctrl+K" button in header | Command Palette modal opens with search input auto-focused. | Verified |
| SCN-042 | Medium | OPR | Open Command Palette via hotkey | On any view | Press `Ctrl+K` | Command Palette overlay slides open over current view. | Verified |
| SCN-043 | Medium | OPR | Search in Command Palette | Palette open | Type "Print" | Filters commands in real-time to print-related actions. | Verified |
| SCN-044 | Medium | OPR | Execute command via Enter | Palette open | Select "Navigate to Print Center" and press Enter | Palette closes and view transitions immediately to Print Center. | Verified |
| SCN-045 | Simple | OPR | Close Command Palette with Escape | Palette open | Press `Escape` | Palette closes cleanly, returning focus to previously active element. | Verified |
| SCN-046 | Simple | OPR | Open Keyboard Cheat Sheet via button | On Home | Click "?" button in header | Keyboard Shortcuts modal opens displaying all registered shortcut bindings. | Verified |
| SCN-047 | Medium | OPR | Open Cheat Sheet via '?' key | On any view, no input focused | Press `?` (or `Shift+/`) | Keyboard Shortcuts cheat sheet modal opens. | Verified |
| SCN-048 | Medium | OPR | Search in Cheat Sheet | Cheat sheet open | Type "batch" | Filters displayed shortcuts to batch operations (e.g. `N`, `Alt+3`). | Verified |
| SCN-049 | Simple | OPR | Close Cheat Sheet with Escape | Cheat sheet open | Press `Escape` | Cheat sheet closes cleanly. | Verified |
| SCN-050 | Simple | OPR | Launch Guided Tour via button | On Home | Click "Replay Guided Tour (F1)" in header | Step 1 of interactive guided tour modal opens highlighting Dashboard elements. | Verified |
| SCN-051 | Medium | OPR | Launch Guided Tour via F1 | On any view | Press `F1` | Guided tour opens on current step without triggering browser help. | Verified |
| SCN-052 | Simple | OPR | Advance Guided Tour | Tour open | Click "Next" | Highlights next interface area with descriptive tooltip. | Verified |
| SCN-053 | Simple | OPR | Step Back in Guided Tour | Tour on step > 1 | Click "Previous" | Returns to previous tour step. | Verified |
| SCN-054 | Simple | OPR | Dismiss Guided Tour | Tour open | Click "Close" / "Finish" or press `Escape` | Tour closes and preserves current application state. | Verified |
| SCN-055 | Simple | OPR | Open AI Copilot drawer via button | On Home | Click "Open AI Copilot (Alt+A)" button | AI Copilot right-hand drawer slides smoothly into view. | Verified |
| SCN-056 | Medium | OPR | Open AI Copilot via Alt+A | On any view | Press `Alt+A` | AI Copilot drawer toggles open. | Verified |
| SCN-057 | Simple | OPR | Close AI Copilot via close button | AI drawer open | Click "✕" button in drawer header | Drawer slides shut. | Verified |
| SCN-058 | Medium | OPR | Close AI Copilot via Escape | AI drawer open | Press `Escape` | Drawer closes. | Verified |
| SCN-059 | Simple | OPR | Toggle Theme via header button | On Home | Click "Toggle High-Contrast Theme (Alt+T)" | Application switches between high-contrast dark mode and clean daylight theme. | Verified |
| SCN-060 | Medium | OPR | Toggle Theme via Alt+T hotkey | On any view | Press `Alt+T` | Theme toggles immediately across all cards, text, and canvas containers. | Verified |
| SCN-061 | Medium | OPR | Theme persistence in session | In daylight theme | Refresh browser | Daylight theme remains active without resetting to default dark mode. | Verified |
| SCN-062 | Simple | OPR | Toggle Advanced Mode via header switch | Header visible | Click "Advanced" toggle switch | Reveals secondary diagnostic badges, raw byte lengths, and controller parameters. | Verified |
| SCN-063 | Simple | OPR | Disable Advanced Mode | Advanced mode ON | Click toggle switch again | Hides technical metadata, restoring clean simplified operator interface. | Verified |
| SCN-064 | Medium | OPR | Header identity strip verification | Select different batch | Navigate to Home | Header identity strip reflects updated batch ID and product name. | Verified |
| SCN-065 | Complex | OPR | Zero state with no batches | DB without batches | Open Home | Hero card prompts "No production batches created yet. Click Start New Batch to begin." | Verified |
| SCN-066 | Complex | OPR | Zero state with missing products | Empty product DB | Open Home | Displays empty catalog onboarding notice with link to Products view. | Verified |
| SCN-067 | Medium | OPR | Preflight readiness: Ready state | Valid product & SKU MRP | Inspect badge next to preview header | Displays green badge: "READY TO PRINT". | Verified |
| SCN-068 | Complex | OPR | Preflight readiness: Blocked state | Selected SKU lacks MRP | Inspect badge next to preview header | Displays amber/red badge: "BLOCKED: Missing authorized MRP". | Verified |
| SCN-069 | Medium | OPR | Roving keyboard focus on Nav | Header nav active | Use `ArrowLeft` / `ArrowRight` | Moves focus through navigation items sequentially. | Verified |
| SCN-070 | Medium | OPR | Screen reader accessible landmarks | Screen reader active | Navigate Home | Landmark roles `banner`, `navigation`, `main` announced correctly. | Verified |

---

## 4. Shell Edge Cases & Performance (SCN-071 – SCN-100)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-071 | Complex | MNT | Offline PWA capability check | App loaded in browser | Disconnect network / go offline | App continues operating completely with full IndexedDB read/write capability. | Verified |
| SCN-072 | Medium | MNT | Service worker cache verification | DevTools open | Inspect Application -> Service Workers | Active service worker registered, precaching all JS/CSS/HTML assets. | Verified |
| SCN-073 | Complex | OPR | Hard page reload on subpage | On `/print` view | Press `F5` / `Ctrl+R` | App reloads cleanly without 404; restores workspace state from IndexedDB. | Verified |
| SCN-074 | Complex | OPR | Browser Back button handling | Navigate Home -> Products -> Batches | Click browser Back button | Restores previous route gracefully. | Verified |
| SCN-075 | Complex | OPR | Browser Forward button handling | Navigated back to Products | Click browser Forward button | Advances back to Batches view. | Verified |
| SCN-076 | Simple | OPR | Viewport resize: Tablet width (768px) | Desktop view | Resize viewport to 768px | Layout adapts gracefully with stacked columns and readable font scales. | Verified |
| SCN-077 | Simple | OPR | Viewport resize: Mobile width (375px) | Tablet view | Resize viewport to 375px | Top navigation shifts to responsive menu; horizontal overflow prevented. | Verified |
| SCN-078 | Medium | OPR | High-DPI screen rendering | 4K display / 200% scaling | View Home preview canvas | Vectors and text remain sharp with crisp pixel boundaries, no blurriness. | Verified |
| SCN-079 | Complex | MNT | Multiple tab synchronization | Open app in 2 browser tabs | Modify SKU in Tab 1, switch to Tab 2 | Tab 2 reflects updated database record upon tab focus. | Verified |
| SCN-080 | Medium | OPR | Header quick-info tooltip | Hover on machine tag | Hover cursor over "Lumix Pro 20W Laser" | Displays tooltip with head size, print band mm, and default DPI. | Verified |
| SCN-081 | Medium | OPR | Header quick-info batch tooltip | Hover on batch tag | Hover cursor over "ADTP013" | Displays tooltip with production date and raw kg input. | Verified |
| SCN-082 | Simple | OPR | Scroll performance on Home | Home page loaded | Rapidly scroll up and down | Smooth 60fps scrolling with zero stuttering or canvas redraw lag. | Verified |
| SCN-083 | Complex | MNT | Rapid theme toggling stress test | On Home | Press `Alt+T` 10 times rapidly | State transitions cleanly without flickering or CSS variable race conditions. | Verified |
| SCN-084 | Complex | MNT | Rapid modal open/close stress | On Home | Press `Ctrl+K` then `Escape` repeatedly | Overlays open and close smoothly without phantom focus traps. | Verified |
| SCN-085 | Medium | OPR | PWA Install prompt availability | Browser supports PWA | Observe browser address bar | "Install ADALAJ Studio" icon appears in supported browsers. | Verified |
| SCN-086 | Complex | MNT | Memory leak audit on Home view | Chrome DevTools Memory | Mount/unmount Home 20 times | Heap snapshot reveals zero detached DOM nodes or uncleared timers. | Verified |
| SCN-087 | Simple | OPR | Favicon and app icon check | App open | Check browser tab icon | Crisp ADALAJ SVG favicon rendered in tab. | Verified |
| SCN-088 | Simple | OPR | Title tag reflects page state | Navigate between pages | Observe document title | Shows "ADALAJ Label Studio" consistently across pages. | Verified |
| SCN-089 | Medium | OPR | Keyboard focus outline visibility | Navigate using Tab key | Press `Tab` through interactive elements | High-contrast amber focus rings clearly identify active element. | Verified |
| SCN-090 | Medium | OPR | Skip to main content link | Initial tab on page | Press `Tab` on first focus | "Skip to main content" link appears and jumps to `<main>` container. | Verified |
| SCN-091 | Complex | QAC | Currency symbol configuration | Settings currency set to '$' | Return to Home preview | M.R.P. reflects configured currency symbol cleanly. | Verified |
| SCN-092 | Complex | QAC | Date format configuration | Settings date format set to 'YY/MM/DD' | Return to Home preview | MFD and EXP dates format according to configured pattern. | Verified |
| SCN-093 | Medium | OPR | Notification toast appearance | Action triggered | Trigger batch update | Toast slide-in banner appears with emerald checkmark and auto-dismisses in 4s. | Verified |
| SCN-094 | Simple | OPR | Dismiss toast banner manually | Toast visible | Click "✕" button on toast | Toast vanishes immediately. | Verified |
| SCN-095 | Complex | MNT | Storage quota check | DevTools Storage tab | Inspect IndexedDB usage | Usage is under 15 MB with generous browser quota headroom (>1 GB). | Verified |
| SCN-096 | Simple | OPR | Footer copyright & brand info | Scroll to bottom of Home | Observe footer | Shows "ADALAJ Organics & Packaging • Universal Mark & Code Engine". | Verified |
| SCN-097 | Medium | OPR | Brand logo rendering in header | Header visible | Inspect brand icon | Clean SVG emblem rendered with anti-aliasing. | Verified |
| SCN-098 | Complex | MNT | Corrupted state recovery | Clear `als_screen_scale_factor` | Reload Home | App initializes safely with default scale factor 1.0 without crashing. | Verified |
| SCN-099 | Simple | OPR | Click backdrop to close modals | Command palette open | Click dark backdrop outside dialog | Dialog closes smoothly. | Verified |
| SCN-100 | Simple | OPR | Volume 1 End-to-End Home Sanity | Clean browser | Run end-to-end user navigation flow | Operator launches app, checks KPIs, inspects preview, and opens print center in <3 clicks. | Verified |
