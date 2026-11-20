import type { CaptionLine } from "../components/Captions";

/**
 * 全片字幕，时间轴与 TransitionSeries 的绝对帧号一致。
 * 场景起点（含 12 帧转场重叠）：
 * hook 0 · foundation 318 · auth 1026 · files 1974
 * ai 2742 · agent-ops 4110 · delivery 5148 · outro 5700
 */
export const captions: CaptionLine[] = [
  { from: 30, to: 130, text: "一个能直接写业务的全栈模板" },
  { from: 150, to: 262, text: "从克隆到可开发，几周压到一小时" },

  {
    from: 360,
    to: 480,
    text: "Next.js 16 全栈底座，App Router + React Compiler",
  },
  {
    from: 490,
    to: 620,
    text: "PostgreSQL、Prisma、RustFS、Qdrant，全部本地部署",
  },
  { from: 630, to: 760, text: "一条命令完成装依赖、迁移、种子数据" },
  { from: 770, to: 900, text: "新项目从 0 到可开发，目标一小时内" },

  { from: 1050, to: 1170, text: "Logto SSO + 本地会话，双层鉴权" },
  {
    from: 1180,
    to: 1330,
    text: "中间件只做 token 形态乐观校验，避免每请求打库",
  },
  { from: 1340, to: 1470, text: "权威校验下沉服务端组件，React cache 去重" },
  {
    from: 1480,
    to: 1620,
    text: "细粒度 RBAC 与 action guard 覆盖全部受保护路由",
  },
  { from: 1630, to: 1900, text: "角色、权限、路由守卫，全部可视化可审计" },

  { from: 2000, to: 2130, text: "文件走预签名直传，应用不代理字节流" },
  { from: 2140, to: 2290, text: "虚拟文件夹 + 软删除，权限跟着上传者走" },
  {
    from: 2300,
    to: 2450,
    text: "PDF、Word、Excel、PPT、代码、Mermaid 直接预览",
  },
  { from: 2460, to: 2700, text: "Office 文档可切 OnlyOffice 在线编辑" },

  { from: 2760, to: 2900, text: "供应商、模型、能力开关都在后台配置" },
  { from: 2910, to: 3060, text: "对话模型与向量模型分开管理，密钥只落库" },
  { from: 3070, to: 3160, text: "catalog 接口只返回启用中的模型" },
  { from: 3180, to: 3330, text: "LangGraph 编排，SSE 流式输出" },
  { from: 3340, to: 3490, text: "消息边生成边落库，模型快照与用量留痕" },
  { from: 3500, to: 3620, text: "一次请求：start → delta → usage → done" },
  { from: 3640, to: 3780, text: "RAG 把文件切块进 Qdrant，回答带引用来源" },
  { from: 3790, to: 3940, text: "向量维度与 collection 绑定，边界明确" },
  { from: 3950, to: 4100, text: "智能体绑定知识库，按角色授权使用" },

  { from: 4130, to: 4250, text: "skills-lock 锁住 AI Skills 的来源与哈希" },
  { from: 4260, to: 4390, text: "团队行为一致，提示词不再漂移" },
  { from: 4400, to: 4560, text: "auto-continue 让长任务自动续跑" },
  { from: 4570, to: 4800, text: "按会话开关、随时可中断，执行留痕可审计" },
  { from: 4810, to: 4940, text: "飞书机器人：检测到分支提交就自动总结改动" },
  { from: 4950, to: 5060, text: "无头浏览器截图回推群聊，客户直接看" },
  { from: 5070, to: 5150, text: "需求文本写回开发者主机，闭环回到代码" },

  { from: 5170, to: 5330, text: "GitHub Actions 构建、迁移、上传、刷新 CDN" },
  {
    from: 5340,
    to: 5500,
    text: "COS + CDN 全球加速，发布从 18 分钟降到 10 秒内",
  },
  { from: 5510, to: 5680, text: "构建与分发解耦，产物直接分发到边缘" },

  { from: 5720, to: 5840, text: "认证、数据、文件、AI、发布，一套工程约束" },
  { from: 5850, to: 5980, text: "从克隆到上线，一条可复现的路径" },
];
