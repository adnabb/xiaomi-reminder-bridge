import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRequest, parseArgs, run } from '../scripts/xiaomi-directive.mjs';

const ENTITY_ID = 'text.xiaomi_cn_test_l15a_execute_text_directive_a_7_4';
const ENV = {
  HA_URL: 'http://127.0.0.1:8123',
  HA_TOKEN: 'test-token',
  HA_XIAOMI_ENTITY_ID: ENTITY_ID
};
const READY = { entity_id: ENTITY_ID, state: '', attributes: {} };

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
      return new Response(JSON.stringify(READY), { status: 200 });
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
  const methods = [];
  const exitCode = await run({
    argv: ['--send', '--audible', '现在几点了'],
    env: {
      HA_URL: 'http://127.0.0.1:8123',
      HA_TOKEN: 'test-token',
      HA_XIAOMI_ENTITY_ID: ENTITY_ID
    },
    fetchImpl: async (url, init) => {
      methods.push(init.method || 'GET');
      if (init.method === 'POST') {
        captured = { url, init };
        return new Response('[]', { status: 200 });
      }
      return new Response(JSON.stringify({
        ...READY,
        state: captured ? JSON.parse(captured.init.body).value : ''
      }));
    },
    stdout: () => {},
    stderr: () => {}
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(methods, ['GET', 'POST', 'GET']);
  assert.equal(captured.url, 'http://127.0.0.1:8123/api/services/text/set_value');
  assert.equal(captured.init.headers.Authorization, 'Bearer test-token');
  assert.deepEqual(JSON.parse(captured.init.body), {
    entity_id: ENTITY_ID,
    value: '["现在几点了",false]'
  });
});

for (const entity of [
  { ...READY, state: 'unavailable' },
  { ...READY, state: 'unknown' },
  { ...READY, attributes: { restored: true } },
  { ...READY, entity_id: 'text.other_entity' },
  {}
]) {
  for (const option of ['--check', '--send']) {
    test(`${option} 拦截 HTTP 200 但实体未就绪：${JSON.stringify(entity)}`, async () => {
      const methods = [];
      const exitCode = await run({
        argv: option === '--check' ? [option] : [option, '今天晚上八点提醒我吃药'],
        env: ENV,
        fetchImpl: async (_url, init) => {
          methods.push(init.method || 'GET');
          return new Response(JSON.stringify(entity));
        },
        stdout: () => {},
        stderr: () => {}
      });
      assert.equal(exitCode, 1);
      assert.deepEqual(methods, ['GET']);
    });
  }
}

test('服务返回 HTTP 200 但实体变为不可用时报告结果不确定，不重发', async () => {
  const methods = [];
  const errors = [];
  const output = [];
  const exitCode = await run({
    argv: ['--send', '今天晚上八点提醒我吃药'],
    env: ENV,
    fetchImpl: async (_url, init) => {
      methods.push(init.method || 'GET');
      return new Response(JSON.stringify(init.method === 'POST' ? [] : {
        ...READY, state: methods.length > 1 ? 'unavailable' : ''
      }));
    },
    stdout: (line) => output.push(line),
    stderr: (line) => errors.push(line)
  });
  assert.equal(exitCode, 1);
  assert.deepEqual(methods, ['GET', 'POST', 'GET']);
  assert.match(errors.join('\n'), /可能已发送.*勿自动重试/);
  assert.doesNotMatch(output.join('\n'), /调用完成/);
});

test('动作成功但不刷新文本状态时不误报失败，也不声称闹钟已创建', async () => {
  const methods = [];
  const output = [];
  const exitCode = await run({
    argv: ['--send', '今天晚上八点提醒我吃药'],
    env: ENV,
    fetchImpl: async (_url, init) => {
      methods.push(init.method || 'GET');
      return new Response(JSON.stringify(init.method === 'POST' ? [] : READY));
    },
    stdout: (line) => output.push(line),
    stderr: () => {}
  });
  assert.equal(exitCode, 0);
  assert.deepEqual(methods, ['GET', 'POST', 'GET']);
  assert.match(output.join('\n'), /调用完成.*仍需核对/);
  assert.doesNotMatch(output.join('\n'), /已创建|创建成功|实体已更新/);
});

test('服务拒绝请求时停止，不报告成功', async () => {
  const methods = [];
  const exitCode = await run({
    argv: ['--send', '今天晚上八点提醒我吃药'],
    env: ENV,
    fetchImpl: async (_url, init) => {
      methods.push(init.method || 'GET');
      return init.method === 'POST'
        ? new Response('failed', { status: 500 })
        : new Response(JSON.stringify(READY));
    },
    stdout: () => {},
    stderr: () => {}
  });
  assert.equal(exitCode, 1);
  assert.deepEqual(methods, ['GET', 'POST']);
});
