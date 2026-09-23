import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseStopArgs,
  stopHomeAssistant
} from '../scripts/stop-home-assistant.mjs';

test('未显式选择关闭范围时拒绝执行', () => {
  assert.throws(() => parseStopArgs([]), /必须显式选择/);
});

test('只停止 Home Assistant 时保留 Colima', async () => {
  const commands = [];
  const exitCode = await stopHomeAssistant({
    argv: ['--home-assistant'],
    execFileImpl: async (command, args) => {
      commands.push([command, ...args]);
      return { stdout: '' };
    },
    stdout: () => {},
    stderr: () => {}
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(commands, [['docker', 'compose', 'stop']]);
});

test('没有其他容器时停止本次使用的 Colima', async () => {
  const commands = [];
  const exitCode = await stopHomeAssistant({
    argv: ['--home-assistant-and-colima-if-idle'],
    execFileImpl: async (command, args) => {
      commands.push([command, ...args]);
      return { stdout: '' };
    },
    stdout: () => {},
    stderr: () => {}
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(commands, [
    ['colima', 'status'],
    ['docker', 'compose', 'stop'],
    ['docker', 'ps', '-q'],
    ['colima', 'stop']
  ]);
});

test('存在其他容器时保留 Colima', async () => {
  const commands = [];
  const exitCode = await stopHomeAssistant({
    argv: ['--home-assistant-and-colima-if-idle'],
    execFileImpl: async (command, args) => {
      commands.push([command, ...args]);
      return {
        stdout: command === 'docker' && args[0] === 'ps'
          ? 'another-container-id\n'
          : ''
      };
    },
    stdout: () => {},
    stderr: () => {}
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(commands, [
    ['colima', 'status'],
    ['docker', 'compose', 'stop'],
    ['docker', 'ps', '-q']
  ]);
});

test('Colima 已停止时直接视为环境已关闭', async () => {
  const commands = [];
  const exitCode = await stopHomeAssistant({
    argv: ['--home-assistant-and-colima-if-idle'],
    execFileImpl: async (command, args) => {
      commands.push([command, ...args]);
      throw new Error('colima is not running');
    },
    stdout: () => {},
    stderr: () => {}
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(commands, [['colima', 'status']]);
});
