import { spawn } from 'node:child_process';

function runGit(cwd, args, { timeoutMs = 15000 } = {}) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn('git', args, {
        cwd,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      resolve({ ok: false, code: -1, stdout: '', stderr: String(error?.message ?? error) });
      return;
    }
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      resolve({ ok: false, code: -2, stdout, stderr: 'git 超时' });
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, code: -1, stdout, stderr: String(error?.message ?? error) });
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: code === 0, code: code ?? -1, stdout: stdout.trimEnd(), stderr: stderr.trimEnd() });
    });
  });
}

/** Repository state for one space root: branch, dirty count, and our own paths. */
export async function gitStatus(root, relDir) {
  const inside = await runGit(root, ['rev-parse', '--is-inside-work-tree']);
  if (!inside.ok || inside.stdout.trim() !== 'true') {
    return { available: false, reason: inside.stderr || '不是 git 仓库' };
  }
  const [branch, head, status] = await Promise.all([
    runGit(root, ['rev-parse', '--abbrev-ref', 'HEAD']),
    runGit(root, ['log', '-1', '--format=%h %s']),
    runGit(root, ['status', '--porcelain=v1', '-b']),
  ]);
  const lines = status.stdout.split('\n').filter(Boolean);
  const header = lines[0]?.startsWith('##') ? lines[0] : '';
  const changes = lines.filter((line) => !line.startsWith('##'));
  const ours = changes.filter((line) => line.includes(relDir));
  return {
    available: true,
    branch: branch.ok ? branch.stdout.trim() : '',
    head: head.ok ? head.stdout.trim() : '',
    aheadBehind: header.replace(/^##\s*/, ''),
    dirty: changes.length,
    ourChanges: ours.length,
    ourFiles: ours.slice(0, 20).map((line) => line.slice(3)),
  };
}

/** Stage and commit only the plugin's own metadata directory. Never pushes. */
export async function gitCommitMeta(root, relDir, message) {
  const add = await runGit(root, ['add', '--', relDir]);
  if (!add.ok) return { committed: false, stage: false, detail: add.stderr };
  const commit = await runGit(root, ['commit', '-m', message, '--', relDir]);
  if (!commit.ok) {
    const nothing = /nothing to commit|nothing added to commit|no changes added|无文件要提交/i.test(
      commit.stdout + commit.stderr,
    );
    return { committed: false, stage: true, nothingToCommit: nothing, detail: commit.stdout || commit.stderr };
  }
  return { committed: true, detail: commit.stdout };
}
