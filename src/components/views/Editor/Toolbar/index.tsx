"use client";

import React from 'react';
import { Hand, Maximize, ZoomIn, ZoomOut, Undo2, Paintbrush } from 'lucide-react';

export default function Toolbar({
  isPanMode, setIsPanMode, handleFocus, setTransform, handleUndo, historyLength, handleTidy, zoomControlsBottomOffset
}: any) {
  return (
    <div 
      className="no-canvas-pan absolute right-6 z-[45] flex items-center gap-1 bg-white dark:bg-[#2a2b30] border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg p-1.5 transition-all duration-300"
      style={{ bottom: zoomControlsBottomOffset }}
    >
      <button 
        onClick={() => setIsPanMode(!isPanMode)} 
        className={`p-2 rounded-lg transition-colors ${isPanMode ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'text-slate-500 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        title={isPanMode ? "取消抓手模式" : "使用抓手平移画布"}
      >
        <Hand size={16} />
      </button>
      <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-1" />
      <button onClick={handleFocus} className="p-2 text-slate-500 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors" title="聚焦视角"><Maximize size={16} /></button>
      <button onClick={() => setTransform((p: any) => ({...p, zoom: Math.min(p.zoom + 0.1, 3)}))} className="p-2 text-slate-500 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"><ZoomIn size={16} /></button>
      <button onClick={() => setTransform((p: any) => ({...p, zoom: Math.max(p.zoom - 0.1, 0.2)}))} className="p-2 text-slate-500 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"><ZoomOut size={16} /></button>
      <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-1" />
      <button onClick={handleUndo} disabled={historyLength === 0} className={`p-2 transition-colors rounded-lg ${historyLength === 0 ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'text-slate-500 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><Undo2 size={16} /></button>
      <button onClick={handleTidy} className="p-2 text-slate-500 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"><Paintbrush size={16} /></button>
    </div>
  );
}