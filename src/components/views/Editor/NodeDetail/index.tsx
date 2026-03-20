"use client";

import React, { useCallback } from 'react';
import dynamic from 'next/dynamic';
import * as Icons from 'lucide-react';
import { 
  X, Database, ClipboardList, User, ShieldCheck, Terminal as TerminalIcon, 
  Keyboard, ChevronDown, MessageSquareText, Zap, ArrowRight, Network, Bot,
  Filter, Replace, FileJson, SplitSquareHorizontal, GitMerge, Repeat, Globe, Webhook, Code, UserCheck, Hash, MessageSquare, PlayCircle, Clock
} from 'lucide-react';

const AgentTerminal = dynamic(() => import('../AgentTerminal'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0c0c0c] text-slate-500 text-xs font-mono">
      Initializing PTY Environment...
    </div>
  )
});

const getIconForType = (type: string) => {
  const map: any = {
    'tool-task-center': ClipboardList,
    'tool-trigger-input': Keyboard,
    'tool-trigger-schedule': Clock, 'tool-trigger-webhook': Webhook, 'tool-trigger-manual': PlayCircle,
    'tool-filter': Filter, 'tool-map': Replace, 'tool-json': FileJson,
    'tool-if': SplitSquareHorizontal, 'tool-switch': GitMerge, 'tool-loop': Repeat,
    'tool-http': Globe, 'tool-webhook': Webhook, 'tool-code': Code,
    'tool-wait': UserCheck, 'tool-slack': Hash, 'tool-tg': MessageSquare,
  };
  return map[type] || Icons.Sparkles;
};

