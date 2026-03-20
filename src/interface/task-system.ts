/**
 * UnitedClaw Agent 任务编排系统 - 数据类型定义
 */

/**
 * 任务状态枚举（增强版 - 支持审查流程）
 */
export type TaskStatus = 
  | 'pending'       // 待领取
  | 'assigned'      // 已分配
  | 'in_progress'   // 执行中
  | 'completed'     // 已完成（待审查）
  | 'under_review'  // 审查中（新增）
  | 'revision_requested' // 要求修改（新增）
  | 'review_passed' // 审查通过（新增）
  | 'failed';       // 失败

/**
 * 任务接口（增强版 - 支持依赖关系）
 */
export interface ITask {
  id: string;                    // 任务 ID
  title: string;                 // 任务标题
  description: string;           // 任务描述
  status: TaskStatus;            // 任务状态
  priority: 'low' | 'medium' | 'high';  // 优先级
  createdAt: number;             // 创建时间戳
  updatedAt: number;             // 更新时间戳
  startedAt?: number;            // 开始时间戳（新增）
  completedAt?: number;          // 完成时间戳（新增）
  assignedTo?: string;           // 分配给的 Agent ID
  createdBy: string;             // 创建者 Agent ID
  dependencies?: string[];       // 依赖的任务 ID 列表（新增）
  blockers?: string[];           // 阻塞此任务的任务 ID（新增）
  result?: string;               // 任务结果描述（新增）
  metadata?: Record<string, any>; // 元数据
}

/**
 * 消息类型枚举（对齐 Claude Team + 审查流程）
 */
export type MessageType =
  | 'direct'         // 一对一直接消息
  | 'broadcast'      // 广播给所有队员
  | 'task-handoff'   // 任务交接消息
  | 'notification'   // 系统通知
  | 'task_assign'    // 任务分配（兼容旧版）
  | 'task_update'    // 任务状态更新（兼容旧版）
  | 'task_claim'     // 任务认领通知
  | 'task_complete'  // 任务完成通知
  | 'ack'            // 确认收到（兼容旧版）
  | 'review_request' // 审查请求（新增）
  | 'review_result'  // 审查结果（新增）
  | 'review_passed'  // 审查通过（新增）
  | 'review_failed'  // 审查失败（新增）
  | 'task_submit'    // 任务提交（新增）
  | 'task_revise'    // 任务修改（新增）
  ;

/**
 * 消息接口（增强版）
 */
export interface IMessage {
  id: string;                    // 消息 ID
  type: MessageType;             // 消息类型
  fromAgentId: string;           // 发送者 Agent ID
  toAgentId?: string;            // 接收者 Agent ID（广播时为空）
  toAgentIds?: string[];         // 接收者列表（广播时使用）
  isBroadcast: boolean;          // 是否广播消息
  content: string | any;         // 消息内容
  createdAt: number;             // 创建时间戳
  read: boolean;                 // 是否已读
  relatedTask?: string;          // 关联的任务 ID
  metadata?: Record<string, any>; // 元数据（如交接文档链接等）
}

/**
 * Agent 连接关系
 */
export interface IAgentConnection {
  id: string;                    // 连接 ID
  upstreamId: string;            // 上游 Agent ID（编排类）
  downstreamId: string;          // 下游 Agent ID（执行类）
  createdAt: number;             // 创建时间戳
}

/**
 * 工作区配置
 */
export interface IWorkspaceConfig {
  workspacePath: string;         // 工作区路径
  taskFilePath: string;          // task.json 路径
  agentsDirPath: string;         // agents 目录路径
}

/**
 * 任务文件结构
 */
export interface ITaskFile {
  tasks: ITask[];                // 任务列表
  lastUpdated: number;           // 最后更新时间
}

/**
 * 消息文件结构
 */
export interface IMessagesFile {
  messages: IMessage[];          // 消息列表
  lastReadIndex: number;         // 最后读取位置
}

// =========================================================================
// 审查流程相关接口（新增）
// =========================================================================

/**
 * 审查状态枚举
 */
export type ReviewStatus =
  | 'pending'      // 待审查
  | 'in_progress'  // 审查中
  | 'passed'       // 通过
  | 'failed'       // 失败（需要修改）
  | 'revising'     // 修改中
  ;

/**
 * 测试案例接口
 */
export interface ITestCase {
  id: string;                    // 案例 ID
  title: string;                 // 案例标题
  description: string;           // 案例描述
  steps: string[];               // 测试步骤
  expectedResult: string;        // 预期结果
  status: 'pending' | 'passed' | 'failed'; // 测试状态
  actualResult?: string;         // 实际结果
  notes?: string;                // 备注
}

/**
 * 审查记录接口
 */
export interface IReviewRecord {
  id: string;                    // 审查记录 ID
  taskId: string;                // 关联任务 ID
  reviewerId: string;            // 审查 Agent ID
  executorId: string;            // 执行 Agent ID
  createdAt: number;             // 创建时间
  updatedAt: number;             // 更新时间
  testCases: ITestCase[];        // 测试案例列表
  overallStatus: ReviewStatus;   // 整体审查状态
  comments: string[];            // 审查意见
  revisionCount: number;         // 修改次数
  completedAt?: number;          // 审查完成时间
}

/**
 * 审查请求消息内容
 */
export interface IReviewRequestContent {
  type: 'review_request';
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  executorId: string;
  result?: string;
  metadata?: Record<string, any>;
  requestedAt: number;
}

/**
 * 审查结果消息内容
 */
export interface IReviewResultContent {
  type: 'review_result';
  taskId: string;
  reviewId: string;
  status: ReviewStatus;
  passedCases: number;
  failedCases: number;
  totalCases: number;
  comments: string[];
  failedCasesDetails?: ITestCase[];
  reviewedAt: number;
}
