import React from 'react';
import { Search, Github, Sun, Moon } from 'lucide-react';

const LogoUnitedClaw = ({ isDark }: { isDark: boolean }) => (
  <div className="relative w-12 h-12 flex items-center justify-center transition-all group shrink-0">
    <svg width="44" height="44" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 drop-shadow-md">
      <path d="M16 8L22.9282 12V20L16 24L9.0718 20V12L16 8Z" className={`${isDark ? 'fill-indigo-500/40' : 'fill-indigo-600'} transition-all duration-500`} stroke={isDark ? '#818CF8' : '#ffffff'} strokeWidth="1.5" />
      <g stroke={isDark ? '#4338CA' : '#C7D2FE'} strokeWidth="1" className="opacity-80">
        <path d="M22.9282 4L29.8564 8V16L22.9282 20V12L22.9282 4Z" fill={isDark ? '#312E81' : '#F5F3FF'} />
        <path d="M9.0718 4L2.14359 8V16L9.0718 20V12L9.0718 4Z" fill={isDark ? '#312E81' : '#F5F3FF'} />
      </g>
      <circle cx="16" cy="16" r="2.5" fill="white" className="animate-pulse shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
    </svg>
    <div className={`absolute inset-0 rounded-full blur-xl opacity-20 ${isDark ? 'bg-indigo-400' : 'bg-indigo-300'}`}></div>
  </div>
);

export default function Header({ isDark, onToggleTheme }: { isDark: boolean; onToggleTheme: () => void }) {
  return (
    <header className="border-b px-6 py-4 flex items-center justify-between shadow-sm z-50 shrink-0 dark:bg-slate-900 dark:border-slate-800 bg-white border-gray-200">
      <div className="flex items-center gap-12">
        <div className="flex items-center gap-3 group cursor-pointer h-12">
          <LogoUnitedClaw isDark={isDark} />
          <span className="text-2xl font-black tracking-tighter transition-colors translate-y-[-1px] dark:text-white text-slate-800">UnitedClaw</span>
        </div>
        <div className="relative group flex items-center">
          <Search className="absolute left-3 transition-colors dark:text-slate-500 text-slate-400" size={16} />
          <input type="text" placeholder="搜索任务、Agent 或文档..." className="w-80 h-10 pl-10 pr-12 rounded-full text-sm outline-none border dark:bg-slate-800 dark:border-transparent dark:text-white bg-slate-100 border-transparent text-slate-900" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onToggleTheme} className="p-2.5 rounded-lg active:scale-90 dark:bg-slate-800 dark:text-yellow-400 dark:hover:bg-slate-700 bg-indigo-50 text-indigo-600 hover:bg-indigo-100">
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-lg active:scale-90 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 bg-gray-100 text-slate-700 hover:bg-gray-200">
          <Github size={20} />
        </a>
      </div>
    </header>
  );
}