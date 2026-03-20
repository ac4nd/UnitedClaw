export const initialProjects = [
  {
    id: 'proj-1',
    name: 'Agent 编程工作流定义',
    desc: '核心协同开发项目组',
    status: 'running',
    members: [
      { id: 'm1', name: 'J (You)', role: '总负责人', type: 'human', iconName: 'User', color: 'bg-indigo-600', desc: '负责项目全局把控。' },
      { id: 'm2', name: 'Alpha Orchestrator', role: '管理类: 编排机器人', tier: 'T1', type: 'agent-t1', iconName: 'Network', color: 'bg-purple-600', desc: '负责与人类沟通需求，拆解任务，指定执行方向。', context: '继承: [项目总目标: 开发下一代协同设计工具]' },
      { id: 'm3', name: 'UI/UX Reviewer', role: '评审类: 设计监察', tier: 'T2', type: 'agent-t2', iconName: 'Eye', color: 'bg-orange-500', desc: '审查设计执行结果。', context: '继承: [目标受众: 极客; 风格: 极简蜂巢]', criteria: '1. 色彩对比度达标 2. 包含蜂巢元素' },
      { id: 'm4', name: 'Canvas Vision AI', role: '执行类: 设计智能体', tier: 'T3', type: 'agent-t3', iconName: 'PenTool', color: 'bg-teal-500', desc: '负责具体的UI图纸生成。' },
      { id: 'm5', name: 'Code QA Bot', role: '评审类: 代码监察', tier: 'T2', type: 'agent-t2', iconName: 'ShieldCheck', color: 'bg-orange-500', desc: '审查代码逻辑。', criteria: '1. 无重复类名 2. 适配暗黑模式' },
      { id: 'm6', name: 'React Coder', role: '执行类: 编程智能体', tier: 'T3', type: 'agent-t3', iconName: 'Code', color: 'bg-teal-500', desc: '编写组件代码。' }
    ]
  },
  {
    id: 'proj-2',
    name: '法律合规 Agent 训练',
    desc: '法务审查模型微调',
    status: 'idle',
    members: [
      { id: 'm7', name: 'L (Lawyer)', role: '法务总监', type: 'human', iconName: 'User', color: 'bg-slate-700' },
      { id: 'm8', name: 'Legal Orchestrator', role: '管理类: 合规编排', tier: 'T1', type: 'agent-t1', iconName: 'Network', color: 'bg-purple-600' }
    ]
  }
];

export const dashboardData = [
  {
    name: 'Agent 编程工作流定义',
    progress: 65,
    status: '进行中',
    statusColor: 'bg-orange-400',
    admin: { name: 'J', color: 'bg-indigo-600' },
    members: [{ name: 'O', color: 'bg-purple-600' }, { name: 'R', color: 'bg-teal-500' }]
  },
  {
    name: '法律合规 Agent 训练',
    progress: 100,
    status: '已完成',
    statusColor: 'bg-green-500',
    admin: { name: 'L', color: 'bg-slate-700' },
    members: [{ name: 'E', color: 'bg-teal-400' }]
  },
];