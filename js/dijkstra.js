/**
 * Dijkstra 最短路径算法模块
 */

// ─── 数据结构 ─────────────────────────────────────────────

/**
 * 构建邻接表
 * @param {Array<{id: number}>} nodes
 * @param {Array<{from: number, to: number, weight: number}>} edges
 * @returns {Map<number, Array<{to: number, weight: number}>>}
 */
function buildAdjList(nodes, edges) {
  const adj = new Map();
  for (const node of nodes) {
    adj.set(node.id, []);
  }
  for (const edge of edges) {
    adj.get(edge.from).push({ to: edge.to, weight: edge.weight });
  }
  return adj;
}

/**
 * 从 previous 映射重建路径
 * @param {Object} previous
 * @param {number} targetId
 * @returns {number[]} 节点 id 序列，不可达时返回空数组
 */
function getPath(previous, targetId) {
  const path = [];
  let cur = targetId;
  while (cur !== null && cur !== undefined) {
    path.unshift(cur);
    cur = previous[cur];
  }
  return path.length > 0 ? path : [];
}

// ─── 状态快照工具 ─────────────────────────────────────────

/**
 * 深拷贝当前算法状态，生成一帧 DijkstraState
 * @param {Object} distances
 * @param {Object} previous
 * @param {number[]} visited
 * @param {number|null} current
 * @param {{from:number,to:number,weight:number}|null} relaxingEdge
 * @param {string} phase
 * @param {string} description
 * @returns {Object}
 */
function makeState(distances, previous, visited, current, relaxingEdge, phase, description) {
  return {
    distances: { ...distances },
    previous:  { ...previous },
    visited:   [...visited],
    current,
    relaxingEdge: relaxingEdge ? { ...relaxingEdge } : null,
    phase,
    description,
  };
}

// ─── Dijkstra 核心 ────────────────────────────────────────

/**
 * 运行 Dijkstra 算法并录制每步状态
 * @param {{ nodes: Array<{id:number}>, edges: Array<{from:number,to:number,weight:number}> }} graph
 * @param {number} sourceId
 * @returns {{ steps: Object[], distances: Object, previous: Object }}
 */
function runDijkstra(graph, sourceId) {
  const { nodes, edges } = graph;
  const adj = buildAdjList(nodes, edges);
  const steps = [];

  // 初始化
  const distances = {};
  const previous  = {};
  const visited   = [];

  for (const node of nodes) {
    distances[node.id] = Infinity;
    previous[node.id]  = null;
  }
  distances[sourceId] = 0;

  steps.push(makeState(
    distances, previous, visited, null, null,
    'init',
    `初始化：源节点 ${sourceId} 距离设为 0，其余设为 ∞`
  ));

  const totalNodes = nodes.length;

  for (let iter = 0; iter < totalNodes; iter++) {
    // 线性扫描未访问节点中距离最小的（节点数 ≤ 10，无需堆）
    let minDist = Infinity;
    let u = null;
    for (const node of nodes) {
      if (!visited.includes(node.id) && distances[node.id] < minDist) {
        minDist = distances[node.id];
        u = node.id;
      }
    }

    if (u === null) break; // 剩余节点均不可达

    visited.push(u);
    steps.push(makeState(
      distances, previous, visited, u, null,
      'pickMin',
      `选取距离最小的未访问节点 ${u}（距离 = ${distances[u]}），标记为已确定`
    ));

    // 松弛出边
    for (const { to, weight } of adj.get(u)) {
      if (visited.includes(to)) continue;

      const newDist = distances[u] + weight;
      const edge    = { from: u, to, weight };

      if (newDist < distances[to]) {
        distances[to] = newDist;
        previous[to]  = u;
        steps.push(makeState(
          distances, previous, visited, u, edge,
          'relax',
          `松弛边 ${u}→${to}（权重 ${weight}）：距离更新为 ${newDist}`
        ));
      } else {
        steps.push(makeState(
          distances, previous, visited, u, edge,
          'relax',
          `检查边 ${u}→${to}（权重 ${weight}）：距离 ${newDist} ≥ 已有 ${distances[to]}，不更新`
        ));
      }
    }
  }

  steps.push(makeState(
    distances, previous, visited, null, null,
    'done',
    '算法结束，所有可达节点的最短路径已确定'
  ));

  return { steps, distances, previous };
}

