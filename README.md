# Bazi MCP (`@lhk714/bazi-mcp`)

[![npm version](https://img.shields.io/npm/v/@lhk714/bazi-mcp.svg)](https://www.npmjs.com/package/@lhk714/bazi-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/listen-hai/bazi-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/listen-hai/bazi-mcp/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-117%20passed%2C%200%20failed-brightgreen.svg)]()
[![Bun](https://img.shields.io/badge/runtime-Bun%20%7C%20Node-black.svg)]()

> Deterministic, high-precision Four Pillars of Destiny (八字排盘) Model Context Protocol (MCP) server powered by a physical dual-axis astronomical time engine and global geographic database (7,329 cities across 227 countries).

[中文文档 (Chinese)](README_zh.md) | [English](README.md)

---

## 🌟 Overview

`@lhk714/bazi-mcp` provides a production-grade, offline-first MCP server for Large Language Models (Claude, Cursor, Antigravity, ChatGPT, DeepSeek) to perform rigorous Chinese Four Pillars of Destiny (八字) calculations for anyone, anywhere on Earth, across 1800–2100.

It is published on the NPM registry and can be run instantly without manual installation or local compilation.

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

---

## 🚀 Quickstart: Run via NPM

You can run `@lhk714/bazi-mcp` directly from NPM using **Bun** or **Node.js (NPX)** with zero local repository setup.

### Option 1: Instant execution with Bun (`bunx`)
```bash
bunx @lhk714/bazi-mcp
```

### Option 2: Instant execution with Node.js (`npx`)
```bash
npx -y @lhk714/bazi-mcp
```

### Option 3: Global Installation
```bash
# Install globally via Bun
bun add -g @lhk714/bazi-mcp

# Or install globally via NPM
npm install -g @lhk714/bazi-mcp

# Then run anywhere:
bazi-mcp
```

---

## ⚙️ MCP Client Configuration

Add `@lhk714/bazi-mcp` to your MCP client config (e.g. Claude Desktop, Cursor, Cline, Roo Code, Antigravity):

#### Using Bun (`bunx`):
```json
{
  "mcpServers": {
    "bazi": {
      "command": "bunx",
      "args": ["@lhk714/bazi-mcp"]
    }
  }
}
```

#### Using Node.js (`npx`):
```json
{
  "mcpServers": {
    "bazi": {
      "command": "npx",
      "args": ["-y", "@lhk714/bazi-mcp"]
    }
  }
}
```

---

## 🛠️ MCP Tools Reference

### 1. `calculate_bazi`
Calculates Four Pillars, Day Master, Da Yun (Major Luck Cycles labeled with nominal age 虚岁), Branch Interactions (刑冲合会), and Diagnostic Metadata.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `place` | string | Optional | City name in English (e.g. `"Beijing"`, `"New York"`, `"Tacoma, WA"`, `"Lagos"`, `"London, United Kingdom"`). AI agents automatically translate any user language. |
| `longitude` | number | Optional | Birth longitude in degrees (East positive, e.g. `102.8329` or `-122.4443`). *Note for Date Line locations (e.g. Chatham Islands): express longitude in [-180, 180] (e.g. `-176.55` in `UTC+12:45`), normalized against the standard time meridian.* |
| `timezone` | string | Optional | IANA timezone identifier (e.g. `"Asia/Shanghai"`, `"America/Los_Angeles"`) |
| `solarDate` | object | Optional* | Solar birth date `{ "year": 1993, "month": 7, "day": 14 }` (supported: 1800–2100) |
| `lunarDate` | object | Optional* | Lunar birth date `{ "year": 1993, "month": 5, "day": 25, "isLeapMonth": false }` (supported: 1800–2100) |
| `lunarDateFrame` | string | Optional | `"local"` (default) or `"beijing"` |
| `clockTime` | object | Optional** | Local wall clock time `{ "hour": 11, "minute": 27 }` |
| `shichen` | string | Optional** | Traditional Chinese two-hour branch (`'子'` to `'亥'`) |
| `timeUnknown` | boolean | Optional** | Set `true` for a 3-pillar chart |
| `dstFold` | number | Optional | `0` (DST) or `1` (Standard) for ambiguous fall-back overlap hours |
| `gender` | string | **Required** | `"male"` (乾造) or `"female"` (坤造) |
| `sect` | number | Optional | `2` (default, 23:00 Zi-hour rollover / 子初换日, self-consistent with rat-chasing cycle 五鼠遁) or `1` (00:00 midnight day rollover / 子正换日) |
| `trueSolar` | boolean | Optional | `true` (default) for astronomical True Solar Time correction |

*\* Provide either `solarDate` or `lunarDate`.*  
*\*\* Provide either `clockTime`, `shichen`, or `timeUnknown: true`.*

`diagnostics.locationSource` reports whether the location was `"resolved"` from the global city database, `"caller_supplied"` via explicit coordinates, or `"mixed"` (place coordinates paired with a caller-supplied custom timezone).

---

### 2. `lookup_location`
Resolves city names to coordinates, administrative regions, and official IANA timezone identifiers across 7,329 global cities in 227 countries.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `query` | string | **Required** | City query string in English (e.g. `"Tokyo"`, `"Seattle"`, `"Paris"`, `"Kunming"`) |

---

## 🧪 Verification & Benchmark Matrix

`@lhk714/bazi-mcp` is verified against 117 rigorous test cases (100% passing):

1. **Astro-Databank Rodden Rating AA Hospital Birth Certificates**:
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
3. **Global Multi-Region Suite (28 regions across 6 continents)**:
   - China (Kashgar extreme west, Harbin extreme east, Lhasa high-altitude, Sanya tropical, Hong Kong, Taipei).
   - Americas (New York, Los Angeles, Chicago, Phoenix no-DST, St. John's 30-min timezone, São Paulo, Buenos Aires).
   - Europe & Eurasia (London GMT/BST, Paris, Moscow, Vladivostok, Reykjavik UTC+0).
   - Asia & Middle East (Tokyo, Seoul, Singapore, New Delhi / Mumbai UTC+5:30, Dubai).
   - Oceania & Southern Hemisphere (Sydney reversed DST, Perth, Auckland).
   - Africa (Johannesburg, Cairo).

---

## 🔄 CI/CD & Automated NPM Publishing

The repository is equipped with automated GitHub Actions:
- **Continuous Integration (`ci.yml`)**: Runs tests and builds on every push/PR to `main`.
- **Automated NPM Release (`publish.yml`)**: Automatically tests, builds, and publishes `@lhk714/bazi-mcp` to NPM whenever a new release or tag (e.g. `v1.0.0`) is created.

---

## 📜 License

[MIT License](LICENSE) © 2026 Wesley Liu
