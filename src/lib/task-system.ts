/**
 * UnitedClaw Agent 任务编排系统 - 工具函数
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  ITask, 
  IMessage, 
  ITaskFile, 
  IMessagesFile,
  TaskStatus,
  MessageType 
} from '@/interface/task-system';

// 文件锁定配置
const LOCK_TIMEOUT_MS = 5000;  // 锁超时 5 秒
const LOCK_RETRY_MS = 100;     // 重试间隔 100ms
const MAX_RETRIES = 50;        // 最大重试次数

/**
 * 获取工作区路径
 */
export function getWorkspacePath(): string {
  const homeDir = process.env.USERPROFILE || process.env.HOME || '';
  return path.join(homeDir, '.unitedclaw', 'uc_workspace');
}

/**
 * 获取 task.json 文件路径
 */
export function getTaskFilePath(): string {
  return path.join(getWorkspacePath(), 'task.json');
}

/**
 * 获取 Agent 目录路径
 */
export function getAgentDirPath(agentId: string): string {
  return path.join(getWorkspacePath(), 'agents', agentId);
}

/**
 * 获取 Agent 的 messages.json 文件路径
 */
export function getMessagesFilePath(agentId: string): string {
  return path.join(getAgentDirPath(agentId), 'messages.json');
}

/**
 * 初始化工作区目录
 */
export async function initWorkspace(): Promise<void> {
  const workspacePath = getWorkspacePath();
  const agentsDirPath = path.join(workspacePath, 'agents');
  
  // 创建目录
  await fs.mkdir(workspacePath, { recursive: true });
  await fs.mkdir(agentsDirPath, { recursive: true });
  
  // 初始化 task.json
  const taskFilePath = getTaskFilePath();
  try {
    await fs.access(taskFilePath);
  } catch {
    const emptyTaskFile: ITaskFile = {
      tasks: [],
      lastUpdated: Date.now()
    };
    await fs.writeFile(taskFilePath, JSON.stringify(emptyTaskFile, null, 2), 'utf-8');
  }
  
  console.log('[TaskSystem] Workspace initialized:', workspacePath);
}

/**
 * 初始化 Agent 目录
 */
export async function initAgentDir(agentId: string): Promise<void> {
  const agentDirPath = getAgentDirPath(agentId);
  await fs.mkdir(agentDirPath, { recursive: true });
  
  // 初始化 messages.json
  const messagesFilePath = getMessagesFilePath(agentId);
  try {
    await fs.access(messagesFilePath);
  } catch {
    const emptyMessagesFile: IMessagesFile = {
      messages: [],
      lastReadIndex: 0
    };
    await fs.writeFile(messagesFilePath, JSON.stringify(emptyMessagesFile, null, 2), 'utf-8');
  }
  
  console.log('[TaskSystem] Agent directory initialized:', agentDirPath);
}

/**
 * 读取任务文件
 */
