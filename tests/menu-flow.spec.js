import test from 'node:test';
import assert from 'node:assert/strict';
import { io as Client } from 'socket.io-client';
import { createSuspectServer } from '../server/index.js';
import { createLobby } from '../server/roomService.js';

test('account flow rejects duplicate names and accepts the original account', async (t) => {
  const instance = createSuspectServer({ port: 0 });
  const port = instance.server.address().port;
  const first = Client(`http://localhost:${port}`);
  const second = Client(`http://localhost:${port}`);
  t.after(() => { first.disconnect(); second.disconnect(); instance.io.close(); instance.server.close(); });
  await Promise.all([new Promise((resolve) => first.once('connect', resolve)), new Promise((resolve) => second.once('connect', resolve))]);

  const created = new Promise((resolve) => first.once('account_ready', resolve));
  first.emit('create_account', { name: 'Alice' });
  assert.equal((await created).name, 'Alice');

  const duplicate = new Promise((resolve) => second.once('server_error', resolve));
  second.emit('create_account', { name: 'Alice' });
  assert.match(await duplicate, /já existe/);
});

test('room settings keep impostor count and AI options', () => {
  const room = createLobby('SETTINGS', { impostorCount: 2, allowBots: false, fillBots: true });
  assert.equal(room.settings.impostorCount, 2);
  assert.equal(room.settings.allowBots, false);
  assert.equal(room.settings.fillBots, true);
});
