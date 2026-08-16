import { describe, it, expect } from 'bun:test';
import { calculateDualAxisBazi } from '../src/core/dual-axis';

describe('8.2 Invariant Tests (不变量测试)', () => {
  // 不变量 1：同一 UTC 瞬时用不同时区表达 → 年月柱必须严格相同
  it('Invariant 1: Same UTC instant across multiple timezones produces identical Year and Month pillars', () => {
    // 瞬时 2024-02-04T16:00:00Z (立春后)
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

  // 不变量 2：跨节气瞬时前后一分钟 → 月柱必须且只能跳一格
  it('Invariant 2: Solar term boundary transition at Lichun 2024 (2024-02-04 16:26:56 CST)', () => {
    // 立春前 10 分钟 (2024-02-04 16:15 CST) -> 年柱仍为 癸卯, 月柱为 乙丑
    const before = calculateDualAxisBazi({
      timezone: 'Asia/Shanghai',
      longitude: 120,
      solarDate: { year: 2024, month: 2, day: 4 },
      clockTime: { hour: 16, minute: 15 },
      gender: 'male',
    });
    expect(before.pillars.year.ganZhi).toBe('癸卯');
    expect(before.pillars.month.ganZhi).toBe('乙丑');

    // 立春后 10 分钟 (2024-02-04 16:35 CST) -> 年柱跳为 甲辰, 月柱跳为 丙寅
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
