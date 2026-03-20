"use client";

import React, { useState, useEffect } from 'react';
import { Target, ShieldCheck } from 'lucide-react';
import { dashboardData } from '@/lib/mock-data';

export default function DashboardView() {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('早上好');
    else if (hour < 18) setGreeting('下午好');
    else setGreeting('晚上好');
  }, []);

  return (
    <main className="flex-1 p-8 overflow-y-auto transition-colors duration-300 bg-white dark:bg-slate-950">
      <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
        
        {/* 顶部欢迎区 */}
        <div className="flex justify-between items-end mb-8 text-left">
          <div>
            <h2 className="text-5xl font-extrabold tracking-tighter bg-gradient-to-r bg-clip-text text-transparent from-slate-900 via-indigo-800 to-indigo-600 dark:from-white dark:via-indigo-300 dark:to-indigo-500">
              你好 J，{greeting}
            </h2>
            <div className="flex items-center gap-4 mt-3">
              <p className="text-sm font-semibold tracking-wide flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Target size={16} className="text-indigo-400" /> 
                当前展示：UnitedClaw 任务大盘视图，点击左侧图标体验不同工作流
              </p>
            </div>
          </div>
        </div>

        {/* 任务数据表格 */}
        <div className="rounded-2xl border shadow-xl relative transition-all duration-500 bg-white border-gray-100 dark:bg-slate-900 dark:border-slate-800">
          <table className="w-full text-sm border-collapse table-fixed text-left">
            <thead>
              <tr className="border-b transition-colors text-gray-400 bg-gray-50/30 border-gray-100 dark:text-slate-500 dark:bg-slate-800/50 dark:border-slate-800">
                <th className="py-5 pl-6 font-bold w-48 uppercase text-[10px] tracking-widest">任务名称</th>
                <th className="py-5 font-bold px-4 w-auto uppercase text-[10px] tracking-widest">协同进度</th>
                <th className="py-5 font-bold w-20 uppercase text-[10px] tracking-widest">状态</th>
                <th className="py-5 font-bold w-32 pl-4 uppercase text-[10px] tracking-widest text-center">项目成员</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.map((row, i) => (
                <tr key={i} className="border-b last:border-0 transition-colors border-gray-100 hover:bg-indigo-50/40 dark:border-slate-800 dark:hover:bg-indigo-900/20">
                  <td className="py-6 pl-6 truncate font-bold text-xs dark:text-slate-200">{row.name}</td>
                  <td className="py-6 px-4">
                    <div className="flex items-center gap-4 text-left">
                      <div className="flex-1 rounded-full h-3 overflow-hidden flex shadow-inner bg-slate-100 dark:bg-slate-800">
                        <div 
                          className={`h-full transition-all duration-1000 ${row.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                          style={{ width: `${row.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-[11px] font-black min-w-[35px] text-slate-500">{row.progress}%</span>
                    </div>
                  </td>
                  <td className="py-6">
                    <div className={`${row.statusColor} text-white text-[10px] text-center py-1.5 rounded font-black w-18 uppercase shadow-md`}>
                      {row.status}
                    </div>
                  </td>
                  <td className="py-6 relative group/members">
                    <div className="flex justify-center items-center -space-x-2 cursor-pointer">
                      <div className={`w-8 h-8 rounded-full ${row.admin.color} border-2 flex items-center justify-center text-xs text-white font-bold shadow-lg relative z-10 transition-transform group-hover/members:scale-110 border-white dark:border-slate-900`}>
                        {row.admin.name[0]}
                        <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5 border border-white dark:border-slate-900 shadow">
                          <ShieldCheck size={10} className="text-white" />
                        </div>
                      </div>
                      {row.members.map((m, mi) => (
                        <div key={mi} className={`w-8 h-8 rounded-full ${m.color} border-2 flex items-center justify-center text-xs text-white font-bold shadow-lg z-0 border-white dark:border-slate-900`}>
                          {m.name[0]}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}