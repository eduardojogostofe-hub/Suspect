import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addPlayerToRoom,
  createInitialGameState,
  createLobby,
  killPlayer,
  reportBody,
  voteForPlayer,
} from '../server/roomService.js';

function startedLobby() {
  const lobby = createLobby('SOCIAL');
  const crewA = addPlayerToRoom(lobby, 'crew-a', 'Alice');
  const crewB = addPlayerToRoom(lobby, 'crew-b', 'Bia');
  const saboteur = addPlayerToRoom(lobby, 'sab', 'Suspect');
  crewA.role = 'crew';
  crewB.role = 'crew';
  saboteur.role = 'saboteur';
  createInitialGameState(lobby);
  return { lobby, crewA, crewB, saboteur };
}

test('denúncia exige que o jogador esteja próximo de um corpo', () => {
  const { lobby, crewA, crewB } = startedLobby();
  crewB.alive = false;
  crewA.x = 20;
  crewA.y = 20;
  crewB.x = 500;
  crewB.y = 500;

  assert.equal(reportBody(lobby, crewA.id, crewB.id).reason, 'too-far-from-body');
  crewA.x = 490;
  crewA.y = 490;
  assert.equal(reportBody(lobby, crewA.id, crewB.id).valid, true);
});

test('impostor possui intervalo entre eliminações e jogadores podem pular voto', () => {
  const { lobby, crewA, crewB, saboteur } = startedLobby();
  crewA.x = crewB.x = saboteur.x = 300;
  crewA.y = crewB.y = saboteur.y = 300;

  assert.equal(killPlayer(lobby, saboteur.id, crewA.id).valid, true);
  assert.equal(killPlayer(lobby, saboteur.id, crewB.id).reason, 'kill-cooldown');

  crewB.x = 600;
  crewB.y = 350;
  assert.equal(reportBody(lobby, crewB.id, crewA.id).valid, false);
  crewB.x = 300;
  crewB.y = 300;
  assert.equal(reportBody(lobby, crewB.id, crewA.id).valid, true);
  const result = voteForPlayer(lobby, crewB.id, 'skip');
  assert.equal(result.valid, true);
});
