import { describe, it, expect } from 'bun:test';
import { calculateDualAxisBazi } from '../src/core/dual-axis';

/**
 * 权威公开实测命例测试套件 (Authoritative & Verified Real-World Benchmark Cases)
 * 数据来源：
 * 1. Astro-Databank (Rodden Rating AA: 医院官方出生证明 Birth Certificate)
 * 2. 中华民国及现代官方人物传记/方志/谱牒官方档案 (Official Historical Archives)
 * 3. 经典命理文献实录 (如韦千里《千里命稿》、梁启超《饮冰室合集》)
 * 4. VSOP87 节气与高精度天文日历交叉实测
 */
describe('权威真实命例回归测试 (Authoritative Real-World Benchmark Suite)', () => {
  // ── 一、Astro-Databank 官方出生证 (Rodden Rating AA) 命例 ──

  // 1. 唐纳德·特朗普 (Donald Trump)
  // 出生记录：1946年6月14日 10:54 EDT (夏令时 UTC-4)，美国纽约皇后区 (Queens, NY: -73.7949, 40.7282)
  // 真太阳时修正：10:54 - 60m(DST) + 4.8m(经度) + 0.1m(时差方程) ≈ 09:59 (巳时)
  it('Astro-Databank AA: Donald Trump (1946-06-14 10:54 EDT Queens, NY)', () => {
    const res = calculateDualAxisBazi({
      place: 'New York, NY',
      solarDate: { year: 1946, month: 6, day: 14 },
      clockTime: { hour: 10, minute: 54 },
      gender: 'male',
    });
    expect(res.四柱).toBe('丙戌 甲午 己未 己巳');
    expect(res.dayMaster.char).toBe('己');
    expect(res.诊断.时区偏移).toContain('夏令时生效');
  });

  // 2. 贝拉克·奥巴马 (Barack Obama)
  // 出生记录：1961年8月4日 19:24 HST (夏威夷标准时 UTC-10 无夏令时)，美国檀香山 (Honolulu, HI: -157.8583, 21.3069)
  // 真太阳时修正：19:24 - 31.4m(经度) - 5.8m(时差方程) ≈ 18:47 (酉时)
  it('Astro-Databank AA: Barack Obama (1961-08-04 19:24 HST Honolulu, HI)', () => {
    const res = calculateDualAxisBazi({
      place: 'Honolulu, HI',
      solarDate: { year: 1961, month: 8, day: 4 },
      clockTime: { hour: 19, minute: 24 },
      gender: 'male',
    });
    expect(res.四柱).toBe('辛丑 乙未 己巳 癸酉');
    expect(res.dayMaster.char).toBe('己');
  });

  // 3. 比尔·盖茨 (Bill Gates)
  // 出生记录：1955年10月28日 22:00 PST (标准时 UTC-8)，美国华盛顿州西雅图 (Seattle, WA: -122.3321, 47.6062)
  // 真太阳时修正：22:00 - 9.3m(经度) + 16.1m(时差方程) ≈ 22:07 (亥时)
  it('Astro-Databank AA: Bill Gates (1955-10-28 22:00 PST Seattle, WA)', () => {
    const res = calculateDualAxisBazi({
      place: 'Seattle, WA',
      solarDate: { year: 1955, month: 10, day: 28 },
      clockTime: { hour: 22, minute: 0 },
      gender: 'male',
    });
    expect(res.四柱).toBe('乙未 丙戌 壬戌 辛亥');
    expect(res.dayMaster.char).toBe('壬');
  });

  // 4. 史蒂夫·乔布斯 (Steve Jobs) - 严谨真太阳时校准
  // 出生记录：1955年2月24日 19:15 PST (旧金山 San Francisco, CA: -122.4194)
  // 钟表 19:15 表面为戌时，但经真太阳时计算：-9.68m (经度) - 13.32m (2月时差方程) = 18:52 (实为酉时 丁酉)
  it('Astro-Databank AA: Steve Jobs (1955-02-24 19:15 PST San Francisco, CA) - True Solar Time Check', () => {
    const res = calculateDualAxisBazi({
      place: 'San Francisco, CA',
      solarDate: { year: 1955, month: 2, day: 24 },
      clockTime: { hour: 19, minute: 15 },
      gender: 'male',
    });
    expect(res.四柱).toBe('乙未 戊寅 丙辰 丁酉');
    expect(res.pillars.hour?.ganZhi).toBe('丁酉');
    expect(res.dayMaster.char).toBe('丙');
  });

  // 5. 阿尔伯特·爱因斯坦 (Albert Einstein)
  // 出生记录：1879年3月14日 11:30，德国乌尔姆 (Ulm: 9.9916°E, 48.4011°N, Europe/Berlin)
  it('Civil Registry: Albert Einstein (1879-03-14 11:30 Ulm, Germany)', () => {
    const res = calculateDualAxisBazi({
      timezone: 'Europe/Berlin',
      longitude: 9.9916,
      solarDate: { year: 1879, month: 3, day: 14 },
      clockTime: { hour: 11, minute: 30 },
      gender: 'male',
    });
    expect(res.四柱).toBe('己卯 丁卯 丙申 甲午');
    expect(res.dayMaster.char).toBe('丙');
  });

  // ── 二、中国近代历史人物官方档案与典籍实录 ──

  // 6. 蒋介石 - 民国韦千里《千里命稿》经典实录
  // 出生记录：清光绪十三年九月十五日午时 (公历 1887年10月31日 12:00)，浙江省奉化县溪口镇
  it('Historical: Chiang Kai-shek (1887-10-31 12:00 Zhejiang Fenghua - 《千里命稿》)', () => {
    const res = calculateDualAxisBazi({
      place: 'Ningbo',
      solarDate: { year: 1887, month: 10, day: 31 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'male',
    });
    expect(res.四柱).toBe('丁亥 庚戌 己巳 庚午');
    expect(res.dayMaster.char).toBe('己');
  });

  // 7. 梁启超 - 广东新会茶坑村，《饮冰室合集》自述
  // 出生记录：清同治十二年正月二十六日丑时 (公历 1873年2月23日 丑时)
  it('Historical: Liang Qichao (1873-02-23 丑时 Guangdong Xinhui)', () => {
    const res = calculateDualAxisBazi({
      place: 'Guangzhou',
      solarDate: { year: 1873, month: 2, day: 23 },
      shichen: '丑',
      gender: 'male',
    });
    expect(res.四柱).toBe('癸酉 甲寅 丙午 己丑');
    expect(res.dayMaster.char).toBe('丙');
  });

  // 8. 毛泽东 - 湖南韶山官方生辰记录
  // 出生记录：清光绪十九年十一月十九日辰时 (公历 1893年12月26日 辰时)
  it('Historical: Mao Zedong (1893-12-26 辰时 Hunan Shaoshan)', () => {
    const res = calculateDualAxisBazi({
      place: 'Changsha',
      solarDate: { year: 1893, month: 12, day: 26 },
      shichen: '辰',
      gender: 'male',
    });
    expect(res.四柱).toBe('癸巳 甲子 丁酉 甲辰');
    expect(res.dayMaster.char).toBe('丁');
  });

  // 9. 周恩来 - 江苏淮安官方生辰记录
  // 出生记录：清光绪二十四年二月十三日卯时 (公历 1898年3月5日 卯时)
  it('Historical: Zhou Enlai (1898-03-05 卯时 Jiangsu Huaian)', () => {
    const res = calculateDualAxisBazi({
      place: 'Nanjing',
      solarDate: { year: 1898, month: 3, day: 5 },
      shichen: '卯',
      gender: 'male',
    });
    expect(res.四柱).toBe('戊戌 甲寅 丁卯 癸卯');
    expect(res.dayMaster.char).toBe('丁');
  });

  // 10. 邓小平 - 四川广安官方生辰记录
  // 出生记录：清光绪三十年七月十二日申时 (公历 1904年8月22日 申时)
  it('Historical: Deng Xiaoping (1904-08-22 申时 Sichuan Guangan)', () => {
    const res = calculateDualAxisBazi({
      place: 'Chongqing',
      solarDate: { year: 1904, month: 8, day: 22 },
      shichen: '申',
      gender: 'male',
    });
    expect(res.四柱).toBe('甲辰 壬申 戊子 庚申');
    expect(res.dayMaster.char).toBe('戊');
  });
});
