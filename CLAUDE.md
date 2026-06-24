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
│   ├── common.js           # 公共工具库（StepManager/CanvasHelper/Validator/DataGenerator/Logger）负责人：杨帆
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

## 当前实现状态（2026-06-23）

| 文件 | 状态 |
|------|------|
| `css/style.css` | 已完成——深色主题 CSS 变量与部分组件样式 |
| `index.html` | 骨架，待补充卡片内容 |
| `js/common.js` | 空文件，待实现 |
| `js/quicksort.js` | 空文件，待实现 |
| `js/dijkstra.js` | 空文件，待实现 |
| `js/hanoi.js` | 空文件，待实现 |
| `data/testcases.js` | 空文件，待填充 |
| `pages/*.html` | 骨架，待补充 |

## 架构与核心设计

### 分层架构（不可违反的依赖方向）

```
表现层      index.html / pages/*.html / css/style.css
控制层      js/*.js 中的事件绑定与控制函数（算法模块）
业务逻辑层  js/*.js 中的纯算法实现
公共服务层  js/common.js（StepManager / CanvasHelper / Validator / DataGenerator / Logger）
数据层      data/testcases.js + 运行时 steps 数组（内存）
```

**依赖规则**：上层调下层，下层不感知上层。算法模块依赖 common.js，common.js 不依赖任何算法模块。三个算法模块互不依赖。

### 关键设计原则

- **数据驱动渲染**：算法只调用 `StepManager.record(state, description)` 录制状态，不直接操作 DOM 或 Canvas。
- **依赖注入**：渲染回调 `renderFn(state)` 和说明回调 `descUpdateFn(desc, idx, total)` 在构造 StepManager 时由算法模块注入。
- **最小外部依赖**：不引入 jQuery / Vue / React，不使用 CDN，完全离线可运行。

## 公共工具库接口规约（js/common.js）

### StepManager（class，需实例化）

```js
const sm = new StepManager(renderFn, descUpdateFn);
// renderFn: (state) => void
// descUpdateFn: (desc, idx, total) => void
```

| 方法 | 签名 | 说明 |
|------|------|------|
| record | `record(state, description)` | 深拷贝 state 后入队，算法执行时调用 |
| play | `play()` → Promise | 自动逐帧播放至最后一帧 |
| pause | `pause()` | 暂停（设 isPlaying=false） |
| next / prev | `next()` / `prev()` | 前进/回退一帧 |
| gotoStep | `gotoStep(index)` | 跳转到指定帧 |
| reset | `reset()` | 回到第 0 帧并暂停 |
| clear | `clear()` | 清空步骤序列与索引 |
| setSpeed | `setSpeed(ms)` | 调整播放间隔（默认 800ms） |

StepManager 内部关键变量：`steps[]`、`currentIndex`（初值 -1）、`isPlaying`（初值 false）、`speed`（初值 800）。

### CanvasHelper（namespace，直接调用）

```js
CanvasHelper.clear(ctx)
CanvasHelper.drawRect(ctx, x, y, w, h, opt?)
CanvasHelper.drawCircle(ctx, cx, cy, r, opt?)
CanvasHelper.drawText(ctx, text, x, y, opt?)
CanvasHelper.drawArrow(ctx, x1, y1, x2, y2, opt?)
// opt: { fill, stroke, lineWidth, font }
```

坐标系：Canvas 默认（左上角原点，x 向右，y 向下），单位像素。

### Validator（namespace，直接调用）

```js
const result = Validator.parseNumberArray(str, opt?);
const result = Validator.parsePositiveInteger(str, opt?);
// 返回 {ok: boolean, value: any, error: string}
// parseNumberArray opt: { min, max, maxLen(默认30), minLen(默认1) }
```

### DataGenerator（namespace，直接调用）

```js
DataGenerator.randomArray(n, min?, max?)           // → number[]
DataGenerator.randomGraph(nodeCount, edgeProb?)    // → {nodes, edges}
DataGenerator.randomHanoiInput(maxN?)              // → {n}
```

`randomGraph` 必须保证 source 节点至少有一条可达路径，生成数据必须能通过对应 Validator 校验。

### Logger（class，需实例化）

```js
const logger = new Logger();
logger.log(msg);    // 追加带时间戳日志（本阶段实现）
logger.clear();     // 清空（本阶段实现）
logger.export(filename?);  // 导出 txt（EXT-3 预留，本阶段不实现）
```

## 算法模块统一接口（quicksort.js / dijkstra.js / hanoi.js 必须实现）

每个模块暴露三个函数：

```js
function init()        // 页面加载时调用：获取 Canvas/DOM、绑定按钮事件、构造 StepManager
function run(input)    // 接收合法输入，执行算法、录制步骤、调用 sm.play()
function reset()       // 调用 sm.clear()、清空画布与说明区
```

**算法主体函数禁止**：直接操作 DOM、直接调用 CanvasHelper、直接读写 Canvas——只通过 `sm.record(state, description)` 暴露状态。

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

```css
/* 已定义的主要 CSS 变量 */
--bg        /* 页面背景 #0f1724（深蓝灰） */
--panel     /* 面板背景 #0b1220 */
--muted     /* 次要文字 #94a3b8 */
--accent    /* 主强调蓝 #3b82f6 */
--accent-2  /* 辅助青色 #06b6d4 */
--success   /* 成功绿 #22c55e */
--warning   /* 警告橙 #f59e0b */
--danger    /* 错误红 #ef4444 */
--radius    /* 圆角 8px */
```

注意：实际实现为深色主题，与设计文档中的浅色方案不同，以 `style.css` 中的实际变量为准。

