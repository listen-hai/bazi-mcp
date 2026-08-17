import { describe, it, expect, test } from 'bun:test';
import { calculateDualAxisBazi } from '../src/core/dual-axis';
import { resolveLocation, lookupCity } from '../src/geo/resolver';
import { BaziInputSchema } from '../src/schemas/input';

describe('8.5 Boundary, DST & Edge Case Tests (边界与异常测试)', () => {
  // 1. 夏令时春季跳跃不存在时刻
  it('Should throw error for nonexistent spring-forward DST clock time', () => {
    expect(() => {
      calculateDualAxisBazi({
        timezone: 'America/Los_Angeles',
        longitude: -122.4443,
        solarDate: { year: 1990, month: 4, day: 1 },
        clockTime: { hour: 2, minute: 30 },
        gender: 'male',
      });
    }).toThrow('不存在（因夏令时春季跳跃）');
  });

  // 2. 夏令时秋季折返重叠时刻（缺少 dstFold 抛出消歧错误）
  it('Should throw error for ambiguous fall-back DST fold when dstFold is missing', () => {
    expect(() => {
      calculateDualAxisBazi({
        timezone: 'America/Los_Angeles',
        longitude: -122.4443,
        solarDate: { year: 1990, month: 10, day: 28 },
        clockTime: { hour: 1, minute: 30 },
        gender: 'male',
      });
    }).toThrow('存在夏令时折返歧义');
  });

  // 3. 夏令时秋季折返消歧（dstFold = 0 vs dstFold = 1）
  it('Should disambiguate fall-back DST fold with dstFold=0 and dstFold=1', () => {
    const resFold0 = calculateDualAxisBazi({
      timezone: 'America/Los_Angeles',
      longitude: -122.4443,
      solarDate: { year: 1990, month: 10, day: 28 },
      clockTime: { hour: 1, minute: 30 },
      dstFold: 0,
      gender: 'male',
    });
    expect(resFold0.诊断.UTC瞬时).toBe('1990-10-28T08:30:00.000Z');
    expect(resFold0.诊断.时区偏移).toContain('-07:00');

    const resFold1 = calculateDualAxisBazi({
      timezone: 'America/Los_Angeles',
      longitude: -122.4443,
      solarDate: { year: 1990, month: 10, day: 28 },
      clockTime: { hour: 1, minute: 30 },
      dstFold: 1,
      gender: 'male',
    });
    expect(resFold1.诊断.UTC瞬时).toBe('1990-10-28T09:30:00.000Z');
    expect(resFold1.诊断.时区偏移).toContain('-08:00');
  });

  // 4. 农历真实闰月支持（2020 闰四月十五 -> 庚辰日）
  it('Should correctly calculate valid leap lunar month', () => {
    const res = calculateDualAxisBazi({
      place: 'Beijing',
      lunarDate: { year: 2020, month: 4, day: 15, isLeapMonth: true },
      clockTime: { hour: 12, minute: 0 },
      gender: 'male',
    });
    expect(res.pillars.day.ganZhi).toBe('庚辰');
    expect(res.诊断.农历?.农历描述).toContain('闰4月15日');
  });

  // 5. 非法闰月拦截
  it('Should reject invalid leap lunar month', () => {
    expect(() => {
      calculateDualAxisBazi({
        place: 'Beijing',
        lunarDate: { year: 2021, month: 4, day: 15, isLeapMonth: true },
        clockTime: { hour: 12, minute: 0 },
        gender: 'male',
      });
    }).toThrow('农历日期换算失败');
  });

  // 6. 三柱盘（timeUnknown: true）
  it('Should output three-pillar chart when time is unknown', () => {
    const res = calculateDualAxisBazi({
      place: 'Guangzhou',
      solarDate: { year: 1998, month: 7, day: 31 },
      timeUnknown: true,
      gender: 'male',
    });
    expect(res.四柱).toContain('[时辰未知]');
    expect(res.pillars.hour).toBeNull();
    expect(res.pillars.year.ganZhi).toBe('戊寅');
    expect(res.pillars.month.ganZhi).toBe('己未');
    expect(res.pillars.day.ganZhi).toBe('己卯');
    expect(res.daYun.cycles.length).toBeGreaterThan(0);
  });

  // 7. 时辰中点取样与真太阳时位移歧义
  it('Should detect shichen True Solar shift ambiguity in Urumqi', () => {
    const res = calculateDualAxisBazi({
      place: 'Urumqi',
      solarDate: { year: 1990, month: 6, day: 15 },
      shichen: '未',
      gender: 'male',
    });
    expect(res.诊断.时辰歧义?.isAmbiguous).toBe(true);
    expect(res.诊断.时辰歧义?.候选时柱.length).toBeGreaterThan(1);
    expect(res.诊断.警告.some(w => w.includes('跨越时辰边界'))).toBe(true);
  });

  // 8. 1901 年前中国历史时区提示
  it('Should add warning for pre-1901 China dates', () => {
    const res = calculateDualAxisBazi({
      place: 'Shanghai',
      solarDate: { year: 1895, month: 5, day: 1 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'male',
    });
    expect(res.诊断.historicalTzApprox).toBe(true);
    expect(res.诊断.警告.some(w => w.includes('1901年前中国各地采用地方平时'))).toBe(true);
  });

  // 9. 地理查询与消歧
  it('Should resolve city or report multiple candidates', () => {
    const gz = lookupCity('Guangzhou');
    expect(gz.length).toBe(1);
    expect(gz[0].timezone).toBe('Asia/Shanghai');

    const tacoma = lookupCity('Tacoma');
    expect(tacoma.length).toBe(1);
    expect(tacoma[0].timezone).toBe('America/Los_Angeles');

    expect(() => {
      resolveLocation({ place: 'NonExistentCity999' });
    }).toThrow('未能识别出生地');
  });

  // 10. 南半球时区与夏令时
  it('Should handle Southern Hemisphere timezone and its DST (Australia/Sydney in January)', () => {
    const result = calculateDualAxisBazi({
      place: 'Sydney',
      longitude: 151.2093,
      timezone: 'Australia/Sydney',
      solarDate: { year: 2024, month: 1, day: 15 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'male'
    });
    expect(result.诊断.钟面).toContain('Australia/Sydney');
    expect(result.诊断.时区偏移).toContain('夏令时生效');
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
    expect(result.诊断.时区偏移).not.toContain('夏令时生效');
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
    expect(resultSect2.诊断.口径.sect).toBe(2);
    expect(resultSect1.诊断.口径.sect).toBe(1);
  });

  // 11. 极值地理与时间线测试
  test('Extreme West: Alaska (Adak, UTC-10)', () => {
    const result = calculateDualAxisBazi({
      place: 'Adak, Alaska',
      longitude: -176.65,
      timezone: 'America/Adak',
      solarDate: { year: 2000, month: 6, day: 21 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'male'
    });
    expect(result.诊断.钟面).toContain('America/Adak');
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
    expect(result.诊断.钟面).toContain('Pacific/Chatham');
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

  // 11. solarDate 与 lunarDate 互斥校验
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
});
