import { create } from 'zustand';
import { initialProjects } from '@/lib/mock-data';

// 默认的 Agent 模板数据 (仅作兜底)
const defaultAgents = [
  {
    id: 'agent-1',
    iconName: 'Bot',
    iconColor: 'bg-purple-600',
    name: 'Alpha Orchestrator',
    description: '负责与人类沟通需求，拆解任务，指定执行方向。',
    model: 'gemini-2.5-pro',
    sections: [
      { title: 'Brief', content: '作为核心编排节点，负责全局上下文的理解与任务分发。' },
      { title: 'Purpose', content: '解析人类自然语言，将其转化为标准的子 Agent 任务队列。' },
      { title: 'Capabilities', content: '- 意图识别\n- 任务拆解\n- 路由分发' }
    ]
  }
];

interface UnitedState {
  // ================= 🌟 团队/项目管理 =================
  projects: any[];
  setProjects: (projects: any[]) => void;
  selectedProjectId: string;
  setProject: (id: string) => void;

  // ================= 🌟 登录与用户状态 =================
  currentUser: { username: string; avatarUrl?: string; provider: string } | null;
  isLoginModalOpen: boolean;
  setCurrentUser: (user: { username: string; avatarUrl?: string; provider: string } | null) => void;
  setLoginModalOpen: (isOpen: boolean) => void;

  // ================= 🌟 画布相关 =================
  zoom: number;
  setZoom: (updater: (prev: number) => number) => void;
  canvasNodes: any[];
  addNode: (node: any) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  removeNode: (id: string) => void;
  selectedCanvasNodeId: string | null;
  setSelectedNode: (id: string | null) => void;
  connections: any[];
  addConnection: (conn: any) => void;
  removeConnection: (id: string) => void;
  updateConnectionConfig: (id: string, newConfig: any) => void;
  drawingConnection: any | null;
  setDrawingConnection: (conn: any | null) => void;
  activeConnector: any | null;
  setActiveConnector: (connector: any | null) => void;
  clearCanvas: () => void;

  // ================= 🌟 智能体库 =================
  agents: any[]; // 放宽类型限制，允许存入真实解析的 Agent 列表
  setAgents: (agents: any[]) => void; // 🌟 核心新增：允许外部更新全局 Agent 列表
  selectedAgentId: string;
  addAgent: (agent: any) => void;
  removeAgent: (id: string) => void;
  updateAgent: (id: string, agent: any) => void;
  setAgentProject: (id: string) => void;

  // ================= 🌟 全局设置与环境 =================
  isSettingsOpen: boolean;
  setSettingsOpen: (isOpen: boolean) => void;
  localRuntimeEnv: any;
  setLocalRuntimeEnv: (env: any) => void;
}

export const useUnitedStore = create<UnitedState>((set) => ({
  // --- 团队/项目管理实现 ---
  projects: initialProjects,
  setProjects: (projects) => set({ projects }),
  selectedProjectId: initialProjects[0]?.id || '',
  setProject: (id) => set({ selectedProjectId: id }),

  // --- 登录与用户状态实现 ---
  currentUser: null,
  isLoginModalOpen: false,
  setCurrentUser: (user) => set({ currentUser: user }),
  setLoginModalOpen: (isOpen) => set({ isLoginModalOpen: isOpen }),

  // --- 画布相关实现 ---
  zoom: 1,
  setZoom: (updater) => set((state) => ({ zoom: updater(state.zoom) })),
  canvasNodes: [],
  addNode: (node) => set((state) => ({ canvasNodes: [...state.canvasNodes, node] })),
  updateNodePosition: (id, x, y) => set((state) => ({
    canvasNodes: state.canvasNodes.map(n => n.canvasId === id ? { ...n, posX: x, posY: y } : n)
  })),
  removeNode: (id) => set((state) => ({
    canvasNodes: state.canvasNodes.filter(n => n.canvasId !== id),
    connections: state.connections.filter(c => c.fromNode !== id && c.toNode !== id),
    selectedCanvasNodeId: state.selectedCanvasNodeId === id ? null : state.selectedCanvasNodeId
  })),
  selectedCanvasNodeId: null,
  setSelectedNode: (id) => set({ selectedCanvasNodeId: id }),
  connections: [],
  addConnection: (conn) => set((state) => ({ connections: [...state.connections, conn] })),
  removeConnection: (id) => set((state) => ({ connections: state.connections.filter(c => c.id !== id) })),
  updateConnectionConfig: (id, newConfig) => set((state) => ({
    connections: state.connections.map(c => 
      c.id === id ? { ...c, config: { ...c.config, ...newConfig } } : c
    )
  })),
  drawingConnection: null,
  setDrawingConnection: (conn) => set({ drawingConnection: conn }),
  activeConnector: null,
  setActiveConnector: (connector) => set({ activeConnector: connector }),
  clearCanvas: () => set({ canvasNodes: [], connections: [], drawingConnection: null, activeConnector: null, selectedCanvasNodeId: null }),

  // --- 智能体库实现 ---
  agents: defaultAgents,
  setAgents: (agents) => set({ agents }), // 🌟 允许更新
  selectedAgentId: defaultAgents[0].id,
  addAgent: (agent) => set((state) => ({ agents: [...state.agents, agent], selectedAgentId: agent.id })),
  removeAgent: (id) => set((state) => {
    const newAgents = state.agents.filter(a => a.id !== id);
    const newSelectedId = state.selectedAgentId === id 
      ? (newAgents.length > 0 ? newAgents[0].id : '') 
      : state.selectedAgentId;
    return { agents: newAgents, selectedAgentId: newSelectedId };
  }),
  updateAgent: (id, updatedAgent) => set((state) => ({
    agents: state.agents.map(a => a.id === id ? { ...a, ...updatedAgent } : a)
  })),
  setAgentProject: (id) => set({ selectedAgentId: id }),

  // --- 全局设置与环境实现 ---
  isSettingsOpen: false,
  setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
  localRuntimeEnv: null,
  setLocalRuntimeEnv: (env) => set({ localRuntimeEnv: env }),
}));