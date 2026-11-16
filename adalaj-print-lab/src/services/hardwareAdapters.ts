/**
 * Direct Hardware Communication Adapters
 * Implements direct hardware communication via WebUSB, Web Bluetooth, and Network TCP/IP sockets
 * for continuous inkjet (CIJ), thermal inkjet (TIJ), and industrial marking controllers.
 */

export type HardwareTransportType = 'usb_drive' | 'webusb' | 'bluetooth' | 'webserial' | 'network_socket';

// Ambient definitions for WebUSB and Web Bluetooth
interface USBDevice {
  opened: boolean;
  configuration: any;
  vendorId: number;
  productId: number;
  manufacturerName?: string;
  productName?: string;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<{ status: string; bytesWritten: number }>;
}

interface BluetoothRemoteGATTCharacteristic {
  properties: {
    write?: boolean;
    writeWithoutResponse?: boolean;
  };
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
}

interface BluetoothDevice {
  name?: string;
  gatt?: {
    connected: boolean;
    connect(): Promise<{
      getPrimaryServices(): Promise<Array<{
        getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
      }>>;
    }>;
    disconnect(): void;
  };
}

export interface HardwareConnectionStatus {
  type: HardwareTransportType;
  isConnected: boolean;
  deviceName?: string;
  details?: string;
  lastError?: string;
}

export interface HardwareLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'tx' | 'rx';
  message: string;
}

export type HardwareLogListener = (log: HardwareLogEntry) => void;

class HardwareManager {
  private logListeners: Set<HardwareLogListener> = new Set();
  private logs: HardwareLogEntry[] = [];

  // WebUSB device reference
  private usbDevice: USBDevice | null = null;
  private usbEndpointOut: number = 1;

  // Web Bluetooth reference
  private btDevice: BluetoothDevice | null = null;
  private btCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private btDeviceName: string = '';
  private btExplicitDisconnect: boolean = false;

  // Network printer config
  private networkConfig = {
    ip: '192.168.1.100',
    port: 9100,
    timeoutMs: 5000
  };

  constructor() {
    this.addLog('info', 'Hardware Communication Manager initialized. Ready for WebUSB, Bluetooth, Network Socket, and USB Drive.');
  }

  public subscribeLogs(listener: HardwareLogListener): () => void {
    this.logListeners.add(listener);
    return () => this.logListeners.delete(listener);
  }

  public getLogs(): HardwareLogEntry[] {
    return [...this.logs];
  }

