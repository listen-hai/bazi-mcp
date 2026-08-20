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
      place: 'London, United Kingdom',
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
  /**
   * A solar term is a single global instant — the moment the sun reaches a given
   * ecliptic longitude — so whether a birth falls before or after it must be
   * decided on the UTC instant, never on a longitude-corrected local time. The
   * hour pillar is the opposite: 时辰 is defined by the sun's position where the
   * person was born. That split is the entire reason for the dual-axis design,
   * and applying the longitude correction to the year/month axis is the classic
   * way other implementations get this wrong.
   */
  it('decides solar-term boundaries on the UTC instant while the hour pillar follows local solar time', () => {
    // Lichun 2025 = 2025-02-03 22:10:14 CST = 14:10:14 UTC.
    const sites = [
      { name: 'Kashgar', timezone: 'Asia/Shanghai', longitude: 75.97 },
      { name: 'Harbin', timezone: 'Asia/Shanghai', longitude: 126.53 },
      { name: 'London', timezone: 'Europe/London', longitude: -0.13 },
    ];

    const chartAt = (utcHour: number, utcMinute: number, site: typeof sites[number]) => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: site.timezone, hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      })
        .formatToParts(new Date(Date.UTC(2025, 1, 3, utcHour, utcMinute)))
        .reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {} as Record<string, string>);

      return calculateDualAxisBazi({
        timezone: site.timezone,
        longitude: site.longitude,
        solarDate: { year: +parts.year, month: +parts.month, day: +parts.day },
        clockTime: { hour: +parts.hour % 24, minute: +parts.minute },
        gender: 'male',
      });
    };

    for (const [utcHour, utcMinute, year, month] of [
      [14, 0, '甲辰', '丁丑'],   // before Lichun
      [14, 20, '乙巳', '戊寅'],  // after Lichun
    ] as Array<[number, number, string, string]>) {
      const charts = sites.map(site => chartAt(utcHour, utcMinute, site));

      // Same instant, 126 degrees of longitude apart: the term boundary cannot move.
      for (const [index, chart] of charts.entries()) {
        expect(chart.pillars.year.ganZhi, sites[index].name).toBe(year);
        expect(chart.pillars.month.ganZhi, sites[index].name).toBe(month);
      }

      // ...while the hour pillar must differ, because the sun does not stand in
      // the same place over Kashgar, Harbin and London at one instant.
      const hourPillars = new Set(charts.map(chart => chart.pillars.hour?.ganZhi));
      expect(hourPillars.size).toBe(sites.length);
    }
  });
});