export async function readTaskFile(): Promise<ITaskFile> {
  const taskFilePath = getTaskFilePath();
  try {
    const content = await fs.readFile(taskFilePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('[TaskSystem] Failed to read task file:', error);
    return { tasks: [], lastUpdated: Date.now() };
  }
}

/**
 * 写入任务文件（带锁 - 功能点 4）
 */
export async function writeTaskFile(taskFile: ITaskFile): Promise<void> {
  const taskFilePath = getTaskFilePath();
  taskFile.lastUpdated = Date.now();
  await writeFileLocked(taskFilePath, taskFile);
}

/**
 * 创建任务（增强版 - 支持依赖关系）
 */
export async function createTask(
  title: string,
  description: string,
  createdBy: string,
  priority: 'low' | 'medium' | 'high' = 'medium',
  dependencies?: string[],  // 新增：依赖的任务 ID 列表
  assignedTo?: string       // 可选：直接分配给某个 Agent
): Promise<ITask> {
  const taskFile = await readTaskFile();
  
  const newTask: ITask = {
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    description,
    status: assignedTo ? 'assigned' : 'pending',
    priority,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy,
    dependencies: dependencies || [],
    blockers: [],
    assignedTo
  };
  
  // 更新依赖任务的 blockers
  if (dependencies && dependencies.length > 0) {
    for (const depId of dependencies) {
      const depTask = taskFile.tasks.find(t => t.id === depId);
      if (depTask) {
        if (!depTask.blockers) depTask.blockers = [];
        depTask.blockers.push(newTask.id);
      }
    }
  }
  
  taskFile.tasks.push(newTask);
  await writeTaskFile(taskFile);
  
  console.log('[TaskSystem] Task created:', newTask.id);
  return newTask;
}

/**
 * 更新任务状态
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  assignedTo?: string
): Promise<ITask | null> {
  const taskFile = await readTaskFile();
  
  const taskIndex = taskFile.tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) {
    console.error('[TaskSystem] Task not found:', taskId);
    return null;
  }
  
  const task = taskFile.tasks[taskIndex];
  task.status = status;
  task.updatedAt = Date.now();
  
  if (assignedTo) {
    task.assignedTo = assignedTo;
  }
  
  await writeTaskFile(taskFile);
  
  console.log('[TaskSystem] Task status updated:', taskId, status);
  return task;
}

/**
 * 读取 Agent 消息文件
 */
export async function readMessagesFile(agentId: string): Promise<IMessagesFile> {
  const messagesFilePath = getMessagesFilePath(agentId);
  try {
    const content = await fs.readFile(messagesFilePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('[TaskSystem] Failed to read messages file:', error);
    return { messages: [], lastReadIndex: 0 };
  }
}

/**
 * 写入 Agent 消息文件（带锁 - 功能点 4）
 */
export async function writeMessagesFile(
  agentId: string,
  messagesFile: IMessagesFile
): Promise<void> {
  const messagesFilePath = getMessagesFilePath(agentId);
  await writeFileLocked(messagesFilePath, messagesFile);
}

/**
 * 发送消息给 Agent
 */
export async function sendMessage(
  fromAgentId: string,
  toAgentId: string,
  type: MessageType,
  content: any,
  isBroadcast: boolean = false
): Promise<IMessage> {
  // 确保 Agent 目录存在
  await initAgentDir(toAgentId);
  
  const messagesFile = await readMessagesFile(toAgentId);
  
  const newMessage: IMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    fromAgentId,
    toAgentId: isBroadcast ? undefined : toAgentId,
    isBroadcast,
    content,
    createdAt: Date.now(),
    read: false
  };
  
  messagesFile.messages.push(newMessage);
  await writeMessagesFile(toAgentId, messagesFile);
  
  console.log('[TaskSystem] Message sent:', newMessage.id, 'to', toAgentId);
  return newMessage;
}

/**
 * 广播消息给多个 Agent
 */
export async function broadcastMessage(
  fromAgentId: string,
  toAgentIds: string[],
  type: MessageType,
  content: any
): Promise<IMessage[]> {
  const messages: IMessage[] = [];
  
  for (const agentId of toAgentIds) {
    const msg = await sendMessage(fromAgentId, agentId, type, content, true);
    messages.push(msg);
  }
  
  console.log('[TaskSystem] Broadcast sent to', toAgentIds.length, 'agents');
  return messages;
}

/**
 * 获取 Agent 未读消息
 */
export async function getUnreadMessages(agentId: string): Promise<IMessage[]> {
  const messagesFile = await readMessagesFile(agentId);
  return messagesFile.messages.filter(msg => !msg.read);
}

/**
 * 标记消息为已读
 */
export async function markMessagesAsRead(
  agentId: string,
  messageIds: string[]
): Promise<void> {
  const messagesFile = await readMessagesFile(agentId);
  
  messagesFile.messages = messagesFile.messages.map(msg => {
    if (messageIds.includes(msg.id)) {
      return { ...msg, read: true };
    }
    return msg;
  });
  
  await writeMessagesFile(agentId, messagesFile);
  console.log('[TaskSystem] Messages marked as read:', messageIds.length);
}

/**
 * 认领任务（新增 - 功能点 3）
 */
export async function claimTask(
  taskId: string,
  claimBy: string  // 认领者 Agent ID
): Promise<ITask | null> {
  const taskFile = await readTaskFile();
  const taskIndex = taskFile.tasks.findIndex(t => t.id === taskId);
  
  if (taskIndex === -1) {
    console.error('[TaskSystem] Task not found:', taskId);
    return null;
  }
  
  const task = taskFile.tasks[taskIndex];
  
  // 只有 pending 状态的任务才能被认领
  if (task.status !== 'pending') {
    console.warn('[TaskSystem] Task cannot be claimed:', taskId, 'status:', task.status);
    return null;
  }
  
  // 更新任务状态
  task.status = 'assigned';
  task.assignedTo = claimBy;
  task.startedAt = Date.now();
  task.updatedAt = Date.now();
  
  await writeTaskFile(taskFile);
  
  console.log('[TaskSystem] Task claimed:', taskId, 'by', claimBy);
  return task;
}

/**
 * 检查任务依赖是否已满足（新增 - 功能点 2）
 */
export async function checkDependenciesSatisfied(taskId: string): Promise<boolean> {
  const taskFile = await readTaskFile();
  const task = taskFile.tasks.find(t => t.id === taskId);
  
  if (!task || !task.dependencies || task.dependencies.length === 0) {
    return true;  // 没有依赖，直接满足
  }
  
  // 检查所有依赖任务是否已完成
  for (const depId of task.dependencies) {
    const depTask = taskFile.tasks.find(t => t.id === depId);
    if (!depTask || depTask.status !== 'completed') {
      return false;  // 有依赖任务未完成
    }
  }
  
  return true;
}

/**
 * 获取可认领的任务列表（新增 - 功能点 3）
 */
export async function getClaimableTasks(agentId: string): Promise<ITask[]> {
  const taskFile = await readTaskFile();
  
  return taskFile.tasks.filter(task => {
    // 未被分配且依赖已满足
    return task.status === 'pending' && 
           !task.assignedTo &&
           checkDependenciesSatisfiedSync(task, taskFile.tasks);
  });
}

// 同步版本的依赖检查（用于 filter）
function checkDependenciesSatisfiedSync(task: ITask, allTasks: ITask[]): boolean {
  if (!task.dependencies || task.dependencies.length === 0) {
    return true;
  }
  return task.dependencies.every(depId => {
    const depTask = allTasks.find(t => t.id === depId);
    return depTask && depTask.status === 'completed';
  });
}

/**
 * 生成唯一 ID
 */
export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// =========================================================================
// 功能点 4：文件锁定机制
// =========================================================================

/**
 * 尝试获取文件锁（新增 - 功能点 4）
 */
export async function acquireLock(filePath: string): Promise<boolean> {
  const lockFile = `${filePath}.lock`;
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      // 尝试创建锁文件（wx 标志表示文件已存在则失败）
      await fs.writeFile(lockFile, `${process.pid}-${Date.now()}`, { flag: 'wx' });
      return true;
    } catch (e: any) {
      if (e.code === 'EEXIST') {
        // 锁已存在，检查是否超时
        try {
          const stats = await fs.stat(lockFile);
          const age = Date.now() - stats.mtimeMs;
          
          if (age > LOCK_TIMEOUT_MS) {
            // 锁已超时，强制删除
            try {
              await fs.unlink(lockFile);
              continue; // 重试获取锁
            } catch (unlinkErr) {
              // 删除失败，可能是其他进程刚获取了锁
            }
          }
        } catch (statErr) {
          // 无法获取锁文件状态，继续等待
        }
        
        // 等待后重试
        await sleep(LOCK_RETRY_MS + Math.random() * 50);
      } else {
        throw e;
      }
    }
  }
  
  throw new Error(`Failed to acquire lock for ${filePath} after ${MAX_RETRIES} retries`);
}

