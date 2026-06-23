"use strict";

/**
 * 所有算法的预置测试用例
 * 由各模块共同维护，通过 window.Testcases 全局访问
 */
window.Testcases = {

    /* 快速排序：3 条测试用例 */
    quicksort: [
        {
            name: "随机整数数组",
            input: [7, 2, 9, 4, 3, 8, 1, 5],
            description: "8个随机整数，演示快速排序的基础分区和递归过程。"
        },
        {
            name: "包含重复元素",
            input: [5, 3, 8, 3, 9, 1, 3, 2],
            description: "含多个重复值 (3)，用于验证 Lomuto 分区对重复元素的处理。"
        },
        {
            name: "逆序数组",
            input: [10, 9, 8, 7, 6, 5],
            description: "完全逆序输入，展示快速排序在接近最坏情况时的划分过程。"
        }
    ],

    /* Dijkstra：2 条测试用例 */
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

    /* 汉诺塔：2 条测试用例 */
    hanoi: [
        {
            name: "3 个盘子",
            disks: 3,
            description: "经典汉诺塔，演示盘子从起始柱到目标柱的移动过程，共 7 步。"
        },
        {
            name: "4 个盘子",
            disks: 4,
            description: "增加盘子数量，展示递归深度和步数增长（共 15 步）。"
        }
    ]
};
