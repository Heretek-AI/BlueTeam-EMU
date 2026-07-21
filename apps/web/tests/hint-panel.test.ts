import { describe, it, expect } from 'vitest';

describe('hint gating policy', () => {
  function shouldShow(i: number, hints: any[], timer: number, baseAfter = 30, interval = 60) {
    if (i === 0) return timer >= (hints[0]?.after_seconds ?? baseAfter);
    return timer >= (hints[i].after_seconds ?? baseAfter) + interval * i;
  }

  it('first hint visible at configured delay', () => {
    const hints = [{ after_seconds: 60 }];
    expect(shouldShow(0, hints, 30)).toBe(false);
    expect(shouldShow(0, hints, 60)).toBe(true);
  });

  it('subsequent hints respect interval', () => {
    const hints = [
      { after_seconds: 30 },
      { after_seconds: 30 },
      { after_seconds: 30 }
    ];
    expect(shouldShow(1, hints, 100)).toBe(true);
    expect(shouldShow(2, hints, 100)).toBe(false);
    expect(shouldShow(2, hints, 160)).toBe(true);
  });
});
