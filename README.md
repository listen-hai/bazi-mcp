# 八字排盘 MCP (bazi-mcp)

基于物理双时间轴（Dual Time-Axis）架构的高精度八字排盘 Model Context Protocol (MCP) 服务。对全球任意出生地、任意年代（含历史夏令时与战时夏令时）均能给出正确的四柱、十神、大运与完整诊断块。

---

## 🌟 核心特性

1. **物理双时间轴核心 (Dual Time-Axis Engine)**：
   - **轴 A (UTC 瞬时)**：将出生瞬时折算至北京平太阳时（120°E，关闭真太阳时），严谨确定 **年柱、月柱、大运起运时刻**。
   - **轴 B (当地真太阳时)**：结合出生地真实经度与 Meeus 时差方程计算太阳高度角，确定 **日柱、时柱**。
   - **真实日主对齐**：以轴 B 确定的日主为基准，对四柱十神与藏干十神全面重算。
2. **全历史 IANA 夏令时与 DST 消歧**：
   - 支持包含中国 1986–1991 年夏令时在内的全球全部历史夏令时。
   - 自动检测春季跳跃不存在的“时间黑洞”，并在秋季折返重叠时支持 `dstFold: 0 | 1` 消歧。
   - 自适应南半球（如澳大利亚、新西兰）夏令时极性反转。
3. **农历与时辰歧义处理**：
   - 支持农历 `local`（海外华人查老黄历）与 `beijing`（中国日期基准）双 Frame。
   - 针对大经差地区仅传入时辰（如乌鲁木齐“未时”）自动进行区间真太阳时抽样，标记 `timeAmbiguous` 并列出全部候选时柱。
   - 支持 `timeUnknown: true` 三柱盘排盘。
4. **全球地理数据库与离线解析**：
   - 内置全球 300+ 中国主要城市与全球五大洲代表性城市数据库（含中英文名称、经纬度与官方 IANA 时区）。
   - 结合 `tz-lookup` 经纬度推算，杜绝粗暴经度四舍五入。
5. **完整诊断块 (Diagnostics Block)**：
   - 回显钟面、时区偏移、UTC瞬时、轴A/B换算时间、经度修正量、时差方程修正量、农历公历对应、口径（虚岁起运）与刑冲合会去重。

---

## 📦 安装与快速运行

### 1. 本地直接运行 (Bun)

```bash
# 安装依赖
bun install

# 运行全量测试套件 (包含金标天文实测、Astro-Databank AA 出生证、全球多地域测试)
bun test

# 启动 MCP 服务 (Stdio 协议)
bun run src/index.ts
```

---

## 🔌 MCP 客户端配置

### Claude Desktop / Cursor / Antigravity 配置

在 `claude_desktop_config.json` 或各客户端的 MCP 设置中添加：

```json
{
  "mcpServers": {
    "bazi": {
      "command": "bun",
      "args": ["run", "/绝对路径/bazi-mcp/src/index.ts"]
    }
  }
}
```

---

## 🛠️ MCP 工具说明

### 1. `calculate_bazi` (八字排盘计算)
- **输入参数**：
  - `place` (string, 可选): 出生城市名称（如 "广州", "Tacoma, WA", "乌鲁木齐"）
  - `longitude` (number, 可选): 出生地经度（东经为正，如 116.4074）
  - `timezone` (string, 可选): IANA 时区名（如 "Asia/Shanghai", "America/Los_Angeles"）
  - `solarDate` (object, 与 lunarDate 二选一): `{ year, month, day }`
  - `lunarDate` (object, 与 solarDate 二选一): `{ year, month, day, isLeapMonth? }`
  - `lunarDateFrame` (string, 可选): `'local'` (默认) 或 `'beijing'`
  - `clockTime` (object, 与 shichen/timeUnknown 三选一): `{ hour, minute, second? }`
  - `shichen` (string, 可选): `'子'` ~ `'亥'`
  - `timeUnknown` (boolean, 可选): `true` 时排三柱盘
  - `dstFold` (number, 可选): `0` (夏令时) 或 `1` (标准时)
  - `gender` (string, 必填): `'male'` 或 `'female'`
  - `sect` (number, 可选): `1` (默认 00:00 换日) 或 `2` (23:00 换日)

### 2. `lookup_location` (城市与时区查询)
- **输入参数**：
  - `query` (string, 必填): 城市名称（如 "纽约"、"Seattle"、"喀什"）

---

## 🧪 测试覆盖与实测数据集

- **金标用例 (G1~G5)**：跨日界、中美夏令时、新疆大经度差、立春跨年柱实测
- **Astro-Databank AA 官方出生证命例**：特朗普、奥巴马、比尔盖茨、乔布斯真太阳时修正实测
- **中国历史正史档案命例**：蒋介石（《千里命稿》）、毛泽东、周恩来、邓小平、梁启超
- **全球五大洲 28 个代表性城市**：横跨东亚、北美、欧洲、南亚（印度半小时时区）、大洋洲（南半球夏令时反转）、南美与非洲
- **极端地理边界**：阿拉斯加、新西兰查塔姆群岛（45分钟夏令时）、基里巴斯（UTC+14）

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 开源。
