# CLAUDE.md — 算法过程可视化系统

## 项目概述

课程设计项目（2026年大二），面向算法学习的过程可视化平台。纯前端方案，无构建工具、无框架、无后端，浏览器双击即可运行。

- **截止日期**：2026年6月26日
- **GitHub**：https://github.com/Komorebi618/algo-visualizer-group14.git
- **三个算法**：快速排序（柱状图）、Dijkstra（节点图）、汉诺塔（柱+盘子）

## 文件结构

```
algo-visualizer-group14/
├── index.html              # 首页（三个算法入口卡片）
├── css/
│   └── style.css           # 全局样式（CSS 变量 + 公共组件）负责人：孙郭昕
├── js/
│   ├── common.js           # 公共工具库（DOM 助手 + StepManager + showToast）负责人：杨帆
│   ├── quicksort.js        # 快速排序模块 负责人：孙郭昕
│   ├── dijkstra.js         # Dijkstra 模块 负责人：刘卓明
│   └── hanoi.js            # 汉诺塔模块 负责人：杨帆
├── pages/
│   ├── quicksort.html
│   ├── dijkstra.html
│   └── hanoi.html
├── data/
│   └── testcases.js        # 预置测试用例（每个算法≥2条，总计≥6条）
└── docs/
    └── README.md           # 项目文档入口
```

## 当前实现状态（2026-06-28）

| 文件 | 状态 |
|------|------|
| `css/style.css` | 已完成——浅色 + 便当盒(Bento Grid)布局 + 毛玻璃 |
| `index.html` | 已完成——三张算法入口卡片 |
| `js/common.js` | 已完成——11 个公共 API + StepManager + showToast |
| `js/quicksort.js` | 已完成 |
| `js/dijkstra.js` | 已完成 |
| `js/hanoi.js` | 已完成 |
| `data/testcases.js` | 已完成 |
| `pages/*.html` | 已完成 |

## 架构与核心设计

### 分层架构（不可违反的依赖方向）

```
表现层      index.html / pages/*.html / css/style.css
控制层      js/*.js 中的事件绑定与控制函数（算法模块）
业务逻辑层  js/*.js 中的纯算法实现
公共服务层  js/common.js（DOM 助手 + StepManager + showToast）
数据层      data/testcases.js + 运行时 steps 数组（内存）
```

**依赖规则**：上层调下层，下层不感知上层。算法模块依赖 common.js，common.js 不依赖任何算法模块。三个算法模块互不依赖。

### 关键设计原则

- **数据驱动渲染**：算法只调用 `sm.addStep({state, description})` 录制状态，不直接操作 DOM 或 Canvas。
- **依赖注入**：渲染回调 `onStep(step, idx)` 和播放结束回调 `onPlayEnd()` 在构造 `Common.StepManager` 时由算法模块注入。
- **最小外部依赖**：不引入 jQuery / Vue / React，不使用 CDN，完全离线可运行。

## 公共工具库接口规约（js/common.js）

> 实际暴露 11 个 API,与三个算法模块的使用对齐。设计稿中曾设想过 `CanvasHelper` / `Validator` / `Logger` 三个独立命名空间,**最终未实现**——相关能力由算法模块自行实现(整数/范围校验、Canvas 绘制)。

### 命名空间总览

实际只暴露 `window.Common`。所有公共能力都在该命名空间下,**不要**调用 `CanvasHelper.*` / `Validator.*` / `Logger.*` —— 这些不存在。

### Common 暴露的方法

| 类别 | 签名 | 说明 |
|------|------|------|
| DOM | `Common.$(sel)` | querySelector 简写 |
| DOM | `Common.createElement(tag, attrs?, text?)` | 创建元素,attrs 支持 `class` 和 `dataset` |
| DOM | `Common.clearChildren(el)` | 清空子节点 |
| DOM | `Common.addEvent(target, event, handler)` | 绑定事件,target 支持元素或选择器字符串 |
| 解析 | `Common.parseNumberArray(str)` | 解析逗号/空格/分号分隔的数字数组;**失败抛错**(不返回 `{ok, value, error}`) |
| 随机 | `Common.randomIntegerArray(len = 8, min = 1, max = 99)` | 随机整数数组 |
| 工具 | `Common.deepClone(value)` | 基于 JSON 的深拷贝(算法录步时自行调用,**StepManager 不会自动深拷贝**) |
| 提示 | `Common.showToast(message, type?, duration?)` | 左上角 Toast 浮层(自动消失);`type ∈ 'info'/'error'/'success'`;`duration` 默认 3500ms,传 0 不自动消失 |
| 测试用例 | `Common.populateTestcaseSelect(selectEl, cases, formatter?)` | 填充测试用例下拉列表 |
| 测试用例 | `Common.getSelectedTestcase(selectEl, cases)` | 读取当前选中的用例 |
| StepManager | `new Common.StepManager({onStep, onPlayEnd})` | 步骤播放管理器,见下方详述 |

