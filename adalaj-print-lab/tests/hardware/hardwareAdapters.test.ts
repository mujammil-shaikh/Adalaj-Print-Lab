import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hardwareManager } from '../../src/services/hardwareAdapters';

describe('Hardware Adapter Truth (P0-01, PR-01, PR-02, PR-03, E2E-09)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('never returns success on network socket connection failure or timeout', async () => {
    // Mock fetch to simulate local agent offline / network timeout
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch (ECONNREFUSED)')));

    const dummyBlob = new Blob([new Uint8Array([0x42, 0x4d])], { type: 'image/bmp' });
    const result = await hardwareManager.dispatchPrintJob('network_socket', dummyBlob);

    expect(result.success).toBe(false);
    expect(result.bytesWritten).toBe(0);
    expect(result.message).toContain('failed');
    expect(result.message).toContain('Local Print Agent is offline');
  });

  it('returns success and bytes written when local print agent acknowledges transmission', async () => {
    // Mock fetch to simulate successful agent response
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        jobId: 'job_test_123',
        bytesWritten: 256,
        status: 'device_acknowledged'
      })
    }));

    const dummyBlob = new Blob([new Uint8Array([0x42, 0x4d])], { type: 'image/bmp' });
    const result = await hardwareManager.dispatchPrintJob('network_socket', dummyBlob, 'job_test_123');

    expect(result.success).toBe(true);
    expect(result.bytesWritten).toBe(256);
    expect(result.status).toBe('device_acknowledged');
    expect(result.message).toContain('via Local Print Agent (256 bytes)');
  });

  it('returns failure when agent reports printer TCP connection timeout', async () => {
    // Mock fetch to simulate agent returning failure when printer is unplugged
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        error: 'TCP socket connection to 192.168.1.100:9100 timed out after 8000 ms'
      })
    }));

    const dummyBlob = new Blob([new Uint8Array([0x42, 0x4d])], { type: 'image/bmp' });
    const result = await hardwareManager.dispatchPrintJob('network_socket', dummyBlob);

    expect(result.success).toBe(false);
    expect(result.bytesWritten).toBe(0);
    expect(result.message).toContain('timed out');
  });

  it('tests printer connection latency through local agent endpoint', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        host: '192.168.1.100',
        port: 9100,
        latencyMs: 12
      })
    }));

    const result = await hardwareManager.testNetworkPrinter('192.168.1.100', 9100);
    expect(result.success).toBe(true);
    expect(result.latencyMs).toBe(12);
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
