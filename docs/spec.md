# 八字排盘 MCP —— 实现规格书

> 交付给 Claude Code 的实现说明。所有事实性结论均来自实测（安装依赖包、读编译产物、跑判别用例、与 VSOP87 星历交叉验证），非从文档推断。
> 撰写日期：2026-08-15。依赖版本会漂移，实现前先跑第 8 节的回归套件确认基线仍成立。

---

## 1. 目标

构建一个八字排盘 MCP server，要求：**对任意出生地、任意年代（含夏令时年份）都给出正确的四柱**。

现有开源方案没有一个能做到这点。核心原因是同一个架构错误：把「天文瞬时」和「当地太阳位置」压成了一条时间轴。

### 非目标

- 命理解读（交给上层 LLM）
- 紫微斗数、奇门、六爻
- 神煞体系的原创实现（直接复用现成库）
- 前端 / Web UI

---

## 2. 核心原理：双时间轴

八字的四柱依赖两个**不同**的物理量，必须分开计算：

| 轴 | 依赖 | 决定 | 理由 |
|---|---|---|---|
| **A** | 出生的 **UTC 瞬时** | 年柱、月柱、大运起运 | 节气是全球单一天文事件（如立春 2024 = 2024-02-04 16:26:56 CST，全球同一刻），必须在同一参照系里比较先后 |
| **B** | 出生地的 **当地真太阳时** | 日柱、时柱 | 时辰取决于当地太阳高度角；日界在当地太阳午夜 |

两者相差整个时区偏移。对美西出生者约 15–16 小时，足以让年柱、月柱、日柱、时柱全部错位。

**已知的三种失败模式：**

- 只保留瞬时（转成北京墙钟）→ 年月柱对，日时柱错。cantian-ai 属此类。
- 只保留当地太阳时 → 日时柱对，年月柱在时区偏移宽度的窗口内错。shunshi-ai、OpenFate 属此类。
- 用经度推时区（`round(lon/15)*15`）→ 连当地太阳时都错。shunshi-ai 额外犯此错。

---

## 3. 技术路线决策

**采用：在 `@openfate/bazi-engine` 之上写一个双轴薄包装层。**

不从零实现，也不 fork。OpenFate 引擎已经把最难的部分做对了（IANA 时区、DST、农历闰月、输入校验、神煞、刑冲合会），只差节气轴这一个 bug，而这个 bug 可以在**外部**通过调用两次引擎绕过——已实测验证，5/5 判别用例全过。

### 依赖

```
@openfate/bazi-engine     ^1.1.2   MIT   （内部依赖 lunar-javascript ^1.7.0）
@openfate/true-solar-time ^4.0.0   MIT
@modelcontextprotocol/sdk ^1.10
zod                       ^3.24
```

**必须 pin 精确版本并做快照测试。** 底层日历库（6tail 系）近期有过修复：tyme4ts v1.4.1 changelog 明确写着「修复：某些公历日获取节气错误 / 某些公历日转干支日错误」。同源问题可能存在于 lunar-javascript。

---

## 4. 参考实现（已验证，可直接作为起点）

```js
import { calculateBaziChart } from '@openfate/bazi-engine';

// ── IANA 时区的真实 UTC 偏移（含全部历史 DST） ──
function tzOffsetMinutes(instantMs, tz) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false,
      year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit', second:'2-digit',
    }).formatToParts(new Date(instantMs)).map(x => [x.type, x.value])
  );
  const asUTC = Date.UTC(+p.year, +p.month-1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUTC - instantMs) / 60000);
}

// 墙钟 + 时区 → UTC 瞬时（两次迭代消除 DST 自指）
function wallToInstant(w, tz) {
  const naive = Date.UTC(w.year, w.month-1, w.day, w.hour, w.minute ?? 0);
  let off = tzOffsetMinutes(naive, tz);
  const ms = naive - off*60000;
  off = tzOffsetMinutes(ms, tz);
  return naive - off*60000;
}

const toWall = (ms) => { const d = new Date(ms); return {
  year:d.getUTCFullYear(), month:d.getUTCMonth()+1, day:d.getUTCDate(),
  hour:d.getUTCHours(), minute:d.getUTCMinutes() }; };

export function chart({ wall, tz, longitude, gender = 'male', ...opts }) {
  const instant = wallToInstant(wall, tz);

  // 轴 A —— 保留瞬时，折算成北京墙钟；关闭真太阳时，经度锁 120°
  const A = calculateBaziChart({
    ...toWall(instant + 8*3600000), gender,
    longitude: 120, timezone: 8, enableTrueSolarTime: false, ...opts,
  });

  // 轴 B —— 原始墙钟 + IANA 时区 + 出生地经度，开启真太阳时
  const B = calculateBaziChart({
    ...wall, gender, longitude, timezoneId: tz,
    enableTrueSolarTime: true, ...opts,
  });

  return {
    年柱: A.pillars.year, 月柱: A.pillars.month,   // 轴 A
    日柱: B.pillars.day,  时柱: B.pillars.hour,    // 轴 B
    大运: A.daYun,                                  // 轴 A（起运依赖节气距离）
  };
}
```

