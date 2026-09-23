import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRequest, parseArgs, run } from '../scripts/xiaomi-directive.mjs';

const ENTITY_ID = 'text.xiaomi_cn_test_l15a_execute_text_directive_a_7_4';

test('默认使用静默模式且不发送', () => {
  assert.deepEqual(parseArgs(['今晚十点提醒我洗澡']), {
    directive: '今晚十点提醒我洗澡',
    send: false,
    check: false,
    silent: true,
    help: false
  });
});

test('--check 只读取目标实体', async () => {
  let captured;
  const exitCode = await run({
    argv: ['--check'],
    env: {
      HA_URL: 'http://127.0.0.1:8123',
      HA_TOKEN: 'test-token',
      HA_XIAOMI_ENTITY_ID: ENTITY_ID
    },
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return new Response('{}', { status: 200 });
    },
    stdout: () => {},
    stderr: () => {}
  });

  assert.equal(exitCode, 0);
  assert.equal(captured.url, `http://127.0.0.1:8123/api/states/${ENTITY_ID}`);
  assert.equal(captured.init.method, undefined);
  assert.equal(captured.init.body, undefined);
});

test('构造 Xiaomi Home 所需的双参数字符串', () => {
  assert.deepEqual(buildRequest({
    directive: '今晚十点提醒我洗澡',
    silent: false,
    entityId: ENTITY_ID
  }), {
    entity_id: ENTITY_ID,
    value: '["今晚十点提醒我洗澡",false]'
  });
});

test('预览模式绝不发起网络请求', async () => {
  let requested = false;
  const output = [];
  const exitCode = await run({
    argv: ['今晚十点提醒我洗澡'],
    env: { HA_XIAOMI_ENTITY_ID: ENTITY_ID },
    fetchImpl: async () => {
      requested = true;
      throw new Error('不应调用');
    },
    stdout: (line) => output.push(line),
    stderr: (line) => output.push(line)
  });

  assert.equal(exitCode, 0);
  assert.equal(requested, false);
  assert.match(output.join('\n'), /仅预览（未发送）/);
});

test('--send 向 text.set_value 提交准确参数', async () => {
  let captured;
  const exitCode = await run({
    argv: ['--send', '--audible', '现在几点了'],
    env: {
      HA_URL: 'http://127.0.0.1:8123',
      HA_TOKEN: 'test-token',
      HA_XIAOMI_ENTITY_ID: ENTITY_ID
    },
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return new Response('[]', { status: 200 });
    },
    stdout: () => {},
    stderr: () => {}
  });

  assert.equal(exitCode, 0);
  assert.equal(captured.url, 'http://127.0.0.1:8123/api/services/text/set_value');
  assert.equal(captured.init.headers.Authorization, 'Bearer test-token');
  assert.deepEqual(JSON.parse(captured.init.body), {
    entity_id: ENTITY_ID,
    value: '["现在几点了",false]'
  });
});
