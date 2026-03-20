const fs = require('fs');
const path = require('path');
const os = require('os');

// 🌟 核心引擎：静态文件解析器，直接读取 CLI 的本地配置文件
function parseCliModels(cliName) {
  const homeDir = os.homedir();
  const models = [];

  try {
    if (cliName === 'opencode') {
      // 读取路径: ~/.config/opencode/opencode.json
      const configPath = path.join(homeDir, '.config', 'opencode', 'opencode.json');
      
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configData);

        // 启发式提取模型名 (兼容不同版本的 opencode 结构)
        // 1. 如果配置了默认单模型
        if (config.model) {
          models.push({ provider: config.provider || 'OpenAI', model: config.model });
        } else if (config.llm && config.llm.model) {
          models.push({ provider: config.llm.provider || 'OpenAI', model: config.llm.model });
        }
        
        // 2. 如果配置了多个模型列表 (数组格式)
        if (Array.isArray(config.models)) {
          config.models.forEach(m => {
            if (typeof m === 'string') {
              models.push({ provider: 'OpenAI', model: m });
            } else if (m.model) {
              models.push({ provider: m.provider || 'OpenAI', model: m.model });
            }
          });
        }
        // 3. 如果配置了多个模型 (对象格式)
        else if (typeof config.models === 'object' && config.models !== null) {
          Object.keys(config.models).forEach(key => {
            models.push({ provider: config.models[key].provider || 'OpenAI', model: key });
          });
        }
      }
    } 
    else if (cliName === 'claudecode') {
      // 读取路径: ~/.config/claudecode/config.json (举例)
      const configPath = path.join(homeDir, '.config', 'claudecode', 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.model) {
          models.push({ provider: 'Anthropic', model: config.model });
        }
      }
    }
  } catch (err) {
    console.log(`[Scanner] 解析 ${cliName} 配置文件失败:`, err.message);
  }

  // 数组去重去空
  const uniqueModels = [];
  const seen = new Set();
  for (const m of models) {
    if (!m.model) continue;
    const key = `${m.provider}-${m.model}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueModels.push(m);
    }
  }

  return uniqueModels;
}

// 确保 Windows 系统下优先匹配 .exe 或 .cmd 记录在配置中
function getWinExtPriority(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.exe') return 4;
  if (ext === '.cmd') return 3;
  if (ext === '.bat') return 2;
  if (ext === '') return 1;  
  return 0; 
}

async function scanSystemCLI() {
  const isWin = process.platform === 'win32';
  const envPath = process.env.PATH || '';
  const paths = envPath.split(isWin ? ';' : ':');
  
  if (isWin && process.env.USERPROFILE) {
    paths.push(path.join(process.env.USERPROFILE, 'AppData', 'Roaming', 'npm'));
    paths.push(path.join(process.env.USERPROFILE, 'AppData', 'Local', 'pnpm'));
  }

  const TOOL_CATEGORIES = {
    'opencode': 'coding-tool',
    'claudecode': 'coding-tool',
    'codex': 'coding-tool',
    'aider': 'coding-tool',
    'cursor': 'coding-tool',
    'git': 'version-control',
    'npm': 'package-manager',
    'node': 'runtime-env',
    'python': 'runtime-env',
  };

  const cliStructure = {};
  const foundTools = new Map();

  // 第一步：快速扫描可执行文件
  paths.forEach(dir => {
    if (!dir || !fs.existsSync(dir)) return;
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        let baseName = file.toLowerCase();
        
        if (isWin) baseName = baseName.replace(/\.(exe|cmd|bat|ps1)$/i, '');
        else baseName = baseName.replace(/\.sh$/i, '');
        
        if (TOOL_CATEGORIES[baseName]) {
          const category = TOOL_CATEGORIES[baseName];
          const existing = foundTools.get(baseName);
          
          if (isWin) {
            const currentPriority = getWinExtPriority(file);
            const existingPriority = existing ? getWinExtPriority(existing.command) : -1;
            if (currentPriority > existingPriority) {
              foundTools.set(baseName, { category, baseName, executablePath: path.join(dir, file), command: file, dirPath: dir });
            }
          } else {
            if (!existing) {
              foundTools.set(baseName, { category, baseName, executablePath: path.join(dir, file), command: file, dirPath: dir });
            }
          }
        }
      });
    } catch (e) { /* ignore */ }
  });

  // 第二步：通过直接解析配置文件获取模型，不再派生子进程
  for (const tool of Array.from(foundTools.values())) {
    if (!cliStructure[tool.category]) cliStructure[tool.category] = {};

    let modelsList = [];
    if (tool.category === 'coding-tool') {
      // 🌟 直接调用静态解析器，无延时、不报错
      modelsList = parseCliModels(tool.baseName);
    }

    cliStructure[tool.category][tool.baseName] = {
      enabled: true,
      path: tool.dirPath,
      command: tool.command,
      ...(modelsList.length > 0 ? { models: modelsList } : {})
    };
  }

  return cliStructure;
}

module.exports = { scanSystemCLI };