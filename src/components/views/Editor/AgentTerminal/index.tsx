"use client";

import React, { useEffect, useRef, memo } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface AgentTerminalProps {
  terminalId: string;
  workingDirectory?: string;
  promptParam?: string;
  // 🌟 新增回调：当终端流中捕获到 Session ID 时触发
  onSessionIdFound?: (sessionId: string) => void;
}

const AgentTerminalComponent = ({ terminalId, workingDirectory, promptParam, onSessionIdFound }: AgentTerminalProps) => {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true; 
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      theme: { background: '#0c0c0c', foreground: '#4ade80' },
      fontSize: 13,
      fontFamily: 'monospace',
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    let ptyConnected = false;
    let isTerminalOpened = false;
    let outputBuffer = ''; // 🌟 终端流缓冲区，用于拼凑碎片化的 stdout 并进行正则匹配

    const safeFit = () => {
      if (!isMounted || !isTerminalOpened || !term.element) return;
      try {
        if (terminalRef.current && terminalRef.current.clientWidth > 0 && terminalRef.current.clientHeight > 0) {
          requestAnimationFrame(() => {
            if (!isMounted || !term.element) return;
            try {
              fitAddon.fit();
              if (typeof window !== 'undefined' && (window as any).electronAPI) {
                const cols = term.cols;
                const rows = term.rows;
                if (cols && rows && cols > 0 && rows > 0) {
                  (window as any).electronAPI.resizeTerminal(terminalId, cols, rows);
                }
              }
            } catch (error) {
              console.warn('Xterm fit skipped:', error);
            }
          });
        }
      } catch (error) {
        console.warn('Xterm fit skipped:', error);
      }
    };

    const connectPty = () => {
      if (ptyConnected || typeof window === 'undefined' || !(window as any).electronAPI) return;
      ptyConnected = true;
      
      (window as any).electronAPI.createTerminal(terminalId, workingDirectory)
        .then((res: any) => {
          if (!isMounted) return;
          if (res && res.success === false) {
            term.write(`\r\n\x1b[31m[System Error] 无法启动终端进程: ${res.msg}\x1b[0m\r\n`);
          } else {
             term.write(`\x1b[32m[PTY Connected] Environment ready.\x1b[0m\r\n`);
          }
        });

      term.onData((data: string) => {
        if (isMounted) {
          (window as any).electronAPI.terminalInput(terminalId, data);
        }
      });

      // 🌟 监听后端流出，解析 Session ID
      (window as any).electronAPI.onTerminalOutput(terminalId, (data: string) => {
        if (isMounted) {
          term.write(data);
          
          if (onSessionIdFound) {
            outputBuffer += data;
            // 保持缓冲区在合理长度，避免内存泄漏
            if (outputBuffer.length > 2000) outputBuffer = outputBuffer.slice(-2000);
            
            // 使用正则捕获可能的 Session ID 格式 (如 Session ID: abc123_xyz)
            const match = outputBuffer.match(/(?:session_id|session id|session)[\s:=]+([a-zA-Z0-9_-]{6,})/i);
            if (match && match[1]) {
              onSessionIdFound(match[1]);
              outputBuffer = ''; // 捕获到后清空，防止重复触发
            }
          }
        }
      });
    };

    const resizeObserver = new ResizeObserver(() => {
      if (!isMounted || !terminalRef.current) return;
      const width = terminalRef.current.clientWidth;
      const height = terminalRef.current.clientHeight;

      if (!isTerminalOpened && width > 0 && height > 0) {
        isTerminalOpened = true;
        term.open(terminalRef.current); 
        connectPty();
        setTimeout(() => safeFit(), 50);
      } 
      else if (isTerminalOpened && width > 0 && height > 0) {
        safeFit();
      }
    });

    resizeObserver.observe(terminalRef.current);

    return () => {
      isMounted = false;
      resizeObserver.disconnect();
      try {
        term.dispose();
      } catch (e) {}
    };
  }, [terminalId, workingDirectory, onSessionIdFound]);

  return (
    <div className="w-full h-full overflow-hidden rounded-lg bg-[#0c0c0c] flex relative min-h-[250px]">
      <div ref={terminalRef} className="w-full h-full absolute inset-0 p-2" />
    </div>
  );
};

const AgentTerminal = memo(AgentTerminalComponent, (prevProps, nextProps) => {
  return (
    prevProps.terminalId === nextProps.terminalId &&
    prevProps.workingDirectory === nextProps.workingDirectory &&
    prevProps.onSessionIdFound === nextProps.onSessionIdFound
  );
});
export default AgentTerminal;