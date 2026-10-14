import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addPlayerToRoom,
  applyPlayerMove,
  createInitialGameState,
  createLobby,
  voteForPlayer,
} from '../server/roomService.js';

test('dead players cannot move or teleport', () => {
  const lobby = createLobby('MOVE');
  const player = addPlayerToRoom(lobby, 'p1', 'Alice');
  player.role = 'crew';
  createInitialGameState(lobby);

  player.alive = false;
  assert.equal(applyPlayerMove(lobby, 'p1', { x: player.x + 4, y: player.y }).reason, 'dead-player-cannot-move');

  player.alive = true;
  assert.equal(applyPlayerMove(lobby, 'p1', { x: 800, y: 600 }).reason, 'movement-too-fast');
});

test('spectators cannot vote in a meeting', () => {
  const lobby = createLobby('SPECTATOR');
  const crew = addPlayerToRoom(lobby, 'crew', 'Alice');
  const spectator = addPlayerToRoom(lobby, 'ghost', 'Ghost');
  crew.role = 'crew';
  spectator.isSpectator = true;
  createInitialGameState(lobby);

  lobby.game.meeting = { callerId: 'crew', startedAt: Date.now(), endsAt: Date.now() + 1000 };
  const result = voteForPlayer(lobby, 'ghost', 'crew');

  assert.equal(result.valid, false);
  assert.equal(result.reason, 'invalid-vote');
});
