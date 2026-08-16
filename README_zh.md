# 八字排盘 MCP (`bazi-mcp`)

[![npm version](https://img.shields.io/npm/v/bazi-mcp.svg)](https://www.npmjs.com/package/bazi-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-69%20passed%2C%200%20failed-brightgreen.svg)]()
[![Bun](https://img.shields.io/badge/runtime-Bun%20%7C%20Node-black.svg)]()

> 基于物理双时间轴（Dual Time-Axis）架构的高精度八字排盘 Model Context Protocol (MCP) 服务。对全球任意出生地、任意年代（含历史夏令时与战时夏令时）均能给出正确的四柱、十神、大运与完整诊断块。

[English Documentation](README.md) | [中文文档](README_zh.md)

---

## 🌟 为什么需要 `bazi-mcp`？

目前绝大多数开源八字排盘方案都犯了一个核心架构错误：**将「天文瞬时」与「当地太阳位置」混在单一条时间轴上计算**。

对于海外出生者、夏令时年份、以及新疆等与东八区经线相差较大的地区，这种“单时间轴”会导致年柱、月柱、日柱或时柱发生错位。

`bazi-mcp` 采用 **物理双时间轴（Dual Time-Axis）** 彻底解决了该问题：

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

- **轴 A（UTC 瞬时）**：保留出生的绝对天文瞬时（折算为北京平太阳时，经度锁定 120°E，关闭真太阳时），严谨确定 **年柱、月柱、大运起运时刻**。
- **轴 B（当地真太阳时）**：由当地墙面时间 + IANA 时区 + 出生地经度驱动，结合 Meeus 时差方程计算太阳高度角，确定 **日柱、时柱**。
- **十神重算**：以轴 B 确定的日主（日干）为基准，对四柱十神与藏干十神全面重算与对齐。

---

## ✨ 核心功能

- **物理双时间轴精度**：彻底消除跨时区窗口内的年月柱误判与节气跳变问题。
- **全历史 IANA 夏令时与 DST 消歧**：
  - 完整支持包含中国 1986–1991 年夏令时及 1940–41 年战时夏令时在内的全球历史夏令时。
  - **春季跳跃缺口**：检测不存在的墙面时刻并安全报错。
  - **秋季折返重叠**：支持 `dstFold: 0 | 1` 精确消歧。
  - **南半球夏令时兼容**：自适应南半球（如澳大利亚、新西兰）夏令时极性反转。
- **农历双 Frame 支持**：
  - `local`（默认）：海外华人按当地公历日查老黄历记录的农历。
  - `beijing`：按中国公历日记录的农历。
  - 农历闰月（如 2020 闰四月十五）完整支持与非法闰月严格拦截。
- **时辰模糊抽样**：
  - 对仅传入时辰（如乌鲁木齐“未时”）在大经差地区自动进行区间采样，跨越边界时标记 `timeAmbiguous: true` 并返回全部候选时柱。
- **三柱盘支持**：`timeUnknown: true` 输出三柱盘，时柱与依赖时支的神煞置 `null`，大运正常计算。
- **1901 年前历史时区提示**：对清代地方平时（LMT）偏差进行诊断块警告说明。
- **内置离线地理数据库**：内置 300+ 中国城市与 50+ 全球核心都会经纬度及 IANA 时区，辅以 `tz-lookup` 兜底。
- **MCP 生产级防御**：强类型 Zod 约束，异常优雅捕获，Stdio 进程零崩溃。

---

## 🚀 快速开始

### 1. 免安装即开即用 (`bunx` 或 `npx`)

```bash
# 使用 Bun 运行
bunx bazi-mcp

# 或使用 Node / NPX 运行
npx -y bazi-mcp
```

### 2. 本地开发与测试

```bash
# 克隆仓库
git clone https://github.com/listen-hai/bazi-mcp.git
cd bazi-mcp

# 安装依赖
bun install

# 运行全量 69 项测试套件
bun test
```

---

## 🔌 MCP 客户端配置

### Claude Desktop / Cursor / Antigravity

在 `claude_desktop_config.json` 或 MCP 设置中添加：

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

*若使用 Node/NPX:*
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

## 🛠️ MCP 工具说明

### 1. `calculate_bazi` (八字排盘计算)

计算四柱干支、日主、大运（标明虚岁）、刑冲合会（去重）及完整诊断元数据。

#### 参数列表：
- `place` (*string*, 可选): 城市中英文名称（如 `"广州"`、`"Tacoma, WA"`、`"London"`）。
- `longitude` (*number*, 可选): 经度（东经为正，西经为负，如 `116.4074` 或 `-122.4443`）。
- `timezone` (*string*, 可选): 官方 IANA 时区名（如 `"Asia/Shanghai"`、`"America/Los_Angeles"`）。
- `solarDate` (*object*, 可选): 公历出生日期 `{ "year": 2024, "month": 2, "day": 4 }`。
- `lunarDate` (*object*, 可选): 农历出生日期 `{ "year": 1990, "month": 5, "day": 23, "isLeapMonth": false }`。
- `lunarDateFrame` (*string*, 可选): `"local"` (默认) 或 `"beijing"`。
- `clockTime` (*object*, 可选): 钟表时刻 `{ "hour": 8, "minute": 0 }`。
- `shichen` (*string*, 可选): 传统时辰（`'子'` 至 `'亥'`）。
- `timeUnknown` (*boolean*, 可选): 传 `true` 排三柱盘。
- `dstFold` (*number*, 可选): `0` (夏令时) 或 `1` (标准时)。
- `gender` (*string*, 必填): `"male"` (乾造/男) 或 `"female"` (坤造/女)。
- `sect` (*number*, 可选): `1` (默认 00:00 换日) 或 `2` (23:00 换日)。
- `trueSolar` (*boolean*, 可选): `true` (默认开启真太阳时校正)。

---

### 2. `lookup_location` (城市与时区查询)

查询城市地理经纬度与官方 IANA 时区。

#### 参数列表：
- `query` (*string*, 必填): 城市名称（如 `"乌鲁木齐"`、`"San Francisco"`、`"Tokyo"`）。

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
3. **VSOP87 天文交叉实测 (G1~G5)**：
   - 包含基线、海外节气跨年柱、美国 DST 跨日、新疆大经度差、中国 1988 夏令时。
4. **全球五大洲 28 个代表性城市全覆盖**：
   - 中国各方位（喀什极西延迟3小时、哈尔滨极东超前、拉萨高海拔、三亚热带、港台）。
   - 美洲（纽约、洛杉矶、芝加哥、凤凰城无DST、纽芬兰30分时区、圣保罗、布宜诺斯艾利斯）。
   - 欧洲与欧亚（伦敦GMT/BST、巴黎、莫斯科、海参崴、冰岛UTC+0）。
   - 亚洲与中东（东京、首尔、新加坡、新德里/孟买UTC+5:30、迪拜）。
   - 大洋洲与南半球（悉尼南半球反转DST、珀斯、奥克兰）。
   - 非洲（约翰内斯堡、开罗）。

---

## 📜 开源协议

[MIT License](LICENSE) © 2026 Wesley Liu
