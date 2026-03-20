
const os = require('os');
const path = require('path');
const fs = require('fs');

function initializeUnitedClaw() {
  const homeDir = os.homedir(); 
  const workspacePath = path.join(homeDir, '.unitedclaw');
  const agentsPath = path.join(workspacePath, 'agents');
  const configPath = path.join(workspacePath, 'unitedclaw.json');
  
  // 🌟 锁定我们要同步的目标绝对路径
  const ucWorkspacePath = path.join(workspacePath, 'uc_workspace');

  try {
    if (!fs.existsSync(workspacePath)) fs.mkdirSync(workspacePath, { recursive: true });
    if (!fs.existsSync(agentsPath)) fs.mkdirSync(agentsPath, { recursive: true });
    
    // 初始化 uc_workspace
    if (!fs.existsSync(ucWorkspacePath)) {
      fs.mkdirSync(ucWorkspacePath, { recursive: true });
      fs.writeFileSync(path.join(ucWorkspacePath, 'README.md'), '# UnitedClaw Workspace\n\n自动同步的本地工作区。');
    }

    if (!fs.existsSync(configPath)) {
      const initialConfig = { runtime: { cli: {} }, githubToken: null };
      fs.writeFileSync(configPath, JSON.stringify(initialConfig, null, 2), 'utf-8');
    }

    // 必须确保 ucWorkspacePath 成功返回
    return { success: true, workspacePath, agentsPath, configPath, ucWorkspacePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = { initializeUnitedClaw };