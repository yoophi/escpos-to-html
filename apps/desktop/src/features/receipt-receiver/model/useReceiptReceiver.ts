import { useCallback, useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { toHex } from '@escpos-receipt-emulator/escpos';
import { call } from '@/shared/api/tauri';
import {
  defaultTcpServerConfig,
  type ReceivedReceiptPayload,
  type TcpServerConfig,
  type TcpServerStatus,
} from '@/entities/receipt';
import {
  clearReceiptSession,
  emptyReceiptSession,
  receiveReceipt,
  selectReceipt,
  selectedReceipt,
} from './receipt-session';

const TCP_SERVER_CONFIG_STORAGE_KEY = 'escpos.desktop.tcpServerConfig.v1';

const loadStoredConfig = (): TcpServerConfig => {
  if (typeof window === 'undefined') return defaultTcpServerConfig;

  try {
    const raw = window.localStorage.getItem(TCP_SERVER_CONFIG_STORAGE_KEY);
    if (!raw) return defaultTcpServerConfig;

    const parsed = JSON.parse(raw) as Partial<TcpServerConfig>;
    const port = Number(parsed.port);
    const receiptIdleTimeoutMs = Number(parsed.receiptIdleTimeoutMs);
    const maxReceipts = Number(parsed.maxReceipts);

    return {
      host: typeof parsed.host === 'string' && parsed.host.trim() ? parsed.host : defaultTcpServerConfig.host,
      port: Number.isInteger(port) && port >= 1 && port <= 65535 ? port : defaultTcpServerConfig.port,
      receiptIdleTimeoutMs:
        Number.isFinite(receiptIdleTimeoutMs) && receiptIdleTimeoutMs > 0
          ? receiptIdleTimeoutMs
          : defaultTcpServerConfig.receiptIdleTimeoutMs,
      maxReceipts: Number.isInteger(maxReceipts) && maxReceipts > 0 ? maxReceipts : defaultTcpServerConfig.maxReceipts,
    };
  } catch {
    return defaultTcpServerConfig;
  }
};

export function useReceiptReceiver() {
  const [config, setConfig] = useState<TcpServerConfig>(() => loadStoredConfig());
  const [status, setStatus] = useState<TcpServerStatus>({ status: 'stopped' });
  const [session, setSession] = useState(emptyReceiptSession);
  const [error, setError] = useState<string | null>(null);
  const maxReceiptsRef = useRef(config.maxReceipts);

  useEffect(() => {
    window.localStorage.setItem(TCP_SERVER_CONFIG_STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    maxReceiptsRef.current = config.maxReceipts;
  }, [config.maxReceipts]);

  useEffect(() => {
    let disposed = false;

    async function syncInitialStatus() {
      try {
        const nextStatus = await call<Record<string, never>, TcpServerStatus>('get_tcp_server_status');
        if (!disposed) setStatus(nextStatus);
      } catch {
        if (!disposed) setStatus({ status: 'stopped' });
      }
    }

    void syncInitialStatus();

    const unlistenStatus = listen<TcpServerStatus>('tcp://status-changed', (event) => {
      setStatus(event.payload);
    });
    const unlistenReceipt = listen<ReceivedReceiptPayload>('receipt://received', (event) => {
      setSession((current) => receiveReceipt(current, event.payload, maxReceiptsRef.current));
    });
    const unlistenError = listen<string>('tcp://error', (event) => {
      setError(event.payload);
    });

    return () => {
      disposed = true;
      void unlistenStatus.then((unlisten) => unlisten());
      void unlistenReceipt.then((unlisten) => unlisten());
      void unlistenError.then((unlisten) => unlisten());
    };
  }, []);

  const startServer = useCallback(async () => {
    setError(null);
    try {
      const nextStatus = await call<{ config: TcpServerConfig }, TcpServerStatus>('start_tcp_server', {
        config,
      });
      setStatus(nextStatus);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'TCP 서버를 시작할 수 없습니다.');
    }
  }, [config]);

  const stopServer = useCallback(async () => {
    setError(null);
    try {
      const nextStatus = await call<Record<string, never>, TcpServerStatus>('stop_tcp_server');
      setStatus(nextStatus);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'TCP 서버를 중지할 수 없습니다.');
    }
  }, []);

  const clearReceipts = useCallback(() => {
    setSession(clearReceiptSession());
  }, []);

  const setSelectedReceiptId = useCallback((receiptId: string | null) => {
    setSession((current) => selectReceipt(current, receiptId));
  }, []);

  return {
    config,
    setConfig,
    status,
    receipts: session.receipts,
    selectedReceipt: selectedReceipt(session),
    selectedReceiptId: session.selectedReceiptId,
    setSelectedReceiptId,
    error,
    startServer,
    stopServer,
    clearReceipts,
    formatBytes: toHex,
  };
}
