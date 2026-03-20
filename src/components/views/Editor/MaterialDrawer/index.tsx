"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, ChevronDown, ChevronRight, PenTool, GitMerge, Briefcase, BadgeCheck, 
  Bot, Zap, Filter, Replace, SplitSquareHorizontal, Repeat, Globe, Webhook, 
  Code, FileJson, UserCheck, MessageSquare, Hash, PanelLeftClose, PanelLeftOpen,
  User, LayoutTemplate, Square, AppWindow, LayoutGrid, Clock, PlayCircle, Keyboard,
  ClipboardList, Cable 
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useUnitedStore } from '@/store/useUnitedStore';
import { 
  IAgentNode, IContainerNode, ITriggerNode, ITransformNode, IFlowNode, ICoreNode, IReviewNode, IConnectorNode 
} from '@/interface/material';

const parseAgentFrontmatter = (filename: string, rawMd: string): Partial<IAgentNode> => {
  let name = filename.replace('.md', '');
  let model = 'Qwen3.5 Plus'; 
  let iconName = 'Bot';
  let iconColor = ''; 
  let role: 'leader' | 'reviewer' | 'executor' = 'executor';
  let runtimeEnv = 'cli/opencode'; 

  const fmMatch = rawMd?.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const lines = fmMatch[1].split('\n');
    lines.forEach(line => {
      const colonIdx = line.indexOf(':');
      if (colonIdx > -1) {
        const k = line.slice(0, colonIdx).trim();
        const v = line.slice(colonIdx + 1).trim();
        if (k === 'name') name = v;
        if (k === 'model') model = v;
        if (k === 'iconName') iconName = v;
        if (k === 'iconColor' || k === 'color') iconColor = v;
        if (k === 'role') role = v as any;
        if (k === 'runtimeEnv') runtimeEnv = v;
      }
    });
  }
  return { 
    id: filename, type: 'member', title: name, model, iconName, iconColor, role, runtimeEnv 
  };
};

const ROLE_UI_CONFIG: Record<string, any> = {
  leader: { title: '编排类 (LEADER)', color: 'text-amber-500', hoverBorder: 'hover:border-amber-500', hoverText: 'group-hover/card:text-amber-500' },
  reviewer: { title: '审查类 (REVIEWER)', color: 'text-blue-500', hoverBorder: 'hover:border-blue-500', hoverText: 'group-hover/card:text-blue-500' },
  executor: { title: '执行类 (EXECUTOR)', color: 'text-emerald-500', hoverBorder: 'hover:border-emerald-500', hoverText: 'group-hover/card:text-emerald-500' }
};

