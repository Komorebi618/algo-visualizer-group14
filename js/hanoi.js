'use strict';

window.Hanoi = (() => {
  // ============================================================
  // 1. 常量区
  // ============================================================
  const ERROR_MESSAGES = {
    INVALID_NUMBER: '请输入有效的整数。',
    OUT_OF_RANGE: '盘子数必须在 1 到 8 之间。',
    NO_TESTCASES: '暂无可用的汉诺塔测试用例。',
    RUN_FAILED: '算法运行出错，已重置。'
  };

  const TOWER_NAMES = ['A', 'B', 'C'];
  const MAX_DISKS = 8;
  const MIN_DISKS = 1;
  const PLAY_SPEED = 600;

  const CANVAS_CONFIG = {
    TOWER_X_RATIO: [1 / 6, 3 / 6, 5 / 6],
    TOWER_WIDTH: 8,
    BASE_HEIGHT: 8,
    DISK_HEIGHT: 18,
    DISK_MIN_WIDTH: 36,
    DISK_WIDTH_STEP: 14,
    PADDING_TOP: 56,
    PADDING_BOTTOM: 24,
    HOVER_OFFSET: 28,
    BG_COLOR: 'rgba(255,255,255,0.02)',
    POLE_COLOR: '#94a3b8',
    BASE_COLOR: '#475569',
    LABEL_COLOR: '#e2e8f0',
    HIGHLIGHT_FROM: '#f59e0b',
    HIGHLIGHT_TO: '#22c55e',
    DISK_STROKE: 'rgba(255,255,255,0.2)',
    MOVING_STROKE: '#facc15',
    MOVING_STROKE_WIDTH: 3
  };

  // ============================================================
  // 模块内部状态
  // ============================================================
  let canvasEl = null;
  let ctx = null;
  let stepManager = null;
  let testcases = [];
  let initialized = false;

  // ============================================================
  // 辅助：DOM 引用
  // ============================================================
  const refs = {};

  const cacheRefs = () => {
    refs.diskCount = Common.$('#diskCount');
    refs.btnRandom = Common.$('#btnRandom');
    refs.btnRun = Common.$('#btnRun');
    refs.btnReset = Common.$('#btnReset');
    refs.testcaseSelect = Common.$('#testcaseSelect');
    refs.btnFirst = Common.$('#btnFirst');
    refs.btnPrev = Common.$('#btnPrev');
    refs.btnPlayPause = Common.$('#btnPlayPause');
    refs.btnLast = Common.$('#btnLast');
    refs.progressFill = Common.$('#progressFill');
    refs.stepCounter = Common.$('#stepCounter');
    refs.stepDesc = Common.$('#stepDesc');
    refs.stepLog = Common.$('#stepLog');
    refs.moveCountLabel = Common.$('#moveCountLabel');
    refs.canvas = Common.$('#hanoiCanvas');
  };

  // ============================================================
  // 2. 算法层
  // ============================================================

  /**
   * 生成初始状态。
   * @param {number} n 盘子数
   * @returns {object} HanoiState
   */
  const buildInitialState = (n) => {
    const firstTower = [];
    for (let disk = n; disk >= 1; disk -= 1) {
      firstTower.push(disk);
    }
    return {
      towers: [firstTower, [], []],
      movingDisk: null,
      from: null,
      to: null,
      moveCount: 0,
      phase: 'init'
    };
  };

  /**
   * 解汉诺塔并将每一步状态录入 stepManager。
   * @param {number} n 盘子数（1~8）
   * @returns {void}
   */
  const solveHanoi = (n) => {
    const state = buildInitialState(n);

    stepManager.addStep({
      state: Common.deepClone(state),
      description: `初始化：${n} 个盘子全部置于 ${TOWER_NAMES[0]} 柱。`
    });

    const moveOne = (from, to) => {
      const disk = state.towers[from].pop();
      state.towers[to].push(disk);
      state.moveCount += 1;
      state.movingDisk = disk;
      state.from = from;
      state.to = to;
      state.phase = 'moving';
      stepManager.addStep({
        state: Common.deepClone(state),
        description: `第 ${state.moveCount} 步：将盘 ${disk} 从 ${TOWER_NAMES[from]} 柱移动到 ${TOWER_NAMES[to]} 柱。`
      });
    };

    const hanoi = (k, from, to, via) => {
      if (k <= 0) return;
      if (k === 1) {
        moveOne(from, to);
        return;
      }
      hanoi(k - 1, from, via, to);
      moveOne(from, to);
      hanoi(k - 1, via, to, from);
    };

    hanoi(n, 0, 2, 1);

    state.movingDisk = null;
    state.from = null;
    state.to = null;
    state.phase = 'done';
    stepManager.addStep({
      state: Common.deepClone(state),
      description: `完成！共移动 ${state.moveCount} 次（理论最少 ${(2 ** n) - 1} 次）。`
    });
  };

  // ============================================================
  // 3. 渲染层
  // ============================================================

  /**
   * 同步 canvas 元素的位图尺寸到其布局尺寸。
   * @returns {void}
   */
  const resizeCanvas = () => {
    if (!canvasEl) return;
    const width = canvasEl.clientWidth || canvasEl.parentElement.clientWidth || 600;
    const height = canvasEl.clientHeight || 360;
    if (canvasEl.width !== width) canvasEl.width = width;
    if (canvasEl.height !== height) canvasEl.height = height;
    const current = stepManager ? stepManager.getCurrentStep() : null;
    if (current) {
      drawCanvas(ctx, current.state);
    } else {
      drawEmpty(ctx);
    }
  };

  /**
   * 计算盘子的视觉宽度（像素）。
   * @param {number} disk 盘号（1 起始）
   * @returns {number}
   */
  const diskWidth = (disk) => {
    return CANVAS_CONFIG.DISK_MIN_WIDTH + (disk - 1) * CANVAS_CONFIG.DISK_WIDTH_STEP;
  };

  /**
   * 盘色（HSL 渐变）。
   * @param {number} disk 盘号
   * @returns {string}
   */
  const diskColor = (disk) => `hsl(${(disk * 40) % 360}, 70%, 55%)`;

  /**
   * 绘制空画布占位。
   * @param {CanvasRenderingContext2D} context 上下文
   */
  const drawEmpty = (context) => {
    if (!context || !canvasEl) return;
    const w = canvasEl.width;
    const h = canvasEl.height;
    context.clearRect(0, 0, w, h);
    context.fillStyle = CANVAS_CONFIG.BG_COLOR;
    context.fillRect(0, 0, w, h);
    drawTowers(context, [[], [], []], null, null);
    context.fillStyle = CANVAS_CONFIG.LABEL_COLOR;
    context.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
    context.textAlign = 'left';
    context.fillText('移动次数：0', 16, 24);
  };

  /**
   * 绘制三根柱子与底座。
   * @param {CanvasRenderingContext2D} context
   * @param {number[][]} towers
   * @param {number|null} fromIdx
   * @param {number|null} toIdx
   */
  const drawTowers = (context, towers, fromIdx, toIdx) => {
    const w = canvasEl.width;
    const h = canvasEl.height;
    const baseY = h - CANVAS_CONFIG.PADDING_BOTTOM;
    const poleTopY = CANVAS_CONFIG.PADDING_TOP;
    const poleHeight = baseY - poleTopY;

    context.fillStyle = CANVAS_CONFIG.BASE_COLOR;
    context.fillRect(20, baseY, w - 40, CANVAS_CONFIG.BASE_HEIGHT);

    for (let i = 0; i < 3; i += 1) {
      const cx = w * CANVAS_CONFIG.TOWER_X_RATIO[i];
      context.fillStyle = CANVAS_CONFIG.POLE_COLOR;
      context.fillRect(
        cx - CANVAS_CONFIG.TOWER_WIDTH / 2,
        poleTopY,
        CANVAS_CONFIG.TOWER_WIDTH,
        poleHeight
      );

      let labelColor = CANVAS_CONFIG.LABEL_COLOR;
      if (i === fromIdx) labelColor = CANVAS_CONFIG.HIGHLIGHT_FROM;
      if (i === toIdx) labelColor = CANVAS_CONFIG.HIGHLIGHT_TO;
      context.fillStyle = labelColor;
      context.font = 'bold 14px "PingFang SC","Microsoft YaHei",sans-serif';
      context.textAlign = 'center';
      context.fillText(TOWER_NAMES[i], cx, baseY + CANVAS_CONFIG.BASE_HEIGHT + 16);
    }
  };

  /**
   * 渲染单个盘子。
   * @param {CanvasRenderingContext2D} context
   * @param {number} disk 盘号
   * @param {number} cx 中心 x
   * @param {number} cy 中心 y
   * @param {boolean} highlight 是否高亮描边
   */
  const drawDisk = (context, disk, cx, cy, highlight) => {
    const dw = diskWidth(disk);
    const dh = CANVAS_CONFIG.DISK_HEIGHT;
    const x = cx - dw / 2;
    const y = cy - dh / 2;
    context.fillStyle = diskColor(disk);
    context.fillRect(x, y, dw, dh);
    if (highlight) {
      context.strokeStyle = CANVAS_CONFIG.MOVING_STROKE;
      context.lineWidth = CANVAS_CONFIG.MOVING_STROKE_WIDTH;
    } else {
      context.strokeStyle = CANVAS_CONFIG.DISK_STROKE;
      context.lineWidth = 1;
    }
    context.strokeRect(x, y, dw, dh);

    context.fillStyle = '#0f1724';
    context.font = 'bold 12px "PingFang SC","Microsoft YaHei",sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(String(disk), cx, cy);
    context.textBaseline = 'alphabetic';
  };

  /**
   * 主渲染：根据 state 重绘三柱、盘子、提示信息。
   * @param {CanvasRenderingContext2D} context
   * @param {object} state HanoiState
   */
  const drawCanvas = (context, state) => {
    if (!context || !canvasEl || !state) return;
    const w = canvasEl.width;
    const h = canvasEl.height;
    context.clearRect(0, 0, w, h);
    context.fillStyle = CANVAS_CONFIG.BG_COLOR;
    context.fillRect(0, 0, w, h);

    drawTowers(context, state.towers, state.from, state.to);

    const baseY = h - CANVAS_CONFIG.PADDING_BOTTOM;

    for (let i = 0; i < 3; i += 1) {
      const cx = w * CANVAS_CONFIG.TOWER_X_RATIO[i];
      const stack = state.towers[i] || [];
      for (let j = 0; j < stack.length; j += 1) {
        const disk = stack[j];
        const diskCenterY = baseY - CANVAS_CONFIG.DISK_HEIGHT / 2 - j * CANVAS_CONFIG.DISK_HEIGHT;
        const isMoving = state.phase === 'moving' && i === state.to && j === stack.length - 1 && disk === state.movingDisk;
        if (isMoving) {
          const hoverY = CANVAS_CONFIG.PADDING_TOP - CANVAS_CONFIG.HOVER_OFFSET / 2;
          drawDisk(context, disk, cx, hoverY, true);
        } else {
          drawDisk(context, disk, cx, diskCenterY, false);
        }
      }
    }

    context.fillStyle = CANVAS_CONFIG.LABEL_COLOR;
    context.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(`移动次数：${state.moveCount}`, 16, 24);

    if (state.phase === 'moving' && state.from !== null && state.to !== null) {
      context.fillStyle = CANVAS_CONFIG.HIGHLIGHT_FROM;
      context.textAlign = 'right';
      context.fillText(
        `${TOWER_NAMES[state.from]} → ${TOWER_NAMES[state.to]}`,
        w - 16,
        24
      );
    }
  };

  // ============================================================
  // 渲染辅助：步骤文本、进度条、日志
  // ============================================================

  const updateStepDesc = (text) => {
    if (refs.stepDesc) refs.stepDesc.textContent = text || '——';
  };

  const updateProgress = (idx, total) => {
    if (refs.stepCounter) {
      const shown = idx >= 0 ? idx + 1 : 0;
      refs.stepCounter.textContent = `${shown} / ${total}`;
    }
    if (refs.progressFill) {
      const ratio = total > 0 && idx >= 0 ? ((idx + 1) / total) * 100 : 0;
      refs.progressFill.style.width = `${ratio}%`;
    }
  };

  const updateMoveCount = (count) => {
    if (refs.moveCountLabel) {
      refs.moveCountLabel.textContent = `${count || 0} 步`;
    }
  };

  const appendStepLog = (idx, description) => {
    if (!refs.stepLog) return;
    const item = Common.createElement(
      'div',
      { class: 'step-log-item' },
      `${idx + 1}. ${description}`
    );
    refs.stepLog.appendChild(item);
    refs.stepLog.scrollTop = refs.stepLog.scrollHeight;
  };

  const clearStepLog = () => {
    if (refs.stepLog) Common.clearChildren(refs.stepLog);
  };

  const setPlayPauseIcon = (isPlaying) => {
    if (refs.btnPlayPause) {
      refs.btnPlayPause.textContent = isPlaying ? '❚❚' : '▶';
    }
  };

  /** 批量设置播放控制按钮的可用状态（载入数据前全部禁用） */
  const setControlsEnabled = (enabled) => {
    if (refs.btnFirst) refs.btnFirst.disabled = !enabled;
    if (refs.btnPrev) refs.btnPrev.disabled = !enabled;
    if (refs.btnPlayPause) refs.btnPlayPause.disabled = !enabled;
    if (refs.btnLast) refs.btnLast.disabled = !enabled;
    if (refs.btnReset) refs.btnReset.disabled = !enabled;
  };

  /** 根据当前步骤位置同步边界按钮禁用状态：第 0 步禁用 ⏮/◀，末步禁用 ⏭ */
  const syncBoundaryButtons = (idx, total) => {
    if (refs.btnFirst) refs.btnFirst.disabled = (idx <= 0);
    if (refs.btnPrev) refs.btnPrev.disabled = (idx <= 0);
    if (refs.btnLast) refs.btnLast.disabled = (idx >= total - 1);
  };

  const clearError = () => {
    // 错误显示已统一为右下角 Toast（Common.showToast），自动消失，无需主动清除。
    // 函数保留以维持其他位置的调用（重置/重新运行的时机点），未来可移除。
  };

  // ============================================================
  // 4. 控制层
  // ============================================================

  /**
   * 校验并解析输入的盘子数。
   * @param {string|number} raw 原始值
   * @returns {number}
   */
  const parseDiskCount = (raw) => {
    const value = Number(raw);
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new Error(ERROR_MESSAGES.INVALID_NUMBER);
    }
    if (value < MIN_DISKS || value > MAX_DISKS) {
      throw new Error(ERROR_MESSAGES.OUT_OF_RANGE);
    }
    return value;
  };

  /**
   * 运行算法：读取输入 → 校验 → 录步 → 自动播放。
   */
  const handleRun = () => {
    clearError();
    let n;
    try {
      n = parseDiskCount(refs.diskCount ? refs.diskCount.value : '');
    } catch (err) {
      Common.showToast(err.message, 'error');
      return;
    }

    try {
      stepManager.pause();
      stepManager.setSteps([]);
      clearStepLog();
      updateStepDesc('——');
      updateMoveCount(0);
      updateProgress(-1, 0);

      const initial = buildInitialState(n);
      drawCanvas(ctx, initial);

      solveHanoi(n);
      stepManager.play(PLAY_SPEED);
      setPlayPauseIcon(true);
      setControlsEnabled(true);
    } catch (err) {
      stepManager.pause();
      stepManager.setSteps([]);
      drawEmpty(ctx);
      updateStepDesc('——');
      updateMoveCount(0);
      updateProgress(-1, 0);
      setControlsEnabled(false);
      Common.showToast(ERROR_MESSAGES.RUN_FAILED, 'error');
    }
  };

  /**
   * 随机生成 1~8 之间的盘子数。
   */
  const handleRandom = () => {
    clearError();
    const n = Math.floor(Math.random() * MAX_DISKS) + 1;
    if (refs.diskCount) refs.diskCount.value = String(n);
  };

  /**
   * 重置可视化状态。
   */
  const reset = () => {
    if (stepManager) {
      stepManager.pause();
      stepManager.setSteps([]);
    }
    clearStepLog();
    updateStepDesc('——');
    updateMoveCount(0);
    updateProgress(-1, 0);
    setPlayPauseIcon(false);
    drawEmpty(ctx);
    clearError();
    setControlsEnabled(false);
  };

  /**
   * 初始化测试用例下拉，并绑定切换事件。
   */
  const initTestcaseUI = () => {
    testcases = (window.Testcases && Array.isArray(window.Testcases.hanoi))
      ? window.Testcases.hanoi
      : [];
    if (!refs.testcaseSelect) return;
    if (testcases.length === 0) {
      Common.showToast(ERROR_MESSAGES.NO_TESTCASES, 'error');
      return;
    }
    Common.populateTestcaseSelect(
      refs.testcaseSelect,
      testcases,
      (item) => `${item.name}（${item.disks} 盘）`
    );
    Common.addEvent(refs.testcaseSelect, 'change', () => {
      const tc = Common.getSelectedTestcase(refs.testcaseSelect, testcases);
      if (tc && refs.diskCount) {
        refs.diskCount.value = String(tc.disks);
        clearError();
      }
    });
    const initial = Common.getSelectedTestcase(refs.testcaseSelect, testcases);
    if (initial && refs.diskCount) {
      refs.diskCount.value = String(initial.disks);
    }
  };

  /**
   * 绑定按钮事件。
   */
  const bindEvents = () => {
    Common.addEvent(refs.btnRun, 'click', handleRun);
    Common.addEvent(refs.btnRandom, 'click', handleRandom);
    Common.addEvent(refs.btnReset, 'click', reset);

    Common.addEvent(refs.btnFirst, 'click', () => {
      stepManager.pause();
      setPlayPauseIcon(false);
      stepManager.reset();
      if (stepManager.steps.length > 0) {
        stepManager.next();
      }
    });

    Common.addEvent(refs.btnPrev, 'click', () => {
      stepManager.pause();
      setPlayPauseIcon(false);
      stepManager.prev();
    });

    Common.addEvent(refs.btnPlayPause, 'click', () => {
      if (stepManager.isPlaying) {
        stepManager.pause();
        setPlayPauseIcon(false);
        return;
      }
      if (stepManager.steps.length === 0) return;
      if (stepManager.currentIndex >= stepManager.steps.length - 1) {
        stepManager.reset();
      }
      stepManager.play(PLAY_SPEED);
      setPlayPauseIcon(true);
    });

    Common.addEvent(refs.btnLast, 'click', () => {
      stepManager.pause();
      setPlayPauseIcon(false);
      const total = stepManager.steps.length;
      if (total === 0) return;
      stepManager.currentIndex = total - 1;
      const last = stepManager.getCurrentStep();
      if (last) {
        stepManager.onStep(last, stepManager.currentIndex);
      }
    });

    window.addEventListener('resize', resizeCanvas);
  };

  // ============================================================
  // 5. 暴露入口
  // ============================================================

  /**
   * 模块初始化：拿 DOM、构造 StepManager、绑定事件、加载测试用例。
   */
  const init = () => {
    if (initialized) return;
    cacheRefs();
    canvasEl = refs.canvas;
    if (!canvasEl || !canvasEl.getContext) {
      return;
    }
    ctx = canvasEl.getContext('2d');

    stepManager = new Common.StepManager({
      onStep: (step, idx) => {
        if (!step) {
          drawEmpty(ctx);
          updateStepDesc('——');
          updateProgress(-1, stepManager ? stepManager.steps.length : 0);
          updateMoveCount(0);
          return;
        }
        drawCanvas(ctx, step.state);
        updateStepDesc(step.description);
        updateProgress(idx, stepManager.steps.length);
        updateMoveCount(step.state.moveCount);
        appendStepLog(idx, step.description);
        syncBoundaryButtons(idx, stepManager.steps.length);
      },
      onPlayEnd: () => {
        setPlayPauseIcon(false);
      }
    });

    resizeCanvas();
    initTestcaseUI();
    bindEvents();
    setControlsEnabled(false);
    initialized = true;
  };

  /**
   * 直接以盘数运行（外部调用入口）。
   * @param {{disks:number}|number} input
   */
  const run = (input) => {
    const n = typeof input === 'object' && input ? input.disks : input;
    if (refs.diskCount) refs.diskCount.value = String(n);
    handleRun();
  };

  return { init, run, reset };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (window.Hanoi && typeof window.Hanoi.init === 'function') {
    window.Hanoi.init();
  }
});
