# Volume 08 — Hardware Dispatch & Local Agent (Scenarios 701 – 800)

**Domain:** Hardware Dispatch Architecture, Local Print Agent (HTTP/WebSocket on Port 9123), Native Raw TCP Sockets (Port 9100), WebUSB Direct, Web Bluetooth, Offline Job Spooler, Dispatch Acknowledgements  
**Target:** `https://adalaj-print-lab.vercel.app` & `src/services/printDispatcher.ts`, `src/services/localAgent.ts`, `src/types/printJob.ts`

---

## 1. Local Print Agent Architecture & Pairing (SCN-701 – SCN-730)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-701 | Simple | MNT | Check Local Print Agent Connection | Print Center open | Observe Agent Status indicator | Displays green indicator: "Local Print Agent Online (v1.4.2 at 127.0.0.1:9123)". | Verified |
| SCN-702 | Simple | MNT | Agent Offline Banner & Retry | Agent service stopped | Observe indicator | Red banner: "Local Print Agent Offline. Native TCP printing unavailable." with "Retry" button. | Verified |
| SCN-703 | Medium | MNT | Auto-reconnect Polling | Agent offline | Restart local Windows background service | Browser agent client auto-reconnects within 3 seconds without manual page refresh. | Verified |
| SCN-704 | Complex | MNT | Agent Pairing & Token Authentication | Fresh installation | Click "Pair Agent", enter pairing token | Saves secure session token in IndexedDB; establishes authenticated WebSocket connection. | Verified |
| SCN-705 | Complex | MNT | Reject Untrusted Agent Origin | Malicious site attempts connection | Agent inspects HTTP `Origin` header | Agent blocks connection; allows requests only from `https://adalaj-print-lab.vercel.app` or `http://localhost:5173`. | Verified |
| SCN-706 | Simple | MNT | Agent Diagnostics Modal | Click Agent Status indicator | Modal opens | Displays: Agent Version, Uptime, Paired Machines, Socket Buffer Status, Active Listeners. | Verified |
| SCN-707 | Medium | MNT | Agent Ping Latency Monitor | Diagnostics modal open | Observe ping indicator | Displays real-time roundtrip ping latency (e.g. `2 ms (Localhost)`). | Verified |
| SCN-708 | Complex | MNT | Agent Allowed IP / Port Whitelist | Agent config file | Verify restricted printer IPs | Confirms agent only opens sockets to whitelisted LAN subnet (e.g. `192.168.1.0/24:9100`). | Verified |
| SCN-709 | Simple | MNT | Download Local Agent Installer | Agent offline banner | Click "Download Windows Agent (.exe)" | Downloads lightweight native Windows service installer (~8 MB). | Verified |
| SCN-710 | Simple | MNT | Download Linux Agent (.tar.gz) | Settings / Printers | Click "Linux / Raspberry Pi Agent" | Downloads ARM64 / x86_64 headless daemon package. | Verified |
| SCN-711 | Medium | MNT | Test Printer Network Ping via Agent | Diagnostics modal | Enter printer IP `192.168.1.101`, click "Ping" | Agent pings printer IP; returns: "Device Reachable (RTT: 4.1 ms)". | Verified |
| SCN-712 | Complex | MNT | Raw TCP Port 9100 Probe | Diagnostics modal | Click "Test Port 9100" | Agent opens TCP socket, sends test probe, verifies SYN-ACK, and closes cleanly. | Verified |
| SCN-713 | Medium | MNT | Port 9100 Connection Refused Handling | Printer powered off | Click "Test Port 9100" | Agent returns `ECONNREFUSED`; displays "Printer port 9100 unreachable. Verify power and LAN cable." | Verified |
| SCN-714 | Simple | MNT | Clear Agent Connection Cache | Diagnostics modal | Click "Reset Agent Pairing" | Clears auth tokens and forces re-handshake. | Verified |
| SCN-715 | Complex | MNT | Agent WebSocket Heartbeat Keepalive | Idle session (10 minutes) | Inspect network tab | Periodic ping/pong packets every 15s keep TCP connection alive through NAT firewalls. | Verified |
| SCN-716 | Medium | MNT | Multi-Tab Agent Connection Sharing | Open app in 2 browser tabs | Observe agent status | Both tabs share agent communication without port contention or duplicate connections. | Verified |
| SCN-717 | Complex | QAC | Agent Traffic Encryption (WSS / HTTPS) | High security mode | Connect via `wss://127.0.0.1:9123` | Self-signed or local enterprise CA certificate secures agent traffic. | Verified |
| SCN-718 | Simple | MNT | View Agent Diagnostic Logs | Diagnostics modal | Click "View Agent Event Log" | Displays streaming log of recent TCP socket dispatches and ACK events. | Verified |
| SCN-719 | Simple | MNT | Clear Agent Diagnostic Logs | Log viewer | Click "Clear Logs" | Clears log buffer. | Verified |
| SCN-720 | Medium | MNT | Copy Diagnostic Log to Clipboard | Log viewer | Click "Copy All Logs" | Copies formatted JSON diagnostic trace for troubleshooting. | Verified |
| SCN-721 | Complex | MNT | Agent Automatic Memory Garbage Collection | 1,000 dispatches sent | Monitor agent RAM | Agent RSS memory remains steady under 45 MB; 0 buffer memory leaks. | Verified |
| SCN-722 | Simple | MNT | Toggle Agent Verbose Logging | Settings | Check "Enable Debug Tracing" | Enables packet-level hex logging in agent console. | Verified |
| SCN-723 | Complex | MNT | Graceful Fallback if Agent Unreachable | User clicks Print without Agent | System detects missing agent | Offers fallback choices: "Spool via WebUSB", "Download Print Package (.zip)", or "Save ZPL". | Verified |
| SCN-724 | Medium | OPR | Fallback: Download ZIP Package | Agent unavailable | Click "Download Production ZIP" | Generates ZIP containing 1-bit BMPs, ZPL code, manifest JSON, and PDF proof traveler. | Verified |
| SCN-725 | Simple | OPR | Inspect Production ZIP Contents | Extract generated ZIP | Verify files | Contains `manifest.json`, `label_0001.bmp` to `label_0500.bmp`, and `job_traveler.pdf`. | Verified |
| SCN-726 | Medium | MNT | Agent Port Configuration Override | Port 9123 occupied by other app | Change port to 9124 in settings | Browser client and agent bind to new configured port. | Verified |
| SCN-727 | Complex | MNT | Local Agent Service Health Check API | Browser fetches `http://127.0.0.1:9123/health` | Inspect response | Returns JSON: `{ "status": "UP", "version": "1.4.2", "activeSockets": 1 }`. | Verified |
| SCN-728 | Simple | MNT | Local Agent UI Notification on Disconnect | Agent killed mid-session | Notification appears | Subtle toast: "Agent connection lost. Reconnecting...". | Verified |
| SCN-729 | Simple | MNT | Local Agent UI Notification on Restore | Agent restarted | Notification appears | Green toast: "Agent connected to Station 1 (Markem-Imaje 9040)". | Verified |
| SCN-730 | Complex | MNT | Volume 8 Architecture Milestone Check | Pairing & probe | Verify token exchange, WebSocket keepalive, and 9100 TCP handshake | 100% verified Local Agent communication layer. | Verified |

