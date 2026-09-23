#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const execFileDefault = promisify(execFileCallback);
const PROJECT_DIR = resolve(fileURLToPath(new URL('..', import.meta.url)));
const USAGE = `用法：
  npm run ha:stop -- --home-assistant
  npm run ha:stop -- --home-assistant-and-colima-if-idle

必须显式选择关闭范围；该命令不会停止其他 Docker 容器。
`;

export function parseStopArgs(argv) {
  if (argv.length !== 1) {
    throw new Error('必须显式选择一个关闭范围');
  }
  if (argv[0] === '--home-assistant') {
    return { stopColimaIfIdle: false };
  }
  if (argv[0] === '--home-assistant-and-colima-if-idle') {
    return { stopColimaIfIdle: true };
  }
  throw new Error(`未知参数：${argv[0]}`);
}

export async function stopHomeAssistant({
  argv = process.argv.slice(2),
  execFileImpl = execFileDefault,
  stdout = console.log,
  stderr = console.error,
  projectDir = PROJECT_DIR
} = {}) {
  let options;
  try {
    options = parseStopArgs(argv);
  } catch (error) {
    stderr(error.message);
    stderr(USAGE);
    return 2;
  }

  if (options.stopColimaIfIdle) {
    try {
      await execFileImpl('colima', ['status'], { cwd: projectDir });
    } catch {
      stdout('Colima 当前未运行，小爱提醒环境已经关闭。');
      return 0;
    }
  }

  try {
    await execFileImpl('docker', ['compose', 'stop'], { cwd: projectDir });
  } catch (error) {
    stderr(`Home Assistant 停止失败：${error.message}`);
    return 1;
  }
  stdout('Home Assistant 容器已停止。');

  if (!options.stopColimaIfIdle) {
    stdout('Colima 保持运行。');
    return 0;
  }

  let runningContainers;
  try {
    const result = await execFileImpl('docker', ['ps', '-q'], {
      cwd: projectDir
    });
    runningContainers = result.stdout?.trim() || '';
  } catch (error) {
    stderr(`无法检查其他容器，出于安全考虑保留 Colima：${error.message}`);
    return 1;
  }

  if (runningContainers) {
    stdout('检测到其他运行中的 Docker 容器，Colima 保持运行。');
    return 0;
  }

  try {
    await execFileImpl('colima', ['stop'], { cwd: projectDir });
  } catch (error) {
    stderr(`Colima 停止失败：${error.message}`);
    return 1;
  }
  stdout('没有其他运行中的容器，Colima 已停止。');
  return 0;
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = await stopHomeAssistant();
}
