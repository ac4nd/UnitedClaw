const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { initializeUnitedClaw } = require('./initWorkspace');
const { scanSystemCLI } = require('./cliScanner');
// 顶部引入同步脚本
const { syncWorkspaceToGithub } = require('./githubSync');
const pty = require('node-pty');
const os = require('os');

let workspaceInfo = null;

const terminalPool = new Map();

function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900,
    title: 'UnitedClaw AgentIDE',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) win.loadURL('http://localhost:3000');
  else win.loadFile(path.join(__dirname, '../out/index.html'));
}

async function performScanAndUpdate() {
  if (!workspaceInfo || !workspaceInfo.success) return { success: false, msg: '工作区未初始化' };
  try {
    // 等待子进程抓取完成
    const newCliStructure = await scanSystemCLI();
    
    let config = {};
    if (fs.existsSync(workspaceInfo.configPath)) {
      const fileContent = fs.readFileSync(workspaceInfo.configPath, 'utf-8');
      if (fileContent.trim()) config = JSON.parse(fileContent);
    }

    if (!config.runtime) config.runtime = {};
    if (!config.runtime.cli) config.runtime.cli = {};

    // 🌟 核心修复：增量合并更新 (Deep Merge)
    for (const [category, tools] of Object.entries(newCliStructure)) {
      if (!config.runtime.cli[category]) config.runtime.cli[category] = {};
      
      for (const [toolName, toolData] of Object.entries(tools)) {
        // 如果文件里没有这个工具，直接赋值
        if (!config.runtime.cli[category][toolName]) {
          config.runtime.cli[category][toolName] = toolData;
        } else {
          // 如果文件里已有该工具，保留其原有的 enabled 状态，只更新路径和扫描出的 models
          config.runtime.cli[category][toolName].path = toolData.path;
          config.runtime.cli[category][toolName].command = toolData.command;
          if (toolData.models) {
            config.runtime.cli[category][toolName].models = toolData.models;
          }
        }
      }
    }

    config.updatedAt = new Date().toISOString(); 
    
    // 写入最终更新结果
    fs.writeFileSync(workspaceInfo.configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`[Auto-Scan] 扫描完成，已将模型数据写入 unitedclaw.json`);
    
    return { success: true, data: config };
  } catch (error) {
    console.error("[Scan Error]", error);
    return { success: false, msg: error.message };
  }
}

ipcMain.handle('create-terminal', async (event, terminalId, cwd) => {
  try {
    if (terminalPool.has(terminalId)) {
      return { success: false, msg: 'Terminal already exists' };
    }

    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    
    let workingDir = cwd || process.cwd();
    
    if (workingDir && workingDir.startsWith('~')) {
      workingDir = path.join(os.homedir(), workingDir.slice(1));
    }
    
    if (workingDir && !fs.existsSync(workingDir)) {
      console.warn(`[Terminal] 指定的工作目录不存在: ${workingDir}，使用默认目录`);
      workingDir = process.cwd();
    }

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: workingDir,
      env: process.env
    });

    terminalPool.set(terminalId, ptyProcess);

    ptyProcess.onData((data) => {
      event.sender.send(`terminal-output-${terminalId}`, data);
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`[Terminal] ${terminalId} exited with code ${exitCode}, signal ${signal}`);
      event.sender.send(`terminal-output-${terminalId}`, `\r\n[Process exited with code ${exitCode}]\r\n`);
      terminalPool.delete(terminalId);
    });

    return { success: true };
  } catch (error) {
    console.error('[[Error] 创建终端失败:', error);
    return { success: false, msg: error.message };
  }
});

ipcMain.on('terminal-input', (event, terminalId, data) => {
  try {
    const ptyProcess = terminalPool.get(terminalId);
    if (ptyProcess) {
      ptyProcess.write(data);
    }
  } catch (error) {
    console.error('[[Error] 终端输入失败:', error);
  }
});

ipcMain.on('resize-terminal', (event, terminalId, cols, rows) => {
  try {
    const ptyProcess = terminalPool.get(terminalId);
    if (ptyProcess) {
      ptyProcess.resize(cols, rows);
    }
  } catch (error) {
    console.error('[[Error] 调整终端大小失败:', error);
  }
});

