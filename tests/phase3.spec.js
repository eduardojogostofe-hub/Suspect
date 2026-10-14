import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createLobby,
  addPlayerToRoom,
  assignRolesToPlayers,
  getPlayerRole,
} from '../server/roomService.js';

test('assignRolesToPlayers creates a valid crew and saboteur mix', () => {
  const lobby = createLobby('PH3');
  addPlayerToRoom(lobby, 'p1', 'Alice');
  addPlayerToRoom(lobby, 'p2', 'Bob');
  addPlayerToRoom(lobby, 'p3', 'Cara');

  assignRolesToPlayers(lobby, { saboteurCount: 1 });

  const roles = lobby.players.map((player) => player.role);
  assert.equal(roles.filter((role) => role === 'saboteur').length, 1);
  assert.equal(roles.filter((role) => role === 'crew').length, 2);
});

test('getPlayerRole returns the secret role for the requested player', () => {
  const lobby = createLobby('PH3');
  addPlayerToRoom(lobby, 'p1', 'Alice');
  addPlayerToRoom(lobby, 'p2', 'Bob');
  assignRolesToPlayers(lobby, { saboteurCount: 1 });

  const role = getPlayerRole(lobby, 'p1');
  assert.ok(role === 'crew' || role === 'saboteur');
});
