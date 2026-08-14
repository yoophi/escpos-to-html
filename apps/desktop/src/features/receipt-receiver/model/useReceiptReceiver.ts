import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { parseEscposBytes, renderHtml } from '@escpos-to-html/escpos';
import {
  defaultTcpServerConfig,
  type ReceivedReceiptPayload,
  type ReceiptViewModel,
  type TextEncoding,
  type TcpServerConfig,
  type TcpServerStatus,
} from '@/entities/receipt';

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
    const maxReceiptBytes = Number(parsed.maxReceiptBytes);
    const textEncoding: TextEncoding = parsed.textEncoding === 'utf-8' ? 'utf-8' : 'euc-kr';

    return {
      host: typeof parsed.host === 'string' && parsed.host.trim() ? parsed.host : defaultTcpServerConfig.host,
      port: Number.isInteger(port) && port >= 1 && port <= 65535 ? port : defaultTcpServerConfig.port,
      receiptIdleTimeoutMs:
        Number.isFinite(receiptIdleTimeoutMs) && receiptIdleTimeoutMs > 0
          ? receiptIdleTimeoutMs
          : defaultTcpServerConfig.receiptIdleTimeoutMs,
      maxReceipts: Number.isInteger(maxReceipts) && maxReceipts > 0 ? maxReceipts : defaultTcpServerConfig.maxReceipts,
      maxReceiptBytes:
        Number.isInteger(maxReceiptBytes) && maxReceiptBytes > 0 ? maxReceiptBytes : defaultTcpServerConfig.maxReceiptBytes,
      textEncoding,
    };
  } catch {
    return defaultTcpServerConfig;
  }
};

export function useReceiptReceiver() {
  const [config, setConfig] = useState<TcpServerConfig>(() => loadStoredConfig());
  const [status, setStatus] = useState<TcpServerStatus>({ status: 'stopped' });
  const [receipts, setReceipts] = useState<ReceiptViewModel[]>([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    window.localStorage.setItem(TCP_SERVER_CONFIG_STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    setReceipts((current) => current.slice(0, config.maxReceipts));
  }, [config.maxReceipts]);

  useEffect(() => {
    if (selectedReceiptId === null || receipts.some((receipt) => receipt.id === selectedReceiptId)) return;
    setSelectedReceiptId(receipts[0]?.id ?? null);
  }, [receipts, selectedReceiptId]);

  useEffect(() => {
    let disposed = false;

    async function syncInitialStatus() {
      try {
        const nextStatus = await invoke<TcpServerStatus>('get_tcp_server_status');
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
      const { maxReceipts, textEncoding } = configRef.current;
      const parsed = parseEscposBytes(event.payload.bytes, { textEncoding });
      const receipt: ReceiptViewModel = {
        ...event.payload,
        parsed,
        html: renderHtml(parsed, { wrapPlainTextSpans: true }),
      };
      setReceipts((current) => [receipt, ...current].slice(0, maxReceipts));
      setSelectedReceiptId((current) => current ?? receipt.id);
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

  const selectedReceipt = useMemo(
    () => receipts.find((receipt) => receipt.id === selectedReceiptId) ?? receipts[0] ?? null,
    [receipts, selectedReceiptId],
  );

  const startServer = useCallback(async () => {
    setError(null);
    try {
      const nextStatus = await invoke<TcpServerStatus>('start_tcp_server', {
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
      const nextStatus = await invoke<TcpServerStatus>('stop_tcp_server');
      setStatus(nextStatus);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'TCP 서버를 중지할 수 없습니다.');
    }
  }, []);

  const clearReceipts = useCallback(() => {
    setReceipts([]);
    setSelectedReceiptId(null);
  }, []);

  return {
    config,
    setConfig,
    status,
    receipts,
    selectedReceipt,
    selectedReceiptId,
    setSelectedReceiptId,
    error,
    startServer,
    stopServer,
    clearReceipts,
  };
}
