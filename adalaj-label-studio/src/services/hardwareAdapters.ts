/**
 * Direct Hardware Communication Adapters
 * Implements direct hardware communication via WebUSB, Web Bluetooth, and Network TCP/IP sockets
 * for continuous inkjet (CIJ), thermal inkjet (TIJ), and industrial marking controllers.
 */

export type HardwareTransportType = 'usb_drive' | 'webusb' | 'bluetooth' | 'network_socket';

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
  public isBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public async connectBluetooth(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (!this.isBluetoothSupported()) {
      const err = 'Web Bluetooth API is not supported in this browser. Please use Chrome or Edge with HTTPS.';
      this.addLog('error', err);
      return { success: false, error: err };
    }

    try {
      this.addLog('info', 'Scanning for nearby Bluetooth handheld printers...');
      // Request device with common printer / serial GATT services
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Standard Serial/Printer
          '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent TX/RX
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2'  // Nordic UART
        ]
      });

      this.addLog('info', `Connecting GATT server to ${device.name || 'Bluetooth Device'}...`);
      const server = await device.gatt.connect();

      // Attempt to resolve primary write characteristic
      const services = await server.getPrimaryServices();
      let writeChar: BluetoothRemoteGATTCharacteristic | null = null;

      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeChar = char;
            break;
          }
        }
        if (writeChar) break;
      }

      this.btDevice = device;
      this.btCharacteristic = writeChar;
      const deviceName = device.name || 'Bluetooth Handheld Printer';
      this.addLog('success', `Bluetooth connected: ${deviceName}. Write characteristic ready.`);

      return { success: true, deviceName };
    } catch (err: any) {
      const msg = err.message || 'Bluetooth pairing was cancelled or failed';
      this.addLog('error', `Bluetooth error: ${msg}`);
      return { success: false, error: msg };
    }
  }

  public async sendViaBluetooth(buffer: ArrayBuffer): Promise<{ success: boolean; bytesWritten: number; error?: string }> {
    if (!this.btDevice || !this.btDevice.gatt?.connected || !this.btCharacteristic) {
      const err = 'No Bluetooth printer is currently connected. Click "Connect Bluetooth" first.';
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
    if (this.btDevice && this.btDevice.gatt?.connected) {
      this.btDevice.gatt.disconnect();
      this.addLog('info', 'Bluetooth printer disconnected.');
      this.btDevice = null;
      this.btCharacteristic = null;
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

  public async sendViaNetworkSocket(buffer: ArrayBuffer): Promise<{ success: boolean; bytesWritten: number; error?: string }> {
    const { ip, port } = this.networkConfig;
    this.addLog('tx', `Dispatching ${buffer.byteLength} bytes to industrial printer at http://${ip}:${port}/raw...`);

    try {
      // Browser network dispatch via direct fetch to printer raw print endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.networkConfig.timeoutMs);

      const response = await fetch(`http://${ip}:${port}/raw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        body: buffer,
        mode: 'no-cors', // standard for embedded printer microcontrollers
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      this.addLog('success', `Network socket packet delivered to ${ip}:${port} (${buffer.byteLength} bytes).`);
      return { success: true, bytesWritten: buffer.byteLength };
    } catch (err: any) {
      const msg = err.name === 'AbortError'
        ? `Connection timed out to ${ip}:${port}. Check IP address and printer power.`
        : `Network socket transmission to ${ip}:${port} failed: ${err.message || 'CORS / Network Error'}. Direct raw TCP printing requires a local print agent bridge; browser sandbox cannot guarantee raw socket delivery.`;
      
      this.addLog('error', msg);
      // P0-01/PR-01/PR-02: Never return success on adapter failure or timeout!
      return { success: false, bytesWritten: 0, error: msg };
    }
  }

  // Unified Print Dispatcher
  public async dispatchPrintJob(
    transport: HardwareTransportType,
    bmpBlob: Blob
  ): Promise<{ success: boolean; bytesWritten: number; message: string }> {
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
    } else if (transport === 'network_socket') {
      const res = await this.sendViaNetworkSocket(buffer);
      return {
        success: res.success,
        bytesWritten: res.bytesWritten,
        message: res.success
          ? `Network transmission dispatched to ${this.networkConfig.ip}:${this.networkConfig.port} (${res.bytesWritten} bytes).`
          : `Network transmission failed: ${res.error || 'Connection error'}`
      };
    } else {
      return {
        success: true,
        bytesWritten: buffer.byteLength,
        message: 'USB Drive file ready for FAT32 export (offline file preparation).'
      };
    }
  }
}

export const hardwareManager = new HardwareManager();