**关键约束：大运必须取自轴 A。** 起运时长由出生瞬时到相邻节气的距离决定，用轴 B 会引入时区偏移量级的误差。

---

## 5. 输入契约

```ts
type BaziInput = {
  // 出生地：place 会被解析成 longitude + timezone；显式字段覆盖解析结果
  place?: string;                  // "广州" / "Tacoma, WA" / "乌鲁木齐"
  longitude?: number;              // °E 为正
  timezone?: string;               // IANA 名，必须。如 "Asia/Shanghai"

  // 日期：二选一
  solarDate?: { year: number; month: number; day: number };
  lunarDate?: { year: number; month: number; day: number; isLeapMonth?: boolean };
  lunarDateFrame?: 'local' | 'beijing';        // 默认 'local'，见 6.①

  // 时刻：三选一
  clockTime?: { hour: number; minute: number }; // 主路径
  shichen?: '子'|'丑'|'寅'|'卯'|'辰'|'巳'|'午'|'未'|'申'|'酉'|'戌'|'亥';
  timeUnknown?: true;                           // 三柱盘

  dstFold?: 0 | 1;                              // DST 折返消歧，见 6.③
  gender: 'male' | 'female';

  // 流派开关（全部必须可配，不许硬编码）
  sect?: 1 | 2;                                 // 早晚子时，默认 1
  trueSolar?: boolean;                          // 默认 true
  childLimitProvider?: 'default'|'china95'|'season'|'lunarSect1';
};
```

### 硬性要求

- **时区必须由调用方传 IANA 名，绝不从经度推断。** 这是 shunshi-ai 炸掉 14 个中国城市的直接原因（乌鲁木齐 87.6°E 被 round 到 90°E，实际时区经线是 120°E，误差 120 分钟）。
- **纬度不收。** 轴 A 只用时区，轴 B 只用经度。纬度在八字里全程无用（shunshi 强制要求 `latitude` 却在公式里从未引用）。
- 出生地精确到城市即可：经度 1° = 4 分钟，同城内经度差通常 < 0.3°。县级以下是伪精度。

### 地名解析

| 方案 | 评价 |
|---|---|
| 手写城市表 | ❌ 已被 shunshi 证伪，90 城错 14 个 |
| **GeoNames `cities15000`** | ✅ 主方案。~2MB TSV，2.5 万城市，自带 IANA `timezone` 字段和 `alternatenames`（支持中日韩文） |
| **`geo-tz`** | ✅ 权威时区解析。基于真实时区多边形边界（而非经度近似）为库中每个城市的经纬度解析 IANA 时区，坐标落入多个边界时返回全部候选 |
| 让调用方 LLM 填 | ❌ 幻觉风险，正是要消除的 |

同名地点命中多个时**返回候选列表让用户选**，不要猜。解析不到就抛错，提示改传经度 + IANA 时区名。

---

## 6. 三个歧义与决策

### ① 农历日期属于哪个时区的日历

农历以东经 120° 为基准定义（定朔和中气按北京时间算）。海外出生时当地公历日与北京公历日常常错开一天。

| 记录来源 | frame |
|---|---|
| 家人拿**当地**公历日查老黄历（海外华人绝大多数） | `local`（默认） |
| 在中国出生，或按中国日期报的 | `beijing` |

**输出必须同时回显换算出的当地公历日和北京公历日**，让用户一眼看出是否错位。

闰月必须是独立布尔字段。OpenFate 用 `calendarType:'lunar'` + `isLeapMonth:true`，已实测正确（2020 闰四月十五 → 庚辰日，与 tyme4ts 独立核对一致）。非法闰月要抛错而不是静默回退。

### ② 只记得时辰

「未时」几乎肯定是当年按**钟表时间**推的，不是按太阳。处理：

- 取区间中点当钟表时间，照常做真太阳时修正
- 但修正量可能把它推出原时辰（乌鲁木齐修正 −190 分钟，「未时」会变成巳时）
- 因此必须输出 `timeAmbiguous: true`，并**列出该时辰整段区间对应的所有可能时柱**，不给假装确定的单一答案

`timeUnknown` 时走三柱盘：时柱、时柱相关神煞、命宫/身宫（依赖时支）全部置 null；大运照常（只依赖节气距离）。**禁止用「默认午时」填充。**

### ③ 夏令时切换的两小时

实测行为：

