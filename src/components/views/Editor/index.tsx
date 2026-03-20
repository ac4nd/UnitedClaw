"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import * as Icons from 'lucide-react';
import { 
  Play, Power, Trash2, MoreHorizontal, Bot, Sparkles, Filter, Replace, 
  FileJson, SplitSquareHorizontal, GitMerge, Repeat, Globe, Webhook, Code, 
  UserCheck, Hash, MessageSquare, Plus, Settings, GripVertical,
  Maximize, ZoomIn, ZoomOut, Undo2, Paintbrush, PanelLeftOpen, Maximize2,
  LayoutTemplate, ChevronDown, X, User, Terminal, ShieldCheck, Mail, Phone,
  MessageSquareText, Zap, Save, RefreshCw, Check, Clock, PlayCircle, Keyboard,
  ArrowRight, Database, ClipboardList, Network, Hand, Cable
} from 'lucide-react';
import { useUnitedStore } from '@/store/useUnitedStore';
import { createTeamMessage } from '@/lib/messageCreator';
import { AnyMaterialNode, IConnectorNode } from '@/interface/material';

import MaterialDrawer from './MaterialDrawer';
import ConsolePanel from './ConsolePanel';
import Toolbar from './Toolbar';
import NodeDetail from './NodeDetail';

const AgentTerminal = dynamic(() => import('./AgentTerminal'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0c0c0c] text-slate-500 text-xs font-mono">
      Initializing PTY Environment...
    </div>
  )
});

const NODE_WIDTH = 120;
const NODE_HEIGHT = 120;

// 🌟 辅助函数 1：获取节点边界尺寸
const getNodeRect = (node: AnyMaterialNode) => {
  const isAgent = node.type === 'member';
  const isTaskCenter = node.type === 'tool-task-center';
  const role = (node as any).role || 'executor';
  
  const isReviewer = isAgent && role === 'reviewer';
  const isLeader = isAgent && role === 'leader';
  
  const w = node.width || (isReviewer ? 120 : (isLeader ? 130 : (isAgent ? 260 : (isTaskCenter ? 240 : NODE_WIDTH))));
  const h = node.height || (isReviewer ? 120 : (isLeader ? 130 : (isAgent ? 68 : (isTaskCenter ? 68 : NODE_HEIGHT))));
  
  return { x: node.x, y: node.y, w, h };
};

// 🌟 辅助函数 2：精准边界吸附算法
const getClosestPointAndNormalOnRect = (px: number, py: number, rect: {x: number, y: number, w: number, h: number}) => {
  const { x, y, w, h } = rect;
  
  if (px >= x && px <= x + w && py >= y && py <= y + h) {
      const dl = px - x;
      const dr = (x + w) - px;
      const dt = py - y;
      const db = (y + h) - py;
      const min = Math.min(dl, dr, dt, db);
      if (min === dt) return { p: { x: px, y: y }, nx: 0, ny: -1 };
      if (min === db) return { p: { x: px, y: y + h }, nx: 0, ny: 1 };
      if (min === dl) return { p: { x: x, y: py }, nx: -1, ny: 0 };
      return { p: { x: x + w, y: py }, nx: 1, ny: 0 };
  }

  const cx = Math.max(x, Math.min(px, x + w));
  const cy = Math.max(y, Math.min(py, y + h));

  let nx = 0, ny = 0;
  if (cx === x) nx = -1;
  else if (cx === x + w) nx = 1;
  
  if (cy === y) ny = -1;
  else if (cy === y + h) ny = 1;

  if (nx !== 0 && ny !== 0) {
      if (Math.abs(px - cx) > Math.abs(py - cy)) ny = 0;
      else nx = 0;
  } else if (nx === 0 && ny === 0) {
      nx = 1; 
  }
  return { p: { x: cx, y: cy }, nx, ny };
};

// 🌟 辅助函数 3：寻找最近的吸附目标
const findClosestNode = (px: number, py: number, allNodes: AnyMaterialNode[], selfId: string) => {
  let closest = null;
  let minDist = 60; 
  for (const n of allNodes) {
      if (n.type === 'tool-connector' || n.type.startsWith('container') || n.id === selfId) continue;
      const rect = getNodeRect(n);
      const dx = Math.max(rect.x - px, 0, px - (rect.x + rect.w));
      const dy = Math.max(rect.y - py, 0, py - (rect.y + rect.h));
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < minDist) {
          minDist = dist;
          closest = n;
      }
  }
  return closest;
};

// 🌟 辅助函数 4：获取图标
const getIconForType = (type: string) => {
  const map: any = {
    'tool-connector': Cable,
    'tool-task-center': ClipboardList,
    'tool-trigger-input': Keyboard,
    'tool-trigger-schedule': Clock, 'tool-trigger-webhook': Webhook, 'tool-trigger-manual': PlayCircle,
    'tool-filter': Filter, 'tool-map': Replace, 'tool-json': FileJson,
    'tool-if': SplitSquareHorizontal, 'tool-switch': GitMerge, 'tool-loop': Repeat,
    'tool-http': Globe, 'tool-webhook': Webhook, 'tool-code': Code,
    'tool-wait': UserCheck, 'tool-slack': Hash, 'tool-tg': MessageSquare,
  };
  return map[type] || Sparkles;
};

