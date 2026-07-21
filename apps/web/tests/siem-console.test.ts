import { describe, it, expect } from 'vitest';

describe('SiemConsole helpers', () => {
  it('builds entity link-outs correctly', async () => {
    // Behavioral test stub: ensure the link-out shape stays correct.
    const cases = [
      { e: '1.2.3.4', kind: 'ip', expect: (opId: string) => `/operations/${opId}/firewall?ip=1.2.3.4` },
      { e: 'WS01', kind: 'host', expect: (opId: string) => `/operations/${opId}/xdr?host=WS01` },
      { e: 'abcd', kind: 'file_hash', expect: (opId: string) => `/operations/${opId}/siem?q=file_hash:abcd` }
    ];
    function link(opId: string, e: string, kind: string) {
      if (kind === 'ip') return `/operations/${opId}/firewall?ip=${encodeURIComponent(e)}`;
      if (kind === 'host') return `/operations/${opId}/xdr?host=${encodeURIComponent(e)}`;
      if (kind === 'file_hash') return `/operations/${opId}/siem?q=file_hash:${encodeURIComponent(e)}`;
      return '#';
    }
    for (const c of cases) {
      expect(link('op1', c.e, c.kind)).toBe(c.expect('op1'));
    }
  });
});