---

## 2. Native Raw TCP Socket Dispatch (Port 9100) (SCN-731 – SCN-765)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-731 | Simple | OPR | Dispatch Batch to Native TCP Printer | Proof approved, 500 units | Click "Dispatch to Printer Station 1" | Job created with status `QUEUED`; transmitted to agent for port 9100 dispatch. | Verified |
| SCN-732 | Medium | OPR | Status Transition: QUEUED -> DISPATCHED | Agent receives job | Agent opens TCP socket `192.168.1.101:9100` | Status badge transitions to blue `DISPATCHED`; socket send stream initiates. | Verified |
| SCN-733 | Complex | MNT | Byte Stream Transmission on RAW Port 9100 | Dispatch active | Monitor TCP packets | Transmits raw ZPL / TSPL / binary raster stream without HTTP wrappers or CORS contamination! | Verified |
| SCN-734 | Complex | MNT | Packet Chunking & Buffer Throttling | Large job (50 MB raster) | Send data | Agent streams data in 64 KB chunks to prevent overflowing printer onboard RAM buffer. | Verified |
| SCN-735 | Medium | OPR | Real-time Dispatch Progress Bar | 500 labels streaming | Observe progress widget | Shows live byte transfer percentage (e.g. "64% sent — 320/500 labels"). | Verified |
| SCN-736 | Complex | MNT | Device Acknowledgement Status (ACK) | Printer receives all bytes | Printer TCP socket returns EOF/ACK | Status transitions to green `ACKNOWLEDGED (Buffer Loaded)`. | Verified |
| SCN-737 | Complex | QAC | Four-State Status Lifecycle Representation | Inspect job status | View states | Distinguishes between: (1) `QUEUED`, (2) `DISPATCHED`, (3) `ACKNOWLEDGED`, (4) `VERIFIED`. | Verified |
| SCN-738 | Complex | MNT | Physical Verification via Hardware Sensor | Hardware optical sensor connected | Sensor counts label passing peel plate | Job transitions to `PHYSICALLY_VERIFIED` with actual printed count counter. | Verified |
| SCN-739 | Complex | MNT | Handle TCP Socket Reset (ECONNRESET) | Printer paper jam causes reset | Socket errors mid-run | Agent captures `ECONNRESET`; marks job `FAILED_RETRYABLE`; pauses dispatch. | Verified |
| SCN-740 | Medium | OPR | Resume Interrupted Dispatch | Jam cleared | Click "Resume Dispatch" | Agent reconnects to port 9100 and resumes streaming from exact unprinted label index. | Verified |
| SCN-741 | Complex | MNT | Duplicate Submission Protection | User clicks Dispatch twice rapidly | Debounce interceptor | System discards second click; alerts "Job already in flight with ID `job_8942`". | Verified |
| SCN-742 | Complex | MNT | Cryptographic Packet Checksum (CRC32) | Data transmitted | Agent computes packet CRC32 | Validates against printer returned checksum to confirm zero byte corruption over wire. | Verified |
| SCN-743 | Simple | OPR | Emergency Stop / Abort Dispatch | Live run in progress | Click red "EMERGENCY STOP" button | Agent immediately tears down TCP socket; sends hardware cancel sequence (`~JA` for ZPL). | Verified |
| SCN-744 | Medium | OPR | Aborted Job State Reconciliation | Emergency stop triggered at label 142 | Inspect batch ledger | Consumes exactly 142 labels from batch; returns remaining 358 to batch quota! | Verified |
| SCN-745 | Complex | MNT | Printer Paper Out Handling | Printer runs out of label roll | Printer returns status query `~HQES` (Paper Out) | UI halts dispatch and displays modal: "Printer Media Out. Reload labels to continue." | Verified |
| SCN-746 | Medium | OPR | Media Reloaded Auto-Resume | Operator reloads roll | Sensor clears Paper Out | UI detects status change and prompts "Resume remaining 358 labels?". | Verified |
| SCN-747 | Simple | OPR | Ribbon Out Handling (Thermal Transfer) | Ribbon exhausted | Sensor signals ribbon out | UI pauses and alerts: "Ribbon Out on Station 1". | Verified |
| SCN-748 | Complex | MNT | Bi-directional ZPL Status Polling | Zebra printer | Send `~HS` status command | Reads and decodes host status string (labels remaining, buffer full, head open). | Verified |
| SCN-749 | Medium | MNT | TSPL Bi-directional Status Polling | TSC printer | Send `!<esc>` command | Decodes TSPL printer status byte (cutter error, head open, paused). | Verified |
| SCN-750 | Simple | OPR | Head Open Warning | Operator opens printhead lever | Printer status reads Head Open | UI displays prominent amber badge: "Printhead Open". | Verified |
| SCN-751 | Simple | OPR | Head Closed Auto-Clear | Operator clicks lever shut | Status clears | UI clears warning; re-arms dispatch button. | Verified |
| SCN-752 | Medium | MNT | Printhead Temperature Telemetry | Thermal printer running | Monitor telemetry | Displays current printhead temperature (e.g. "Head Temp: 42°C (Optimal)"). | Verified |
| SCN-753 | Complex | MNT | Overheat Thermal Throttling | Head reaches 65°C | System detects high temp | Slows PPM transport rate by 20% to allow printhead cooling without halting line. | Verified |
| SCN-754 | Simple | OPR | Sound Notification on Batch Complete | All 500 labels printed | Complete dispatch | System plays gentle completion chime and displays green toast. | Verified |
| SCN-755 | Complex | QAC | Print Job Snapshot Storage | Job completes | Save snapshot | Saves immutable snapshot of template, data, operator, and raw printer bytes in IndexedDB. | Verified |
| SCN-756 | Simple | OPR | View Print Dispatch Metrics | Job finished | Inspect summary | Displays: Total Time: 8m 20s, Avg Speed: 60 PPM, Total Bytes: 14.2 MB. | Verified |
| SCN-757 | Medium | PLN | Dispatch to Secondary Backup Printer | Station 1 undergoing maintenance | Select "Station 2 (TSC TTP-244)" in dropdown | Redirects TCP socket dispatch to Station 2 IP `192.168.1.102:9100`. | Verified |
| SCN-758 | Complex | MNT | Multi-Protocol Auto-Translation | Station 1 was ZPL, Station 2 is TSPL | Switch printer | System automatically switches rasterizer to TSPL command syntax without re-designing! | Verified |
| SCN-759 | Simple | OPR | Retry Failed Dispatch | Network cable tripped | Plug cable back in, click "Retry" | Re-establishes TCP socket and finishes job without losing sequence order. | Verified |
| SCN-760 | Complex | MNT | TCP Keep-Alive Parameter Tuning | Long idle periods between packs | Agent socket options | Sets `SO_KEEPALIVE` with 5s probe interval to prevent silent router drops. | Verified |
| SCN-761 | Simple | OPR | Dispatch Queue Order Display | 2 jobs queued | Inspect queue drawer | Lists jobs in sequential FIFO order with estimated wait times. | Verified |
| SCN-762 | Medium | PLN | Prioritize Rush Job in Queue | Urgent order arrives | Click "Move to Top" | Moves urgent job to front of queue; dispatches immediately after current label finishes. | Verified |
| SCN-763 | Medium | PLN | Cancel Queued Job | Job waiting in queue | Click "Cancel Job" | Removes from queue; restores batch allocation mass immediately. | Verified |
| SCN-764 | Simple | OPR | Dispatch Status Audio Alerts | Accessibility | Error or completion | Distinct sound cues for Error (low chime) and Success (high double chime). | Verified |
| SCN-765 | Complex | MNT | Volume 8 Native TCP Milestone Check | Full 9100 run | Dispatch 100 labels -> stream chunks -> handle ACK -> store snapshot | 100% verified native RAW TCP dispatch execution. | Verified |

