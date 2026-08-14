import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { defaultTcpServerConfig, type TcpServerConfig } from '@/entities/receipt';
import { ReceiverHeader } from './index';

describe('ReceiverHeader', () => {
  const renderHeader = (onConfigChange = vi.fn()) => {
    render(
      <ReceiverHeader
        config={defaultTcpServerConfig}
        status={{ status: 'stopped' }}
        error={null}
        onConfigChange={onConfigChange}
        onStart={vi.fn()}
        onStop={vi.fn()}
      />,
    );
    return onConfigChange;
  };

  it('exposes max receipts and text encoding controls', () => {
    renderHeader();

    expect(screen.getByRole('spinbutton', { name: 'Max receipts' })).toHaveValue(200);
    expect(screen.getByRole('spinbutton', { name: 'Max bytes' })).toHaveValue(1048576);
    expect(screen.getByRole('button', { name: 'EUC-KR' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'UTF-8' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('updates max receipts and encoding through the existing config updater', () => {
    const onConfigChange = renderHeader();

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Max receipts' }), { target: { value: '3' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Max bytes' }), { target: { value: '2048' } });
    fireEvent.click(screen.getByRole('button', { name: 'UTF-8' }));

    const updatedConfigs = onConfigChange.mock.calls.map(
      ([updater]) => (updater as (current: TcpServerConfig) => TcpServerConfig)(defaultTcpServerConfig),
    );
    expect(updatedConfigs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ maxReceipts: 3 }),
        expect.objectContaining({ maxReceiptBytes: 2048 }),
        expect.objectContaining({ textEncoding: 'utf-8' }),
      ]),
    );
  });
});
