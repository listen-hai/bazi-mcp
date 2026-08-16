import { expect, test, describe } from 'bun:test';
import { calculateDualAxisBazi } from '../src/core/dual-axis';

describe('Extreme Geo and Timeline Boundaries Tests', () => {
  test('Extreme West: Alaska (Adak, UTC-10)', () => {
    const result = calculateDualAxisBazi({
      place: 'Adak, Alaska',
      longitude: -176.65, // Adak
      timezone: 'America/Adak',
      solarDate: { year: 2000, month: 6, day: 21 }, // Summer solstice area
      clockTime: { hour: 12, minute: 0 },
      gender: 'male'
    });
    expect(result.诊断.钟面).toContain('America/Adak');
  });

  test('Extreme East: New Zealand (Chatham Islands, UTC+12:45 / +13:45 DST)', () => {
    const result = calculateDualAxisBazi({
      place: 'Chatham Islands',
      longitude: -176.5, // Note: Chatham is around -176.5 but uses +12:45
      timezone: 'Pacific/Chatham',
      solarDate: { year: 2024, month: 1, day: 1 }, // Summer in Southern Hemisphere (DST active)
      clockTime: { hour: 12, minute: 0 },
      gender: 'female'
    });
    expect(result.诊断.钟面).toContain('Pacific/Chatham');
    // Chatham has a 45-minute offset, timezone string should reflect that
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
    expect(result.诊断.钟面).toContain('Pacific/Kiritimati');
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
    expect(result.诊断.钟面).toContain('Asia/Kathmandu');
  });
});
