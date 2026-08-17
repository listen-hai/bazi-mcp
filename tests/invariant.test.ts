import { describe, it, expect } from 'bun:test';
import { calculateDualAxisBazi } from '../src/core/dual-axis';

describe('8.2 Invariant Tests', () => {
  // Invariant 1: the same UTC instant expressed in different timezones -> Year and Month pillars must be identical
  it('Invariant 1: Same UTC instant across multiple timezones produces identical Year and Month pillars', () => {
    // Instant 2024-02-04T16:00:00Z (after Lichun)
    // 1. Tacoma (America/Los_Angeles, UTC-8): 2024-02-04 08:00
    const tacoma = calculateDualAxisBazi({
      place: 'Tacoma, WA',
      solarDate: { year: 2024, month: 2, day: 4 },
      clockTime: { hour: 8, minute: 0 },
      gender: 'male',
    });

    // 2. Beijing (Asia/Shanghai, UTC+8): 2024-02-05 00:00
    const beijing = calculateDualAxisBazi({
      place: 'Beijing',
      solarDate: { year: 2024, month: 2, day: 5 },
      clockTime: { hour: 0, minute: 0 },
      gender: 'male',
    });

    // 3. London (Europe/London, UTC+0): 2024-02-04 16:00
    const london = calculateDualAxisBazi({
      place: 'London',
      solarDate: { year: 2024, month: 2, day: 4 },
      clockTime: { hour: 16, minute: 0 },
      gender: 'male',
    });

    // 4. Tokyo (Asia/Tokyo, UTC+9): 2024-02-05 01:00
    const tokyo = calculateDualAxisBazi({
      place: 'Tokyo',
      solarDate: { year: 2024, month: 2, day: 5 },
      clockTime: { hour: 1, minute: 0 },
      gender: 'male',
    });

    expect(tacoma.pillars.year.ganZhi).toBe('甲辰');
    expect(tacoma.pillars.month.ganZhi).toBe('丙寅');

    expect(beijing.pillars.year.ganZhi).toBe('甲辰');
    expect(beijing.pillars.month.ganZhi).toBe('丙寅');

    expect(london.pillars.year.ganZhi).toBe('甲辰');
    expect(london.pillars.month.ganZhi).toBe('丙寅');

    expect(tokyo.pillars.year.ganZhi).toBe('甲辰');
    expect(tokyo.pillars.month.ganZhi).toBe('丙寅');
  });

  // Invariant 2: one minute either side of a solar term boundary -> the Month pillar must shift by exactly one step
  it('Invariant 2: Solar term boundary transition at Lichun 2024 (2024-02-04 16:26:56 CST)', () => {
    // 10 minutes before Lichun (2024-02-04 16:15 CST) -> Year pillar is still 癸卯, Month pillar is 乙丑
    const before = calculateDualAxisBazi({
      timezone: 'Asia/Shanghai',
      longitude: 120,
      solarDate: { year: 2024, month: 2, day: 4 },
      clockTime: { hour: 16, minute: 15 },
      gender: 'male',
    });
    expect(before.pillars.year.ganZhi).toBe('癸卯');
    expect(before.pillars.month.ganZhi).toBe('乙丑');

    // 10 minutes after Lichun (2024-02-04 16:35 CST) -> Year pillar shifts to 甲辰, Month pillar shifts to 丙寅
    const after = calculateDualAxisBazi({
      timezone: 'Asia/Shanghai',
      longitude: 120,
      solarDate: { year: 2024, month: 2, day: 4 },
      clockTime: { hour: 16, minute: 35 },
      gender: 'male',
    });
    expect(after.pillars.year.ganZhi).toBe('甲辰');
    expect(after.pillars.month.ganZhi).toBe('丙寅');
  });
});