// ─── 页面逻辑（浏览器环境） ───────────────────────────────

// 仅在浏览器环境下执行
if (typeof window !== 'undefined') {

// ── 错误文案常量 ──────────────────────────────────────────

const ERR = {
  EMPTY_INPUT:          '请输入节点数和边列表',
  INVALID_NODE_COUNT:   '节点数须为 2~10 的整数',
  INVALID_EDGE_FORMAT:  '边格式错误，每行应为：起点 终点 权重（均为非负整数）',
  NODE_OUT_OF_RANGE:    (id, n) => `节点编号 ${id} 超出范围（0 ~ ${n - 1}）`,
  WEIGHT_NOT_POSITIVE:  '边权重须为正整数',
  SOURCE_OUT_OF_RANGE:  (id, n) => `源节点 ${id} 超出范围（0 ~ ${n - 1}）`,
};

// ── 预置测试用例（由 data/testcases.js 提供，window.Testcases.dijkstra） ──

// ── Canvas 颜色常量（对应 style.css 中的 CSS 变量值） ────────

const COLOR = {
  NODE_DEFAULT:  '#334155',
  NODE_CURRENT:  '#3b82f6',
  NODE_VISITED:  '#22c55e',
  NODE_RELAXING: '#f59e0b',
  EDGE_DEFAULT:  'rgba(255,255,255,0.15)',
  EDGE_RELAXING: '#f59e0b',
  EDGE_SHORTEST: '#22c55e',
  TEXT_LABEL:    '#e2e8f0',
  TEXT_DIST:     '#94a3b8',
  TEXT_DIST_SET: '#e2e8f0',
};

const NODE_RADIUS = 20;
const PLAY_SPEED  = 800;

// ── DOM 引用（init 后赋值） ───────────────────────────────────

let canvas, ctx, sm;
let currentGraph = null; // 当前图，用于渲染节点坐标

// DOM 元素
let elNodeCount, elSourceNode, elEdgeList;
let elBtnRun, elBtnRandom, elBtnReset;
let elBtnFirst, elBtnPrev, elBtnPlayPause, elBtnLast;
let elProgressFill, elStepCounter, elStepDesc, elStepLog;
let elResultCard, elResultTable, elTestcaseSelect, elTestcaseDesc;

// ── 节点坐标计算 ──────────────────────────────────────────────

/**
 * 计算 n 个节点在画布上的均匀圆形分布坐标
 * @param {number} n
 * @param {number} w 画布宽
 * @param {number} h 画布高
 * @returns {Array<{x:number, y:number}>}
 */
function calcNodePositions(n, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r  = Math.min(w, h) * 0.35;
  const positions = [];
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i / n) - Math.PI / 2;
    positions.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    });
  }
  return positions;
}

// ── 内联绘图工具 ─────────────────────────────────────────────

/**
 * 绘制带箭头的有向边
 */
function drawArrow(fromX, fromY, toX, toY, color, lineWidth) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;

  // 缩短两端，避免遮盖节点
  const shrink = NODE_RADIUS + 4;
  const ux = dx / len;
  const uy = dy / len;
  const sx = fromX + ux * shrink;
  const sy = fromY + uy * shrink;
  const ex = toX   - ux * (shrink + 6);
  const ey = toY   - uy * (shrink + 6);

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.strokeStyle = color;
  ctx.lineWidth   = lineWidth || 1.5;
  ctx.stroke();

  // 箭头
  const arrowLen   = 10;
  const arrowAngle = 0.4;
  const angle = Math.atan2(ey - sy, ex - sx);
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(
    ex - arrowLen * Math.cos(angle - arrowAngle),
    ey - arrowLen * Math.sin(angle - arrowAngle)
  );
  ctx.lineTo(
    ex - arrowLen * Math.cos(angle + arrowAngle),
    ey - arrowLen * Math.sin(angle + arrowAngle)
  );
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// ── Canvas 渲染 ───────────────────────────────────────────────

/**
 * 根据 DijkstraState 渲染一帧
 * @param {Object} state
 */