export default function Editor() {
  const { projects, selectedProjectId, agents } = useUnitedStore();
  const project = projects.find(p => p.id === selectedProjectId);
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [drawerWidth, setDrawerWidth] = useState(280);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);

  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [consoleHeight, setConsoleHeight] = useState(300);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, zoom: 1 });
  
  const [nodes, setNodes] = useState<AnyMaterialNode[]>([]);
  const [history, setHistory] = useState<{nodes: AnyMaterialNode[]}[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const lastSavedState = useRef(JSON.stringify({ nodes: [] }));

  const [triggerMockInput, setTriggerMockInput] = useState('你好！请帮我分析一下当前的数据。');
  const [triggerPreviewPayload, setTriggerPreviewPayload] = useState<any>(null);
  const [promptParam, setPromptParam] = useState('');

  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingNode, setResizingNode] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ w: 0, h: 0, x: 0, y: 0 });
  const [activeContextMenu, setActiveContextMenu] = useState<string | null>(null);
  const [activeNodeDetails, setActiveNodeDetails] = useState<any | null>(null);

  const [isPanMode, setIsPanMode] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [draggingConnectorEnd, setDraggingConnectorEnd] = useState<{id: string, end: 'start'|'end'} | null>(null);
  const [hoveredConnId, setHoveredConnId] = useState<string | null>(null);

  const derivedEdges = useMemo(() => {
    return nodes.filter(n => n.type === 'tool-connector' && (n as IConnectorNode).connectorParams?.sourceId && (n as IConnectorNode).connectorParams?.targetId).map(n => ({
        id: n.id,
        source: (n as IConnectorNode).connectorParams!.sourceId as string,
        target: (n as IConnectorNode).connectorParams!.targetId as string
    }));
  }, [nodes]);

  const hasChatTrigger = useMemo(() => {
    return nodes.some(n => n.type === 'tool-trigger-input');
  }, [nodes]);

  const currentActiveNode: any = activeNodeDetails ? (nodes.find(n => n.id === activeNodeDetails.id) || activeNodeDetails) : null;

  const connectedAgents = derivedEdges
    .filter(e => e.source === currentActiveNode?.id)
    .map(e => nodes.find(n => n.id === e.target))
    .filter(n => n && n.type === 'member');
  
  const previewTargetTo = connectedAgents.length > 1 
    ? connectedAgents.map(a => a.title) 
    : (connectedAgents[0]?.title || "unconnected_agent");

  useEffect(() => {
    if (currentActiveNode?.type === 'tool-trigger-input') {
      const payload = createTeamMessage("user_trigger", previewTargetTo, triggerMockInput || "你好！");
      setTriggerPreviewPayload(payload);
    }
  }, [triggerMockInput, previewTargetTo, currentActiveNode]);

  const handleSessionIdFound = useCallback((nodeId: string, sessionId: string) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, sessionId } as AnyMaterialNode : n));
  }, []);

  const handleConsoleSend = (inputContent: string) => {
    setTriggerMockInput(inputContent);
    setNodes(prev => prev.map(n => {
      if (n.type === 'tool-trigger-input') {
        return { ...n, outputData: createTeamMessage("user_trigger", "downstream", inputContent) } as AnyMaterialNode;
      }
      return n;
    }));
  };

  const handleExecuteNode = async (nodeId: string) => {
    const node: any = nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (node.type === 'tool-trigger-input') {
      const payload = createTeamMessage("user_trigger", "downstream", triggerMockInput);
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, outputData: payload } as AnyMaterialNode : n));
      return;
    } 
    else if (node.type === 'tool-task-center') {
      const pendingTasks = project?.tasks?.tasks?.filter((t: any) => t.status !== 'done' && !t.completed) || [];
      const payloadContent = pendingTasks.length > 0 
        ? `【任务中心派发】请处理以下待办任务：\n${pendingTasks.map((t:any) => `- [ ] ${t.title} (ID: ${t.id})`).join('\n')}` 
        : "【任务中心】当前没有待处理的待办任务。";
      const payload = createTeamMessage("task_center", "downstream", payloadContent);
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, outputData: payload } as AnyMaterialNode : n));
      return;
    }
    else if (node.type === 'member') {
      const incomingEdges = derivedEdges.filter(e => e.target === nodeId);
      const sourceNodes: any[] = incomingEdges.map(e => nodes.find(n => n.id === e.source)).filter(Boolean);
      
      if (sourceNodes.length === 0) {
        alert(`❌ 节点 [${node.title}] 没有上游输入连接！请先用数据线连线。`);
        return;
      }

      const sourceNode = sourceNodes[0];
      if (!sourceNode.outputData) {
        alert(`⚠️ 上游节点 [${sourceNode.title || '未知'}] 尚未执行或没有输出数据，请先点击它上方的 ▶️ 按钮执行！`);
        return;
      }

      let payloadContent = sourceNode.outputData.content;
      
      if (promptParam && promptParam.trim()) {
        payloadContent = `${promptParam.trim()}\n\n${payloadContent}`;
      }
      
      const messagePayload = createTeamMessage(sourceNode.title || "upstream", node.title, payloadContent);

      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        try {
          await (window as any).electronAPI.sendAgentMessage(project?.name, node.title, messagePayload);
          
          const escapedContent = payloadContent.replace(/"/g, '\\"');
          const agentModel = node.model || 'Qwen3.5 Plus';
          let cliCommand = `opencode --agent "${node.title}" --model "${agentModel}"`;
          if (node.sessionId) cliCommand += ` --session "${node.sessionId}"`; 
          cliCommand += ` run "${escapedContent}"\r`;

          (window as any).electronAPI.terminalInput(node.id, cliCommand);
          setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, outputData: messagePayload } as AnyMaterialNode : n));
        } catch (e) {
          console.error(`向 ${node.title} 发送执行指令失败:`, e);
        }
      }
    } else {
      alert(`工具节点 [${node.title}] 的处理逻辑暂未实现。`);
    }
  };

  useEffect(() => {
    const loadWorkflowData = async () => {
      if (project?.name && typeof window !== 'undefined' && (window as any).electronAPI?.loadWorkflow) {
        setIsLoading(true);
        const res = await (window as any).electronAPI.loadWorkflow(project.name);
        if (res && res.success && res.data) {
          const n8nData = res.data;
          
          const restoredNodes = (n8nData.nodes || []).map((n: any) => ({
            id: n.id, 
            type: n.type, 
            title: n.parameters?.title || n.name, 
            x: n.position[0], 
            y: n.position[1], 
            ...(n.parameters || {}) 
          })) as AnyMaterialNode[];
          
          const hasNewConnectors = restoredNodes.some(n => n.type === 'tool-connector');
          if (!hasNewConnectors && n8nData.connections) {
            Object.keys(n8nData.connections).forEach(sourceId => {
              const connectionsArr = n8nData.connections[sourceId].main?.[0] || [];
              connectionsArr.forEach((targetData: any) => {
                const sNode = restoredNodes.find(n => n.id === sourceId);
                const tNode = restoredNodes.find(n => n.id === targetData.node);
                if (sNode && tNode) {
                  restoredNodes.push({
                    id: `conn-${Date.now()}-${Math.random()}`,
                    type: 'tool-connector',
                    title: '数据连线',
                    x: 0, y: 0,
                    isActive: true,
                    connectorParams: {
                      sourceId: sourceId,
                      targetId: targetData.node,
                      startPos: { x: sNode.x, y: sNode.y },
                      endPos: { x: tNode.x, y: tNode.y },
                      sourceAnchor: { dx: 1, dy: 0.5, nx: 1, ny: 0 },
                      targetAnchor: { dx: 0, dy: 0.5, nx: -1, ny: 0 }
                    }
                  } as IConnectorNode);
                }
              });
            });
          }

          setNodes(restoredNodes);
          lastSavedState.current = JSON.stringify({ nodes: restoredNodes });
          setIsDirty(false);
        }
        setIsLoading(false);
      }
    };
    loadWorkflowData();
  }, [project?.name]);

  useEffect(() => {
    if (!isLoading && !draggingNode && !resizingNode && !isPanning && !draggingConnectorEnd) {
      const currentState = JSON.stringify({ nodes });
      setIsDirty(currentState !== lastSavedState.current);
    }
  }, [nodes, isLoading, draggingNode, resizingNode, isPanning, draggingConnectorEnd]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '您有未保存的画布更改，确定要离开吗？'; 
      }
    };
    const handleCustomNavigate = (e: any) => {
      if (isDirty) {
        if (!window.confirm('您有未保存的画布更改，确定要离开吗？更改将会丢失。')) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('navigate-view', handleCustomNavigate, { capture: true });
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('navigate-view', handleCustomNavigate, { capture: true });
    };
  }, [isDirty]);

  const handleSaveWorkflow = async () => {
    if (!project?.name) return;
    setIsSaving(true);
    
    const n8nNodes = nodes.map(n => {
      const { id, type, title, x, y, outputData, ...restParams } = n as any;
      return {
        id: id, 
        name: title || id, 
        type: type, 
        typeVersion: 1, 
        position: [Math.round(x), Math.round(y)],
        parameters: { title: title, ...restParams }
      };
    });

    const connections: any = {};
    derivedEdges.forEach(edge => {
      if (!connections[edge.source]) connections[edge.source] = { main: [[]] };
      connections[edge.source].main[0].push({ node: edge.target, type: "main", index: 0 });
    });

    const workflowData = {
      name: `${project.name} Workflow`, nodes: n8nNodes, connections: connections, active: true,
      settings: { executionOrder: "v1" }, versionId: "1.0", id: `wf-${project.id}`
    };

    if (typeof window !== 'undefined' && (window as any).electronAPI?.saveWorkflow) {
      const res = await (window as any).electronAPI.saveWorkflow(project.name, workflowData);
      if (res && res.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
        lastSavedState.current = JSON.stringify({ nodes });
        setIsDirty(false);
      } else {
        alert(`保存失败: ${res?.msg}`);
      }
    }
    setIsSaving(false);
  };

  const getCanvasCoords = (clientX: number, clientY: number) => {
    if (!wrapperRef.current) return { x: 0, y: 0 };
    const rect = wrapperRef.current.getBoundingClientRect();
    return { x: (clientX - rect.left - transform.x) / transform.zoom, y: (clientY - rect.top - transform.y) / transform.zoom };
  };

  const saveHistory = () => {
    setHistory(prev => {
      const newHistory = [...prev, { nodes: JSON.parse(JSON.stringify(nodes)) }];
      if (newHistory.length > 20) return newHistory.slice(newHistory.length - 20);
      return newHistory;
    });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-canvas-pan')) return;

    if (isPanMode) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!wrapperRef.current) return;

    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const coords = getCanvasCoords(e.clientX, e.clientY);
    
    if (draggingConnectorEnd) {
      setNodes(prev => prev.map(n => {
        if (n.id === draggingConnectorEnd.id && n.type === 'tool-connector') {
          const cNode = n as IConnectorNode;
          const newParams = { ...cNode.connectorParams! };
          if (draggingConnectorEnd.end === 'start') newParams.startPos = coords; 
          else newParams.endPos = coords;
          return { ...n, connectorParams: newParams };
        }
        return n;
      }));
    } 
    else if (resizingNode) {
      const dx = coords.x - resizeStart.x; const dy = coords.y - resizeStart.y;
      setNodes(nodes.map(n => n.id === resizingNode ? { ...n, width: Math.max(200, resizeStart.w + dx), height: Math.max(150, resizeStart.h + dy) } as AnyMaterialNode : n));
    } 
    else if (draggingNode) {
      setNodes(nodes.map(n => n.id === draggingNode ? { ...n, x: coords.x - dragOffset.x, y: coords.y - dragOffset.y } as AnyMaterialNode : n));
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent) => { 
    if (isPanning) { setIsPanning(false); return; }

    if (draggingConnectorEnd) {
      const conn = nodes.find(n => n.id === draggingConnectorEnd.id) as IConnectorNode;
      if (conn) {
          const pos = draggingConnectorEnd.end === 'start' ? conn.connectorParams!.startPos : conn.connectorParams!.endPos;
          const snapped = findClosestNode(pos.x, pos.y, nodes, conn.id);
          
          setNodes(prev => prev.map(n => {
              if (n.id === conn.id) {
                  const cp: any = { ...conn.connectorParams! };
                  if (draggingConnectorEnd.end === 'start') {
                      if (snapped) {
                          cp.sourceId = snapped.id;
                          const sRect = getNodeRect(snapped);
                          const closest = getClosestPointAndNormalOnRect(pos.x, pos.y, sRect);
                          cp.sourceAnchor = { dx: (closest.p.x - sRect.x) / sRect.w, dy: (closest.p.y - sRect.y) / sRect.h, nx: closest.nx, ny: closest.ny };
                      } else {
                          cp.sourceId = null; cp.sourceAnchor = null;
                      }
                  } else {
                      if (snapped) {
                          cp.targetId = snapped.id;
                          const tRect = getNodeRect(snapped);
                          const closest = getClosestPointAndNormalOnRect(pos.x, pos.y, tRect);
                          cp.targetAnchor = { dx: (closest.p.x - tRect.x) / tRect.w, dy: (closest.p.y - tRect.y) / tRect.h, nx: closest.nx, ny: closest.ny };
                      } else {
                          cp.targetId = null; cp.targetAnchor = null;
                      }
                  }
                  return { ...n, connectorParams: cp } as IConnectorNode;
              }
              return n;
          }));
      }
      setDraggingConnectorEnd(null);
      saveHistory();
      return;
    }

    setDraggingNode(null); setResizingNode(null); setActiveContextMenu(null); 
  };

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const handleWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('.no-canvas-pan')) return; 
      e.preventDefault(); 
      if (e.ctrlKey || e.metaKey) {
        setTransform(prev => {
          const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1; 
          const newZoom = Math.min(Math.max(prev.zoom * zoomFactor, 0.2), 3); 
          const rect = wrapper.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          return { zoom: newZoom, x: mouseX - (mouseX - prev.x) * (newZoom / prev.zoom), y: mouseY - (mouseY - prev.y) * (newZoom / prev.zoom) };
        });
      } else {
        setTransform(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
    };
    wrapper.addEventListener('wheel', handleWheel, { passive: false });
    return () => wrapper.removeEventListener('wheel', handleWheel);
  }, []);

  const handleDragEnter = (e: React.DragEvent) => e.preventDefault();
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const typeId = e.dataTransfer.getData('text/plain');
    if (!typeId || !wrapperRef.current) return;
    
    const defaultParamsStr = e.dataTransfer.getData('application/json');
    const defaultParams = defaultParamsStr ? JSON.parse(defaultParamsStr) : {};

    saveHistory(); 
    const { x: dropX, y: dropY } = getCanvasCoords(e.clientX, e.clientY);
    let newNode: any = null;

    if (typeId.startsWith('human-')) {
      const human = project?.users?.find((h: any) => h.id === typeId.replace('human-', ''));
      newNode = { 
        id: `node-${Date.now()}`, type: 'human', title: human?.name || 'Human Role', 
        x: dropX - NODE_WIDTH/2, y: dropY - NODE_HEIGHT/2, 
        iconName: 'User', color: human?.color?.replace('bg-', 'text-') || 'text-indigo-500', 
        isActive: true, 
        ...defaultParams 
      };
    } 
    else if (typeId.startsWith('container-')) {
      let title = 'Container';
      if (typeId === 'container-rect') title = 'Agent Scope';
      if (typeId === 'container-round') title = 'Workflow Context';
      newNode = { 
        id: `node-${Date.now()}`, type: typeId, title: title, 
        x: dropX - 150, y: dropY - 100, width: 300, height: 200, 
        iconName: null, color: 'text-sky-500', 
        isActive: true,
        ...defaultParams 
      };
    }
    else if (typeId === 'tool-connector') {
      newNode = {
        id: `conn-${Date.now()}`, type: 'tool-connector', title: '数据连线',
        x: 0, y: 0, 
        isActive: true,
        connectorParams: {
          sourceId: null, targetId: null,
          startPos: { x: dropX - 60, y: dropY },
          endPos: { x: dropX + 60, y: dropY }
        }
      };
    }
    else if (typeId.startsWith('tool-')) {
      let title = typeId.replace('tool-', '').toUpperCase();
      let color = 'text-indigo-500';
      if (title.startsWith('TRIGGER-')) { title = title.replace('TRIGGER-', '') + ' TRIGGER'; color = 'text-amber-500'; }
      if (title === 'TASK-CENTER') color = 'text-emerald-500'; 
      newNode = { 
        id: `node-${Date.now()}`, type: typeId, title: title, 
        x: dropX - NODE_WIDTH/2, y: dropY - NODE_HEIGHT/2, 
        iconName: null, color: color, 
        isActive: true, ...defaultParams 
      };
    } 
    else {
      const member = agents?.find((m: any) => m.id === typeId);
      if (member) {
        const role = member.role || 'executor';
        const isReviewer = role === 'reviewer';
        const isLeader = role === 'leader';
        const nodeW = isReviewer ? 120 : (isLeader ? 130 : 260);
        const nodeH = isReviewer ? 120 : (isLeader ? 130 : 68);
        const nodeIdName = member.id.replace('.md', '');
        newNode = { 
          id: `node-${Date.now()}`, type: 'member', title: nodeIdName, role: role,
          x: dropX - nodeW/2, y: dropY - nodeH/2, 
          isActive: true, sessionId: null, ...defaultParams 
        };
        newNode.color = defaultParams.iconColor || member.color;
      }
    }
    
    if (!newNode) return;
    setNodes([...nodes, newNode]);
  };

  const handleUndo = () => { if (history.length > 0) { const lastState = history[history.length - 1]; setNodes(lastState.nodes); setHistory(history.slice(0, -1)); } };
  const handleFocus = () => {
    const validNodes = nodes.filter(n => n.type !== 'tool-connector');
    if (validNodes.length === 0 || !wrapperRef.current) return;
    const minX = Math.min(...validNodes.map(n => n.x)); const maxX = Math.max(...validNodes.map(n => n.x + (n.width || NODE_WIDTH)));
    const minY = Math.min(...validNodes.map(n => n.y)); const maxY = Math.max(...validNodes.map(n => n.y + (n.height || NODE_HEIGHT)));
    const rect = wrapperRef.current.getBoundingClientRect();
    const padding = 120; 
    const zoomX = rect.width / (maxX - minX + padding * 2); const zoomY = rect.height / (maxY - minY + padding * 2);
    const newZoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.3), 1.5);
    setTransform({ zoom: newZoom, x: rect.width / 2 - ((minX + maxX) / 2) * newZoom, y: rect.height / 2 - ((minY + maxY) / 2) * newZoom });
  };
  const handleTidy = () => { saveHistory(); setNodes(nodes.map(n => n.type !== 'tool-connector' ? { ...n, x: Math.round(n.x / 40) * 40, y: Math.round(n.y / 40) * 40 } : n) as AnyMaterialNode[]); };

  const deleteNode = (id: string) => { 
    saveHistory(); 
    setNodes(nodes.filter(n => n.id !== id).map(n => {
      if (n.type === 'tool-connector') {
        const cp = { ...(n as IConnectorNode).connectorParams! };
        if (cp.sourceId === id) cp.sourceId = null;
        if (cp.targetId === id) cp.targetId = null;
        return { ...n, connectorParams: cp } as IConnectorNode;
      }
      return n;
    })); 
  };
  const toggleNodeActive = (id: string) => { saveHistory(); setNodes(nodes.map(n => n.id === id ? { ...n, isActive: !n.isActive } as AnyMaterialNode : n)); };

  const regularNodes = nodes.filter(n => !n.type.startsWith('container') && n.type !== 'tool-connector');

  const renderContextMenu = (node: any) => (
    <div className="absolute top-full -right-2 mt-2 w-56 bg-white dark:bg-[#2a2b30] border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl py-1.5 z-[100] text-[11px] font-medium text-slate-700 dark:text-slate-300 no-canvas-pan" onMouseDown={(e) => e.stopPropagation()}>
      <button className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => { setActiveNodeDetails(node); setActiveContextMenu(null); }}><span>Open...</span><span className="font-mono text-[10px] text-slate-400">&#x21B5;</span></button>
      <button className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => { handleExecuteNode(node.id); setActiveContextMenu(null); }}><span>Execute step</span></button>
      <div className="w-full h-px bg-gray-100 dark:bg-slate-700/60 my-1" />
      <button className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setActiveContextMenu(null)}><span>Rename</span><span className="font-mono text-[9px] text-slate-400">Space</span></button>
      <button className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setActiveContextMenu(null)}><span>Replace</span><span className="font-mono text-[9px] text-slate-400">R</span></button>
      <button className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => { toggleNodeActive(node.id); setActiveContextMenu(null); }}><span>Deactivate</span><span className="font-mono text-[9px] text-slate-400">D</span></button>
      <button className="w-full flex items-center justify-between px-4 py-1.5 opacity-40 cursor-not-allowed"><span>Pin</span><span className="font-mono text-[9px] text-slate-400">P</span></button>
      <button className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setActiveContextMenu(null)}><span>Copy</span><span className="font-mono text-[9px] text-slate-400">Ctrl C</span></button>
      <button className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => { saveHistory(); setNodes([...nodes, { ...node, id: `node-${Date.now()}`, x: node.x + 40, y: node.y + 40 } as AnyMaterialNode]); setActiveContextMenu(null); }}><span>Duplicate</span><span className="font-mono text-[9px] text-slate-400">Ctrl D</span></button>
      <div className="w-full h-px bg-gray-100 dark:bg-slate-700/60 my-1" />
      <button className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => { handleTidy(); setActiveContextMenu(null); }}><span>Tidy up workflow</span><span className="font-mono text-[9px] text-slate-400">⇧ Alt T</span></button>
      <button className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setActiveContextMenu(null)}><span>Convert node to sub-workflow</span><span className="font-mono text-[9px] text-slate-400">Alt X</span></button>
      <div className="w-full h-px bg-gray-100 dark:bg-slate-700/60 my-1" />
      <button className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setActiveContextMenu(null)}><span>Select all</span><span className="font-mono text-[9px] text-slate-400">Ctrl A</span></button>
      <button className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setActiveContextMenu(null)}><span>Clear selection</span></button>
      <div className="w-full h-px bg-gray-100 dark:bg-slate-700/60 my-1" />
      <button className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 text-red-500 transition-colors" onClick={() => { deleteNode(node.id); setActiveContextMenu(null); }}><span>Delete</span><span className="font-mono text-[9px] opacity-70">Del</span></button>
    </div>
  );

  let ModalIcon: any = Icons.Sparkles;
  let modalIconColor = 'text-slate-400';
  
  const isInputTrigger = currentActiveNode?.type === 'tool-trigger-input';
  const isTaskCenterNode = currentActiveNode?.type === 'tool-task-center';

  if (currentActiveNode) {
    if (currentActiveNode.isActive) { modalIconColor = currentActiveNode.color ? currentActiveNode.color.replace('bg-', 'text-') : 'text-indigo-500'; }
    if (currentActiveNode.type === 'human') ModalIcon = Icons.User;
    else if (currentActiveNode.type === 'member' && currentActiveNode.iconName) ModalIcon = (Icons as any)[currentActiveNode.iconName] || Icons.Bot;
    else ModalIcon = getIconForType(currentActiveNode.type);
  }

  const consoleLeftOffset = isDrawerOpen ? (isDrawerCollapsed ? 64 : drawerWidth) : 0;
  const zoomControlsBottomOffset = isConsoleOpen ? consoleHeight + 24 : 64;

  const renderedConnectors = useMemo(() => {
    return nodes.filter(n => n.type === 'tool-connector').map((conn: any) => {
      const { sourceId, targetId, startPos, endPos, sourceAnchor, targetAnchor } = conn.connectorParams;
      const sourceNode = sourceId ? nodes.find(n => n.id === sourceId) : null;
      const targetNode = targetId ? nodes.find(n => n.id === targetId) : null;

      const isDraggingStart = draggingConnectorEnd?.id === conn.id && draggingConnectorEnd.end === 'start';
      const isDraggingEnd = draggingConnectorEnd?.id === conn.id && draggingConnectorEnd.end === 'end';

      const activeSourceNode = isDraggingStart ? null : sourceNode;
      const activeTargetNode = isDraggingEnd ? null : targetNode;

      let p1 = startPos;
      let n1 = { nx: 1, ny: 0 };
      let p2 = endPos;
      let n2 = { nx: -1, ny: 0 };

      if (activeSourceNode) {
          const sRect = getNodeRect(activeSourceNode);
          if (sourceAnchor) {
              p1 = { x: sRect.x + sRect.w * sourceAnchor.dx, y: sRect.y + sRect.h * sourceAnchor.dy };
              n1 = { nx: sourceAnchor.nx, ny: sourceAnchor.ny };
          } else {
              p1 = { x: sRect.x + sRect.w, y: sRect.y + sRect.h / 2 };
              n1 = { nx: 1, ny: 0 };
          }
      }

      if (activeTargetNode) {
          const tRect = getNodeRect(activeTargetNode);
          if (targetAnchor) {
              p2 = { x: tRect.x + tRect.w * targetAnchor.dx, y: tRect.y + tRect.h * targetAnchor.dy };
              n2 = { nx: targetAnchor.nx, ny: targetAnchor.ny };
          } else {
              p2 = { x: tRect.x, y: tRect.y + tRect.h / 2 };
              n2 = { nx: -1, ny: 0 };
          }
      }

      const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      const cpDist = Math.min(Math.max(dist * 0.4, 40), 200); 
      
      const cp1x = p1.x + n1.nx * cpDist;
      const cp1y = p1.y + n1.ny * cpDist;
      const cp2x = p2.x + n2.nx * cpDist;
      const cp2y = p2.y + n2.ny * cpDist;
      
      const pathD = `M ${p1.x} ${p1.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const isEdgeActive = activeSourceNode?.isActive && activeTargetNode?.isActive;

      return { conn, p1, p2, pathD, isEdgeActive, midX, midY, isDraggingStart, isDraggingEnd, targetNode };
    });
  }, [nodes, draggingConnectorEnd]);

  return (
    <div 
      ref={wrapperRef}
      className={`flex-1 relative bg-[#f8f9fa] dark:bg-[#121212] overflow-hidden select-none transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'} ${isPanMode ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={() => setIsPanning(false)}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <style>{`
        @keyframes flow-dash {
          to { stroke-dashoffset: -16; }
        }
        .flowing-dash {
          animation: flow-dash 0.6s linear infinite;
        }
      `}</style>

      <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)', backgroundSize: `${24 * transform.zoom}px ${24 * transform.zoom}px`, backgroundPosition: `${transform.x}px ${transform.y}px` }} />

      <div className="absolute top-0 right-0 h-14 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 z-30 flex items-center justify-between px-5 transition-all duration-300 no-canvas-pan" style={{ left: isDrawerOpen ? (isDrawerCollapsed ? '64px' : `${drawerWidth}px`) : '0px' }}>
        <div className="flex items-center gap-3">
          {!isDrawerOpen && <button onClick={() => setIsDrawerOpen(true)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mr-2"><PanelLeftOpen size={18} /></button>}
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
          <h1 className="font-black text-[15px] text-slate-800 dark:text-slate-100 tracking-wide">{project?.name || 'Untitled Workspace'}</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {isDirty && (
            <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"/>
              存在未保存更改
            </span>
          )}

          <button 
            onClick={handleSaveWorkflow}
            disabled={isSaving || savedSuccess || (!isDirty && !isLoading)}
            className={`flex items-center gap-2 px-5 py-1.5 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 ${
              savedSuccess 
                ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                : isDirty 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : (savedSuccess ? <Check size={14} /> : <Save size={14} />)}
            {isSaving ? '保存中...' : (savedSuccess ? '配置已保存' : (isDirty ? '保存更改' : '应用配置'))}
          </button>
        </div>
      </div>

      <MaterialDrawer isOpen={isDrawerOpen} onToggle={() => setIsDrawerOpen(!isDrawerOpen)} width={drawerWidth} setWidth={setDrawerWidth} isCollapsed={isDrawerCollapsed} setIsCollapsed={setIsDrawerCollapsed} />

      <Toolbar 
        isPanMode={isPanMode}
        setIsPanMode={setIsPanMode}
        handleFocus={handleFocus}
        setTransform={setTransform}
        handleUndo={handleUndo}
        historyLength={history.length}
        handleTidy={handleTidy}
        zoomControlsBottomOffset={zoomControlsBottomOffset}
      />

      <ConsolePanel 
        isOpen={isConsoleOpen} 
        onToggle={() => setIsConsoleOpen(!isConsoleOpen)} 
        height={consoleHeight} 
        setHeight={setConsoleHeight} 
        leftOffset={consoleLeftOffset} 
        hasChatTrigger={hasChatTrigger}
        onSendMessage={handleConsoleSend}
      />

      <div className="absolute inset-0 origin-top-left" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})` }}>
        
        {/* ==================== 1. 连线轨道层 ==================== */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
          {renderedConnectors.map(({ conn, pathD, isEdgeActive }) => (
            <g key={`path-${conn.id}`} className="group pointer-events-auto" onMouseEnter={() => setHoveredConnId(conn.id)} onMouseLeave={() => setHoveredConnId(null)}>
              <path d={pathD} fill="none" stroke="transparent" strokeWidth="40" className="cursor-pointer" />
              <path d={pathD} fill="none" strokeWidth="6" 
                    className={`transition-colors ${isEdgeActive ? 'stroke-indigo-100 dark:stroke-indigo-900/40' : 'stroke-slate-200 dark:stroke-slate-800'}`} />
              <path d={pathD} fill="none" strokeWidth="3" strokeDasharray="10 10"
                    className={`flowing-dash transition-colors ${isEdgeActive ? 'stroke-indigo-500 dark:stroke-indigo-400' : 'stroke-slate-400 dark:stroke-slate-500'} group-hover:stroke-indigo-400 dark:group-hover:stroke-indigo-300`} />
            </g>
          ))}
        </svg>

        {/* ==================== 2. 节点主体层 ==================== */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          {regularNodes.map(node => {
            let NodeIcon: any = Icons.Sparkles;
            let iconColorClass = 'text-slate-400';

            const isAgent = node.type === 'member';
            const role = (node as any).role || 'executor';
            
            const isThisInputTrigger = node.type === 'tool-trigger-input';
            const isThisTaskCenter = node.type === 'tool-task-center';
            
            const isReviewer = isAgent && role === 'reviewer';
            const isExecutor = isAgent && role === 'executor';
            const isLeader = isAgent && role === 'leader';
            
            const nodeW = node.width || (isReviewer ? 120 : (isLeader ? 130 : (isAgent ? 260 : (isThisTaskCenter ? 240 : NODE_WIDTH))));
            const nodeH = node.height || (isReviewer ? 120 : (isLeader ? 130 : (isAgent ? 68 : (isThisTaskCenter ? 68 : NODE_HEIGHT))));

            if (node.isActive) { iconColorClass = node.color ? node.color.replace('bg-', 'text-') : 'text-indigo-500'; }

            if (node.type === 'human') { NodeIcon = Icons.User; } 
            else if (isAgent && node.iconName) { NodeIcon = (Icons as any)[node.iconName] || Icons.Bot; } 
            else { NodeIcon = getIconForType(node.type); }

            let shapeClasses = '';
            if (isReviewer) shapeClasses = 'w-[120px] h-[120px] rounded-full flex-col items-center justify-center border-blue-400/50';
            else if (isLeader) shapeClasses = 'w-[130px] h-[130px] rounded-xl flex-col items-center justify-center border-amber-400/50 bg-gradient-to-br from-amber-50 to-white dark:from-amber-500/10 dark:to-[#2a2b30]';
            else if (isAgent) shapeClasses = 'w-[260px] h-[68px] rounded-2xl flex-row items-center px-6 gap-4 border-emerald-400/50';
            else if (isThisTaskCenter) shapeClasses = 'w-[240px] h-[68px] rounded-xl flex-row items-center px-5 gap-3 border-[2.5px] border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'; 
            else if (isThisInputTrigger) shapeClasses = 'w-[120px] h-[120px] flex-col items-center justify-center'; 
            else shapeClasses = 'w-[120px] h-[120px] rounded-2xl flex-col items-center justify-center';

            return (
              <div key={node.id} className="absolute flex flex-col items-center group/node pointer-events-auto" style={{ left: node.x, top: node.y, width: nodeW }}>
                
                <div className={`absolute -top-10 flex items-center gap-1 transition-opacity duration-200 bg-white dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700 shadow-md z-[60] ${activeContextMenu === node.id ? 'opacity-100' : 'opacity-0 group-hover/node:opacity-100'}`}>
                  <button className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-700 rounded transition-colors" onClick={(e) => { e.stopPropagation(); handleExecuteNode(node.id); }}><Play size={14} /></button>
                  <button className={`p-1.5 transition-colors rounded ${node.isActive ? 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10' : 'text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10'}`} onClick={(e) => { e.stopPropagation(); toggleNodeActive(node.id); }}><Power size={14} /></button>
                  <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-700 rounded transition-colors" onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}><Trash2 size={14} /></button>
                  
                  <div className="relative">
                    <button 
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded transition-colors" 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setActiveContextMenu(activeContextMenu === node.id ? null : node.id); 
                      }}
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {activeContextMenu === node.id && renderContextMenu(node)}
                  </div>
                </div>

                <div 
                  className={`relative flex shadow-sm transition-all duration-300 cursor-grab active:cursor-grabbing
                    ${isThisInputTrigger ? 'justify-center items-center' : `bg-white dark:bg-[#2a2b30] border-[2px] ${shapeClasses}`}
                    ${!node.isActive ? 'grayscale opacity-50 bg-slate-50 dark:bg-[#1a1b1e]' : ''} 
                    ${draggingNode === node.id ? (isThisInputTrigger ? 'drop-shadow-xl' : 'border-indigo-500 shadow-lg') : (!isThisInputTrigger && 'hover:border-indigo-300 dark:hover:border-indigo-500/50')}
                  `}
                  style={{ width: nodeW, height: nodeH }}
                  onMouseDown={(e) => {
                    if (isPanMode) return; 
                    e.preventDefault(); e.stopPropagation();
                    saveHistory(); setDraggingNode(node.id);
                    const coords = getCanvasCoords(e.clientX, e.clientY);
                    setDragOffset({ x: coords.x - node.x, y: coords.y - node.y });
                  }}
                  onDoubleClick={(e) => {
                    if (isPanMode) return;
                    e.stopPropagation();
                    setActiveNodeDetails(node);
                  }}
                >
                  
                  {isThisInputTrigger && (
                    <svg className="absolute inset-0 w-full h-full z-0 drop-shadow-sm" preserveAspectRatio="none" viewBox="0 0 100 100">
                       <polygon points="5,5 95,50 5,95" fill="currentColor" className="text-amber-50 dark:text-amber-500/10 stroke-amber-400 dark:stroke-amber-500/80 transition-colors" strokeWidth="4" vectorEffect="non-scaling-stroke" />
                    </svg>
                  )}

                  <div className="relative z-10 flex flex-col items-center justify-center w-full h-full pointer-events-none pr-2"> 
                    {isThisTaskCenter ? (
                      <div className="flex items-center gap-2 w-full pl-1">
                        <NodeIcon size={24} className="text-emerald-600 dark:text-emerald-400" />
                        <span className="text-[14px] font-bold text-emerald-700 dark:text-emerald-300">{node.title}</span>
                      </div>
                    ) : (
                      <>
                        <NodeIcon size={isLeader || isReviewer ? 48 : (isAgent ? 28 : (isThisInputTrigger ? 36 : 48))} className={iconColorClass} strokeWidth={1.5} />
                        {isExecutor && <span className={`text-[13px] font-bold truncate ${node.isActive ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-600'}`}>{node.title}</span>}
                      </>
                    )}
                  </div>
                </div>

                {(!isExecutor && !isThisTaskCenter) && (
                  <span className={`mt-2 text-[12px] font-bold text-center w-[160px] leading-tight select-none transition-colors ${node.isActive ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-600'}`}>{node.title}</span>
                )}
                
                {node.outputData && (
                   <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" title="数据就绪" />
                )}
              </div>
            );
          })}
        </div>

        {/* ==================== 3. 触点与交互顶层 (Z-30) ==================== */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible">
          {renderedConnectors.map(({ conn, p1, p2, midX, midY, isDraggingStart, isDraggingEnd }) => (
             <g key={`handle-${conn.id}`} className="group pointer-events-auto" onMouseEnter={() => setHoveredConnId(conn.id)} onMouseLeave={() => setHoveredConnId(null)}>
                
                {/* 悬停时的删除按键 */}
                {hoveredConnId === conn.id && (
                  <foreignObject x={midX - 14} y={midY - 14} width="28" height="28" className="animate-in fade-in zoom-in-90 duration-200">
                    <div className="w-full h-full flex items-center justify-center">
                      <button onClick={() => deleteNode(conn.id)} className="p-1.5 bg-red-50 text-red-500 rounded-full shadow-lg hover:bg-red-500 hover:text-white transition-colors border border-red-100" title="删除连线">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </foreignObject>
                )}

                <circle cx={p1.x} cy={p1.y} r={isDraggingStart ? 12 : 9} 
                  style={{ transformOrigin: `${p1.x}px ${p1.y}px` }}
                  className={`cursor-grab fill-slate-50 dark:fill-slate-800 transition-all duration-200 stroke-[3.5px] ${isDraggingStart ? 'stroke-indigo-500' : 'stroke-slate-300 dark:stroke-slate-500 hover:stroke-indigo-500'}`}
                  onMouseDown={(e) => { 
                    if (isPanMode) return; 
                    e.stopPropagation(); 
                    setDraggingConnectorEnd({ id: conn.id, end: 'start' }); 
                    
                    setNodes(prev => prev.map(n => {
                        if (n.id === conn.id) {
                            return { ...n, connectorParams: { ...n.connectorParams, sourceId: null, startPos: p1 } } as IConnectorNode;
                        }
                        return n;
                    }));
                  }} 
                />
                
                <circle cx={p2.x} cy={p2.y} r={isDraggingEnd ? 12 : 9} 
                  style={{ transformOrigin: `${p2.x}px ${p2.y}px` }}
                  className={`cursor-grab fill-slate-50 dark:fill-slate-800 transition-all duration-200 stroke-[3.5px] ${isDraggingEnd ? 'stroke-indigo-500' : 'stroke-slate-300 dark:stroke-slate-500 hover:stroke-indigo-500'}`}
                  onMouseDown={(e) => { 
                    if (isPanMode) return; 
                    e.stopPropagation(); 
                    setDraggingConnectorEnd({ id: conn.id, end: 'end' }); 
                    
                    setNodes(prev => prev.map(n => {
                        if (n.id === conn.id) {
                            return { ...n, connectorParams: { ...n.connectorParams, targetId: null, endPos: p2 } } as IConnectorNode;
                        }
                        return n;
                    }));
                  }} 
                />
             </g>
          ))}
        </svg>

      </div>

      <NodeDetail 
        currentActiveNode={currentActiveNode}
        setActiveNodeDetails={setActiveNodeDetails}
        project={project}
        connectedAgents={connectedAgents}
        triggerMockInput={triggerMockInput}
        setTriggerMockInput={setTriggerMockInput}
        triggerPreviewPayload={triggerPreviewPayload}
        handleSessionIdFound={handleSessionIdFound}
        handleExecuteNode={handleExecuteNode}
        promptParam={promptParam}
        setPromptParam={setPromptParam}
      />
    </div>
  );
}