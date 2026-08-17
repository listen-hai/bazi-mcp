import { describe, it, expect, test } from 'bun:test';
import { calculateDualAxisBazi } from '../src/core/dual-axis';
import { resolveLocation, lookupCity } from '../src/geo/resolver';
import { BaziInputSchema } from '../src/schemas/input';

describe('8.5 Boundary, DST & Edge Case Tests', () => {
  // 1. DST spring-forward nonexistent clock time
  it('Should throw error for nonexistent spring-forward DST clock time', () => {
    expect(() => {
      calculateDualAxisBazi({
        timezone: 'America/Los_Angeles',
        longitude: -122.4443,
        solarDate: { year: 1990, month: 4, day: 1 },
        clockTime: { hour: 2, minute: 30 },
        gender: 'male',
      });
    }).toThrow('DST spring-forward gap');
  });

  // 2. DST fall-back overlapping clock time (missing dstFold throws a disambiguation error)
  it('Should throw error for ambiguous fall-back DST fold when dstFold is missing', () => {
    expect(() => {
      calculateDualAxisBazi({
        timezone: 'America/Los_Angeles',
        longitude: -122.4443,
        solarDate: { year: 1990, month: 10, day: 28 },
        clockTime: { hour: 1, minute: 30 },
        gender: 'male',
      });
    }).toThrow('DST fall-back overlap');
  });

  // 3. DST fall-back disambiguation (dstFold = 0 vs dstFold = 1)
  it('Should disambiguate fall-back DST fold with dstFold=0 and dstFold=1', () => {
    const resFold0 = calculateDualAxisBazi({
      timezone: 'America/Los_Angeles',
      longitude: -122.4443,
      solarDate: { year: 1990, month: 10, day: 28 },
      clockTime: { hour: 1, minute: 30 },
      dstFold: 0,
      gender: 'male',
    });
    expect(resFold0.diagnostics.utcInstant).toBe('1990-10-28T08:30:00.000Z');
    expect(resFold0.diagnostics.utcOffset).toContain('-07:00');
    // The resolved dstFold must actually reach the Axis B pillar computation,
    // not just the diagnostics block (FIX 1): fold 0's true solar time is
    // 00:36 (子), fold 1's is 01:36 (丑) — one hour later, a different hour
    // pillar, from a 丙 day (Five Rats: 丙/辛 day -> 戊子, 己丑, ...).
    expect(resFold0.pillars.hour?.ganZhi).toBe('戊子');

    const resFold1 = calculateDualAxisBazi({
      timezone: 'America/Los_Angeles',
      longitude: -122.4443,
      solarDate: { year: 1990, month: 10, day: 28 },
      clockTime: { hour: 1, minute: 30 },
      dstFold: 1,
      gender: 'male',
    });
    expect(resFold1.diagnostics.utcInstant).toBe('1990-10-28T09:30:00.000Z');
    expect(resFold1.diagnostics.utcOffset).toContain('-08:00');
    expect(resFold1.pillars.hour?.ganZhi).toBe('己丑');
  });

  // docs/spec.md §6③'s own example: China's 1988 DST fall-back fold on home turf.
  it('Should disambiguate a China DST fall-back fold (1988-09-11 01:30 Asia/Shanghai)', () => {
    expect(() => {
      calculateDualAxisBazi({
        timezone: 'Asia/Shanghai',
        longitude: 116.4074,
        solarDate: { year: 1988, month: 9, day: 11 },
        clockTime: { hour: 1, minute: 30 },
        gender: 'male',
      });
    }).toThrow('DST fall-back overlap');

    const fold0 = calculateDualAxisBazi({
      timezone: 'Asia/Shanghai',
      longitude: 116.4074,
      solarDate: { year: 1988, month: 9, day: 11 },
      clockTime: { hour: 1, minute: 30 },
      dstFold: 0,
      gender: 'male',
    });
    const fold1 = calculateDualAxisBazi({
      timezone: 'Asia/Shanghai',
      longitude: 116.4074,
      solarDate: { year: 1988, month: 9, day: 11 },
      clockTime: { hour: 1, minute: 30 },
      dstFold: 1,
      gender: 'male',
    });
    expect(fold0.pillars.hour?.ganZhi).toBe('甲子');
    expect(fold1.pillars.hour?.ganZhi).toBe('乙丑');
    expect(fold0.pillars.hour?.ganZhi).not.toBe(fold1.pillars.hour?.ganZhi);
  });

  // 4. Genuine leap lunar month support (2020 leap 4th month 15th -> day pillar 庚辰)
  it('Should correctly calculate valid leap lunar month', () => {
    const res = calculateDualAxisBazi({
      place: 'Beijing',
      lunarDate: { year: 2020, month: 4, day: 15, isLeapMonth: true },
      clockTime: { hour: 12, minute: 0 },
      gender: 'male',
    });
    expect(res.pillars.day.ganZhi).toBe('庚辰');
    expect(res.diagnostics.lunar?.lunarDescription).toContain('04-15 (leap month)');
  });

  // 5. Invalid leap month is rejected
  it('Should reject invalid leap lunar month', () => {
    expect(() => {
      calculateDualAxisBazi({
        place: 'Beijing',
        lunarDate: { year: 2021, month: 4, day: 15, isLeapMonth: true },
        clockTime: { hour: 12, minute: 0 },
        gender: 'male',
      });
    }).toThrow('Lunar date conversion failed');
  });

  // 6. Three-pillar chart (timeUnknown: true)
  it('Should output three-pillar chart when time is unknown', () => {
    const res = calculateDualAxisBazi({
      place: 'Guangzhou',
      solarDate: { year: 1998, month: 7, day: 31 },
      timeUnknown: true,
      gender: 'male',
    });
    expect(res.fourPillars).toContain('[hour unknown]');
    expect(res.pillars.hour).toBeNull();
    expect(res.pillars.year.ganZhi).toBe('戊寅');
    expect(res.pillars.month.ganZhi).toBe('己未');
    expect(res.pillars.day.ganZhi).toBe('己卯');
    expect(res.daYun.cycles.length).toBeGreaterThan(0);
  });

  // 7. Shichen midpoint sampling and True Solar Time shift ambiguity
  it('Should detect shichen True Solar shift ambiguity in Urumqi', () => {
    const res = calculateDualAxisBazi({
      place: 'Urumqi',
      solarDate: { year: 1990, month: 6, day: 15 },
      shichen: '未',
      gender: 'male',
    });
    expect(res.diagnostics.shichenAmbiguity?.isAmbiguous).toBe(true);
    expect(res.diagnostics.shichenAmbiguity?.candidateHourPillars.length).toBeGreaterThan(1);
    expect(res.diagnostics.warnings.some(w => w.includes('crosses a shichen boundary'))).toBe(true);
  });

  // 丑 spans 01:00-02:59; its midpoint 02:00 falls in LA's 1990 spring-forward
  // gap, but 01:00 existed that day, so this must return a chart with a gap
  // warning instead of throwing (FIX 6).
  it('Should fall back to a valid shichen sample point when the midpoint lands in a DST gap', () => {
    const res = calculateDualAxisBazi({
      timezone: 'America/Los_Angeles',
      longitude: -122.4443,
      solarDate: { year: 1990, month: 4, day: 1 },
      shichen: '丑',
      gender: 'male',
    });
    expect(res.fourPillars).toBeDefined();
    expect(res.diagnostics.warnings.some(w => w.includes('spring-forward gap'))).toBe(true);
  });

  // 8. Pre-1901 China historical timezone note
  it('Should add warning for pre-1901 China dates', () => {
    const res = calculateDualAxisBazi({
      place: 'Shanghai',
      solarDate: { year: 1895, month: 5, day: 1 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'male',
    });
    expect(res.diagnostics.historicalTzApprox).toBe(true);
    expect(res.diagnostics.warnings.some(w => w.includes('Before 1901'))).toBe(true);
  });

  // 9. Location lookup and disambiguation
  it('Should resolve city or report multiple candidates', () => {
    const gz = lookupCity('Guangzhou');
    expect(gz.length).toBe(1);
    expect(gz[0].timezone).toBe('Asia/Shanghai');

    const tacoma = lookupCity('Tacoma');
    expect(tacoma.length).toBe(1);
    expect(tacoma[0].timezone).toBe('America/Los_Angeles');

    expect(() => {
      resolveLocation({ place: 'NonExistentCity999' });
    }).toThrow('Could not recognize birth place');
  });

  // Same-name cities within one country must not be collapsed into a single
  // silent candidate (FIX 3a), and cross-country name collisions that disagree
  // on timezone must not be silently auto-picked (FIX 3b).
  it('Should surface all same-name candidates instead of silently guessing one', () => {
    const springfields = lookupCity('Springfield');
    expect(springfields.length).toBeGreaterThan(1);
    expect(springfields.every(c => c.country === 'US')).toBe(true);

    expect(() => {
      resolveLocation({ place: 'San Jose' });
    }).toThrow('matched multiple candidate cities');
  });

  // 10. Southern Hemisphere timezone and DST
  it('Should handle Southern Hemisphere timezone and its DST (Australia/Sydney in January)', () => {
    const result = calculateDualAxisBazi({
      place: 'Sydney',
      longitude: 151.2093,
      timezone: 'Australia/Sydney',
      solarDate: { year: 2024, month: 1, day: 15 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'male'
    });
    expect(result.diagnostics.wallClock).toContain('Australia/Sydney');
    expect(result.diagnostics.utcOffset).toContain('DST in effect');
  });

  it('Should handle Southern Hemisphere timezone in winter (Australia/Sydney in July)', () => {
    const result = calculateDualAxisBazi({
      place: 'Sydney',
      longitude: 151.2093,
      timezone: 'Australia/Sydney',
      solarDate: { year: 2024, month: 7, day: 15 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'male'
    });
    expect(result.diagnostics.utcOffset).not.toContain('DST in effect');
  });

  it('Should handle extreme longitude like Fiji (Pacific/Fiji)', () => {
    const result = calculateDualAxisBazi({
      place: 'Suva',
      longitude: 178.4415,
      timezone: 'Pacific/Fiji',
      solarDate: { year: 2024, month: 2, day: 10 },
      clockTime: { hour: 14, minute: 30 },
      gender: 'female'
    });
    expect(result.diagnostics.longitudeCorrectionMinutes).toBeLessThan(0);
    expect(result.diagnostics.utcOffset).toBeDefined();
  });

  it('Should handle sect=1 (default 00:00 boundary) vs sect=2 (23:00 boundary) for late Zi hour', () => {
    const date = { year: 2024, month: 5, day: 10 };
    const time = { hour: 23, minute: 30 };

    const resultSect1 = calculateDualAxisBazi({
      place: 'Beijing',
      longitude: 116.4,
      timezone: 'Asia/Shanghai',
      solarDate: date,
      clockTime: time,
      gender: 'male',
      sect: 1
    });

    const resultSect2 = calculateDualAxisBazi({
      place: 'Beijing',
      longitude: 116.4,
      timezone: 'Asia/Shanghai',
      solarDate: date,
      clockTime: time,
      gender: 'male',
      sect: 2
    });

    expect(resultSect1.pillars.day.ganZhi).not.toBe(resultSect2.pillars.day.ganZhi);
    expect(resultSect2.diagnostics.convention.sect).toBe(2);
    expect(resultSect1.diagnostics.convention.sect).toBe(1);
  });

  // 11. Extreme geography and date-line tests
  test('Extreme West: Alaska (Adak, UTC-10)', () => {
    const result = calculateDualAxisBazi({
      place: 'Adak, Alaska',
      longitude: -176.65,
      timezone: 'America/Adak',
      solarDate: { year: 2000, month: 6, day: 21 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'male'
    });
    expect(result.diagnostics.wallClock).toContain('America/Adak');
  });

  test('Extreme East: New Zealand (Chatham Islands, UTC+12:45 / +13:45 DST)', () => {
    const result = calculateDualAxisBazi({
      place: 'Chatham Islands',
      longitude: -176.5,
      timezone: 'Pacific/Chatham',
      solarDate: { year: 2024, month: 1, day: 1 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'female'
    });
    expect(result.diagnostics.wallClock).toContain('Pacific/Chatham');
  });

  test('Line Islands: Kiribati (UTC+14, jumped date line in 1994)', () => {
    const result = calculateDualAxisBazi({
      place: 'Kiritimati',
      longitude: -157.36,
      timezone: 'Pacific/Kiritimati',
      solarDate: { year: 2000, month: 1, day: 1 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'male'
    });
    expect(result.diagnostics.wallClock).toContain('Pacific/Kiritimati');
  });

  test('Fractional offset: Nepal (UTC+5:45)', () => {
    const result = calculateDualAxisBazi({
      place: 'Kathmandu',
      longitude: 85.32,
      timezone: 'Asia/Kathmandu',
      solarDate: { year: 2024, month: 6, day: 15 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'female'
    });
    expect(result.diagnostics.wallClock).toContain('Asia/Kathmandu');
  });

  // 11. solarDate vs lunarDate mutual-exclusion validation
  it('Should reject input carrying both solarDate and lunarDate', () => {
    const result = BaziInputSchema.safeParse({
      solarDate: { year: 1988, month: 7, day: 1 },
      lunarDate: { year: 1988, month: 5, day: 18 },
      clockTime: { hour: 7, minute: 20 },
      timezone: 'Asia/Shanghai',
      longitude: 116.4074,
      gender: 'male',
    });
    expect(result.success).toBe(false);
  });

  // clockTime/shichen + timeUnknown must also be mutually exclusive (FIX 5a) —
  // previously clockTime silently won and timeUnknown just nulled the hour pillar.
  it('Should reject input carrying both clockTime and timeUnknown', () => {
    const result = BaziInputSchema.safeParse({
      solarDate: { year: 1988, month: 7, day: 1 },
      clockTime: { hour: 14, minute: 10 },
      timeUnknown: true,
      timezone: 'Asia/Shanghai',
      longitude: 116.4074,
      gender: 'male',
    });
    expect(result.success).toBe(false);
  });

  // 12. China civil-time convention: Xinjiang charts in Beijing time, candidates include
  // Asia/Urumqi, and a 2-hour offset difference is noted
  // (date chosen outside China's 1986-1991 historical DST years, so the offset
  // difference is the canonical 2 hours, not a DST-inflated one)
  it('Should default Urumqi (Xinjiang) to Beijing civil time with a timezoneResolution diagnostic and warning', () => {
    const result = calculateDualAxisBazi({
      place: 'Urumqi',
      solarDate: { year: 2000, month: 6, day: 15 },
      clockTime: { hour: 8, minute: 0 },
      gender: 'male',
    });
    expect(result.diagnostics.wallClock).toContain('Asia/Shanghai');
    expect(result.diagnostics.timezoneResolution).toEqual({
      used: 'Asia/Shanghai',
      candidates: ['Asia/Urumqi'],
      maxOffsetDiffHours: 2,
      note: expect.any(String),
    });
    expect(result.diagnostics.warnings.some(w => w.includes('Xinjiang local time'))).toBe(true);
  });

  // 13. Same policy takes effect via the lunarDate input path too
  it('Should apply the same Urumqi civil-time policy via the lunarDate input path', () => {
    const result = calculateDualAxisBazi({
      place: 'Urumqi',
      lunarDate: { year: 2000, month: 5, day: 14 },
      clockTime: { hour: 8, minute: 0 },
      gender: 'male',
    });
    expect(result.diagnostics.wallClock).toContain('Asia/Shanghai');
    expect(result.diagnostics.timezoneResolution?.candidates).toEqual(['Asia/Urumqi']);
    expect(result.diagnostics.warnings.some(w => w.includes('Xinjiang local time'))).toBe(true);
  });

  // 14. geo-tz already corrects the Pingxiang/Guangxi border artifact at the geometry
  // level (previously fell into Asia/Bangkok via tz-lookup; geo-tz returns a single
  // Asia/Shanghai candidate directly): no candidates, no warning, no timezoneResolution
  it('Should resolve Pingxiang, Guangxi cleanly to Asia/Shanghai with no warning and no timezoneResolution', () => {
    const result = calculateDualAxisBazi({
      place: 'Pingxiang, Guangxi',
      solarDate: { year: 2000, month: 6, day: 15 },
      clockTime: { hour: 8, minute: 0 },
      gender: 'male',
    });
    expect(result.diagnostics.wallClock).toContain('Asia/Shanghai');
    expect(result.diagnostics.timezoneResolution).toBeUndefined();
    expect(result.diagnostics.warnings).toEqual([]);
  });

  // 15. Explicitly passing timezone is the escape hatch: no override, no warning
  it('Should respect an explicit timezone: "Asia/Urumqi" override with no warning', () => {
    const result = calculateDualAxisBazi({
      place: 'Urumqi',
      timezone: 'Asia/Urumqi',
      solarDate: { year: 2000, month: 6, day: 15 },
      clockTime: { hour: 8, minute: 0 },
      gender: 'male',
    });
    expect(result.diagnostics.wallClock).toContain('Asia/Urumqi');
    expect(result.diagnostics.timezoneResolution).toBeUndefined();
    expect(result.diagnostics.warnings).toEqual([]);
  });

  // 16. A same-offset overlap (Guajara-Miram, BR: America/Porto_Velho and
  // America/Puerto_Rico are both UTC-4 at this instant) is not a genuine ambiguity
  // and must not produce any warning or timezoneResolution
  it('Should produce no warning for a same-UTC-offset timezone overlap (Guajara-Miram, BR)', () => {
    const result = calculateDualAxisBazi({
      place: 'Guajara-Miram',
      solarDate: { year: 2000, month: 6, day: 15 },
      clockTime: { hour: 8, minute: 0 },
      gender: 'male',
    });
    expect(result.diagnostics.wallClock).toContain('America/Porto_Velho');
    expect(result.diagnostics.timezoneResolution).toBeUndefined();
    expect(result.diagnostics.warnings).toEqual([]);
  });
});
