import { ShichenBranch } from '../types';

export interface ShichenRange {
  branch: ShichenBranch;
  startHour: number;
  startMinute: number;
  midHour: number;
  midMinute: number;
  endHour: number;
  endMinute: number;
}

export const SHICHEN_RANGES: Record<ShichenBranch, ShichenRange> = {
  子: { branch: '子', startHour: 23, startMinute: 0, midHour: 0, midMinute: 0, endHour: 0, endMinute: 59 },
  丑: { branch: '丑', startHour: 1, startMinute: 0, midHour: 2, midMinute: 0, endHour: 2, endMinute: 59 },
  寅: { branch: '寅', startHour: 3, startMinute: 0, midHour: 4, midMinute: 0, endHour: 4, endMinute: 59 },
  卯: { branch: '卯', startHour: 5, startMinute: 0, midHour: 6, midMinute: 0, endHour: 6, endMinute: 59 },
  辰: { branch: '辰', startHour: 7, startMinute: 0, midHour: 8, midMinute: 0, endHour: 8, endMinute: 59 },
  巳: { branch: '巳', startHour: 9, startMinute: 0, midHour: 10, midMinute: 0, endHour: 10, endMinute: 59 },
  午: { branch: '午', startHour: 11, startMinute: 0, midHour: 12, midMinute: 0, endHour: 12, endMinute: 59 },
  未: { branch: '未', startHour: 13, startMinute: 0, midHour: 14, midMinute: 0, endHour: 14, endMinute: 59 },
  申: { branch: '申', startHour: 15, startMinute: 0, midHour: 16, midMinute: 0, endHour: 16, endMinute: 59 },
  酉: { branch: '酉', startHour: 17, startMinute: 0, midHour: 18, midMinute: 0, endHour: 18, endMinute: 59 },
  戌: { branch: '戌', startHour: 19, startMinute: 0, midHour: 20, midMinute: 0, endHour: 20, endMinute: 59 },
  亥: { branch: '亥', startHour: 21, startMinute: 0, midHour: 22, midMinute: 0, endHour: 22, endMinute: 59 },
};

/**
 * Gets midpoint clock time for a given shichen.
 */
export function getShichenMidpoint(shichen: ShichenBranch): { hour: number; minute: number } {
  const range = SHICHEN_RANGES[shichen];
  if (!range) {
    throw new Error(`无效的时辰: "${shichen}"。有效时辰为: 子, 丑, 寅, 卯, 辰, 巳, 午, 未, 申, 酉, 戌, 亥。`);
  }
  return { hour: range.midHour, minute: range.midMinute };
}

/**
 * Returns test sample points (start, mid, end) across the shichen range to check for True Solar Time boundary crossovers.
 */
export function getShichenSamplePoints(shichen: ShichenBranch): Array<{ hour: number; minute: number }> {
  const range = SHICHEN_RANGES[shichen];
  return [
    { hour: range.startHour, minute: range.startMinute },
    { hour: range.midHour, minute: range.midMinute },
    { hour: range.endHour, minute: range.endMinute },
  ];
}