ipcMain.handle('destroy-terminal', async (event, terminalId) => {
  try {
    const ptyProcess = terminalPool.get(terminalId);
    if (ptyProcess) {
      ptyProcess.kill();
      terminalPool.delete(terminalId);
    }
    return { success: true };
  } catch (error) {
    console.error('[[Error] 销毁终端失败:', error);
    return { success: false, msg: error.message };
  }
});

app.on('before-quit', () => {
  terminalPool.forEach((ptyProcess, terminalId) => {
    try {
      ptyProcess.kill();
      console.log(`[Cleanup] Terminated terminal ${terminalId}`);
    } catch (error) {
      console.error(`[Cleanup Error] Failed to terminate terminal ${terminalId}:`, error);
    }
  });
  terminalPool.clear();
});

app.whenReady().then(async () => {
  workspaceInfo = initializeUnitedClaw();
  
  // 🌟 应用启动时触发异步扫描
  if (workspaceInfo.success) {
    await performScanAndUpdate();

    // 🌟 开机静默同步：读取 Token，如果登录过，自动在后台同步
    const configData = JSON.parse(fs.readFileSync(workspaceInfo.configPath, 'utf-8'));
    if (configData.githubToken) {
      console.log("[App Start] 检测到 GitHub 登录态，正在启动开机同步...");
      syncWorkspaceToGithub(configData.githubToken, workspaceInfo.ucWorkspacePath);
    }
  }

  // 🌟 新增 IPC 接口：前端请求使用 Token 登录 GitHub
  ipcMain.handle('github-login', async (event, token) => {
    if (!workspaceInfo.success) return { success: false };
    
    // 1. 尝试使用 Token 跑一次同步测试
    const syncResult = await syncWorkspaceToGithub(token, workspaceInfo.ucWorkspacePath);
    
    if (syncResult.success) {
      // 2. 如果成功，把 Token 写入联合配置文件
      const configData = JSON.parse(fs.readFileSync(workspaceInfo.configPath, 'utf-8'));
      configData.githubToken = token;
      configData.githubUser = syncResult.username;
      fs.writeFileSync(workspaceInfo.configPath, JSON.stringify(configData, null, 2), 'utf-8');
    }
    
    return syncResult; // 返回成功态和 GitHub 用户名、仓库 URL 给 React
  });

  // ==== IPC 接口区 ====
  // 🌟 新增 IPC 接口：前端手动触发同步
  ipcMain.handle('github-sync-now', async () => {
    const configData = JSON.parse(fs.readFileSync(workspaceInfo.configPath, 'utf-8'));
    if (!configData.githubToken) return { success: false, msg: '未登录 GitHub' };
    return await syncWorkspaceToGithub(configData.githubToken, workspaceInfo.ucWorkspacePath);
  });

  ipcMain.handle('save-agent-file', async (event, filename, content) => {
    if (!workspaceInfo.success) return { success: false };
    try {
      const filePath = path.join(workspaceInfo.agentsPath, filename);
      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true, filePath };
    } catch (error) { return { success: false, msg: error.message }; }
  });

  ipcMain.handle('load-agents', async () => {
    if (!workspaceInfo.success) return { success: false };
    try {
      const files = fs.readdirSync(workspaceInfo.agentsPath).filter(f => f.endsWith('.md'));
      const agents = files.map(file => {
        const content = fs.readFileSync(path.join(workspaceInfo.agentsPath, file), 'utf-8');
        return { file, content };
      });
      return { success: true, data: agents };
    } catch (error) { return { success: false, msg: error.message }; }
  });

  ipcMain.handle('delete-agent-file', async (event, filename) => {
    if (!workspaceInfo.success) return { success: false };
    try {
      const filePath = path.join(workspaceInfo.agentsPath, filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return { success: true };
    } catch (error) { return { success: false, msg: error.message }; }
  });

  ipcMain.handle('check-agent-sync-status', async (event, filename) => {
  if (!workspaceInfo.success) return { success: false };
  if (!filename || typeof filename !== 'string') {
    return { success: false, msg: 'Invalid filename parameter' };
  }
  try {
    const syncStatus = {};

    if (fs.existsSync(workspaceInfo.configPath)) {
      const configData = JSON.parse(fs.readFileSync(workspaceInfo.configPath, 'utf-8'));
      const codingTools = configData?.runtime?.cli || {};

      for (const [toolName, tool] of Object.entries(codingTools)) {
        if (tool === true) {
          let targetAgentsDir = '';
          
          if (toolName === 'opencode') {
            targetAgentsDir = path.join(os.homedir(), '.config', 'opencode', 'agents');
          }

          if (targetAgentsDir) {
            const targetFilePath = path.join(targetAgentsDir, filename);
            syncStatus[toolName] = {
              synced: fs.existsSync(targetFilePath),
              path: targetFilePath
            };
          }
        }
      }
    }

    return { success: true, syncStatus };
  } catch (error) {
    console.error("[Error] 检查 Agent 同步状态失败:", error);
    return { success: false, msg: error.message };
  }
});

  ipcMain.handle('read-unitedclaw-config', async () => {
    if (!workspaceInfo.success) return { success: false };
    try {
      const configData = fs.readFileSync(workspaceInfo.configPath, 'utf-8');
      return { success: true, data: JSON.parse(configData) };
    } catch (error) { return { success: false, msg: error.message }; }
  });

  ipcMain.handle('scan-and-update-cli', async () => {
    return await performScanAndUpdate();
  });

  ipcMain.handle('load-projects', async () => {
    if (!workspaceInfo.success) return { success: false };
    try {
      const projectsPath = workspaceInfo.ucWorkspacePath;
      if (!fs.existsSync(projectsPath)) return { success: true, data: [] };
      
      const projectDirs = fs.readdirSync(projectsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && dirent.name !== '.git')
        .map(dirent => dirent.name);
      
      const projects = projectDirs.map(projectName => {
        const mdFilePath = path.join(projectsPath, projectName, `${projectName}.md`);
        const taskFilePath = path.join(projectsPath, projectName, 'task.json');
        
        let mdContent = '';
        let tasks = { tasks: [], metadata: {} };
        
        if (fs.existsSync(mdFilePath)) {
          mdContent = fs.readFileSync(mdFilePath, 'utf-8');
        }
        
        if (fs.existsSync(taskFilePath)) {
          try {
            tasks = JSON.parse(fs.readFileSync(taskFilePath, 'utf-8'));
          } catch (e) {
            console.error(`[Error] 解析 task.json 失败: ${projectName}`, e);
          }
        }
        
        return {
          id: projectName,
          name: projectName,
          mdContent: mdContent,
          tasks: tasks
        };
      });
      
      return { success: true, data: projects };
    } catch (error) {
      console.error("[Error] 加载项目列表失败:", error);
      return { success: false, msg: error.message };
    }
  });

  ipcMain.handle('create-project', async (event, projectName) => {
    if (!workspaceInfo.success) return { success: false };
    try {
      const projectPath = path.join(workspaceInfo.ucWorkspacePath, projectName);
      if (fs.existsSync(projectPath)) {
        return { success: false, msg: '项目已存在' };
      }
      
      fs.mkdirSync(projectPath, { recursive: true });
      
      const initialTasks = { tasks: [] };
      fs.writeFileSync(path.join(projectPath, 'task.json'), JSON.stringify(initialTasks, null, 2), 'utf-8');
      
      const initialMsgData = { messages: [] };
      fs.writeFileSync(path.join(projectPath, 'messages.json'), JSON.stringify(initialMsgData, null, 2), 'utf-8');
      
      return { success: true };
    } catch (error) {
      console.error("[Error] 创建项目失败:", error);
      return { success: false, msg: error.message };
    }
  });

  ipcMain.handle('update-project-tasks', async (event, projectName, tasks) => {
    if (!workspaceInfo.success) return { success: false };
    try {
      const projectPath = path.join(workspaceInfo.ucWorkspacePath, projectName);
      const taskPath = path.join(projectPath, 'task.json');
      fs.writeFileSync(taskPath, JSON.stringify(tasks, null, 2), 'utf-8');
      return { success: true };
    } catch (error) {
      console.error("[Error] 更新项目任务失败:", error);
      return { success: false, msg: error.message };
    }
  });

  ipcMain.handle('save-project-md', async (event, projectName, mdContent) => {
    if (!workspaceInfo.success) return { success: false };
    try {
      const projectPath = path.join(workspaceInfo.ucWorkspacePath, projectName);
      const mdPath = path.join(projectPath, 'project.md');
      fs.writeFileSync(mdPath, mdContent, 'utf-8');
      return { success: true };
    } catch (error) {
      console.error("[Error] 保存项目 MD 失败:", error);
      return { success: false, msg: error.message };
    }
  });

  ipcMain.handle('rename-project', async (event, oldName, newName) => {
    if (!workspaceInfo.success) return { success: false };
    try {
      const oldPath = path.join(workspaceInfo.ucWorkspacePath, oldName);
      const newPath = path.join(workspaceInfo.ucWorkspacePath, newName);
      
      if (!fs.existsSync(oldPath)) {
        return { success: false, msg: '项目不存在' };
      }
      
      if (fs.existsSync(newPath)) {
        return { success: false, msg: '目标项目名已存在' };
      }
      
      fs.renameSync(oldPath, newPath);
      return { success: true };
    } catch (error) {
      console.error("[Error] 重命名项目失败:", error);
      return { success: false, msg: error.message };
    }
  });

  ipcMain.handle('init-agent-workspace', async (event, projectName, agentName, agentRole) => {
    if (!workspaceInfo.success) return { success: false };
    try {
      const projectPath = path.join(workspaceInfo.ucWorkspacePath, projectName);
      const agentPath = path.join(projectPath, 'agents', agentName);
      
      if (!fs.existsSync(agentPath)) {
        fs.mkdirSync(agentPath, { recursive: true });
      }
      
      const roleFile = path.join(agentPath, 'role.json');
      if (!fs.existsSync(roleFile)) {
        fs.writeFileSync(roleFile, JSON.stringify({ role: agentRole }, null, 2), 'utf-8');
      }
      
      return { success: true, agentPath };
    } catch (error) {
      console.error("[Error] 初始化智能体工作空间失败:", error);
      return { success: false, msg: error.message };
    }
  });

  ipcMain.handle('save-workflow', async (event, projectName, workflowData) => {
    if (!workspaceInfo.success) return { success: false, msg: '工作区未初始化' };
    try {
      const wfPath = path.join(workspaceInfo.ucWorkspacePath, projectName, 'workflows.json');
      fs.writeFileSync(wfPath, JSON.stringify(workflowData, null, 2), 'utf-8');
      return { success: true };
    } catch (error) {
      console.error("[Error] 保存工作流失败:", error);
      return { success: false, msg: error.message };
    }
  });

  ipcMain.handle('load-workflow', async (event, projectName) => {
    if (!workspaceInfo.success) return { success: false, msg: '工作区未初始化' };
    try {
      const wfPath = path.join(workspaceInfo.ucWorkspacePath, projectName, 'workflows.json');
      if (!fs.existsSync(wfPath)) {
        return { success: true, data: null };
      }
      const data = JSON.parse(fs.readFileSync(wfPath, 'utf-8'));
      return { success: true, data };
    } catch (error) {
      console.error("[Error] 加载工作流失败:", error);
      return { success: false, msg: error.message };
    }
  });

  ipcMain.handle('send-agent-message', async (event, projectName, agentName, messageData) => {
    if (!workspaceInfo.success) return { success: false };
    try {
      const projectPath = path.join(workspaceInfo.ucWorkspacePath, projectName);
      const agentPath = path.join(projectPath, 'agents', agentName);
      const messagesPath = path.join(agentPath, 'messages.json');
      
      let messages = [];
      if (fs.existsSync(messagesPath)) {
        messages = JSON.parse(fs.readFileSync(messagesPath, 'utf-8'));
      }
      
      messages.push({
        ...messageData,
        timestamp: new Date().toISOString()
      });
      
      fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2), 'utf-8');
      return { success: true };
    } catch (error) {
      console.error("[Error] 发送智能体消息失败:", error);
      return { success: false, msg: error.message };
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});