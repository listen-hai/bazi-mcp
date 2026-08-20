import { describe, it, expect } from 'bun:test';
import { calculateDualAxisBazi } from '../src/core/dual-axis';

/**
 * True solar time checked against sources outside this project.
 *
 * Every other test compares the server against itself or against charts whose
 * own true solar time came from software making the same assumptions. The
 * equation of time is not a Bazi quantity at all — it is astronomy, its extremes
 * and zero crossings are published in almanacs, and the longitude correction is
 * plain geometry. Both can therefore be checked against values derived without
 * reference to this codebase, which is what pins the half of the pipeline that
 * turns a wall clock into the solar time the day and hour pillars depend on.
 *
 * Published reference values: the equation of time reaches about −14.24 minutes
 * around 11 February and about +16.49 minutes around 2-3 November, and passes
 * through zero near 15 April, 13 June, 1 September and 25 December.
 */

const eotOn = (month: number, day: number, year = 2023): number =>
  calculateDualAxisBazi({
    timezone: 'UTC',
    longitude: 0,
    solarDate: { year, month, day },
    clockTime: { hour: 12, minute: 0 },
    gender: 'male',
  }).diagnostics.equationOfTimeMinutes;

describe('True solar time against external references', () => {
  it('reproduces the published extremes of the equation of time', () => {
    expect(eotOn(2, 11)).toBeCloseTo(-14.24, 1);
    expect(eotOn(11, 3)).toBeCloseTo(16.49, 1);

    // And they are the extremes — not merely close to the published value on
    // those dates, but the largest excursions anywhere in the year.
    let min = { value: Infinity, date: '' };
    let max = { value: -Infinity, date: '' };
    for (let month = 1; month <= 12; month++) {
      for (let day = 1; day <= 28; day++) {
        const value = eotOn(month, day);
        if (value < min.value) min = { value, date: `${month}/${day}` };
        if (value > max.value) max = { value, date: `${month}/${day}` };
      }
    }
    expect(min.date).toBe('2/11');
    expect(max.date).toBe('11/3');
  });

  it('crosses zero on the four published dates', () => {
    for (const [month, day] of [[4, 15], [6, 13], [9, 1], [12, 25]]) {
      expect(Math.abs(eotOn(month, day)), `${month}/${day}`).toBeLessThan(0.3);
    }
  });

  it('derives the longitude correction as plain geometry', () => {
    // (longitude − standard meridian) × 4 minutes per degree, computed here
    // rather than read back from the implementation.
    const sites: Array<[string, string, number, number]> = [
      ['Beijing', 'Asia/Shanghai', 116.4074, 8],
      ['London', 'Europe/London', -0.1276, 0],
      ['New York', 'America/New_York', -74.006, -5],
      ['Kathmandu', 'Asia/Kathmandu', 85.324, 5.75], // 45-minute offset zone
    ];
    for (const [name, timezone, longitude, utcOffsetHours] of sites) {
      const res = calculateDualAxisBazi({
        timezone,
        longitude,
        solarDate: { year: 2023, month: 1, day: 15 },
        clockTime: { hour: 12, minute: 0 },
        gender: 'male',
      });
      const expected = (longitude - 15 * utcOffsetHours) * 4;
      expect(res.diagnostics.longitudeCorrectionMinutes, name).toBeCloseTo(expected, 2);
    }
  });

  it('reads 12:00 solar at the clock time of solar noon', () => {
    // Composes both corrections: solar noon happens at
    // 12:00 − longitudeCorrection − equationOfTime on the clock, so feeding that
    // moment back in must return local noon. This is what catches a sign error
    // or a dropped term that the two components pass individually.
    const sites: Array<[string, string, number, number]> = [
      ['Beijing', 'Asia/Shanghai', 116.4074, 8],
      ['London', 'Europe/London', -0.1276, 0],
      ['New York', 'America/New_York', -74.006, -5],
      ['Kathmandu', 'Asia/Kathmandu', 85.324, 5.75],
    ];
    for (const [name, timezone, longitude, utcOffsetHours] of sites) {
      const date = { year: 2023, month: 1, day: 15 };
      const probe = calculateDualAxisBazi({
        timezone, longitude, solarDate: date,
        clockTime: { hour: 12, minute: 0 }, gender: 'male',
      }).diagnostics;

      const offsetFromClock = (longitude - 15 * utcOffsetHours) * 4 + probe.equationOfTimeMinutes;
      const noonMinutes = 12 * 60 - offsetFromClock;
      const hour = Math.floor(noonMinutes / 60);
      const minute = Math.round(noonMinutes % 60);

      const atNoon = calculateDualAxisBazi({
        timezone, longitude, solarDate: date,
        clockTime: { hour, minute }, gender: 'male',
      });

      // Tolerance covers rounding the clock time to a whole minute.
      const reported = atNoon.diagnostics.axisB_localSolarTime_dayHourPillars.slice(11);
      const [h, m, s] = reported.split(':').map(Number);
      const secondsFromNoon = Math.abs((h * 3600 + m * 60 + s) - 12 * 3600);
      expect(secondsFromNoon, `${name} reported ${reported}`).toBeLessThan(60);
    }
  });
});
