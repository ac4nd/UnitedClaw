"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, Plus, Crown, ShieldCheck, Zap, Bot, Trash2,
  Settings, Type, Cpu, Palette, Image as ImageIcon,
  FileCode2, ListPlus, MinusCircle, Download, Save, AlertTriangle, RefreshCw, Box, ChevronDown, Upload, CheckCircle2
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useUnitedStore } from '@/store/useUnitedStore';

const AGENT_ROLES = [
  { id: 'leader', name: '领导类 (Leader)', desc: '负责编排任务，标记任务完成', icon: Crown, color: 'text-amber-500', border: 'border-amber-200 dark:border-amber-500/30', bg: 'bg-amber-50 dark:bg-amber-500/10', defaultColor: 'bg-amber-500' },
  { id: 'reviewer', name: '审查类 (Reviewer)', desc: '负责检查执行类执行结果是否正确', icon: ShieldCheck, color: 'text-blue-500', border: 'border-blue-200 dark:border-blue-500/30', bg: 'bg-blue-50 dark:bg-blue-500/10', defaultColor: 'bg-blue-500' },
  { id: 'executor', name: '执行类 (Executor)', desc: '负责完成具体任务功能', icon: Zap, color: 'text-emerald-500', border: 'border-emerald-200 dark:border-emerald-500/30', bg: 'bg-emerald-50 dark:bg-emerald-500/10', defaultColor: 'bg-emerald-500' },
];

const COLORS = ['bg-amber-500', 'bg-blue-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-teal-500', 'bg-rose-500', 'bg-pink-500', 'bg-purple-500', 'bg-slate-800'];
const ICONS = ['Bot', 'BrainCircuit', 'Cpu', 'Sparkles', 'Terminal', 'Fingerprint', 'ScanFace', 'Radar', 'Network'];

const DEFAULT_METADATA = [
  { id: 'm1', key: 'description', value: '' }
];

const DEFAULT_CONTENT = [
  { id: 'c1', title: 'Brief', value: '定义角色，描述作用' },
  { id: 'c2', title: 'Purpose', value: '' },
  { id: 'c3', title: 'Capabilities', value: '' },
  { id: 'c4', title: 'Knowledge Base', value: '' },
  { id: 'c5', title: 'Response Approach', value: '' },
  { id: 'c6', title: 'Example Interactions', value: '' }
];

const parseAgentMarkdown = (filename: string, rawMd: string) => {
  const frontmatterMatch = rawMd.match(/^---\n([\s\S]*?)\n---/);
  let name = filename.replace('.md', '');
  // 🌟 修改：状态初始化更换为 iconColor
  let role = 'executor'; let model = 'GPT-4o'; let iconName = 'Bot'; let iconColor = ''; let runtimeEnv = 'cloud';
  const metadata: any[] = [];

  if (frontmatterMatch) {
    const lines = frontmatterMatch[1].split('\n');
    lines.forEach((line, idx) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx > -1) {
        const k = line.slice(0, colonIdx).trim();
        const v = line.slice(colonIdx + 1).trim();
        if (k === 'name') name = v;
        else if (k === 'role') role = v;
        else if (k === 'model') model = v;
        else if (k === 'iconName') iconName = v;
        // 🌟 修改：兼容读取 iconColor，如果旧文件是 color 也照样读取
        else if (k === 'iconColor' || k === 'color') iconColor = v;
        else if (k === 'runtimeEnv') runtimeEnv = v; 
        else if (k) metadata.push({ id: `m-${Date.now()}-${idx}`, key: k, value: v });
      }
    });
  }

  ['description'].forEach((dk, i) => {
    if (!metadata.find(m => m.key === dk)) metadata.push({ id: `m-def-${Date.now()}-${i}`, key: dk, value: '' });
  });

  if (!iconColor) {
    const roleObj = AGENT_ROLES.find(r => r.id === role) || AGENT_ROLES[2];
    iconColor = roleObj.defaultColor;
  }

  const body = rawMd.replace(/^---\n[\s\S]*?\n---/, '').trim();
  const content: any[] = [];
  const sectionRegex = /##\s+([^\n]+)\n([\s\S]*?)(?=(?:\n##\s+|$))/g;
  let match; let cIdx = 0;
  
  while ((match = sectionRegex.exec(body)) !== null) {
    content.push({ id: `c-${Date.now()}-${cIdx++}`, title: match[1].trim(), value: match[2].trim() });
  }
  if (content.length === 0) {
    DEFAULT_CONTENT.forEach((dc, i) => content.push({ ...dc, id: `c-def-${Date.now()}-${i}` }));
  }

  return { id: filename, name, role, model, iconName, iconColor, runtimeEnv, metadata, content };
};