function renderState(state) {
  if (!currentGraph) return;

  const w = canvas.width;
  const h = canvas.height;
  const positions = calcNodePositions(currentGraph.nodes.length, w, h);

  ctx.clearRect(0, 0, w, h);

  // 1. 绘制边
  for (const edge of currentGraph.edges) {
    const from = positions[edge.from];
    const to   = positions[edge.to];

    let edgeColor = COLOR.EDGE_DEFAULT;
    if (
      state.relaxingEdge &&
      state.relaxingEdge.from === edge.from &&
      state.relaxingEdge.to   === edge.to
    ) {
      edgeColor = COLOR.EDGE_RELAXING;
    } else if (
      state.previous[edge.to] === edge.from &&
      state.distances[edge.to] < Infinity
    ) {
      edgeColor = COLOR.EDGE_SHORTEST;
    }

    drawArrow(from.x, from.y, to.x, to.y, edgeColor,
      edgeColor === COLOR.EDGE_DEFAULT ? 1.5 : 2.5);

    // 权重标注
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    // 文字略微偏移，避免压在边上
    const offsetX = -dy / len * 12;
    const offsetY =  dx / len * 12;
    ctx.font      = '11px monospace';
    ctx.fillStyle = edgeColor === COLOR.EDGE_DEFAULT ? 'rgba(255,255,255,0.4)' : edgeColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(edge.weight, midX + offsetX, midY + offsetY);
  }

  // 2. 绘制节点
  for (let i = 0; i < currentGraph.nodes.length; i++) {
    const { x, y } = positions[i];
    const id = currentGraph.nodes[i].id;

    let nodeColor = COLOR.NODE_DEFAULT;
    if (state.visited.includes(id)) {
      nodeColor = COLOR.NODE_VISITED;
    }
    if (state.current === id) {
      nodeColor = COLOR.NODE_CURRENT;
    }
    if (
      state.relaxingEdge &&
      (state.relaxingEdge.from === id || state.relaxingEdge.to === id) &&
      !state.visited.includes(id)
    ) {
      nodeColor = COLOR.NODE_RELAXING;
    }

    // 节点圆
    ctx.beginPath();
    ctx.arc(x, y, NODE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle   = nodeColor;
    ctx.fill();
    ctx.strokeStyle = nodeColor === COLOR.NODE_DEFAULT
      ? 'rgba(255,255,255,0.12)'
      : nodeColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 节点标签（id）
    ctx.font         = 'bold 13px sans-serif';
    ctx.fillStyle    = '#02122a';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(id, x, y);

    // 距离标注（节点下方）
    const dist = state.distances[id];
    const distText = dist === Infinity ? '∞' : String(dist);
    ctx.font         = '11px monospace';
    ctx.fillStyle    = dist === Infinity ? COLOR.TEXT_DIST : COLOR.TEXT_DIST_SET;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(distText, x, y + NODE_RADIUS + 4);
  }
}

// ── 步骤说明与进度条更新 ──────────────────────────────────────

function updateDesc(desc, idx, total) {
  elStepDesc.textContent = desc;
  const pct = total > 1 ? (idx / (total - 1)) * 100 : 0;
  elProgressFill.style.width = pct + '%';
  elStepCounter.textContent  = `${idx + 1} / ${total}`;
  updatePlayPauseBtn();
  appendLogEntry(idx + 1, desc);
  // 同步边界按钮禁用状态：第 0 步禁用 ⏮/◀，末步禁用 ⏭
  elBtnFirst.disabled = (idx === 0);
  elBtnPrev.disabled  = (idx === 0);
  elBtnLast.disabled  = (idx === total - 1);
}

function updatePlayPauseBtn() {
  elBtnPlayPause.textContent = sm && sm.isPlaying ? '⏸' : '▶';
}

/** 批量设置播放控制按钮的可用状态（载入数据前全部禁用） */
function setControlsEnabled(enabled) {
  elBtnFirst.disabled     = !enabled;
  elBtnPrev.disabled      = !enabled;
  elBtnPlayPause.disabled = !enabled;
  elBtnLast.disabled      = !enabled;
  elBtnReset.disabled     = !enabled;
}

/** 跳到指定 index：自动 pause + 越界裁剪 + 触发 onStep 重绘 */
function gotoStep(index) {
  if (sm.steps.length === 0) return;
  sm.pause();
  const i = Math.max(0, Math.min(index, sm.steps.length - 1));
  sm.currentIndex = i;
  sm.onStep(sm.getCurrentStep(), i);
}

function appendLogEntry(stepNum, desc) {
  // 若该步骤已有日志则不重复追加
  const existing = elStepLog.querySelector(`[data-step="${stepNum}"]`);
  if (existing) return;
  const entry = document.createElement('div');
  entry.className       = 'log-entry';
  entry.dataset.step    = stepNum;
  entry.innerHTML       = `<span class="step-num">#${stepNum}</span>${escapeHtml(desc)}`;
  elStepLog.appendChild(entry);
  elStepLog.scrollTop   = elStepLog.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── 输入解析 ──────────────────────────────────────────────────

/**
 * @param {number} nodeCount
 * @param {number} sourceId
 * @param {string} edgesText
 * @returns {{ ok: boolean, graph?: Object, error?: string }}
 */
function parseInput(nodeCount, sourceId, edgesText) {
  const n = parseInt(nodeCount, 10);
  if (!Number.isInteger(n) || n < 2 || n > 10) {
    return { ok: false, error: ERR.INVALID_NODE_COUNT };
  }
  if (sourceId < 0 || sourceId >= n) {
    return { ok: false, error: ERR.SOURCE_OUT_OF_RANGE(sourceId, n) };
  }

  const nodes = Array.from({ length: n }, (_, i) => ({ id: i }));
  const edges = [];
  const lines  = edgesText.trim().split('\n');

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    if (parts.length !== 3) return { ok: false, error: ERR.INVALID_EDGE_FORMAT };

    const [a, b, w] = parts.map(Number);
    if (!Number.isInteger(a) || !Number.isInteger(b) || isNaN(w)) {
      return { ok: false, error: ERR.INVALID_EDGE_FORMAT };
    }
    if (a < 0 || a >= n) return { ok: false, error: ERR.NODE_OUT_OF_RANGE(a, n) };
    if (b < 0 || b >= n) return { ok: false, error: ERR.NODE_OUT_OF_RANGE(b, n) };
    if (!Number.isInteger(w) || w <= 0) return { ok: false, error: ERR.WEIGHT_NOT_POSITIVE };

    edges.push({ from: a, to: b, weight: w });
  }

  return { ok: true, graph: { nodes, edges } };
}

// ── 随机图生成 ────────────────────────────────────────────────

function generateRandom() {
  const n = Math.floor(Math.random() * 4) + 3; // 3~6 节点
  elNodeCount.value = n;
  updateSourceSelect(n);

  const lines = [];
  // 保证有一条从 0 出发的路径（0→1→2→…→n-1）
  for (let i = 0; i < n - 1; i++) {
    lines.push(`${i} ${i + 1} ${Math.floor(Math.random() * 9) + 1}`);
  }
  // 随机加若干额外边
  const extra = Math.floor(Math.random() * n);
  for (let k = 0; k < extra; k++) {
    const a = Math.floor(Math.random() * n);
    const b = Math.floor(Math.random() * n);
    if (a !== b) {
      lines.push(`${a} ${b} ${Math.floor(Math.random() * 9) + 1}`);
    }
  }
  elEdgeList.value = lines.join('\n');
}

// ── 结果表格 ──────────────────────────────────────────────────

function renderResultTable(distances, previous, sourceId, nodes) {
  const rows = nodes.map(({ id }) => {
    const dist = distances[id];
    const path = getPath(previous, id);
    const pathStr = dist === Infinity ? '不可达' : path.join(' → ');
    return `<tr>
      <td style="padding:4px 10px;color:var(--muted);">${id}</td>
      <td style="padding:4px 10px;font-family:var(--mono);">${dist === Infinity ? '∞' : dist}</td>
      <td style="padding:4px 10px;font-size:0.82rem;">${pathStr}</td>
    </tr>`;
  });

  elResultTable.innerHTML = `
    <table style="border-collapse:collapse;width:100%;font-size:0.88rem;">
      <thead>
        <tr style="border-bottom:1px solid var(--glass-border);">
          <th style="padding:4px 10px;text-align:left;color:var(--muted);font-weight:400;">节点</th>
          <th style="padding:4px 10px;text-align:left;color:var(--muted);font-weight:400;">最短距离</th>
          <th style="padding:4px 10px;text-align:left;color:var(--muted);font-weight:400;">路径（从节点 ${sourceId}）</th>
        </tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table>`;
  elResultCard.style.display = 'block';
}

// ── Toast 提示（统一走 Common.showToast） ────────────────────

const showToast = (message, type) => Common.showToast(message, type);

// ── 源节点 select 动态更新 ────────────────────────────────────

function updateSourceSelect(n) {
  const current = parseInt(elSourceNode.value, 10);
  elSourceNode.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const opt = document.createElement('option');
    opt.value       = i;
    opt.textContent = `节点 ${i}`;
    elSourceNode.appendChild(opt);
  }
  if (current >= 0 && current < n) elSourceNode.value = current;
}

