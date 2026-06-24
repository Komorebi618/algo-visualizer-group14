"use strict";

/**
 * 全局预置测试用例
 *
 * 通过 window.Testcases 暴露，各算法页面的 JS 模块直接读取对应的子数组。
 * 维护规则：
 *   - 每种算法至少保留 2 条用例（满足课设要求：项目总用例不少于 6 条）
 *   - 新增用例直接 push 到对应数组即可，无需修改算法代码
 *   - quicksort.input / hanoi.disks 等字段名需与对应 JS 模块的读取方式保持一致
 */
window.Testcases = {

    /* ── 快速排序：3 条测试用例 ── */
    quicksort: [
        {
            name: "随机整数数组",
            input: [7, 2, 9, 4, 3, 8, 1, 5],
            // 覆盖基础分区逻辑：无重复、无极端顺序
            description: "8个随机整数，演示快速排序的基础分区和递归过程。"
        },
        {
            name: "包含重复元素",
            input: [5, 3, 8, 3, 9, 1, 3, 2],
            // Lomuto 分区对重复元素使用 <= 判断，相等元素会被划入左区
            description: "含多个重复值 (3)，用于验证 Lomuto 分区对重复元素的处理。"
        },
        {
            name: "逆序数组",
            input: [10, 9, 8, 7, 6, 5],
            // 逆序时每次 pivot（末位最小值）分区后左区为空，递归深度达到 n-1，
            // 接近 O(n²) 最坏情况，步骤数明显多于随机输入
            description: "完全逆序输入，展示快速排序在接近最坏情况时的划分过程。"
        }
    ],

    /* ── Dijkstra 最短路径：2 条测试用例 ── */
    dijkstra: [
        {
            name: "小型有向图",
            nodes: ["A", "B", "C", "D", "E"],
            edges: [
                { from: "A", to: "B", weight: 2 },
                { from: "A", to: "C", weight: 5 },
                { from: "B", to: "C", weight: 1 },
                { from: "B", to: "D", weight: 4 },
                { from: "C", to: "E", weight: 3 },
                { from: "D", to: "E", weight: 1 }
            ],
            source: "A",
            target: "E",
            description: "经典 Dijkstra 最短路径示例，演示逐步更新最短距离。"
        },
        {
            name: "稀疏图",
            nodes: ["S", "T", "U", "V", "W", "X"],
            edges: [
                { from: "S", to: "T", weight: 3 },
                { from: "S", to: "U", weight: 1 },
                { from: "T", to: "V", weight: 6 },
                { from: "U", to: "V", weight: 2 },
                { from: "U", to: "W", weight: 4 },
                { from: "V", to: "X", weight: 1 }
            ],
            source: "S",
            target: "X",
            description: "稀疏图结构，测试 Dijkstra 算法在不同拓扑下的路径发现。"
        }
    ],

    /* ── 汉诺塔：4 条测试用例 ── */
    hanoi: [
        {
            name: "1 个盘子",
            disks: 1,
            // 移动次数 = 2^1 - 1 = 1 步
            description: "边界：最小规模，单盘直接从 A 柱移动到 C 柱，仅 1 步。"
        },
        {
            name: "3 个盘子",
            disks: 3,
            // 移动次数 = 2^3 - 1 = 7 步
            description: "经典汉诺塔，演示盘子从起始柱到目标柱的移动过程，共 7 步。"
        },
        {
            name: "4 个盘子",
            disks: 4,
            // 移动次数 = 2^4 - 1 = 15 步，体现指数级增长
            description: "增加盘子数量，展示递归深度和步数增长（共 15 步）。"
        },
        {
            name: "6 个盘子",
            disks: 6,
            // 移动次数 = 2^6 - 1 = 63 步
            description: "规模：观察 2^n - 1 步指数增长，共 63 步，递归深度明显加深。"
        }
    ]
};
