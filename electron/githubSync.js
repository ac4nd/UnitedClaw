const { Octokit } = require('@octokit/rest');
const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');

async function syncWorkspaceToGithub(token, targetDir) {
  try {
    // 🌟 核心防御：绝对不能是空路径，否则 simple-git 会默认同步项目源码目录！
    if (!targetDir || !fs.existsSync(targetDir)) {
      throw new Error(`致命错误：同步目标目录无效或不存在 -> ${targetDir}`);
    }

    console.log(`[GitHub Sync] 锁定目标同步目录: ${targetDir}`);

    const octokit = new Octokit({ auth: token });
    
    // 🌟 强制指定 baseDir，将其死死钉在 ~/.unitedclaw/uc_workspace
    const git = simpleGit({ baseDir: targetDir });
    const repoName = "uc_workspace";

    // 1. 验证用户
    const { data: user } = await octokit.rest.users.getAuthenticated();
    const username = user.login;
    console.log(`[GitHub Sync] 已验证账号: ${username}`);

    // 2. 检查或创建远端仓库
    let repoUrl = '';
    try {
      const { data: repo } = await octokit.rest.repos.get({ owner: username, repo: repoName });
      repoUrl = repo.clone_url;
      console.log(`[GitHub Sync] 远程仓库已存在: ${repoUrl}`);
    } catch (error) {
      if (error.status === 404) {
        console.log(`[GitHub Sync] 远程仓库不存在，自动创建私有仓库...`);
        const { data: newRepo } = await octokit.rest.repos.createForAuthenticatedUser({
          name: repoName,
          private: true,
          description: 'Auto-synced workspace from UnitedClaw AgentIDE'
        });
        repoUrl = newRepo.clone_url;
      } else {
        throw error;
      }
    }

    // 3. 初始化本地 Git
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      await git.init();
      await git.addConfig('user.name', username);
      await git.addConfig('user.email', user.email || `${username}@users.noreply.github.com`);
    }

    // 禁用凭证缓存，强制使用 Token 免密
    await git.addConfig('credential.helper', '');

    // 4. 配置免密 URL
    const authRepoUrl = repoUrl.replace('https://', `https://${token}@`);
    const remotes = await git.getRemotes(true);
    if (!remotes.find(r => r.name === 'origin')) {
      await git.addRemote('origin', authRepoUrl);
    } else {
      await git.remote(['set-url', 'origin', authRepoUrl]);
    }

    // 5. 提交与推送
    await git.add('./*');
    const status = await git.status();
    
    if (status.staged.length > 0 || status.not_added.length > 0 || status.modified.length > 0 || status.deleted.length > 0) {
      await git.commit(`Auto-sync: ${new Date().toLocaleString()}`);
      console.log(`[GitHub Sync] 发现文件变更，已生成 Commit`);
    } else {
      console.log(`[GitHub Sync] 目录无文件变更，直接尝试推送`);
    }

    await git.branch(['-M', 'main']);
    await git.push(['-u', 'origin', 'main']);

    console.log('[GitHub Sync] ✅ 工作区完美推送到云端！');
    return { success: true, username, repoUrl };

  } catch (error) {
    console.error('[GitHub Sync Error]', error.message);
    return { success: false, msg: error.message };
  }
}

module.exports = { syncWorkspaceToGithub };