// ── run / reset ───────────────────────────────────────────────

function run() {
  const nodeCount  = parseInt(elNodeCount.value, 10);
  const sourceId   = parseInt(elSourceNode.value, 10);
  const edgesText  = elEdgeList.value;

  if (!edgesText.trim()) { showToast(ERR.EMPTY_INPUT, 'error'); return; }

  const parsed = parseInput(nodeCount, sourceId, edgesText);
  if (!parsed.ok) { showToast(parsed.error, 'error'); return; }

  currentGraph = parsed.graph;

  sm.pause();
  sm.setSteps([]);
  elStepLog.innerHTML   = '';
  elResultCard.style.display = 'none';

  // 先渲染初始静态图
  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let result;
  try {
    result = runDijkstra(parsed.graph, sourceId);
  } catch (e) {
    showToast('算法运行出错，请检查输入', 'error');
    reset();
    return;
  }

  for (const step of result.steps) {
    sm.addStep({ state: step, description: step.description });
  }

  renderResultTable(result.distances, result.previous, sourceId, parsed.graph.nodes);
  setControlsEnabled(true);
  sm.play(PLAY_SPEED);
  updatePlayPauseBtn();
}

function reset() {
  sm.pause();
  sm.setSteps([]);
  currentGraph = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  elStepDesc.textContent        = '——';
  elStepLog.innerHTML           = '';
  elProgressFill.style.width    = '0%';
  elStepCounter.textContent     = '0 / 0';
  elResultCard.style.display    = 'none';
  setControlsEnabled(false);
  updatePlayPauseBtn();
}

