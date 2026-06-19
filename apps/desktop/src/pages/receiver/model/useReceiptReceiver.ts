import { useCallback, useEffect, useMemo, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { parseEscposBytes, renderHtml, toHex } from '@escpos-to-html/escpos';
import { call } from '@/shared/api/tauri';
import {
  defaultTcpServerConfig,
  type ReceivedReceiptPayload,
  type ReceiptViewModel,
  type TcpServerConfig,
  type TcpServerStatus,
} from '@/entities/receipt';

const MAX_RENDERED_RECEIPTS = 200;

export function useReceiptReceiver() {
  const [config, setConfig] = useState<TcpServerConfig>(defaultTcpServerConfig);
  const [status, setStatus] = useState<TcpServerStatus>({ status: 'stopped' });
  const [receipts, setReceipts] = useState<ReceiptViewModel[]>([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const parsed = parseEscposBytes(event.payload.bytes, { textEncoding: 'euc-kr' });
      const receipt: ReceiptViewModel = {
        ...event.payload,
        parsed,
        html: renderHtml(parsed, { wrapPlainTextSpans: true }),
      };
      setReceipts((current) => [receipt, ...current].slice(0, MAX_RENDERED_RECEIPTS));
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
    formatBytes: toHex,
  };
}
