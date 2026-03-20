/**
 * UnitedClaw Agent 通信管理器
 * 用于管理编排 Agent 和执行 Agent 之间的消息传递
 */

import { 
  IAgentNode, 
  IConnectorNode,
  AnyMaterialNode 
} from '@/interface/material';
import {
  ITask,
  IMessage,
  IAgentConnection,
  TaskStatus,
  MessageType
} from '@/interface/task-system';
import {
  createTask,
  updateTaskStatus,
  sendMessage,
  broadcastMessage,
  readMessagesFile,
  getUnreadMessages,
  markMessagesAsRead,
  generateId
} from '@/lib/task-system';

/**
 * 从节点列表中提取 Agent 连接关系
 * @param nodes 所有节点
 * @returns Agent 连接关系数组
 */
export function extractAgentConnections(nodes: AnyMaterialNode[]): IAgentConnection[] {
  const connections: IAgentConnection[] = [];
  
  // 找到所有 connector（连接线）
  const connectors = nodes.filter((n): n is IConnectorNode => n.type === 'tool-connector');
  
  for (const connector of connectors) {
    const sourceId = connector.connectorParams?.sourceId;
    const targetId = connector.connectorParams?.targetId;
    
    if (!sourceId || !targetId) continue;
    
    const sourceNode = nodes.find(n => n.id === sourceId);
    const targetNode = nodes.find(n => n.id === targetId);
    
    if (!sourceNode || !targetNode) continue;
    
    // 判断是否为 Agent 连接（编排类 -> 执行类）
    const isSourceAgent = sourceNode.type === 'member';
    const isTargetAgent = targetNode.type === 'member';
    
    if (isSourceAgent && isTargetAgent) {
      const sourceAgent = sourceNode as IAgentNode;
      const targetAgent = targetNode as IAgentNode;
      
      // 只有当 source 是 leader/reviewer（编排类），target 是 executor（执行类）时才记录
      if (
        (sourceAgent.role === 'leader' || sourceAgent.role === 'reviewer') &&
        targetAgent.role === 'executor'
      ) {
        connections.push({
          id: generateId('conn_'),
          upstreamId: sourceId,
          downstreamId: targetId,
          createdAt: Date.now()
        });
      }
    }
  }
  
  return connections;
}

/**
 * 获取编排 Agent 的下游执行 Agent 列表
 * @param connections 所有连接关系
 * @param upstreamAgentId 编排 Agent ID
 * @returns 下游执行 Agent ID 列表
 */
export function getDownstreamAgents(
  connections: IAgentConnection[],
  upstreamAgentId: string
): string[] {
  return connections
    .filter(conn => conn.upstreamId === upstreamAgentId)
    .map(conn => conn.downstreamId);
}

/**
 * 获取执行 Agent 的上游编排 Agent
 * @param connections 所有连接关系
 * @param downstreamAgentId 执行 Agent ID
 * @returns 上游编排 Agent ID（如果有）
 */
export function getUpstreamAgent(
  connections: IAgentConnection[],
  downstreamAgentId: string
): string | null {
  const conn = connections.find(c => c.downstreamId === downstreamAgentId);
  return conn ? conn.upstreamId : null;
}

/**
 * 编排 Agent：拆解需求并创建任务
 * @param requirement 用户需求
 * @param orchestratorId 编排 Agent ID
 * @param connections Agent 连接关系
 * @returns 创建的任务列表
 */
export async function orchestrateTasks(
  requirement: string,
  orchestratorId: string,
  connections: IAgentConnection[]
): Promise<ITask[]> {
  // 1. 拆解需求为子任务（这里简化处理，实际应该用 AI 分析）
  const subTasks = await breakDownRequirement(requirement);
  
  const createdTasks: ITask[] = [];
  
  // 2. 为每个子任务创建任务记录
  for (const subTask of subTasks) {
    const task = await createTask(
      subTask.title,
      subTask.description,
      orchestratorId,
      'medium'
    );
    createdTasks.push(task);
  }
  
  console.log('[Orchestrator] Tasks created:', createdTasks.length);
  return createdTasks;
}

/**
 * 编排 Agent：分配任务给下游执行 Agent
 * @param tasks 任务列表
 * @param orchestratorId 编排 Agent ID
 * @param connections Agent 连接关系
 */
export async function assignTasksToDownstream(
  tasks: ITask[],
  orchestratorId: string,
  connections: IAgentConnection[]
): Promise<void> {
  // 1. 获取所有下游执行 Agent
  const downstreamAgents = getDownstreamAgents(connections, orchestratorId);
  
  if (downstreamAgents.length === 0) {
    console.warn('[Orchestrator] No downstream agents found');
    return;
  }
  
  // 2. 为每个任务分配执行 Agent（简单轮询分配）
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const assignedAgent = downstreamAgents[i % downstreamAgents.length];
    
    // 更新任务状态为已分配
    await updateTaskStatus(task.id, 'assigned', assignedAgent);
    
    // 3. 创建任务分配消息
    const messageContent = {
      type: 'task_assignment',
      taskId: task.id,
      taskTitle: task.title,
      taskDescription: task.description,
      assignedAt: Date.now()
    };
    
    // 4. 发送消息给执行 Agent
    await sendMessage(
      orchestratorId,
      assignedAgent,
      'task_assign',
      messageContent,
      false
    );
    
    console.log('[Orchestrator] Task assigned:', task.id, 'to', assignedAgent);
  }
  
  // 5. 广播通知所有下游 Agent 有新任务
  await broadcastMessage(
    orchestratorId,
    downstreamAgents,
    'broadcast',
    {
      type: 'new_tasks_available',
      taskCount: tasks.length,
      broadcastAt: Date.now()
    }
  );
}

