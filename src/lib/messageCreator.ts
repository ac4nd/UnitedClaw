// 定义 Claude Team 模式中规定的消息类型
export type MessageType = 'direct' | 'broadcast' | 'task-handoff' | 'notification';

// 定义标准的消息体结构
export interface TeamMessage {
  id: string;
  from: string;
  to: string | string[];
  timestamp: number;
  type: MessageType;
  content: string;
  read: boolean;
  relatedTask?: string | null;
}

/**
 * 消息创建工厂函数
 * @param from 发送方 (如 "user_trigger", "lead", "alice")
 * @param to 接收方 (单个名称或名称数组)
 * @param content 消息主体内容
 * @param type 消息类型 (默认根据接收方数量自动判断)
 * @param relatedTask 关联的任务 ID (可选)
 */
export const createTeamMessage = (
  from: string,
  to: string | string[],
  content: string,
  type?: MessageType,
  relatedTask: string | null = null
): TeamMessage => {
  
  // 1. 智能推断消息类型
  let finalType: MessageType = type || 'direct';
  if (!type && Array.isArray(to) && to.length > 1) {
    finalType = 'broadcast'; // 如果接收者是数组且大于1，默认作为广播
  }

  // 2. 生成类似 "msg_001" 格式的唯一ID (附加时间戳哈希保证唯一性)
  const uniqueHash = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const messageId = `msg_${Date.now().toString().slice(-4)}${uniqueHash}`;

  // 3. 返回严格符合 Claude Team 协议的 JSON 载荷
  return {
    id: messageId,
    from,
    to,
    timestamp: Date.now(),
    type: finalType,
    content,
    read: false,
    relatedTask
  };
};