import { describe, it, expect } from 'bun:test';
import { calculateDualAxisBazi } from '../src/core/dual-axis';

/**
 * 全球多地域与多国家综合排盘测试套件 (Global Multi-Region Test Suite)
 * 涵盖中国各大区域（东、西、南、北、高海拔、大经差）与五大洲各国代表性城市
 */
describe('全球多地域排盘实测 (Global Multi-Region Bazi Tests)', () => {

  // ══════════════════════════════════════════════════════════════
  // 一、中国各方位代表性地域实测 (China Geographic Regions)
  // ══════════════════════════════════════════════════════════════

  describe('中国各地八字实测 (China Nationwide Regions)', () => {
    // 1. 中国极西：新疆喀什 (Kashgar 75.99°E)
    // 经度与东八区标准经线(120°E)相差 -44.01°，当地真太阳时比北京时间慢约 176 分钟（接近 3 小时！）
    // 钟表 13:30（看似未时），但在喀什其实际太阳高度角为 10:34（实为巳时！）
    it('中国极西：新疆喀什 (Kashgar - 大经差延迟近3小时)', () => {
      const res = calculateDualAxisBazi({
        place: 'Kashgar',
        timezone: 'Asia/Shanghai', // Many residents use Beijing Time officially
        solarDate: { year: 2024, month: 6, day: 1 },
        clockTime: { hour: 13, minute: 30 },
        gender: 'male',
      });
      // 2024-06-01: 年甲辰, 月己巳(芒种前), 日丙申
      expect(res.pillars.year.ganZhi).toBe('甲辰');
      expect(res.pillars.month.ganZhi).toBe('己巳');
      expect(res.pillars.day.ganZhi).toBe('丙申');
      expect(res.pillars.hour?.branch).toBe('巳'); // 经度延迟后落入巳时，绝非未时
      expect(res.诊断.经度修正分钟).toBeLessThan(-170);
    });

    // 2. 中国极东：黑龙江哈尔滨 (Harbin 126.54°E)
    // 经度超前 6.54°，真太阳时比北京时间早约 26 分钟
    it('中国极东：黑龙江哈尔滨 (Harbin - 经度超前约26分钟)', () => {
      const res = calculateDualAxisBazi({
        place: 'Harbin',
        solarDate: { year: 2024, month: 10, day: 1 },
        clockTime: { hour: 6, minute: 40 },
        gender: 'male',
      });
      // 6:40 + 26m(经度) + 10m(时差方程) ≈ 07:16 (跨入辰时！)
      expect(res.pillars.hour?.branch).toBe('辰');
      expect(res.诊断.经度修正分钟).toBeGreaterThan(20);
    });

    // 3. 中国极高：西藏拉萨 (Lhasa 91.12°E)
    // 经度差 -28.88°，时差约 -115.5 分钟（近 2 小时）
    it('中国极高：西藏拉萨 (Lhasa - 经度差约2小时)', () => {
      const res = calculateDualAxisBazi({
        place: 'Lhasa',
        solarDate: { year: 2024, month: 5, day: 20 },
        clockTime: { hour: 12, minute: 30 },
        gender: 'female',
      });
      // 12:30 - 115.5m + 3.5m ≈ 10:38 (巳时)
      expect(res.pillars.hour?.branch).toBe('巳');
    });

    // 4. 中国极南：海南三亚 (Sanya 109.51°E)
    it('中国极南：海南三亚 (Sanya - 热带海岛)', () => {
      const res = calculateDualAxisBazi({
        place: 'Sanya',
        solarDate: { year: 2024, month: 8, day: 15 },
        clockTime: { hour: 12, minute: 0 },
        gender: 'male',
      });
      expect(res.四柱).toBeDefined();
      expect(res.诊断.钟面).toContain('Asia/Shanghai');
    });

    // 5. 港澳台地区：香港、台北
    it('中国港台：香港与台北 (Hong Kong & Taipei)', () => {
      const hk = calculateDualAxisBazi({
        place: 'Hong Kong',
        solarDate: { year: 2023, month: 1, day: 1 },
        clockTime: { hour: 9, minute: 30 },
        gender: 'male',
      });
      expect(hk.诊断.钟面).toContain('Asia/Hong_Kong');

      const tw = calculateDualAxisBazi({
        place: 'Taipei',
        solarDate: { year: 2023, month: 1, day: 1 },
        clockTime: { hour: 9, minute: 30 },
        gender: 'female',
      });
      expect(tw.诊断.钟面).toContain('Asia/Taipei');
    });

    // 6. 西南与华中：成都 (Chengdu)、武汉 (Wuhan)、西安 (Xi\'an)
    it('西南与华中：成都、武汉、西安', () => {
      const cd = calculateDualAxisBazi({
        place: 'Chengdu',
        solarDate: { year: 2024, month: 3, day: 15 },
        clockTime: { hour: 12, minute: 0 },
        gender: 'male',
      });
      // 成都经度 104.07°，经度修正约 -63.7 分钟
      expect(cd.诊断.经度修正分钟).toBeCloseTo(-63.7, 0);

      const wh = calculateDualAxisBazi({
        place: 'Wuhan',
        solarDate: { year: 2024, month: 3, day: 15 },
        clockTime: { hour: 12, minute: 0 },
        gender: 'male',
      });
      expect(wh.诊断.经度修正分钟).toBeCloseTo(-22.8, 0);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // 二、外国各大洲代表性国家与城市实测 (Global Continents)
  // ══════════════════════════════════════════════════════════════

  describe('外国各大洲八字实测 (Global International Regions)', () => {
    // 1. 北美洲：美国各大时区与加拿大特异半小时时区
    describe('北美洲 (North America)', () => {
      it('美东：纽约 (New York, NY - Eastern Time)', () => {
        const ny = calculateDualAxisBazi({
          place: 'New York',
          solarDate: { year: 2024, month: 7, day: 15 },
          clockTime: { hour: 14, minute: 0 },
          gender: 'male',
        });
        expect(ny.诊断.时区偏移).toContain('-04:00 (夏令时生效)');
      });

      it('美西：洛杉矶 (Los Angeles, CA - Pacific Time)', () => {
        const la = calculateDualAxisBazi({
          place: 'Los Angeles',
          solarDate: { year: 2024, month: 1, day: 15 },
          clockTime: { hour: 14, minute: 0 },
          gender: 'female',
        });
        expect(la.诊断.时区偏移).toBe('-08:00');
      });

      it('美中：芝加哥 (Chicago, IL - Central Time)', () => {
        const chi = calculateDualAxisBazi({
          place: 'Chicago',
          solarDate: { year: 2024, month: 5, day: 1 },
          clockTime: { hour: 10, minute: 0 },
          gender: 'male',
        });
        expect(chi.诊断.时区偏移).toContain('-05:00 (夏令时生效)');
      });

      it('无夏令时州：亚利桑那凤凰城 (Phoenix, AZ - 永久 MST UTC-7)', () => {
        const phxSummer = calculateDualAxisBazi({
          place: 'Phoenix',
          solarDate: { year: 2024, month: 7, day: 1 },
          clockTime: { hour: 12, minute: 0 },
          gender: 'male',
        });
        expect(phxSummer.诊断.时区偏移).toBe('-07:00'); // 7月依然保持 -07:00 无夏令时
      });

      it('加拿大罕见半小时时区：纽芬兰圣约翰斯 (St. John\'s, NL - UTC-3:30 / DST UTC-2:30)', () => {
        const nfl = calculateDualAxisBazi({
          place: 'St. John\'s',
          solarDate: { year: 2024, month: 1, day: 15 },
          clockTime: { hour: 12, minute: 0 },
          gender: 'male',
        });
        expect(nfl.诊断.时区偏移).toBe('-03:30');
      });
    });

    // 2. 欧洲与欧亚大陆
    describe('欧洲与欧亚大陆 (Europe & Eurasia)', () => {
      it('英国伦敦 (London - 本初子午线 0° / 零时区 GMT/BST)', () => {
        const ldn = calculateDualAxisBazi({
          place: 'London',
          solarDate: { year: 2024, month: 6, day: 21 },
          clockTime: { hour: 12, minute: 0 },
          gender: 'male',
        });
        expect(ldn.诊断.时区偏移).toContain('+01:00 (夏令时生效)');
        expect(ldn.诊断.经度修正分钟).toBeCloseTo(-0.5, 0);
      });

      it('法国巴黎 (Paris - 欧洲中部时间 CET/CEST)', () => {
        const prs = calculateDualAxisBazi({
          place: 'Paris',
          solarDate: { year: 2024, month: 2, day: 1 },
          clockTime: { hour: 15, minute: 30 },
          gender: 'female',
        });
        expect(prs.诊断.时区偏移).toBe('+01:00');
      });

      it('俄罗斯莫斯科 (Moscow - 永久 UTC+3)', () => {
        const msc = calculateDualAxisBazi({
          place: 'Moscow',
          solarDate: { year: 2024, month: 5, day: 9 },
          clockTime: { hour: 10, minute: 0 },
          gender: 'male',
        });
        expect(msc.诊断.时区偏移).toBe('+03:00');
      });

      it('远东俄罗斯：海参崴 (Vladivostok - UTC+10)', () => {
        const vld = calculateDualAxisBazi({
          place: 'Vladivostok',
          solarDate: { year: 2024, month: 8, day: 1 },
          clockTime: { hour: 14, minute: 0 },
          gender: 'male',
        });
        expect(vld.诊断.时区偏移).toBe('+10:00');
      });

      it('北欧冰岛：雷克雅未克 (Reykjavik - 永久无夏令时 UTC+0)', () => {
        const ryk = calculateDualAxisBazi({
          place: 'Reykjavík',
          solarDate: { year: 2024, month: 7, day: 1 },
          clockTime: { hour: 12, minute: 0 },
          gender: 'male',
        });
        expect(ryk.诊断.时区偏移).toBe('+00:00');
      });
    });

    // 3. 亚洲与中东
    describe('亚洲与中东 (Asia & Middle East)', () => {
      it('日本东京 (Tokyo - 东九区 UTC+9，无夏令时)', () => {
        const tky = calculateDualAxisBazi({
          place: 'Tokyo',
          solarDate: { year: 2024, month: 4, day: 8 },
          clockTime: { hour: 11, minute: 30 },
          gender: 'female',
        });
        expect(tky.诊断.时区偏移).toBe('+09:00');
        expect(tky.诊断.经度修正分钟).toBeGreaterThan(15); // 东京经度 139.7°E vs 标准经度 135°E
      });

      it('韩国首尔 (Seoul - UTC+9)', () => {
        const seoul = calculateDualAxisBazi({
          place: 'Seoul',
          solarDate: { year: 2024, month: 10, day: 1 },
          clockTime: { hour: 14, minute: 0 },
          gender: 'male',
        });
        expect(seoul.诊断.时区偏移).toBe('+09:00');
      });

      it('赤道城市：新加坡 (Singapore - UTC+8)', () => {
        const sg = calculateDualAxisBazi({
          place: 'Singapore',
          solarDate: { year: 2024, month: 8, day: 9 },
          clockTime: { hour: 12, minute: 0 },
          gender: 'male',
        });
        expect(sg.诊断.时区偏移).toBe('+08:00');
        // 经度 103.8°E vs 标准经度 120°E，经度修正约 -64.7 分钟
        expect(sg.诊断.经度修正分钟).toBeCloseTo(-64.7, 0);
      });

      it('印度半小时时区：新德里与孟买 (New Delhi & Mumbai - 印度标准时 UTC+5:30)', () => {
        const delhi = calculateDualAxisBazi({
          place: 'New Delhi',
          solarDate: { year: 2024, month: 1, day: 26 },
          clockTime: { hour: 12, minute: 0 },
          gender: 'male',
        });
        expect(delhi.诊断.时区偏移).toBe('+05:30');

        const mumbai = calculateDualAxisBazi({
          place: 'Mumbai',
          solarDate: { year: 2024, month: 1, day: 26 },
          clockTime: { hour: 12, minute: 0 },
          gender: 'female',
        });
        expect(mumbai.诊断.时区偏移).toBe('+05:30');
      });

      it('中东海湾：阿联酋迪拜 (Dubai - UTC+4)', () => {
        const dxb = calculateDualAxisBazi({
          place: 'Dubai',
          solarDate: { year: 2024, month: 11, day: 1 },
          clockTime: { hour: 13, minute: 0 },
          gender: 'male',
        });
        expect(dxb.诊断.时区偏移).toBe('+04:00');
      });
    });

    // 4. 大洋洲与南半球 (Southern Hemisphere)
    describe('大洋洲与南半球 (Oceania & Southern Hemisphere)', () => {
      it('澳大利亚悉尼 (Sydney - 南半球夏令时 UTC+11 vs 冬季 UTC+10)', () => {
        // 1月悉尼夏令时生效 (UTC+11)
        const sydSummer = calculateDualAxisBazi({
          place: 'Sydney',
          solarDate: { year: 2024, month: 1, day: 10 },
          clockTime: { hour: 15, minute: 0 },
          gender: 'male',
        });
        expect(sydSummer.诊断.时区偏移).toContain('+11:00 (夏令时生效)');

        // 7月悉尼冬季标准时 (UTC+10)
        const sydWinter = calculateDualAxisBazi({
          place: 'Sydney',
          solarDate: { year: 2024, month: 7, day: 10 },
          clockTime: { hour: 15, minute: 0 },
          gender: 'male',
        });
        expect(sydWinter.诊断.时区偏移).toBe('+10:00');
      });

      it('澳大利亚西澳：珀斯 (Perth - UTC+8 无夏令时)', () => {
        const perth = calculateDualAxisBazi({
          place: 'Perth',
          solarDate: { year: 2024, month: 1, day: 10 },
          clockTime: { hour: 12, minute: 0 },
          gender: 'female',
        });
        expect(perth.诊断.时区偏移).toBe('+08:00');
      });

      it('新西兰奥克兰 (Auckland - 极东半球 UTC+12 / 夏令时 UTC+13)', () => {
        const akl = calculateDualAxisBazi({
          place: 'Auckland',
          solarDate: { year: 2024, month: 12, day: 25 },
          clockTime: { hour: 12, minute: 0 },
          gender: 'male',
        });
        expect(akl.诊断.时区偏移).toContain('+13:00 (夏令时生效)');
      });
    });

    // 5. 南美洲与非洲
    describe('南美洲与非洲 (South America & Africa)', () => {
      it('巴西圣保罗 (São Paulo - 南美 UTC-3)', () => {
        const sp = calculateDualAxisBazi({
          place: 'São Paulo',
          solarDate: { year: 2024, month: 3, day: 20 },
          clockTime: { hour: 11, minute: 0 },
          gender: 'male',
        });
        expect(sp.诊断.时区偏移).toBe('-03:00');
      });

      it('阿根廷布宜诺斯艾利斯 (Buenos Aires - UTC-3)', () => {
        const ba = calculateDualAxisBazi({
          place: 'Buenos Aires',
          solarDate: { year: 2024, month: 5, day: 25 },
          clockTime: { hour: 16, minute: 0 },
          gender: 'female',
        });
        expect(ba.诊断.时区偏移).toBe('-03:00');
      });

      it('南非约翰内斯堡 (Johannesburg - UTC+2)', () => {
        const jnb = calculateDualAxisBazi({
          place: 'Johannesburg',
          solarDate: { year: 2024, month: 9, day: 20 },
          clockTime: { hour: 8, minute: 30 },
          gender: 'male',
        });
        expect(jnb.诊断.时区偏移).toBe('+02:00');
      });

      it('埃及开罗 (Cairo - 北非 UTC+2 / 夏令时 UTC+3)', () => {
        const cairo = calculateDualAxisBazi({
          place: 'Cairo',
          solarDate: { year: 2024, month: 6, day: 1 },
          clockTime: { hour: 12, minute: 0 },
          gender: 'male',
        });
        expect(cairo.诊断.时区偏移).toContain('+03:00');
      });
    });
  });
});
