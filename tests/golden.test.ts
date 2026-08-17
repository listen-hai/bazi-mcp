import { describe, it, expect } from 'bun:test';
import { calculateDualAxisBazi } from '../src/core/dual-axis';
import { calculateTenGod, getMainQi } from '@openfate/bazi-engine';

describe('8.1 Golden Test Suite', () => {
  // G1: 1998-07-31 14:10, Asia/Shanghai, 116.4074 -> 戊寅 己未 己卯 辛未
  it('G1: Baseline China - Beijing standard', () => {
    const res = calculateDualAxisBazi({
      solarDate: { year: 1998, month: 7, day: 31 },
      clockTime: { hour: 14, minute: 10 },
      timezone: 'Asia/Shanghai',
      longitude: 116.4074,
      gender: 'male',
    });
    expect(res.fourPillars).toBe('戊寅 己未 己卯 辛未');
    expect(res.pillars.year.ganZhi).toBe('戊寅');
    expect(res.pillars.month.ganZhi).toBe('己未');
    expect(res.pillars.day.ganZhi).toBe('己卯');
    expect(res.pillars.hour?.ganZhi).toBe('辛未');
    expect(res.diagnostics.convention.ageBasis).toBe('nominal');
    expect(res.daYun.startAgeNominal).toBeGreaterThanOrEqual(1);
  });

  // G2: 2024-02-04 08:00, America/Los_Angeles, -122.4443 -> 甲辰 丙寅 戊戌 丙辰
  // Lichun (Start of Spring) 2024 = 2024-02-04 16:26:56 CST = 00:26:56 PST; born 7.5 hours after
  // Lichun, so the Year pillar must be 甲辰
  it('G2: Overseas Solar Term Boundary (Lichun crosses the Year pillar)', () => {
    const res = calculateDualAxisBazi({
      solarDate: { year: 2024, month: 2, day: 4 },
      clockTime: { hour: 8, minute: 0 },
      timezone: 'America/Los_Angeles',
      longitude: -122.4443,
      gender: 'male',
    });
    expect(res.fourPillars).toBe('甲辰 丙寅 戊戌 丙辰');
    expect(res.pillars.year.ganZhi).toBe('甲辰');
    expect(res.pillars.month.ganZhi).toBe('丙寅');
    expect(res.pillars.day.ganZhi).toBe('戊戌');
    expect(res.pillars.hour?.ganZhi).toBe('丙辰');
  });

  // G3: 1990-06-15 20:00, America/Los_Angeles, -122.4443 -> 庚午 壬午 辛亥 丁酉
  // Overseas day roll + US DST
  it('G3: Overseas Day Roll + US DST', () => {
    const res = calculateDualAxisBazi({
      solarDate: { year: 1990, month: 6, day: 15 },
      clockTime: { hour: 20, minute: 0 },
      timezone: 'America/Los_Angeles',
      longitude: -122.4443,
      gender: 'male',
    });
    expect(res.fourPillars).toBe('庚午 壬午 辛亥 丁酉');
    expect(res.pillars.year.ganZhi).toBe('庚午');
    expect(res.pillars.month.ganZhi).toBe('壬午');
    expect(res.pillars.day.ganZhi).toBe('辛亥');
    expect(res.pillars.hour?.ganZhi).toBe('丁酉');
    expect(res.diagnostics.utcOffset).toContain('DST in effect');
  });

  // G3 also pins the Ten God computation: day master 辛, hour stem 丁 -> 七杀
  it('G3: Hour stemTenGod is correctly 七杀 for day master 辛 / hour stem 丁', () => {
    const res = calculateDualAxisBazi({
      solarDate: { year: 1990, month: 6, day: 15 },
      clockTime: { hour: 20, minute: 0 },
      timezone: 'America/Los_Angeles',
      longitude: -122.4443,
      gender: 'male',
    });
    expect(res.dayMaster.char).toBe('辛');
    expect(res.pillars.hour?.stem).toBe('丁');
    expect(calculateTenGod('辛', '丁')).toBe('七杀'); // sanity-check correct engine call order
    expect(res.pillars.hour?.stemTenGod).toBe('七杀');
  });

  // G3's Axis A (Beijing wall clock) rolls to a different calendar day than Axis B
  // (local true solar time), so Axis A's own internal day master differs from the
  // true day master (Axis B's). Da Yun branchTenGod must be keyed to the true day master.
  it('G3: Da Yun branchTenGod is keyed to the true (Axis B) day master, not Axis A\'s', () => {
    const res = calculateDualAxisBazi({
      solarDate: { year: 1990, month: 6, day: 15 },
      clockTime: { hour: 20, minute: 0 },
      timezone: 'America/Los_Angeles',
      longitude: -122.4443,
      gender: 'male',
    });
    const cycle0 = res.daYun.cycles[0];
    const expected = calculateTenGod(res.dayMaster.char, getMainQi(cycle0.branch));
    expect(cycle0.branchTenGod).toBe(expected);
    expect(cycle0.branchTenGod).toBe('偏印');
  });

  // G4: 1990-06-15 08:00, Asia/Shanghai, 87.6168 -> 庚午 壬午 辛亥 庚寅
  // Xinjiang large longitude shift + China DST
  it('G4: Xinjiang Large Longitude Shift + China DST', () => {
    const res = calculateDualAxisBazi({
      solarDate: { year: 1990, month: 6, day: 15 },
      clockTime: { hour: 8, minute: 0 },
      timezone: 'Asia/Shanghai',
      longitude: 87.6168,
      gender: 'male',
    });
    expect(res.fourPillars).toBe('庚午 壬午 辛亥 庚寅');
    expect(res.pillars.year.ganZhi).toBe('庚午');
    expect(res.pillars.month.ganZhi).toBe('壬午');
    expect(res.pillars.day.ganZhi).toBe('辛亥');
    expect(res.pillars.hour?.ganZhi).toBe('庚寅');
    expect(res.diagnostics.utcOffset).toContain('DST in effect');
  });

  // G5: 1988-07-01 07:20, Asia/Shanghai, 116.4074 -> 戊辰 戊午 丁巳 癸卯
  // China historical DST (1988)
  it('G5: China Historical DST (1988)', () => {
    const res = calculateDualAxisBazi({
      solarDate: { year: 1988, month: 7, day: 1 },
      clockTime: { hour: 7, minute: 20 },
      timezone: 'Asia/Shanghai',
      longitude: 116.4074,
      gender: 'male',
    });
    expect(res.fourPillars).toBe('戊辰 戊午 丁巳 癸卯');
    expect(res.pillars.year.ganZhi).toBe('戊辰');
    expect(res.pillars.month.ganZhi).toBe('戊午');
    expect(res.pillars.day.ganZhi).toBe('丁巳');
    expect(res.pillars.hour?.ganZhi).toBe('癸卯');
    expect(res.diagnostics.utcOffset).toContain('DST in effect');
  });

  // G5 equivalence: the same physical birth entered as lunarDate {1988,5,18} with
  // lunarDateFrame:'beijing' must derive the instant via the real Asia/Shanghai
  // offset (not a hardcoded +8), so it matches the solarDate 1988-07-01 chart
  // exactly, even though 1986-1991 China observed summer DST (UTC+9).
  it('G5: lunarDate {1988,5,18} frame=beijing matches solarDate 1988-07-01 exactly', () => {
    const solar = calculateDualAxisBazi({
      solarDate: { year: 1988, month: 7, day: 1 },
      clockTime: { hour: 7, minute: 20 },
      timezone: 'Asia/Shanghai',
      longitude: 116.4074,
      gender: 'male',
    });
    const lunar = calculateDualAxisBazi({
      lunarDate: { year: 1988, month: 5, day: 18 },
      lunarDateFrame: 'beijing',
      clockTime: { hour: 7, minute: 20 },
      timezone: 'Asia/Shanghai',
      longitude: 116.4074,
      gender: 'male',
    });
    expect(lunar.fourPillars).toBe(solar.fourPillars);
    expect(lunar.diagnostics.utcInstant).toBe(solar.diagnostics.utcInstant);
    expect(solar.diagnostics.utcInstant).toBe('1988-06-30T22:20:00.000Z');
  });
});
