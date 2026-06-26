"use strict";

const Common = (() => {
    const $ = selector => document.querySelector(selector);
    const $$ = selector => Array.from(document.querySelectorAll(selector));

    const createElement = (tag, attributes = {}, text = "") => {
        const element = document.createElement(tag);
        Object.entries(attributes).forEach(([name, value]) => {
            if (value === null || value === undefined) return;
            if (name === "class") {
                element.className = value;
            } else if (name === "dataset") {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else {
                element.setAttribute(name, value);
            }
        });
        if (text) element.textContent = text;
        return element;
    };

    const clearChildren = element => {
        if (!element) return;
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    };

    const addEvent = (target, eventName, handler) => {
        const element = typeof target === "string" ? $(target) : target;
        if (!element) return;
        element.addEventListener(eventName, handler);
        return element;
    };

    const formatNumberArray = numbers => {
        if (!Array.isArray(numbers)) return "";
        return numbers.join(", ");
    };

    const parseNumberArray = rawInput => {
        if (typeof rawInput !== "string") {
            throw new TypeError("输入必须是字符串格式的数组数据，例如 3, 1, 4, 1");
        }
        const cleaned = rawInput.trim().replace(/，/g, ",").replace(/\s+/g, ",");
        if (!cleaned) return [];
        const items = cleaned.split(/[,;]+/).map(item => item.trim()).filter(Boolean);
        const numbers = items.map(value => {
            const number = Number(value);
            if (Number.isNaN(number)) {
                throw new Error(`无效数字：${value}`);
            }
            return number;
        });
        return numbers;
    };

    const randomIntegerArray = (length = 8, min = 1, max = 99) => {
        const size = Math.max(1, Math.floor(length));
        const result = [];
        for (let i = 0; i < size; i += 1) {
            result.push(Math.floor(Math.random() * (max - min + 1)) + min);
        }
        return result;
    };

    const randomGraph = ({ nodeCount = 6, edgeProbability = 0.4, minWeight = 1, maxWeight = 9 } = {}) => {
        const nodes = Array.from({ length: nodeCount }, (_, index) => `N${index + 1}`);
        const edges = [];
        for (let i = 0; i < nodeCount; i += 1) {
            for (let j = i + 1; j < nodeCount; j += 1) {
                if (Math.random() < edgeProbability) {
                    const weight = Math.floor(Math.random() * (maxWeight - minWeight + 1)) + minWeight;
                    edges.push({ from: nodes[i], to: nodes[j], weight });
                    edges.push({ from: nodes[j], to: nodes[i], weight });
                }
            }
        }
        return { nodes, edges };
    };

    const cloneMatrix = matrix => {
        if (!Array.isArray(matrix)) return [];
        return matrix.map(row => (Array.isArray(row) ? [...row] : row));
    };

    const deepClone = value => JSON.parse(JSON.stringify(value));

    const createMessageArea = (container, type, message) => {
        clearChildren(container);
        const messageElement = createElement("div", { class: `common-message common-message-${type}` }, message);
        container.appendChild(messageElement);
        return messageElement;
    };

    const showInfo = (selector, message) => {
        const container = $(selector);
        if (!container) return;
        createMessageArea(container, "info", message);
    };

    const showError = (selector, message) => {
        const container = $(selector);
        if (!container) return;
        createMessageArea(container, "error", message);
    };

    /**
     * 在页面右下角弹出 Toast 提示，3.5s 后自动消失。
     * 三个算法页面统一的浮层错误/提示入口。
     * @param {string} message 提示文案
     * @param {'error'|'info'|'success'} [type='info']
     * @param {number} [duration=3500] 自动消失毫秒数，传 0 表示不自动消失
     */
    const showToast = (message, type = 'info', duration = 3500) => {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            // 左上角浮层（避开顶部 site-header 的高度）
            Object.assign(container.style, {
                position: 'fixed', top: '96px', left: '24px',
                display: 'flex', flexDirection: 'column', gap: '8px',
                zIndex: '9999', pointerEvents: 'none',
                maxWidth: 'min(360px, calc(100vw - 48px))',
            });
            document.body.appendChild(container);
        }
        const safeType = type === 'error' || type === 'success' ? type : 'info';
        const el = document.createElement('div');
        el.className = `toast toast-${safeType}`;
        el.style.pointerEvents = 'auto';
        el.textContent = message;
        container.appendChild(el);
        if (duration > 0) setTimeout(() => el.remove(), duration);
        return el;
    };

    class StepManager {
        constructor({ onStep = () => {}, onPlayEnd = () => {} } = {}) {
            this.steps = [];
            this.currentIndex = -1;
            this.timer = null;
            this.isPlaying = false;
            this.onStep = onStep;
            this.onPlayEnd = onPlayEnd;
            this.speed = 500;
        }

        addStep(step) {
            this.steps.push(step);
        }

        setSteps(steps) {
            this.steps = Array.isArray(steps) ? [...steps] : [];
            this.currentIndex = -1;
        }

        getCurrentStep() {
            if (this.currentIndex < 0 || this.currentIndex >= this.steps.length) return null;
            return this.steps[this.currentIndex];
        }

        next() {
            if (this.currentIndex < this.steps.length - 1) {
                this.currentIndex += 1;
                this.onStep(this.getCurrentStep(), this.currentIndex);
            }
            return this.getCurrentStep();
        }

        prev() {
            if (this.currentIndex > 0) {
                this.currentIndex -= 1;
                this.onStep(this.getCurrentStep(), this.currentIndex);
            }
            return this.getCurrentStep();
        }

        reset() {
            this.pause();
            this.currentIndex = -1;
            this.onStep(null, this.currentIndex);
        }

        play(speed = 500) {
            if (this.isPlaying) return;
            this.speed = Math.max(50, speed);
            this.isPlaying = true;
            this._advance();
        }

        pause() {
            this.isPlaying = false;
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }
        }

        _advance() {
            if (!this.isPlaying) return;
            const nextStep = this.next();
            if (!nextStep) {
                this.isPlaying = false;
                this.onPlayEnd();
                return;
            }
            this.timer = setTimeout(() => this._advance(), this.speed);
        }
    }

    const populateTestcaseSelect = (selectElement, cases = [], formatter = item => item.name || "测试用例") => {
        if (typeof selectElement === "string") {
            selectElement = $(selectElement);
        }
        if (!selectElement) return;
        clearChildren(selectElement);
        cases.forEach((testcase, index) => {
            const option = createElement("option", { value: index }, formatter(testcase));
            selectElement.appendChild(option);
        });
    };

    const getSelectedTestcase = (selectElement, cases = []) => {
        if (typeof selectElement === "string") {
            selectElement = $(selectElement);
        }
        if (!selectElement) return null;
        const index = Number(selectElement.value);
        return cases[index] || null;
    };

    const initAlgorithmPage = ({ title, description, complexity, canvasId, controlContainerId, testcases = [] } = {}) => {
        const pageTitle = $(".page-title");
        const descriptionContainer = $(".page-description");
        const complexityContainer = $(".page-complexity");
        if (pageTitle) pageTitle.textContent = title || "算法可视化";
        if (descriptionContainer) descriptionContainer.textContent = description || "请在页面中选择测试用例并开始算法演示。";
        if (complexityContainer) complexityContainer.textContent = complexity || "时间复杂度、空间复杂度信息将在此显示。";
        return {
            canvasElement: $(canvasId),
            controlContainer: $(controlContainerId),
            testcases,
        };
    };

    return {
        $, $$,
        createElement,
        clearChildren,
        addEvent,
        parseNumberArray,
        formatNumberArray,
        randomIntegerArray,
        randomGraph,
        cloneMatrix,
        deepClone,
        showInfo,
        showError,
        showToast,
        StepManager,
        populateTestcaseSelect,
        getSelectedTestcase,
        initAlgorithmPage,
    };
})();

window.Common = Common;
