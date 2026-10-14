import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createLobby,
  addPlayerToRoom,
  createInitialGameState,
  applyPlayerMove,
} from '../server/roomService.js';

test('createInitialGameState spawns players inside the playable map', () => {
  const lobby = createLobby('PHASE');
  addPlayerToRoom(lobby, 'p1', 'Alice');
  addPlayerToRoom(lobby, 'p2', 'Bob');

  const gameState = createInitialGameState(lobby);

  assert.equal(lobby.status, 'playing');
  assert.equal(gameState.players.length, 2);
  assert.ok(gameState.players[0].x >= 0);
  assert.ok(gameState.players[0].y >= 0);
  assert.ok(gameState.players[0].x <= 1200);
  assert.ok(gameState.players[0].y <= 700);
});

test('applyPlayerMove rejects wall collision and clamps the player inside bounds', () => {
  const lobby = createLobby('PHASE');
  const player = addPlayerToRoom(lobby, 'p1', 'Alice');

  player.x = 100;
  player.y = 100;

  const result = applyPlayerMove(lobby, 'p1', { x: 140, y: 140 });
  assert.equal(result.valid, true);

  const blocked = applyPlayerMove(lobby, 'p1', { x: 300, y: 160 });
  assert.equal(blocked.valid, false);

  const clamped = applyPlayerMove(lobby, 'p1', { x: -50, y: 9999 });
  assert.equal(clamped.valid, true);
  assert.ok(clamped.player.x >= 0);
  assert.ok(clamped.player.y <= 700);
});