**整数/范围校验、Canvas 绘制需要算法模块自行实现**(不能依赖 `Validator` / `CanvasHelper`)。

**历史接口已删除**(2026-06-28 清理): `Common.$$` / `formatNumberArray` / `randomGraph` / `cloneMatrix` / `showInfo` / `showError` / `initAlgorithmPage`——全部零调用。错误提示统一走 `showToast`。

### StepManager（class，需实例化）

```js
const sm = new Common.StepManager({
  onStep:    (step, idx) => { /* step 是 {state, description, ...}，由算法模块定义结构 */ },
  onPlayEnd: () => {}
});
```

| 方法 | 签名 | 说明 |
|------|------|------|
| 构造 | `new StepManager({ onStep, onPlayEnd })` | **options 对象**，不是位置参数 |
| 入队 | `addStep(step)` | 入队一个步骤；**不自动 deepClone**，算法模块需自己保证快照独立 |
| 设序列 | `setSteps(steps)` | 替换整段步骤序列并重置 `currentIndex = -1`（清空用 `setSteps([])`） |
| 取当前 | `getCurrentStep()` | 返回当前步骤或 `null` |
| 前/后 | `next()` / `prev()` | 前后切换并触发 `onStep` |
| 重置 | `reset()` | 暂停 + `currentIndex = -1` + 触发 `onStep(null, -1)`；**不清空 steps** |
| 播放 | `play(speed = 500)` | 自动播放；**默认 500ms**；返回 `void`（不是 Promise） |
| 暂停 | `pause()` | 暂停 |

内部字段：`steps[]`、`currentIndex`（-1）、`isPlaying`、`speed`（默认 500），可直接读写（如 `sm.currentIndex = i` 手动跳帧）。

**注意：以下方法不存在，不要调用：** `record`、`clear`、`gotoStep`、`setSpeed`。

### 算法模块调用约定（三个算法模块均已采纳）

- 录步格式 `{ state, description }`,调用 `addStep` 前自行 `Common.deepClone(state)`。
- 重置 = `sm.pause()` + `sm.setSteps([])` + 重绘空画布。
- 跳到任意帧:`sm.currentIndex = i` 后调 `sm.onStep(sm.getCurrentStep(), i)` 触发重绘,或循环 `next()`。
- 整数/范围校验在算法模块内自己写。
- Canvas 绘制直接调用原生 `ctx` API。
- 错误提示统一用 `Common.showToast(message, 'error')`,不要写入 DOM 容器。

## 算法模块统一接口（quicksort.js / dijkstra.js / hanoi.js 必须实现）

每个模块暴露 `init` / `run` / `reset` 三个函数(其中 hanoi 通过 `window.Hanoi` 显式暴露,quicksort/dijkstra 通过 IIFE 自动初始化):

```js
function init()        // 页面加载时调用：获取 Canvas/DOM、绑定按钮事件、构造 Common.StepManager
function run(input)    // 接收合法输入，执行算法、addStep 录制步骤、调用 sm.play(speed)
function reset()       // sm.pause() + sm.setSteps([])、清空画布与说明区
```

**算法主体函数禁止**:直接操作 DOM、直接读写 Canvas——只通过 `sm.addStep({state, description})` 暴露状态。

## 各算法 state 字段

### QuickSortState

```js
{
  array: number[],        // 当前数组完整快照（每步深拷贝）
  pivotIndex: number|null,
  left: number|null,
  right: number|null,
  comparing: number[],    // 正在比较的两个下标（高亮黄色）
  sortedRanges: [number, number][],  // 已有序区间（高亮绿色）
  phase: 'init'|'pickPivot'|'partition'|'swap'|'done'
}
```

