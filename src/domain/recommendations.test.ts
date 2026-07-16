import { describe, expect, it } from 'vitest';
import { repeatLabel, windowLabel } from './recommendations';
import type { RecommendRepeat } from './types';

function windowOf(
  repeat_mode: RecommendRepeat,
  window_start: string,
  window_end: string | null = null,
) {
  return { repeat_mode, window_start, window_end };
}

describe('repeatLabel', () => {
  it('names each repeat mode in Spanish', () => {
    expect(repeatLabel('monthly')).toBe('Cada mes');
    expect(repeatLabel('yearly')).toBe('Cada año');
    expect(repeatLabel('none')).toBe('Una vez');
  });
});

describe('windowLabel one-off', () => {
  it('shows the full date because a one-off honours its exact day', () => {
    expect(windowLabel(windowOf('none', '2026-06-14'))).toBe('14 jun 2026');
  });
});

describe('windowLabel monthly', () => {
  // Matching is month-granular, so the day must not appear — it would imply a
  // precision the RPC does not honour.
  it('drops the day from an open-ended window', () => {
    expect(windowLabel(windowOf('monthly', '2026-06-14'))).toBe('Desde jun 2026');
  });

  it('drops the day from both ends of a bounded window', () => {
    expect(windowLabel(windowOf('monthly', '2026-06-14', '2026-12-31'))).toBe(
      'jun 2026 – dic 2026',
    );
  });

  it('renders identically for any day in the same month', () => {
    expect(windowLabel(windowOf('monthly', '2026-06-01'))).toBe(
      windowLabel(windowOf('monthly', '2026-06-28')),
    );
  });
});

describe('windowLabel yearly', () => {
  it('leads with the anniversary month and bounds by year', () => {
    expect(windowLabel(windowOf('yearly', '2026-06-14', '2027-12-31'))).toBe(
      'junio · 2026 – 2027',
    );
  });

  it('shows an open-ended yearly window as from its start year', () => {
    expect(windowLabel(windowOf('yearly', '2026-03-09'))).toBe('marzo · desde 2026');
  });
});
