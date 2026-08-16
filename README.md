# Bazi MCP (`bazi-mcp`)

[![npm version](https://img.shields.io/npm/v/bazi-mcp.svg)](https://www.npmjs.com/package/bazi-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-69%20passed%2C%200%20failed-brightgreen.svg)]()
[![Bun](https://img.shields.io/badge/runtime-Bun%20%7C%20Node-black.svg)]()

> Deterministic, high-precision Four Pillars of Destiny (八字排盘) Model Context Protocol (MCP) server based on a dual-axis astronomical time engine.

[中文文档 (Chinese)](README_zh.md) | [English](README.md)

---

## 🌟 Why `bazi-mcp`?

Most open-source Bazi implementations suffer from a critical architectural flaw: **compressing the astronomical instant and local solar position into a single time axis**. 

For individuals born outside China, during Daylight Saving Time (DST), or in extreme-longitude regions (such as Xinjiang, Hawaii, or Western Europe), this single-axis error leads to wrong Year, Month, Day, and Hour pillars.

`bazi-mcp` solves this with a **physical Dual Time-Axis architecture**:

```
Birth Wall Clock Time + IANA Timezone (e.g. 1990-06-15 20:00 America/Los_Angeles)
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
      【Axis A: UTC Instant】     【Axis B: Local True Solar Time】
   UTC: 1990-06-16 03:00:00Z    Wall + Longitude + Meeus EoT - DST
      Beijing: 1990-06-16 11:00   Local Solar: 1990-06-15 18:49
            │                           │
            ├──────────────┐            ├──────────────┐
            ▼              ▼            ▼              ▼
       【Year Pillar】 【Month Pillar】 【Day Pillar】 【Hour Pillar】
          庚午            壬午          辛亥            丁酉
            │
            ▼
      【Da Yun (起运)】
```

- **Axis A (UTC Instant)**: Preserves the exact global astronomical moment (converted to Beijing Standard Time at 120°E, True Solar disabled) to determine **Year Pillar, Month Pillar, and Major Luck Cycle (大运起运)** distance to solar terms.
- **Axis B (Local True Solar Time)**: Computed from local wall time + IANA timezone + birth longitude + Meeus Equation of Time to determine **Day Pillar and Hour Pillar**.
- **Day Master Alignment**: All Ten Gods (十神) and hidden stems across the four pillars are recalculated relative to the true Day Master derived from Axis B.

---

## ✨ Features

- **Dual Time-Axis Precision**: Eliminates timezone window errors for global births and edge-case solar term boundaries.
- **Full Historical DST & Timezones**:
  - Full IANA timezone coverage worldwide (including China's 1986–1991 DST and wartime periods).
  - **Spring-forward Gap Detection**: Detects nonexistent clock times and prompts user to verify records.
  - **Fall-back Fold Disambiguation**: Solves 1-hour overlap ambiguities via explicit `dstFold: 0 | 1`.
  - **Southern Hemisphere Auto-Polarity**: Flawlessly adapts to reversed DST periods (e.g., Australia, New Zealand).
- **Lunar Calendar Frame Disambiguation**:
  - `local` (default): For overseas families recording lunar dates based on local calendar days.
  - `beijing`: For births recorded against China Standard calendar days.
  - Full validation for leap lunar months (闰月).
- **Shichen Ambiguity Multi-Point Sampling**:
  - For single-branch time inputs (e.g. "未时" in Urumqi), the engine samples across the entire 2-hour window under True Solar Time and flags `timeAmbiguous: true` with all candidate hour pillars.
- **Three-Pillar Support**: `timeUnknown: true` generates three pillars (Year, Month, Day) with Da Yun calculated properly and hour-dependent attributes set to `null`.
- **Pre-1901 Historical Warning**: Highlights Local Mean Time (LMT) approximations for historical pre-1901 Chinese records.
- **Rich Offline Geodatabase**: Pre-configured with 300+ Chinese prefecture cities and 50+ global metropolitan cities, backed by `tz-lookup` fallback.
- **Zero-Crash Defensive MCP Server**: Structured Zod schemas with graceful error formatting and standard Model Context Protocol compliance.

---

## 🚀 Quickstart

### 1. Instant Run via `bunx` or `npx`

No installation or cloning needed:

```bash
# Run with Bun
bunx bazi-mcp

# Or run with Node / NPX
npx -y bazi-mcp
```

### 2. Local Development & Testing

```bash
# Clone the repository
git clone https://github.com/listen-hai/bazi-mcp.git
cd bazi-mcp

# Install dependencies
bun install

# Run the 69-case verification suite
bun test
```

---

## 🔌 MCP Client Configuration

### Claude Desktop / Cursor / Antigravity

Add the following to your `claude_desktop_config.json` or MCP settings:

```json
{
  "mcpServers": {
    "bazi": {
      "command": "bunx",
      "args": ["bazi-mcp"]
    }
  }
}
```

*If using Node/NPX:*
```json
{
  "mcpServers": {
    "bazi": {
      "command": "npx",
      "args": ["-y", "bazi-mcp"]
    }
  }
}
```

---

## 🛠️ MCP Tools

### 1. `calculate_bazi`

Calculates Four Pillars, Day Master, Da Yun (Major Luck Cycles labeled with 虚岁 nominal age), Branch Interactions (刑冲合会 deduplicated), and full Diagnostic Metadata.

#### Parameters:
- `place` (*string*, optional): City name in Chinese or English (e.g., `"广州"`, `"Tacoma, WA"`, `"London"`).
- `longitude` (*number*, optional): Longitude in degrees (East positive, West negative, e.g., `116.4074` or `-122.4443`).
- `timezone` (*string*, optional): IANA timezone identifier (e.g., `"Asia/Shanghai"`, `"America/Los_Angeles"`).
- `solarDate` (*object*, optional): `{ "year": 2024, "month": 2, "day": 4 }`.
- `lunarDate` (*object*, optional): `{ "year": 1990, "month": 5, "day": 23, "isLeapMonth": false }`.
- `lunarDateFrame` (*string*, optional): `"local"` (default) or `"beijing"`.
- `clockTime` (*object*, optional): `{ "hour": 8, "minute": 0 }`.
- `shichen` (*string*, optional): Traditional Chinese hour branch (`'子'` to `'亥'`).
- `timeUnknown` (*boolean*, optional): Set `true` for a 3-pillar chart.
- `dstFold` (*number*, optional): `0` for first occurrence (DST), `1` for second occurrence (Standard).
- `gender` (*string*, required): `"male"` or `"female"`.
- `sect` (*number*, optional): `1` (default, 00:00 midnight day rollover) or `2` (23:00 Zi-hour rollover).
- `trueSolar` (*boolean*, optional): `true` (default) to apply True Solar Time correction.

#### Sample Diagnostic Output:
```json
{
  "四柱": "庚午 壬午 辛亥 丁酉",
  "诊断": {
    "钟面": "1990-06-15 20:00 (America/Los_Angeles)",
    "时区偏移": "-07:00 (夏令时生效)",
    "UTC瞬时": "1990-06-16T03:00:00.000Z",
    "轴A_北京墙钟_定年月柱": "1990-06-16 11:00",
    "轴B_当地真太阳时_定日时柱": "1990-06-15 18:49:42",
    "经度修正分钟": -9.78,
    "时差方程分钟": -0.51,
    "农历": {
      "输入frame": "local",
      "换算公历": "1990-06-15",
      "北京同日": "1990-06-16",
      "农历描述": "1990年5月23日"
    },
    "口径": {
      "sect": 1,
      "trueSolar": true,
      "childLimitProvider": "default",
      "年龄基准": "虚岁"
    },
    "historicalTzApprox": false,
    "警告": [
      "当地日期与北京日期不同；若农历系按中国日期记录请改用 frame=beijing"
    ],
    "引擎信息": {
      "baziEngine": "@openfate/bazi-engine@1.1.2",
      "trueSolarTimeEngine": "@openfate/true-solar-time@4.0.2",
      "schemaVersion": "1.0.0"
    }
  }
}
```

---

### 2. `lookup_location`

Resolves city names to coordinates and official IANA timezone identifiers.

#### Parameters:
- `query` (*string*, required): City query (e.g. `"乌鲁木齐"`, `"San Francisco"`, `"Tokyo"`).

---

## 🧪 Benchmark & Test Verification

`bazi-mcp` is verified against an extensive, rigorous test suite (69 tests, 100% pass):

1. **Astro-Databank Rodden Rating AA Official Hospital Birth Certificates**:
   - **Donald Trump**: `1946-06-14 10:54 EDT` (New York, NY) ➔ `丙戌 甲午 己未 己巳`
   - **Barack Obama**: `1961-08-04 19:24 HST` (Honolulu, HI) ➔ `辛丑 乙未 己巳 癸酉`
   - **Bill Gates**: `1955-10-28 22:00 PST` (Seattle, WA) ➔ `乙未 丙戌 壬戌 辛亥`
   - **Steve Jobs**: `1955-02-24 19:15 PST` (San Francisco, CA) ➔ `乙未 戊寅 丙辰 丁酉` *(True Solar correction shifts 19:15 to 18:52 酉 hour)*
   - **Albert Einstein**: `1879-03-14 11:30` (Ulm, Germany) ➔ `己卯 丁卯 丙申 甲午`
2. **Official Historical Archives & Canonical Metaphysics Records**:
   - **Chiang Kai-shek**: `1887-10-31 12:00` (Zhejiang Fenghua - *Qian Li Ming Gao*) ➔ `丁亥 庚戌 己巳 庚午`
   - **Mao Zedong**: `1893-12-26 辰时` (Hunan Shaoshan) ➔ `癸巳 甲子 丁酉 甲辰`
   - **Zhou Enlai**: `1898-03-05 卯时` (Jiangsu Huaian) ➔ `戊戌 甲寅 丁卯 癸卯`
   - **Deng Xiaoping**: `1904-08-22 申时` (Sichuan Guangan) ➔ `甲辰 壬申 戊子 庚申`
   - **Liang Qichao**: `1873-02-23 丑时` (Guangdong Xinhui) ➔ `癸酉 甲寅 丙午 己丑`
3. **VSOP87 Astronomical Cross-Validation (G1 to G5)**:
   - Baseline Beijing, overseas solar term rollover, US DST跨日, Xinjiang large longitude offset, China historical 1988 DST.
4. **Global Multi-Region Suite (28 regions across 6 continents)**:
   - China (Kashgar extreme west, Harbin extreme east, Lhasa high-altitude, Sanya tropical, Hong Kong, Taipei).
   - Americas (New York, Los Angeles, Chicago, Phoenix no-DST, St. John's 30-min timezone, São Paulo, Buenos Aires).
   - Europe & Eurasia (London GMT/BST, Paris, Moscow, Vladivostok, Reykjavik UTC+0).
   - Asia & Middle East (Tokyo, Seoul, Singapore, New Delhi / Mumbai UTC+5:30, Dubai).
   - Oceania & Southern Hemisphere (Sydney reversed DST, Perth, Auckland).
   - Africa (Johannesburg, Cairo).

---

## 📜 License

[MIT License](LICENSE) © 2026 Wesley Liu