颜色编码：基准值=红（--danger），比较中=黄（--warning），已有序=绿（--success），普通=灰。

### DijkstraState

```js
{
  distances: Record<number, number>,      // Infinity 表示未到达
  previous: Record<number, number|null>,
  visited: number[],
  current: number|null,
  relaxingEdge: Edge|null,
  phase: 'init'|'pickMin'|'relax'|'done'
}
```

节点颜色：未访问=灰，当前考察=蓝（--accent），已确定=绿（--success），松弛边=橙（--warning）。

节点布局：圆形均匀分布，半径 = `min(width, height) * 0.35`。

### HanoiState

```js
{
  towers: number[][],    // 长度3，每个元素是柱子的盘子栈（数字越大盘子越大，末尾为栈顶）
  movingDisk: number|null,
  from: number|null,
  to: number|null,
  moveCount: number,
  phase: 'init'|'moving'|'done'
}
```

渲染：三根等距垂直柱（位于1/6、3/6、5/6处），盘宽与盘号线性相关，HSL 渐变色区分各盘子。

## 样式规范（css/style.css 已有 CSS 变量，使用变量名而非硬编码色值）

主题:**浅色 + 便当盒(Bento Grid)布局 + 毛玻璃**,背景使用 CSS Mesh Gradient(5 层 radial-gradient 叠加,无图片依赖)。canvas-stage 是唯一深色区域(slate-900 实色),与浅色 UI 形成"数据看板"对比。

```css
/* 已定义的主要 CSS 变量(完整列表见 css/style.css :root) */
--bg               /* 页面备选纯色 #eef2ff(Mesh Gradient 不支持时退化) */
--panel            /* 面板半透明白底 */
--card             /* 卡片半透明白底 */
--text-primary     /* 主文字 zinc-900 #18181b */
--text-secondary   /* 正文 zinc-700 #3f3f46 */
--muted            /* 辅助文字 zinc-600 #52525b */
--border           /* 玻璃边框 rgba(255,255,255,0.65) */
--accent           /* 主蓝 #2563eb (blue-600) */
--success          /* 绿 #16a34a */
--warning          /* 橙 #d97706 */
--danger           /* 红 #dc2626 */
--canvas-bg        /* canvas 深色岛 #0f172a (slate-900) */
--canvas-text      /* canvas 内文字 #e2e8f0 (slate-200) */
--radius           /* 12px */
--radius-lg        /* 16px (rounded-2xl 对标) */
--radius-pill      /* 999px */
--shadow-sm/md/lg  /* 三档真阴影 */
--glass-blur       /* blur(22px) saturate(170%) */
```

字体族:`'PingFang SC', 'Microsoft YaHei', sans-serif`,间距基于 4/8/12/16 px 网格。

## 编码规范

| 项目 | 约定 |
|------|------|
| 缩进 | 2 个空格 |
| 字符串 | 单引号优先 |
| 分号 | 必加 |
| 类名 | PascalCase（StepManager） |
| 方法/变量 | camelCase（recordStep） |
| 常量 | UPPER_SNAKE_CASE |
| 注释 | 关键方法用 JSDoc（@param、@returns）；对于每个模块进行合适的注释 |
| 错误文案 | 写为常量，不散落字面量 |

## 输入约束

| 算法 | 约束 |
|------|------|
| 快速排序 | 数组长度 ≤ 30，元素 ∈ [-1000, 1000] |
| Dijkstra | 节点数 ≤ 10 |
| 汉诺塔 | 盘子数 n ∈ [1, 8] |

## 测试用例（data/testcases.js 结构）

```js
const TESTCASES = {
  quicksort: [
    { name: '小规模升序', input: { array: [1,2,3,4,5] }, description: '已排序输入' },
    { name: '逆序数组', input: { array: [5,4,3,2,1] }, description: '最坏情况触发' }
  ],
  dijkstra: [ /* ≥2条 */ ],
  hanoi:    [ /* ≥2条 */ ]
};
```

要求：每个算法 ≥2 条，总计 ≥6 条，每个算法至少含一条"典型用例"和一条"边界用例"。

## Git 工作流

