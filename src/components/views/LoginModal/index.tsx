"use client";

import React, { useState } from 'react';
import { X, Github, Key, ArrowRight, Loader2, Code2 } from 'lucide-react';
import { useUnitedStore } from '@/store/useUnitedStore';

export default function LoginModal() {
  const { isLoginModalOpen, setLoginModalOpen, setCurrentUser } = useUnitedStore();
  
  const [selectedProvider, setSelectedProvider] = useState<'github' | 'gitee' | null>(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isLoginModalOpen) return null;

  const handleLogin = async () => {
    if (!token.trim()) {
      setError('请输入 Access Token');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      if (selectedProvider === 'github') {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
          const res = await (window as any).electronAPI.githubLogin(token);
          
          if (res.success) {
            setCurrentUser({
              username: res.username,
              avatarUrl: `https://avatars.githubusercontent.com/${res.username}`,
              provider: 'github'
            });
            setLoginModalOpen(false);
          } else {
            setError(res.msg || '验证失败，请检查 Token 权限');
          }
        } else {
          setTimeout(() => {
            setCurrentUser({ username: 'Mock_User', provider: 'github' });
            setLoginModalOpen(false);
          }, 1000);
        }
      } else if (selectedProvider === 'gitee') {
        setError('Gitee 同步接口正在开发中...');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-[400px] bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col relative animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={() => {
            setLoginModalOpen(false);
            setSelectedProvider(null);
            setToken('');
            setError('');
          }}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-slate-800 dark:hover:text-white transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 z-10"
        >
          <X size={18} />
        </button>

        <div className="px-8 pt-10 pb-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-4">
            <Key size={32} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">登录 UnitedClaw</h2>
          <p className="text-sm text-slate-500 text-center mb-8">
            连接代码托管平台，实现本地工作区 (uc_workspace) 的云端免密同步。
          </p>

          {!selectedProvider ? (
            <div className="w-full space-y-3">
              <button 
                onClick={() => setSelectedProvider('github')}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-[#222327] dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Github size={20} className="text-slate-700 dark:text-slate-200" />
                  <span className="font-bold text-sm text-slate-700 dark:text-slate-200">使用 GitHub 登录</span>
                </div>
                <ArrowRight size={16} className="text-slate-400 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
              </button>

              <button 
                onClick={() => setSelectedProvider('gitee')}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-[#222327] dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Code2 size={20} className="text-red-500" />
                  <span className="font-bold text-sm text-slate-700 dark:text-slate-200">使用 Gitee 登录</span>
                </div>
                <ArrowRight size={16} className="text-slate-400 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
              </button>
            </div>
          ) : (
            <div className="w-full animate-in slide-in-from-right-4">
              <div className="flex items-center gap-2 mb-4">
                <button 
                  onClick={() => { setSelectedProvider(null); setError(''); }}
                  className="text-xs text-slate-500 hover:text-indigo-500 flex items-center gap-1"
                >
                  返回上一步
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-2">
                    <span>{selectedProvider === 'github' ? 'GitHub' : 'Gitee'} Access Token</span>
                    <a href={selectedProvider === 'github' ? 'https://github.com/settings/tokens' : 'https://gitee.com/profile/personal_access_tokens'} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">
                      去获取 Token
                    </a>
                  </label>
                  <input 
                    type="password" 
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder={`输入 ${selectedProvider === 'github' ? 'ghp_...' : ''}`}
                    className="w-full bg-white dark:bg-[#121212] border border-gray-200 dark:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-colors text-slate-800 dark:text-slate-200 shadow-sm"
                  />
                  {error && <p className="text-xs text-red-500 mt-2 font-medium">{error}</p>}
                </div>

                <button 
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : '授权并同步工作区'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}