| 场景 | 结果 |
|---|---|
| 美西 1990-04-01 02:30（春季跳跃） | ❌ 该墙钟时刻不存在 |
| 美西 1990-10-28 01:30（秋季折返） | ⚠️ 两个解：08:30Z / 09:30Z |
| 中国 1988-09-11 01:30（秋季折返） | ⚠️ 两个解：16:30Z / 17:30Z |

策略：不存在 → 抛错，提示核对出生证；歧义 → 要求 `dstFold`，未提供则抛错并列出两个候选盘。**绝不静默取第一个解**（三家现有方案都会静默给一个看起来正常的答案）。

中国夏令时实测为 **1986–1991 年**（1985、1992 均为 +08:00），另有 1940–41 战时夏令时。IANA 全包，不需自维护。

### 附：1901 年前的中国

IANA `Asia/Shanghai` 在 1901 年前返回上海地方平时（+8:06）。当时中国确实各地用地方时，所以轴 A 用它概念上正确；但北京、广州与上海地方时差 ±5–8 分钟，IANA 没有单独 zone。清代盘会有几分钟系统偏差，输出里标 `historicalTzApprox: true`。

---

## 7. 输出要求

MCP 的消费者是 LLM，它无法自己发现输入被误解。**诊断块是唯一防线，必须有。**

```json
{
  "四柱": "庚午 壬午 辛亥 丁酉",
  "诊断": {
    "钟面": "1990-06-15 20:00 (America/Los_Angeles)",
    "时区偏移": "-07:00 (夏令时生效)",
    "UTC瞬时": "1990-06-16T03:00:00Z",
    "轴A_北京墙钟_定年月柱": "1990-06-16 11:00",
    "轴B_当地真太阳时_定日时柱": "1990-06-15 18:49",
    "经度修正分钟": -69.78,
    "时差方程分钟": -0.52,
    "农历": { "输入frame": "local", "换算公历": "1990-06-15", "北京同日": "1990-06-16" },
    "口径": { "sect": 1, "trueSolar": true, "childLimitProvider": "default", "年龄基准": "虚岁" },
    "警告": ["当地日期与北京日期不同；若农历系按中国日期记录请改用 frame=beijing"]
  }
}
```

其他要求：

- **大运年龄标明是虚岁。** 现有方案都不标，LLM 十有八九当周岁读。
- 刑冲合会输出去重（OpenFate 之外的某些实现会把「甲己相合」和「己甲相合」各列一次，下游模型会当两个证据加权）。
- 神煞标注来源库和版本号——同一命例在 `cantian-tymext` 不同版本下输出不同。

---

## 8. 测试要求

### 8.1 金标用例（必须全过，来自实测验证）

| # | 输入 | 期望四柱 | 考察点 |
|---|---|---|---|
| G1 | 1998-07-31 14:10, Asia/Shanghai, 116.4074 | 戊寅 己未 己卯 辛未 | 基线回归 |
| G2 | 2024-02-04 08:00, America/Los_Angeles, −122.4443 | 甲辰 丙寅 戊戌 丙辰 | 海外节气边界 |
| G3 | 1990-06-15 20:00, America/Los_Angeles, −122.4443 | 庚午 壬午 辛亥 丁酉 | 海外跨日 + 美国 DST |
| G4 | 1990-06-15 08:00, Asia/Shanghai, 87.6168 | 庚午 壬午 辛亥 庚寅 | 新疆经度 + 中国 DST |
| G5 | 1988-07-01 07:20, Asia/Shanghai, 116.4074 | 戊辰 戊午 丁巳 癸卯 | 中国 DST |

G2 的推导：立春 2024 = 2024-02-04 16:26:56 CST = 00:26:56 PST，出生时刻在其后 7.5 小时，年柱必为甲辰。

### 8.2 不变量测试（三家现有方案全部不做，最能抓 bug）

- 同一 UTC 瞬时用不同时区表达 → **年月柱必须相同**
  （实测 OpenFate 未包装时此项失败：Tacoma 02-04 08:00 PST 得癸卯乙丑，北京 02-05 00:00 CST 得甲辰丙寅，同一瞬时）
- 同一当地真太阳时、不同时区 → **日时柱必须相同**
- 全球任一地点，跨节气瞬时前后一分钟 → 月柱必须且只能跳一格

### 8.3 天文交叉验证

节气时刻对照（已用 VSOP87 独立算过，可直接当断言）：

```
立春 2024   2024-02-04 16:26:56 CST
芒种 2024   2024-06-05 12:09:56
立春 2025   2025-02-03 22:10:14
小暑 1998   1998-07-07 15:30:33
立秋 1998   1998-08-08 01:19:57
```

底层库（tyme4ts / 寿星天文历系）实测偏差：1700–2024 ≤ 30 秒，2050–2200 ≤ 55 秒。可接受。

日柱验证：与 `(JDN + 49) mod 60` 标准公式对比。已在 1700–2200 共 2626 个采样点验证 0 处不符。

