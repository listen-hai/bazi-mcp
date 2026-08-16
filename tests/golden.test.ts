import { describe, it, expect } from 'bun:test';
import { calculateDualAxisBazi } from '../src/core/dual-axis';

describe('8.1 Golden Test Suite (金标用例实测)', () => {
  // G1: 1998-07-31 14:10, Asia/Shanghai, 116.4074 -> 戊寅 己未 己卯 辛未
  it('G1: Baseline China - Beijing standard', () => {
    const res = calculateDualAxisBazi({
      solarDate: { year: 1998, month: 7, day: 31 },
      clockTime: { hour: 14, minute: 10 },
      timezone: 'Asia/Shanghai',
      longitude: 116.4074,
      gender: 'male',
    });
    expect(res.四柱).toBe('戊寅 己未 己卯 辛未');
    expect(res.pillars.year.ganZhi).toBe('戊寅');
    expect(res.pillars.month.ganZhi).toBe('己未');
    expect(res.pillars.day.ganZhi).toBe('己卯');
    expect(res.pillars.hour?.ganZhi).toBe('辛未');
    expect(res.诊断.口径.年龄基准).toBe('虚岁');
    expect(res.daYun.startAgeNominal).toBeGreaterThanOrEqual(1);
  });

  // G2: 2024-02-04 08:00, America/Los_Angeles, -122.4443 -> 甲辰 丙寅 戊戌 丙辰
  // 立春 2024 = 2024-02-04 16:26:56 CST = 00:26:56 PST, 出生在立春后 7.5 小时，年柱必须为甲辰
  it('G2: Overseas Solar Term Boundary (立春跨年柱)', () => {
    const res = calculateDualAxisBazi({
      solarDate: { year: 2024, month: 2, day: 4 },
      clockTime: { hour: 8, minute: 0 },
      timezone: 'America/Los_Angeles',
      longitude: -122.4443,
      gender: 'male',
    });
    expect(res.四柱).toBe('甲辰 丙寅 戊戌 丙辰');
    expect(res.pillars.year.ganZhi).toBe('甲辰');
    expect(res.pillars.month.ganZhi).toBe('丙寅');
    expect(res.pillars.day.ganZhi).toBe('戊戌');
    expect(res.pillars.hour?.ganZhi).toBe('丙辰');
  });

  // G3: 1990-06-15 20:00, America/Los_Angeles, -122.4443 -> 庚午 壬午 辛亥 丁酉
  // 海外跨日 + 美国夏令时
  it('G3: Overseas Day Roll + US DST', () => {
    const res = calculateDualAxisBazi({
      solarDate: { year: 1990, month: 6, day: 15 },
      clockTime: { hour: 20, minute: 0 },
      timezone: 'America/Los_Angeles',
      longitude: -122.4443,
      gender: 'male',
    });
    expect(res.四柱).toBe('庚午 壬午 辛亥 丁酉');
    expect(res.pillars.year.ganZhi).toBe('庚午');
    expect(res.pillars.month.ganZhi).toBe('壬午');
    expect(res.pillars.day.ganZhi).toBe('辛亥');
    expect(res.pillars.hour?.ganZhi).toBe('丁酉');
    expect(res.诊断.时区偏移).toContain('夏令时生效');
  });

  // G4: 1990-06-15 08:00, Asia/Shanghai, 87.6168 -> 庚午 壬午 辛亥 庚寅
  // 新疆大经度差 + 中国夏令时
  it('G4: Xinjiang Large Longitude Shift + China DST', () => {
    const res = calculateDualAxisBazi({
      solarDate: { year: 1990, month: 6, day: 15 },
      clockTime: { hour: 8, minute: 0 },
      timezone: 'Asia/Shanghai',
      longitude: 87.6168,
      gender: 'male',
    });
    expect(res.四柱).toBe('庚午 壬午 辛亥 庚寅');
    expect(res.pillars.year.ganZhi).toBe('庚午');
    expect(res.pillars.month.ganZhi).toBe('壬午');
    expect(res.pillars.day.ganZhi).toBe('辛亥');
    expect(res.pillars.hour?.ganZhi).toBe('庚寅');
    expect(res.诊断.时区偏移).toContain('夏令时生效');
  });

  // G5: 1988-07-01 07:20, Asia/Shanghai, 116.4074 -> 戊辰 戊午 丁巳 癸卯
  // 中国历史夏令时 (1988年)
  it('G5: China Historical DST (1988)', () => {
    const res = calculateDualAxisBazi({
      solarDate: { year: 1988, month: 7, day: 1 },
      clockTime: { hour: 7, minute: 20 },
      timezone: 'Asia/Shanghai',
      longitude: 116.4074,
      gender: 'male',
    });
    expect(res.四柱).toBe('戊辰 戊午 丁巳 癸卯');
    expect(res.pillars.year.ganZhi).toBe('戊辰');
    expect(res.pillars.month.ganZhi).toBe('戊午');
    expect(res.pillars.day.ganZhi).toBe('丁巳');
    expect(res.pillars.hour?.ganZhi).toBe('癸卯');
    expect(res.诊断.时区偏移).toContain('夏令时生效');
  });
});
