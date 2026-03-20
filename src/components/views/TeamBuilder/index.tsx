"use client";

import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { 
  FolderKanban, Plus, MoreVertical, Users, CheckCircle2, 
  Circle, Clock, Shield, ShieldAlert, ShieldCheck, X, UserPlus, Search,
  Bot, Network, FileText, CheckSquare, Save, RefreshCw, Github, Edit3
} from 'lucide-react';
import { useUnitedStore } from '@/store/useUnitedStore';

// === 核心 1：项目 Markdown 解析与序列化引擎 ===
const parseProjectMd = (rawMd: string) => {
  let name = '';
  let users: any[] = [];
  let agentIds: string[] = [];
  let description = '这是一个自动同步的本地协同空间。您可以在这里绑定智能体、编写文档并管理团队任务。';

  const fmMatch = rawMd?.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const fm = fmMatch[1];
    const nameMatch = fm.match(/^name:\s*(.+)$/m);
    if (nameMatch) name = nameMatch[1].trim();

    const usersMatch = fm.match(/^users:\s*(.+)$/m);
    if (usersMatch) { try { users = JSON.parse(usersMatch[1]); } catch(e) {} }

    const agentsMatch = fm.match(/^agentIds:\s*(.+)$/m);
    if (agentsMatch) { try { agentIds = JSON.parse(agentsMatch[1]); } catch(e) {} }
  }

  const descSectionMatch = rawMd?.match(/# 团队描述\n([\s\S]*)$/);
  if (descSectionMatch && descSectionMatch[1].trim()) {
    description = descSectionMatch[1].trim();
  }

  if (users.length === 0) {
    users = [{ id: 'u1', name: 'Admin', role: 'Owner', initials: 'AD', color: 'bg-indigo-500' }];
  }

  return { name, description, users, agentIds, rawBody: rawMd?.replace(/^---\n[\s\S]*?\n---/, '').trim() };
};

const serializeProjectMd = (name: string, desc: string, users: any[], agentIds: string[], allAgents: any[]) => {
  const fm = `---
name: ${name}
users: ${JSON.stringify(users)}
agentIds: ${JSON.stringify(agentIds)}
---

`;

  const owners = users.filter(u => u.role === 'Owner');
  const members = users.filter(u => u.role !== 'Owner');

  const body = `# 团队名称
${name}

# 团队成员
## 领导者
${owners.length > 0 ? owners.map(u => `- ${u.name} ${u.github ? `(GitHub: ${u.github})` : ''}`).join('\n') : '- 暂无'}

## 项目成员
${members.length > 0 ? members.map(u => `- ${u.name} - ${u.role}`).join('\n') : '- 暂无'}

# 智能体
${agentIds.length > 0 ? agentIds.map(id => {
  const ag = allAgents.find(a => a.id === id);
  return ag ? `- ${ag.name} (${ag.model})` : `- 未知智能体 (${id})`;
}).join('\n') : '- 暂无'}

# 团队描述
${desc}
`;

  return fm + body;
};

// 🌟 核心修复点 1：让 TeamBuilder 的解析器支持 iconColor
const parseAgentFrontmatter = (filename: string, rawMd: string) => {
  let name = filename.replace('.md', '');
  let model = '未知模型';
  let iconName = 'Bot';
  let iconColor = 'bg-teal-500';
  let role = 'member'; // 🌟 默认 role 为 member

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
        if (k === 'role') role = v; // 🌟 解析 role 字段
      }
    });
  }
  return { id: filename, name, model, iconName, iconColor, role };
};

