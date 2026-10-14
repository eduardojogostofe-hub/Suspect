import test from 'node:test';
import assert from 'node:assert/strict';
import { io as Client } from 'socket.io-client';

import { createSuspectServer } from '../server/index.js';

async function waitFor(predicate, timeoutMs = 3000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  return false;
}

test('phase 1 multiplayer lobby: room creation, join, member listing, and disconnect', async (t) => {
  const server = createSuspectServer({ port: 0 });
  const port = server.server.address().port;

  t.after(() => {
    server.io.close();
    server.server.close();
  });

  const clientA = Client(`http://localhost:${port}`, { autoConnect: false });
  const clientB = Client(`http://localhost:${port}`, { autoConnect: false });

  const connectA = new Promise((resolve, reject) => {
    clientA.once('connect', resolve);
    clientA.once('connect_error', reject);
    clientA.connect();
  });

  const connectB = new Promise((resolve, reject) => {
    clientB.once('connect', resolve);
    clientB.once('connect_error', reject);
    clientB.connect();
  });

  await Promise.all([connectA, connectB]);

  const roomCode = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for room creation')), 4000);
    const onRoomState = (payload) => {
      if (payload?.players?.length === 1) {
        clearTimeout(timeout);
        clientA.off('room_state', onRoomState);
        resolve(payload.code);
      }
    };

    clientA.on('room_state', onRoomState);
    clientA.emit('create_room', { name: 'Alice' });
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for second player join')), 4000);
    const onRoomState = (payload) => {
      if (payload?.players?.length === 2) {
        clearTimeout(timeout);
        clientB.off('room_state', onRoomState);
        resolve();
      }
    };

    clientB.on('room_state', onRoomState);
    clientB.emit('join_room', { roomCode, name: 'Bob' });
  });

  const roomState = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for final room state')), 2000);
    const onRoomState = (payload) => {
      if (payload?.players?.length === 2) {
        clearTimeout(timeout);
        clientA.off('room_state', onRoomState);
        resolve(payload);
      }
    };

    clientA.on('room_state', onRoomState);
  });

  assert.equal(roomState.players.length, 2);
  assert.equal(roomState.players.some((player) => player.name === 'Alice'), true);
  assert.equal(roomState.players.some((player) => player.name === 'Bob'), true);

  const disconnectSeen = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for player disconnect update')), 4000);
    const onRoomState = (payload) => {
      if (payload.players.length === 1) {
        clearTimeout(timeout);
        clientA.off('room_state', onRoomState);
        resolve(true);
      }
    };

    clientA.on('room_state', onRoomState);
    clientB.disconnect();
  });

  assert.equal(disconnectSeen, true);

  await waitFor(() => server.rooms.size === 0);
  assert.equal(server.rooms.size, 0);

  clientA.disconnect();
});
