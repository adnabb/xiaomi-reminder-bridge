import assert from 'node:assert/strict';
import test from 'node:test';

import { ensureHomeAssistant } from '../scripts/ensure-home-assistant.mjs';

const ENV = {
  HA_URL: 'http://127.0.0.1:8123',
  HA_TOKEN: 'test-token',
  HA_XIAOMI_ENTITY_ID: 'text.xiaomi_cn_test_l15a_execute_text_directive_a_7_4'
};

test('Home Assistant 已就绪时不执行系统命令', async () => {
  let executed = false;
  const exitCode = await ensureHomeAssistant({
    env: ENV,
    fetchImpl: async () => new Response('{}', { status: 200 }),
    execFileImpl: async () => {
      executed = true;
    },
    stdout: () => {},
    stderr: () => {}
  });

  assert.equal(exitCode, 0);
  assert.equal(executed, false);
});

test('令牌认证失败时不启动任何服务', async () => {
  let executed = false;
  const exitCode = await ensureHomeAssistant({
    env: ENV,
    fetchImpl: async () => new Response('{}', { status: 401 }),
    execFileImpl: async () => {
      executed = true;
    },
    stdout: () => {},
    stderr: () => {}
  });

  assert.equal(exitCode, 1);
  assert.equal(executed, false);
});

test('Docker 可用时启动 Compose 并等待 Home Assistant', async () => {
  let fetchCount = 0;
  const commands = [];
  const exitCode = await ensureHomeAssistant({
    env: ENV,
    fetchImpl: async () => {
      fetchCount += 1;
      return new Response('{}', { status: fetchCount >= 2 ? 200 : 503 });
    },
    execFileImpl: async (command, args) => {
      commands.push([command, ...args]);
    },
    sleep: async () => {},
    stdout: () => {},
    stderr: () => {},
    timeoutMs: 1_000,
    intervalMs: 0
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(commands, [
    ['docker', 'info'],
    ['docker', 'compose', 'up', '-d']
  ]);
});

test('Docker 未就绪时先启动 Colima', async () => {
  let fetchCount = 0;
  const commands = [];
  const exitCode = await ensureHomeAssistant({
    env: ENV,
    fetchImpl: async () => {
      fetchCount += 1;
      return new Response('{}', { status: fetchCount >= 2 ? 200 : 503 });
    },
    execFileImpl: async (command, args) => {
      commands.push([command, ...args]);
      if (command === 'docker' && args[0] === 'info') {
        throw new Error('daemon unavailable');
      }
    },
    sleep: async () => {},
    stdout: () => {},
    stderr: () => {},
    timeoutMs: 1_000,
    intervalMs: 0
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(commands, [
    ['docker', 'info'],
    ['colima', 'start'],
    ['docker', 'compose', 'up', '-d']
  ]);
});
