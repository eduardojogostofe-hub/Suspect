import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addPlayerToRoom,
  completePlayerTask,
  createInitialGameState,
  createLobby,
  killPlayer,
  voteForPlayer,
  TASKS,
} from '../server/roomService.js';

test('inocentes vencem ao concluir todas as tarefas', () => {
  const lobby = createLobby('TASKS');
  addPlayerToRoom(lobby, 'crew-1', 'Alice').role = 'crew';
  addPlayerToRoom(lobby, 'sab-1', 'Suspect').role = 'saboteur';
  createInitialGameState(lobby);

  const results = [1, 2, 3].map(() => {
    const task = TASKS[0];
    const player = lobby.players.find((entry) => entry.id === 'crew-1');
    player.x = task.x;
    player.y = task.y;
    player.tasks = [task.id, task.id, task.id];
    return completePlayerTask(lobby, 'crew-1', task.id, task.answer);
  });

  assert.equal(results.at(-1).winner, 'crew-tasks');
  assert.equal(lobby.game.completedTasks, 3);
});

test('inocentes vencem ao votar no impostor', () => {
  const lobby = createLobby('VOTE');
  addPlayerToRoom(lobby, 'crew-1', 'Alice').role = 'crew';
  addPlayerToRoom(lobby, 'crew-2', 'Bob').role = 'crew';
  addPlayerToRoom(lobby, 'sab-1', 'Suspect').role = 'saboteur';
  createInitialGameState(lobby);

  voteForPlayer(lobby, 'crew-1', 'sab-1');
  voteForPlayer(lobby, 'crew-2', 'sab-1');
  const result = voteForPlayer(lobby, 'sab-1', 'crew-1');

  assert.equal(result.winner, 'crew-discovery');
  assert.equal(lobby.players.find((player) => player.id === 'sab-1').alive, false);
});

test('impostor vence quando inocentes vivos ficam em quantidade igual', () => {
  const lobby = createLobby('KILL');
  addPlayerToRoom(lobby, 'crew-1', 'Alice').role = 'crew';
  addPlayerToRoom(lobby, 'sab-1', 'Suspect').role = 'saboteur';
  createInitialGameState(lobby);

  const result = killPlayer(lobby, 'sab-1', 'crew-1');

  assert.equal(result.winner, 'saboteur-elimination');
  assert.equal(lobby.players.find((player) => player.id === 'crew-1').alive, false);
});
