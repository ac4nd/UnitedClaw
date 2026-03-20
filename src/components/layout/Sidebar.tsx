import React from 'react';
import { User, LogOut,Layout, Boxes, PlayCircle, Calendar, Settings, Bot } from 'lucide-react';
// 引入 store 获取修改方法
import { useUnitedStore } from '@/store/useUnitedStore';
import LoginModal from '@/components/views/LoginModal'; // 引入刚才写的弹窗
export type ViewType = 'execution_monitor' | 'team_builder' | 'dashboard';

export default function Sidebar({ currentView, onViewChange }: { currentView: ViewType; onViewChange: (view: ViewType) => void }) {
  // 提取 setSettingsOpen
  const { currentUser, setLoginModalOpen, setCurrentUser,setSettingsOpen } = useUnitedStore();
  return (
    <aside className="w-16 border-r flex flex-col items-center py-6 gap-6 relative z-[60] shrink-0 dark:bg-slate-900 dark:border-slate-800 bg-gray-50 border-gray-200">
      <Layout size={24} onClick={() => onViewChange('dashboard')} className={`cursor-pointer transition-colors ${currentView === 'dashboard' ? 'text-indigo-500' : 'text-slate-500 hover:text-indigo-400'}`} />
      {/* 新增：智能体编辑器入口 */}
      <Bot size={24} onClick={() => onViewChange('agent_builder')} className={`cursor-pointer transition-colors ${currentView === 'agent_builder' ? 'text-indigo-500' : 'text-slate-500 hover:text-indigo-400'}`} title="智能体构建" />
      <Boxes size={24} onClick={() => onViewChange('team_builder')} className={`cursor-pointer transition-colors ${currentView === 'team_builder' ? 'text-indigo-500' : 'text-slate-500 hover:text-indigo-400'}`} />
      <PlayCircle size={24} onClick={() => onViewChange('execution_monitor')} className={`cursor-pointer transition-colors ${currentView === 'execution_monitor' ? 'text-green-500 animate-pulse' : 'text-slate-500 hover:text-green-400'}`} />
      <Calendar size={24} className="text-slate-500 mt-auto cursor-pointer hover:text-indigo-500 transition-colors" />
      
      {/* ================= 底部：头像与登录区 ================= */}
      <div className="mt-auto pb-4 flex flex-col items-center gap-4">
        
        {/* 头像区域 */}
        <div 
          onClick={() => {
            if (!currentUser) setLoginModalOpen(true);
          }}
          className={`relative group flex flex-col items-center gap-1 cursor-pointer ${!currentUser ? 'opacity-70 hover:opacity-100' : ''}`}
        >
          {currentUser?.avatarUrl ? (
            <img 
              src={currentUser.avatarUrl} 
              alt={currentUser.username} 
              className="w-8 h-8 rounded-full border-2 border-transparent group-hover:border-indigo-500 transition-colors object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center group-hover:bg-slate-700 transition-colors">
              <User size={16} className="text-slate-400" />
            </div>
          )}

          {/* 状态文字 (仅未登录时显示，或作为悬浮提示) */}
          <span className="text-[10px] font-bold text-slate-400">
            {currentUser ? currentUser.username.substring(0, 5) : '未登录'}
          </span>

          {/* 悬浮菜单: 退出登录 (仅登录后出现) */}
          {currentUser && (
            <div className="absolute left-12 bottom-0 w-max bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
              <button 
                onClick={(e) => { e.stopPropagation(); setCurrentUser(null); }}
                className="flex items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-slate-700 rounded-lg w-full"
              >
                <LogOut size={14} /> 退出登录
              </button>
            </div>
          )}
        </div>

      </div>

      {/* 挂载登录弹窗，保证它存在于 DOM 树中 */}
      <LoginModal />
      {/* 重点修改：点击设置图标触发弹窗 */}
      <div className="relative group" title="全局设置" onClick={() => setSettingsOpen(true)}>
        <Settings size={24} className="text-slate-500 mb-4 cursor-pointer hover:text-indigo-500 transition-colors" />
      </div>
    </aside>
  );
}