import assert from 'node:assert/strict';
import test from 'node:test';

import { ensureHomeAssistant } from '../scripts/ensure-home-assistant.mjs';

const ENV = {
  HA_URL: 'http://127.0.0.1:8123',
  HA_TOKEN: 'test-token',
  HA_XIAOMI_ENTITY_ID: 'text.xiaomi_cn_test_l15a_execute_text_directive_a_7_4'
};
const READY = JSON.stringify({
  entity_id: ENV.HA_XIAOMI_ENTITY_ID,
  state: '',
  attributes: {}
});

test('Home Assistant 已就绪时不执行系统命令', async () => {
  let executed = false;
  const exitCode = await ensureHomeAssistant({
    env: ENV,
    fetchImpl: async () => new Response(READY, { status: 200 }),
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
      return new Response(READY, { status: fetchCount >= 2 ? 200 : 503 });
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
      return new Response(READY, { status: fetchCount >= 2 ? 200 : 503 });
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

for (const entity of [
  { entity_id: ENV.HA_XIAOMI_ENTITY_ID, state: 'unavailable' },
  { entity_id: ENV.HA_XIAOMI_ENTITY_ID, state: 'unknown' },
  { entity_id: ENV.HA_XIAOMI_ENTITY_ID, state: '', attributes: { restored: true } },
  { entity_id: 'text.other_entity', state: '' },
  {}
]) {
  test(`HTTP 200 但实体未就绪时不启动服务或误报成功：${JSON.stringify(entity)}`, async () => {
    let executed = false;
    const errors = [];
    const exitCode = await ensureHomeAssistant({
      env: ENV,
      fetchImpl: async () => new Response(JSON.stringify(entity)),
      execFileImpl: async () => { executed = true; },
      stdout: () => {},
      stderr: (line) => errors.push(line)
    });
    assert.equal(exitCode, 1);
    assert.equal(executed, false);
    assert.match(errors.join('\n'), /小爱执行实体不可用/);
  });
}

test('启动后继续等待实体从 unavailable 恢复，而非只检查 HTTP 200', async () => {
  let fetchCount = 0;
  const exitCode = await ensureHomeAssistant({
    env: ENV,
    fetchImpl: async () => {
      fetchCount += 1;
      if (fetchCount === 1) return new Response('{}', { status: 503 });
      return new Response(fetchCount === 2
        ? JSON.stringify({ entity_id: ENV.HA_XIAOMI_ENTITY_ID, state: 'unavailable' })
        : READY);
    },
    execFileImpl: async () => {},
    sleep: async () => {},
    stdout: () => {},
    stderr: () => {},
    timeoutMs: 1_000,
    intervalMs: 0
  });
  assert.equal(exitCode, 0);
  assert.equal(fetchCount, 3);
});
