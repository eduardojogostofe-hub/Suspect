import test from 'node:test';
import assert from 'node:assert/strict';
import { io as Client } from 'socket.io-client';
import { createSuspectServer } from '../server/index.js';

const TOTAL_MATCHES = 12;
const SIMULATION_MS = 1200;

function waitForConnect(client) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('connection-timeout')), 3000);
    client.once('connect', () => { clearTimeout(timer); resolve(); });
    client.once('connect_error', (error) => { clearTimeout(timer); reject(error); });
    client.connect();
  });
}

function waitForEvent(client, event, predicate = () => true, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.off(event, onEvent);
      reject(new Error(`${event}-timeout`));
    }, timeoutMs);
    function onEvent(payload) {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      client.off(event, onEvent);
      resolve(payload);
    }
    client.on(event, onEvent);
  });
}

async function runMatch(matchNumber) {
  const instance = createSuspectServer({ port: 0 });
  await new Promise((resolve) => instance.server.once('listening', resolve));
  const port = instance.server.address().port;
  const client = Client(`http://localhost:${port}`, { autoConnect: false });
  const errors = [];
  const movements = [];
  client.on('server_error', (message) => errors.push(String(message)));
  client.on('player_moved', () => movements.push(Date.now()));

  try {
    await waitForConnect(client);
    const accountReady = waitForEvent(client, 'account_ready');
    client.emit('create_account', { name: `Sim${matchNumber}` });
    await accountReady;

    const roomReady = waitForEvent(client, 'room_state', (room) => room.players?.length >= 4);
    client.emit('create_room', {
      name: `Sim${matchNumber}`,
      settings: { impostorCount: 1, crewCount: 3, botCount: 3, allowBots: true, fillBots: true },
    });
    const room = await roomReady;
    assert.equal(room.players.length, 4);

    const gameReady = waitForEvent(client, 'game_state', (state) => state.players?.length === 4);
    client.emit('start_game');
    const game = await gameReady;
    assert.equal(game.players.length, 4);

    const local = game.players[0];
    client.emit('move_player', { x: local.x + 4, y: local.y });
    await new Promise((resolve) => setTimeout(resolve, SIMULATION_MS));

    return {
      match: matchNumber,
      status: errors.length ? 'technical-error' : 'no-end-condition',
      players: game.players.length,
      movementEvents: movements.length,
      errors,
    };
  } catch (error) {
    return {
      match: matchNumber,
      status: 'technical-error',
      players: 0,
      movementEvents: movements.length,
      errors: [...errors, error.message],
    };
  } finally {
    client.disconnect();
    instance.io.close();
    instance.server.close();
  }
}

test('simula varias partidas multiplayer em paralelo e relata falhas reais', async () => {
  const results = await Promise.all(Array.from({ length: TOTAL_MATCHES }, (_, index) => runMatch(index + 1)));
  const technicalFailures = results.filter((result) => result.status === 'technical-error');
  const noEndCondition = results.filter((result) => result.status === 'no-end-condition');

  console.log(JSON.stringify({
    total: results.length,
    technicalFailures: technicalFailures.length,
    noEndCondition: noEndCondition.length,
    results,
  }, null, 2));

  assert.equal(technicalFailures.length, 0);
  assert.equal(noEndCondition.length, TOTAL_MATCHES);
});
