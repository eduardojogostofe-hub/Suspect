import test from 'node:test';
import assert from 'node:assert/strict';
import { io as Client } from 'socket.io-client';

import {
  MAP_BOUNDS,
  addPlayerToRoom,
  applyPlayerMove,
  createInitialGameState,
  createLobby,
  createPublicGameState,
  interactWithObject,
} from '../server/roomService.js';
import { createSuspectServer } from '../server/index.js';

function once(socket, event, predicate = () => true, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(event, listener);
      reject(new Error(`Timeout esperando ${event}`));
    }, timeoutMs);
    const listener = (payload) => {
      if (!predicate(payload)) return;
      clearTimeout(timeout);
      socket.off(event, listener);
      resolve(payload);
    };
    socket.on(event, listener);
  });
}

test('spawns iniciam ao redor da Mesa de Convergência e obstáculos bloqueiam passagem', () => {
  const lobby = createLobby('MAPA');
  const first = addPlayerToRoom(lobby, 'a', 'Alice');
  const second = addPlayerToRoom(lobby, 'b', 'Bia');
  first.role = second.role = 'crew';
  const state = createInitialGameState(lobby);

  assert.equal(lobby.status, 'playing');
  assert.equal(Math.hypot(first.x - MAP_BOUNDS.meetingTable.x, first.y - MAP_BOUNDS.meetingTable.y), 106);
  assert.notDeepEqual({ x: first.x, y: first.y }, { x: second.x, y: second.y });
  assert.ok(state.map.objects.some((object) => object.interactable));

  first.x = 270;
  first.y = 160;
  assert.equal(applyPlayerMove(lobby, first.id, { x: 285, y: 160 }).reason, 'wall-collision');

  first.x = 160;
  first.y = 190;
  assert.equal(interactWithObject(lobby, first.id, 'nav-console').valid, true);
  assert.match(createPublicGameState(lobby).players[0].activity, /Console de Navegação/);
});

test('dois clientes percorrem LOBBY → PLAYING, sincronizam movimento e servidor rejeita ações inválidas', async (t) => {
  const instance = createSuspectServer({ port: 0 });
  const port = instance.server.address().port;
  const host = Client(`http://localhost:${port}`, { autoConnect: false });
  const guest = Client(`http://localhost:${port}`, { autoConnect: false });
  t.after(() => { host.disconnect(); guest.disconnect(); instance.io.close(); instance.server.close(); });

  const hostConnected = once(host, 'connect');
  const guestConnected = once(guest, 'connect');
  host.connect(); guest.connect();
  await Promise.all([hostConnected, guestConnected]);

  const roomCreated = once(host, 'room_state', (room) => room.players?.length === 1);
  host.emit('create_room', { name: 'Alice' });
  const createdRoom = await roomCreated;

  const deniedEmptyStart = once(host, 'server_error', (message) => /pelo menos 2 jogadores/.test(message));
  host.emit('start_game');
  await deniedEmptyStart;

  const joined = once(host, 'room_state', (room) => room.players?.length === 2);
  guest.emit('join_room', { roomCode: createdRoom.code, name: 'Bia' });
  await joined;

  const deniedStart = once(guest, 'server_error', (message) => /Apenas o host/.test(message));
  guest.emit('start_game');
  await deniedStart;

  const hostGame = once(host, 'game_state', (state) => state.players?.length === 2);
  const guestGame = once(guest, 'game_state', (state) => state.players?.length === 2);
  host.emit('start_game');
  const [hostState, guestState] = await Promise.all([hostGame, guestGame]);

  assert.equal(instance.rooms.get(createdRoom.code).status, 'playing');
  const hostPlayer = hostState.players.find((player) => player.id === host.id);
  const guestPlayer = guestState.players.find((player) => player.id === guest.id);
  assert.ok(hostPlayer && guestPlayer);
  assert.notDeepEqual({ x: hostPlayer.x, y: hostPlayer.y }, { x: guestPlayer.x, y: guestPlayer.y });
  assert.ok(Math.hypot(hostPlayer.x - MAP_BOUNDS.meetingTable.x, hostPlayer.y - MAP_BOUNDS.meetingTable.y) < 120);

  const moved = once(guest, 'player_moved', (movement) => movement.id === host.id);
  host.emit('move_player', { x: hostPlayer.x + 4, y: hostPlayer.y });
  const movement = await moved;
  assert.equal(movement.x, hostPlayer.x + 4);

  const invalidMove = once(host, 'server_error', (message) => /Movimento inválido/.test(message));
  host.emit('move_player', { x: hostPlayer.x + 300, y: hostPlayer.y });
  await invalidMove;
  assert.equal(instance.rooms.get(createdRoom.code).players.find((player) => player.id === host.id).x, movement.x);

  const departure = once(host, 'room_state', (room) => room.players?.length === 1);
  guest.disconnect();
  await departure;
});