- **主分支**：`main`（稳定代码）
- **功能分支**：`feature/dijkstra-liu`、`feature/project-base-liu`、`feature/quicksort-sun`、`feature/hanoi-yang`
- 写完功能后 PR 合并到 main

提交信息格式：
```
feat: 新增 Dijkstra 算法核心逻辑
fix: 修复快排在重复元素时的 Bug
docs: 更新 README 运行说明
style: 调整公共按钮样式
refactor: 重构 StepManager 录制方法
test: 增加汉诺塔测试用例
```

## 错误处理

错误提示统一通过 `Common.showToast(message, 'error')` 浮层显示(左上角,3.5s 自动消失),不再使用容器内文字提示。

| 错误码 | 场景 | 处理层 |
|--------|------|--------|
| E-001 | 输入为空 | 算法模块内 parse 函数拦截 |
| E-002 | 包含非法字符 | 算法模块内 parse 函数拦截 |
| E-003 | 输入规模超限 | 算法模块内 parse 函数拦截 |
| E-004 | 数值超范围 | 算法模块内 parse 函数拦截 |
| E-005 | 图节点数不足或不连通 | 算法模块内 parse 函数拦截 |
| E-006 | 算法运行时异常 | 算法模块 try-catch,自动调用 reset() |
| E-007 | 浏览器不支持 Canvas | HTML `<canvas>` 内 fallback 文本 |

错误文案统一为常量(`ERR.XXX` 或 `ERROR_MESSAGES.XXX`),使用通俗中文,不暴露技术细节。

## 不实现的功能（本阶段）

设计稿曾列出多项扩展需求,本期未实现。**已经实现的项**:
- EXT-2(单步执行/暂停/上一步/速度调节):**已实现**——三个算法均有 ⏮◀▶⏭ 控件,quicksort 有速度滑块

未实现的扩展需求:
- EXT-3:Logger.export() 导出日志
- EXT-4:同类算法对比
- EXT-5:LocalStorage 保存自定义测试数据
- EXT-7:题目讲解模式

## 验收清单（截止前必须全部通过）

- [ ] AC-1：三个算法（快排/Dijkstra/汉诺塔）均可成功运行
- [ ] AC-2：包含至少一个中等及以上难度算法（Dijkstra / 汉诺塔）
- [ ] AC-3：首页统一入口，三页面样式一致
- [ ] AC-4：每个算法页面支持手动输入 + 随机生成
- [ ] AC-5：每个算法能逐步演示中间状态（非仅最终结果）
- [ ] AC-6：每个算法页面显示：输入数据 / 最终结果 / 关键步骤说明 / 时空复杂度
- [ ] AC-7：测试用例下拉列表可见，每算法≥2条，总计≥6条
- [ ] AC-8：README.md 包含运行方式、算法说明、输入格式、测试方式
- [ ] AC-9：非法输入有明确提示且系统不崩溃
- [ ] AC-10：Chrome / Edge / Firefox 三种浏览器均可正常运行

---

## CLAUDE.md 校对日志

| 日期 | 校对人 | 内容 |
|------|--------|------|
| 2026-06-23 | 刘卓明 | 初版创建：依据《需求文档v0.1》《系统设计文档v0.1》起草整体结构、接口规约、验收清单 |
| 2026-06-24 | 杨帆 | 对照 `js/common.js` 实际实现，发现初版接口规约（基于设计稿）与代码偏差较大；以附录形式追加"实际实现"清单，标注 `CanvasHelper`/`Validator`/`Logger` 未实现 |
| 2026-06-26 | 刘卓明 | 整合附录回正文：用实际 API 直接覆盖"公共工具库接口规约"章节，附录删除；后续算法模块以正文为准，不再有两套规约并存 |
| 2026-06-28 | 刘卓明 | 同步整轮冗余清理后的代码状态:① 公共 API 表删除 7 个已废弃接口(`$$`/`formatNumberArray`/`randomGraph`/`cloneMatrix`/`showInfo`/`showError`/`initAlgorithmPage`);② 修正 StepManager 调用约定为实际 API(`addStep` 而非 `record`,无 `clear`/`gotoStep`/`setSpeed`);③ 样式规范从深色玻璃拟态改为浅色 + 便当盒 + 毛玻璃;④ 标注 EXT-2 单步/暂停/速度已实现;⑤ 实现状态表更新为"全部完成" |
