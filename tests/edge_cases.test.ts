import { describe, it, expect } from 'bun:test';
import { calculateDualAxisBazi } from '../src/core/dual-axis';
import { tzOffsetMinutes } from '../src/core/time';

describe('Extra Edge Cases', () => {
  it('Should handle Southern Hemisphere timezone and its DST (Australia/Sydney in January)', () => {
    const result = calculateDualAxisBazi({
      place: 'Sydney',
      longitude: 151.2093,
      timezone: 'Australia/Sydney',
      solarDate: { year: 2024, month: 1, day: 15 }, // Summer in Sydney (DST)
      clockTime: { hour: 12, minute: 0 },
      gender: 'male'
    });
    expect(result.诊断.钟面).toContain('Australia/Sydney');
    expect(result.诊断.时区偏移).toContain('夏令时生效'); // Should correctly identify DST in January
  });

  it('Should handle Southern Hemisphere timezone in winter (Australia/Sydney in July)', () => {
    const result = calculateDualAxisBazi({
      place: 'Sydney',
      longitude: 151.2093,
      timezone: 'Australia/Sydney',
      solarDate: { year: 2024, month: 7, day: 15 }, // Winter in Sydney (No DST)
      clockTime: { hour: 12, minute: 0 },
      gender: 'male'
    });
    expect(result.诊断.时区偏移).not.toContain('夏令时生效'); // Not DST in July
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
    expect(result.诊断.经度修正分钟).toBeLessThan(0);
    expect(result.诊断.时区偏移).toBeDefined();
  });

  it('Should handle sect=1 (default 00:00 boundary) vs sect=2 (23:00 boundary) for late Zi hour', () => {
    const date = { year: 2024, month: 5, day: 10 };
    const time = { hour: 23, minute: 30 };
    
    // Sect 1: Late Zi hour (23:30) belongs to the SAME day
    const resultSect1 = calculateDualAxisBazi({
      place: 'Beijing',
      longitude: 116.4,
      timezone: 'Asia/Shanghai',
      solarDate: date,
      clockTime: time,
      gender: 'male',
      sect: 1
    });

    // Sect 2: Late Zi hour (23:30) belongs to the NEXT day
    const resultSect2 = calculateDualAxisBazi({
      place: 'Beijing',
      longitude: 116.4,
      timezone: 'Asia/Shanghai',
      solarDate: date,
      clockTime: time,
      gender: 'male',
      sect: 2
    });

    // In sect=2, the day pillar should advance compared to sect=1
    expect(resultSect1.pillars.day.ganZhi).not.toBe(resultSect2.pillars.day.ganZhi);
    expect(resultSect2.诊断.口径.sect).toBe(2);
    expect(resultSect1.诊断.口径.sect).toBe(1);
  });
});
