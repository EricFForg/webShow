window.ASSETS = {
  models: [{ name: "3D 模型", path: "models/model2.glb" }],
  structureAnalysis: {
    name: "结构概念图",
    groups: [
      {
        name: "气囊层",
        items: [
          { name: "气囊结构示意图", path: "images/1.png", desc: "气囊结构示意图：上层为记忆棉，中层为 14D 海绵，下层为 30D 海绵。" },
          { name: "气囊工艺示意图", path: "images/2.png", desc: "气囊工艺示意图：先将 14D 海绵与下方弹力布热熔，再将气囊上方的弹力布热熔贴合，最后使用模具上侧墙压制成型。" },
        ],
      },
      {
        name: "内套",
        items: [
          { name: "内套结构示意图", path: "images/3.png", desc: "内套结构示意图：内套在用户拆掉外套时提供临时保护，采用透气性强的网孔面料，上下拉链方便拆装；中间拉链在电路故障时可轻松找到气泵。" },
          { name: "内套完成图", path: "images/5.png", desc: "内套完成图：侧边海绵打孔位置需预留走线口，采用类似口袋的工艺处理。" },
        ],
      },
      {
        name: "外套",
        items: [
          { name: "外套示意图", path: "images/6.png", desc: "外套示意图：外层采用单层床垫针织面料，克重 400g 以上，一般为粘胶纤维或纯棉；床头撞色区分床头与床尾，拉链开在底部，配合滴塑布防止床垫在床板上滑动。" },
        ],
      },
      {
        name: "电控系统",
        items: [
          { name: "电路走线示意图", path: "images/7.png", desc: "电路走线示意图：采用单气泵，利用换向阀切换充气/抽气，利用多路阀控制单个气囊的充气量。气囊内部孔除降低海绵软硬度外，还可防止局部过热——气泵工作时压缩气体易导致气囊升温。" },
        ],
      },
      {
        name: "外观",
        items: [
          { name: "外观参考图", path: "images/image.png", desc: "外观参考图：产品整体外观效果参考。" },
        ],
      },
    ],
  },
};

// 兼容旧逻辑：扁平图片列表
window.ASSETS.images = window.ASSETS.structureAnalysis.groups.flatMap((g) => g.items);