/**
 * 释放文件锁（新增 - 功能点 4）
 */
export async function releaseLock(filePath: string): Promise<void> {
  const lockFile = `${filePath}.lock`;
  try {
    await fs.unlink(lockFile);
  } catch (e: any) {
    if (e.code !== 'ENOENT') {
      console.warn('[TaskSystem] Failed to release lock:', e);
    }
  }
}

/**
 * 带锁写入文件（新增 - 功能点 4）
 */
export async function writeFileLocked<T>(
  filePath: string,
  data: T,
  serialize: (data: T) => string = JSON.stringify
): Promise<void> {
  await acquireLock(filePath);
  try {
    const content = serialize(data);
    await fs.writeFile(filePath, content, 'utf-8');
  } finally {
    await releaseLock(filePath);
  }
}

/**
 * 带锁读取文件（新增 - 功能点 4）
 */
export async function readFileLocked<T>(
  filePath: string,
  deserialize: (content: string) => T = JSON.parse
): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  return deserialize(content);
}

/**
 * 睡眠函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =========================================================================
// 功能点 6：上下文压缩与归档
// =========================================================================

/**
 * 压缩消息文件 - 只保留最近的未读消息（新增 - 功能点 6）
 * @param agentId Agent ID
 * @param keepUnreadCount 保留的未读消息数量（默认 50 条）
 * @param archiveOldMessages 是否归档旧消息（默认 true）
 */
