import { describe, it, expect } from 'bun:test';
import { calculateDualAxisBazi } from '../src/core/dual-axis';

/**
 * Authoritative & Verified Real-World Benchmark Cases
 * Data sources:
 * 1. Astro-Databank (Rodden Rating AA: official hospital Birth Certificate)
 * 2. Official historical archives of Republic-era and modern public figures
 *    (biographies, local gazetteers, genealogical records)
 * 3. Classical Bazi literature (e.g. Wei Qianli's Qianli Minggao, Liang Qichao's
 *    collected works Yinbingshi Heji)
 * 4. Cross-checked against VSOP87 solar terms and high-precision astronomical ephemeris
 */
describe('Authoritative Real-World Benchmark Suite', () => {
  // ── I. Astro-Databank official birth certificate (Rodden Rating AA) cases ──

  // 1. Donald Trump
  // Birth record: 1946-06-14 10:54 EDT (DST, UTC-4), Queens, NY, USA (-73.7949, 40.7282)
  // True Solar Time correction: 10:54 - 60m(DST) + 4.8m(longitude) + 0.1m(equation of time) ≈ 09:59 (巳 hour)
  it('Astro-Databank AA: Donald Trump (1946-06-14 10:54 EDT Queens, NY)', () => {
    const res = calculateDualAxisBazi({
      place: 'New York, NY',
      solarDate: { year: 1946, month: 6, day: 14 },
      clockTime: { hour: 10, minute: 54 },
      gender: 'male',
    });
    expect(res.fourPillars).toBe('丙戌 甲午 己未 己巳');
    expect(res.dayMaster.char).toBe('己');
    expect(res.diagnostics.utcOffset).toContain('DST in effect');
  });

  // 2. Barack Obama
  // Birth record: 1961-08-04 19:24 HST (Hawaii Standard Time, UTC-10, no DST), Honolulu, HI, USA (-157.8583, 21.3069)
  // True Solar Time correction: 19:24 - 31.4m(longitude) - 5.8m(equation of time) ≈ 18:47 (酉 hour)
  it('Astro-Databank AA: Barack Obama (1961-08-04 19:24 HST Honolulu, HI)', () => {
    const res = calculateDualAxisBazi({
      place: 'Honolulu, HI',
      solarDate: { year: 1961, month: 8, day: 4 },
      clockTime: { hour: 19, minute: 24 },
      gender: 'male',
    });
    expect(res.fourPillars).toBe('辛丑 乙未 己巳 癸酉');
    expect(res.dayMaster.char).toBe('己');
  });

  // 3. Bill Gates
  // Birth record: 1955-10-28 22:00 PST (standard time, UTC-8), Seattle, WA, USA (-122.3321, 47.6062)
  // True Solar Time correction: 22:00 - 9.3m(longitude) + 16.1m(equation of time) ≈ 22:07 (亥 hour)
  it('Astro-Databank AA: Bill Gates (1955-10-28 22:00 PST Seattle, WA)', () => {
    const res = calculateDualAxisBazi({
      place: 'Seattle, WA',
      solarDate: { year: 1955, month: 10, day: 28 },
      clockTime: { hour: 22, minute: 0 },
      gender: 'male',
    });
    expect(res.fourPillars).toBe('乙未 丙戌 壬戌 辛亥');
    expect(res.dayMaster.char).toBe('壬');
  });

  // 4. Steve Jobs - rigorous True Solar Time calibration check
  // Birth record: 1955-02-24 19:15 PST, San Francisco, CA (-122.4194)
  // Clock time 19:15 nominally falls in the 戌 hour, but under True Solar Time:
  // -9.68m (longitude) - 13.32m (February equation of time) = 18:52 (actually the 酉 hour, 丁酉)
  it('Astro-Databank AA: Steve Jobs (1955-02-24 19:15 PST San Francisco, CA) - True Solar Time Check', () => {
    const res = calculateDualAxisBazi({
      place: 'San Francisco, CA',
      solarDate: { year: 1955, month: 2, day: 24 },
      clockTime: { hour: 19, minute: 15 },
      gender: 'male',
    });
    expect(res.fourPillars).toBe('乙未 戊寅 丙辰 丁酉');
    expect(res.pillars.hour?.ganZhi).toBe('丁酉');
    expect(res.dayMaster.char).toBe('丙');
  });

  // 5. Albert Einstein
  // Birth record: 1879-03-14 11:30, Ulm, Germany (9.9916°E, 48.4011°N, Europe/Berlin)
  it('Civil Registry: Albert Einstein (1879-03-14 11:30 Ulm, Germany)', () => {
    const res = calculateDualAxisBazi({
      timezone: 'Europe/Berlin',
      longitude: 9.9916,
      solarDate: { year: 1879, month: 3, day: 14 },
      clockTime: { hour: 11, minute: 30 },
      gender: 'male',
    });
    expect(res.fourPillars).toBe('己卯 丁卯 丙申 甲午');
    expect(res.dayMaster.char).toBe('丙');
  });

  // ── II. Official archives and classical records of modern Chinese historical figures ──

  // 6. Chiang Kai-shek - classical record from Wei Qianli's Republic-era Qianli Minggao
  // Birth record: Qing Guangxu 13th year, 9th month, 15th day, 午 hour
  // (solar calendar 1887-10-31 12:00), Xikou, Fenghua County, Zhejiang Province
  it('Historical: Chiang Kai-shek (1887-10-31 12:00 Zhejiang Fenghua - Qianli Minggao)', () => {
    const res = calculateDualAxisBazi({
      place: 'Ningbo',
      solarDate: { year: 1887, month: 10, day: 31 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'male',
    });
    expect(res.fourPillars).toBe('丁亥 庚戌 己巳 庚午');
    expect(res.dayMaster.char).toBe('己');
  });

  // 7. Liang Qichao - Chakeng Village, Xinhui, Guangdong; self-described in Yinbingshi Heji
  // Birth record: Qing Tongzhi 12th year, 1st month, 26th day, 丑 hour (solar calendar 1873-02-23, 丑 hour)
  it('Historical: Liang Qichao (1873-02-23 丑 hour Guangdong Xinhui)', () => {
    const res = calculateDualAxisBazi({
      place: 'Guangzhou',
      solarDate: { year: 1873, month: 2, day: 23 },
      shichen: '丑',
      gender: 'male',
    });
    expect(res.fourPillars).toBe('癸酉 甲寅 丙午 己丑');
    expect(res.dayMaster.char).toBe('丙');
  });

  // 8. Mao Zedong - official birth record, Shaoshan, Hunan
  // Birth record: Qing Guangxu 19th year, 11th month, 19th day, 辰 hour (solar calendar 1893-12-26, 辰 hour)
  it('Historical: Mao Zedong (1893-12-26 辰 hour Hunan Shaoshan)', () => {
    const res = calculateDualAxisBazi({
      place: 'Changsha',
      solarDate: { year: 1893, month: 12, day: 26 },
      shichen: '辰',
      gender: 'male',
    });
    expect(res.fourPillars).toBe('癸巳 甲子 丁酉 甲辰');
    expect(res.dayMaster.char).toBe('丁');
  });

  // 9. Zhou Enlai - official birth record, Huai'an, Jiangsu
  // Birth record: Qing Guangxu 24th year, 2nd month, 13th day, 卯 hour (solar calendar 1898-03-05, 卯 hour)
  it('Historical: Zhou Enlai (1898-03-05 卯 hour Jiangsu Huaian)', () => {
    const res = calculateDualAxisBazi({
      place: 'Nanjing',
      solarDate: { year: 1898, month: 3, day: 5 },
      shichen: '卯',
      gender: 'male',
    });
    expect(res.fourPillars).toBe('戊戌 甲寅 丁卯 癸卯');
    expect(res.dayMaster.char).toBe('丁');
  });

  // 10. Deng Xiaoping - official birth record, Guang'an, Sichuan
  // Birth record: Qing Guangxu 30th year, 7th month, 12th day, 申 hour (solar calendar 1904-08-22, 申 hour)
  it('Historical: Deng Xiaoping (1904-08-22 申 hour Sichuan Guangan)', () => {
    const res = calculateDualAxisBazi({
      place: 'Chongqing',
      solarDate: { year: 1904, month: 8, day: 22 },
      shichen: '申',
      gender: 'male',
    });
    expect(res.fourPillars).toBe('甲辰 壬申 戊子 庚申');
    expect(res.dayMaster.char).toBe('戊');
  });

  // ── III. Cross-checked against an independent Bazi application ──

  // These two charts were produced by a third-party Bazi app, which reports the
  // birth's *true solar time* rather than the wall clock and birthplace. Feeding
  // that true solar time back in with trueSolar disabled therefore checks the
  // half of the pipeline the app's output can pin down: pillar derivation, Ten
  // Gods against the day master, naYin and void branches. It does not exercise
  // the true-solar-time calculation itself — that needs the original birthplace
  // and clock time, which the source did not report.
  //
  // Every Ten God below is asserted because they are what the earlier reversed
  // calculateTenGod argument order corrupted, and they were the last thing to be
  // covered by any test.

  // 11. Third-party app cross-check, male chart
  // True solar time 1993-07-14 10:11 (巳 hour), born 6d23h after 小暑 (1993-07-07 10:32)
  it('Cross-check: true solar time 1993-07-14 10:11 -> 癸酉 己未 丙申 癸巳', () => {
    const res = calculateDualAxisBazi({
      longitude: 120,
      timezone: 'Asia/Shanghai',
      trueSolar: false,
      solarDate: { year: 1993, month: 7, day: 14 },
      clockTime: { hour: 10, minute: 11 },
      gender: 'male',
    });
    expect(res.fourPillars).toBe('癸酉 己未 丙申 癸巳');
    expect(res.dayMaster.char).toBe('丙');

    expect(res.pillars.year.stemTenGod).toBe('正官');
    expect(res.pillars.month.stemTenGod).toBe('伤官');
    expect(res.pillars.day.stemTenGod).toBe('日主');
    expect(res.pillars.hour?.stemTenGod).toBe('正官');

    // 申 hides 庚/壬/戊 -> 偏财/七杀/食神 against day master 丙
    expect(res.pillars.day.hiddenStems?.map(h => h.tenGod)).toEqual(['偏财', '七杀', '食神']);

    expect(res.pillars.year.naYin).toBe('剑锋金');
    expect(res.pillars.hour?.naYin).toBe('长流水');
    expect(res.pillars.day.voidBranches).toEqual(['辰', '巳']);
  });

  // 12. Third-party app cross-check, female chart
  // True solar time 1993-05-20 09:32 (巳 hour), born 14d13h after 立夏 (1993-05-05 20:01)
  it('Cross-check: true solar time 1993-05-20 09:32 -> 癸酉 丁巳 辛丑 癸巳', () => {
    const res = calculateDualAxisBazi({
      longitude: 120,
      timezone: 'Asia/Shanghai',
      trueSolar: false,
      solarDate: { year: 1993, month: 5, day: 20 },
      clockTime: { hour: 9, minute: 32 },
      gender: 'female',
    });
    expect(res.fourPillars).toBe('癸酉 丁巳 辛丑 癸巳');
    expect(res.dayMaster.char).toBe('辛');

    expect(res.pillars.year.stemTenGod).toBe('食神');
    expect(res.pillars.month.stemTenGod).toBe('七杀');
    expect(res.pillars.day.stemTenGod).toBe('日主');
    expect(res.pillars.hour?.stemTenGod).toBe('食神');

    // 丑 hides 己/癸/辛 -> 偏印/食神/比肩 against day master 辛
    expect(res.pillars.day.hiddenStems?.map(h => h.tenGod)).toEqual(['偏印', '食神', '比肩']);

    expect(res.pillars.month.naYin).toBe('沙中土');
    expect(res.pillars.day.naYin).toBe('壁上土');
  });
});
