"use client";

import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar, { ViewType } from '@/components/layout/Sidebar';

// 🌟 采用重构后的新目录结构导入
import Editor from '@/components/views/Editor';
import DashboardView from '@/components/views/DashboardView';
import TeamBuilder from '@/components/views/TeamBuilder';
import AgentBuilder from '@/components/views/AgentBuilder';
import SettingsModal from '@/components/views/SettingsModal';
import LoginModal from '@/components/views/LoginModal'; // 🌟 别忘了引入 Login 弹窗

import { scanLocalEnvironment } from '@/app/actions/env-scanner';
import { useUnitedStore } from '@/store/useUnitedStore';

export default function UnitedClawApp() {
  // 🌟 核心修复：使用 'dashboard' 作为默认视图，'execution_monitor' 作为执行监控视图
  const [currentView, setCurrentView] = useState<ViewType>('dashboard'); 
  const [isDark, setIsDark] = useState(false);
  
  const setLocalRuntimeEnv = useUnitedStore((state) => state.setLocalRuntimeEnv);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    
    // 安全调用扫描引擎
    if (setLocalRuntimeEnv) {
      scanLocalEnvironment()
        .then((runtimeData) => {
          console.log('📦 UnitedClaw 本地环境扫描完成:', runtimeData);
          setLocalRuntimeEnv(runtimeData);
        })
        .catch((err) => console.error('环境扫描失败:', err));
    }
    const handleNavigate = (e: any) => setCurrentView(e.detail);
    window.addEventListener('navigate-view', handleNavigate);
    return () => window.removeEventListener('navigate-view', handleNavigate);
  }, [isDark, setLocalRuntimeEnv]);

  return (
    <div className={`flex flex-col h-screen w-full font-sans transition-colors duration-300 ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-800'}`}>
      <Header isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />
      
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />
        
        {/* 🌟 核心修复：当状态是 execution_monitor 时，渲染重构后的 <Editor /> 组件 */}
        {currentView === 'execution_monitor' && <Editor />}
        {currentView === 'team_builder' && <TeamBuilder />}
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'agent_builder' && <AgentBuilder />}
      </div>

      {/* 挂载全局弹窗 */}
      <SettingsModal />
      <LoginModal />
    </div>
  );
}