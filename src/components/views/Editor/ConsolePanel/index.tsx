"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal, MessageSquare, ChevronDown, ChevronUp, 
  Send, Play, Trash2, Activity, CheckCircle2, Bot, User 
} from 'lucide-react';

interface ConsolePanelProps {
  isOpen: boolean;
  onToggle: () => void;
  height: number;
  setHeight: (h: number) => void;
  leftOffset: number;
  hasChatTrigger: boolean; 
  onSendMessage: (content: string) => void; // 🌟 接收发送消息的函数
}

export default function ConsolePanel({ isOpen, onToggle, height, setHeight, leftOffset, hasChatTrigger, onSendMessage }: ConsolePanelProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'logs'>('chat');
  const [chatInput, setChatInput] = useState('');
  const [localMessages, setLocalMessages] = useState<any[]>([]); // 🌟 用于在界面上展示刚刚发送的消息
  
  const isResizing = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isOpen) return;
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'row-resize';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const newHeight = window.innerHeight - e.clientY;
    if (newHeight > 150 && newHeight < window.innerHeight * 0.8) {
      setHeight(newHeight);
    }
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'default';
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, []);

  const handleSend = () => {
    if (!chatInput.trim() || !hasChatTrigger) return;
    
    // 1. 将消息渲染到本地 UI
    setLocalMessages(prev => [...prev, { id: Date.now(), role: 'user', content: chatInput }]);
    
    // 2. 调用父组件传递的真实发送逻辑 (写入到目标的 JSON)
    onSendMessage(chatInput);
    
    // 3. 清空输入框
    setChatInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div 
      className="absolute bottom-0 right-0 z-40 bg-white/95 dark:bg-[#1a1b1e]/95 backdrop-blur-xl border-t border-gray-200 dark:border-slate-800 flex flex-col shadow-[0_-10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_30px_rgba(0,0,0,0.2)] transition-all duration-300 ease-in-out no-canvas-pan"
      style={{ left: `${leftOffset}px`, height: isOpen ? `${height}px` : '40px', transitionProperty: isResizing.current ? 'none' : 'height, left' }}
    >
      <div 
        className="h-10 flex items-center justify-between px-4 shrink-0 bg-slate-50/80 dark:bg-[#121212]/80 border-b border-gray-100 dark:border-slate-800/80 group cursor-pointer"
        onClick={!isOpen ? onToggle : undefined}
      >
        {isOpen && (
          <div className="absolute top-0 left-0 right-0 h-1.5 cursor-row-resize z-50 flex justify-center -translate-y-1/2" onMouseDown={handleMouseDown}>
            <div className="w-12 h-1 bg-gray-300 dark:bg-slate-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        <div className="flex items-center gap-6 h-full">
          <button 
            onClick={(e) => { e.stopPropagation(); if(!isOpen) onToggle(); setActiveTab('chat'); }}
            className={`h-full flex items-center gap-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'chat' && isOpen ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <MessageSquare size={14} /> 调试对话框
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); if(!isOpen) onToggle(); setActiveTab('logs'); }}
            className={`h-full flex items-center gap-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'logs' && isOpen ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Terminal size={14} /> 执行日志
          </button>
        </div>

        <div className="flex items-center gap-3">
          {isOpen && (
            <div className="flex items-center gap-2 mr-2">
              <button className="p-1 text-slate-400 hover:text-red-500 transition-colors" onClick={() => setLocalMessages([])} title="清空对话"><Trash2 size={14}/></button>
            </div>
          )}
          <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="p-1 text-slate-400 hover:text-indigo-500 transition-colors bg-white dark:bg-slate-800 rounded shadow-sm border border-gray-200 dark:border-slate-700">
            {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col bg-white dark:bg-[#1a1b1e]">
              <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                {hasChatTrigger ? (
                  <div className="flex justify-center my-2">
                    <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">已连接 Trigger，可直接发送消息测试</span>
                  </div>
                ) : (
                  <div className="flex justify-center my-2">
                    <span className="text-[10px] text-amber-500 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-2 py-0.5 rounded-full">未检测到输入触发器，请从素材箱拖入</span>
                  </div>
                )}

                {/* 🌟 渲染本地聊天记录 */}
                {localMessages.map((msg, idx) => (
                  <div key={idx} className={`flex items-start gap-3 w-3/4 ${msg.role === 'user' ? 'self-end flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className={`p-3 text-sm shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-l-xl rounded-br-xl' : 'bg-slate-50 dark:bg-[#2a2b30] border border-gray-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-r-xl rounded-bl-xl'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-3 bg-white dark:bg-[#1a1b1e] border-t border-gray-100 dark:border-slate-800 transition-all duration-300">
                <div className={`relative flex items-center ${!hasChatTrigger && 'opacity-50 pointer-events-none grayscale'}`}>
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={hasChatTrigger ? "向用户输入触发器发送指令..." : "请先在画布中添加 User Input 节点"} 
                    className="w-full bg-slate-50 dark:bg-[#2a2b30] border border-gray-200 dark:border-slate-700 focus:border-indigo-500 rounded-lg pl-4 pr-10 py-2.5 text-sm outline-none dark:text-white transition-colors shadow-inner"
                  />
                  <button onClick={handleSend} disabled={!chatInput.trim() || !hasChatTrigger} className="absolute right-2 p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-md transition-colors disabled:opacity-50">
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="flex-1 flex flex-col bg-[#0c0c0c] text-slate-300 font-mono text-[12px] p-4 overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-2 text-slate-500 mb-3 border-b border-slate-800 pb-2">
                <Activity size={14} className="text-emerald-500"/>
                <span>Execution Logs</span>
              </div>
              <div className="space-y-1.5 opacity-80">
                <p><span className="text-blue-400">[SYSTEM]</span> Ready.</p>
                {localMessages.map((msg, idx) => (
                  <p key={`log-${idx}`} className="text-emerald-400">
                    <span className="text-blue-400">[TRIGGER]</span> Captured User Input: {msg.content.substring(0, 20)}...
                  </p>
                ))}
                <p className="mt-2 text-slate-500 animate-pulse">_</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}