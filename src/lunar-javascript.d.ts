// lunar-javascript ships plain JS with no types. Only the surface this project
// uses is declared -- widen it when something else here starts calling in.
declare module 'lunar-javascript' {
  interface LunarSolar {
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    getMinute(): number;
    getSecond(): number;
  }
  interface JieQi {
    getName(): string;
    getSolar(): LunarSolar;
  }
  interface LunarDate {
    getNextJie(): JieQi;
    getPrevJie(): JieQi;
  }
  export const Solar: {
    fromYmdHms(y: number, m: number, d: number, h: number, mi: number, s: number): { getLunar(): LunarDate };
  };
}
