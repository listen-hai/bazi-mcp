# 八字排盘 MCP (`@lhk714/bazi-mcp`)

[![npm version](https://img.shields.io/npm/v/@lhk714/bazi-mcp.svg)](https://www.npmjs.com/package/@lhk714/bazi-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/listen-hai/bazi-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/listen-hai/bazi-mcp/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-69%20passed%2C%200%20failed-brightgreen.svg)]()
[![Bun](https://img.shields.io/badge/runtime-Bun%20%7C%20Node-black.svg)]()

> 基于物理双时间轴（Dual Time-Axis）架构的高精度八字排盘 Model Context Protocol (MCP) 服务。对全球任意出生地、任意年代（含历史夏令时与战时夏令时）均能给出正确的四柱、十神、大运与完整诊断块。

[English Documentation](README.md) | [中文文档](README_zh.md)

---

## 🌟 项目简介

`@lhk714/bazi-mcp` 是专为大语言模型（Claude、Cursor、Antigravity、ChatGPT、DeepSeek）打造的生产级、纯离线八字排盘 MCP 服务。已配置至 NPM 官方仓库，支持通过 `bunx` 或 `npx` 秒级拉取并免安装运行。

```
出生钟表时间 + IANA 时区 (如 1990-06-15 20:00 America/Los_Angeles)
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
      【轴 A: UTC 瞬时】          【轴 B: 当地真太阳时】
   UTC: 1990-06-16 03:00:00Z    当地时间 + 经度差 + Meeus时差 - 夏令时
      北京墙钟: 1990-06-16 11:00   当地真太阳: 1990-06-15 18:49
            │                           │
            ├──────────────┐            ├──────────────┐
            ▼              ▼            ▼              ▼
       【年柱】       【月柱】       【日柱】       【时柱】
         庚午           壬午          辛亥           丁酉
            │
            ▼
      【大运 (起运)】
```

---

## 🚀 快速开始：从 NPM 直接运行

无需克隆代码仓库，直接使用 **Bun** 或 **Node.js (NPX)** 即可一键拉取并执行：

### 方式 1：使用 Bun 运行 (`bunx` - 启动速度最快)
```bash
bunx @lhk714/bazi-mcp
```

### 方式 2：使用 Node.js 运行 (`npx`)
```bash
# Node.js 18+ 环境
npx -y @lhk714/bazi-mcp
```

### 方式 3：全局安装到命令行
```bash
# 使用 Bun 全局安装
bun add -g @lhk714/bazi-mcp

# 或使用 NPM 全局安装
npm install -g @lhk714/bazi-mcp

# 安装后在任意终端直接输入命令：
bazi-mcp
```

---

## 🔌 MCP 客户端配置

在各 MCP 客户端配置文件中添加 `@lhk714/bazi-mcp`：

### Claude Desktop 配置文件路径
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

#### 使用 Bun 配置 (`bunx` 推荐)：
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

#### 使用 Node 配置 (`npx`)：
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

## 🛠️ MCP 工具说明

### 1. `calculate_bazi` (八字排盘计算)

计算四柱干支、日主、大运（标明虚岁）、刑冲合会（去重）及完整诊断元数据。

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `place` | string | 可选 | 城市中英文名称（如 `"昆明"`、`"Tacoma, WA"`、`"London"`） |
| `longitude` | number | 可选 | 经度（东经为正，如 `102.8329`，西经为负如 `-122.4443`） |
| `timezone` | string | 可选 | 官方 IANA 时区名（如 `"Asia/Shanghai"`、`"America/Los_Angeles"`） |
| `solarDate` | object | 可选* | 公历出生日期 `{ "year": 1993, "month": 7, "day": 14 }` |
| `lunarDate` | object | 可选* | 农历出生日期 `{ "year": 1993, "month": 5, "day": 25, "isLeapMonth": false }` |
| `lunarDateFrame` | string | 可选 | `"local"` (默认) 或 `"beijing"` |
| `clockTime` | object | 可选** | 钟表时刻 `{ "hour": 11, "minute": 27 }` |
| `shichen` | string | 可选** | 传统时辰（`'子'` 至 `'亥'`） |
| `timeUnknown` | boolean | 可选** | 传 `true` 排三柱盘（时柱为 `null`） |
| `dstFold` | number | 可选 | `0` (夏令时) 或 `1` (标准时) 用于秋季折返重叠消歧 |
| `gender` | string | **必填** | `"male"` (乾造) 或 `"female"` (坤造) |
| `sect` | number | 可选 | `1` (默认 00:00 换日) 或 `2` (23:00 换日) |
| `trueSolar` | boolean | 可选 | `true` (默认开启真太阳时校正) |

*\* `solarDate` 与 `lunarDate` 二选一*  
*\*\* `clockTime`、`shichen` 与 `timeUnknown` 三选一*

---

### 2. `lookup_location` (城市与时区查询)

查询城市地理经纬度与官方 IANA 时区。

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `query` | string | **必填** | 城市名称（如 `"昆明"`、`"San Francisco"`、`"Tokyo"`） |

---

## 🧪 权威实测数据集验证

全套 69 个测试用例，100% 绿灯通过：

1. **Astro-Databank 官方医院出生证明 (Rodden Rating AA)**：
   - **唐纳德·特朗普 (Donald Trump)**: `1946-06-14 10:54 EDT` ➔ `丙戌 甲午 己未 己巳`
   - **贝拉克·奥巴马 (Barack Obama)**: `1961-08-04 19:24 HST` ➔ `辛丑 乙未 己巳 癸酉`
   - **比尔·盖茨 (Bill Gates)**: `1955-10-28 22:00 PST` ➔ `乙未 丙戌 壬戌 辛亥`
   - **史蒂夫·乔布斯 (Steve Jobs)**: `1955-02-24 19:15 PST` ➔ `乙未 戊寅 丙辰 丁酉` *(真太阳时校准至 18:52 酉时)*
   - **阿尔伯特·爱因斯坦 (Albert Einstein)**: `1879-03-14 11:30` ➔ `己卯 丁卯 丙申 甲午`
2. **正史档案与经典命理典籍实录**：
   - **蒋介石**: `1887-10-31 12:00` 浙江奉化溪口（韦千里《千里命稿》） ➔ `丁亥 庚戌 己巳 庚午`
   - **毛泽东**: `1893-12-26 辰时` 湖南韶山 ➔ `癸巳 甲子 丁酉 甲辰`
   - **周恩来**: `1898-03-05 卯时` 江苏淮安 ➔ `戊戌 甲寅 丁卯 癸卯`
   - **邓小平**: `1904-08-22 申时` 四川广安 ➔ `甲辰 壬申 戊子 庚申`
   - **梁启超**: `1873-02-23 丑时` 广东新会 ➔ `癸酉 甲寅 丙午 己丑`
3. **全球五大洲 28 个代表性城市全覆盖**：
   - 中国各大方位（喀什极西延迟3小时、哈尔滨极东超前、拉萨高海拔、三亚热带、港台）。
   - 美洲（纽约、洛杉矶、芝加哥、凤凰城无DST、纽芬兰30分时区、圣保罗、布宜诺斯艾利斯）。
   - 欧洲与欧亚（伦敦GMT/BST、巴黎、莫斯科、海参崴、冰岛UTC+0）。
   - 亚洲与中东（东京、首尔、新加坡、新德里/孟买UTC+5:30、迪拜）。
   - 大洋洲与南半球（悉尼南半球反转DST、珀斯、奥克兰）。
   - 非洲（约翰内斯堡、开罗）。

---

## 🔄 CI/CD 与自动化 NPM 发布

项目已集成 GitHub Actions 自动化工作流：
- **持续集成 (`ci.yml`)**：在每次 `push` 或 `pull_request` 时自动运行全量测试与打包构建。
- **自动发布 NPM (`publish.yml`)**：当创建新 Release 或推送版本 Tag（如 `v1.0.0`）时，自动编译并发布 `@lhk714/bazi-mcp` 到 NPM 官方仓库。

---

## 📜 开源协议

[MIT License](LICENSE) © 2026 Wesley Liu
