import { defaultTcpServerConfig } from './model';

describe('defaultTcpServerConfig', () => {
  it('keeps the existing EUC-KR receiver behavior by default', () => {
    expect(defaultTcpServerConfig).toMatchObject({
      maxReceipts: 200,
      textEncoding: 'euc-kr',
    });
  });
});
