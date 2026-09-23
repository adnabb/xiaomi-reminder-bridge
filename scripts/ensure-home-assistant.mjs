#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const execFileDefault = promisify(execFileCallback);
const PROJECT_DIR = resolve(fileURLToPath(new URL('..', import.meta.url)));

function validateEnvironment(env) {
  if (!env.HA_TOKEN) {
    throw new Error('缺少 HA_TOKEN，无法检查 Home Assistant');
  }
  if (!env.HA_XIAOMI_ENTITY_ID?.startsWith('text.') ||
      !env.HA_XIAOMI_ENTITY_ID.includes('execute_text_directive')) {
    throw new Error('HA_XIAOMI_ENTITY_ID 不是 Execute Text Directive 文本实体');
  }
}

async function checkHomeAssistant({ env, fetchImpl }) {
  const haUrl = (env.HA_URL || 'http://127.0.0.1:8123').replace(/\/$/, '');
  try {
    const response = await fetchImpl(
      `${haUrl}/api/states/${encodeURIComponent(env.HA_XIAOMI_ENTITY_ID)}`,
      {
        headers: { Authorization: `Bearer ${env.HA_TOKEN}` },
        signal: AbortSignal.timeout(5_000)
      }
    );
    if (response.ok) {
      return 'ready';
    }
    if (response.status === 401 || response.status === 403) {
      return 'auth-error';
    }
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

export async function ensureHomeAssistant({
  env = process.env,
  fetchImpl = globalThis.fetch,
  execFileImpl = execFileDefault,
  sleep = (milliseconds) => new Promise((resolveSleep) =>
    setTimeout(resolveSleep, milliseconds)),
  stdout = console.log,
  stderr = console.error,
  timeoutMs = 120_000,
  intervalMs = 2_000,
  projectDir = PROJECT_DIR
} = {}) {
  try {
    validateEnvironment(env);
  } catch (error) {
    stderr(error.message);
    return 2;
  }

  const initialStatus = await checkHomeAssistant({ env, fetchImpl });
  if (initialStatus === 'ready') {
    stdout('Home Assistant 已就绪，无需启动服务。');
    stdout('启动范围：none');
    return 0;
  }
  if (initialStatus === 'auth-error') {
    stderr('Home Assistant 拒绝认证，请更新 HA_TOKEN；未启动服务，也未发送提醒。');
    return 1;
  }

  stdout('Home Assistant 当前不可访问，正在检查 Docker。');
  let startedColima = false;
  try {
    await execFileImpl('docker', ['info'], { cwd: projectDir });
  } catch {
    stdout('Docker daemon 未就绪，正在启动 Colima。');
    try {
      await execFileImpl('colima', ['start'], { cwd: projectDir });
      startedColima = true;
    } catch (error) {
      stderr(`Colima 启动失败：${error.message}`);
      return 1;
    }
  }

  stdout('正在启动 Home Assistant 容器。');
  try {
    await execFileImpl('docker', ['compose', 'up', '-d'], { cwd: projectDir });
  } catch (error) {
    stderr(`Home Assistant 容器启动失败：${error.message}`);
    return 1;
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await checkHomeAssistant({ env, fetchImpl });
    if (status === 'ready') {
      stdout('Home Assistant 已启动并通过只读实体检查。');
      stdout(`启动范围：${startedColima
        ? 'colima-and-home-assistant'
        : 'home-assistant'}`);
      return 0;
    }
    if (status === 'auth-error') {
      stderr('Home Assistant 已启动，但令牌认证失败；未发送提醒。');
      return 1;
    }
    await sleep(intervalMs);
  }

  stderr(`Home Assistant 在 ${Math.round(timeoutMs / 1000)} 秒内未就绪；未发送提醒。`);
  return 1;
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = await ensureHomeAssistant();
}
