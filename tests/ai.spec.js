import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addBotToRoom,
  addPlayerToRoom,
  applyPlayerMove,
  createInitialGameState,
  createLobby,
} from '../server/roomService.js';

test('addBotToRoom adds an AI player with a playable spawn', () => {
  const lobby = createLobby('BOTS');
  addPlayerToRoom(lobby, 'human-1', 'Alice');

  const bot = addBotToRoom(lobby, 'IA Ada');

  assert.equal(bot.isBot, true);
  assert.equal(bot.name, 'IA Ada');
  assert.equal(bot.x > 0, true);
  assert.equal(bot.y > 0, true);
  assert.equal(lobby.players.length, 2);
});

test('AI players are included in game state and obey map movement rules', () => {
  const lobby = createLobby('BOTS');
  addPlayerToRoom(lobby, 'human-1', 'Alice');
  const bot = addBotToRoom(lobby, 'IA Ada');

  const state = createInitialGameState(lobby);
  const botState = state.players.find((player) => player.id === bot.id);
  const move = applyPlayerMove(lobby, bot.id, { x: bot.x + 4, y: bot.y });

  assert.ok(botState);
  assert.equal('role' in botState, false);
  assert.equal(move.valid, true);
  assert.equal(move.player.id, bot.id);
});
