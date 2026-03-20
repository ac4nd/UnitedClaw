/**
 * UnitedClaw Editor - 任务系统集成 Hook
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnyMaterialNode, IAgentNode } from '@/interface/material';
import { ITask, IMessage, IAgentConnection } from '@/interface/task-system';
import {
  initWorkspace,
  initAgentDir,
  createTask,
  updateTaskStatus,
  sendMessage,
  broadcastMessage,
  getUnreadMessages,
  markMessagesAsRead,
  claimTask,
  getClaimableTasks,
  checkDependenciesSatisfied,
  autoCompactAndArchive,
  compactMessages,
  archiveCompletedTasks
} from '@/lib/task-system';
import {
  extractAgentConnections,
  getDownstreamAgents,
  getUpstreamAgent,
  orchestrateTasks,
  assignTasksToDownstream,
  executorClaimTasks,
  executorCompleteTask
} from '@/lib/agent-communication';

/**
 * Hook 返回值接口（增强版）
 */
interface UseTaskSystemReturn {
  // 状态
  isInitialized: boolean;
  connections: IAgentConnection[];
  tasks: ITask[];
  unreadMessagesCount: number;
  claimableTasks: ITask[];  // 可认领的任务
  
  // 编排 Agent 操作
  handleOrchestratorExecute: (
    orchestratorId: string,
    requirement: string,
    allNodes: AnyMaterialNode[]
  ) => Promise<void>;
  
  // 执行 Agent 操作
  handleExecutorExecute: (
    executorId: string,
    allNodes: AnyMaterialNode[]
  ) => Promise<void>;
  
  // 任务认领（新增 - 功能点 3）
  handleClaimTask: (taskId: string, agentId: string) => Promise<ITask | null>;
  
  // 任务依赖检查（新增 - 功能点 2）
  checkTaskDependencies: (taskId: string) => Promise<boolean>;
  
  // 工具函数
  refreshConnections: (nodes: AnyMaterialNode[]) => void;
  getAgentTasks: (agentId: string) => ITask[];
}

/**
 * 任务系统 Hook
 */