const toolCategories = [
  {
    id: 'container', title: 'Container', desc: 'Group nodes and assign resources', icon: LayoutTemplate, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-500/10',
    items: [
      { id: 'container-rect', name: 'Rectangle', icon: Square, defaultParams: { containerParams: { isLocked: false, childrenIds: [] } } as Partial<IContainerNode> }, 
      { id: 'container-round', name: 'Rounded', icon: AppWindow, defaultParams: { containerParams: { isLocked: false, childrenIds: [] } } as Partial<IContainerNode> }, 
      { id: 'container-dash', name: 'Dashed', icon: LayoutGrid, defaultParams: { containerParams: { isLocked: false, childrenIds: [] } } as Partial<IContainerNode> }
    ]
  },
  // 🌟 新增：连接器分类
  {
    id: 'connection', title: 'Connection', desc: 'Data wires to connect nodes', icon: Cable, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    items: [
      { id: 'tool-connector', name: '数据线', icon: Cable, defaultParams: { connectorParams: { sourceId: null, targetId: null, startPos: {x:0, y:0}, endPos: {x:150, y:0} } } as Partial<IConnectorNode> }
    ]
  },
  {
    id: 'trigger', title: 'Trigger', desc: 'Start the workflow with an event', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10',
    items: [
      { id: 'tool-trigger-input', name: 'User Input', icon: Keyboard, defaultParams: { triggerParams: { mockPayload: '你好！请帮我分析一下当前的数据。' } } as Partial<ITriggerNode> }, 
      { id: 'tool-trigger-schedule', name: 'Schedule', icon: Clock, defaultParams: { triggerParams: { cronExpression: '0 0 * * *' } } as Partial<ITriggerNode> }, 
      { id: 'tool-trigger-webhook', name: 'Webhook', icon: Webhook, defaultParams: { triggerParams: { webhookUrl: '' } } as Partial<ITriggerNode> }, 
      { id: 'tool-trigger-manual', name: 'Manual', icon: PlayCircle, defaultParams: { triggerParams: {} } as Partial<ITriggerNode> }
    ]
  },
  {
    id: 'transform', title: 'Data transformation', desc: 'Manipulate, filter or convert data', icon: PenTool, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10',
    items: [
      { id: 'tool-filter', name: 'Filter', icon: Filter, defaultParams: { transformParams: { filterCondition: '' } } as Partial<ITransformNode> }, 
      { id: 'tool-map', name: 'Map', icon: Replace, defaultParams: { transformParams: { mappingRules: {} } } as Partial<ITransformNode> }, 
      { id: 'tool-json', name: 'JSON Parse', icon: FileJson, defaultParams: { transformParams: { jsonSchema: '{}' } } as Partial<ITransformNode> }
    ]
  },
  {
    id: 'flow', title: 'Flow', desc: 'Branch, merge or loop the flow, etc.', icon: GitMerge, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10',
    items: [
      { id: 'tool-if', name: 'If / Else', icon: SplitSquareHorizontal, defaultParams: { flowParams: { conditionScript: 'return true;' } } as Partial<IFlowNode> }, 
      { id: 'tool-switch', name: 'Switch', icon: GitMerge, defaultParams: { flowParams: { conditionScript: '' } } as Partial<IFlowNode> }, 
      { id: 'tool-loop', name: 'Loop', icon: Repeat, defaultParams: { flowParams: { maxLoops: 10 } } as Partial<IFlowNode> }
    ]
  },
  {
    id: 'core', title: 'Core', desc: 'Task center, run code, etc.', icon: Briefcase, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    items: [
      { id: 'tool-task-center', name: '任务中心', icon: ClipboardList, defaultParams: { coreParams: { autoDispatch: true, taskFilterStatus: 'pending' } } as Partial<ICoreNode> }, 
      { id: 'tool-http', name: 'HTTP Request', icon: Globe, defaultParams: { coreParams: { method: 'GET', requestUrl: '' } } as Partial<ICoreNode> }, 
      { id: 'tool-code', name: 'Run Code', icon: Code, defaultParams: { coreParams: { scriptContent: 'console.log("Hello World");' } } as Partial<ICoreNode> }
    ]
  },
  {
    id: 'review', title: 'Human review', desc: 'Request approval before tool calls', icon: BadgeCheck, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10',
    items: [
      { id: 'tool-wait', name: 'Wait Approval', icon: UserCheck, defaultParams: { reviewParams: { approverIds: [], timeoutMinutes: 60 } } as Partial<IReviewNode> }, 
      { id: 'tool-slack', name: 'Slack Notify', icon: Hash, defaultParams: { reviewParams: { notifyChannel: '#general' } } as Partial<IReviewNode> }, 
      { id: 'tool-tg', name: 'Telegram', icon: MessageSquare, defaultParams: { reviewParams: { notifyChannel: '@group' } } as Partial<IReviewNode> }
    ]
  }
];

