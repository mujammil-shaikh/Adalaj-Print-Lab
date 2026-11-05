# 08 — Settings, Navigation, Command Palette, Keyboard, Tour, and PWA Shell

## Settings audit

### Machine profiles
`src/components/settings/SettingsView.tsx` lists machine profiles and allows making one active. The `onUpdateMachine` callback is passed but not actually used for an editable profile workflow. Operators/designers need a safe profile editor with validation, versioning and an impact preview.

Required machine fields: display name, manufacturer/model, transport type, DPI X/Y, max printable width/height, feed direction, supported media, printable origin/offset, speed/density, supported raster protocol, status query/acknowledgement capability, cut/feed capabilities, firmware notes, supported device IDs, calibration values, test status/date and profile version. Distinguish hardware capability from per-label pack settings.

### Pack profiles
The current wizard writes only a subset of the physical calibration model (`printWindowStartY`, `valueLinePitchMm`, `printWindowLengthMm`, status/notes). It does not reliably capture a complete measured pack window, reference edge, x-range, measured height, camera/measurement provenance, or calibrated tolerance. `wizardTextHeight` does not become a robust per-caption geometry constraint.

Required flow: select SKU/pack → choose reference edge → enter/measure pack dimensions → capture printable window left/top/width/height → set text baseline/row pitch and barcode safe area → render calibration sheet → measure printed result → save version with measured/estimated status. Add units to every value and inline examples.

### Hardware
The Settings hardware tab must reflect actual adapter capabilities. It must not call browser fetch raw TCP. Show supported devices only; unknown devices should show “not supported yet”. Provide health-check, test page, reconnect, permission revoke, and diagnostic export. Do not conflate “browser permission granted”, “device connected”, “job sent”, “device accepted”, and “print physically verified”.

### Screen calibration
The current scale factor is persisted to `localStorage` under `als_screen_scale_factor`, but the Designer does not consume it. Either wire it into a well-defined screen-to-mm display transform (without changing the physical print output) or remove the misleading setting. Calibration should measure against an on-screen ruler and remain clearly labeled as display-only.

### Keyboard shortcuts
Current UI captures shortcut text rather than a true key chord. Global dispatcher in `App.tsx` hardcodes shortcuts, so registry remapping does not control the dispatcher. Reset clears an override without reliably restoring the visible default. Fix via one shortcut manager that owns defaults, overrides, conflict detection, capture, dispatch, scope and reset. Provide an escape/cancel mechanism and prevent capturing browser/system-reserved combinations.

### Backup / restore
Backup must be complete, versioned and validated. Include all domain tables, templates, media asset bytes/references, print jobs/attempts, pack/machine profiles, preferences and audit events where policy permits. Current export appears to select only a subset; import merges with `bulkPut` and has no dry run/rollback/version migration. Add encrypted optional backup, checksum, schema version, restore preview, collision policy, explicit full replace vs merge, transactional import and rollback. Do not claim backup includes print evidence if it does not.

## Application shell findings

- Main navigation is component state rather than URL routing; refresh/deep-link/back behavior is weak and no route is bookmarkable.
- Active batch/product chips and some row/card surfaces are clickable containers rather than semantic buttons/links.
- Action registry contains global navigation and shell actions, not the full range of editor/batch/print commands; command palette therefore cannot surface or execute every action.
- Keyboard dispatcher uses hardcoded shortcuts rather than the saved action registry mapping.
- “Offline” is based on `navigator.onLine`; it does not mean local writes are synced or a printer is reachable.
- Guided tour and cheatsheet need to reflect actual actions and should not describe dead or unsupported features as working.

## Shell redesign behavior

### Navigation
Use a router (React Router or a lightweight equivalent) with routes for Home, Products, Batches, Designer, Print Center, History, Settings and optional Job Detail. Persist only safe navigation context in query params (e.g. batch/allocation/job IDs). Refresh and browser back/forward must work. Route guards handle missing records with clear recovery actions.

### Header
Keep global product/batch context but make chips semantic buttons that open context selectors. Show current workspace, unsaved state, printer/agent state only when known, and sync state only when real sync exists. Avoid green “Ready” badges based solely on static demo state.

### Command palette
Index all actual registered commands with title, keywords, category, scope, keyboard shortcut and enabled predicate. Opening a command must invoke the same callback as the corresponding visible button. Show disabled reason, not dead command. Support arrow navigation, enter, escape, focus restore, and screen-reader announcements.

### Keyboard manager
Central `ShortcutManager`: one source of truth for default bindings, user overrides, active page, focus-aware suppression, collision detection, capture and help overlay. Commands may scope to global/page/editor. Editable inputs/contenteditable should not trigger canvas nudges or global save. Do not override browser shortcuts silently.

### Guided tour
Tour steps must anchor to real elements using stable `data-tour` selectors, wait for lazy-rendered views, scroll targets into view, trap focus, and allow skip/back/next/finish. If target does not exist, skip with a safe fallback. Re-run only on request.

### PWA/offline
Show `Online`, `Offline`, `Changes saved locally`, `Sync pending`, or `Sync failed` as distinct statuses. If there is no sync backend, say “Local-only mode” rather than presenting an offline-first sync promise. Install button should handle unsupported browsers and rejected prompts. Service worker update UX must explain when a reload is required and must not discard unsaved changes.

## Acceptance criteria

- Every settings value shown as configurable is actually persisted and consumed by the subsystem it claims to affect.
- Shortcut changes immediately affect command dispatch and visible help; conflicts are prevented.
- Restore preview shows counts, conflicts and schema migration before import.
- The app supports refresh, deep link and browser back/forward for primary routes.
- Command palette and visible controls call the same underlying actions.
- Offline/local/sync/printer states are distinct and truthful.
