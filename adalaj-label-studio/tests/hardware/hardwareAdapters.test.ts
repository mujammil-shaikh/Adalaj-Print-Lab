import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hardwareManager } from '../../src/services/hardwareAdapters';

describe('Hardware Adapter Truth (P0-01, PR-01, PR-02, PR-03, E2E-09)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('never returns success on network socket connection failure or timeout', async () => {
    // Mock fetch to simulate network timeout / CORS rejection
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch (CORS / Network Error)')));

    const dummyBlob = new Blob([new Uint8Array([0x42, 0x4d])], { type: 'image/bmp' });
    const result = await hardwareManager.dispatchPrintJob('network_socket', dummyBlob);

    expect(result.success).toBe(false);
    expect(result.bytesWritten).toBe(0);
    expect(result.message).toContain('failed');
  });

  it('never returns success when WebUSB device is not connected', async () => {
    const dummyBlob = new Blob([new Uint8Array([0x42, 0x4d])], { type: 'image/bmp' });
    const result = await hardwareManager.dispatchPrintJob('webusb', dummyBlob);

    expect(result.success).toBe(false);
    expect(result.bytesWritten).toBe(0);
    expect(result.message).toContain('No WebUSB printer is currently connected');
  });

  it('never returns success when Bluetooth device is not connected', async () => {
    const dummyBlob = new Blob([new Uint8Array([0x42, 0x4d])], { type: 'image/bmp' });
    const result = await hardwareManager.dispatchPrintJob('bluetooth', dummyBlob);

    expect(result.success).toBe(false);
    expect(result.bytesWritten).toBe(0);
    expect(result.message).toContain('No Bluetooth printer is currently connected');
  });
});