export default function MaterialDrawer({ isOpen, onToggle, width = 280, setWidth, isCollapsed, setIsCollapsed }: any) {
  const { projects, selectedProjectId, agents, setAgents } = useUnitedStore();
  const project = projects.find(p => p.id === selectedProjectId);

  const humanUsers = project?.users || [];
  const projectAgentIds = project?.agentIds || [];
  const projectAgents = agents?.filter(a => projectAgentIds.includes(a.id)) || [];

  const [localIsCollapsed, setLocalIsCollapsed] = useState(false);
  const [localWidth, setLocalWidth] = useState(280);
  
  const _isCollapsed = isCollapsed !== undefined ? isCollapsed : localIsCollapsed;
  const _setIsCollapsed = setIsCollapsed || setLocalIsCollapsed;
  const _width = width !== undefined ? width : localWidth;
  const _setWidth = setWidth || setLocalWidth;

  const currentWidth = _isCollapsed ? 64 : _width;
  const isResizing = useRef(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAgentsFromDisk = async () => {
      if (typeof window !== 'undefined' && (window as any).electronAPI && (window as any).electronAPI.loadAgents) {
        const res = await (window as any).electronAPI.loadAgents();
        if (res && res.success && res.data.length > 0) {
          const parsedAgents = res.data.map((f: any) => parseAgentFrontmatter(f.file, f.content));
          if (setAgents) setAgents(parsedAgents);
        }
      }
    };
    fetchAgentsFromDisk();
  }, [setAgents]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (_isCollapsed) return; 
    e.preventDefault(); isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;
    let newWidth = e.clientX;
    if (newWidth < 220) newWidth = 220;
    if (newWidth > 600) newWidth = 600;
    _setWidth(newWidth);
  };
  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'default';
  };
  useEffect(() => {
    return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); document.body.style.cursor = 'default'; };
  }, []);

  const [flyoutContent, setFlyoutContent] = useState<React.ReactNode | null>(null);
  const [flyoutTop, setFlyoutTop] = useState(0);
  const hoverTimeout = useRef<NodeJS.Timeout>();
  const isDraggingRef = useRef(false);

  const openFlyout = (e: React.MouseEvent, content: React.ReactNode) => {
    clearTimeout(hoverTimeout.current);
    if (drawerRef.current) {
      const iconRect = e.currentTarget.getBoundingClientRect();
      const drawerRect = drawerRef.current.getBoundingClientRect();
      setFlyoutTop(iconRect.top - drawerRect.top);
    }
    setFlyoutContent(content);
  };

  const closeFlyout = () => {
    hoverTimeout.current = setTimeout(() => {
      if (!isDraggingRef.current) setFlyoutContent(null);
    }, 150); 
  };

  const keepFlyoutOpen = () => clearTimeout(hoverTimeout.current);

  const [sections, setSections] = useState<Record<string, boolean>>({
    humans: true, agents: true, connection: true, container: true, trigger: true, transform: false, flow: false, core: true, review: false,
  });
  const toggleSection = (sec: string) => setSections(prev => ({ ...prev, [sec]: !prev[sec] }));

  const onDragStart = (e: React.DragEvent, id: string, defaultParams?: Record<string, any>) => {
    e.dataTransfer.setData('text/plain', id);
    if (defaultParams) {
      e.dataTransfer.setData('application/json', JSON.stringify(defaultParams));
    }
    e.dataTransfer.effectAllowed = 'copy';
    isDraggingRef.current = true;
  };

  const onDragEnd = () => {
    isDraggingRef.current = false;
    setFlyoutContent(null); 
  };

  const renderAgentGroups = () => {
    const roles = ['leader', 'reviewer', 'executor'];
    return roles.map(role => {
      const agentsInRole = projectAgents.filter(a => (a.role || 'executor') === role);
      if (agentsInRole.length === 0) return null;
      const config = ROLE_UI_CONFIG[role];

      return (
        <div key={role} className="mb-3 last:mb-0">
          <div className={`text-[10px] font-bold ${config.color} mb-1.5 px-1 uppercase tracking-wider`}>
            {config.title}
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
            {agentsInRole.map(agent => {
              const AgentIcon = (Icons as any)[agent.iconName || 'Bot'] || Bot;
              return (
                <div 
                  key={agent.id} draggable 
                  onDragStart={(e) => onDragStart(e, agent.id, { 
                    role: agent.role, 
                    runtimeEnv: agent.runtimeEnv, 
                    model: agent.model, 
                    iconName: agent.iconName, 
                    iconColor: agent.iconColor || agent.color 
                  })} 
                  onDragEnd={onDragEnd}
                  className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 cursor-grab ${config.hoverBorder} shadow-sm transition-all group/card`}
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center text-white shrink-0 shadow-sm ${agent.iconColor || agent.color || 'bg-teal-500'}`}>
                    <AgentIcon size={14} />
                  </div>
                  <h4 className={`text-[11px] font-bold text-slate-700 dark:text-slate-300 w-full text-center truncate ${config.hoverText} px-1`}>
                    {agent.title || agent.name}
                  </h4>
                </div>
              )
            })}
          </div>
        </div>
      );
    });
  };

  const renderHumansFlyout = () => (
    <div className="w-[280px] bg-white dark:bg-slate-900 shadow-2xl rounded-xl border border-gray-200 dark:border-slate-700 p-4 animate-in fade-in zoom-in-95 duration-200">
      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Human Role</h4>
      <p className="text-[11px] text-slate-500 mb-3 border-b border-gray-100 dark:border-slate-800 pb-2">Drag to assign human interventions</p>
      <div className="grid grid-cols-2 gap-2">
        {humanUsers.length === 0 ? <div className="col-span-full text-center text-xs text-slate-400 py-2">No assigned humans</div> : humanUsers.map((human: any) => (
          <div 
            key={human.id} draggable 
            onDragStart={(e) => onDragStart(e, `human-${human.id}`, { 
              role: human.role, avatar: human.avatar, github: human.github, initials: human.initials, color: human.color 
            })} 
            onDragEnd={onDragEnd}
            className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-700 cursor-grab hover:border-indigo-400 transition-all group/card"
          >
            {human.avatar ? (
              <img src={human.avatar} alt={human.name} className="w-7 h-7 rounded-full object-cover shrink-0 shadow-sm" />
            ) : (
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm ${human.color || 'bg-slate-500'} text-[10px] font-bold`}>{human.initials}</div>
            )}
            <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 w-full text-center truncate group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 px-1">{human.name}</h4>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAgentsFlyout = () => (
    <div className="w-[300px] bg-white dark:bg-slate-900 shadow-2xl rounded-xl border border-gray-200 dark:border-slate-700 p-4 animate-in fade-in zoom-in-95 duration-200">
      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Project Agents</h4>
      <p className="text-[11px] text-slate-500 mb-3 border-b border-gray-100 dark:border-slate-800 pb-2">Available agents in this project</p>
      {projectAgents.length === 0 ? <div className="text-center text-xs text-slate-400 py-2">No assigned agents</div> : renderAgentGroups()}
    </div>
  );

  const renderCategoryFlyout = (cat: any) => (
    <div className="w-[320px] bg-white dark:bg-slate-900 shadow-2xl rounded-xl border border-gray-200 dark:border-slate-700 p-4 animate-in fade-in zoom-in-95 duration-200">
      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">{cat.title}</h4>
      <p className="text-[11px] text-slate-500 mb-3 border-b border-gray-100 dark:border-slate-800 pb-2">{cat.desc}</p>
      <div className="grid grid-cols-3 gap-2">
        {cat.items.map((item: any) => {
          const ItemIcon = item.icon;
          return (
            <div 
              key={item.id} draggable 
              onDragStart={(e) => onDragStart(e, item.id, item.defaultParams)} 
              onDragEnd={onDragEnd}
              className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 cursor-grab hover:border-indigo-400 dark:hover:border-indigo-500 transition-all group/card"
            >
              <div className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${cat.bg} ${cat.color} group-hover/card:bg-indigo-50 dark:group-hover/card:bg-indigo-500/20 group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400`}><ItemIcon size={14} strokeWidth={2} /></div>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 w-full text-center truncate group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 px-1">{item.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div 
      ref={drawerRef}
      style={{ width: `${currentWidth}px`, transform: isOpen ? 'translateX(0)' : `translateX(-${currentWidth}px)`, transitionDuration: isResizing.current ? '0ms' : '300ms', transitionProperty: 'width, transform' }}
      className="no-canvas-pan absolute left-0 top-0 bottom-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-gray-200 dark:border-slate-800 flex flex-col shadow-2xl sm:shadow-none"
    >
      {_isCollapsed && flyoutContent && (
        <div className="absolute left-[64px] z-[100] pl-2" style={{ top: flyoutTop }} onMouseEnter={keepFlyoutOpen} onMouseLeave={closeFlyout}>
          {flyoutContent}
        </div>
      )}
      {!_isCollapsed && (
        <div onMouseDown={handleMouseDown} className="absolute top-0 -right-1.5 bottom-0 w-3 cursor-col-resize z-[60] flex items-center justify-center group">
          <div className="w-[3px] h-12 rounded-full bg-transparent group-hover:bg-indigo-400 dark:group-hover:bg-indigo-500 transition-colors" />
        </div>
      )}
      <div className={`p-4 border-b border-gray-100 dark:border-slate-800/60 shrink-0 flex items-center ${_isCollapsed ? 'justify-center px-2' : 'justify-between'} bg-slate-50/50 dark:bg-slate-950/50 transition-all z-10`}>
        {!_isCollapsed && <h2 className="font-black text-sm tracking-wide text-slate-800 dark:text-slate-100 flex items-center gap-2 whitespace-nowrap overflow-hidden"><Zap size={16} className="text-indigo-500 shrink-0" /> 素材箱</h2>}
        <button onClick={() => _setIsCollapsed(!_isCollapsed)} title={_isCollapsed ? "展开素材箱" : "收缩为侧边栏"} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors shrink-0">
          {_isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {_isCollapsed ? (
        <div className="flex flex-col items-center py-4 gap-4 flex-1 w-full overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div className="relative w-full flex justify-center cursor-pointer">
            <div onMouseEnter={(e) => openFlyout(e, renderHumansFlyout())} onMouseLeave={closeFlyout} className="p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-indigo-500 dark:text-indigo-400"><User size={22} strokeWidth={1.5} /></div>
          </div>
          <div className="relative w-full flex justify-center cursor-pointer">
            <div onMouseEnter={(e) => openFlyout(e, renderAgentsFlyout())} onMouseLeave={closeFlyout} className="p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-teal-500 dark:text-teal-400"><Bot size={22} strokeWidth={1.5} /></div>
          </div>
          <div className="w-8 h-px bg-gray-200 dark:bg-slate-800 my-1 shrink-0" />
          {toolCategories.map(cat => {
            const Icon = cat.icon;
            return (
              <div key={cat.id} className="relative w-full flex justify-center cursor-pointer">
                <div onMouseEnter={(e) => openFlyout(e, renderCategoryFlyout(cat))} onMouseLeave={closeFlyout} className={`p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${cat.color}`}><Icon size={22} strokeWidth={1.5} /></div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0"> 
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pb-6 select-none">
            
            <div className="border-b border-gray-100 dark:border-slate-800/50">
              <button onClick={() => toggleSection('humans')} className="w-full flex items-start gap-3 p-3 hover:bg-slate-50 dark:bg-slate-950/20 dark:hover:bg-slate-800/50 transition-colors text-left group">
                <div className="mt-0.5 text-indigo-500 dark:text-indigo-400"><User size={18} strokeWidth={1.5} /></div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">Human Role</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-1 pr-2">Project team members</p>
                </div>
                <div className="mt-1">{sections.humans ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}</div>
              </button>
              {sections.humans && (
                <div className="px-3 pb-4 pt-1 animate-in slide-in-from-top-2 duration-200 grid grid-cols-2 gap-2">
                  {humanUsers.length === 0 ? (
                    <div className="col-span-full text-center text-xs text-slate-400 py-2">No assigned humans</div>
                  ) : (
                    humanUsers.map((human: any) => (
                      <div 
                        key={human.id} draggable 
                        onDragStart={(e) => onDragStart(e, `human-${human.id}`, { 
                          role: human.role, avatar: human.avatar, github: human.github, initials: human.initials, color: human.color 
                        })} 
                        onDragEnd={onDragEnd}
                        className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 cursor-grab hover:border-indigo-400 transition-all shadow-sm hover:shadow group/card"
                      >
                        {human.avatar ? (
                          <img src={human.avatar} alt={human.name} className="w-7 h-7 rounded-full object-cover shrink-0 shadow-sm" />
                        ) : (
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm ${human.color || 'bg-slate-500'} text-[10px] font-bold`}>{human.initials}</div>
                        )}
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 w-full text-center truncate group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 px-1">{human.name}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="border-b border-gray-100 dark:border-slate-800/50">
              <button onClick={() => toggleSection('agents')} className="w-full flex items-start gap-3 p-3 hover:bg-slate-50 dark:bg-slate-950/20 dark:hover:bg-slate-800/50 transition-colors text-left group">
                <div className="mt-0.5 text-teal-500 dark:text-teal-400"><Bot size={18} strokeWidth={1.5} /></div>
                <div className="flex-1 min-w-0"><h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">Project Agents</h4><p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-1 pr-2">Assigned autonomous agents</p></div>
                <div className="mt-1">{sections.agents ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}</div>
              </button>
              {sections.agents && (
                <div className="px-3 pb-4 pt-1 animate-in slide-in-from-top-2 duration-200">
                  {projectAgents.length === 0 ? <div className="text-center text-xs text-slate-400 py-2">No assigned agents</div> : renderAgentGroups()}
                </div>
              )}
            </div>
            
            {toolCategories.map(cat => {
              const Icon = cat.icon;
              return (
                <div key={cat.id} className="border-b border-gray-100 dark:border-slate-800/50">
                  <button onClick={() => toggleSection(cat.id)} className="w-full flex items-start gap-3 p-3 hover:bg-slate-50 dark:bg-slate-950/20 dark:hover:bg-slate-800/50 transition-colors text-left group">
                    <div className={`mt-0.5 ${cat.color} transition-colors`}><Icon size={18} strokeWidth={1.5} /></div>
                    <div className="flex-1 min-w-0"><h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">{cat.title}</h4><p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-1 pr-2">{cat.desc}</p></div>
                    <div className="mt-1">{sections[cat.id] ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}</div>
                  </button>
                  {sections[cat.id] && (
                    <div className="grid gap-2 px-3 pb-4 pt-1 animate-in slide-in-from-top-2 duration-200" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
                      {cat.items.map(item => {
                        const ItemIcon = item.icon;
                        return (
                          <div 
                            key={item.id} draggable 
                            onDragStart={(e) => onDragStart(e, item.id, item.defaultParams)} 
                            onDragEnd={onDragEnd}
                            className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-grab hover:border-indigo-400 dark:hover:border-indigo-500 transition-all shadow-sm hover:shadow group/card"
                          >
                            <div className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${cat.bg} ${cat.color} group-hover/card:bg-indigo-50 dark:group-hover/card:bg-indigo-500/20 group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400`}><ItemIcon size={14} strokeWidth={2} /></div>
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 w-full text-center truncate group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 px-1">{item.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}