  private addLog(type: HardwareLogEntry['type'], message: string) {
    const entry: HardwareLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message
    };
    this.logs.unshift(entry);
    if (this.logs.length > 100) this.logs.pop();
    this.logListeners.forEach(fn => fn(entry));
  }

  // --- 1. WebUSB Adapter ---
  public isWebUsbSupported(): boolean {
    return typeof navigator !== 'undefined' && 'usb' in navigator;
  }

  public async connectWebUsb(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (!this.isWebUsbSupported()) {
      const err = 'WebUSB API is not supported in this browser. Please use Chrome or Edge with HTTPS.';
      this.addLog('error', err);
      return { success: false, error: err };
    }

    try {
      this.addLog('info', 'Opening browser WebUSB device picker...');
      // Request device without vendor filters to allow any industrial TIJ/CIJ/FTDI controller
      const device = await (navigator as any).usb.requestDevice({ filters: [] });
      if (!device) throw new Error('No USB device selected');

      await device.open();
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      await device.claimInterface(0);

      this.usbDevice = device;
      const deviceName = `${device.manufacturerName || 'Industrial'} ${device.productName || 'USB Printer'}`;
      this.addLog('success', `WebUSB connected: ${deviceName} (Vendor ID: 0x${device.vendorId.toString(16)}, Product ID: 0x${device.productId.toString(16)})`);

      return { success: true, deviceName };
    } catch (err: any) {
      const msg = err.message || 'WebUSB connection was cancelled or failed';
      this.addLog('error', `WebUSB error: ${msg}`);
      return { success: false, error: msg };
    }
  }

  public async sendViaWebUsb(buffer: ArrayBuffer): Promise<{ success: boolean; bytesWritten: number; error?: string }> {
    if (!this.usbDevice || !this.usbDevice.opened) {
      const err = 'No WebUSB printer is currently connected. Click "Connect USB Printer" first.';
      this.addLog('error', err);
      return { success: false, bytesWritten: 0, error: err };
    }

    try {
      this.addLog('tx', `Sending ${buffer.byteLength} bytes binary payload via WebUSB (Endpoint: ${this.usbEndpointOut})...`);
      const result = await this.usbDevice.transferOut(this.usbEndpointOut, buffer);
      if (result.status === 'ok') {
        this.addLog('success', `WebUSB transmission complete: ${result.bytesWritten} bytes sent successfully.`);
        return { success: true, bytesWritten: result.bytesWritten };
      } else {
        throw new Error(`USB transfer returned status: ${result.status}`);
      }
    } catch (err: any) {
      this.addLog('error', `WebUSB write failed: ${err.message}`);
      return { success: false, bytesWritten: 0, error: err.message };
    }
  }

  public async disconnectWebUsb() {
    if (this.usbDevice && this.usbDevice.opened) {
      await this.usbDevice.close();
      this.addLog('info', 'WebUSB printer disconnected.');
      this.usbDevice = null;
    }
  }

  // --- 2. Web Bluetooth Adapter ---
  public onDisconnectCallback: (() => void) | null = null;
  public setOnDisconnect(cb: () => void) {
    this.onDisconnectCallback = cb;
  }

  public isBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public async connectBluetooth(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (!this.isBluetoothSupported()) {
      const err = 'Web Bluetooth API is not supported in this browser. Please use Chrome or Edge with HTTPS.';
      this.addLog('error', err);
      return { success: false, error: err };
    }

    const BLUETOOTH_PRINTER_SERVICES = [
      '000018f0-0000-1000-8000-00805f9b34fb', // Standard Printer Service
      '0000ffe0-0000-1000-8000-00805f9b34fb', // TI CC2540 / HM-10 / TransSerial (Most Common for TIJ/POS)
      '0000ffe1-0000-1000-8000-00805f9b34fb', // HM-10 alternate
      '0000fff0-0000-1000-8000-00805f9b34fb', // FFF0 Generic Chinese Printer Service
      '0000fee7-0000-1000-8000-00805f9b34fb', // Tencent / POS Printer
      '0000ff00-0000-1000-8000-00805f9b34fb', // FF00 Custom Serial
      '0000af30-0000-1000-8000-00805f9b34fb', // Paperang / Mini Printer
      '0000ae30-0000-1000-8000-00805f9b34fb', // Mini Pocket Printer
      '0000e781-0000-1000-8000-00805f9b34fb', // UART
      '00001101-0000-1000-8000-00805f9b34fb', // Serial Port Profile (SPP)
      '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
      '00001801-0000-1000-8000-00805f9b34fb', // Generic Attribute
      '0000180a-0000-1000-8000-00805f9b34fb', // Device Information Service
      '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service (standard)
      'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Nordic UART Service alternate
      '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Service
      '0003cbbb-0000-1000-8000-008025000000',
      '2456e1b9-26e2-8f83-e744-f34f01e9d701'
    ];

    try {
      this.addLog('info', 'Scanning for nearby Bluetooth handheld printers...');
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          ...BLUETOOTH_PRINTER_SERVICES,
          0x18f0,
          0xffe0,
          0xffe1,
          0xfff0,
          0xfee7,
          0xff00,
          0x180a,
          0x1800,
          0x1801
        ]
      });

      const deviceName = device.name || 'R2D2-SX100 Handheld';
      this.addLog('info', `Paired with ${deviceName}. Connecting GATT server...`);
      
      let server: any = null;
      try {
        server = await device.gatt.connect();
      } catch (gattErr: any) {
        this.addLog('warning', `GATT connection warning: ${gattErr.message}. Device handle retained.`);
      }

      this.btDevice = device;
      this.btDeviceName = deviceName;
      this.btExplicitDisconnect = false;

      device.addEventListener('gattserverdisconnected', () => {
        if (this.btExplicitDisconnect) {
          this.addLog('info', `Bluetooth device "${deviceName}" disconnected.`);
          this.btDevice = null;
          this.btCharacteristic = null;
          this.btDeviceName = '';
          if (this.onDisconnectCallback) this.onDisconnectCallback();
        } else {
          this.addLog('info', `Bluetooth GATT stream for "${deviceName}" cycled into standby. Retaining device.`);
        }
      });

      let writeChar: BluetoothRemoteGATTCharacteristic | null = null;

      if (server) {
        try {
          const services = await server.getPrimaryServices();
          for (const service of services) {
            try {
              const characteristics = await service.getCharacteristics();
              for (const char of characteristics) {
                if (char.properties.write || char.properties.writeWithoutResponse) {
                  writeChar = char;
                  this.addLog('info', `Found writable GATT characteristic: ${char.uuid}`);
                  break;
                }
              }
            } catch {
              // continue
            }
            if (writeChar) break;
          }
        } catch {
          for (const uuid of BLUETOOTH_PRINTER_SERVICES) {
            try {
              const service = await server.getPrimaryService(uuid);
              const characteristics = await service.getCharacteristics();
              for (const char of characteristics) {
                if (char.properties.write || char.properties.writeWithoutResponse) {
                  writeChar = char;
                  this.addLog('info', `Found writable characteristic on service ${uuid}`);
                  break;
                }
              }
              if (writeChar) break;
            } catch {
              // continue
            }
          }
        }
      }

      this.btCharacteristic = writeChar;
      this.addLog('success', `✓ Bluetooth connected: ${deviceName}${writeChar ? ' (Ready to Print)' : ' (GATT Paired)'}`);

      return { success: true, deviceName };
    } catch (err: any) {
      const msg = err.name === 'NotFoundError' || err.message?.includes('User cancelled')
        ? 'Bluetooth pairing was cancelled by user. Please select your R2D2-SX100 printer from the dialog.'
        : err.message || 'Bluetooth pairing failed';
      this.addLog('error', `Bluetooth error: ${msg}`);
      return { success: false, error: msg };
    }
  }

  public async sendViaBluetooth(buffer: ArrayBuffer): Promise<{ success: boolean; bytesWritten: number; error?: string }> {
    if (!this.btDevice) {
      const err = 'No Bluetooth printer is currently connected. Click "Connect Device" first.';
      this.addLog('error', err);
      return { success: false, bytesWritten: 0, error: err };
    }

    // Auto-reconnect GATT server if link cycled or went into sleep/standby
    if (!this.btDevice.gatt?.connected) {
      try {
        this.addLog('info', `Re-establishing GATT stream with ${this.btDeviceName || 'printer'}...`);
        await this.btDevice.gatt?.connect();
      } catch (reconnectErr: any) {
        this.addLog('warning', `GATT auto-reconnect note: ${reconnectErr.message}`);
      }
    }

    if (!this.btCharacteristic) {
      try {
        const server = this.btDevice.gatt as any;
        const BLUETOOTH_PRINTER_SERVICES = [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000ffe0-0000-1000-8000-00805f9b34fb',
          '0000ffe1-0000-1000-8000-00805f9b34fb',
          '0000fff0-0000-1000-8000-00805f9b34fb',
          '0000fee7-0000-1000-8000-00805f9b34fb',
          '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455'
        ];
        for (const uuid of BLUETOOTH_PRINTER_SERVICES) {
          try {
            const service = await server.getPrimaryService(uuid);
            const characteristics = await service.getCharacteristics();
            for (const char of characteristics) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                this.btCharacteristic = char;
                break;
              }
            }
            if (this.btCharacteristic) break;
          } catch {
            // continue
          }
        }
      } catch {
        // continue
      }
    }

    if (!this.btCharacteristic) {
      const err = `Device "${this.btDeviceName || 'R2D2-SX100'}" is paired, but no writable BLE GATT printer characteristic was exposed. For Windows handheld TIJ printers, Windows uses virtual COM ports (SPP). Please select "Web Serial / COM" above to transmit directly via COM port @ 115200 baud.`;
      this.addLog('error', err);
      return { success: false, bytesWritten: 0, error: err };
    }

    try {
      this.addLog('tx', `Transmitting ${buffer.byteLength} bytes over Bluetooth in 512-byte packets...`);
      const chunkSize = 512;
      const uint8 = new Uint8Array(buffer);
      let offset = 0;

      while (offset < uint8.length) {
        const chunk = uint8.slice(offset, offset + chunkSize);
        if (this.btCharacteristic.properties.writeWithoutResponse) {
          await this.btCharacteristic.writeValueWithoutResponse(chunk);
        } else {
          await this.btCharacteristic.writeValue(chunk);
        }
        offset += chunk.length;
      }

      this.addLog('success', `Bluetooth transmission complete: ${buffer.byteLength} bytes delivered to printer.`);
      return { success: true, bytesWritten: buffer.byteLength };
    } catch (err: any) {
      this.addLog('error', `Bluetooth transmission failed: ${err.message}`);
      return { success: false, bytesWritten: 0, error: err.message };
    }
  }

  public async disconnectBluetooth() {
    this.btExplicitDisconnect = true;
    if (this.btDevice) {
      try {
        if (this.btDevice.gatt?.connected) {
          this.btDevice.gatt.disconnect();
        }
      } catch {
        // ignore
      }
      this.addLog('info', 'Bluetooth printer disconnected.');
      this.btDevice = null;
      this.btCharacteristic = null;
      this.btDeviceName = '';
      if (this.onDisconnectCallback) this.onDisconnectCallback();
    }
  }

  // --- 3. Web Serial Adapter (Bluetooth COM / USB Serial) ---
  private serialPort: any = null;

  public isSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public async connectSerial(baudRate = 115200): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (!this.isSerialSupported()) {
      const err = 'Web Serial API is not supported in this browser. Please use Chrome or Edge.';
      this.addLog('error', err);
      return { success: false, error: err };
    }

    try {
      this.addLog('info', 'Requesting Web Serial port (USB/Bluetooth COM port)...');
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate });
      this.serialPort = port;
      const info = port.getInfo ? port.getInfo() : {};
      const deviceName = info.usbVendorId ? `Serial Device (VID: 0x${info.usbVendorId.toString(16)})` : 'Serial / Bluetooth COM Port';
      this.addLog('success', `✓ Web Serial connected: ${deviceName} @ ${baudRate} baud`);
      return { success: true, deviceName };
    } catch (err: any) {
      const msg = err.message || 'Serial connection cancelled or failed';
      this.addLog('error', `Serial error: ${msg}`);
      return { success: false, error: msg };
    }
  }

  public async disconnectSerial() {
    if (this.serialPort) {
      try {
        await this.serialPort.close();
      } catch {
        // ignore
      }
      this.serialPort = null;
      this.addLog('info', 'Serial port disconnected.');
    }
  }

  public async sendViaSerial(buffer: ArrayBuffer): Promise<{ success: boolean; bytesWritten: number; error?: string }> {
    if (!this.serialPort || !this.serialPort.writable) {
      const err = 'No Serial port is currently connected. Click "Connect Device" first.';
      this.addLog('error', err);
      return { success: false, bytesWritten: 0, error: err };
    }

    try {
      const writer = this.serialPort.writable.getWriter();
      await writer.write(new Uint8Array(buffer));
      writer.releaseLock();
      this.addLog('success', `Serial transmission complete: ${buffer.byteLength} bytes delivered to printer.`);
      return { success: true, bytesWritten: buffer.byteLength };
    } catch (err: any) {
      this.addLog('error', `Serial transmission failed: ${err.message}`);
      return { success: false, bytesWritten: 0, error: err.message };
    }
  }

  // --- 3. Network Socket / Raw TCP / IP Printer Adapter ---
  public getNetworkConfig() {
    return { ...this.networkConfig };
  }

  public setNetworkConfig(config: Partial<typeof this.networkConfig>) {
    this.networkConfig = { ...this.networkConfig, ...config };
    this.addLog('info', `Network socket target updated to: ${this.networkConfig.ip}:${this.networkConfig.port}`);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  }

  public async checkAgentStatus(): Promise<{ online: boolean; version?: string; error?: string }> {
    try {
      const res = await fetch('http://127.0.0.1:9123/api/status');
      if (res.ok) {
        const data = await res.json();
        return { online: true, version: data.version };
      }
      return { online: false, error: `Agent responded with HTTP ${res.status}` };
    } catch (err: any) {
      return { online: false, error: err.message || 'Local Print Agent is offline' };
    }
  }

  public async testNetworkPrinter(host?: string, port?: number): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
    const targetHost = host || this.networkConfig.ip;
    const targetPort = port || this.networkConfig.port;
    try {
      const res = await fetch('http://127.0.0.1:9123/api/printers/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: targetHost, port: targetPort, timeoutMs: 3000 })
      });
      if (res.ok) {
        return await res.json();
      }
      return { success: false, error: `Agent HTTP ${res.status} error` };
    } catch (err: any) {
      return {
        success: false,
        error: `Could not reach Local Print Agent on port 9123. Ensure 'pnpm run agent' is running. (${err.message})`
      };
    }
  }

  public async sendViaNetworkSocket(
    buffer: ArrayBuffer,
    explicitJobId?: string
  ): Promise<{ success: boolean; bytesWritten: number; error?: string; status?: string }> {
    const { ip, port } = this.networkConfig;
    const jobId = explicitJobId || `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.addLog('tx', `Dispatching ${buffer.byteLength} bytes to industrial printer at ${ip}:${port} via Local Print Agent (Job ID: ${jobId})...`);

    try {
      const rawBase64 = this.arrayBufferToBase64(buffer);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.networkConfig.timeoutMs + 2000);

      const response = await fetch('http://127.0.0.1:9123/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jobId,
          printerHost: ip,
          printerPort: port,
          rawBase64,
          timeoutMs: this.networkConfig.timeoutMs
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Agent rejected job (HTTP ${response.status}): ${errText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Agent reported TCP transmission failure');
      }

      const bytesDelivered = result.bytesWritten || buffer.byteLength;
      this.addLog('success', `Native TCP socket packet delivered via Local Print Agent to ${ip}:${port} (${bytesDelivered} bytes). Status: ${result.status || 'acknowledged'}`);
      return { success: true, bytesWritten: bytesDelivered, status: result.status };
    } catch (err: any) {
      const isAgentOffline = err.message && (err.message.includes('fetch') || err.message.includes('Failed to fetch') || err.message.includes('ECONNREFUSED') || err.name === 'TypeError');
      const msg = isAgentOffline
        ? `Local Print Agent is offline on http://127.0.0.1:9123. Direct raw TCP socket printing (port ${port}) requires the local print agent bridge. Run 'pnpm run agent' to start it.`
        : `Network socket transmission to ${ip}:${port} failed: ${err.message}`;
      
      this.addLog('error', msg);
      // P0-01/PR-01/PR-02: Never return success on adapter failure or timeout!
      return { success: false, bytesWritten: 0, error: msg };
    }
  }

  // Unified Print Dispatcher
  public async dispatchPrintJob(
    transport: HardwareTransportType,
    bmpBlob: Blob,
    jobId?: string
  ): Promise<{ success: boolean; bytesWritten: number; message: string; status?: string }> {
    const buffer = await bmpBlob.arrayBuffer();

    if (transport === 'webusb') {
      const res = await this.sendViaWebUsb(buffer);
      return {
        success: res.success,
        bytesWritten: res.bytesWritten,
        message: res.success ? `Direct WebUSB transmission of ${res.bytesWritten} bytes succeeded.` : res.error || 'WebUSB error'
      };
    } else if (transport === 'bluetooth') {
      const res = await this.sendViaBluetooth(buffer);
      return {
        success: res.success,
        bytesWritten: res.bytesWritten,
        message: res.success ? `Bluetooth wireless transmission of ${res.bytesWritten} bytes succeeded.` : res.error || 'Bluetooth error'
      };
    } else if (transport === 'webserial') {
      const res = await this.sendViaSerial(buffer);
      return {
        success: res.success,
        bytesWritten: res.bytesWritten,
        message: res.success ? `Web Serial COM transmission of ${res.bytesWritten} bytes succeeded.` : res.error || 'Serial error'
      };
    } else if (transport === 'network_socket') {
      const res = await this.sendViaNetworkSocket(buffer, jobId);
      return {
        success: res.success,
        bytesWritten: res.bytesWritten,
        status: res.status,
        message: res.success
          ? `Network transmission dispatched to ${this.networkConfig.ip}:${this.networkConfig.port} via Local Print Agent (${res.bytesWritten} bytes).`
          : `Network transmission failed: ${res.error || 'Connection error'}`
      };
    } else {
      return {
        success: true,
        bytesWritten: buffer.byteLength,
        status: 'device_acknowledged',
        message: 'USB Drive file ready for FAT32 export (offline file preparation).'
      };
    }
  }
}

export const hardwareManager = new HardwareManager();
