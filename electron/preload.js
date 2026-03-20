const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Agent 文件管理
  saveAgentFile: (filename, content) => ipcRenderer.invoke('save-agent-file', filename, content),
  loadAgents: () => ipcRenderer.invoke('load-agents'),
  deleteAgentFile: (filename) => ipcRenderer.invoke('delete-agent-file', filename),
  checkAgentSyncStatus: () => ipcRenderer.invoke('check-agent-sync-status'),
  
  // 系统环境扫描
  readConfig: () => ipcRenderer.invoke('read-unitedclaw-config'),
  scanCLIAndUpdate: () => ipcRenderer.invoke('scan-and-update-cli'),
  
  // 🌟 项目空间专属接口
  loadProjects: () => ipcRenderer.invoke('load-projects'),
  createProject: (projectName) => ipcRenderer.invoke('create-project', projectName),
  updateProjectTasks: (projectName, tasks) => ipcRenderer.invoke('update-project-tasks', projectName, tasks),
  saveProjectMd: (projectName, mdContent) => ipcRenderer.invoke('save-project-md', projectName, mdContent),
  
  // 🌟 重命名接口
  renameProject: (oldName, newName) => ipcRenderer.invoke('rename-project', oldName, newName),
  
  // 🌟 核心修改：初始化智能体通信信箱，增加 agentRole 参数透传
  initAgentWorkspace: (projectName, agentName, agentRole) => ipcRenderer.invoke('init-agent-workspace', projectName, agentName, agentRole),
  
  // 🌟 工作流存储接口
  saveWorkflow: (projectName, workflowData) => ipcRenderer.invoke('save-workflow', projectName, workflowData),
  loadWorkflow: (projectName) => ipcRenderer.invoke('load-workflow', projectName),
  
  // 🌟 向智能体发送消息
  sendAgentMessage: (projectName, agentName, messageData) => ipcRenderer.invoke('send-agent-message', projectName, agentName, messageData),
  
  // GitHub 同步相关
  githubLogin: (token) => ipcRenderer.invoke('github-login', token),
  githubSyncNow: () => ipcRenderer.invoke('github-sync-now'),
  
  // 🌟 终端 PTY 相关 API
  createTerminal: (terminalId, cwd) => ipcRenderer.invoke('create-terminal', terminalId, cwd),
  terminalInput: (terminalId, data) => ipcRenderer.send('terminal-input', terminalId, data),
  resizeTerminal: (terminalId, cols, rows) => ipcRenderer.send('resize-terminal', terminalId, cols, rows),
  destroyTerminal: (terminalId) => ipcRenderer.invoke('destroy-terminal', terminalId),
  
  // 监听终端输出数据
  onTerminalOutput: (terminalId, callback) => {
    const channel = `terminal-output-${terminalId}`;
    // 移除旧的监听器防止内存泄漏
    ipcRenderer.removeAllListeners(channel);
    ipcRenderer.on(channel, (event, data) => callback(data));
  },
});