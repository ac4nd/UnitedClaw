"use server";

import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

// 跨平台检查命令是否存在
async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    const checkCmd = process.platform === 'win32' ? `where ${command}` : `command -v ${command}`;
    await execAsync(checkCmd);
    return true; // 命令存在
  } catch (e) {
    return false; // 命令不存在
  }
}

export async function scanLocalEnvironment() {
  const homeDir = os.homedir();
  const workspacePath = path.join(homeDir, '.unitedclaw');
  const configPath = path.join(workspacePath, 'unitedclaw.json');
  
  // 1. 并发执行本地 CLI 命令探测
  const [hasOpencode, hasClaudeCode, hasCodex] = await Promise.all([
    isCommandAvailable('opencode'),
    isCommandAvailable('claudecode'),
    isCommandAvailable('codex')
  ]);

  const cliStatus = {
    opencode: hasOpencode,
    claudecode: hasClaudeCode,
    codex: hasCodex
  };

  // 2. 读取项目本身已存在的 unitedclaw.json
  let config: any = {};
  try {
    const fileContent = await fs.readFile(configPath, 'utf-8');
    config = JSON.parse(fileContent);
  } catch (error) {
    console.warn("⚠️ 读取 unitedclaw.json 失败或文件不存在，将使用空对象作为基础。");
    config = {};
  }

  // 3. 严格的注入逻辑：确保 runtime 存在，并将 cli 属性注入其中
  if (!config.runtime) {
    config.runtime = {};
  }
  
  config.runtime.cli = {
    ...(config.runtime.cli || {}),
    ...cliStatus
  };

  // 4. 将更新后的完整 JSON 写回文件 (保持原有其他属性不变)
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

  // 5. 返回 runtime 数据给前端供 Zustand 使用
  return config.runtime;
}