import { describe, it, expect } from 'bun:test';
import { calculateDualAxisBazi } from '../src/core/dual-axis';

/**
 * Global Multi-Region Test Suite
 * Covers major Chinese regions (east, west, south, north, high-altitude, large
 * longitude offset) and representative cities across all five continents.
 */
describe('Global Multi-Region Bazi Tests', () => {

  // ══════════════════════════════════════════════════════════════
  // I. China Geographic Regions
  // ══════════════════════════════════════════════════════════════

  describe('China Nationwide Regions', () => {
    // 1. Extreme west of China: Kashgar, Xinjiang (75.99°E)
    // Longitude is -44.01° from the UTC+8 standard meridian (120°E); local True Solar
    // Time runs about 176 minutes (almost 3 hours) behind Beijing time.
    // Clock time 13:30 nominally looks like the 未 hour, but the true solar altitude
    // in Kashgar corresponds to 10:34 — actually the 巳 hour!
    it('Extreme West of China: Kashgar (large longitude offset delays ~3 hours)', () => {
      const res = calculateDualAxisBazi({
        place: 'Kashgar',
        timezone: 'Asia/Shanghai', // Many residents use Beijing Time officially
        solarDate: { year: 2024, month: 6, day: 1 },
        clockTime: { hour: 13, minute: 30 },
        gender: 'male',
      });
      // 2024-06-01: Year 甲辰, Month 己巳 (before Mangzhong), Day 丙申
      expect(res.pillars.year.ganZhi).toBe('甲辰');
      expect(res.pillars.month.ganZhi).toBe('己巳');
      expect(res.pillars.day.ganZhi).toBe('丙申');
      expect(res.pillars.hour?.branch).toBe('巳'); // Falls into the 巳 hour after longitude delay, not 未
      expect(res.diagnostics.longitudeCorrectionMinutes).toBeLessThan(-170);
    });

    // 2. Extreme east of China: Harbin, Heilongjiang (126.54°E)
    // Longitude is 6.54° ahead; True Solar Time runs about 26 minutes ahead of Beijing time.
    it('Extreme East of China: Harbin (longitude ~26 minutes ahead)', () => {
      const res = calculateDualAxisBazi({
        place: 'Harbin',
        solarDate: { year: 2024, month: 10, day: 1 },
        clockTime: { hour: 6, minute: 40 },
        gender: 'male',
      });
      // 6:40 + 26m(longitude) + 10m(equation of time) ≈ 07:16 (crosses into the 辰 hour!)
      expect(res.pillars.hour?.branch).toBe('辰');
      expect(res.diagnostics.longitudeCorrectionMinutes).toBeGreaterThan(20);
    });

    // 3. Highest altitude in China: Lhasa, Tibet (91.12°E)
    // Longitude offset -28.88°, time difference about -115.5 minutes (nearly 2 hours)
    it('Highest Altitude in China: Lhasa (longitude offset ~2 hours)', () => {
      const res = calculateDualAxisBazi({
        place: 'Lhasa',
        solarDate: { year: 2024, month: 5, day: 20 },
        clockTime: { hour: 12, minute: 30 },
        gender: 'female',
      });
      // 12:30 - 115.5m + 3.5m ≈ 10:38 (巳 hour)
      expect(res.pillars.hour?.branch).toBe('巳');
    });

    // 4. Extreme south of China: Sanya, Hainan (109.51°E)
    it('Extreme South of China: Sanya (tropical island)', () => {
      const res = calculateDualAxisBazi({
        place: 'Sanya',
        solarDate: { year: 2024, month: 8, day: 15 },
        clockTime: { hour: 12, minute: 0 },
        gender: 'male',
      });
      expect(res.fourPillars).toBeDefined();
      expect(res.diagnostics.wallClock).toContain('Asia/Shanghai');
    });

    // 5. Hong Kong, Macau, and Taiwan region: Hong Kong, Taipei
    it('Hong Kong & Taipei', () => {
      const hk = calculateDualAxisBazi({
        place: 'Hong Kong',
        solarDate: { year: 2023, month: 1, day: 1 },
        clockTime: { hour: 9, minute: 30 },
        gender: 'male',
      });
      expect(hk.diagnostics.wallClock).toContain('Asia/Hong_Kong');

      const tw = calculateDualAxisBazi({
        place: 'Taipei',
        solarDate: { year: 2023, month: 1, day: 1 },
        clockTime: { hour: 9, minute: 30 },
        gender: 'female',
      });
      expect(tw.diagnostics.wallClock).toContain('Asia/Taipei');
    });

    // 6. Southwest and Central China: Chengdu, Wuhan, Xi'an
    it('Southwest and Central China: Chengdu, Wuhan, Xi\'an', () => {
      const cd = calculateDualAxisBazi({
        place: 'Chengdu',
        solarDate: { year: 2024, month: 3, day: 15 },
        clockTime: { hour: 12, minute: 0 },
        gender: 'male',
      });
      // Chengdu longitude 104.07°, longitude correction about -63.7 minutes
      expect(cd.diagnostics.longitudeCorrectionMinutes).toBeCloseTo(-63.7, 0);

      const wh = calculateDualAxisBazi({
        place: 'Wuhan',
        solarDate: { year: 2024, month: 3, day: 15 },
        clockTime: { hour: 12, minute: 0 },
        gender: 'male',
      });
      expect(wh.diagnostics.longitudeCorrectionMinutes).toBeCloseTo(-22.8, 0);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // II. Global Continents — representative countries and cities
  // ══════════════════════════════════════════════════════════════

  describe('Global International Regions', () => {
    // 1. North America: US timezones and Canada's unusual half-hour timezone
    describe('North America', () => {
      it('Eastern US: New York, NY - Eastern Time', () => {
        const ny = calculateDualAxisBazi({
          place: 'New York',
          solarDate: { year: 2024, month: 7, day: 15 },
          clockTime: { hour: 14, minute: 0 },
          gender: 'male',
        });
        expect(ny.diagnostics.utcOffset).toContain('-04:00 (DST in effect)');
      });

      it('Western US: Los Angeles, CA - Pacific Time', () => {
        const la = calculateDualAxisBazi({
          place: 'Los Angeles, CA',
          solarDate: { year: 2024, month: 1, day: 15 },
          clockTime: { hour: 14, minute: 0 },
          gender: 'female',
        });
        expect(la.diagnostics.utcOffset).toBe('-08:00');
      });

      it('Central US: Chicago, IL - Central Time', () => {
        const chi = calculateDualAxisBazi({
          place: 'Chicago',
          solarDate: { year: 2024, month: 5, day: 1 },
          clockTime: { hour: 10, minute: 0 },
          gender: 'male',
        });
        expect(chi.diagnostics.utcOffset).toContain('-05:00 (DST in effect)');
      });

      it('No-DST state: Phoenix, AZ - permanent MST UTC-7', () => {
        const phxSummer = calculateDualAxisBazi({
          place: 'Phoenix',
          solarDate: { year: 2024, month: 7, day: 1 },
          clockTime: { hour: 12, minute: 0 },
          gender: 'male',
        });
        expect(phxSummer.diagnostics.utcOffset).toBe('-07:00'); // Still -07:00 in July, no DST
      });

      it('Canada\'s rare half-hour timezone: St. John\'s, NL - UTC-3:30 / DST UTC-2:30', () => {
        const nfl = calculateDualAxisBazi({
          place: 'St. John\'s',
          solarDate: { year: 2024, month: 1, day: 15 },
          clockTime: { hour: 12, minute: 0 },
          gender: 'male',
        });
        expect(nfl.diagnostics.utcOffset).toBe('-03:30');
      });
    });

    // 2. Europe & Eurasia
    describe('Europe & Eurasia', () => {
      it('London, UK - Prime Meridian 0° / GMT/BST', () => {
        const ldn = calculateDualAxisBazi({
          place: 'London, United Kingdom',
          solarDate: { year: 2024, month: 6, day: 21 },
          clockTime: { hour: 12, minute: 0 },
          gender: 'male',
        });
        expect(ldn.diagnostics.utcOffset).toContain('+01:00 (DST in effect)');
        expect(ldn.diagnostics.longitudeCorrectionMinutes).toBeCloseTo(-0.5, 0);
      });

      it('Paris, France - Central European Time CET/CEST', () => {
        const prs = calculateDualAxisBazi({
          place: 'Paris',
          solarDate: { year: 2024, month: 2, day: 1 },
          clockTime: { hour: 15, minute: 30 },
          gender: 'female',
        });
        expect(prs.diagnostics.utcOffset).toBe('+01:00');
      });

      it('Moscow, Russia - permanent UTC+3', () => {
        const msc = calculateDualAxisBazi({
          place: 'Moscow',
          solarDate: { year: 2024, month: 5, day: 9 },
          clockTime: { hour: 10, minute: 0 },
          gender: 'male',
        });
        expect(msc.diagnostics.utcOffset).toBe('+03:00');
      });

      it('Far East Russia: Vladivostok - UTC+10', () => {
        const vld = calculateDualAxisBazi({
          place: 'Vladivostok',
          solarDate: { year: 2024, month: 8, day: 1 },
          clockTime: { hour: 14, minute: 0 },
          gender: 'male',
        });
        expect(vld.diagnostics.utcOffset).toBe('+10:00');
      });

      it('Nordic Iceland: Reykjavik - permanent, no DST, UTC+0', () => {
        const ryk = calculateDualAxisBazi({
          place: 'Reykjavík',
          solarDate: { year: 2024, month: 7, day: 1 },
          clockTime: { hour: 12, minute: 0 },
          gender: 'male',
        });
        expect(ryk.diagnostics.utcOffset).toBe('+00:00');
      });
    });

    // 3. Asia & Middle East
    describe('Asia & Middle East', () => {
      it('Tokyo, Japan - UTC+9, no DST', () => {
        const tky = calculateDualAxisBazi({
          place: 'Tokyo',
          solarDate: { year: 2024, month: 4, day: 8 },
          clockTime: { hour: 11, minute: 30 },
          gender: 'female',
        });
        expect(tky.diagnostics.utcOffset).toBe('+09:00');
        expect(tky.diagnostics.longitudeCorrectionMinutes).toBeGreaterThan(15); // Tokyo longitude 139.7°E vs standard meridian 135°E
      });

      it('Seoul, South Korea - UTC+9', () => {
        const seoul = calculateDualAxisBazi({
          place: 'Seoul',
          solarDate: { year: 2024, month: 10, day: 1 },
          clockTime: { hour: 14, minute: 0 },
          gender: 'male',
        });
        expect(seoul.diagnostics.utcOffset).toBe('+09:00');
      });

      it('Equatorial city: Singapore - UTC+8', () => {
        const sg = calculateDualAxisBazi({
          place: 'Singapore',
          solarDate: { year: 2024, month: 8, day: 9 },
          clockTime: { hour: 12, minute: 0 },
          gender: 'male',
        });
        expect(sg.diagnostics.utcOffset).toBe('+08:00');
        // Longitude 103.8°E vs standard meridian 120°E, longitude correction about -64.7 minutes
        expect(sg.diagnostics.longitudeCorrectionMinutes).toBeCloseTo(-64.7, 0);
      });

      it('India\'s half-hour timezone: New Delhi & Mumbai - Indian Standard Time UTC+5:30', () => {
        const delhi = calculateDualAxisBazi({
          place: 'New Delhi',
          solarDate: { year: 2024, month: 1, day: 26 },
          clockTime: { hour: 12, minute: 0 },
          gender: 'male',
        });
        expect(delhi.diagnostics.utcOffset).toBe('+05:30');

        const mumbai = calculateDualAxisBazi({
          place: 'Mumbai',
          solarDate: { year: 2024, month: 1, day: 26 },
          clockTime: { hour: 12, minute: 0 },
          gender: 'female',
        });
        expect(mumbai.diagnostics.utcOffset).toBe('+05:30');
      });

      it('Middle East Gulf: Dubai, UAE - UTC+4', () => {
        const dxb = calculateDualAxisBazi({
          place: 'Dubai',
          solarDate: { year: 2024, month: 11, day: 1 },
          clockTime: { hour: 13, minute: 0 },
          gender: 'male',
        });
        expect(dxb.diagnostics.utcOffset).toBe('+04:00');
      });
    });

    // 4. Oceania & Southern Hemisphere
    describe('Oceania & Southern Hemisphere', () => {
      it('Sydney, Australia - Southern Hemisphere DST UTC+11 vs winter UTC+10', () => {
        // DST in effect in Sydney in January (UTC+11)
        const sydSummer = calculateDualAxisBazi({
          place: 'Sydney, Australia',
          solarDate: { year: 2024, month: 1, day: 10 },
          clockTime: { hour: 15, minute: 0 },
          gender: 'male',
        });
        expect(sydSummer.diagnostics.utcOffset).toContain('+11:00 (DST in effect)');

        // Winter standard time in Sydney in July (UTC+10)
        const sydWinter = calculateDualAxisBazi({
          place: 'Sydney, Australia',
          solarDate: { year: 2024, month: 7, day: 10 },
          clockTime: { hour: 15, minute: 0 },
          gender: 'male',
        });
        expect(sydWinter.diagnostics.utcOffset).toBe('+10:00');
      });

      it('Western Australia: Perth - UTC+8, no DST', () => {
        const perth = calculateDualAxisBazi({
          place: 'Perth, Australia',
          solarDate: { year: 2024, month: 1, day: 10 },
          clockTime: { hour: 12, minute: 0 },
          gender: 'female',
        });
        expect(perth.diagnostics.utcOffset).toBe('+08:00');
      });

      it('Auckland, New Zealand - far-east hemisphere UTC+12 / DST UTC+13', () => {
        const akl = calculateDualAxisBazi({
          place: 'Auckland',
          solarDate: { year: 2024, month: 12, day: 25 },
          clockTime: { hour: 12, minute: 0 },
          gender: 'male',
        });
        expect(akl.diagnostics.utcOffset).toContain('+13:00 (DST in effect)');
      });
    });

    // 5. South America & Africa
    describe('South America & Africa', () => {
      it('São Paulo, Brazil - South America UTC-3', () => {
        const sp = calculateDualAxisBazi({
          place: 'São Paulo',
          solarDate: { year: 2024, month: 3, day: 20 },
          clockTime: { hour: 11, minute: 0 },
          gender: 'male',
        });
        expect(sp.diagnostics.utcOffset).toBe('-03:00');
      });

      it('Buenos Aires, Argentina - UTC-3', () => {
        const ba = calculateDualAxisBazi({
          place: 'Buenos Aires',
          solarDate: { year: 2024, month: 5, day: 25 },
          clockTime: { hour: 16, minute: 0 },
          gender: 'female',
        });
        expect(ba.diagnostics.utcOffset).toBe('-03:00');
      });

      it('Johannesburg, South Africa - UTC+2', () => {
        const jnb = calculateDualAxisBazi({
          place: 'Johannesburg',
          solarDate: { year: 2024, month: 9, day: 20 },
          clockTime: { hour: 8, minute: 30 },
          gender: 'male',
        });
        expect(jnb.diagnostics.utcOffset).toBe('+02:00');
      });

      it('Cairo, Egypt - North Africa UTC+2 / DST UTC+3', () => {
        const cairo = calculateDualAxisBazi({
          place: 'Cairo',
          solarDate: { year: 2024, month: 6, day: 1 },
          clockTime: { hour: 12, minute: 0 },
          gender: 'male',
        });
        expect(cairo.diagnostics.utcOffset).toContain('+03:00');
      });
    });
  });
});
