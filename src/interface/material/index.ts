/**
 * =========================================================================
 * 1. 基础材质节点 (Base Material Node)
 * =========================================================================
 */
export interface IBaseMaterialNode {
  id: string;               
  type: string;             
  title: string;            
  x: number;                
  y: number;                
  width?: number;           
  height?: number;          
  iconName?: string | null; 
  color?: string;           
  isActive: boolean;        
  outputData?: any;         
}

/**
 * =========================================================================
 * 2. 实体角色类 (Entities)
 * =========================================================================
 */
export interface IHumanNode extends IBaseMaterialNode {
  type: 'human';
  role?: string;            
  avatar?: string;          
  github?: string;          
  initials?: string;        
}

export interface IAgentNode extends IBaseMaterialNode {
  type: 'member';
  role: 'leader' | 'reviewer' | 'executor'; 
  runtimeEnv?: string;      
  model?: string;           
  sessionId?: string | null;
  iconColor?: string;       
  metadata?: Array<{ id: string; key: string; value: string }>;
  content?: Array<{ id: string; title: string; value: string }>;
}

/**
 * =========================================================================
 * 3. 工具箱抽象分类 (Tool Categories)
 * =========================================================================
 */

// 🌟 新增：连接器类 (Connector) - 数据线
export interface IConnectorNode extends IBaseMaterialNode {
  type: 'tool-connector';
  connectorParams?: {
    sourceId: string | null; // 吸附的起点节点 ID
    targetId: string | null; // 吸附的终点节点 ID
    startPos: { x: number; y: number }; // 游离状态下的起点坐标
    endPos: { x: number; y: number };   // 游离状态下的终点坐标
  };
}

export interface IContainerNode extends IBaseMaterialNode {
  type: 'container-rect' | 'container-round' | 'container-dash';
  containerParams?: {
    childrenIds?: string[]; 
    isLocked?: boolean;     
  };
}

export interface ITriggerNode extends IBaseMaterialNode {
  type: `tool-trigger-${string}`; 
  triggerParams?: {
    cronExpression?: string; 
    webhookUrl?: string;     
    mockPayload?: string;    
  };
}

export interface ITransformNode extends IBaseMaterialNode {
  type: 'tool-filter' | 'tool-map' | 'tool-json';
  transformParams?: {
    filterCondition?: string; 
    jsonSchema?: string;      
    mappingRules?: Record<string, string>; 
  };
}

export interface IFlowNode extends IBaseMaterialNode {
  type: 'tool-if' | 'tool-switch' | 'tool-loop';
  flowParams?: {
    conditionScript?: string; 
    maxLoops?: number;        
  };
}

export interface ICoreNode extends IBaseMaterialNode {
  type: 'tool-task-center' | 'tool-http' | 'tool-code';
  coreParams?: {
    method?: 'GET' | 'POST' | 'PUT';
    requestUrl?: string;
    scriptContent?: string;
    autoDispatch?: boolean;   
    taskFilterStatus?: string;
  };
}

export interface IReviewNode extends IBaseMaterialNode {
  type: 'tool-wait' | 'tool-slack' | 'tool-tg';
  reviewParams?: {
    approverIds?: string[];   
    notifyChannel?: string;   
    timeoutMinutes?: number;  
  };
}

/**
 * =========================================================================
 * 4. 全局联合类型 (Union Type)
 * =========================================================================
 */
export type AnyMaterialNode = 
  | IHumanNode 
  | IAgentNode 
  | IConnectorNode // 加入 Connector
  | IContainerNode 
  | ITriggerNode 
  | ITransformNode 
  | IFlowNode 
  | ICoreNode 
  | IReviewNode;