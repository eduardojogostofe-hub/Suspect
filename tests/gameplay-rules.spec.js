import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addPlayerToRoom,
  completePlayerTask,
  createInitialGameState,
  createLobby,
  killPlayer,
  startMeeting,
} from '../server/roomService.js';

test('tarefa e eliminação exigem proximidade', () => {
  const lobby = createLobby('DISTANCE');
  const crew = addPlayerToRoom(lobby, 'crew', 'Alice');
  const saboteur = addPlayerToRoom(lobby, 'saboteur', 'Bob');
  crew.role = 'crew';
  saboteur.role = 'saboteur';
  createInitialGameState(lobby);
  crew.tasks = ['task-cafeteria', 'task-reactor', 'task-storage'];
  crew.x = 0;
  crew.y = 0;
  saboteur.x = 1000;
  saboteur.y = 650;

  const farTask = completePlayerTask(lobby, 'crew', 'task-cafeteria', '42');
  assert.equal(farTask.reason, 'too-far');

  const farKill = killPlayer(lobby, 'saboteur', 'crew');
  assert.equal(farKill.reason, 'too-far');
});

test('reunião só inicia durante uma partida', () => {
  const lobby = createLobby('MEETING');
  addPlayerToRoom(lobby, 'crew', 'Alice');
  assert.equal(startMeeting(lobby, 'crew').valid, false);
});