/**
 * 执行 Agent：领取任务
 * @param agentId 执行 Agent ID
 * @param connections Agent 连接关系
 * @returns 领取的任务列表
 */
export async function executorClaimTasks(
  agentId: string,
  connections: IAgentConnection[]
): Promise<ITask[]> {
  // 1. 获取未读消息
  const unreadMessages = await getUnreadMessages(agentId);
  
  const claimedTasks: ITask[] = [];
  
  // 2. 处理任务分配消息
  for (const msg of unreadMessages) {
    if (msg.type === 'task_assign' && msg.content.taskId) {
      // 标记消息为已读
      await markMessagesAsRead(agentId, [msg.id]);
      
      // 更新任务状态为执行中
      const task = await updateTaskStatus(msg.content.taskId, 'in_progress', agentId);
      if (task) {
        claimedTasks.push(task);
      }
      
      console.log('[Executor] Claimed task:', task?.id);
    }
  }
  
  return claimedTasks;
}

/**
 * 执行 Agent：完成任务并通知上游（增强版 - 功能点 7）
 * @param taskId 任务 ID
 * @param executorId 执行 Agent ID
 * @param connections Agent 连接关系
 * @param result 执行结果
 * @param metadata 元数据（如文档链接、测试结果等）
 */
export async function executorCompleteTask(
  taskId: string,
  executorId: string,
  connections: IAgentConnection[],
  result?: string,
  metadata?: Record<string, any>
): Promise<void> {
  const taskFile = await readTaskFile();
  const task = taskFile.tasks.find(t => t.id === taskId);
  
  if (!task) {
    console.error('[Executor] Task not found:', taskId);
    return;
  }
  
  // 1. 更新任务状态为已完成
  task.status = 'completed';
  task.completedAt = Date.now();
  task.result = result || '';
  if (metadata) {
    task.metadata = { ...task.metadata, ...metadata };
  }
  await writeTaskFile(taskFile);
  
  // 2. 获取上游编排 Agent
  const upstreamAgent = getUpstreamAgent(connections, executorId);
  
  // 3. 发送任务完成通知（使用 task-complete 类型）
  if (upstreamAgent) {
    await sendMessage(
      executorId,
      upstreamAgent,
      'task_complete',  // 使用新的消息类型
      {
        type: 'task_completed',
        taskId,
        taskTitle: task.title,
        status: 'completed',
        result,
        metadata,
        completedAt: Date.now()
      },
      false
    );
  }
  
  // 4. 查找依赖此任务的其他任务，通知相关执行者（任务交接）
  const dependentTasks = taskFile.tasks.filter(t => 
    t.dependencies?.includes(taskId) && t.status !== 'completed'
  );
  
  for (const depTask of dependentTasks) {
    if (depTask.assignedTo && depTask.assignedTo !== executorId) {
      // 发送任务交接消息
      await sendMessage(
        executorId,
        depTask.assignedTo,
        'task-handoff',  // 任务交接消息类型
        {
          type: 'dependency_completed',
          completedTaskId: taskId,
          completedTaskTitle: task.title,
          dependentTaskId: depTask.id,
          dependentTaskTitle: depTask.title,
          message: `依赖任务"${task.title}"已完成，你可以开始执行"${depTask.title}"了。`,
          metadata: metadata || {}
        },
        false
      );
    }
  }
  
  console.log('[Executor] Task completed and notifications sent:', taskId);
}

/**
 * 执行 Agent：任务失败并通知上游
 * @param taskId 任务 ID
 * @param executorId 执行 Agent ID
 * @param connections Agent 连接关系
 * @param error 错误信息
 */
export async function executorFailTask(
  taskId: string,
  executorId: string,
  connections: IAgentConnection[],
  error: string
): Promise<void> {
  // 1. 更新任务状态为失败
  await updateTaskStatus(taskId, 'failed', executorId);
  
  // 2. 获取上游编排 Agent
  const upstreamAgent = getUpstreamAgent(connections, executorId);
  
  if (!upstreamAgent) {
    console.warn('[Executor] No upstream agent found for:', executorId);
    return;
  }
  
  // 3. 发送任务失败通知给上游
  await sendMessage(
    executorId,
    upstreamAgent,
    'task_update',
    {
      type: 'task_failed',
      taskId,
      status: 'failed',
      error,
      failedAt: Date.now()
    },
    false
  );
  
  console.log('[Executor] Task failed:', taskId, error);
}

/**
 * 简单需求拆解函数（后续可以用 AI 增强）
 */
async function breakDownRequirement(requirement: string): Promise<{title: string, description: string}[]> {
  // 这里简化处理，实际应该调用 AI 分析需求
  return [
    {
      title: '处理用户需求',
      description: requirement
    }
  ];
}
