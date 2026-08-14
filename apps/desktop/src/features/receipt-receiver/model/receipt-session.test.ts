import { describe, expect, it } from 'vitest';
import type { ReceivedReceiptPayload } from '@/entities/receipt';
import {
  clearReceiptSession,
  emptyReceiptSession,
  receiveReceipt,
  selectReceipt,
  selectedReceipt,
} from './receipt-session';

const receiptPayload = (id: string): ReceivedReceiptPayload => ({
  id,
  receivedAt: '2026-08-14T10:00:00.000Z',
  client: {
    peerAddr: '127.0.0.1:45678',
    connectedAt: '2026-08-14T10:00:00.000Z',
  },
  bytes: [0x48, 0x69, 0x0a],
  reason: 'cut',
});

describe('receipt session', () => {
  it('selects the first received receipt', () => {
    const session = receiveReceipt(emptyReceiptSession, receiptPayload('first'), 2);

    expect(session.selectedReceiptId).toBe('first');
    expect(selectedReceipt(session)?.id).toBe('first');
  });

  it('preserves an explicit selection while a newer receipt arrives', () => {
    const first = receiveReceipt(emptyReceiptSession, receiptPayload('first'), 3);
    const selected = selectReceipt(first, 'first');
    const session = receiveReceipt(selected, receiptPayload('second'), 3);

    expect(session.receipts.map((receipt) => receipt.id)).toEqual(['second', 'first']);
    expect(session.selectedReceiptId).toBe('first');
    expect(selectedReceipt(session)?.id).toBe('first');
  });

  it('selects the newest receipt when retention removes the selected receipt', () => {
    const first = receiveReceipt(emptyReceiptSession, receiptPayload('first'), 1);
    const session = receiveReceipt(first, receiptPayload('second'), 1);

    expect(session.receipts.map((receipt) => receipt.id)).toEqual(['second']);
    expect(session.selectedReceiptId).toBe('second');
  });

  it('does not select an unknown receipt and clears all session state', () => {
    const session = receiveReceipt(emptyReceiptSession, receiptPayload('first'), 2);

    expect(selectReceipt(session, 'unknown')).toBe(session);
    expect(clearReceiptSession()).toEqual(emptyReceiptSession);
  });
});
