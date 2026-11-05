# Adalaj Print Lab — 1,000 Production Scenarios & User Stories Master Taxonomy

**Date:** 5 November 2026  
**Audited Target:** `https://adalaj-print-lab.vercel.app` & `src/`  
**Total Target Scenarios:** 1,000 Exhaustive Scenarios Across 10 Volumes  
**Framework Coverage:** Simple, Medium, Complex & Edge Cases across All Pages, Modals, Hardware, and Domain Logic.

---

## 1. Persona Definitions

| Persona Code | Role | Description & Primary Goal |
|---|---|---|
| **PER-01: OPR** | Plant Floor Operator | Fast batch selection, physical proofing, one-click print dispatch, error recovery without technical training. |
| **PER-02: PLN** | Production Planner | Raw material mass balance calculations, pack allocations, loose stock balance tracking, batch creation. |
| **PER-03: DSG** | Packaging Designer | Template design, 12.5mm nozzle band constraints, variable bindings, 2-tier template hierarchy (Pack vs SKU). |
| **PER-04: QAC** | QA & Compliance Auditor | Expiry date calculations (clamped anniversary -1 day), authorized MRP verification, lot traceability, reprint verification. |
| **PER-05: MNT** | Maintenance & Systems Tech | Hardware socket configuration, Local Print Agent port 9123 bridge, machine profile calibration, V2 JSON backups. |

---

## 2. Complexity Tiers

- **Tier 1: Simple (Basic UI & Standard Operations)**: Single-click actions, standard views, basic navigation, default value rendering, normal form entries.
- **Tier 2: Medium (Domain Logic & Cross-Page Flows)**: Mass balance verification, allocation splitting, dynamic template resolution, proof workflows, search filtering.
- **Tier 3: Complex / Edge Case (Stress, Failure Recovery & Hardware)**: Over-allocation blocking, leap year/month-end clamping, socket timeouts, offline local agent bridge, schema upgrades, byte-identical snapshot reprints.

---

## 3. Volume Distribution (1,000 Scenarios)

| Volume | File Name | Range | Domain Scope |
|---|---|---|---|
| **Volume 01** | `VOLUME_01_HOME_AND_SHELL_NAVIGATION_SCENARIOS_001_100.md` | SCN-001 to SCN-100 | Home Dashboard, KPIs, Live Preview Sync, Preflight Alerts, Global Nav, Hotkeys, Command Palette, Tour. |
| **Volume 02** | `VOLUME_02_PRODUCTS_AND_SKU_CATALOG_SCENARIOS_101_200.md` | SCN-101 to SCN-200 | Products Master, SKU Matrix, Inline MRP, Rate/g Calculation, Bulk Updates, Commercial Value Enforcement. |
| **Volume 03** | `VOLUME_03_BATCH_PLANNING_AND_MASS_BALANCE_SCENARIOS_201_300.md` | SCN-201 to SCN-300 | Batch Wizard, Dynamic Auto-IDs, Strict Mass Balance ($Raw \ge \sum Alloc$), Zero Packs, Lot Dates, Shelf Life. |
| **Volume 04** | `VOLUME_04_LOOSE_STOCK_AND_RESIDUAL_LEDGER_SCENARIOS_301_400.md` | SCN-301 to SCN-400 | Loose Stock Ledger, Traceable Lots, Container Tracking, Reusable Allocation Draw, Scrapping Unusable Stock. |
| **Volume 05** | `VOLUME_05_DESIGNER_CANVAS_AND_BAND_CONSTRAINTS_SCENARIOS_401_500.md` | SCN-401 to SCN-500 | 2D Canvas Engine, Physical mm Rulers, 12.5mm Nozzle Band Enforcement, Variable Bindings, Text Auto-Fit. |
| **Volume 06** | `VOLUME_06_TEMPLATE_HIERARCHY_AND_BARCODES_SCENARIOS_501_600.md` | SCN-501 to SCN-600 | 2-Tier Template Hierarchy (Tier 1 Pack vs Tier 2 SKU), Scope Isolation, Vector CODE128, EAN13, QR Codes. |
| **Volume 07** | `VOLUME_07_PRINT_CENTER_PREFLIGHT_AND_PROOFING_SCENARIOS_601_700.md` | SCN-601 to SCN-700 | Print Center Preflight Gates, 4-Stage Proofing Workflow, 1-bit Monochrome Rasterizer, 0°/90°/180°/270° Rotation. |
| **Volume 08** | `VOLUME_08_HARDWARE_DISPATCH_AND_LOCAL_AGENT_SCENARIOS_701_800.md` | SCN-701 to SCN-800 | Local Print Agent (Port 9123), RAW TCP Port 9100 Dispatch, Latency Ping, WebUSB, Bluetooth, FAT32 ZIP Packages. |
| **Volume 09** | `VOLUME_09_HISTORY_EXACT_REPRINTS_AND_AUDIT_SCENARIOS_801_900.md` | SCN-901 to SCN-900 | PrintJob Persistence, Byte-Identical Exact Reprints, Dynamic Batch Filters, Zero-Count Truth, Audit Trail. |
| **Volume 10** | `VOLUME_10_SETTINGS_BACKUP_AND_EDGE_CASES_SCENARIOS_901_1000.md` | SCN-901 to SCN-1000 | Machine Specs Editor, Pack Measurement Wizard, Shortcut Capture, V2 JSON Backup/Restore, Responsive & Edge Cases. |
