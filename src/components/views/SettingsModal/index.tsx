"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, User, Keyboard, Key, Box, Puzzle, 
  LayoutDashboard, Shuffle, Link, Search, TerminalSquare, FileJson, Calendar, RefreshCw,
  Cpu, Terminal, Code, MousePointer2, Image as ImageIcon, Video, Figma, FileEdit, Hexagon, ChevronDown, Plus,
  Brain, ScrollText, Sparkles, Edit3, Trash2, ChevronRight, ChevronUp, Folder
} from 'lucide-react';
import { useUnitedStore } from '@/store/useUnitedStore';

const menuGroups = [
  {
    title: "选项",
    items: [
      { id: "about", icon: User, label: "关于" },
      { id: "runtime", icon: Cpu, label: "运行环境" },
      { id: "models", icon: Brain, label: "模型" },
      { id: "rules", icon: ScrollText, label: "规则" },
      { id: "hotkeys", icon: Keyboard, label: "快捷键" },
      { id: "keychain", icon: Key, label: "Keychain" },
      { id: "core-plugins", icon: Box, label: "核心插件" },
      { id: "community-plugins", icon: Puzzle, label: "第三方插件" }
    ]
  },
  {
    title: "核心插件",
    items: [
      { id: "canvas", icon: LayoutDashboard, label: "白板" },
      { id: "composer", icon: Shuffle, label: "笔记重组" },
      { id: "backlinks", icon: Link, label: "反向链接" },
      { id: "switcher", icon: Search, label: "快速切换" },
      { id: "command", icon: TerminalSquare, label: "命令面板" },
      { id: "templates", icon: FileJson, label: "模板" },
      { id: "daily", icon: Calendar, label: "日记" },
      { id: "sync", icon: RefreshCw, label: "同步" }
    ]
  }
];

const envOptionsData = {
  cli: [
    { id: 'opencode', name: 'opencode', icon: Terminal },
    { id: 'claudecode', name: 'claudecode', icon: Terminal },
    { id: 'codex', name: 'codex', icon: Terminal }
  ],
  ide: [
    { id: 'vscode', name: 'VS Code', icon: Code },
    { id: 'intellij', name: 'IntelliJ IDEA', icon: Box },
    { id: 'cursor', name: 'Cursor', icon: MousePointer2 }
  ],
  design: [
    { id: 'ps', name: 'Photoshop', icon: ImageIcon },
    { id: 'ae', name: 'After Effects', icon: Video },
    { id: 'figma', name: 'Figma', icon: Figma }
  ],
  doc: [
    { id: 'ima', name: 'ima', icon: FileEdit },
    { id: 'obsidian', name: 'Obsidian', icon: Hexagon }
  ]
};

const providers = ['AWS', 'Anthropic', 'OpenAI', 'Gemini', 'xAI', 'OpenRouter'];
const providerModelsMap: Record<string, string[]> = {
  'AWS': ['Nova Pro', 'Nova Lite', 'Claude 3.5 Sonnet (Bedrock)'],
  'Anthropic': ['Claude 3.5 Sonnet', 'Claude 3 Opus', 'Claude 3 Haiku'],
  'OpenAI': ['GPT-4o', 'GPT-4-Turbo', 'GPT-3.5-Turbo'],
  'Gemini': ['Gemini 1.5 Pro', 'Gemini 1.5 Flash'],
  'xAI': ['Grok-2', 'Grok-1.5'],
  'OpenRouter': ['Auto (OpenRouter)', 'Meta Llama 3 70B', 'Mistral Large']
};