export default function NodeDetail({ 
  currentActiveNode, setActiveNodeDetails, project, connectedAgents, 
  triggerMockInput, setTriggerMockInput, triggerPreviewPayload, 
  handleSessionIdFound, handleExecuteNode, promptParam, setPromptParam 
}: any) {
  
  if (!currentActiveNode) return null;

  let ModalIcon: any = Icons.Sparkles;
  let modalIconColor = 'text-slate-400';
  
  const isInputTrigger = currentActiveNode.type === 'tool-trigger-input';
  const isTriggerNode = currentActiveNode.type?.startsWith('tool-trigger-');
  const isTaskCenterNode = currentActiveNode.type === 'tool-task-center';
  
  const handleSessionIdFoundCallback = useCallback((id: string) => {
    handleSessionIdFound(currentActiveNode.id, id);
  }, [handleSessionIdFound, currentActiveNode.id]);
  
  // 🌟 判断当前节点的专属角色
  const isLeaderNode = currentActiveNode.type === 'member' && currentActiveNode.role === 'leader';
  const isExecutorNode = currentActiveNode.type === 'member' && currentActiveNode.role === 'executor';

  if (currentActiveNode.isActive) { 
    modalIconColor = currentActiveNode.color ? currentActiveNode.color.replace('bg-', 'text-') : 'text-indigo-500'; 
  }
  
  if (currentActiveNode.type === 'human') ModalIcon = User;
  else if (currentActiveNode.type === 'member' && currentActiveNode.iconName) ModalIcon = (Icons as any)[currentActiveNode.iconName] || Bot;
  else ModalIcon = getIconForType(currentActiveNode.type);

  return (
    <div className="no-canvas-pan absolute inset-0 z-[100] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-8">
       <div className="w-full h-full max-w-7xl bg-white dark:bg-[#1a1b1e] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="h-14 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-6 bg-slate-50 dark:bg-[#1a1b1e] shrink-0">
          <div className="flex items-center gap-3">
            <ModalIcon size={20} className={modalIconColor} />
            <h2 className="font-bold text-slate-800 dark:text-slate-200 tracking-wide">{currentActiveNode.title}</h2>
            <span className="px-2 py-0.5 ml-2 rounded-md bg-slate-200 dark:bg-slate-800 text-[10px] font-mono text-slate-500">{currentActiveNode.type.toUpperCase()}</span>
            
            {currentActiveNode.type === 'member' && currentActiveNode.sessionId && (
              <span className="ml-4 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Database size={12} />
                Session: {currentActiveNode.sessionId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-md transition-colors shadow-md shadow-indigo-500/20 mr-4">Save changes</button>
            <button onClick={() => setActiveNodeDetails(null)} className="p-1.5 text-gray-400 hover:text-slate-800 dark:hover:text-white transition-colors bg-slate-200 dark:bg-slate-800 rounded-md"><X size={16} /></button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className={`border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-[#1a1b1e] flex flex-col overflow-hidden transition-all duration-300 ${currentActiveNode.type === 'member' ? 'w-[65%]' : 'w-[400px]'}`}>
            
            {isTaskCenterNode && (
              <div className="p-6 space-y-5 flex-1 flex flex-col overflow-y-auto">
                <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <ClipboardList size={14}/> Task Distribution Center
                </h4>
                <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                  编排机器人 (Leader) 拆分的任务会同步至此。下游的执行类 Agent (Executor) 触发时，将自动从此节点拉取未完成的任务列表。
                </p>
                <div className="flex-1 bg-slate-50 dark:bg-[#2a2b30] border border-gray-200 dark:border-slate-700 rounded-lg p-3 overflow-y-auto custom-scrollbar shadow-inner space-y-2">
                  {project?.tasks?.tasks?.length > 0 ? (
                    project.tasks.tasks.map((task: any) => (
                       <div key={task.id} className="bg-white dark:bg-slate-800 p-2.5 rounded border border-gray-100 dark:border-slate-700 text-xs shadow-sm transition-all hover:border-indigo-300">
                         <div className={`font-bold mb-1.5 ${(task.status === 'done' || task.completed) ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{task.title}</div>
                         <div className="flex items-center justify-between text-[10px]">
                           <span className={`px-2 py-0.5 rounded font-bold ${task.status === 'done' || task.completed ? 'bg-emerald-50 text-emerald-500' : task.status === 'in-progress' ? 'bg-amber-50 text-amber-500' : 'bg-slate-100 text-slate-500'}`}>
                             {task.status === 'done' || task.completed ? '✅ 已完成' : task.status === 'in-progress' ? '⏳ 进行中' : '🕒 待处理'}
                           </span>
                           <span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded">{task.assignee || '未分配执行者'}</span>
                         </div>
                       </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 text-center py-4">暂无任务数据，请由 Leader 创建或手动在面板添加。</div>
                  )}
                </div>
              </div>
            )}

            {currentActiveNode.type === 'human' && (
              <div className="p-6 space-y-6 overflow-y-auto">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Member Details</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-1.5"><User size={14}/> Full Name</label>
                      <input type="text" defaultValue={currentActiveNode.title} className="w-full bg-slate-50 dark:bg-[#2a2b30] border border-gray-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm outline-none dark:text-white" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-1.5"><ShieldCheck size={14}/> Access Role</label>
                      <select className="w-full bg-slate-50 dark:bg-[#2a2b30] border border-gray-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm outline-none dark:text-white cursor-pointer">
                        <option>Owner</option><option>Editor</option><option>Viewer</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentActiveNode.type === 'member' && (
              <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider flex items-center gap-2 shrink-0">
                  <TerminalIcon size={14}/> Agent System Terminal (PTY)
                </h4>
                <div className="mb-3">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Prompt Param</label>
                  <input 
                    type="text"
                    value={promptParam || ''}
                    onChange={(e) => setPromptParam(e.target.value)}
                    placeholder="输入参数..."
                    className="w-full bg-slate-50 dark:bg-[#2a2b30] border border-gray-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm outline-none dark:text-white focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div className="flex-1 min-h-0 rounded-lg shadow-inner relative border border-slate-800">
                  <AgentTerminal 
                    terminalId={currentActiveNode.id} 
                    workingDirectory={`~/.unitedclaw/uc_workspace/${project?.name || 'default'}`} 
                    promptParam={promptParam}
                    onSessionIdFound={handleSessionIdFoundCallback}
                  />
                </div>
              </div>
            )}

            {isInputTrigger && (
              <div className="p-6 space-y-5 flex-1 flex flex-col overflow-y-auto">
                <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <Keyboard size={14}/> Trigger Input
                </h4>
                <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                  在此模拟用户或外部系统发来的输入内容。该文本将被打包为触发器载荷（Payload），并在工作流执行时传递给下游节点。
                </p>
                <textarea 
                  value={triggerMockInput}
                  onChange={(e) => setTriggerMockInput(e.target.value)}
                  placeholder="请输入测试指令内容..."
                  className="w-full flex-1 bg-slate-50 dark:bg-[#2a2b30] border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-sm outline-none dark:text-white resize-none focus:border-indigo-500 transition-colors shadow-inner"
                />
              </div>
            )}

            {!isTriggerNode && !isTaskCenterNode && currentActiveNode.type !== 'human' && currentActiveNode.type !== 'member' && (
              <div className="p-6 space-y-5 overflow-y-auto">
                <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Parameters</h4>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium dark:text-slate-300">Service Provider</label>
                  <div className="w-full bg-slate-50 dark:bg-[#2a2b30] border border-gray-200 dark:border-[#3b3c40] rounded-md px-3 py-2.5 flex items-center justify-between cursor-pointer dark:text-white"><span>OpenAI</span><ChevronDown size={16} className="text-gray-400" /></div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium dark:text-slate-300">Model</label>
                  <div className="w-full bg-slate-50 dark:bg-[#2a2b30] border border-gray-200 dark:border-[#3b3c40] rounded-md px-3 py-2.5 flex items-center justify-between cursor-pointer dark:text-white"><span>GPT-4o</span><ChevronDown size={16} className="text-gray-400" /></div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium dark:text-slate-300">API Key</label>
                  <input type="password" placeholder="sk-..." className="w-full bg-slate-50 dark:bg-[#2a2b30] border border-gray-200 dark:border-[#3b3c40] focus:border-indigo-500 rounded-md px-3 py-2.5 outline-none dark:text-white" />
                </div>
              </div>
            )}
          </div>

          {/* 🌟 右侧信息面板 */}
          <div className="flex-1 bg-slate-50/50 dark:bg-[#121212] flex flex-col p-6 min-w-0">
            {isLeaderNode ? (
              // 🌟 Leader: 显示下级接入 Agent 与 项目总任务 (tasks.json)
              <div className="flex-1 flex flex-col gap-6 h-full">
                
                {/* 上半部分：接入的下游 Agent */}
                <div className="flex-[3] flex flex-col min-h-0 bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Network size={14} className="text-indigo-500"/> CONNECTED DOWNSTREAM AGENTS
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Count: {connectedAgents.length}</span>
                  </div>
                  <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
                    {connectedAgents.length > 0 ? (
                      connectedAgents.map((agent: any) => {
                        const AgentIcon = (Icons as any)[agent.iconName || 'Bot'] || Bot;
                        return (
                          <div key={agent.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#2a2b30] border border-gray-100 dark:border-slate-700 rounded-lg shadow-sm hover:border-indigo-300 transition-colors">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm ${agent.color || 'bg-teal-500'}`}>
                              <AgentIcon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate">{agent.title}</div>
                              <div className="text-[10px] text-slate-500 truncate mt-0.5">{agent.model || 'Unknown Model'}</div>
                            </div>
                            <div className="shrink-0 text-[10px] font-bold px-2 py-1 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 uppercase tracking-wide">
                              {agent.role || 'Executor'}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <Network size={32} className="mb-3 opacity-50" />
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">暂无连接的下游智能体</p>
                        <p className="text-xs text-center px-4 max-w-xs leading-relaxed">请在工作流画布中，将数据线拖拽并连接至需要被编排的 Agent 节点。</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 下半部分：项目总任务列表 (Project Tasks) */}
                <div className="flex-[2] flex flex-col min-h-0 bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <ClipboardList size={14} className="text-amber-500"/> PROJECT TASKS
                    </h4>
                  </div>
                  <div className="flex-1 p-3 flex flex-col gap-2 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-[#1a1b1e]">
                    {project?.tasks?.tasks?.length > 0 ? (
                      project.tasks.tasks.map((task: any) => (
                        <div key={task.id} className="bg-white dark:bg-slate-800 p-2.5 rounded border border-gray-100 dark:border-slate-700 text-xs shadow-sm transition-all hover:border-indigo-300">
                          <div className={`font-bold mb-1.5 ${(task.status === 'done' || task.completed) ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{task.title}</div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className={`px-2 py-0.5 rounded font-bold ${task.status === 'done' || task.completed ? 'bg-emerald-50 text-emerald-500' : task.status === 'in-progress' ? 'bg-amber-50 text-amber-500' : 'bg-slate-100 text-slate-500'}`}>
                              {task.status === 'done' || task.completed ? '✅ 已完成' : task.status === 'in-progress' ? '⏳ 进行中' : '🕒 待处理'}
                            </span>
                            <span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded">{task.assignee || '未分配执行者'}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <ClipboardList size={24} className="mb-2 opacity-50" />
                        <p className="text-xs">暂无任务数据，请在任务面板添加。</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : isExecutorNode ? (
              // 🌟 Executor: 显示下级接入 Agent 与 审查任务列表 (reviews.json)
              <div className="flex-1 flex flex-col gap-6 h-full">
                
                {/* 上半部分：接入的下游 Agent (Executor 可能接入工具节点或其他子智能体) */}
                <div className="flex-[3] flex flex-col min-h-0 bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Network size={14} className="text-indigo-500"/> CONNECTED DOWNSTREAM AGENTS
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Count: {connectedAgents.length}</span>
                  </div>
                  <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
                    {connectedAgents.length > 0 ? (
                      connectedAgents.map((agent: any) => {
                        const AgentIcon = (Icons as any)[agent.iconName || 'Bot'] || Bot;
                        return (
                          <div key={agent.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#2a2b30] border border-gray-100 dark:border-slate-700 rounded-lg shadow-sm hover:border-indigo-300 transition-colors">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm ${agent.color || 'bg-teal-500'}`}>
                              <AgentIcon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate">{agent.title}</div>
                              <div className="text-[10px] text-slate-500 truncate mt-0.5">{agent.model || 'Unknown Model'}</div>
                            </div>
                            <div className="shrink-0 text-[10px] font-bold px-2 py-1 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 uppercase tracking-wide">
                              {agent.role || 'Executor'}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <Network size={32} className="mb-3 opacity-50" />
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">暂无连接的下游节点</p>
                        <p className="text-xs text-center px-4 max-w-xs leading-relaxed">可将执行结果引向工具节点或审查员节点。</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 下半部分：审查任务列表 (reviews.json 数据渲染区) */}
                <div className="flex-[2] flex flex-col min-h-0 bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <ShieldCheck size={14} className="text-amber-500"/> REVIEW TASKS
                    </h4>
                  </div>
                  <div className="flex-1 p-3 flex flex-col gap-2 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-[#1a1b1e]">
                    {currentActiveNode.reviews?.length > 0 ? (
                      currentActiveNode.reviews.map((review: any) => (
                        <div key={review.id} className="bg-white dark:bg-slate-800 p-2.5 rounded border border-gray-100 dark:border-slate-700 text-xs shadow-sm transition-all hover:border-indigo-300">
                          <div className={`font-bold mb-1.5 ${review.status === 'approved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}>
                            {review.title || '审查请求'}
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className={`px-2 py-0.5 rounded font-bold ${review.status === 'approved' ? 'bg-emerald-50 text-emerald-500' : review.status === 'rejected' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
                              {review.status === 'approved' ? '✅ 已通过' : review.status === 'rejected' ? '❌ 已驳回' : '⏳ 待审查'}
                            </span>
                            <span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded">{review.timestamp || '刚刚'}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <ShieldCheck size={24} className="mb-2 opacity-50" />
                        <p className="text-xs text-center">暂无审查任务记录。</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : currentActiveNode.type === 'member' ? (
              // 当节点为审查者(Reviewer)等其他角色时，保持原有的简易渲染
              <div className="flex-1 flex flex-col gap-6 h-full">
                <div className="flex-[3] flex flex-col min-h-0 bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><MessageSquareText size={14} className="text-indigo-500"/> Node Output Data</h4>
                  </div>
                  <div className="flex-1 p-4 flex flex-col items-center justify-center text-slate-400 overflow-y-auto custom-scrollbar">
                    {currentActiveNode.outputData ? (
                      <pre className="text-xs font-mono text-emerald-400 text-left w-full h-full">
                        {JSON.stringify(currentActiveNode.outputData, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-sm">尚未执行输出</div>
                    )}
                  </div>
                </div>
                <div className="flex-[2] flex flex-col min-h-0 bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><ShieldCheck size={14} className="text-amber-500"/> Reviewer Audit Trail</h4>
                  </div>
                  <div className="flex-1 p-4 flex flex-col items-center justify-center text-slate-400 overflow-y-auto custom-scrollbar">
                    <ShieldCheck size={32} className="mb-2 opacity-50" />
                    <p className="text-sm text-center">No review interventions recorded.</p>
                  </div>
                </div>
              </div>
            ) : isInputTrigger ? (
              <div className="flex-1 flex flex-col bg-[#0c0c0c] border border-slate-800 rounded-xl shadow-sm overflow-hidden h-full">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-[#121212] shrink-0">
                  <h4 className="text-xs font-bold text-slate-400 tracking-wider flex items-center gap-2"><ArrowRight size={14}/> EXPECTED OUTPUT PAYLOAD</h4>
                  <span className="text-[10px] text-emerald-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> 准备就绪</span>
                </div>
                <div className="flex-1 p-5 font-mono text-[13px] text-emerald-400 overflow-y-auto custom-scrollbar">
                  <pre>
                    {triggerPreviewPayload ? JSON.stringify(triggerPreviewPayload, null, 2) : 'Loading...'}
                  </pre>
                </div>
              </div>
            ) : isTaskCenterNode ? (
              <div className="flex-1 flex flex-col bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm h-full overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-2">
                    <Network size={14} className="text-indigo-500"/> CONNECTED DOWNSTREAM AGENTS
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Count: {connectedAgents.length}</span>
                </div>
                <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
                  {connectedAgents.length > 0 ? (
                    connectedAgents.map(agent => {
                      const AgentIcon = (Icons as any)[agent.iconName || 'Bot'] || Bot;
                      return (
                        <div key={agent.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#2a2b30] border border-gray-100 dark:border-slate-700 rounded-lg shadow-sm hover:border-indigo-300 transition-colors">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm ${(agent as any).color || 'bg-teal-500'}`}>
                            <AgentIcon size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate">{agent.title}</div>
                            <div className="text-[10px] text-slate-500 truncate mt-0.5">{(agent as any).model || 'Unknown Model'}</div>
                          </div>
                          <div className="shrink-0 text-[10px] font-bold px-2 py-1 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 uppercase tracking-wide">
                            {(agent as any).role || 'Executor'}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                      <Network size={32} className="mb-3 opacity-50" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">暂无连接的下游智能体</p>
                      <p className="text-xs text-center px-4 max-w-xs leading-relaxed">请在工作流画布中，将数据线拖拽并连接至执行任务的 Agent 节点。</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm h-full">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                  <h4 className="text-xs font-bold text-slate-500 tracking-wider">OUTPUT / EXECUTION</h4>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 overflow-y-auto custom-scrollbar relative">
                  {currentActiveNode.outputData ? (
                    <pre className="text-xs font-mono text-emerald-400 text-left w-full h-full p-4">
                      {JSON.stringify(currentActiveNode.outputData, null, 2)}
                    </pre>
                  ) : (
                    <>
                      <Zap size={32} className="mb-3 opacity-50" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-4">No node output</p>
                      <button onClick={() => handleExecuteNode(currentActiveNode.id)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors dark:text-slate-200 shadow-sm">
                        Execute Node
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}