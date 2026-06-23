"use strict";

/**
 * 快速排序可视化模块
 *
 * 算法：Lomuto 分区方案
 * - 每次选取当前子数组最后一个元素为 pivot
 * - 用指针 i 维护"小于等于 pivot 区"的边界
 * - 遍历 [low, high-1]，遇到 <= pivot 的元素就将其与 i+1 处交换
 * - 遍历结束后将 pivot 换到 i+1，完成一次分区
 * - 对左右两个子数组递归执行
 */
const QuickSort = (() => {

    /* ───────────────────────────────────────────
       1. 算法核心：生成每一步的快照
    ─────────────────────────────────────────── */

    /**
     * 对数组 arr 执行快速排序，返回包含每一步状态的数组
     * 每一步 step 的结构：
     *   arr        : 当前数组的快照（拷贝）
     *   pivot      : 当前基准元素的下标（紫色）
     *   comparing  : 正在与 pivot 比较的下标（橙色），可为 null
     *   swapping   : [i, j] 正在交换的两个下标（红色），可为 null
     *   sorted     : Set，已确定最终位置的下标集合（绿色）
     *   range      : { low, high } 当前处理的子数组范围
     *   desc       : 本步骤的文字说明
     */
    function generateSteps(input) {
        const arr = [...input];
        const steps = [];
        const sorted = new Set();

        // 如果数组为空或只有一个元素，直接标记为已排序
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

        function addStep(pivot, comparing, swapping, range, desc) {
            steps.push({
                arr: [...arr],
                pivot,
                comparing,
                swapping,
                sorted: new Set(sorted),
                range,
                desc
            });
        }

        /**
         * Lomuto 分区：选 arr[high] 为 pivot
         * 返回 pivot 最终落位的下标
         */
        function partition(low, high) {
            const pivotVal = arr[high];
            addStep(high, null, null, { low, high },
                `选取 arr[${high}] = ${pivotVal} 作为基准 (pivot)，开始分区 [${low}, ${high}]`);

            let i = low - 1; // i 指向"小于等于 pivot 区"的最后一个位置

            for (let j = low; j < high; j++) {
                // 展示比较过程
                addStep(high, j, null, { low, high },
                    `比较 arr[${j}] = ${arr[j]} 与 pivot ${pivotVal}：${arr[j] <= pivotVal ? "≤ pivot，需要移入左区" : "> pivot，跳过"}`);

                if (arr[j] <= pivotVal) {
                    i++;
                    if (i !== j) {
                        // 需要交换：先展示"准备交换"状态，再实际执行
                        addStep(high, null, [i, j], { low, high },
                            `arr[${j}] = ${arr[j]} ≤ pivot，将其与 arr[${i}] = ${arr[i]} 交换`);
                        [arr[i], arr[j]] = [arr[j], arr[i]];
                        addStep(high, null, null, { low, high },
                            `交换完成：arr[${i}] = ${arr[i]}，arr[${j}] = ${arr[j]}`);
                    } else {
                        addStep(high, null, null, { low, high },
                            `arr[${j}] = ${arr[j]} ≤ pivot，位置已正确，无需交换`);
                    }
                }
            }

            // 将 pivot 放到最终位置 i+1
            const pivotFinalIdx = i + 1;
            if (pivotFinalIdx !== high) {
                addStep(high, null, [pivotFinalIdx, high], { low, high },
                    `分区结束，将 pivot ${pivotVal} 从 arr[${high}] 换到最终位置 arr[${pivotFinalIdx}]`);
                [arr[pivotFinalIdx], arr[high]] = [arr[high], arr[pivotFinalIdx]];
            }

            sorted.add(pivotFinalIdx);
            addStep(null, null, null, { low, high },
                `pivot ${pivotVal} 已就位于 arr[${pivotFinalIdx}]，左侧均 ≤ ${pivotVal}，右侧均 > ${pivotVal}`);

            return pivotFinalIdx;
        }

        function quicksort(low, high) {
            if (low >= high) {
                // 单个元素子数组，直接标为已排序
                if (low === high) {
                    sorted.add(low);
                    addStep(null, null, null, { low, high },
                        `子数组只剩 arr[${low}] = ${arr[low]}，已就位`);
                }
                return;
            }

            const pivotIdx = partition(low, high);
            quicksort(low, pivotIdx - 1);
            quicksort(pivotIdx + 1, high);
        }

        quicksort(0, arr.length - 1);

        // 最终完成步骤
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

    const COLORS = {
        default:  null,          // 用渐变蓝青色
        pivot:    "#a855f7",     // 紫色
        comparing:"#f59e0b",     // 橙色
        swapping: "#ef4444",     // 红色
        sorted:   "#22c55e",     // 绿色
    };

    /**
     * 绘制带圆角顶部的矩形（兼容旧版浏览器）
     */
    function drawRoundedBar(ctx, x, y, w, h, r) {
        if (h < r) r = h;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
    }

    /**
     * 将一个 step 渲染到 canvas 上
     * @param {HTMLCanvasElement} canvas
     * @param {Object} step - 由 generateSteps 生成的单步快照
     */
    function renderStep(canvas, step) {
        const ctx = canvas.getContext("2d");
        const W = canvas.width;
        const H = canvas.height;

        ctx.clearRect(0, 0, W, H);

        const { arr, pivot, comparing, swapping, sorted } = step;
        const n = arr.length;
        if (n === 0) return;

        const maxVal = Math.max(...arr);

        // 布局常量
        const paddingX = 24;
        const paddingTop = 20;
        const paddingBottom = 40; // 留给底部索引文字
        const gap = Math.max(2, Math.floor(6 * (10 / n)));
        const totalGap = gap * (n - 1);
        const barW = Math.floor((W - paddingX * 2 - totalGap) / n);
        const chartH = H - paddingTop - paddingBottom;

        // 标记每根柱子的颜色
        const barColors = arr.map((_, i) => {
            if (swapping && (i === swapping[0] || i === swapping[1])) return COLORS.swapping;
            if (comparing !== null && i === comparing) return COLORS.comparing;
            if (pivot !== null && i === pivot) return COLORS.pivot;
            if (sorted.has(i)) return COLORS.sorted;
            return COLORS.default;
        });

        // 绘制分区范围底色
        if (step.range && step.pivot !== null) {
            const { low, high } = step.range;
            const rx = paddingX + low * (barW + gap) - 4;
            const rw = (high - low) * (barW + gap) + barW + 8;
            ctx.fillStyle = "rgba(255,255,255,0.025)";
            ctx.beginPath();
            ctx.roundRect
                ? ctx.roundRect(rx, paddingTop - 8, rw, chartH + 8, 6)
                : ctx.rect(rx, paddingTop - 8, rw, chartH + 8);
            ctx.fill();
        }

        // 逐根绘制柱子
        for (let i = 0; i < n; i++) {
            const val = arr[i];
            const barH = Math.max(4, Math.floor((val / maxVal) * chartH));
            const x = paddingX + i * (barW + gap);
            const y = paddingTop + (chartH - barH);

            // 填充色
            const color = barColors[i];
            if (color) {
                ctx.fillStyle = color;
            } else {
                // 默认蓝青渐变
                const grad = ctx.createLinearGradient(x, y, x, y + barH);
                grad.addColorStop(0, "#3b82f6");
                grad.addColorStop(1, "#06b6d4");
                ctx.fillStyle = grad;
            }

            drawRoundedBar(ctx, x, y, barW, barH, 3);

            // 数值标签（柱子上方）
            ctx.fillStyle = "#e6eef8";
            ctx.font = `${Math.max(10, Math.min(13, barW - 2))}px Consolas, monospace`;
            ctx.textAlign = "center";
            const label = String(val);
            ctx.fillText(label, x + barW / 2, y - 4);

            // 索引标签（底部）
            ctx.fillStyle = "#64748b";
            ctx.font = `10px Consolas, monospace`;
            ctx.fillText(String(i), x + barW / 2, H - paddingBottom + 14);
        }

        // 底部轴线
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
        // --- DOM 引用 ---
        const canvas       = Common.$("#qs-canvas");
        const stage        = Common.$("#qs-canvas-stage");
        const placeholder  = Common.$("#qs-placeholder");
        const inputEl      = Common.$("#qs-input");
        const inputError   = Common.$("#qs-input-error");
        const dataDisplay  = Common.$("#qs-data-display");
        const stepLog      = Common.$("#qs-step-log");
        const stepCounter  = Common.$("#qs-step-counter");
        const progressFill = Common.$("#qs-progress-fill");
        const speedSlider  = Common.$("#qs-speed");
        const speedLabel   = Common.$("#qs-speed-label");
        const selectEl     = Common.$("#qs-testcase-select");
        const testcaseDesc = Common.$("#qs-testcase-desc");

        const btnStart  = Common.$("#qs-start");
        const btnRandom = Common.$("#qs-random");
        const btnLoad   = Common.$("#qs-load-testcase");
        const btnPrev   = Common.$("#qs-btn-prev");
        const btnPlay   = Common.$("#qs-btn-play");
        const btnNext   = Common.$("#qs-btn-next");
        const btnReset  = Common.$("#qs-btn-reset");

        let steps = [];
        let isPlaying = false;
        let playTimer = null;

        // --- 将 canvas 尺寸同步到容器 ---
        function resizeCanvas() {
            canvas.width  = stage.clientWidth;
            canvas.height = stage.clientHeight;
        }

        // --- 获取当前播放速度（毫秒/步） ---
        // 滑块 1-10，映射到 1200ms - 120ms（反向：值越大越快）
        function getSpeedMs() {
            return Math.round(1200 - (Number(speedSlider.value) - 1) * (1080 / 9));
        }

        // --- 更新进度条与步骤计数器 ---
        function updateProgress(idx) {
            const total = steps.length;
            const pct = total > 1 ? (idx / (total - 1)) * 100 : 0;
            progressFill.style.width = pct + "%";
            stepCounter.textContent = `步骤 ${idx + 1} / ${total}`;
        }

        // --- 将步骤描述追加到日志 ---
        function appendLog(idx, desc) {
            // 如果是第一步则清空
            if (idx === 0) stepLog.innerHTML = "";
            const entry = Common.createElement("div", { class: "log-entry" });
            entry.innerHTML = `<span class="step-num">[${idx + 1}]</span>${desc}`;
            stepLog.appendChild(entry);
            stepLog.scrollTop = stepLog.scrollHeight;
        }

        // --- 渲染指定步骤 ---
        function showStep(idx) {
            if (idx < 0 || idx >= steps.length) return;
            resizeCanvas();
            renderStep(canvas, steps[idx]);
            updateProgress(idx);
            appendLog(idx, steps[idx].desc);
            btnPrev.disabled = (idx === 0);
            btnNext.disabled = (idx === steps.length - 1);
        }

        // --- 设置控件可用状态 ---
        function setControlsEnabled(enabled) {
            btnPrev.disabled  = !enabled;
            btnPlay.disabled  = !enabled;
            btnNext.disabled  = !enabled;
            btnReset.disabled = !enabled;
        }

        // --- 停止自动播放 ---
        function stopPlay() {
            isPlaying = false;
            clearTimeout(playTimer);
            btnPlay.textContent = "▶ 播放";
        }

        // --- StepManager 实例 ---
        const manager = new Common.StepManager({
            onStep: (step, idx) => {
                if (step === null) {
                    // reset 回调
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
                stopPlay();
            }
        });

        // --- 用一组 steps 初始化界面 ---
        function loadSteps(arr) {
            stopPlay();
            steps = generateSteps(arr);
            manager.setSteps(steps);

            // 清空日志
            stepLog.innerHTML = "";

            // 显示画布，隐藏占位
            placeholder.style.display = "none";
            resizeCanvas();
            showStep(0);
            manager.currentIndex = 0;

            setControlsEnabled(true);
            btnPrev.disabled = true; // 第一步时禁用"上一步"

            dataDisplay.textContent = `输入：[ ${arr.join(", ")} ]`;
        }

        // --- 解析并验证输入 ---
        function parseInput() {
            const raw = inputEl.value.trim();
            inputError.style.display = "none";

            if (!raw) {
                inputError.textContent = "请输入数组数据";
                inputError.style.display = "block";
                return null;
            }
            let arr;
            try {
                arr = Common.parseNumberArray(raw);
            } catch (e) {
                inputError.textContent = e.message;
                inputError.style.display = "block";
                return null;
            }
            if (arr.length < 2) {
                inputError.textContent = "至少需要 2 个数字";
                inputError.style.display = "block";
                return null;
            }
            if (arr.length > 20) {
                inputError.textContent = "最多支持 20 个数字（Canvas 显示限制）";
                inputError.style.display = "block";
                return null;
            }
            const invalid = arr.find(v => v < 1 || v > 99 || !Number.isInteger(v));
            if (invalid !== undefined) {
                inputError.textContent = "每个数字需为 1 - 99 的整数";
                inputError.style.display = "block";
                return null;
            }
            return arr;
        }

        // ── 事件绑定 ──

        // 「开始排序」
        btnStart.addEventListener("click", () => {
            const arr = parseInput();
            if (arr) loadSteps(arr);
        });

        // 「随机生成」
        btnRandom.addEventListener("click", () => {
            const arr = Common.randomIntegerArray(8, 1, 99);
            inputEl.value = arr.join(", ");
            loadSteps(arr);
        });

        // 「载入测试用例」
        btnLoad.addEventListener("click", () => {
            const tc = Common.getSelectedTestcase(selectEl, window.Testcases.quicksort);
            if (!tc) return;
            inputEl.value = tc.input.join(", ");
            loadSteps([...tc.input]);
        });

        // 测试用例下拉改变时更新描述
        selectEl.addEventListener("change", () => {
            const tc = Common.getSelectedTestcase(selectEl, window.Testcases.quicksort);
            testcaseDesc.textContent = tc ? tc.description : "";
        });

        // 「上一步」
        btnPrev.addEventListener("click", () => {
            stopPlay();
            manager.prev();
        });

        // 「下一步」
        btnNext.addEventListener("click", () => {
            stopPlay();
            manager.next();
        });

        // 「播放 / 暂停」
        btnPlay.addEventListener("click", () => {
            if (isPlaying) {
                stopPlay();
            } else {
                // 如果已经到最后一步，先重置到第一步
                if (manager.currentIndex >= steps.length - 1) {
                    manager.currentIndex = -1;
                }
                isPlaying = true;
                btnPlay.textContent = "⏸ 暂停";
                // 利用 StepManager 的 play 机制
                manager.play(getSpeedMs());
            }
        });

        // 「重置」
        btnReset.addEventListener("click", () => {
            stopPlay();
            stepLog.innerHTML = "";
            manager.currentIndex = -1;
            manager.onStep(steps[0], 0);
            manager.currentIndex = 0;
            btnPrev.disabled = true;
            btnNext.disabled = (steps.length <= 1);
        });

        // 速度滑块
        speedSlider.addEventListener("input", () => {
            speedLabel.textContent = speedSlider.value;
            if (isPlaying) {
                // 以新速度继续播放
                manager.pause();
                manager.play(getSpeedMs());
            }
        });

        // 进度条点击跳转
        Common.$("#qs-progress").addEventListener("click", (e) => {
            if (!steps.length) return;
            stopPlay();
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            const idx = Math.round(ratio * (steps.length - 1));
            manager.currentIndex = idx;
            showStep(idx);
        });

        // 输入框回车触发开始
        inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter") btnStart.click();
        });

        // 窗口大小改变时重新绘制
        window.addEventListener("resize", () => {
            if (steps.length && manager.currentIndex >= 0) {
                resizeCanvas();
                renderStep(canvas, steps[manager.currentIndex]);
            }
        });

        // --- 初始化测试用例下拉 ---
        Common.populateTestcaseSelect(
            selectEl,
            window.Testcases.quicksort,
            tc => tc.name
        );
        // 显示第一条用例的描述
        const firstTc = window.Testcases.quicksort[0];
        if (firstTc) testcaseDesc.textContent = firstTc.description;
    }

    // DOM 就绪后启动
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    return { generateSteps, renderStep };

})();
