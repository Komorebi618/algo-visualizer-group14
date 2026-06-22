window.Testcases = {
    quicksort: [
        {
            name: "随机整数数组",
            input: [7, 2, 9, 4, 3, 8, 1, 5],
            description: "快速排序演示用随机整数数组。"
        },
        {
            name: "包含重复值",
            input: [5, 3, 8, 3, 9, 1, 3, 2],
            description: "用于验证快速排序在重复元素情况下的稳定性和交换过程。"
        },
        {
            name: "逆序数组",
            input: [10, 9, 8, 7, 6, 5],
            description: "演示快速排序在逆序输入时的划分和递归过程。"
        }
    ],
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
            description: "稀疏图用于测试 Dijkstra 算法在不同拓扑结构下的路径发现。"
        }
    ],
    hanoi: [
        {
            name: "3 个盘子",
            disks: 3,
            description: "经典汉诺塔问题，演示盘子从起始柱到目标柱的移动过程。"
        },
        {
            name: "4 个盘子",
            disks: 4,
            description: "增加盘子数量，展示递归深度和移动步数增长。"
        }
    ]
};
