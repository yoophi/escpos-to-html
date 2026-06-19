import { type ParseResult } from '@escpos-to-html/escpos';

export type TcpServerStatus =
  | { status: 'stopped' }
  | { status: 'starting' }
  | { status: 'listening'; host: string; port: number }
  | { status: 'failed'; message: string };

export type TcpServerConfig = {
  host: string;
  port: number;
  receiptIdleTimeoutMs: number;
  maxReceipts: number;
};

export type ReceivedReceiptPayload = {
  id: string;
  receivedAt: string;
  client: {
    peerAddr: string;
    connectedAt: string;
  };
  bytes: number[];
  reason: 'cut' | 'idle_timeout' | 'connection_closed';
};

export type ReceiptViewModel = ReceivedReceiptPayload & {
  parsed: ParseResult;
  html: string;
};

export const defaultTcpServerConfig: TcpServerConfig = {
  host: '127.0.0.1',
  port: 9100,
  receiptIdleTimeoutMs: 800,
  maxReceipts: 200,
};