export async function compactMessages(
  agentId: string,
  keepUnreadCount: number = 50,
  archiveOldMessages: boolean = true
): Promise<{
  compacted: number;
  archived: number;
}> {
  const messagesFilePath = getMessagesFilePath(agentId);
  
  try {
    const messagesFile = await readMessagesFile(agentId);
    
    // 分离已读和未读消息
    const unread = messagesFile.messages.filter(m => !m.read);
    const read = messagesFile.messages.filter(m => m.read);
    
    // 保留最近的未读消息
    const recentUnread = unread.slice(-keepUnreadCount);
    const toRemove = unread.slice(0, unread.length - keepUnreadCount);
    
    // 归档旧消息
    let archivedCount = 0;
    if (archiveOldMessages && (read.length > 0 || toRemove.length > 0)) {
      archivedCount = await archiveMessages(agentId, [...read, ...toRemove]);
    }
    
    // 更新消息文件
    messagesFile.messages = recentUnread;
    messagesFile.lastReadIndex = recentUnread.length;
    
    await writeFileLocked(messagesFilePath, messagesFile);
    
    const compactedCount = read.length + toRemove.length;
    console.log('[TaskSystem] Messages compacted:', {
      removed: compactedCount,
      archived: archivedCount,
      remaining: recentUnread.length
    });
    
    return {
      compacted: compactedCount,
      archived: archivedCount
    };
  } catch (error) {
    console.error('[TaskSystem] Failed to compact messages:', error);
    return { compacted: 0, archived: 0 };
  }
}

/**
 * 归档消息（新增 - 功能点 6）
 */
export async function archiveMessages(
  agentId: string,
  messages: IMessage[]
): Promise<number> {
  if (messages.length === 0) return 0;
  
  const agentDir = getAgentDirPath(agentId);
  const archiveDir = path.join(agentDir, 'archive');
  await fs.mkdir(archiveDir, { recursive: true });
  
  // 按日期归档
  const dateStr = new Date().toISOString().split('T')[0];
  const archiveFile = path.join(archiveDir, `messages_${dateStr}_${Date.now()}.json`);
  
  const archiveData = {
    archivedAt: Date.now(),
    count: messages.length,
    messages
  };
  
  await fs.writeFile(archiveFile, JSON.stringify(archiveData, null, 2), 'utf-8');
  return messages.length;
}