export default function AgentBuilder() {
  const localRuntimeEnv = useUnitedStore((state: any) => state.localRuntimeEnv);
  const setLocalRuntimeEnv = useUnitedStore((state: any) => state.setLocalRuntimeEnv);
  const setAgentsStore = useUnitedStore((state: any) => state.setAgents);

  const builderRef = useRef<HTMLDivElement>(null);
  
  const [localAgents, setLocalAgents] = useState<any[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [agentSyncStatus, setAgentSyncStatus] = useState<Record<string, { existsInUnitedClaw: boolean; existsInOpenCode: boolean }>>({});

  const [isDirty, setIsDirty] = useState(false);
  const [unsavedModal, setUnsavedModal] = useState<{ isOpen: boolean; pendingAction?: () => void }>({ isOpen: false });
  const [isScanning, setIsScanning] = useState(false);

  const runtimeOptions = useMemo(() => {
    const options = [{ id: 'cloud', name: '☁️ 默认云端环境 (Cloud)' }];
    
    if (localRuntimeEnv?.runtime?.cli?.['coding-tool']) {
      Object.keys(localRuntimeEnv.runtime.cli['coding-tool']).forEach((toolName) => {
        options.push({ id: `cli/${toolName}`, name: `💻 本地 CLI: ${toolName}` });
      });
    }
    return options;
  }, [localRuntimeEnv]);

  const groupedModels = useMemo(() => {
    const activeRuntime = localAgents.find(a => a.id === selectedAgentId)?.runtimeEnv || 'cloud';

    if (activeRuntime.startsWith('cli/')) {
      const toolName = activeRuntime.replace('cli/', '');
      const tool = localRuntimeEnv?.runtime?.cli?.['coding-tool']?.[toolName];
      
      if (tool && tool.models && Array.isArray(tool.models)) {
        const providers = tool.models[0]?.provider;
        if (providers) return providers;
      }
    }
    return {};
  }, [localRuntimeEnv, localAgents, selectedAgentId]);

  const fetchLocalAgents = async (preserveSelectedId?: string) => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const res = await (window as any).electronAPI.loadAgents();
      if (res.success) {
        const loadedAgents = res.data.map((fileData: any) => parseAgentMarkdown(fileData.file, fileData.content));
        setLocalAgents(loadedAgents);
        if (setAgentsStore) setAgentsStore(loadedAgents);

        if (preserveSelectedId) {
          setSelectedAgentId(preserveSelectedId);
        } else if (loadedAgents.length > 0 && (!selectedAgentId || !loadedAgents.find((a:any) => a.id === selectedAgentId))) {
          setSelectedAgentId(loadedAgents[0].id);
        }
        setIsDirty(false);
      }
    }
  };

  const checkAgentSyncStatus = async () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const res = await (window as any).electronAPI.checkAgentSyncStatus();
      if (res.success && res.data) {
        setAgentSyncStatus(res.data);
      }
    }
  };

  const handleRefreshConfig = async () => {
    setIsScanning(true);
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const res = await (window as any).electronAPI.readConfig();
      if (res.success && res.data) {
        setLocalRuntimeEnv(res.data);
      }
    }
    setTimeout(() => setIsScanning(false), 800);
  };

  useEffect(() => {
    fetchLocalAgents();
    handleRefreshConfig();
    checkAgentSyncStatus();
  }, []);

  const activeAgent = localAgents.find(a => a.id === selectedAgentId) || null;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };

    const handleGlobalClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.unsaved-modal-overlay')) return; 
      
      if (isDirty && builderRef.current && !builderRef.current.contains(e.target as Node)) {
        e.preventDefault();
        e.stopPropagation();
        setUnsavedModal({
          isOpen: true,
          pendingAction: () => {
            fetchLocalAgents().then(() => setIsDirty(false)); 
          }
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleGlobalClick, true); 

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, [isDirty]);

  const handleSelectAgent = (targetId: string) => {
    if (isDirty && activeAgent?.id !== targetId) {
      setUnsavedModal({
        isOpen: true,
        pendingAction: () => {
          fetchLocalAgents(targetId); 
        }
      });
    } else {
      setSelectedAgentId(targetId);
    }
  };

  const handleAddAgent = () => {
    if (isDirty) {
      setUnsavedModal({
        isOpen: true,
        pendingAction: () => createDraftAgent()
      });
    } else {
      createDraftAgent();
    }
  };

  const createDraftAgent = () => {
    const draftId = `draft-${Date.now()}.md`;
    // 🌟 修改：创建时赋值 iconColor
    const newAgent = {
      id: draftId, name: 'New_Agent', role: 'executor', runtimeEnv: 'cloud', model: 'GPT-4o', iconName: 'Bot', iconColor: 'bg-emerald-500',
      metadata: [...DEFAULT_METADATA.map(m => ({...m, id: `m-${Date.now()}-${Math.random()}`}))],
      content: [...DEFAULT_CONTENT.map(c => ({...c, id: `c-${Date.now()}-${Math.random()}`}))]
    };
    setLocalAgents([...localAgents, newAgent]);
    setSelectedAgentId(newAgent.id);
    setIsDirty(true); 
  };

  const handleUpdateActiveAgent = (updates: any) => {
    if (!activeAgent) return;
    setLocalAgents(localAgents.map(a => a.id === activeAgent.id ? { ...a, ...updates } : a));
    setIsDirty(true); 
  };

  const handleDeleteAgent = async () => {
    if (!activeAgent) return;
    if (!activeAgent.id.startsWith('draft-') && typeof window !== 'undefined' && (window as any).electronAPI) {
      await (window as any).electronAPI.deleteAgentFile(activeAgent.id);
    }
    fetchLocalAgents(); 
  };

  const handleImportMarkdown = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const parsedData = parseAgentMarkdown(file.name, text);

        if (!activeAgent) {
          const newAgent = {
            ...parsedData,
            id: `draft-${Date.now()}.md`,
            metadata: parsedData.metadata.map((m: any) => ({ ...m, id: `m-${Date.now()}-${Math.random()}` })),
            content: parsedData.content.map((c: any) => ({ ...c, id: `c-${Date.now()}-${Math.random()}` }))
          };
          setLocalAgents([...localAgents, newAgent]);
          setSelectedAgentId(newAgent.id);
        } else {
          const mergedMetadata = [...activeAgent.metadata];
          parsedData.metadata.forEach((newMeta: any) => {
            const existingIndex = mergedMetadata.findIndex((m: any) => m.key === newMeta.key);
            if (existingIndex >= 0) {
              mergedMetadata[existingIndex] = { ...mergedMetadata[existingIndex], value: newMeta.value };
            } else {
              mergedMetadata.push({ ...newMeta, id: `m-${Date.now()}-${Math.random()}` });
            }
          });

          const mergedContent = [...activeAgent.content];
          parsedData.content.forEach((newContent: any) => {
            const existingIndex = mergedContent.findIndex((c: any) => c.title === newContent.title);
            if (existingIndex >= 0) {
              mergedContent[existingIndex] = { ...mergedContent[existingIndex], value: newContent.value };
            } else {
              mergedContent.push({ ...newContent, id: `c-${Date.now()}-${Math.random()}` });
            }
          });

          handleUpdateActiveAgent({
            name: parsedData.name,
            role: parsedData.role,
            model: parsedData.model,
            iconName: parsedData.iconName,
            iconColor: parsedData.iconColor,
            runtimeEnv: parsedData.runtimeEnv,
            metadata: mergedMetadata,
            content: mergedContent
          });
        }
        setIsDirty(true);
      } catch (error) {
        console.error('导入失败:', error);
        alert('导入失败，请检查文件格式');
      }
    };
    input.click();
  };

  const updateListField = (field: 'metadata' | 'content', id: string, key: string, value: string) => {
    const list = activeAgent[field] || [];
    handleUpdateActiveAgent({ [field]: list.map((item: any) => item.id === id ? { ...item, [key]: value } : item) });
  };
  const addListField = (field: 'metadata' | 'content') => {
    const list = activeAgent[field] || [];
    const newItem = field === 'metadata' ? { id: `m-${Date.now()}`, key: `custom_key_${list.length + 1}`, value: '' } : { id: `c-${Date.now()}`, title: `Custom_Section_${list.length + 1}`, value: '' };
    handleUpdateActiveAgent({ [field]: [...list, newItem] });
  };
  const removeListField = (field: 'metadata' | 'content', id: string) => {
    handleUpdateActiveAgent({ [field]: (activeAgent[field] || []).filter((item: any) => item.id !== id) });
  };

  const handleSaveMarkdown = async () => {
    if (!activeAgent) return;

    let md = `---\nname: ${activeAgent.name}\n`;
    if (activeAgent.runtimeEnv) md += `runtimeEnv: ${activeAgent.runtimeEnv}\n`; 
    if (activeAgent.model) md += `model: ${activeAgent.model}\n`;
    md += `role: ${activeAgent.role || 'executor'}\n`;
    if (activeAgent.iconName) md += `iconName: ${activeAgent.iconName}\n`;
    // 🌟 修改：持久化保存时字段名为 iconColor
    if (activeAgent.iconColor) md += `iconColor: ${activeAgent.iconColor}\n`;

    (activeAgent.metadata || []).forEach((m: any) => {
      // 🌟 修改：过滤掉 color 和 iconColor 防止重复写入
      if (m.key.trim() && !['name','model','role','iconName','iconColor','color','runtimeEnv'].includes(m.key)) md += `${m.key}: ${m.value}\n`;
    });
    md += `---\n\n`;

    (activeAgent.content || []).forEach((c: any) => {
      if (c.title.trim()) md += `## ${c.title}\n${c.value || ''}\n\n`;
    });

    const fileName = activeAgent.id.startsWith('draft-') ? `${activeAgent.name.replace(/\s+/g, '_')}.md` : activeAgent.id;

    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const res = await (window as any).electronAPI.saveAgentFile(fileName, md);
      if (res.success) {
        setIsDirty(false); 
        fetchLocalAgents(fileName); 
      } else {
        alert(`❌ 保存失败: ${res.msg}`);
      }
    }
  };

  return (
    <div ref={builderRef} className="flex flex-1 h-full overflow-hidden bg-white dark:bg-slate-950 animate-in fade-in duration-300 relative">
      
      {/* ======================= 左侧：分类列表区 ======================= */}
      <div className="w-80 flex flex-col border-r border-gray-200 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/20 shrink-0">
        <div className="p-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Bot size={20} className="text-indigo-500" /> Agent Library
          </h2>
          <button onClick={handleAddAgent} className="p-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-500 transition-colors shadow-sm">
            <Plus size={16} />
          </button>
        </div>

        <div className="p-3">
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input type="text" placeholder="搜索智能体..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors text-slate-700 dark:text-slate-200 shadow-sm" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4 space-y-6 mt-2">
          {AGENT_ROLES.map(role => {
            const RoleIcon = role.icon;
            const groupAgents = localAgents.filter(a => ((a.role || 'executor') === role.id) && (a.name.toLowerCase().includes(searchQuery.toLowerCase())));
            return (
              <div key={role.id} className="space-y-2">
                <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2 pl-2"><RoleIcon size={14} className={role.color} /> {role.name} ({groupAgents.length})</h3>
                <div className="space-y-1">
                  {groupAgents.length === 0 ? (
                    <div className="text-xs text-slate-400 pl-8 py-2 italic opacity-60">暂无该类智能体</div>
                  ) : (
                    groupAgents.map(agent => {
                      const isActive = activeAgent?.id === agent.id;
                      const AgentIcon = (Icons as any)[agent.iconName || 'Bot'] || Bot;
                      const syncStatus = agentSyncStatus[agent.id];
                      return (
                        <div
                          key={agent.id}
                          onClick={() => handleSelectAgent(agent.id)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border ${isActive ? `bg-white dark:bg-slate-800 shadow-sm ${role.border}` : 'border-transparent hover:bg-gray-100/50 dark:hover:bg-slate-800/50'}`}
                        >
                          {/* 🌟 修改：列表中的颜色绑定 iconColor */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0 ${agent.iconColor || role.defaultColor}`}><AgentIcon size={16} /></div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-bold text-sm truncate flex items-center gap-2 ${isActive ? role.color : 'text-slate-700 dark:text-slate-200'}`}>
                              {agent.name} {agent.id.startsWith('draft-') && <span className="text-[9px] px-1 bg-amber-100 text-amber-600 rounded">Draft</span>}
                              {/* 同步状态指示器 */}
                              {!agent.id.startsWith('draft-') && agentSyncStatus && agentSyncStatus[agent.id] && (
                                agentSyncStatus[agent.id].existsInOpenCode ? (
                                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                ) : (
                                  <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                                )
                              )}
                            </h4>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">{agent.model || 'GPT-4o'}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================= 右侧：Markdown 编辑器形态 ======================= */}
      {activeAgent ? (
        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar bg-white dark:bg-[#121212]">
          <div className="px-10 pt-10 pb-6 border-b border-gray-100 dark:border-slate-800/60 bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-900/20 dark:to-[#121212] flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  {AGENT_ROLES.find(r => r.id === (activeAgent.role || 'executor'))?.name.split(' ')[0] || 'AGENT'}
                </span>
                <span className="text-xs font-mono text-slate-400">File: {activeAgent.id}</span>
                {/* 脏状态视觉提示 */}
                {isDirty && <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"/> 未保存修改</span>}
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                {activeAgent.name} 
              </h1>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleImportMarkdown} 
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm font-bold transition-colors"
              >
                <Upload size={16} /> 导入
              </button>
              <button 
                onClick={handleSaveMarkdown} 
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-colors shadow-md ${isDirty ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                disabled={!isDirty}
              >
                <Save size={16} /> 保存配置
              </button>
              <button onClick={handleDeleteAgent} className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-bold transition-colors">
                <Trash2 size={16} /> 删除
              </button>
            </div>
          </div>

          <div className="p-10 max-w-4xl space-y-10">
            <section className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2"><Settings size={16} className="text-indigo-500"/> Core Settings</h3>
                
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2"><Type size={14}/> name (标识名)</label>
                  <input type="text" value={activeAgent.name} onChange={(e) => handleUpdateActiveAgent({ name: e.target.value })} className="w-full bg-slate-50 dark:bg-[#2a2b30] border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:text-white font-mono" />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2">
                      <Box size={14}/> runtimeEnv (运行环境)
                    </label>
                    <select 
                      value={activeAgent.runtimeEnv || 'cloud'} 
                      onChange={(e) => handleUpdateActiveAgent({ runtimeEnv: e.target.value, model: '' })} 
                      className="w-full bg-slate-50 dark:bg-[#2a2b30] border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:text-white cursor-pointer font-mono"
                    >
                      {runtimeOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                    </select>
                  </div>

                  {activeAgent.runtimeEnv && activeAgent.runtimeEnv.startsWith('cli/') && (
                    <div className="flex-1 animate-in fade-in zoom-in-95 duration-200">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-2">
                        <span className="flex items-center gap-2"><Cpu size={14}/> model (驱动模型)</span>
                        <button onClick={handleRefreshConfig} className={`flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-600 transition-colors ${isScanning ? 'opacity-50 pointer-events-none' : ''}`}>
                          <RefreshCw size={10} className={isScanning ? 'animate-spin' : ''} /> 刷新配置
                        </button>
                      </label>
                      
                      {Object.keys(groupedModels).length > 0 ? (
                        <div className="relative">
                          <select 
                            value={activeAgent.model || ''} 
                            onChange={(e) => handleUpdateActiveAgent({ model: e.target.value })} 
                            className="w-full bg-slate-50 dark:bg-[#2a2b30] border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 pr-8 text-sm outline-none focus:border-indigo-500 dark:text-white cursor-pointer font-mono appearance-none"
                          >
                            <option value="" disabled>请选择对应厂商模型</option>
                            {Object.entries(groupedModels).map(([providerKey, providerData]: [string, any]) => {
                              const modelsObj = providerData.models || {};
                              const modelEntries = Object.entries(modelsObj);
                              if (modelEntries.length === 0) return null;

                              return (
                                <optgroup key={providerKey} label={providerData.name || providerKey} className="font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800">
                                  {modelEntries.map(([modelKey, modelInfo]: [string, any]) => {
                                    const combinedValue = `${providerKey}/${modelKey}`;
                                    return (
                                      <option key={combinedValue} value={combinedValue} className="font-normal text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900">
                                        {modelInfo.name || modelKey}
                                      </option>
                                    );
                                  })}
                                </optgroup>
                              );
                            })}
                          </select>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronDown size={14} />
                          </div>
                          {activeAgent.model && (
                            <p className="text-[10px] text-slate-400 mt-1.5 font-mono">
                              Payload: <span className="text-indigo-500 dark:text-indigo-400 font-bold">{activeAgent.model}</span>
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="w-full bg-slate-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400 italic font-mono flex items-center justify-center">
                          未扫描到有效配置
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2"><Crown size={14}/> role (职责分类)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {AGENT_ROLES.map(role => {
                      const isActive = (activeAgent.role || 'executor') === role.id;
                      return (
                        <button 
                          key={role.id} 
                          // 🌟 修改：连带更新 iconColor
                          onClick={() => handleUpdateActiveAgent({ role: role.id, iconColor: role.defaultColor })} 
                          className={`py-1.5 px-2 rounded-md text-xs font-bold transition-all border ${isActive ? `${role.bg} ${role.color} ${role.border}` : 'bg-slate-50 dark:bg-[#2a2b30] text-slate-500 border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}>
                          {role.name.split(' ')[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2"><Palette size={16} className="text-indigo-500"/> Visual Interface</h3>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2"><ImageIcon size={14}/> Icon</label>
                  <div className="flex flex-wrap gap-2">
                    {ICONS.map(iconName => {
                      const IconComp = (Icons as any)[iconName];
                      const isSelected = (activeAgent.iconName || 'Bot') === iconName;
                      return <button key={iconName} onClick={() => handleUpdateActiveAgent({ iconName })} className={`p-2 rounded-lg border-2 transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-500' : 'border-gray-200 dark:border-slate-700 hover:border-indigo-300 text-slate-500 dark:text-slate-400 dark:bg-[#2a2b30]'}`}><IconComp size={18} /></button>
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2"><Palette size={14}/> Theme Color</label>
                  <div className="flex flex-wrap gap-2">
                    {/* 🌟 修改：颜色列表绑定 iconColor 字段 */}
                    {COLORS.map(c => (
                      <button 
                        key={c} 
                        onClick={() => handleUpdateActiveAgent({ iconColor: c })} 
                        className={`w-8 h-8 rounded-full ${c} border-2 transition-all hover:scale-110 ${activeAgent.iconColor === c ? 'border-slate-900 dark:border-white scale-110 shadow-md' : 'border-transparent'}`} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <div className="w-full h-px bg-gray-200 dark:bg-slate-800" />

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2"><FileCode2 size={16} className="text-emerald-500"/> YAML Metadata (Frontmatter)</h3>
                <button onClick={() => addListField('metadata')} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"><Plus size={12}/> 添加属性</button>
              </div>
              <div className="bg-slate-50 dark:bg-[#1a1b1e] border border-gray-200 dark:border-slate-800 rounded-xl p-4 font-mono text-sm shadow-inner space-y-3">
                <div className="text-slate-400 select-none">---</div>
                <div className="flex gap-4 opacity-50 select-none"><div className="w-32 text-emerald-600 dark:text-emerald-400">name:</div><div className="flex-1 text-slate-700 dark:text-slate-300">{activeAgent.name}</div></div>
                <div className="flex gap-4 opacity-50 select-none"><div className="w-32 text-emerald-600 dark:text-emerald-400">runtimeEnv:</div><div className="flex-1 text-slate-700 dark:text-slate-300">{activeAgent.runtimeEnv || 'cloud'}</div></div>
                
                <div className="flex gap-4 opacity-50 select-none"><div className="w-32 text-emerald-600 dark:text-emerald-400">model:</div><div className="flex-1 text-slate-700 dark:text-slate-300">{activeAgent.model || '未选择'}</div></div>
                <div className="flex gap-4 opacity-50 select-none"><div className="w-32 text-emerald-600 dark:text-emerald-400">role:</div><div className="flex-1 text-slate-700 dark:text-slate-300">{activeAgent.role || 'executor'}</div></div>
                {/* 可视化反馈：展示 iconColor */}
                <div className="flex gap-4 opacity-50 select-none"><div className="w-32 text-emerald-600 dark:text-emerald-400">iconColor:</div><div className="flex-1 text-slate-700 dark:text-slate-300">{activeAgent.iconColor || '未选择'}</div></div>
                
                {(activeAgent.metadata || []).map((meta: any) => (
                  <div key={meta.id} className="flex gap-2 items-start group">
                    <input value={meta.key} onChange={(e) => updateListField('metadata', meta.id, 'key', e.target.value)} placeholder="key" className="w-32 bg-transparent border-b border-transparent focus:border-emerald-500 outline-none text-emerald-600 dark:text-emerald-400 placeholder-emerald-700/30 transition-colors" />
                    <span className="text-slate-400">:</span>
                    <input value={meta.value} onChange={(e) => updateListField('metadata', meta.id, 'value', e.target.value)} placeholder="value..." className="flex-1 bg-transparent border-b border-transparent focus:border-slate-400 outline-none text-slate-700 dark:text-slate-300 placeholder-slate-500/50 transition-colors" />
                    <button onClick={() => removeListField('metadata', meta.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><MinusCircle size={14} /></button>
                  </div>
                ))}
                <div className="text-slate-400 select-none">---</div>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2"><ListPlus size={16} className="text-sky-500"/> Markdown Content Sections</h3>
                <button onClick={() => addListField('content')} className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"><Plus size={12}/> 添加 Section (##)</button>
              </div>

              <div className="space-y-6">
                {(activeAgent.content || []).map((section: any) => (
                  <div key={section.id} className="bg-slate-50 dark:bg-[#1a1b1e] border border-gray-200 dark:border-slate-800 rounded-xl p-4 shadow-sm group">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sky-500 font-black font-mono select-none">##</span>
                      <input value={section.title} onChange={(e) => updateListField('content', section.id, 'title', e.target.value)} placeholder="Section Title" className="flex-1 bg-transparent text-sm font-bold outline-none text-slate-800 dark:text-slate-100 border-b border-transparent focus:border-sky-500 transition-colors" />
                      <button onClick={() => removeListField('content', section.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                    </div>
                    <textarea value={section.value} onChange={(e) => updateListField('content', section.id, 'value', e.target.value)} placeholder={`Enter content for ${section.title || 'this section'}...`} className="w-full h-32 bg-white dark:bg-[#2a2b30] border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-sky-500 dark:text-slate-300 custom-scrollbar leading-relaxed resize-y font-mono" />
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#121212] opacity-50">
          <Bot size={64} className="text-slate-300 dark:text-slate-700 mb-4" />
        </div>
      )}

      {/* ================= 🌟 未保存警告弹窗 ================= */}
      {unsavedModal.isOpen && (
        <div className="unsaved-modal-overlay absolute inset-0 z-[200] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-[400px] bg-white dark:bg-[#222327] border border-gray-200 dark:border-[#3b3c40] rounded-xl shadow-2xl flex flex-col p-6 animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" /> 未保存的更改
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              当前智能体 <span className="font-bold">({activeAgent?.name || '草稿'})</span> 有尚未保存的修改。如果切换页面，这些修改将会丢失。您要保存吗？
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setUnsavedModal({ isOpen: false })}
                className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setUnsavedModal({ isOpen: false });
                  if (unsavedModal.pendingAction) unsavedModal.pendingAction();
                }}
                className="px-4 py-2 text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-colors"
              >
                放弃更改
              </button>
              <button
                onClick={async () => {
                  await handleSaveMarkdown();
                  setUnsavedModal({ isOpen: false });
                  if (unsavedModal.pendingAction) unsavedModal.pendingAction();
                }}
                className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-md shadow-indigo-500/20"
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}