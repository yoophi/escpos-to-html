import { parseEscposBytes, renderHtml } from '@escpos-receipt-emulator/escpos';
import {
  type ReceivedReceiptPayload,
  type ReceiptViewModel,
} from '@/entities/receipt';

export type ReceiptSessionState = {
  receipts: ReceiptViewModel[];
  selectedReceiptId: string | null;
};

export const emptyReceiptSession: ReceiptSessionState = {
  receipts: [],
  selectedReceiptId: null,
};

const toReceiptViewModel = (payload: ReceivedReceiptPayload): ReceiptViewModel => {
  const parsed = parseEscposBytes(payload.bytes, { textEncoding: 'euc-kr' });
  return {
    ...payload,
    parsed,
    html: renderHtml(parsed, { wrapPlainTextSpans: true }),
  };
};

export function receiveReceipt(
  session: ReceiptSessionState,
  payload: ReceivedReceiptPayload,
  maxReceipts: number,
): ReceiptSessionState {
  const receipt = toReceiptViewModel(payload);
  const receipts = [receipt, ...session.receipts].slice(0, Math.max(1, maxReceipts));
  const selectedReceiptId = receipts.some((item) => item.id === session.selectedReceiptId)
    ? session.selectedReceiptId
    : receipt.id;

  return { receipts, selectedReceiptId };
}

export function selectReceipt(session: ReceiptSessionState, receiptId: string | null): ReceiptSessionState {
  if (receiptId !== null && !session.receipts.some((receipt) => receipt.id === receiptId)) {
    return session;
  }
  return { ...session, selectedReceiptId: receiptId };
}

export function selectedReceipt(session: ReceiptSessionState): ReceiptViewModel | null {
  return session.receipts.find((receipt) => receipt.id === session.selectedReceiptId) ?? session.receipts[0] ?? null;
}

export function clearReceiptSession(): ReceiptSessionState {
  return emptyReceiptSession;
}