export default function TeamBuilder() {
  const { projects, setProjects, selectedProjectId, setProject, agents: defaultStoreAgents } = useUnitedStore();
  
  const [localAgents, setLocalAgents] = useState<any[]>(defaultStoreAgents); 
  
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');

  const [localUsers, setLocalUsers] = useState<any[]>([]);
  const [projectAgentIds, setProjectAgentIds] = useState<string[]>([]);
  const [projectDesc, setProjectDesc] = useState(''); 
  const [isDirty, setIsDirty] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchData = async () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      if ((window as any).electronAPI.loadProjects) {
        const resP = await (window as any).electronAPI.loadProjects();
        if (resP && resP.success) {
          const enrichedProjects = resP.data.map((p: any) => {
            const mdInfo = parseProjectMd(p.mdContent);
            return {
              ...p,
              name: mdInfo.name || p.name,
              description: mdInfo.description,
              users: mdInfo.users,
              agentIds: mdInfo.agentIds
            };
          });

          setProjects(enrichedProjects); 
          
          if (enrichedProjects.length > 0 && (!selectedProjectId || !enrichedProjects.find((p:any) => p.id === selectedProjectId))) {
            setProject(enrichedProjects[0].id);
          }
        }
      }
      if ((window as any).electronAPI.loadAgents) {
        const resA = await (window as any).electronAPI.loadAgents();
        if (resA && resA.success && resA.data.length > 0) {
          const parsedAgents = resA.data.map((f: any) => parseAgentFrontmatter(f.file, f.content));
          setLocalAgents(parsedAgents);
        }
      }
    }
  };

  useEffect(() => { fetchData(); }, []);

  const activeProject = projects.find(p => p.id === selectedProjectId) || projects[0];
  const activeMdInfo = activeProject ? parseProjectMd(activeProject.mdContent) : { name: '', description: '', users: [], agentIds: [], rawBody: '' };

  const taskData = activeProject?.tasks || { tasks: [], metadata: {} };
  const taskList = Array.isArray(taskData) ? taskData : (taskData.tasks || []);
  const taskMeta = Array.isArray(taskData) ? { totalTasks: taskList.length } : (taskData.metadata || {});

  useEffect(() => {
    if (activeProject) {
      const { users, agentIds, description } = parseProjectMd(activeProject.mdContent);
      setLocalUsers(users);
      setProjectAgentIds(agentIds);
      setProjectDesc(description); 
      setIsDirty(false);
    }
  }, [activeProject?.id, activeProject?.mdContent]);

  const handleSaveAndSync = async () => {
    if (!activeProject) return;
    setIsSyncing(true);

    try {
      const mdString = serializeProjectMd(
        activeMdInfo.name || activeProject.name,
        projectDesc,
        localUsers,
        projectAgentIds,
        localAgents
      );

      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const saveRes = await (window as any).electronAPI.saveProjectMd(activeProject.name, mdString);
        if (!saveRes.success) throw new Error(saveRes.msg);
        
        await fetchData(); 
        setIsDirty(false);

        const syncRes = await (window as any).electronAPI.githubSyncNow();
        if (!syncRes.success && syncRes.msg !== '未登录 GitHub') {
          alert(`配置已保存在本地，但推送到 GitHub 失败: ${syncRes.msg}`);
        }
      }
    } catch (e: any) {
      alert(`保存失败: ${e.message}`);
    } finally {
      setTimeout(() => setIsSyncing(false), 500); 
    }
  };

  const handleRenameSubmit = async (oldName: string) => {
    const safeName = editingProjectName.trim();
    if (!safeName || safeName === oldName) {
      setEditingProjectId(null);
      return;
    }

    if (typeof window !== 'undefined' && (window as any).electronAPI && (window as any).electronAPI.renameProject) {
      const res = await (window as any).electronAPI.renameProject(oldName, safeName);
      if (res && res.success) {
        if (selectedProjectId === oldName) setProject(res.newId);
        await fetchData();
      } else {
        alert(res?.msg || '重命名失败');
      }
    }
    setEditingProjectId(null);
  };

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({ name: '', role: 'Editor', github: '' });

  const [isAddAgentModalOpen, setIsAddAgentModalOpen] = useState(false);
  const [selectedAgentToAdd, setSelectedAgentToAdd] = useState('');

  const projectAgents = localAgents.filter(a => projectAgentIds.includes(a.id));
  const availableAgents = localAgents.filter(a => !projectAgentIds.includes(a.id));

  const handleAddUser = () => {
    if (!newUserData.name.trim()) return;
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500', 'bg-rose-500', 'bg-amber-500'];
    
    let githubUsername = newUserData.github.replace('https://github.com/', '').replace('/', '').trim();
    let avatarUrl = githubUsername ? `https://github.com/${githubUsername}.png` : '';

    setLocalUsers([...localUsers, {
      id: `u-${Date.now()}`, 
      name: newUserData.name, 
      role: newUserData.role,
      github: githubUsername,
      avatar: avatarUrl,
      initials: newUserData.name.substring(0, 2).toUpperCase(),
      color: colors[Math.floor(Math.random() * colors.length)]
    }]);
    
    setIsDirty(true);
    setIsAddUserModalOpen(false);
    setNewUserData({ name: '', role: 'Editor', github: '' });
  };

  const handleAddAgentToProject = async () => {
    if (!selectedAgentToAdd) return;

    const targetAgent = availableAgents.find(a => a.id === selectedAgentToAdd);

    if (targetAgent && typeof window !== 'undefined' && (window as any).electronAPI && (window as any).electronAPI.initAgentWorkspace) {
      // 🌟 传递 agentName 和 agentRole，由后端根据 role 类型创建对应的文件结构
      await (window as any).electronAPI.initAgentWorkspace(
        activeProject.name,
        targetAgent.name,
        targetAgent.role || 'member' // 如果没有 role 字段，默认为 'member'
      );
    }

    setProjectAgentIds([...projectAgentIds, selectedAgentToAdd]);
    setIsDirty(true);
    setIsAddAgentModalOpen(false);
    setSelectedAgentToAdd('');
  };

  const handleRemoveUser = (id: string, e: any) => {
    e.stopPropagation();
    setLocalUsers(localUsers.filter(u => u.id !== id));
    setIsDirty(true);
  };

  const handleRemoveAgent = (id: string, e: any) => {
    e.stopPropagation();
    setProjectAgentIds(projectAgentIds.filter(aid => aid !== id));
    setIsDirty(true);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const res = await (window as any).electronAPI.createProject(newProjectName);
      if (res && res.success) {
        const newP = res.data;
        const mdInfo = parseProjectMd(newP.mdContent);
        const enrichedNewP = {
           ...newP,
           name: mdInfo.name || newP.name,
           description: mdInfo.description,
           users: mdInfo.users,
           agentIds: mdInfo.agentIds
        };

        setProjects([...projects, enrichedNewP]);
        setProject(enrichedNewP.id);
        setIsCreating(false);
        setNewProjectName('');
      }
    }
  };

  const toggleTask = async (projectId: string, taskId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    let currentTasksObj = project.tasks || { tasks: [], metadata: {} };
    if (Array.isArray(currentTasksObj)) {
      currentTasksObj = { 
        tasks: currentTasksObj, 
        metadata: { totalTasks: currentTasksObj.length, completedTasks: currentTasksObj.filter(t => t.status === 'done' || t.completed).length } 
      };
    }

    const newTaskList = currentTasksObj.tasks.map((t: any) => {
      if (t.id === taskId) {
        const isDone = t.status === 'done' || t.completed === true;
        return { 
          ...t, 
          status: isDone ? 'in-progress' : 'done', 
          completed: !isDone 
        };
      }
      return t;
    });

    const completedCount = newTaskList.filter((t: any) => t.status === 'done' || t.completed).length;
    const inProgressCount = newTaskList.filter((t: any) => t.status === 'in-progress').length;
    const pendingCount = newTaskList.length - completedCount - inProgressCount;
    
    const newTaskObject = {
      tasks: newTaskList,
      metadata: {
        ...(currentTasksObj.metadata || {}),
        totalTasks: newTaskList.length,
        completedTasks: completedCount,
        inProgressTasks: inProgressCount,
        pendingTasks: pendingCount > 0 ? pendingCount : 0,
        lastUpdated: Date.now()
      }
    };

    setProjects(projects.map(p => p.id === projectId ? { ...p, tasks: newTaskObject } : p));
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      await (window as any).electronAPI.updateProjectTasks(projectId, newTaskObject);
    }
  };

  const jumpToExecution = (projId: string) => {
    setProject(projId);
    window.dispatchEvent(new CustomEvent('navigate-view', { detail: 'execution_monitor' }));
  };

  const filteredProjects = projects.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

  const livePreviewMarkdown = serializeProjectMd(
    activeMdInfo.name || activeProject?.name || '',
    projectDesc,
    localUsers,
    projectAgentIds,
    localAgents
  );

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-white dark:bg-slate-950 animate-in fade-in duration-300">
      
      {/* ======================= 左侧：团队列表 ======================= */}
      <div className="w-80 flex flex-col border-r border-gray-200 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/20 shrink-0">
        <div className="p-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users size={20} className="text-indigo-500" />
            团队列表
          </h2>
          <button 
            onClick={() => setIsCreating(!isCreating)}
            className="p-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-500 transition-colors shadow-sm"
            title="创建新团队"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="p-3">
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" />
            <input 
              type="text" 
              placeholder="搜索团队..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-500 transition-colors" 
            />
          </div>
        </div>

        {isCreating && (
          <div className="px-3 pb-2 animate-in slide-in-from-top-2">
            <form onSubmit={handleCreateProject} className="flex gap-2">
              <input 
                autoFocus
                type="text" 
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="输入团队名 (将创建文件夹)" 
                className="flex-1 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-500/50 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500 shadow-inner"
              />
            </form>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-1">
          {filteredProjects.map(proj => {
            const isActive = activeProject?.id === proj.id;
            const isEditingThis = editingProjectId === proj.id;

            return (
              <div 
                key={proj.id}
                onClick={() => { if (!isEditingThis) setProject(proj.id); }}
                className={`w-full text-left p-3 rounded-xl cursor-pointer transition-all border group ${
                  isActive 
                    ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-500/30 shadow-sm' 
                    : 'border-transparent hover:bg-gray-100/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  
                  {isEditingThis ? (
                    <input 
                      autoFocus
                      type="text"
                      value={editingProjectName}
                      onChange={(e) => setEditingProjectName(e.target.value)}
                      onBlur={() => handleRenameSubmit(proj.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit(proj.id);
                        if (e.key === 'Escape') setEditingProjectId(null);
                      }}
                      className="flex-1 bg-white dark:bg-slate-950 border border-indigo-500 rounded px-2 py-0.5 text-sm font-bold text-indigo-600 dark:text-indigo-400 outline-none mr-2"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <h3 className={`font-bold text-sm truncate pr-2 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}>
                      {proj.name}
                    </h3>
                  )}

                  {!isEditingThis && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setEditingProjectId(proj.id); 
                          setEditingProjectName(proj.name);
                        }}
                        className="p-1 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/20 rounded transition-colors"
                        title="重命名团队"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); jumpToExecution(proj.id); }}
                        className="p-1 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded transition-colors"
                        title="进入画布编排"
                      >
                        <Network size={14} />
                      </button>
                    </div>
                  )}

                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                  ~/.unitedclaw/uc_workspace/{proj.name}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================= 右侧：团队详情与任务 ======================= */}
      {activeProject ? (
        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar bg-[#fafafa] dark:bg-[#121212]">
          
          <div className="px-10 pt-10 pb-6 border-b border-gray-100 dark:border-slate-800/60 bg-white dark:bg-[#1a1b1e] flex justify-between items-start">
            <div className="flex-1 mr-8">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  TEAM WORKSPACE
                </span>
                <span className="text-xs font-mono text-slate-400">ID: {activeProject.id}</span>
                {isDirty && <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"/> 有更改未同步</span>}
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                {activeMdInfo.name || activeProject.name}
              </h1>
              
              <div className="relative group max-w-3xl">
                <textarea
                  value={projectDesc}
                  onChange={(e) => {
                    setProjectDesc(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="在此输入团队或项目的描述内容..."
                  className="w-full bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-slate-800 focus:border-indigo-500 focus:bg-slate-50 dark:focus:bg-slate-900/50 rounded-lg p-2 -ml-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed resize-none outline-none transition-all shadow-none focus:shadow-inner"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex items-center h-full pt-4">
              <button 
                onClick={handleSaveAndSync} 
                disabled={(!isDirty && !isSyncing) || isSyncing}
                className={`relative flex items-center justify-center overflow-hidden transition-all duration-500 ease-in-out ${
                  isSyncing 
                    ? 'w-10 h-10 rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/40 opacity-100' 
                    : isDirty 
                      ? 'w-[180px] h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20' 
                      : 'w-[180px] h-10 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed' 
                }`}
              >
                {isSyncing ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <div className="flex items-center gap-2 whitespace-nowrap text-sm font-bold">
                    <Save size={16} />
                    <span>保存并同步 (GitHub)</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          <div className="p-10 max-w-5xl space-y-10">
            
            <div className="grid grid-cols-2 gap-10">
              {/* --- 人类成员 --- */}
              <section>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Users size={18} className="text-indigo-500" /> 人类成员 ({localUsers.length})
                  </h3>
                </div>
                <div className="flex flex-wrap gap-3 overflow-visible p-1">
                  {localUsers.map((user, idx) => (
                    <div 
                      key={user.id} 
                      className={`inline-flex items-center justify-center w-12 h-12 rounded-full border-2 border-white dark:border-[#121212] text-white text-sm font-bold shadow-sm relative group cursor-pointer z-[${10 - idx}] ${user.color} hover:-translate-y-1 hover:scale-110 transition-transform`}
                    >
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        user.initials
                      )}
                      
                      <button 
                        onClick={(e) => handleRemoveUser(user.id, e)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:scale-125"
                      >
                        <X size={10} />
                      </button>

                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none flex items-center gap-1 z-20 shadow-xl">
                        {user.role === 'Owner' && <ShieldAlert size={10} className="text-amber-400"/>}
                        {user.name} ({user.role})
                      </div>
                    </div>
                  ))}
                  <div 
                    onClick={() => setIsAddUserModalOpen(true)}
                    className="inline-flex items-center justify-center w-12 h-12 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-indigo-500 hover:border-indigo-500 cursor-pointer transition-all z-0 hover:-translate-y-1 hover:scale-110 shadow-sm"
                  >
                    <Plus size={20} />
                  </div>
                </div>
              </section>

              {/* --- 智能体成员 --- */}
              <section>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Bot size={18} className="text-teal-500" /> 智能体类型 ({projectAgents.length})
                  </h3>
                </div>
                <div className="flex flex-wrap gap-3 overflow-visible p-1">
                  {projectAgents.map((agent, idx) => {
                    const AgentIcon = (Icons as any)[agent.iconName || 'Bot'] || Bot;
                    return (
                      <div 
                        key={agent.id} 
                        // 🌟 核心修复点 2：绑定 agent.iconColor
                        className={`inline-flex items-center justify-center w-12 h-12 rounded-full border-2 border-white dark:border-[#121212] text-white shadow-sm relative group cursor-pointer z-[${10 - idx}] ${agent.iconColor || agent.color || 'bg-teal-500'} hover:-translate-y-1 hover:scale-110 transition-transform`}
                      >
                        <AgentIcon size={20} strokeWidth={1.5} />
                        
                        <button 
                          onClick={(e) => handleRemoveAgent(agent.id, e)}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:scale-125"
                        >
                          <X size={10} />
                        </button>

                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none flex items-center gap-1 z-20 shadow-xl">
                          <Bot size={10} className="text-teal-400"/>
                          {agent.name}
                        </div>
                      </div>
                    )
                  })}
                  <div 
                    onClick={() => setIsAddAgentModalOpen(true)}
                    className="inline-flex items-center justify-center w-12 h-12 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-teal-500 hover:border-teal-500 cursor-pointer transition-all z-0 hover:-translate-y-1 hover:scale-110 shadow-sm"
                  >
                    <Plus size={20} />
                  </div>
                </div>
              </section>
            </div>

            {/* --- Markdown 实时渲染预览区 --- */}
            <section className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FileText size={18} className="text-blue-500" /> 生成的本地文档预览 ({activeProject.name}.md)
                </h3>
              </div>
              <div className="bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm min-h-[150px]">
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-3 text-xs text-amber-600 dark:text-amber-400 mb-4 font-medium flex items-center gap-2">
                  💡 提示：在上方修改配置后，系统会自动组合生成以下内容，点击右上角保存即可写入硬盘。
                </div>
                <pre className="font-mono text-[13px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed opacity-80">
                  {livePreviewMarkdown || '加载中...'}
                </pre>
              </div>
            </section>

            {/* --- 纯展示状态的任务清单 --- */}
            <section className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <CheckSquare size={18} className="text-emerald-500" /> 任务清单 (task.json)
                </h3>
                {taskMeta.totalTasks > 0 && (
                  <div className="flex items-center gap-4 text-xs font-bold bg-slate-50 dark:bg-[#1a1b1e] px-4 py-1.5 rounded-full border border-gray-200 dark:border-slate-800">
                    <span className="text-slate-500">总计: {taskMeta.totalTasks}</span>
                    <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={12}/> 完成: {taskMeta.completedTasks || 0}</span>
                    <span className="text-amber-500 flex items-center gap-1"><Clock size={12}/> 进行中: {taskMeta.inProgressTasks || 0}</span>
                  </div>
                )}
              </div>
              
              <div className="bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-800 text-xs text-slate-500">
                      <th className="px-5 py-3 font-semibold w-28 text-center">状态</th>
                      <th className="px-5 py-3 font-semibold">任务描述</th>
                      <th className="px-5 py-3 font-semibold w-24">优先级</th>
                      <th className="px-5 py-3 font-semibold w-32">负责人</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                    {taskList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-sm text-slate-400 italic">暂无任务数据，请在本地 task.json 中添加</td>
                      </tr>
                    ) : (
                      taskList.map((task: any) => {
                        const isDone = task.status === 'done' || task.completed;
                        const isInProgress = task.status === 'in-progress';

                        return (
                          <tr 
                            key={task.id} 
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group"
                          >
                            <td className="px-5 py-4 transition-colors">
                              {isDone ? (
                                <div className="flex items-center gap-1.5 justify-center text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md w-max mx-auto text-xs font-bold">
                                  <CheckCircle2 size={14} />
                                  <span>完成</span>
                                </div>
                              ) : isInProgress ? (
                                <div className="flex items-center gap-1.5 justify-center text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-md w-max mx-auto text-xs font-bold">
                                  <Clock size={14} />
                                  <span>正在处理</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 justify-center text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md w-max mx-auto text-xs font-bold">
                                  <Circle size={14} />
                                  <span>待处理</span>
                                </div>
                              )}
                            </td>
                            
                            <td className={`px-5 py-4 transition-colors ${isDone ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                              <div className="font-bold text-sm mb-0.5">{task.title}</div>
                              {task.description && (
                                <div className={`text-xs ${isDone ? 'text-slate-300 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400'} line-clamp-1`}>
                                  {task.description}
                                </div>
                              )}
                            </td>
                            
                            <td className="px-5 py-4 text-xs">
                              <span className={`px-2 py-1 rounded uppercase font-bold tracking-wider ${
                                 task.priority === 'high' ? 'bg-red-50 text-red-500 dark:bg-red-500/10' :
                                 task.priority === 'medium' ? 'bg-amber-50 text-amber-500 dark:bg-amber-500/10' :
                                 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                              }`}>
                                {task.priority || 'normal'}
                              </span>
                            </td>
                            
                            <td className="px-5 py-4 text-xs text-slate-500 font-medium">
                              {task.assignee ? (
                                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded w-max">
                                  <UserPlus size={12}/> {task.assignee}
                                </div>
                              ) : '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#121212] opacity-50">
          <Users size={64} className="text-slate-300 dark:text-slate-700 mb-4" />
          <p className="font-medium">请在左侧选择或创建一个团队</p>
        </div>
      )}

      {/* ======================= 弹窗：添加智能体成员 ======================= */}
      {isAddAgentModalOpen && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/30 dark:bg-black/50 backdrop-blur-[2px] animate-in fade-in">
          <div className="w-[440px] bg-white dark:bg-[#222327] border border-gray-200 dark:border-[#3b3c40] rounded-xl shadow-2xl flex flex-col relative animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-[#3b3c40]">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-800 dark:text-[#e2e2e3]">
                <Bot size={18} className="text-teal-500"/> 绑定已有智能体
              </h3>
              <button onClick={() => setIsAddAgentModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-[#e2e2e3]">选择智能体 (来自 Agent Library)</label>
                <select 
                  value={selectedAgentToAdd}
                  onChange={(e) => setSelectedAgentToAdd(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#2a2b30] border border-gray-200 dark:border-[#3b3c40] focus:border-teal-500 rounded-md px-3 py-2.5 outline-none dark:text-white cursor-pointer"
                >
                  <option value="">-- 请选择要绑定的 Agent --</option>
                  {availableAgents.map((ag: any) => (
                    <option key={ag.id} value={ag.id}>{ag.name} ({ag.model})</option>
                  ))}
                </select>
                {availableAgents.length === 0 && <p className="text-xs text-amber-500 mt-1">没有可绑定的新智能体，请先前往 Agent Library 创建。</p>}
              </div>
              <div className="pt-3 mt-6 border-t border-gray-100 dark:border-[#3b3c40] flex justify-end gap-3">
                <button onClick={() => setIsAddAgentModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300">取消</button>
                <button onClick={handleAddAgentToProject} disabled={!selectedAgentToAdd} className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-md disabled:opacity-50">
                  确认绑定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= 弹窗：添加人类成员 (含 GitHub) ======================= */}
      {isAddUserModalOpen && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/30 dark:bg-black/50 backdrop-blur-[2px] animate-in fade-in">
          <div className="w-[440px] bg-white dark:bg-[#222327] border border-gray-200 dark:border-[#3b3c40] rounded-xl shadow-2xl flex flex-col relative animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-[#3b3c40]">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-800 dark:text-[#e2e2e3]">
                <UserPlus size={18} className="text-indigo-500"/> 邀请人类成员
              </h3>
              <button onClick={() => setIsAddUserModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-[#e2e2e3]">姓名</label>
                <input 
                  type="text" 
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
                  placeholder="例如: Alex Chen"
                  className="w-full bg-slate-50 dark:bg-[#2a2b30] border border-gray-200 dark:border-[#3b3c40] focus:border-indigo-500 rounded-md px-3 py-2.5 outline-none dark:text-white"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-[#e2e2e3] flex items-center gap-2">
                  <Github size={14} /> GitHub 账号 (选填，用于获取头像)
                </label>
                <input 
                  type="text" 
                  value={newUserData.github}
                  onChange={(e) => setNewUserData({...newUserData, github: e.target.value})}
                  placeholder="例如: torvalds"
                  className="w-full bg-slate-50 dark:bg-[#2a2b30] border border-gray-200 dark:border-[#3b3c40] focus:border-indigo-500 rounded-md px-3 py-2.5 outline-none dark:text-white text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-[#e2e2e3]">角色权限</label>
                <select 
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-[#2a2b30] border border-gray-200 dark:border-[#3b3c40] focus:border-indigo-500 rounded-md px-3 py-2.5 outline-none dark:text-white cursor-pointer"
                >
                  <option value="Editor">Editor (可编辑)</option>
                  <option value="Viewer">Viewer (仅查看)</option>
                  <option value="Owner">Owner (所有者)</option>
                </select>
              </div>
              <div className="pt-3 mt-6 border-t border-gray-100 dark:border-[#3b3c40] flex justify-end gap-3">
                <button onClick={() => setIsAddUserModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300">取消</button>
                <button onClick={handleAddUser} disabled={!newUserData.name} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-md disabled:opacity-50">
                  添加成员
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}