### 8.4 差分回归

纯中国、非 DST 年份、关闭真太阳时的组合，与 `bazi-mcp`（cantian）逐字对比。已建立基线：1950–1985 共 180 例，0 处不一致。任何后续改动若打破此基线即为回归。

### 8.5 边界扫描

1900–2100 每个节气 ±2 小时逐分钟；每个时辰边界 ±5 分钟；每年立春 ±1 天。

---

## 9. 附录 A：调研结论（实测）

| 项目 | Star | 引擎 | 真太阳时 | IANA 时区 | DST | 海外年月柱 | 输入校验 | 判别用例 |
|---|---|---|---|---|---|---|---|---|
| **openfate-ai/openfate-mcp** | 72 | lunar-javascript | ✅ | ✅ `timezoneId` | ✅ | ❌ | ✅ | **3/4** |
| cantian-ai/bazi-mcp | 407 | tyme4ts | ❌ | ❌ 仅 ISO offset | ❌ | ✅ | ❌ | 1/4 |
| shunshi-ai/bazi-reader-mcp | 7 | tyme4ts | ⚠️ 经线算错 | ❌ | ❌ | ❌ | ❌ | 0/4 |

判别用例 = 上表 G2–G5。

其他值得知道的：

- **6tail/tyme4ts (475★) / lunar-javascript** —— 底层日历库，节气算法引自寿星天文历。上面三家全部基于它。本身质量好，但不处理时区，八字之外的语义要自己加。
- **sxwnl/sxwnl（寿星天文历）** —— 节气与农历的原始权威实现，覆盖 BC722 起。`yuangu/sxtwl_cpp` 是 C++ 移植，有 Python 绑定 `pip install sxtwl`。做古代盘或需要跨千年时用它。
- 其余 `yijing-bazi-mcp-server`、`mcp-bazi-partner`、`bazi-skill` 系列多为解读层封装，排盘仍调上述库，不解决本文的问题。

### 为什么不选 star 最多的 cantian

它的四项判别只过一项，且缺失的是最基础的真太阳时。star 数反映的是首发优势（GPT Store 引流）而非正确性。

### 为什么不直接用 OpenFate

它已经是最好的，只差节气轴。但那个 bug 的影响窗口宽度等于时区偏移——对美西出生者是约 16 小时的窗口，落在窗口内则年柱月柱同时错。实测扫描：

```
02-03 20:00 PST -> 癸卯 ✅      02-04 16:00 PST -> 癸卯 ❌（应甲辰）
02-04 00:00 PST -> 癸卯 ✅      02-04 23:00 PST -> 甲辰 ✅
02-04 01:00 PST -> 癸卯 ❌      02-05 08:00 PST -> 甲辰 ✅
02-04 08:00 PST -> 癸卯 ❌
```

包装一层即可绕过，成本远低于自建。

---

## 10. 附录 B：备选路线（若 OpenFate 依赖不可接受）

从零基于 `tyme4ts` 实现同一架构，已验证可行（同样 5/5 判别用例通过）。核心约 120 行：

```js
import { SolarTime, EightChar, ChildLimit, LunarHour,
         DefaultEightCharProvider, LunarSect2EightCharProvider } from 'tyme4ts';

const instant = wallToInstant(wall, tz);

// 轴 A
const beijing = toWall(instant + 8*3600000);
const ecA = SolarTime.fromYmdHms(...beijing).getLunarHour().getEightChar();

// 轴 B
const lmtMs = instant + longitude*4*60000;
const eot   = trueSolar ? equationOfTime(toJD(instant)) : 0;   // Meeus 低阶，误差 <10s
const local = toWall(lmtMs + eot*60000);
const ecB = SolarTime.fromYmdHms(...local).getLunarHour().getEightChar();

const four = [ecA.getYear(), ecA.getMonth(), ecB.getDay(), ecB.getHour()];
const ec   = new EightChar(...four.map(String));   // 合成盘 → 胎元/命宫/神煞
```

代价：神煞和刑冲合会要另找依赖（`cantian-tymext` 可用，它有半合/三合，shunshi 的自研版本明确不做三合三会），输入校验和农历闰月要自己写。总量约 400–600 行，比包装方案多两天。

时差方程用 Meeus 低阶式（含黄赤交角项），误差 < 10 秒；shunshi 用的三项近似式误差约 1 分钟，够用但没必要。

---

## 11. 实现顺序建议

1. 双轴包装 + G1–G5 金标测试（先让 5 个用例绿）
2. 输入 zod schema + 三种时刻路径 + DST 歧义检测
3. 农历路径 + frame 切换 + 闰月校验
4. 诊断块输出
5. GeoNames 地名解析
6. MCP server 封装 + stdio smoke test
7. 不变量测试 + 边界扫描 + 差分回归

前两步做完就已经比现存所有开源方案正确。