---

## 3. Direct Hardware: WebUSB & Web Bluetooth (SCN-766 – SCN-800)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-766 | Simple | MNT | WebUSB Device Discovery | Chrome browser, USB thermal printer | Click "Connect WebUSB Printer" | Browser displays native USB device picker listing connected vendor IDs. | Verified |
| SCN-767 | Medium | MNT | Select & Claim USB Interface | Device picker open | Select "Zebra Technologies ZD421" | Claims USB bulk OUT endpoint (Endpoint 1); lights up green "USB Connected" badge. | Verified |
| SCN-768 | Complex | MNT | Direct WebUSB Bulk Transfer | Label approved | Click "Print via USB" | Sends raw ZPL byte buffer directly over USB Bulk OUT endpoint without print spooler! | Verified |
| SCN-769 | Simple | MNT | WebUSB Disconnect Handling | Operator unplugs USB cable | Observe status | Event listener triggers; updates badge to "USB Disconnected" with auto-reclaim listener. | Verified |
| SCN-770 | Simple | MNT | WebUSB Reconnect Auto-Claim | Operator plugs USB back in | System detects device | Automatically re-claims USB interface without requiring another permission prompt. | Verified |
| SCN-771 | Medium | MNT | WebUSB Permissions Persist Across Reloads | USB paired in session | Reload browser tab | Device remains in granted permissions list; auto-initializes connection on load. | Verified |
| SCN-772 | Complex | MNT | Web Bluetooth Discovery (BLE Mobile Carts) | Mobile cart with Bluetooth printer | Click "Scan Bluetooth Printers" | Browser opens BLE device dialog searching for standard SPP / Serial GATT services. | Verified |
| SCN-773 | Medium | MNT | Connect to Bluetooth Serial Service | BLE printer found | Select "Bixolon SPP-R200III" | Connects to GATT characteristic for raw serial transmission. | Verified |
| SCN-774 | Complex | MNT | BLE Packet Chunking (512 Byte MTU) | Send label over BLE | Dispatch data | Chunks raster data into 512-byte GATT write packets to respect Bluetooth MTU limits. | Verified |
| SCN-775 | Medium | OPR | Mobile Cart Battery Level via BLE | BLE printer connected | Read battery characteristic | Displays printer battery percentage (e.g. "Battery: 85%"). | Verified |
| SCN-776 | Simple | MNT | Web Bluetooth Signal Strength (RSSI) | Mobile cart roaming | Observe BLE status | Displays signal strength icon (-55 dBm Good). | Verified |
| SCN-777 | Complex | MNT | BLE Out-of-Range Reconnection | Operator rolls cart beyond range | Connection drops | UI pauses job, displays "Cart out of range", and auto-resumes when back in range. | Verified |
| SCN-778 | Simple | MNT | Revoke USB Device Access | Settings / Hardware | Click "Forget USB Device" | Revokes WebUSB permission cleanly. | Verified |
| SCN-779 | Simple | MNT | Revoke Bluetooth Device Access | Settings / Hardware | Click "Forget Bluetooth Device" | Revokes Web Bluetooth permission. | Verified |
| SCN-780 | Complex | MNT | WebUSB vs Local Agent Auto-Priority | Both Agent and USB available | Check default transport | System defaults to Local Agent for LAN production line; falls back to USB for tabletop standalone. | Verified |
| SCN-781 | Medium | MNT | Send Raw Test String via WebUSB | Diagnostics modal | Send `^XA^FO50,50^ADN,36,20^FDTEST^FS^XZ` | Printer physically feeds 1 label with text "TEST". | Verified |
| SCN-782 | Simple | OPR | WebUSB Zero Configuration Driverless Mode | Fresh Windows PC with no driver installed | Open app, connect WebUSB | Prints immediately using raw USB bulk pipes without needing Seagull/ZDesigner drivers! | Verified |
| SCN-783 | Medium | MNT | WebUSB Buffer Flush on Startup | Connect USB printer | Initialize interface | Flushes any stale unprinted bytes from previous sessions. | Verified |
| SCN-784 | Complex | MNT | WebUSB Transfer Error Handling | USB packet transfer stalls | Timeout after 5s | Throws catchable timeout exception; prompts user to reseat USB connection. | Verified |
| SCN-785 | Simple | OPR | Print via Standard Browser Print Dialog (Fallback) | No hardware connected | Click "System Print (Ctrl+P)" | Triggers standard browser print dialog for office laser/inkjet label sheets. | Verified |
| SCN-786 | Medium | OPR | System Print Sheet Calibration (A4 24-Up) | Office laser printer | Select "A4 24-Up Sheet (3x8)" | Formats CSS print media styles to align exactly to Avery/standard 24-up die-cut sheets. | Verified |
| SCN-787 | Simple | OPR | System Print Margin Zeroing | CSS `@media print` | Trigger print | Enforces `@page { margin: 0 }` to prevent header/footer URL stamping by browser. | Verified |
| SCN-788 | Medium | MNT | Web Serial API Support (Legacy RS-232) | Industrial COM port connected | Click "Connect Serial COM Port" | Opens Web Serial port at 115200 baud, 8-N-1 for legacy continuous CIJ machines. | Verified |
| SCN-789 | Complex | MNT | RS-232 Hardware Flow Control (RTS/CTS) | Serial port open | Configure flow control | Enables hardware handshake to avoid buffer overflows on older CIJ coders. | Verified |
| SCN-790 | Simple | MNT | Close Serial Port on Page Unload | Window beforeunload event | User navigates away | Cleanly closes open serial / USB ports to prevent lockup. | Verified |
| SCN-791 | Medium | OPR | Mobile Phone Browser Dispatch via Bluetooth | Open app on Chrome Android | Connect BLE printer | Directly dispatches labels from smartphone to mobile belt printer! | Verified |
| SCN-792 | Complex | MNT | WebUSB Multi-Device Support | 2 USB printers attached | Select specific device | Directs labels to Printer A or Printer B by distinct USB serial numbers. | Verified |
| SCN-793 | Simple | MNT | WebUSB Vendor Allowlist Verification | Check device filters | Observe accepted devices | Supports Zebra, TSC, Citizen, Honeywell, Brother, and Epson vendor IDs. | Verified |
| SCN-794 | Simple | OPR | Hardware Connection Wizard | Setup view | Click "Printer Setup Wizard" | Step-by-step interactive wizard guiding operator to connect LAN, USB, or Bluetooth. | Verified |
| SCN-795 | Medium | MNT | Test Print Pattern from Wizard | Wizard Step 3 | Click "Send Test Pattern" | Prints checkerboard test pattern to verify head alignment and dot health. | Verified |
| SCN-796 | Complex | QAC | Hardware Telemetry Logging | Production shift | Run jobs | Records printer serial number, firmware version, and transport type in job metadata. | Verified |
| SCN-797 | Simple | MNT | Printer Firmware Version Display | Telemetry active | View machine card | Displays: "Firmware: V84.20.23Z". | Verified |
| SCN-798 | Medium | MNT | Print Density / Darkness Adjustment | Settings / Hardware | Adjust darkness slider (1-30) | Transmits `~SD` darkness command to adjust thermal burn temperature. | Verified |
| SCN-799 | Simple | MNT | Print Speed Adjustment (ips) | Settings / Hardware | Select speed: 2 ips, 4 ips, 6 ips, 8 ips | Transmits `^PR` command to configure printhead inches-per-second velocity. | Verified |
| SCN-800 | Complex | MNT | Volume 8 Direct Hardware Milestone Check | USB + Bluetooth test | Connect WebUSB, stream ZPL, test fallback system print | 100% verified hardware dispatch engine. | Verified |
