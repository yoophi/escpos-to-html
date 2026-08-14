import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useReceiptReceiver } from './useReceiptReceiver';
import type { ReceivedReceiptPayload } from '@/entities/receipt';

const mocks = vi.hoisted(() => {
  const listeners = new Map<string, (event: { payload: unknown }) => void>();
  return {
    listeners,
    listen: vi.fn((event: string, callback: (event: { payload: unknown }) => void) => {
      listeners.set(event, callback);
      return Promise.resolve(vi.fn());
    }),
    invoke: vi.fn().mockResolvedValue({ status: 'stopped' }),
    parseEscposBytes: vi.fn(() => ({
      lines: [{ align: 'left', spans: [] }],
      events: [],
      warnings: [],
      bytes: [],
    })),
    renderHtml: vi.fn(() => '<div />'),
  };
});

vi.mock('@tauri-apps/api/event', () => ({ listen: mocks.listen }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke }));
vi.mock('@escpos-to-html/escpos', () => ({
  parseEscposBytes: mocks.parseEscposBytes,
  renderHtml: mocks.renderHtml,
}));

const payload = (id: string): ReceivedReceiptPayload => ({
  id,
  receivedAt: '2026-08-14T00:00:0' + id + 'Z',
  client: { peerAddr: '127.0.0.1:1234', connectedAt: '2026-08-14T00:00:00Z' },
  bytes: [id.charCodeAt(0)],
  reason: 'connection_closed',
  truncated: false,
});

describe('useReceiptReceiver', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.listeners.clear();
    mocks.listen.mockClear();
    mocks.invoke.mockClear();
    mocks.invoke.mockImplementation(() => new Promise(() => undefined));
    mocks.parseEscposBytes.mockClear();
  });

  it('loads, persists, applies, and forwards maxReceipts and textEncoding', async () => {
    window.localStorage.setItem(
      'escpos.desktop.tcpServerConfig.v1',
      JSON.stringify({ ...defaultConfig(), maxReceipts: 2, textEncoding: 'utf-8' }),
    );

    const { result } = renderHook(() => useReceiptReceiver());
    const receive = mocks.listeners.get('receipt://received');
    expect(receive).toBeDefined();

    act(() => {
      receive!({ payload: payload('a') });
      receive!({ payload: payload('b') });
      receive!({ payload: payload('c') });
    });

    expect(result.current.config.textEncoding).toBe('utf-8');
    expect(result.current.receipts.map((receipt) => receipt.id)).toEqual(['c', 'b']);
    expect(mocks.parseEscposBytes).toHaveBeenLastCalledWith([99], { textEncoding: 'utf-8' });
    expect(JSON.parse(window.localStorage.getItem('escpos.desktop.tcpServerConfig.v1') ?? '{}')).toMatchObject({
      maxReceipts: 2,
      textEncoding: 'utf-8',
    });

    act(() => {
      result.current.setConfig((current) => ({ ...current, maxReceipts: 1, textEncoding: 'euc-kr' }));
    });

    expect(result.current.receipts.map((receipt) => receipt.id)).toEqual(['c']);

    act(() => {
      receive!({ payload: payload('d') });
    });

    expect(result.current.receipts.map((receipt) => receipt.id)).toEqual(['d']);
    expect(mocks.parseEscposBytes).toHaveBeenLastCalledWith([100], { textEncoding: 'euc-kr' });

    mocks.invoke.mockResolvedValue({ status: 'stopped' });
    await act(async () => {
      await result.current.startServer();
    });

    expect(mocks.invoke).toHaveBeenLastCalledWith('start_tcp_server', {
      config: expect.objectContaining({ maxReceipts: 1, textEncoding: 'euc-kr' }),
    });
  });
});

function defaultConfig() {
  return {
    host: '127.0.0.1',
    port: 9100,
    receiptIdleTimeoutMs: 800,
    maxReceipts: 200,
    maxReceiptBytes: 1_048_576,
    textEncoding: 'euc-kr' as const,
  };
}
