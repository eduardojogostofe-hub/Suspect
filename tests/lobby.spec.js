import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRoomCode,
  createLobby,
  addPlayerToRoom,
  removePlayerFromRoom,
} from '../server/roomService.js';

test('createRoomCode generates a 4-character uppercase code', () => {
  const code = createRoomCode();

  assert.equal(typeof code, 'string');
  assert.equal(code.length, 4);
  assert.match(code, /^[A-Z0-9]{4}$/);
});

test('createLobby creates a private room with a host and room state', () => {
  const lobby = createLobby('ABCD');

  assert.equal(lobby.code, 'ABCD');
  assert.equal(lobby.status, 'lobby');
  assert.equal(lobby.hostId, null);
  assert.deepEqual(lobby.players, []);
  assert.equal(lobby.maxPlayers, 8);
});

test('addPlayerToRoom adds a player and tracks host assignment', () => {
  const lobby = createLobby('ABCD');
  const first = addPlayerToRoom(lobby, 'player-1', 'Alice');
  const second = addPlayerToRoom(lobby, 'player-2', 'Bob');

  assert.equal(first.isHost, true);
  assert.equal(second.isHost, false);
  assert.equal(lobby.players.length, 2);
  assert.equal(lobby.players[0].name, 'Alice');
  assert.equal(lobby.players[1].name, 'Bob');
});

test('removePlayerFromRoom handles host transfer and player removal', () => {
  const lobby = createLobby('ABCD');
  addPlayerToRoom(lobby, 'player-1', 'Alice');
  addPlayerToRoom(lobby, 'player-2', 'Bob');

  const remaining = removePlayerFromRoom(lobby, 'player-1');

  assert.equal(remaining, true);
  assert.equal(lobby.players.length, 1);
  assert.equal(lobby.players[0].name, 'Bob');
  assert.equal(lobby.hostId, 'player-2');
});
