"use strict";

/**
 * 快速排序可视化模块
 *
 * 整体架构分三层，彼此解耦：
 *   1. generateSteps(input)  —— 纯算法层：执行快排并把每一步的数组状态录制成快照数组
 *   2. renderStep(canvas, step) —— 渲染层：读取单步快照，用 Canvas API 绘制柱状图
 *   3. init()                —— 控制层：绑定所有 DOM 事件，用 Common.StepManager 驱动播放
 *
 * 算法选用 Lomuto 分区方案（选末位元素为 pivot）：
 *   - 逻辑比 Hoare 方案简单，便于可视化时精确标记 pivot 位置
 *   - 维护指针 i 作为"已处理的小于等于区"右边界
 *   - 外层指针 j 从 low 扫到 high-1，遇到 ≤ pivot 的元素就将其与 arr[++i] 交换
 *   - 扫描结束后将 pivot（arr[high]）与 arr[i+1] 交换，pivot 落位完成
 *   - 递归处理 [low, pivotIdx-1] 和 [pivotIdx+1, high] 两个子数组
 */

const QuickSort = (() => {

    /* ───────────────────────────────────────────
       1. 算法核心：生成每一步的快照
    ─────────────────────────────────────────── */

    /**
     * 对数组 input 执行快速排序，返回包含每一步状态的快照数组。
     * 调用者（渲染层）只需按下标依次读取 steps[i] 即可回放整个过程。
     *
     * 每条快照 step 的字段说明：
     *   arr       {number[]}      当前数组的深拷贝（每步独立，互不干扰）
     *   pivot     {number|null}   当前 pivot 的下标（Canvas 渲染为紫色）
     *   comparing {number|null}   正在与 pivot 比较的元素下标（橙色）
     *   swapping  {number[]|null} 正在交换的两个下标 [i, j]（红色）
     *   sorted    {Set<number>}   已确定最终位置的下标集合（绿色）
     *   range     {low, high}     本次 partition 处理的子数组范围（用于绘制高亮背景）
     *   desc      {string}        本步骤的文字说明，显示在步骤日志里
     */
    function generateSteps(input) {
        const arr = [...input]; // 工作副本，算法在此数组上原地排序
        const steps = [];
        const sorted = new Set(); // 全局追踪已就位下标，渲染时始终保持绿色

        // 边界情况：0 或 1 个元素，无需排序
        if (arr.length <= 1) {
            arr.forEach((_, i) => sorted.add(i));
            steps.push({
                arr: [...arr], pivot: null, comparing: null,
                swapping: null, sorted: new Set(sorted),
                range: { low: 0, high: arr.length - 1 },
                desc: "数组只有一个元素，已经有序。"
            });
            return steps;
        }

        /**
         * 记录一步快照的辅助函数。
         * 每次调用时对 arr 和 sorted 做深拷贝，防止后续修改污染已记录的步骤。
         */
        function addStep(pivot, comparing, swapping, range, desc) {
            steps.push({
                arr: [...arr],          // 数组浅拷贝（元素是数字，无需深拷贝）
                pivot,
                comparing,
                swapping,
                sorted: new Set(sorted), // Set 不是值类型，必须复制
                range,
                desc
            });
        }

        /**
         * Lomuto 分区函数
         * 选取 arr[high] 为 pivot，将 [low, high] 范围内的元素重排为：
         *   [小于等于 pivot 的元素] + [pivot] + [大于 pivot 的元素]
         * 返回 pivot 落位后的下标。
         *
         * 关键不变量：
         *   执行过程中，arr[low..i] 的元素均 ≤ pivot
         *              arr[i+1..j-1] 的元素均 > pivot
         *   每次 arr[j] ≤ pivot 时，把 arr[j] 并入左区（与 arr[++i] 交换）
         */
        function partition(low, high) {
            const pivotVal = arr[high];
            addStep(high, null, null, { low, high },
                `选取 arr[${high}] = ${pivotVal} 作为基准 (pivot)，开始分区 [${low}, ${high}]`);

            let i = low - 1; // i 始终指向"已处理的左区"最后一个元素，初始为 low-1（左区为空）

            for (let j = low; j < high; j++) {
                // 展示当前 j 位置正在与 pivot 比较
                addStep(high, j, null, { low, high },
                    `比较 arr[${j}] = ${arr[j]} 与 pivot ${pivotVal}：` +
                    `${arr[j] <= pivotVal ? "≤ pivot，需要移入左区" : "> pivot，跳过"}`);

                if (arr[j] <= pivotVal) {
                    i++;
                    if (i !== j) {
                        // i ≠ j 时才真正需要交换；若 i === j 说明元素本就在正确区域
                        addStep(high, null, [i, j], { low, high },
                            `arr[${j}] = ${arr[j]} ≤ pivot，将其与 arr[${i}] = ${arr[i]} 交换`);
                        [arr[i], arr[j]] = [arr[j], arr[i]]; // ES6 解构交换，无需临时变量
                        addStep(high, null, null, { low, high },
                            `交换完成：arr[${i}] = ${arr[i]}，arr[${j}] = ${arr[j]}`);
                    } else {
                        addStep(high, null, null, { low, high },
                            `arr[${j}] = ${arr[j]} ≤ pivot，位置已正确，无需交换`);
                    }
                }
            }

            // 扫描结束，将 pivot 从末位换到 i+1（左区右侧第一个位置）
            const pivotFinalIdx = i + 1;
            if (pivotFinalIdx !== high) {
                // 仅当 pivot 不在最终位置时才需要交换
                addStep(high, null, [pivotFinalIdx, high], { low, high },
                    `分区结束，将 pivot ${pivotVal} 从 arr[${high}] 换到最终位置 arr[${pivotFinalIdx}]`);
                [arr[pivotFinalIdx], arr[high]] = [arr[high], arr[pivotFinalIdx]];
            }

            // pivot 已就位，加入 sorted 集合，后续所有步骤都会渲染为绿色
            sorted.add(pivotFinalIdx);
            addStep(null, null, null, { low, high },
                `pivot ${pivotVal} 已就位于 arr[${pivotFinalIdx}]，` +
                `左侧均 ≤ ${pivotVal}，右侧均 > ${pivotVal}`);

            return pivotFinalIdx;
        }

        /**
         * 递归快速排序入口
         * low >= high 是递归终止条件：
         *   low > high  —— 空子数组，直接返回
         *   low === high —— 单元素，标记为已排序并返回
         */
        function quicksort(low, high) {
            if (low >= high) {
                if (low === high) {
                    sorted.add(low);
                    addStep(null, null, null, { low, high },
                        `子数组只剩 arr[${low}] = ${arr[low]}，已就位`);
                }
                return;
            }

            const pivotIdx = partition(low, high);
            quicksort(low, pivotIdx - 1);  // 递归排序 pivot 左侧
            quicksort(pivotIdx + 1, high); // 递归排序 pivot 右侧
        }

        quicksort(0, arr.length - 1);

        // 追加最终完成步骤：将所有下标标为已排序，便于渲染层显示全绿状态
        steps.push({
            arr: [...arr],
            pivot: null, comparing: null, swapping: null,
            sorted: new Set(Array.from({ length: arr.length }, (_, i) => i)),
            range: { low: 0, high: arr.length - 1 },
            desc: `排序完成！结果：[ ${arr.join(", ")} ]`
        });

        return steps;
    }


    /* ───────────────────────────────────────────
       2. Canvas 渲染
    ─────────────────────────────────────────── */

    /**
     * 柱子颜色优先级（由高到低）：
     *   swapping > comparing > pivot > sorted > default(渐变)
     * 优先级在 barColors 的 map 回调中体现，越靠前的条件越优先。
     */
    const COLORS = {
        default:   null,       // null 表示使用渐变蓝青色，在绘制时单独处理
        pivot:     "#a855f7",  // 紫色：当前 pivot 元素
        comparing: "#f59e0b",  // 橙色：正在与 pivot 比较的元素
        swapping:  "#ef4444",  // 红色：正在执行交换的两个元素
        sorted:    "#22c55e",  // 绿色：已确定最终位置的元素
    };

    /**
     * 绘制顶部带圆角的矩形（柱状图单根柱子）。
     * 原生 ctx.roundRect 在旧版浏览器（Chrome < 99）不支持，
     * 此处用 quadraticCurveTo 手动绘制，兼容性更好。
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x   左上角 x
     * @param {number} y   左上角 y
     * @param {number} w   宽度
     * @param {number} h   高度
     * @param {number} r   顶部圆角半径
     */
    function drawRoundedBar(ctx, x, y, w, h, r) {
        if (h < r) r = h; // 高度不足时缩小圆角，避免绘制异常
        ctx.beginPath();
        ctx.moveTo(x + r, y);                          // 顶部左端（圆角起点）
        ctx.lineTo(x + w - r, y);                      // 顶部右端
        ctx.quadraticCurveTo(x + w, y, x + w, y + r); // 右上圆角
        ctx.lineTo(x + w, y + h);                      // 右侧竖线到底部
        ctx.lineTo(x, y + h);                          // 底部横线
        ctx.lineTo(x, y + r);                          // 左侧竖线到顶部
        ctx.quadraticCurveTo(x, y, x + r, y);         // 左上圆角
        ctx.closePath();
        ctx.fill();
    }

    /**
     * 将单步快照渲染为柱状图。
     * 每次调用都会清空画布重绘，不依赖上一帧状态（无状态渲染）。
     *
     * 布局计算说明：
     *   barW  = (可用宽度 - 总间隙) / 柱子数量，保证等宽
     *   barH  = (元素值 / 最大值) * 可用高度，等比例映射到画布高度
     *   gap   随柱子数量自适应：元素多时缩小间距，避免柱子过窄
     *
     * @param {HTMLCanvasElement} canvas
     * @param {Object} step - 由 generateSteps 生成的单步快照
     */
    function renderStep(canvas, step) {
        const ctx = canvas.getContext("2d");
        const W = canvas.width;
        const H = canvas.height;

        ctx.clearRect(0, 0, W, H); // 清空上一帧

        const { arr, pivot, comparing, swapping, sorted } = step;
        const n = arr.length;
        if (n === 0) return;

        const maxVal = Math.max(...arr);

        // ── 布局常量 ──
        const paddingX      = 24;  // 左右留白
        const paddingTop    = 20;  // 顶部留白（数值标签空间）
        const paddingBottom = 40;  // 底部留白（索引标签 + 轴线空间）
        // gap 随元素数量减小：10个元素时 gap=6，20个元素时 gap=3
        const gap       = Math.max(2, Math.floor(6 * (10 / n)));
        const totalGap  = gap * (n - 1);
        const barW      = Math.floor((W - paddingX * 2 - totalGap) / n);
        const chartH    = H - paddingTop - paddingBottom; // 柱子可用的最大高度

        // ── 为每根柱子确定颜色（按优先级）──
        const barColors = arr.map((_, i) => {
            if (swapping && (i === swapping[0] || i === swapping[1])) return COLORS.swapping;
            if (comparing !== null && i === comparing) return COLORS.comparing;
            if (pivot !== null && i === pivot) return COLORS.pivot;
            if (sorted.has(i)) return COLORS.sorted;
            return COLORS.default; // 返回 null，绘制时用渐变替代
        });

        // ── 绘制当前分区范围的背景高亮 ──
        // 仅在有 pivot 时绘制，帮助用户识别当前递归处理的子数组范围
        if (step.range && step.pivot !== null) {
            const { low, high } = step.range;
            const rx = paddingX + low * (barW + gap) - 4;
            const rw = (high - low) * (barW + gap) + barW + 8;
            ctx.fillStyle = "rgba(255,255,255,0.025)";
            ctx.beginPath();
            // 优先使用原生 roundRect（现代浏览器），否则降级为普通矩形
            ctx.roundRect
                ? ctx.roundRect(rx, paddingTop - 8, rw, chartH + 8, 6)
                : ctx.rect(rx, paddingTop - 8, rw, chartH + 8);
            ctx.fill();
        }

        // ── 逐根绘制柱子 ──
        for (let i = 0; i < n; i++) {
            const val  = arr[i];
            // 高度按比例映射，最小 4px 避免数值为 1 时柱子不可见
            const barH = Math.max(4, Math.floor((val / maxVal) * chartH));
            const x    = paddingX + i * (barW + gap); // 柱子左上角 x
            const y    = paddingTop + (chartH - barH); // 柱子左上角 y（从底部向上）

            // 设置填充色
            const color = barColors[i];
            if (color) {
                ctx.fillStyle = color;
            } else {
                // 默认：蓝→青垂直渐变，视觉上有立体感
                const grad = ctx.createLinearGradient(x, y, x, y + barH);
                grad.addColorStop(0, "#3b82f6");
                grad.addColorStop(1, "#06b6d4");
                ctx.fillStyle = grad;
            }

            drawRoundedBar(ctx, x, y, barW, barH, 3);

            // 数值标签：显示在柱子正上方，字号随柱宽自适应（最小10px，最大13px）
            ctx.fillStyle = "#e6eef8";
            ctx.font = `${Math.max(10, Math.min(13, barW - 2))}px Consolas, monospace`;
            ctx.textAlign = "center";
            ctx.fillText(String(val), x + barW / 2, y - 4);

            // 索引标签：显示在底部轴线下方，用于对应数组下标
            ctx.fillStyle = "#64748b";
            ctx.font = "10px Consolas, monospace";
            ctx.fillText(String(i), x + barW / 2, H - paddingBottom + 14);
        }

        // ── 底部轴线 ──
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(paddingX, H - paddingBottom);
        ctx.lineTo(W - paddingX, H - paddingBottom);
        ctx.stroke();
    }


    /* ───────────────────────────────────────────
       3. 页面控制器
    ─────────────────────────────────────────── */

    function init() {
        // ── DOM 引用 ──
        // 所有 id 以 "qs-" 为前缀，避免与其他算法页面的 id 冲突
        const canvas       = Common.$("#qs-canvas");
        const stage        = Common.$("#qs-canvas-stage");       // canvas 的父容器，用于读取实际尺寸
        const placeholder  = Common.$("#qs-placeholder");        // 未载入数据时的提示文字
        const inputEl      = Common.$("#qs-input");
        const stepLog      = Common.$("#qs-step-log");           // 步骤日志滚动区
        const stepCounter  = Common.$("#qs-step-counter");       // "步骤 X / Y" 计数
        const progressFill = Common.$("#qs-progress-fill");      // 进度条填充条
        const speedSlider  = Common.$("#qs-speed");              // 播放速度滑块
        const speedLabel   = Common.$("#qs-speed-label");        // 速度数值显示
        const selectEl     = Common.$("#qs-testcase-select");    // 测试用例下拉
        const testcaseDesc = Common.$("#qs-testcase-desc");      // 用例说明文字
        const stepDescEl   = Common.$("#qs-step-desc");          // 当前步骤说明卡片

        const btnStart  = Common.$("#qs-start");
        const btnRandom = Common.$("#qs-random");
        const btnFirst  = Common.$("#qs-btn-first");
        const btnPrev   = Common.$("#qs-btn-prev");
        const btnPlay   = Common.$("#qs-btn-play");
        const btnLast   = Common.$("#qs-btn-last");
        const btnReset  = Common.$("#qs-btn-reset");

        let steps     = [];    // 当前算法生成的全部步骤
        let isPlaying = false; // 是否处于自动播放状态

        /**
         * 将 canvas 的物理像素尺寸同步到其 DOM 父容器的客户端尺寸。
         * Canvas 元素的 width/height 属性控制画布分辨率，与 CSS 尺寸是独立的；
         * 不同步会导致坐标系统错乱或图像拉伸。
         * 每次渲染前都调用，保证窗口缩放后不失真。
         */
        function resizeCanvas() {
            canvas.width  = stage.clientWidth;
            canvas.height = stage.clientHeight;
        }

        /**
         * 将速度滑块的值（1-10）映射为每步间隔毫秒数（1200ms - 120ms）。
         * 采用线性反映射：滑块值越大，间隔越短，播放越快。
         * 公式：ms = 1200 - (value - 1) * (1080 / 9)
         *   value=1  → 1200ms（最慢）
         *   value=10 → 120ms（最快）
         */
        function getSpeedMs() {
            return Math.round(1200 - (Number(speedSlider.value) - 1) * (1080 / 9));
        }

        /**
         * 更新进度条宽度和步骤计数文字。
         * 进度比例 = 当前步骤下标 / (总步骤数 - 1)，映射到 0% - 100%。
         */
        function updateProgress(idx) {
            const total = steps.length;
            const pct   = total > 1 ? (idx / (total - 1)) * 100 : 0;
            progressFill.style.width = pct + "%";
            stepCounter.textContent  = `步骤 ${idx + 1} / ${total}`;
        }

        /**
         * 将当前步骤的描述追加到步骤日志区域。
         * 第一步（idx===0）时清空日志，避免残留上一次运行的记录。
         * 追加后自动滚动到底部，确保最新步骤可见。
         */
        function appendLog(idx, desc) {
            if (idx === 0) stepLog.innerHTML = "";
            const entry = Common.createElement("div", { class: "log-entry" });
            entry.innerHTML = `<span class="step-num">[${idx + 1}]</span>${desc}`;
            stepLog.appendChild(entry);
            stepLog.scrollTop = stepLog.scrollHeight; // 滚动到底
        }

        /**
         * 渲染指定步骤并同步更新 UI 状态（进度条、日志、按钮禁用）。
         */
        function showStep(idx) {
            if (idx < 0 || idx >= steps.length) return;
            resizeCanvas();
            renderStep(canvas, steps[idx]);
            updateProgress(idx);
            appendLog(idx, steps[idx].desc);
            if (stepDescEl) stepDescEl.textContent = steps[idx].desc; // 同步"当前步骤"卡片
            if (btnFirst) btnFirst.disabled = (idx === 0);
            btnPrev.disabled = (idx === 0);                    // 第一步不能再上一步
            const atLast = (idx === steps.length - 1);
            if (btnLast) btnLast.disabled = atLast;            // 最后一步不能再下一步（保留命名一致）
        }

        /** 批量设置播放控制按钮的可用状态（载入数据前全部禁用）。 */
        function setControlsEnabled(enabled) {
            if (btnFirst) btnFirst.disabled = !enabled;
            btnPrev.disabled  = !enabled;
            btnPlay.disabled  = !enabled;
            if (btnLast)  btnLast.disabled  = !enabled;
            btnReset.disabled = !enabled;
        }

        /**
         * 停止自动播放：调用 StepManager 的 pause 清掉其内部 setTimeout 链，
         * 并同步本地 UI 状态（按钮文字、isPlaying 标志）。
         * 注意：必须调用 manager.pause()，否则 StepManager 的 _advance 会继续递归推进。
         */
        function stopPlay() {
            isPlaying = false;
            manager.pause();           // 关键：清掉 StepManager 内部的 timer
            btnPlay.textContent = "▶";
        }

        /**
         * 启动自动播放：若已在最后一步则从头播放，按当前速度推进。
         * 由「开始排序」「随机生成」「▶ 播放」三处复用。
         */
        function startPlay() {
            if (!steps.length) return;
            // 若已在最后一步，从头开始播放（重置到 -1，_advance 内会先 next() 到 0）
            if (manager.currentIndex >= steps.length - 1) {
                manager.currentIndex = -1;
            }
            isPlaying = true;
            btnPlay.textContent = "⏸";
            manager.speed = Math.max(50, getSpeedMs());
            manager.isPlaying = true;
            manager._advance();
        }

        /**
         * StepManager 实例：负责 next/prev/play/pause/reset 的状态管理。
         * onStep 回调在每次步骤变化时触发，由此驱动 showStep 更新画面。
         * onPlayEnd 在播放到最后一步后触发，恢复播放按钮状态。
         */
        const manager = new Common.StepManager({
            onStep: (step, idx) => {
                if (step === null) {
                    // step 为 null 表示 reset 被调用，回到第 0 步
                    resizeCanvas();
                    if (steps.length) {
                        showStep(0);
                        manager.currentIndex = 0;
                    }
                    return;
                }
                showStep(idx);
            },
            onPlayEnd: () => {
                stopPlay(); // 播放结束，恢复按钮状态
            }
        });

        /**
         * 用新的数组初始化整个可视化流程：
         *   1. 停止当前播放
         *   2. 生成步骤快照
         *   3. 清空日志，显示画布
         *   4. 渲染第 0 步
         *   5. 启用控制按钮
         */
        function loadSteps(arr) {
            stopPlay();
            steps = generateSteps(arr);
            manager.setSteps(steps);

            stepLog.innerHTML = "";
            if (placeholder) placeholder.style.display = "none"; // 隐藏占位提示（HTML 中无该元素时跳过）
            resizeCanvas();
            showStep(0);
            manager.currentIndex = 0;

            setControlsEnabled(true);
            btnPrev.disabled = true; // 第一步时"上一步"始终禁用
            if (btnFirst) btnFirst.disabled = true;
        }

        /**
         * 解析并校验用户输入，校验失败时在页面上显示红色错误信息并返回 null。
         * 校验规则：
         *   - 不能为空
         *   - 每个元素必须是 1-99 的整数（Canvas 显示高度比例的实际限制）
         *   - 至少 2 个元素，最多 20 个（超过 20 柱子过窄影响可读性）
         */
        function parseInput() {
            const raw = inputEl.value.trim();

            if (!raw) {
                Common.showToast("请输入数组数据", "error");
                return null;
            }
            let arr;
            try {
                arr = Common.parseNumberArray(raw); // common.js 提供，支持中文逗号和空格分隔
            } catch (e) {
                Common.showToast(e.message, "error");
                return null;
            }
            if (arr.length < 2) {
                Common.showToast("至少需要 2 个数字", "error");
                return null;
            }
            if (arr.length > 20) {
                Common.showToast("最多支持 20 个数字（Canvas 显示限制）", "error");
                return null;
            }
            const invalid = arr.find(v => v < 1 || v > 99 || !Number.isInteger(v));
            if (invalid !== undefined) {
                Common.showToast("每个数字需为 1 - 99 的整数", "error");
                return null;
            }
            return arr;
        }

        // ── 事件绑定 ──

        // 「开始排序」：校验输入后生成步骤并立即自动播放
        btnStart.addEventListener("click", () => {
            const arr = parseInput();
            if (!arr) return;
            loadSteps(arr);
            startPlay();
        });

        // 「随机生成」：生成 8 个 1-99 的随机整数，填入输入框并仅在 Canvas 绘制（不自动播放）
        btnRandom.addEventListener("click", () => {
            const arr = Common.randomIntegerArray(8, 1, 99);
            inputEl.value = arr.join(", ");
            loadSteps(arr);
        });

        // 测试用例下拉切换时：同步描述文案 + 回填输入框 + 在 Canvas 绘制（不自动播放）
        selectEl.addEventListener("change", () => {
            const tc = Common.getSelectedTestcase(selectEl, window.Testcases.quicksort);
            testcaseDesc.textContent = tc ? tc.description : "";
            if (!tc) return;
            stopPlay();
            inputEl.value = tc.input.join(", ");
            loadSteps([...tc.input]); // 展开为新数组，避免修改原始用例数据
        });

        // 「上一步」：停止自动播放，手动退一步
        btnPrev.addEventListener("click", () => {
            stopPlay();
            manager.prev();
        });

        // 「回到开始」⏮：跳到第 0 步
        if (btnFirst) {
            btnFirst.addEventListener("click", () => {
                stopPlay();
                if (!steps.length) return;
                manager.currentIndex = -1;
                manager.next();
            });
        }

        // 「跳到末尾」⏭：直接渲染最后一步（不播放中间帧）
        if (btnLast) {
            btnLast.addEventListener("click", () => {
                stopPlay();
                if (!steps.length) return;
                const last = steps.length - 1;
                manager.currentIndex = last;
                showStep(last);
            });
        }

        // 「播放 / 暂停」：切换自动播放状态
        btnPlay.addEventListener("click", () => {
            if (isPlaying) {
                stopPlay();
            } else {
                startPlay();
            }
        });

        // 「重置」：回到第 0 步，清空日志
        btnReset.addEventListener("click", () => {
            stopPlay();
            stepLog.innerHTML = "";
            manager.currentIndex = -1;
            manager.onStep(steps[0], 0); // 手动触发第 0 步渲染
            manager.currentIndex = 0;
            btnPrev.disabled = true;
            if (btnFirst) btnFirst.disabled = true;
            if (btnLast)  btnLast.disabled  = (steps.length <= 1);
        });

        // 速度滑块：实时更新标签；若正在播放，以新速度无缝继续
        speedSlider.addEventListener("input", () => {
            speedLabel.textContent = speedSlider.value;
            if (isPlaying) {
                manager.pause();                          // 清当前 timer
                manager.speed = Math.max(50, getSpeedMs());
                manager.isPlaying = true;
                manager._advance();                       // 以新速度恢复推进
            }
        });

        // 进度条点击跳转：计算点击位置相对于进度条宽度的比例，映射到步骤下标
        Common.$("#qs-progress").addEventListener("click", (e) => {
            if (!steps.length) return;
            stopPlay();
            const rect  = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width; // 0.0 ~ 1.0
            const idx   = Math.round(ratio * (steps.length - 1));
            manager.currentIndex = idx;
            showStep(idx);
        });

        // 输入框回车等同于点击「开始排序」
        inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter") btnStart.click();
        });

        // 窗口尺寸变化时重新调整 canvas 并重绘当前帧，避免画面拉伸
        window.addEventListener("resize", () => {
            if (steps.length && manager.currentIndex >= 0) {
                resizeCanvas();
                renderStep(canvas, steps[manager.currentIndex]);
            }
        });

        // ── 初始化测试用例下拉列表 ──
        Common.populateTestcaseSelect(
            selectEl,
            window.Testcases.quicksort,
            tc => tc.name // 将 tc.name 作为 <option> 显示文字
        );
        // 首屏处理：回填默认选中用例的输入框 + 描述文案，但不渲染 Canvas（保留 placeholder，与 hanoi 行为一致）
        const initTc = Common.getSelectedTestcase(selectEl, window.Testcases.quicksort);
        if (initTc) {
            inputEl.value = initTc.input.join(", ");
            testcaseDesc.textContent = initTc.description;
        }
    }

    // 若 DOM 尚未就绪则延迟执行，否则立即执行（处理 defer/async 脚本的边界情况）
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    // 暴露算法核心函数（IIFE 返回值，目前未被外部引用）
    return { generateSteps, renderStep };

})();