const EnvSelectorRow = ({ title, label, options, selectedId, onSelect, onAdd, envStatusMap, isScanning }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((o: any) => o.id === selectedId) || options[0];
  const Icon = selectedOption.icon;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const getSafeStatus = (id: string) => {
    if (isScanning) return true; 
    if (!envStatusMap) return true; 
    const status = envStatusMap[id];
    if (status === undefined) return true; 
    return status === true || status === 'true'; 
  };

  return (
    <div className="mb-6">
      <h2 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-3 ml-1">{title}</h2>
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-xl p-3 flex justify-between items-center transition-colors">
        <span className="font-bold text-sm text-slate-800 dark:text-slate-300 ml-2">{label}</span>
        
        <div className="flex items-center gap-2">
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 px-3 py-1.5 min-w-[200px] border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-sm hover:border-indigo-500 transition-colors shadow-sm"
            >
              <Icon size={14} className="text-slate-600 dark:text-slate-400" />
              <span className="text-slate-800 dark:text-slate-200 font-medium flex-1 text-left">{selectedOption.name}</span>
              <ChevronDown size={14} className="text-slate-400 ml-2" />
            </button>
            
            {isOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50 py-1.5 animate-in slide-in-from-top-2">
                {options.map((opt: any) => {
                  const OptIcon = opt.icon;
                  const isInstalled = getSafeStatus(opt.id);

                  return (
                    <div 
                      key={opt.id} 
                      onClick={() => { 
                        if (isInstalled) {
                          onSelect(opt.id); 
                          setIsOpen(false); 
                        }
                      }}
                      className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                        isInstalled 
                          ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800' 
                          : 'cursor-not-allowed opacity-50 bg-slate-50 dark:bg-slate-900/40'
                      }`}
                    >
                      <OptIcon size={14} className="text-slate-500 dark:text-slate-400" />
                      <span className={`flex-1 ${selectedId === opt.id ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                        {opt.name}
                      </span>
                      
                      {!isInstalled && (
                        <span className="text-[9px] bg-red-100 text-red-500 dark:bg-red-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider font-black">
                          未安装
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <button onClick={onAdd} className="p-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm active:scale-95" title="手动添加新环境">
            <Plus size={16} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function SettingsModal() {
  const { isSettingsOpen, setSettingsOpen, localRuntimeEnv } = useUnitedStore();
  
  const [activeTab, setActiveTab] = useState('about'); 
  const [workspacePath, setWorkspacePath] = useState('C:\\Users\\Administrator\\.unitedclaw');

  const [envStates, setEnvStates] = useState({
    cli: 'opencode',
    ide: 'cursor',
    design: 'figma',
    doc: 'obsidian'
  });

  const [isBuiltInOpen, setIsBuiltInOpen] = useState(true);
  const [isCustomOpen, setIsCustomOpen] = useState(true);
  
  const [isAddModelOpen, setIsAddModelOpen] = useState(false);
  const [newModelData, setNewModelData] = useState({ provider: '', model: '', apiKey: '' });
  const [isProviderDropOpen, setIsProviderDropOpen] = useState(false);
  const [isModelDropOpen, setIsModelDropOpen] = useState(false);
  
  const providerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (providerRef.current && !providerRef.current.contains(event.target as Node)) setIsProviderDropOpen(false);
      if (modelRef.current && !modelRef.current.contains(event.target as Node)) setIsModelDropOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const builtInModels = [
    { name: 'Gemini-3-Pro-Preview', provider: 'TRAE' },
    { name: 'Gemini-2.5-Pro', provider: 'TRAE' },
    { name: 'Gemini-3-Flash-Preview', provider: 'TRAE' },
    { name: 'Gemini-2.5-Flash', provider: 'TRAE' },
    { name: 'Kimi-K2-0905', provider: 'TRAE' },
    { name: 'GPT-5.2-Codex', provider: 'TRAE' }
  ];

  const [customModels, setCustomModels] = useState([
    { id: '1', name: 'GLM-5', provider: 'zai', enabled: true },
    { id: '2', name: 'Gemini-3-Pro-Preview', provider: 'gemini', enabled: true },
    { id: '3', name: 'GLM-4.7-plan', provider: 'zai-plan', enabled: true },
  ]);

  const toggleCustomModel = (id: string) => {
    setCustomModels(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
  };

  const handleEnvSelect = (type: string, id: string) => {
    setEnvStates(prev => ({ ...prev, [type]: id }));
  };

  const handleAddEnv = (type: string) => {
    alert(`触发：为 ${type} 手动添加新环境的表单`);
  };

  const handleConfirmAddModel = () => {
    if (!newModelData.provider || !newModelData.model || !newModelData.apiKey) return;
    setCustomModels([...customModels, {
      id: Date.now().toString(),
      name: newModelData.model,
      provider: newModelData.provider,
      enabled: true
    }]);
    setIsAddModelOpen(false);
    setNewModelData({ provider: '', model: '', apiKey: '' });
  };

  if (!isSettingsOpen) return null;

  const isEnvScanning = localRuntimeEnv === null;
  const safeCliMap = localRuntimeEnv?.cli || localRuntimeEnv?.runtime?.cli || localRuntimeEnv || null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {isAddModelOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/30 dark:bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div 
            className="w-[440px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-2xl flex flex-col relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
              <h3 className="font-bold text-base tracking-wide text-slate-800 dark:text-slate-100">添加模型</h3>
              <button 
                onClick={() => setIsAddModelOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-1.5 relative" ref={providerRef}>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  <span className="text-red-500 mr-1">*</span>服务商
                </label>
                <div 
                  onClick={() => setIsProviderDropOpen(!isProviderDropOpen)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-md px-3 py-2.5 flex items-center justify-between cursor-pointer transition-colors shadow-sm"
                >
                  <span className={newModelData.provider ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-slate-400'}>
                    {newModelData.provider || '选择模型服务商'}
                  </span>
                  {isProviderDropOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
                
                {isProviderDropOpen && (
                  <div className="absolute left-0 right-0 top-[70px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-1">
                    {providers.map(p => (
                      <div 
                        key={p} 
                        onClick={() => {
                          setNewModelData({ ...newModelData, provider: p, model: '' });
                          setIsProviderDropOpen(false);
                        }}
                        className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors font-medium"
                      >
                        {p}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 relative" ref={modelRef}>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  <span className="text-red-500 mr-1">*</span>模型
                </label>
                <div 
                  onClick={() => { if(newModelData.provider) setIsModelDropOpen(!isModelDropOpen); }}
                  className={`w-full border rounded-md px-3 py-2.5 flex items-center justify-between transition-colors shadow-sm ${newModelData.provider ? 'bg-slate-50 dark:bg-slate-950 border-gray-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer' : 'bg-gray-100 dark:bg-slate-800/50 border-gray-200 dark:border-slate-800 cursor-not-allowed opacity-60'}`}
                >
                  <span className={newModelData.model ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-slate-400'}>
                    {newModelData.model || '选择模型'}
                  </span>
                  {isModelDropOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>

                {isModelDropOpen && newModelData.provider && (
                  <div className="absolute left-0 right-0 top-[70px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {(providerModelsMap[newModelData.provider] || []).map(m => (
                      <div 
                        key={m} 
                        onClick={() => {
                          setNewModelData({ ...newModelData, model: m });
                          setIsModelDropOpen(false);
                        }}
                        className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors font-medium"
                      >
                        {m}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  <span className="text-red-500 mr-1">*</span>API 密钥
                </label>
                <input 
                  type="password"
                  value={newModelData.apiKey}
                  onChange={(e) => setNewModelData({...newModelData, apiKey: e.target.value})}
                  placeholder="输入 API 密钥"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-500 rounded-md px-3 py-2.5 outline-none transition-colors text-slate-800 dark:text-slate-200 placeholder-slate-400 shadow-sm"
                />
              </div>

              <div className="pt-3 mt-6 border-t border-gray-100 dark:border-slate-800">
                <button 
                  onClick={handleConfirmAddModel}
                  disabled={!newModelData.provider || !newModelData.model || !newModelData.apiKey}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20"
                >
                  添加模型
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      <div 
        className="w-[900px] h-[60vh] min-h-[550px] max-h-[700px] bg-white dark:bg-slate-950 rounded-xl shadow-2xl flex overflow-hidden relative animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-64 bg-gray-50/50 dark:bg-slate-900/50 border-r border-gray-200 dark:border-slate-800 overflow-y-auto custom-scrollbar flex flex-col py-4">
          {menuGroups.map((group, gIndex) => (
            <div key={gIndex} className="mb-6">
              <h4 className="px-6 text-xs font-bold text-slate-400 dark:text-slate-500 mb-2">{group.title}</h4>
              <ul className="space-y-0.5 px-3">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          isActive 
                            ? 'bg-indigo-100/80 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 font-bold' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        <Icon size={16} className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'opacity-70'} />
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-white dark:bg-slate-950">
          <button 
            onClick={() => setSettingsOpen(false)}
            className="absolute top-4 right-4 p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-gray-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors z-50"
          >
            <X size={20} />
          </button>

          <div className="p-8 max-w-3xl pb-16">
            {activeTab === 'models' ? (
              <div className="space-y-6 animate-in fade-in duration-300 pt-2">
                <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">模型</h1>
                
                <div>
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">模型管理</h2>
                  <p className="text-xs text-slate-500 mt-1">配置 API key 添加更多可用模型，预置模型默认使用稳定版本。</p>
                </div>
                
                <button 
                  onClick={() => setIsAddModelOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-lg transition-colors border border-gray-200 dark:border-slate-700 shadow-sm"
                >
                  <Plus size={16} /> 添加模型
                </button>

                <div className="flex items-center px-6 py-2 border-b border-gray-200 dark:border-slate-800 text-xs font-bold text-slate-400 dark:text-slate-500">
                  <div className="flex-[2]">模型</div>
                  <div className="flex-[1]">服务商</div>
                  <div className="w-24 text-center">操作</div>
                </div>

                <div className="space-y-2">
                  <div className="pt-2">
                    <div 
                      className="flex items-center gap-2 px-2 py-2 cursor-pointer text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-lg transition-colors"
                      onClick={() => setIsCustomOpen(!isCustomOpen)}
                    >
                      <ChevronRight size={16} className={`transition-transform duration-200 ${isCustomOpen ? 'rotate-90' : ''}`} />
                      自定义
                    </div>
                    {isCustomOpen && (
                      <div className="mt-1 space-y-0.5">
                        {customModels.map(model => (
                          <div key={model.id} className="flex items-center px-8 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors text-sm text-slate-600 dark:text-slate-400 group">
                            <div className="flex-[2] flex items-center gap-3 text-slate-800 dark:text-slate-200">
                              <Box size={14} className="text-slate-400" />
                              {model.name}
                            </div>
                            <div className="flex-[1] font-mono text-xs opacity-70">{model.provider}</div>
                            <div className="w-24 flex items-center justify-center gap-3">
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-1 hover:text-indigo-500 transition-colors" title="编辑"><Edit3 size={14}/></button>
                                <button 
                                  className="p-1 hover:text-red-500 transition-colors" 
                                  title="删除"
                                  onClick={() => setCustomModels(customModels.filter(m => m.id !== model.id))}
                                ><Trash2 size={14}/></button>
                              </div>
                              <div 
                                onClick={() => toggleCustomModel(model.id)}
                                className={`w-9 h-5 rounded-full flex items-center p-0.5 cursor-pointer transition-colors shrink-0 ${model.enabled ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-slate-700'}`}
                              >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${model.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div 
                      className="flex items-center gap-2 px-2 py-2 cursor-pointer text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-lg transition-colors"
                      onClick={() => setIsBuiltInOpen(!isBuiltInOpen)}
                    >
                      <ChevronRight size={16} className={`transition-transform duration-200 ${isBuiltInOpen ? 'rotate-90' : ''}`} />
                      内置
                    </div>
                    {isBuiltInOpen && (
                      <div className="mt-1 space-y-0.5">
                        {builtInModels.map((model, idx) => (
                          <div key={idx} className="flex items-center px-8 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors text-sm text-slate-600 dark:text-slate-400 group">
                            <div className="flex-[2] flex items-center gap-3 text-slate-800 dark:text-slate-200">
                              <Sparkles size={14} className="text-indigo-400 opacity-80" />
                              {model.name}
                            </div>
                            <div className="flex-[1] font-mono text-xs opacity-70">{model.provider}</div>
                            <div className="w-24 text-center opacity-50">-</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : activeTab === 'runtime' ? (
              <div className="space-y-2 animate-in fade-in duration-300 pt-2">
                <div className="flex items-center gap-3 mb-6">
                  <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">环境映射与执行器</h1>
                  {isEnvScanning && (
                    <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-[10px] text-indigo-500 font-bold animate-pulse">
                      <RefreshCw size={10} className="animate-spin" /> 正在扫描本地环境...
                    </span>
                  )}
                </div>
                
                <EnvSelectorRow title="Command Line Interface" label="默认 CLI 工具" options={envOptionsData.cli} selectedId={envStates.cli} onSelect={(id: string) => handleEnvSelect('cli', id)} onAdd={() => handleAddEnv('CLI')} envStatusMap={safeCliMap} isScanning={isEnvScanning} />
                <EnvSelectorRow title="Integrated Development Environment" label="默认代码编辑器" options={envOptionsData.ide} selectedId={envStates.ide} onSelect={(id: string) => handleEnvSelect('ide', id)} onAdd={() => handleAddEnv('IDE')} />
                <EnvSelectorRow title="Design & Prototype" label="默认设计工具" options={envOptionsData.design} selectedId={envStates.design} onSelect={(id: string) => handleEnvSelect('design', id)} onAdd={() => handleAddEnv('Design Tool')} />
                <EnvSelectorRow title="Documentation" label="默认文档编辑器" options={envOptionsData.doc} selectedId={envStates.doc} onSelect={(id: string) => handleEnvSelect('doc', id)} onAdd={() => handleAddEnv('Doc Editor')} />
              </div>
            ) : activeTab === 'about' ? (
               <div className="space-y-8 animate-in fade-in duration-300 pt-2">
                 <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">关于 UnitedClaw</h1>
                 
                 <div className="space-y-6">
                   <div className="bg-slate-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-800 rounded-xl p-4 flex justify-between items-center">
                     <div>
                       <h3 className="font-bold text-slate-800 dark:text-slate-200">Version 1.11.7</h3>
                       <p className="text-xs text-slate-500 mt-1">(安装程序版本: 1.11.7)</p>
                     </div>
                     <div className="px-3 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-md text-xs font-bold">
                       最新版本
                     </div>
                   </div>

                   <div className="bg-slate-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                     <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
                       <Folder size={16} className="text-amber-500" /> 
                       本地工作目录 (Workspace Directory)
                     </h3>
                     <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                       UnitedClaw 的所有本地智能体配置 (Agent Library)、运行日志及环境快照都将存储在此目录下。更改目录后需要重启应用生效。
                     </p>
                     
                     <div className="flex gap-2">
                       <input 
                         type="text" 
                         value={workspacePath}
                         onChange={(e) => setWorkspacePath(e.target.value)}
                         className="flex-1 bg-white dark:bg-[#121212] border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:text-slate-200 font-mono transition-colors"
                         placeholder="例如: C:\Users\Administrator\.unitedclaw"
                       />
                       <button 
                         className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-lg transition-colors shadow-sm active:scale-95"
                         onClick={() => {
                           alert("该功能可通过 Electron 的 dialog.showOpenDialog 唤起系统的本地文件夹选择器。");
                         }}
                       >
                         更改目录
                       </button>
                       <button 
                         className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors shadow-md shadow-indigo-500/20 active:scale-95"
                         onClick={() => {
                           alert(`工作目录已记录为:\n${workspacePath}\n请重启应用以生效！`);
                         }}
                       >
                         保存
                       </button>
                     </div>
                   </div>

                 </div>
               </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 mt-16">
                <Box size={48} className="mb-4" />
                <p>配置面板 "{activeTab}" 开发中</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}