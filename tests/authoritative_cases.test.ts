import { describe, it, expect } from 'bun:test';
import { calculateDualAxisBazi } from '../src/core/dual-axis';
import { detectAllInteractions } from '../src/core/interactions';
import { BaziInputSchema } from '../src/schemas/input';

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
    // 日主 (Day Master) is a label for the day pillar only. The hour pillar's
    // stem (己) also happens to equal the day master (己), but that makes it
    // 比肩 (a peer stem), not a second 日主.
    expect(res.pillars.hour?.stemTenGod).toBe('比肩');
    expect(res.pillars.day.stemTenGod).toBe('日主');
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

  // ── IV. Independently-verified spot cases (day pillar via (JDN+49) mod 60,
  // hour stem via the Five Rats rule, cross-checked against the implementation) ──

  it('China DST +9: 1989-09-16 23:30 Asia/Shanghai stays in 亥 (true solar 22:20, no day roll)', () => {
    const res = calculateDualAxisBazi({
      timezone: 'Asia/Shanghai',
      longitude: 116.4074,
      solarDate: { year: 1989, month: 9, day: 16 },
      clockTime: { hour: 23, minute: 30 },
      gender: 'male',
    });
    expect(res.fourPillars).toBe('己巳 癸酉 己卯 乙亥');
  });

  it('China\'s first DST transition (1986-05-04 02:30 Asia/Shanghai) throws a spring-forward gap error', () => {
    expect(() => {
      calculateDualAxisBazi({
        timezone: 'Asia/Shanghai',
        longitude: 116.4074,
        solarDate: { year: 1986, month: 5, day: 4 },
        clockTime: { hour: 2, minute: 30 },
        gender: 'male',
      });
    }).toThrow('spring-forward gap');
  });

  it('Kathmandu (UTC+5:45): 2024-06-15 12:00', () => {
    const res = calculateDualAxisBazi({
      timezone: 'Asia/Kathmandu',
      longitude: 85.32,
      solarDate: { year: 2024, month: 6, day: 15 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'male',
    });
    expect(res.fourPillars).toBe('甲辰 庚午 庚戌 壬午');
  });

  it('St. John\'s, Newfoundland (UTC-3:30): 1980-01-15 12:00', () => {
    const res = calculateDualAxisBazi({
      timezone: 'America/St_Johns',
      longitude: -52.71,
      solarDate: { year: 1980, month: 1, day: 15 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'female',
    });
    expect(res.fourPillars).toBe('己未 丁丑 丁亥 丙午');
  });

  it('Sydney, Australia: 2000-01-01 15:00', () => {
    const res = calculateDualAxisBazi({
      timezone: 'Australia/Sydney',
      longitude: 151.2093,
      solarDate: { year: 2000, month: 1, day: 1 },
      clockTime: { hour: 15, minute: 0 },
      gender: 'male',
    });
    expect(res.fourPillars).toBe('己卯 丙子 戊午 己未');
  });

  it('Lichun 2025 bracket (LA, 2025-02-03): before the term boundary (05:00) stays in the prior year/month', () => {
    const res = calculateDualAxisBazi({
      timezone: 'America/Los_Angeles',
      longitude: -122.4443,
      solarDate: { year: 2025, month: 2, day: 3 },
      clockTime: { hour: 5, minute: 0 },
      gender: 'male',
    });
    expect(res.fourPillars).toBe('甲辰 丁丑 癸卯 甲寅');
  });

  it('Lichun 2025 bracket (LA, 2025-02-03): after the term boundary (07:00, same civil day) rolls year and month', () => {
    // Lichun 2025 falls at 06:10:14 PST; 05:00 and 07:00 are on either side of it.
    const res = calculateDualAxisBazi({
      timezone: 'America/Los_Angeles',
      longitude: -122.4443,
      solarDate: { year: 2025, month: 2, day: 3 },
      clockTime: { hour: 7, minute: 0 },
      gender: 'male',
    });
    expect(res.fourPillars).toBe('乙巳 戊寅 癸卯 乙卯');
  });

  it('Pre-1901 Shanghai LMT approximation: 1895-05-01 12:00 Asia/Shanghai', () => {
    const res = calculateDualAxisBazi({
      timezone: 'Asia/Shanghai',
      longitude: 121.4737,
      solarDate: { year: 1895, month: 5, day: 1 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'male',
    });
    expect(res.fourPillars).toBe('乙未 庚辰 戊申 戊午');
    expect(res.diagnostics.historicalTzApprox).toBe(true);
  });

  // ── IV. Interaction Detection & Modern Refinement Cases ──

  it('Interactions: Full Trine (申子辰三合水局) and Half-Trine (寅午半合火 / 酉丑半合金)', () => {
    const direct1 = detectAllInteractions({ year: '寅', month: '午', day: '丑', hour: '酉' });
    const types1 = direct1.map(i => `${i.type}:${i.branches.join('')}`);
    expect(types1.includes('HALF_TRINE:寅午')).toBe(true);
    expect(types1.includes('HALF_TRINE:酉丑')).toBe(true);
    expect(types1.includes('HARM:丑午')).toBe(true);

    const direct2 = detectAllInteractions({ year: '申', month: '子', day: '辰', hour: '午' });
    expect(direct2.some(i => i.type === 'TRINE' && i.resultElement === 'water')).toBe(true);
    expect(direct2.some(i => i.type === 'CLASH' && i.branches.includes('子') && i.branches.includes('午'))).toBe(true);
  });

  it('Interactions: Half-Trine (卯未半合木) without full trine', () => {
    const direct = detectAllInteractions({ year: '寅', month: '未', day: '卯', hour: '未' });
    const halfTrine = direct.find(i => i.type === 'HALF_TRINE' && i.branches.includes('卯') && i.branches.includes('未'));
    expect(halfTrine).toBeDefined();
    expect(halfTrine?.resultElement).toBe('wood');
  });

  it('Default sect=2 (23:00 rollover) produces self-consistent rat-chasing formula', () => {
    const res = calculateDualAxisBazi({
      timezone: 'Asia/Shanghai',
      longitude: 120,
      solarDate: { year: 2024, month: 3, day: 10 },
      clockTime: { hour: 23, minute: 30 },
      gender: 'male',
    });
    // Default sect=2: Day rolls to 甲戌, hour is 甲子 (甲日起甲子, 100% self-consistent)
    expect(res.fourPillars).toBe('甲辰 丁卯 甲戌 甲子');
    expect(res.diagnostics.convention.sect).toBe(2);
    expect(res.diagnostics.convention.childLimitProvider).toBe('three_days_one_year_shichen_quantized');
  });

  it('Explicit sect=1 on late-Zi hour emits explanatory warning', () => {
    const res = calculateDualAxisBazi({
      timezone: 'Asia/Shanghai',
      longitude: 120,
      solarDate: { year: 2024, month: 3, day: 10 },
      clockTime: { hour: 23, minute: 30 },
      gender: 'male',
      sect: 1,
    });
    expect(res.fourPillars).toBe('甲辰 丁卯 癸酉 甲子');
    expect(res.diagnostics.warnings.some(w => w.includes('Late Zi hour'))).toBe(true);
  });

  it('Xinjiang birth place emits oral local time advisory warning', () => {
    const res = calculateDualAxisBazi({
      place: 'Urumqi',
      solarDate: { year: 1990, month: 5, day: 20 },
      clockTime: { hour: 10, minute: 0 },
      gender: 'female',
    });
    expect(res.diagnostics.warnings.some(w => w.includes('Xinjiang'))).toBe(true);
  });

  it('Global pre-1890 birth emits historical LMT approximation warning (Einstein)', () => {
    const res = calculateDualAxisBazi({
      timezone: 'Europe/Berlin',
      longitude: 10.0,
      solarDate: { year: 1879, month: 3, day: 14 },
      clockTime: { hour: 11, minute: 30 },
      gender: 'male',
    });
    expect(res.diagnostics.historicalTzApprox).toBe(true);
    expect(res.daYun.startDate).toContain('(Asia/Shanghai)');
  });

  it('N1: Historical mid-year base offset shift (Europe/Moscow 1922-11-09 23:00)', () => {
    // Moscow transitioned base offset from +3 to +2 on 1922-10-01.
    // Probing instant ±6 months preserves exact UTC+2 offset and rolls to 壬午 庚子.
    const res = calculateDualAxisBazi({
      timezone: 'Europe/Moscow',
      longitude: 37.6173,
      solarDate: { year: 1922, month: 11, day: 9 },
      clockTime: { hour: 23, minute: 0 },
      gender: 'male',
    });
    expect(res.fourPillars).toBe('壬戌 辛亥 壬午 庚子');
    expect(res.diagnostics.axisB_localTrueSolarTime_dayHourPillars).toContain('23:46:37');
  });

  it('N1: US War Time boundary (America/Phoenix 1944-02-04 04:09)', () => {
    // 1944 War Time boundary: correctly resolves to MST (UTC-7) and produces 寅 hour.
    const res = calculateDualAxisBazi({
      timezone: 'America/Phoenix',
      longitude: -112.074,
      solarDate: { year: 1944, month: 2, day: 4 },
      clockTime: { hour: 4, minute: 9 },
      gender: 'male',
    });
    expect(res.fourPillars).toBe('癸未 乙丑 戊戌 甲寅');
    expect(res.diagnostics.axisB_localTrueSolarTime_dayHourPillars).toContain('03:26:43');
  });

  it('N4 & N6: Sub-minute LMT offset and locationSource reporting', () => {
    const resResolved = calculateDualAxisBazi({
      place: 'Beijing',
      solarDate: { year: 2000, month: 1, day: 1 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'male',
    });
    expect(resResolved.diagnostics.locationSource).toBe('resolved');

    const resSupplied = calculateDualAxisBazi({
      timezone: 'Asia/Shanghai',
      longitude: 113.2644,
      solarDate: { year: 1897, month: 6, day: 11 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'male',
    });
    expect(resSupplied.diagnostics.locationSource).toBe('caller_supplied');
    expect(resSupplied.diagnostics.utcOffset).toBe('+08:05:43');
    expect(resSupplied.diagnostics.axisB_localTrueSolarTime_dayHourPillars).toContain('11:27:57');
  });

  it('N5: No Xinjiang warning false positives for Tibet or Gansu', () => {
    const resLhasa = calculateDualAxisBazi({
      place: 'Lhasa',
      solarDate: { year: 1990, month: 5, day: 20 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'female',
    });
    expect(resLhasa.diagnostics.warnings.some(w => w.includes('Xinjiang'))).toBe(false);
  });

  it('R3: Strict schema validation rejects misspelled and extraneous properties', () => {
    const validBase = {
      place: 'Beijing',
      solarDate: { year: 2000, month: 1, day: 1 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'male' as const,
    };

    expect(BaziInputSchema.safeParse({ ...validBase, sects: 1 }).success).toBe(false);
    expect(BaziInputSchema.safeParse({ ...validBase, trueSolarTime: false }).success).toBe(false);
    expect(BaziInputSchema.safeParse({ ...validBase, latitude: 39.9 }).success).toBe(false);
    expect(BaziInputSchema.safeParse({ ...validBase, foo: 'bar' }).success).toBe(false);
    expect(BaziInputSchema.safeParse({ ...validBase, solarDate: { year: 2000, month: 1, day: 1, extra: 123 } }).success).toBe(false);
    expect(BaziInputSchema.safeParse(validBase).success).toBe(true);
  });

  it('X1: LocationSource truthfulness and partial mixed input rejection', () => {
    // 1. Place alone -> resolved
    const res1 = calculateDualAxisBazi({
      place: 'Beijing',
      solarDate: { year: 2000, month: 1, day: 1 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'male',
    });
    expect(res1.diagnostics.locationSource).toBe('resolved');

    // 2. Place + both explicit longitude & timezone -> caller_supplied with mixedWarning
    const res2 = calculateDualAxisBazi({
      place: 'Beijing',
      longitude: -118.24,
      timezone: 'America/Los_Angeles',
      solarDate: { year: 2000, month: 1, day: 1 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'male',
    });
    expect(res2.diagnostics.locationSource).toBe('caller_supplied');
    expect(res2.diagnostics.warnings.some(w => w.includes('explicit coordinates'))).toBe(true);

    // 3. Place + only partial longitude without timezone -> rejected with clear error
    expect(() =>
      calculateDualAxisBazi({
        place: 'Beijing',
        longitude: -122.44,
        solarDate: { year: 2000, month: 1, day: 1 },
        clockTime: { hour: 12, minute: 0 },
        gender: 'male',
      })
    ).toThrow('Inconsistent location input');

    // 4. Excessive longitude offset (> 240 min) emits sanity warning
    const resMismatchedTz = calculateDualAxisBazi({
      place: 'Beijing',
      timezone: 'America/Los_Angeles',
      solarDate: { year: 2000, month: 1, day: 1 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'male',
    });
    expect(resMismatchedTz.diagnostics.warnings.some(w => w.includes('Astronomical sanity warning'))).toBe(true);

    const resSanity = calculateDualAxisBazi({
      longitude: -122.44,
      timezone: 'Asia/Shanghai',
      solarDate: { year: 2000, month: 1, day: 1 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'male',
    });
    expect(resSanity.diagnostics.warnings.some(w => w.includes('Astronomical sanity warning'))).toBe(true);
  });

  it('X2: Schema and engine year range boundary alignment (1800-2100)', () => {
    const makePayload = (year: number) => ({
      place: 'Beijing',
      solarDate: { year, month: 1, day: 1 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'male' as const,
    });

    expect(BaziInputSchema.safeParse(makePayload(1799)).success).toBe(false);
    expect(BaziInputSchema.safeParse(makePayload(1800)).success).toBe(true);
    expect(BaziInputSchema.safeParse(makePayload(2100)).success).toBe(true);
    expect(BaziInputSchema.safeParse(makePayload(2101)).success).toBe(false);
  });

  it('X3: Invalid Gregorian calendar date validation', () => {
    expect(() =>
      calculateDualAxisBazi({
        place: 'Beijing',
        solarDate: { year: 1999, month: 2, day: 29 },
        clockTime: { hour: 12, minute: 0 },
        gender: 'male',
      })
    ).toThrow('Invalid solar calendar date: 1999-02-29 does not exist');

    expect(() =>
      calculateDualAxisBazi({
        place: 'Beijing',
        solarDate: { year: 1998, month: 2, day: 30 },
        clockTime: { hour: 12, minute: 0 },
        gender: 'male',
      })
    ).toThrow('Invalid solar calendar date: 1998-02-30 does not exist');
  });

  it('Y1: Si (巳) hidden stem ordering is 本气(丙) -> 中气(庚) -> 余气(戊)', () => {
    const res = calculateDualAxisBazi({
      place: 'Beijing',
      solarDate: { year: 2024, month: 5, day: 15 },
      clockTime: { hour: 10, minute: 0 },
      gender: 'male',
    });
    // Month branch is 巳
    expect(res.pillars.month.branch).toBe('巳');
    expect(res.pillars.month.hiddenStems.map(h => h.stem)).toEqual(['丙', '庚', '戊']);
    expect(res.pillars.month.hiddenStems[0].isMain).toBe(true);
    expect(res.pillars.month.hiddenStems[1].isMain).toBe(false);
    expect(res.pillars.month.hiddenStems[2].isMain).toBe(false);
  });

  it('Y2: Place with custom timezone returns locationSource: "mixed"', () => {
    const res = calculateDualAxisBazi({
      place: 'Beijing',
      timezone: 'Asia/Tokyo',
      solarDate: { year: 2000, month: 1, day: 1 },
      clockTime: { hour: 12, minute: 0 },
      gender: 'male',
    });
    expect(res.diagnostics.locationSource).toBe('mixed');
    expect(res.diagnostics.warnings.some(w => w.includes('custom timezone'))).toBe(true);
  });

  it('W1: Heavenly Stem Combinations (天干五合) full verification', () => {
    // 1. All 5 combinations: 甲己, 乙庚, 丙辛, 丁壬, 戊癸
    const scJiaJi = detectAllInteractions({
      year: '子', month: '未', day: '未', hour: '酉',
      yearStem: '甲', monthStem: '辛', dayStem: '丁', hourStem: '己'
    });
    const jiaJi = scJiaJi.find(i => i.type === 'STEM_COMBINATION');
    expect(jiaJi).toBeDefined();
    expect(jiaJi?.stems).toEqual(['甲', '己']);
    expect(jiaJi?.resultElement).toBe('earth');
    expect(jiaJi?.potentialElement).toBe('earth');
    expect(jiaJi?.description).toContain('甲己相合');
    expect(jiaJi?.transformNote).toBeDefined();

    const scYiGeng = detectAllInteractions({
      year: '子', month: '寅', day: '辰', hour: '午',
      yearStem: '乙', monthStem: '庚', dayStem: '丙', hourStem: '壬'
    });
    const yiGeng = scYiGeng.find(i => i.type === 'STEM_COMBINATION');
    expect(yiGeng).toBeDefined();
    expect(yiGeng?.stems).toEqual(['乙', '庚']);
    expect(yiGeng?.resultElement).toBe('metal');
    expect(yiGeng?.potentialElement).toBe('metal');
    expect(yiGeng?.description).toContain('乙庚相合');

    const scBingXin = detectAllInteractions({
      year: '子', month: '寅', day: '辰', hour: '午',
      yearStem: '丙', monthStem: '辛', dayStem: '戊', hourStem: '癸'
    });
    const bingXin = scBingXin.find(i => i.type === 'STEM_COMBINATION' && i.stems?.includes('丙'));
    const wuGui = scBingXin.find(i => i.type === 'STEM_COMBINATION' && i.stems?.includes('戊'));
    expect(bingXin?.resultElement).toBe('water');
    expect(bingXin?.potentialElement).toBe('water');
    expect(bingXin?.description).toContain('丙辛相合');
    expect(wuGui?.resultElement).toBe('fire');
    expect(wuGui?.potentialElement).toBe('fire');
    expect(wuGui?.description).toContain('戊癸相合');

    const scDingRen = detectAllInteractions({
      year: '巳', month: '申', day: '卯', hour: '亥',
      yearStem: '己', monthStem: '壬', dayStem: '乙', hourStem: '丁'
    });
    const dingRen = scDingRen.find(i => i.type === 'STEM_COMBINATION');
    expect(dingRen).toBeDefined();
    expect(dingRen?.stems).toEqual(['丁', '壬']);
    expect(dingRen?.resultElement).toBe('wood');
    expect(dingRen?.potentialElement).toBe('wood');
    expect(dingRen?.description).toContain('丁壬相合');

    // 2. Full real chart verification (Trump: 丙戌 甲午 己未 己巳)
    const trump = calculateDualAxisBazi({
      timezone: 'America/New_York',
      longitude: -73.935,
      solarDate: { year: 1946, month: 6, day: 14 },
      clockTime: { hour: 10, minute: 54 },
      gender: 'male',
    });
    const trumpJiaJi = trump.interactions.find(i => i.type === 'STEM_COMBINATION');
    expect(trumpJiaJi).toBeDefined();
    expect(trumpJiaJi?.stems).toEqual(['甲', '己']);
    expect(trumpJiaJi?.resultElement).toBe('earth');
    expect(trumpJiaJi?.potentialElement).toBe('earth');
    expect(trumpJiaJi?.pillars).toEqual(['month', 'day', 'hour']);

    // Directional (巳午未) in Trump chart
    const trumpDir = trump.interactions.find(i => i.type === 'DIRECTIONAL');
    expect(trumpDir).toBeDefined();
    expect(trumpDir?.potentialElement).toBe('fire');
    expect(trumpDir?.transformed).toBeNull();
    expect(trumpDir?.transformNote).toBeDefined();

    // Half-Trine (午戌) in Trump chart
    const trumpHalfTrine = trump.interactions.find(i => i.type === 'HALF_TRINE');
    expect(trumpHalfTrine).toBeDefined();
    expect(trumpHalfTrine?.potentialElement).toBe('fire');
    expect(trumpHalfTrine?.transformed).toBeNull();
    expect(trumpHalfTrine?.transformNote).toBeDefined();
  });
});

