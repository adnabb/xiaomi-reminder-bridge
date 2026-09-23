#!/usr/bin/env node

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const USAGE = `用法：
  npm run reminder -- --check
  npm run reminder -- [--silent|--audible] "提醒内容"
  npm run reminder -- --send [--silent|--audible] "提醒内容"

--check 只读取目标实体。默认仅预览，只有显式指定 --send 才会发送。
`;

export function parseArgs(argv) {
  let send = false;
  let check = false;
  let silent = true;
  const directiveParts = [];

  for (const arg of argv) {
    if (arg === '--send') {
      send = true;
    } else if (arg === '--check') {
      check = true;
    } else if (arg === '--silent') {
      silent = true;
    } else if (arg === '--audible') {
      silent = false;
    } else if (arg === '--help' || arg === '-h') {
      return { help: true };
    } else if (arg.startsWith('--')) {
      throw new Error(`未知参数：${arg}`);
    } else {
      directiveParts.push(arg);
    }
  }

  if (check && send) {
    throw new Error('--check 与 --send 不能同时使用');
  }
  const directive = directiveParts.join(' ').trim();
  if (!check && !directive) {
    throw new Error('缺少提醒内容');
  }
  return { directive, send, check, silent, help: false };
}

export function buildRequest({ directive, silent, entityId }) {
  if (!entityId?.startsWith('text.') ||
      !entityId.includes('execute_text_directive')) {
    throw new Error('HA_XIAOMI_ENTITY_ID 不是 Execute Text Directive 文本实体');
  }

  return {
    entity_id: entityId,
    value: JSON.stringify([directive, silent])
  };
}

export async function run({
  argv = process.argv.slice(2),
  env = process.env,
  fetchImpl = globalThis.fetch,
  stdout = console.log,
  stderr = console.error
} = {}) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    stderr(error.message);
    stderr(USAGE);
    return 2;
  }

  if (options.help) {
    stdout(USAGE);
    return 0;
  }

  const haUrl = (env.HA_URL || 'http://127.0.0.1:8123').replace(/\/$/, '');
  const entityId = env.HA_XIAOMI_ENTITY_ID;
  if (!entityId?.startsWith('text.') ||
      !entityId.includes('execute_text_directive')) {
    stderr('HA_XIAOMI_ENTITY_ID 不是 Execute Text Directive 文本实体');
    return 2;
  }

  if (options.check) {
    if (!env.HA_TOKEN) {
      stderr('缺少 HA_TOKEN；未发起检查。');
      return 2;
    }
    let response;
    try {
      response = await fetchImpl(
        `${haUrl}/api/states/${encodeURIComponent(entityId)}`,
        {
          headers: { Authorization: `Bearer ${env.HA_TOKEN}` },
          signal: AbortSignal.timeout(10_000)
        }
      );
    } catch (error) {
      stderr(`无法连接 Home Assistant：${error.cause?.code || error.message}`);
      return 1;
    }
    if (!response.ok) {
      stderr(`只读检查失败：HTTP ${response.status}`);
      return 1;
    }
    stdout(`只读检查通过：${entityId}`);
    return 0;
  }

  let request;
  try {
    request = buildRequest({
      directive: options.directive,
      silent: options.silent,
      entityId
    });
  } catch (error) {
    stderr(error.message);
    return 2;
  }

  stdout(`模式：${options.send ? '发送' : '仅预览（未发送）'}`);
  stdout(`目标：${request.entity_id}`);
  stdout(`参数：${request.value}`);

  if (!options.send) {
    stdout('如需实际发送，请在确认内容后显式增加 --send。');
    return 0;
  }

  if (!env.HA_TOKEN) {
    stderr('缺少 HA_TOKEN；未发送任何请求。');
    return 2;
  }

  let response;
  try {
    response = await fetchImpl(`${haUrl}/api/services/text/set_value`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.HA_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(10_000)
    });
  } catch (error) {
    stderr(`无法连接 Home Assistant：${error.cause?.code || error.message}`);
    return 1;
  }

  if (!response.ok) {
    const detail = await response.text();
    stderr(`Home Assistant 调用失败：HTTP ${response.status}${detail ? `，${detail}` : ''}`);
    return 1;
  }

  stdout('Home Assistant 已接受指令。');
  return 0;
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = await run();
}