// ── Canvas 尺寸自适应 ─────────────────────────────────────────

function resizeCanvas() {
  const stage = canvas.parentElement;
  canvas.width  = stage.clientWidth  || 600;
  canvas.height = stage.clientHeight || 420;
}

// ── 测试用例渲染（下拉框） ────────────────────────────────────

function renderTestcaseList() {
  elTestcaseSelect.innerHTML = '';
  const cases = (window.Testcases && window.Testcases.dijkstra) || [];
  cases.forEach((tc, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = `${tc.name}（${tc.nodeCount}V）`;
    elTestcaseSelect.appendChild(opt);
  });
}

function loadSelectedTestcase() {
  const idx = parseInt(elTestcaseSelect.value, 10);
  const cases = (window.Testcases && window.Testcases.dijkstra) || [];
  const tc = cases[idx];
  if (!tc) return;
  elNodeCount.value = tc.nodeCount;
  updateSourceSelect(tc.nodeCount);
  elSourceNode.value = tc.sourceId;
  elEdgeList.value   = tc.edges;
  elTestcaseDesc.textContent = tc.description;
}

// ── init ──────────────────────────────────────────────────────

function init() {
  canvas = document.getElementById('dijkstraCanvas');
  ctx    = canvas.getContext('2d');

  elNodeCount    = document.getElementById('nodeCount');
  elSourceNode   = document.getElementById('sourceNode');
  elEdgeList     = document.getElementById('edgeList');
  elBtnRun       = document.getElementById('btnRun');
  elBtnRandom    = document.getElementById('btnRandom');
  elBtnReset     = document.getElementById('btnReset');
  elBtnFirst     = document.getElementById('btnFirst');
  elBtnPrev      = document.getElementById('btnPrev');
  elBtnPlayPause = document.getElementById('btnPlayPause');
  elBtnLast      = document.getElementById('btnLast');
  elProgressFill = document.getElementById('progressFill');
  elStepCounter  = document.getElementById('stepCounter');
  elStepDesc     = document.getElementById('stepDesc');
  elStepLog      = document.getElementById('stepLog');
  elResultCard   = document.getElementById('resultCard');
  elResultTable  = document.getElementById('resultTable');
  elTestcaseSelect    = document.getElementById('testcaseSelect');
  elTestcaseDesc      = document.getElementById('testcaseDesc');

  sm = new Common.StepManager({
    onStep: (step, idx) => {
      if (!step) {
        // 防御性分支：reset 触发的空帧
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        elStepDesc.textContent = '——';
        elProgressFill.style.width = '0%';
        elStepCounter.textContent = '0 / 0';
        updatePlayPauseBtn();
        return;
      }
      renderState(step.state);
      updateDesc(step.description, idx, sm.steps.length);
    },
    onPlayEnd: () => updatePlayPauseBtn(),
  });

  resizeCanvas();
  window.addEventListener('resize', () => {
    resizeCanvas();
    if (sm.currentIndex >= 0 && sm.steps.length > 0) {
      renderState(sm.steps[sm.currentIndex].state);
    }
  });

  // 初始填充源节点 select
  updateSourceSelect(parseInt(elNodeCount.value, 10));

  // 节点数变化时同步更新 select
  elNodeCount.addEventListener('input', () => {
    const n = parseInt(elNodeCount.value, 10);
    if (n >= 2 && n <= 10) updateSourceSelect(n);
  });

  // 按钮事件
  elBtnRun.addEventListener('click', run);
  elBtnRandom.addEventListener('click', () => { generateRandom(); });
  elBtnReset.addEventListener('click', reset);

  elBtnFirst.addEventListener('click', () => { gotoStep(0); });
  elBtnPrev.addEventListener('click',  () => { sm.pause(); sm.prev(); });
  elBtnLast.addEventListener('click',  () => { gotoStep(sm.steps.length - 1); });

  elBtnPlayPause.addEventListener('click', () => {
    if (sm.isPlaying) {
      sm.pause();
    } else {
      if (sm.steps.length === 0) return;
      sm.play(PLAY_SPEED);
    }
    updatePlayPauseBtn();
  });

  // 点击进度条跳转
  document.getElementById('progressBar').addEventListener('click', (e) => {
    if (sm.steps.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    gotoStep(Math.round(pct * (sm.steps.length - 1)));
  });

  renderTestcaseList();
  // 切换下拉框直接载入用例（仅填充输入框，不自动运行）
  elTestcaseSelect.addEventListener('change', () => {
    reset();
    loadSelectedTestcase();
  });

  // 首屏：回填默认选中用例的输入框 + 描述文案，但不运行算法（保持禁用状态）
  loadSelectedTestcase();
  setControlsEnabled(false);
}

window.addEventListener('load', init);

} // end if (typeof window !== 'undefined')

