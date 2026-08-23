# Bazi MCP 八字排盘服务端 (`@lhk714/bazi-mcp`)

[![npm version](https://img.shields.io/npm/v/@lhk714/bazi-mcp.svg)](https://www.npmjs.com/package/@lhk714/bazi-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/listen-hai/bazi-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/listen-hai/bazi-mcp/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-117%20passed%2C%200%20failed-brightgreen.svg)]()
[![Bun](https://img.shields.io/badge/runtime-Bun%20%7C%20Node-black.svg)]()

> 基于物理双时间轴天文学算法、全球离线地理数据库（7,329 个城市，227 个国家）与全量历史夏令时支持的高精度中国传统子平八字排盘 Model Context Protocol (MCP) 服务。

[中文文档](README_zh.md) | [English Documentation](README.md)

---

## 🌟 核心特性与架构设计

`@lhk714/bazi-mcp` 为大语言模型客户端（Claude Desktop、Cursor、Antigravity、ChatGPT、DeepSeek 等）提供工业级、离线可用的八字排盘核心能力，支持 1800–2100 年代。

### 双时间轴（Dual-Axis）物理天文学架构

排盘严格遵循物理学与历法天文学原理，彻底解决海外出生、夏令时、新疆等特殊经度引起的干支错乱问题：

```
出生钟表时间 + IANA 时区（如 1990-06-15 20:00 America/Los_Angeles）
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
      【轴 A: UTC 瞬时】          【轴 B: 当地真太阳时】
   UTC: 1990-06-16 03:00:00Z    当地时间 + 经度时差 + Meeus 均时差 - 夏令时
      折算北京时间: 1990-06-16 11:00      当地真太阳时: 1990-06-15 18:49
            │                           │
            ├──────────────┐            ├──────────────┐
            ▼              ▼            ▼              ▼
        【年柱】        【月柱】        【日柱】        【时柱】
          庚午            壬午          辛亥            丁酉
            │
            ▼
        【大运起运】
```

1. **轴 A（UTC 瞬时 ➔ 120°E 北京墙钟）**：以地球相对太阳的绝对空间物理位置定节气、定**年柱**、**月柱**与**大运起运交运时刻**。
2. **轴 B（当地钟表时间 + 经度修正 + Meeus 均时差 - 夏令时）**：以出生地本地太阳昼夜交替物理规律定**日柱**与**时柱**。
3. **十神与日主校准**：藏干与干支十神严格基于轴 B 实际日主重新推算，绝不误用北京日主。

---


## 🔮 本服务不会告诉你的

**只做计算，不做推理。** 身强弱、喜用神、格局都是称量，而没有任何来源提供它们所需的
权重——公开的数字互相矛盾，可靠的在闭源软件里。在这里给出一个打分判定，无论方法署名
写得多讲究，都建立在**本仓库发明的数字**上。v3.1.0 发过一版，v4.0.0 撤除。

你得到的是 `strengthFactors`——零权重账本：月令关系与旺相休囚死、逐支通根及其气位与
禄/刃/长生/墓库根标签、以及天干帮扶方向。每一项都是查表。
用你自己流派的规则去称量，或者接一个命理知识库——**事实都在这儿，而事实是能被做对的那部分。**

其中两张表存在真实的流派分歧，因此 `strengthFactors.conventions` 写明本包采用哪一派、
未采用哪些、以及换一派会改变哪些字段。阴日主尤其明显：十二长生这一岔路会改变每一个支，
辛 在 巳 按本包所用的《渊海子平》口径是 `死`，按《滴天髓》阴阳同生同死则是 `长生`。
选了一派却不说，等于把一派的答案当成唯一答案端出去。

出生时辰未知时整体缺席。

## 🚀 极速上手：通过 NPM 直接运行

本包已正式发布至 NPM 官方 Registry，支持通过 **Bun** 或 **Node.js (NPX)** 免本地安装、免编译一秒启动。

### 方式 1：使用 Bun 运行（推荐，秒级冷启动）
```bash
bunx @lhk714/bazi-mcp
```

### 方式 2：使用 Node.js / NPX 运行
```bash
npx -y @lhk714/bazi-mcp@latest
```

### 方式 3：全局安装使用
```bash
# 通过 Bun 全局安装
bun add -g @lhk714/bazi-mcp

# 或通过 NPM 全局安装
npm install -g @lhk714/bazi-mcp@latest

# 随后在任意终端直接运行：
bazi-mcp
```

---

## 🔌 客户端配置指南 (MCP Client Configuration)

### 1. Claude Desktop 接入配置

**macOS 配置文件路径**：`~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows 配置文件路径**：`%APPDATA%\Claude\claude_desktop_config.json`

#### 使用 Bun（推荐）：
```json
{
  "mcpServers": {
    "bazi": {
      "command": "bunx",
      "args": ["@lhk714/bazi-mcp@latest"]
    }
  }
}
```

#### 使用 Node.js：
```json
{
  "mcpServers": {
    "bazi": {
      "command": "npx",
      "args": ["-y", "@lhk714/bazi-mcp@latest"]
    }
  }
}
```

---

## 🛠️ MCP 工具接口规范

### 1. `calculate_bazi`（高精度八字排盘）
计算完整四柱、日主五行阴阳、大运流程（标明虚岁）、天干五合与地支刑冲合会，以及诊断元数据。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `place` | string | 可选 | 城市英文名称（如 `"Beijing"`、`"New York"`、`"Tacoma, WA"`、`"London, United Kingdom"`）。AI Agent 会自动翻译用户的任意语言输入。 |
| `longitude` | number | 可选 | 出生地经度（东经为正，如 `102.8329`，西经为负，如 `-122.4443`。*跨日界线地点如 Chatham 群岛请在 [-180, 180] 范围内传值如 `-176.55`*）。*对靠近对向子午线（antimeridian）的出生地，底层真太阳时修正按 360° 折算，因此日柱仍按出生地**民用日期**计算，即使真太阳对应的日期已提前一整天——这是既定约定，并非缺陷。* |
| `timezone` | string | 可选 | 官方 IANA 时区名称（如 `"Asia/Shanghai"`、`"America/Los_Angeles"`） |
| `solarDate` | object | 二选一* | 公历出生日期 `{ "year": 1990, "month": 1, "day": 1 }`（支持范围：1800–2100） |
| `lunarDate` | object | 二选一* | 农历出生日期 `{ "year": 1989, "month": 12, "day": 5, "isLeapMonth": false }`（支持范围：1800–2100） |
| `lunarDateFrame` | string | 可选 | 农历时区基准：`"local"`（默认，按当地公历日对应农历）或 `"beijing"` |
| `clockTime` | object | 三选一** | 钟表出生时刻 `{ "hour": 11, "minute": 27 }` |
| `shichen` | string | 三选一** | 传统十二时辰分支（`'子'` 至 `'亥'`） |
| `timeUnknown` | boolean | 三选一** | 时辰未知（传 `true` 排三柱盘，时柱置 `null`） |
| `dstFold` | number | 可选 | 秋季夏令时折返重叠消歧：`0`（夏令时）或 `1`（标准时） |
| `gender` | string | **必填** | `"male"`（乾造/男）或 `"female"`（坤造/女） |
| `sect` | number | 可选 | 早晚子时口径：`2`（默认，23:00 子初换日，五鼠遁自洽）或 `1`（00:00 子正换日） |
| `solarTime` | string | 可选 | 真太阳时修正模式：`"true"`（默认，经度修正 + 时差修正）、`"mean"`（仅经度修正，地方平太阳时）或 `"off"`（均不修正，直接使用钟表时刻） |
| `trueSolar` | boolean | 可选，已弃用 | 请改用 `solarTime`（`true` → `"true"`，`false` → `"off"`）。若与 `solarTime` 同时传入且取值冲突将被拒绝。 |

*\* `solarDate` 与 `lunarDate` 必须提供其一。*  
*\*\* `clockTime`、`shichen`、`timeUnknown: true` 必须提供其一。*

`diagnostics.locationSource` 字段会明确指示坐标来源是全球城市库解析（`"resolved"`）、调用方完整自定义传入（`"caller_supplied"`），还是混合模式（`"mixed"`，即城市库解析经度搭配调用方指定的自定义时区）。

---

### 2. `lookup_location`（全球城市地理与时区查询）
查询全球 7,329 个城市（覆盖 227 个国家）的地理经纬度与官方 IANA 时区。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `query` | string | **必填** | 城市英文名称（如 `"Tokyo"`、`"Seattle"`、`"Paris"`、`"Kunming"`） |

---

## 🧪 权威金标测试矩阵 (117 个用例 100% 全绿通过)

1. **Astro-Databank 权威医院出生证明 (AA级) 真实名人命例**：
   - 特朗普 (Donald Trump): `1946-06-14 10:54 EDT` (New York, NY) ➔ `丙戌 甲午 己未 己巳`
   - 奥巴马 (Barack Obama): `1961-08-04 19:24 HST` (Honolulu, HI) ➔ `辛丑 乙未 己巳 癸酉`
   - 比尔·盖茨 (Bill Gates): `1955-10-28 22:00 PST` (Seattle, WA) ➔ `乙未 丙戌 壬戌 辛亥`
   - 乔布斯 (Steve Jobs): `1955-02-24 19:15 PST` (San Francisco, CA) ➔ `乙未 戊寅 丙辰 丁酉` *(真太阳时回拨至 18:52 酉时)*
   - 爱因斯坦 (Albert Einstein): `1879-03-14 11:30` (Ulm, Germany) ➔ `己卯 丁卯 丙申 甲午`
2. **中国历史官方档案与命理古籍经典命造**：
   - 蒋介石: `1887-10-31 12:00` (浙江奉化 - 《千里命稿》) ➔ `丁亥 庚戌 己巳 庚午`
   - 毛泽东: `1893-12-26 辰时` (湖南韶山) ➔ `癸巳 甲子 丁酉 甲辰`
   - 周恩来: `1898-03-05 卯时` (江苏淮安) ➔ `戊戌 甲寅 丁卯 癸卯`
   - 邓小平: `1904-08-22 申时` (四川广安) ➔ `甲辰 壬申 戊子 庚申`
   - 梁启超: `1873-02-23 丑时` (广东新会) ➔ `癸酉 甲寅 丙午 己丑`
3. **全球五大洲 28 核心区域代表性测试**：
   - 中国全境（新疆喀什大经差延迟近3小时、哈尔滨超前26分钟、拉萨高海拔、三亚热带、香港、台北）。
   - 美洲（纽约、洛杉矶、芝加哥、亚利桑那无夏令时、纽芬兰圣约翰斯半小时时区、圣保罗、布宜诺斯艾利斯）。
   - 欧洲与欧亚大陆（伦敦零时区、巴黎、莫斯科、海参崴、冰岛雷克雅未克）。
   - 亚洲与中东（东京、首尔、新加坡、新德里/孟买 UTC+5:30、迪拜）。
   - 大洋洲与南半球（悉尼反向夏令时、珀斯、奥克兰）。
   - 非洲（约翰内斯堡、开罗）。

---

## 📜 开源许可证

[MIT License](LICENSE) © 2026 Wesley Liu