/**
 * 归档已完成任务（新增 - 功能点 6）
 * @param olderThanDays 归档多少天前的任务（默认 7 天）
 * @param archiveFilePath 归档文件路径（默认在 workspace 下）
 */
export async function archiveCompletedTasks(
  olderThanDays: number = 7,
  archiveFilePath?: string
): Promise<{
  archived: number;
  remaining: number;
}> {
  const taskFile = await readTaskFile();
  const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
  
  // 分离活动和已完成任务
  const activeTasks = taskFile.tasks.filter(t => t.status !== 'completed');
  const completedTasks = taskFile.tasks.filter(t => 
    t.status === 'completed' && 
    t.completedAt && 
    t.completedAt < cutoff
  );
  
  let archivedCount = 0;
  if (completedTasks.length > 0) {
    // 归档已完成任务
    const archivePath = archiveFilePath || path.join(getWorkspacePath(), 'archive', `tasks_${Date.now()}.json`);
    await fs.mkdir(path.dirname(archivePath), { recursive: true });
    
    const archiveData = {
      archivedAt: Date.now(),
      count: completedTasks.length,
      cutoffDays: olderThanDays,
      tasks: completedTasks
    };
    
    await fs.writeFile(archivePath, JSON.stringify(archiveData, null, 2), 'utf-8');
    archivedCount = completedTasks.length;
    
    // 更新任务文件
    taskFile.tasks = activeTasks;
    taskFile.lastUpdated = Date.now();
    
    await writeFileLocked(getTaskFilePath(), taskFile);
    
    console.log('[TaskSystem] Completed tasks archived:', {
      archived: archivedCount,
      remaining: activeTasks.length
    });
  }
  
  return {
    archived: archivedCount,
    remaining: activeTasks.length
  };
}

/**
 * 自动压缩和归档（新增 - 功能点 6）
 * 定期清理，保持系统性能
 */
export async function autoCompactAndArchive(
  options: {
    keepUnreadMessages?: number;
    archiveMessagesAfterDays?: number;
    archiveTasksAfterDays?: number;
  } = {}
): Promise<{
  messagesCompacted: number;
  messagesArchived: number;
  tasksArchived: number;
}> {
  const {
    keepUnreadMessages = 50,
    archiveMessagesAfterDays = 7,
    archiveTasksAfterDays = 7
  } = options;
  
  console.log('[TaskSystem] Starting auto compact and archive...');
  
  let totalCompacted = 0;
  let totalArchived = 0;
  
  // 压缩所有 Agent 的消息
  try {
    const agentsDir = getAgentDirPath(''); // agents 目录
    const agentDirs = await fs.readdir(agentsDir);
    
    for (const agentDir of agentDirs) {
      const agentPath = path.join(agentsDir, agentDir);
      const stats = await fs.stat(agentPath);
      
      if (stats.isDirectory()) {
        const result = await compactMessages(agentDir, keepUnreadMessages);
        totalCompacted += result.compacted;
        totalArchived += result.archived;
      }
    }
  } catch (error) {
    console.error('[TaskSystem] Failed to compact agent messages:', error);
  }
  
  // 归档已完成任务
  try {
    const taskResult = await archiveCompletedTasks(archiveTasksAfterDays);
    totalArchived += taskResult.archived;
  } catch (error) {
    console.error('[TaskSystem] Failed to archive tasks:', error);
  }
  
  console.log('[TaskSystem] Auto compact and archive completed:', {
    messagesCompacted: totalCompacted,
    messagesArchived: totalArchived,
    tasksArchived: totalArchived
  });
  
  return {
    messagesCompacted: totalCompacted,
    messagesArchived: totalArchived,
    tasksArchived: totalArchived
  };
}