// ─── 命令行验证（仅在 Node.js 环境执行） ─────────────────

if (typeof module !== 'undefined') {
  // 用例 1：典型 5 节点图
  const graph1 = {
    nodes: [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
    edges: [
      { from: 0, to: 1, weight: 4 },
      { from: 0, to: 2, weight: 1 },
      { from: 2, to: 1, weight: 2 },
      { from: 1, to: 3, weight: 1 },
      { from: 2, to: 3, weight: 5 },
      { from: 3, to: 4, weight: 3 },
    ],
  };

  console.log('=== 用例 1：典型 5 节点图（源节点 0） ===');
  const r1 = runDijkstra(graph1, 0);
  console.log('distances:', r1.distances);
  // 期望: { 0:0, 1:3, 2:1, 3:4, 4:7 }
  console.log('path to 4:', getPath(r1.previous, 4));
  // 期望: [0, 2, 1, 3, 4]
  console.log('录制步骤数:', r1.steps.length);

  // 用例 2：含不可达节点
  const graph2 = {
    nodes: [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }],
    edges: [
      { from: 0, to: 1, weight: 2 },
      { from: 1, to: 2, weight: 3 },
      // 节点 3 孤立，无入边
    ],
  };

  console.log('\n=== 用例 2：含不可达节点（源节点 0） ===');
  const r2 = runDijkstra(graph2, 0);
  console.log('distances:', r2.distances);
  // 期望: { 0:0, 1:2, 2:5, 3:Infinity }
  console.log('path to 3 (不可达):', getPath(r2.previous, 3));
  // 期望: [3]（previous[3] 为 null，无法追溯到 source）
}