export function useTaskSystem(): UseTaskSystemReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [connections, setConnections] = useState<IAgentConnection[]>([]);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [claimableTasks, setClaimableTasks] = useState<ITask[]>([]);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化工作区
  useEffect(() => {
    async function init() {
      try {
        await initWorkspace();
        setIsInitialized(true);
        console.log('[TaskSystem] Workspace initialized');
      } catch (error) {
        console.error('[TaskSystem] Failed to initialize:', error);
      }
    }
    init();
  }, []);

  // 轮询机制（新增 - 功能点 5）
  useEffect(() => {
    if (!isInitialized) return;

    const poll = async () => {
      try {
        // 刷新任务列表
        const taskFile = await import('@/lib/task-system');
        const tf = await taskFile.readTaskFile();
        setTasks(tf.tasks);
        
        // 刷新可认领任务
        const ct = await taskFile.getClaimableTasks('current-agent');
        setClaimableTasks(ct);
        
        // 刷新未读消息数（需要 agentId，这里简化处理）
        // const unread = await getUnreadMessages(agentId);
        // setUnreadMessagesCount(unread.length);
      } catch (error) {
        console.error('[TaskSystem] Poll failed:', error);
      }
    };

    // 初始轮询
    poll();
    
    // 设置轮询间隔（2-3 秒）
    pollIntervalRef.current = setInterval(poll, 2500);
    
    // 清理
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isInitialized]);

  // 自动压缩和归档（新增 - 功能点 6）
  useEffect(() => {
    if (!isInitialized) return;

    // 每 5 分钟执行一次自动压缩
    const compactInterval = setInterval(async () => {
      try {
        console.log('[TaskSystem] Running auto compact...');
        await autoCompactAndArchive({
          keepUnreadMessages: 50,
          archiveMessagesAfterDays: 7,
          archiveTasksAfterDays: 7
        });
      } catch (error) {
        console.error('[TaskSystem] Auto compact failed:', error);
      }
    }, 5 * 60 * 1000); // 5 分钟

    return () => {
      clearInterval(compactInterval);
    };
  }, [isInitialized]);

  // 刷新连接关系
  const refreshConnections = useCallback((nodes: AnyMaterialNode[]) => {
    const conns = extractAgentConnections(nodes);
    setConnections(conns);
    console.log('[TaskSystem] Connections refreshed:', conns.length);
  }, []);

  // 编排 Agent 执行处理
  const handleOrchestratorExecute = useCallback(async (
    orchestratorId: string,
    requirement: string,
    allNodes: AnyMaterialNode[]
  ) => {
    if (!isInitialized) {
      console.error('[TaskSystem] Not initialized');
      return;
    }

    try {
      // 1. 初始化编排 Agent 目录
      await initAgentDir(orchestratorId);

      // 2. 刷新连接关系
      const conns = extractAgentConnections(allNodes);
      setConnections(conns);

      // 3. 拆解需求并创建任务
      const newTasks = await orchestrateTasks(requirement, orchestratorId, conns);
      setTasks(prev => [...prev, ...newTasks]);

      // 4. 分配任务给下游执行 Agent
      await assignTasksToDownstream(newTasks, orchestratorId, conns);

      console.log('[TaskSystem] Orchestrator execution completed');
    } catch (error) {
      console.error('[TaskSystem] Orchestrator execution failed:', error);
      throw error;
    }
  }, [isInitialized]);

  // 执行 Agent 执行处理
  const handleExecutorExecute = useCallback(async (
    executorId: string,
    allNodes: AnyMaterialNode[]
  ) => {
    if (!isInitialized) {
      console.error('[TaskSystem] Not initialized');
      return;
    }

    try {
      // 1. 初始化执行 Agent 目录
      await initAgentDir(executorId);

      // 2. 刷新连接关系
      const conns = extractAgentConnections(allNodes);
      setConnections(conns);

      // 3. 领取任务（自动认领）
      const claimedTasks = await executorClaimTasks(executorId, conns);
      setTasks(prev => {
        const updated = prev.map(t => {
          const claimed = claimedTasks.find(ct => ct.id === t.id);
          return claimed ? { ...claimed } : t;
        });
        return [...updated, ...claimedTasks.filter(ct => !prev.find(t => t.id === ct.id))];
      });

      // 4. 刷新可认领任务
      const ct = await getClaimableTasks(executorId);
      setClaimableTasks(ct);

      // 5. 更新未读消息数
      const unread = await getUnreadMessages(executorId);
      setUnreadMessagesCount(unread.length);

      console.log('[TaskSystem] Executor execution completed, claimed tasks:', claimedTasks.length);
    } catch (error) {
      console.error('[TaskSystem] Executor execution failed:', error);
      throw error;
    }
  }, [isInitialized]);

  // 任务认领（新增 - 功能点 3）
  const handleClaimTask = useCallback(async (
    taskId: string,
    agentId: string
  ): Promise<ITask | null> => {
    try {
      const claimed = await claimTask(taskId, agentId);
      if (claimed) {
        setTasks(prev => prev.map(t => t.id === taskId ? claimed : t));
        // 刷新可认领任务
        const ct = await getClaimableTasks(agentId);
        setClaimableTasks(ct);
      }
      return claimed;
    } catch (error) {
      console.error('[TaskSystem] Claim task failed:', error);
      return null;
    }
  }, []);

  // 任务依赖检查（新增 - 功能点 2）
  const checkTaskDependencies = useCallback(async (taskId: string): Promise<boolean> => {
    return await checkDependenciesSatisfied(taskId);
  }, []);

  // 获取 Agent 的任务
  const getAgentTasks = useCallback((agentId: string) => {
    return tasks.filter(t => t.assignedTo === agentId);
  }, [tasks]);

  // 手动触发压缩（新增 - 功能点 6）
  const handleCompactMessages = useCallback(async (
    agentId: string,
    keepUnreadCount: number = 50
  ): Promise<{ compacted: number; archived: number }> => {
    return await compactMessages(agentId, keepUnreadCount);
  }, []);

  // 手动触发归档（新增 - 功能点 6）
  const handleArchiveTasks = useCallback(async (
    olderThanDays: number = 7
  ): Promise<{ archived: number; remaining: number }> => {
    return await archiveCompletedTasks(olderThanDays);
  }, []);

  return {
    isInitialized,
    connections,
    tasks,
    unreadMessagesCount,
    claimableTasks,
    handleOrchestratorExecute,
    handleExecutorExecute,
    handleClaimTask,
    checkTaskDependencies,
    refreshConnections,
    getAgentTasks,
    handleCompactMessages,
    handleArchiveTasks
  };
}