字体族：`'PingFang SC', 'Microsoft YaHei', sans-serif`，间距基于 8px 网格。

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

| 错误码 | 场景 | 处理层 |
|--------|------|--------|
| E-001 | 输入为空 | Validator 拦截 |
| E-002 | 包含非法字符 | Validator 拦截 |
| E-003 | 输入规模超限 | Validator 拦截 |
| E-004 | 数值超范围 | Validator 拦截 |
| E-005 | 图节点数不足或不连通 | Validator 拦截 |
| E-006 | 算法运行时异常 | 算法模块 try-catch，自动调用 reset() |
| E-007 | 浏览器不支持 Canvas | HTML fallback 文本 |

错误文案统一为常量，使用通俗中文，不暴露技术细节。

## 不实现的功能（本阶段）

以下为扩展需求，不要主动实现，但接口已预留：
- EXT-2：单步执行、暂停、上一步、速度调节（StepManager 内部接口已预留，只差 UI 绑定）
- EXT-3：Logger.export() 导出日志
- EXT-4：同类算法对比
- EXT-5：LocalStorage 保存自定义测试数据
- EXT-7：题目讲解模式

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

## 附录：common.js 实际实现与设计稿的偏差（2026-06-24 校对）

> ⚠️ 上文“公共工具库接口规约”为最初设计稿，与当前 `js/common.js` 的实际实现存在较多差异。编写算法模块时请以本附录为准。汉诺塔模块（`js/hanoi.js`）已按本附录调用。

### 命名空间总览

实际只暴露 `window.Common`，**没有** `CanvasHelper` / `Validator` / `DataGenerator` / `Logger` 这四个独立命名空间。设计稿中归属这些命名空间的方法，要么并入 `Common`（如 `parseNumberArray`、`randomIntegerArray`、`randomGraph`），要么完全没有实现（见下表“未实现”行）。

### Common 实际暴露的方法

| 类别 | 实际签名 | 与设计稿差异 |
|------|----------|--------------|
| DOM | `Common.$(sel)`、`Common.$$(sel)` | 设计稿未列出 |
| DOM | `Common.createElement(tag, attrs?, text?)`、`Common.clearChildren(el)`、`Common.addEvent(target, event, handler)` | 设计稿未列出 |
| 解析 | `Common.parseNumberArray(str)` —— 失败抛错，**不返回 `{ok, value, error}`** | 与设计稿 `Validator.parseNumberArray` 行为不同；**没有 `parsePositiveInteger`**，整数校验需算法模块自己写 |
| 格式化 | `Common.formatNumberArray(arr)` | 设计稿未列出 |
| 随机 | `Common.randomIntegerArray(len, min, max)` | 设计稿叫 `DataGenerator.randomArray`；**没有 `randomHanoiInput`** |
| 随机 | `Common.randomGraph({ nodeCount, edgeProbability, minWeight, maxWeight })` | 参数为 options 对象而非位置参数 |
| 工具 | `Common.cloneMatrix(matrix)`、`Common.deepClone(value)` | 设计稿未列出（算法模块录步时需自行 `deepClone`） |
| 提示 | `Common.showInfo(selector, msg)`、`Common.showError(selector, msg)` | 设计稿未列出 |
| 测试用例 | `Common.populateTestcaseSelect(selectEl, cases, formatter?)`、`Common.getSelectedTestcase(selectEl, cases)` | 设计稿未列出 |
| StepManager | `new Common.StepManager({ onStep, onPlayEnd })` —— **构造参数为 options 对象**，不是 `(renderFn, descUpdateFn)` | 与设计稿差异较大，详见下表 |
| **未实现** | `CanvasHelper`、`Validator`、`Logger`、`DataGenerator.randomHanoiInput`、`StepManager.record`、`StepManager.clear`、`StepManager.gotoStep`、`StepManager.setSpeed` | 设计稿声称提供，实际无 —— 不要调用 |

### StepManager 实际方法

| 方法 | 实际签名 | 说明 |
|------|----------|------|
| 构造 | `new StepManager({ onStep: (step, idx) => {}, onPlayEnd: () => {} })` | 回调以 `step` 整体（含 state + description）传入，由调用方决定结构 |
| `addStep(step)` | 入队一个步骤；**不会自动 deepClone**，算法模块自己保证快照独立 |
| `setSteps(steps)` | 替换整段步骤序列并重置 `currentIndex = -1`（相当于设计稿里的 `clear` —— `setSteps([])` 即清空） |
| `getCurrentStep()` | 返回当前步骤或 `null` |
| `next()` / `prev()` | 前后切换并触发 `onStep` |
| `reset()` | 暂停 + `currentIndex = -1` + 触发 `onStep(null, -1)`；**不清空 steps** |
| `play(speed = 500)` | 自动播放；**默认 500ms 而非 800ms**；返回 `void`（不是 Promise） |
| `pause()` | 暂停 |
| 字段 | `steps[]`、`currentIndex`（-1）、`isPlaying`、`speed`（默认 500） | 可直接读取，已被汉诺塔模块用于 `btnLast` 跳末尾等场景 |

### 算法模块调用约定（汉诺塔已采纳）

- 录步格式 `{ state, description }`；调用 `addStep` 前自行 `Common.deepClone(state)`。
- 重置 = `pause()` + `setSteps([])`，再按需重绘空画布。
- 不存在 `gotoStep(i)`，跳到任意帧需要直接写 `sm.currentIndex = i` 后手动重绘（或循环 `next()`）。
- 整数/范围校验需要在算法模块内自己实现，不能依赖 `Validator`。
- Canvas 绘制要直接调用原生 `ctx` API，不能依赖 `CanvasHelper`。
