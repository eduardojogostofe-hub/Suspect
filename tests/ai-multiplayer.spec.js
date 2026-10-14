import test from 'node:test';
import assert from 'node:assert/strict';
import { io as Client } from 'socket.io-client';

import { createSuspectServer } from '../server/index.js';

test('multiplayer lobby allows the host to add an AI player', async (t) => {
  const instance = createSuspectServer({ port: 0 });
  const port = instance.server.address().port;
  const client = Client(`http://localhost:${port}`, { autoConnect: false });

  t.after(() => {
    client.disconnect();
    instance.io.close();
    instance.server.close();
  });

  await new Promise((resolve, reject) => {
    client.once('connect', resolve);
    client.once('connect_error', reject);
    client.connect();
  });

  const roomState = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for AI room update')), 3000);
    client.on('room_state', (payload) => {
      if (payload.players?.some((player) => player.isBot)) {
        clearTimeout(timeout);
        resolve(payload);
      }
    });
  });

  client.emit('create_room', { name: 'Alice' });
  await new Promise((resolve) => setTimeout(resolve, 30));
  client.emit('add_bot', { name: 'IA Ada' });

  const room = await roomState;
  const bot = room.players.find((player) => player.isBot);

  assert.ok(bot);
  assert.equal(bot.name, 'IA Ada');
  assert.equal(room.players.length, 2);
});
