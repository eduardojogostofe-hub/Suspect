import express from 'express';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';

import {
  createLobby,
  createRoomCode,
  addPlayerToRoom,
  addBotToRoom,
  removePlayerFromRoom,
  createInitialGameState,
  createPublicGameState,
  applyPlayerMove,
  assignRolesToPlayers,
  updatePlayerSkin,
  completePlayerTask,
  interactWithObject,
  startSabotage,
  resolveSabotage,
  killPlayer,
  voteForPlayer,
  finalizeVotes,
  startMeeting,
  reportBody,
  addMeetingMessage,
  TASKS,
  toggleVent,
  MAP_BOUNDS,
  findPath,
  getGameWinner,
} from './roomService.js';
import {
  PROTOCOL_VERSION,
  CLIENT_EVENTS,
  SERVER_EVENTS,
  ROOM_STATUS,
} from '../shared/protocol.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createSuspectServer({ port = Number(process.env.PORT) || 3000 } = {}) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const rooms = new Map();
  const accounts = new Map();

  function sanitizeName(name) {
    const cleaned = String(name ?? '').trim();
    if (!cleaned) {
      return '';
    }

    return cleaned.slice(0, 18);
  }

  function serializeRoom(room) {
    return {
      code: room.code,
      status: room.status,
      hostId: room.hostId,
      maxPlayers: room.maxPlayers,
      settings: room.settings,
      players: room.players.map((player) => ({
        id: player.id,
        name: player.name,
        isHost: player.isHost,
        isBot: player.isBot === true,
        isSpectator: player.isSpectator === true,
        connected: player.connected,
        skin: player.skin,
        alive: player.alive !== false,
      })),
    };
  }

  function emitRoomUpdate(room) {
    const payload = serializeRoom(room);
    io.to(room.code).emit(SERVER_EVENTS.LOBBY_UPDATE, payload);
    io.to(room.code).emit(SERVER_EVENTS.ROOM_STATE, payload);
  }

  function emitRoomList() {
    io.emit(SERVER_EVENTS.ROOM_LIST, [...rooms.values()].map((room) => ({
      code: room.code,
      status: room.status,
      players: room.players.filter((player) => !player.isSpectator).length,
      maxPlayers: room.maxPlayers,
      settings: room.settings,
    })));
  }

  function ensureRoomExists(code) {
    return rooms.get(code.toUpperCase()) ?? null;
  }

  function deleteRoomIfEmpty(roomCode) {
    const room = ensureRoomExists(roomCode);
    if (!room || room.players.length > 0) {
      return;
    }

    rooms.delete(roomCode.toUpperCase());
  }

  function removeBotsIfNoHumanPlayers(room) {
    if (room.players.some((player) => !player.isBot)) {
      return;
    }

    room.players.length = 0;
    room.hostId = null;
  }

  function startBotLoop(room) {
    room.botTick = 0;
    const botTimer = setInterval(() => {
      if (!rooms.has(room.code) || room.status === ROOM_STATUS.ENDED) {
        clearInterval(botTimer);
        return;
      }

      room.botTick += 1;
      for (const bot of room.players.filter((player) => player.isBot)) {
        if (room.status !== ROOM_STATUS.PLAYING || bot.alive === false) continue;
        if (room.game?.meeting) continue;
        const livingCrew = room.players.filter((player) => player.role === 'crew' && player.alive !== false);
        let target = null;
        const visiblePlayers = room.players.filter((player) => player.id !== bot.id && player.alive !== false && Math.hypot(player.x - bot.x, player.y - bot.y) <= 145);
        bot.memory ??= { sightings: [], suspicion: {} };
        for (const seen of visiblePlayers) bot.memory.sightings.push({ playerId: seen.id, x: seen.x, y: seen.y, at: Date.now() });
        bot.memory.sightings = bot.memory.sightings.slice(-16);
        const body = room.players.find((player) => player.alive === false && Math.hypot(player.x - bot.x, player.y - bot.y) <= 110);
        if (body && !room.game.meeting) {
          const meeting = reportBody(room, bot.id, body.id);
          if (meeting.valid) {
            io.to(room.code).emit(SERVER_EVENTS.MEETING_STARTED, meeting.meeting);
            publishGameUpdate(room);
            scheduleMeetingEnd(room, meeting.meeting);
            continue;
          }
        }
        if (bot.role === 'saboteur') {
          bot.activity = 'procurando um alvo';
          if (!room.game.sabotage && room.botTick % 160 === 0) {
            const options = ['signal-fog', 'core-surge'];
            const sabotageResult = startSabotage(room, bot.id, options[(room.botTick / 160) % options.length]);
            if (sabotageResult.valid) {
              io.to(room.code).emit(SERVER_EVENTS.SABOTAGE_STARTED, sabotageResult.sabotage);
              publishGameUpdate(room);
              scheduleSabotageFailure(room, sabotageResult.sabotage);
            }
          }
          target = livingCrew.sort((first, second) => Math.hypot(first.x - bot.x, first.y - bot.y) - Math.hypot(second.x - bot.x, second.y - bot.y))[0];
        } else {
          const emergencyObject = room.game.sabotage && MAP_BOUNDS ? room.game.sabotage.objectId : null;
          if (emergencyObject) {
            const object = room.gameState?.map?.objects?.find((entry) => entry.id === emergencyObject);
            target = object ? { ...object, x: object.x + object.w / 2, y: object.y + object.h / 2 } : null;
            bot.activity = 'estabilizando sistema';
          } else {
            bot.activity = 'fazendo tarefas';
            const taskId = bot.tasks?.[bot.completedTasks];
            target = TASKS.find((task) => task.id === taskId) ?? null;
          }
        }

        const targetKey = target ? `${target.id ?? 'point'}:${Math.round(target.x)}:${Math.round(target.y)}` : null;
        if (!target) continue;
        if (bot.pathTargetKey !== targetKey || !bot.path?.length || room.botTick % 24 === 0) {
          bot.pathTargetKey = targetKey;
          bot.path = findPath(bot, target);
        }
        while (bot.path?.length && Math.hypot(bot.path[0].x - bot.x, bot.path[0].y - bot.y) < 9) bot.path.shift();
        const waypoint = bot.path?.[0] ?? target;
        const distance = Math.hypot(waypoint.x - bot.x, waypoint.y - bot.y);
        const step = Math.min(5, distance || 0);
        const nextPosition = distance ? { x: bot.x + ((waypoint.x - bot.x) / distance) * step, y: bot.y + ((waypoint.y - bot.y) / distance) * step } : { x: bot.x, y: bot.y };
        const result = applyPlayerMove(room, bot.id, nextPosition);

        if (!result.valid) {
          bot.path = [];
          bot.pathTargetKey = null;
          bot.activity = 'recalculando rota';
          continue;
        }

        if (result.valid) {
          io.to(room.code).emit(SERVER_EVENTS.PLAYER_MOVED, {
            id: bot.id,
            x: result.player.x,
            y: result.player.y,
          });
        }

        if (Math.hypot(target.x - bot.x, target.y - bot.y) <= 100) {
          if (bot.role === 'crew') {
            if (room.game.sabotage?.objectId === target.id) {
              const repair = resolveSabotage(room, bot.id, target.id);
              if (repair.valid) {
                io.to(room.code).emit(SERVER_EVENTS.SABOTAGE_RESOLVED, { name: repair.sabotage.name });
                publishGameUpdate(room);
              }
            } else {
              const taskResult = completePlayerTask(room, bot.id, target.id, target.answer);
              if (taskResult.valid) publishGameUpdate(room, taskResult.winner);
            }
          } else {
            const killResult = killPlayer(room, bot.id, target.id);
            if (killResult.valid) publishGameUpdate(room, killResult.winner);
          }
        }

        if (Math.hypot(bot.x - MAP_BOUNDS.meetingTable.x, bot.y - MAP_BOUNDS.meetingTable.y) <= 120 && room.botTick % 80 === 0 && !room.game.meeting) {
          const meeting = startMeeting(room, bot.id);
          if (meeting.valid) {
            io.to(room.code).emit(SERVER_EVENTS.MEETING_STARTED, meeting.meeting);
            publishGameUpdate(room);
            scheduleMeetingEnd(room, meeting.meeting);
          }
        }
      }
    }, 180);
    room.botTimer = botTimer;
  }

  function publishGameUpdate(room, winner = null) {
    room.gameState = createPublicGameState(room);
    io.to(room.code).emit(SERVER_EVENTS.GAME_UPDATE, room.gameState);
    if (winner) {
      room.status = ROOM_STATUS.ENDED;
      if (room.botTimer) {
        clearInterval(room.botTimer);
        room.botTimer = null;
      }
      io.to(room.code).emit(SERVER_EVENTS.GAME_OVER, { reason: winner, state: room.gameState });
      emitRoomUpdate(room);
      emitRoomList();
    }
  }

  function scheduleMeetingEnd(room, meeting) {
    setTimeout(() => {
      if (room.game?.meeting !== meeting || room.status !== ROOM_STATUS.MEETING) return;
      room.status = ROOM_STATUS.VOTING;
      meeting.phase = 'voting';
      meeting.endsAt = Date.now() + room.settings.voteDuration * 1000;
      publishGameUpdate(room);
      emitRoomUpdate(room);
      io.to(room.code).emit(SERVER_EVENTS.VOTING_STARTED, meeting);
      scheduleVotingEnd(room, meeting);
    }, room.settings.meetingDuration * 1000);
  }

  function scheduleVotingEnd(room, meeting) {
    setTimeout(() => {
      if (room.game?.meeting !== meeting || room.status !== ROOM_STATUS.VOTING) return;
      const result = finalizeVotes(room);
      publishGameUpdate(room, result.winner);
      emitRoomUpdate(room);
      io.to(room.code).emit(SERVER_EVENTS.MEETING_ENDED);
    }, room.settings.voteDuration * 1000);
  }

  function scheduleSabotageFailure(room, sabotage) {
    const delay = Math.max(0, sabotage.endsAt - Date.now());
    setTimeout(() => {
      if (room.status !== ROOM_STATUS.PLAYING || room.game?.sabotage !== sabotage) return;
      room.game.result = 'saboteur-sabotage';
      publishGameUpdate(room, 'saboteur-sabotage');
    }, delay);
  }

  const noCache = (res) => {
    res.setHeader('Cache-Control', 'no-store');
  };

  app.use(express.static(path.resolve(__dirname, '../public'), { setHeaders: noCache }));
  app.use('/shared', express.static(path.resolve(__dirname, '../shared'), { setHeaders: noCache }));

  app.get('/shared/protocol.js', (_req, res) => {
    res.sendFile(path.resolve(__dirname, '../shared/protocol.js'));
  });

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      protocol: PROTOCOL_VERSION,
      rooms: rooms.size,
    });
  });

  app.get('/host-info', (_req, res) => {
    const addresses = Object.values(os.networkInterfaces())
      .flat()
      .filter((entry) => entry && entry.family === 'IPv4' && !entry.internal)
      .map((entry) => `http://${entry.address}:${server.address()?.port ?? 3000}`);
    res.json({ addresses });
  });

  app.use(express.json());

  app.post('/api/account', (req, res) => {
    const safeName = sanitizeName(req.body?.name);
    const mode = req.body?.mode === 'login' ? 'login' : 'create';

    if (!safeName) {
      res.status(400).json({ ok: false, message: 'Digite um nome válido.' });
      return;
    }

    const key = safeName.toLowerCase();
    if (mode === 'create') {
      if (accounts.has(key)) {
        res.status(409).json({ ok: false, message: 'Esse nome já existe. Escolha outro.' });
        return;
      }
      accounts.set(key, safeName);
      res.json({ ok: true, name: safeName, created: true });
      return;
    }

    const accountName = accounts.get(key);
    if (!accountName) {
      res.status(404).json({ ok: false, message: 'Nome não encontrado. Crie uma conta primeiro.' });
      return;
    }
    res.json({ ok: true, name: accountName, created: false });
  });

  app.get('/', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.resolve(__dirname, '../public/index.html'));
  });

  io.on('connection', (socket) => {
    socket.on(CLIENT_EVENTS.CREATE_ACCOUNT, ({ name } = {}, acknowledge = () => {}) => {
      const safeName = sanitizeName(name);
      if (!safeName) {
        acknowledge({ ok: false, message: 'Digite um nome válido.' });
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'Digite um nome válido.');
        return;
      }
      if (accounts.has(safeName.toLowerCase())) {
        acknowledge({ ok: false, message: 'Esse nome já existe. Escolha outro.' });
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'Esse nome já existe. Escolha outro.');
        return;
      }
      accounts.set(safeName.toLowerCase(), safeName);
      socket.data.accountName = safeName;
      acknowledge({ ok: true, name: safeName, created: true });
      socket.emit(SERVER_EVENTS.ACCOUNT_READY, { name: safeName, created: true });
    });

    socket.on(CLIENT_EVENTS.LOGIN_ACCOUNT, ({ name } = {}, acknowledge = () => {}) => {
      const safeName = sanitizeName(name);
      const accountName = accounts.get(safeName.toLowerCase());
      if (!accountName) {
        acknowledge({ ok: false, message: 'Nome não encontrado. Crie uma conta primeiro.' });
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'Nome não encontrado. Crie uma conta primeiro.');
        return;
      }
      socket.data.accountName = accountName;
      acknowledge({ ok: true, name: accountName, created: false });
      socket.emit(SERVER_EVENTS.ACCOUNT_READY, { name: accountName, created: false });
    });

    socket.on(CLIENT_EVENTS.LIST_ROOMS, () => emitRoomList());

    socket.on(CLIENT_EVENTS.UPDATE_SKIN, (skin = {}) => {
      const code = socket.data.roomCode;
      const room = code ? ensureRoomExists(code) : null;
      if (room && updatePlayerSkin(room, socket.id, skin)) emitRoomUpdate(room);
    });

    socket.on(CLIENT_EVENTS.CREATE_ROOM, ({ name, skin, settings } = {}) => {
      const safeName = sanitizeName(name || socket.data.accountName);

      if (!safeName) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'Digite um nome válido antes de criar a sala.');
        return;
      }

      let code = createRoomCode();
      while (rooms.has(code)) {
        code = createRoomCode();
      }

      const room = createLobby(code, settings);
      room.maxPlayers = room.settings.crewCount + room.settings.impostorCount;
      addPlayerToRoom(room, socket.id, safeName);
      updatePlayerSkin(room, socket.id, skin);

      if (room.settings.allowBots && room.settings.fillBots) {
        while (room.players.filter((player) => player.isBot).length < room.settings.botCount && room.players.length < room.maxPlayers) {
          addBotToRoom(room, `IA ${room.players.length}`);
        }
      }

      rooms.set(code, room);
      socket.join(code);
      socket.data.roomCode = code;

      emitRoomUpdate(room);
      emitRoomList();
    });

    socket.on(CLIENT_EVENTS.ADD_BOT, ({ name } = {}) => {
      const code = socket.data.roomCode;
      const room = code ? ensureRoomExists(code) : null;

      if (!room) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'Você precisa estar em uma sala para adicionar uma IA.');
        return;
      }

      if (room.hostId !== socket.id) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'Apenas o host pode adicionar uma IA.');
        return;
      }

      if (room.settings.allowBots === false) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'As IAs estão desativadas nesta sala.');
        return;
      }

      if (room.status !== ROOM_STATUS.LOBBY) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'A partida já começou.');
        return;
      }

      if (room.players.length >= room.maxPlayers) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'A sala já está cheia.');
        return;
      }

      addBotToRoom(room, String(name ?? '').trim().slice(0, 18) || `IA ${room.players.length}`);
      emitRoomUpdate(room);
    });

    socket.on(CLIENT_EVENTS.JOIN_ROOM, ({ roomCode, name, skin, spectator = false } = {}) => {
      const safeName = sanitizeName(name || socket.data.accountName);
      const code = String(roomCode ?? '').trim().toUpperCase();

      if (!safeName) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'Digite um nome válido antes de entrar na sala.');
        return;
      }

      const room = ensureRoomExists(code);
      if (!room) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'Sala não encontrada. Verifique o código.');
        return;
      }

      if (room.players.length >= room.maxPlayers) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'A sala já está cheia.');
        return;
      }

      if (room.status !== ROOM_STATUS.LOBBY && spectator !== true) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'Esta sala já começou a partida.');
        return;
      }

      const player = addPlayerToRoom(room, socket.id, safeName);
      player.isSpectator = room.status !== ROOM_STATUS.LOBBY && spectator === true;
      updatePlayerSkin(room, socket.id, skin);
      socket.join(code);
      socket.data.roomCode = code;

      emitRoomUpdate(room);
      emitRoomList();
    });

    socket.on(CLIENT_EVENTS.LEAVE_ROOM, () => {
      const code = socket.data.roomCode;
      if (!code) {
        return;
      }

      const room = ensureRoomExists(code);
      if (!room) {
        socket.data.roomCode = null;
        return;
      }

      const removed = removePlayerFromRoom(room, socket.id);
      if (removed) {
        removeBotsIfNoHumanPlayers(room);
        socket.leave(code);
        socket.data.roomCode = null;
        emitRoomUpdate(room);
        deleteRoomIfEmpty(code);
        emitRoomList();
        if (room.status === ROOM_STATUS.PLAYING) {
          const winner = getGameWinner(room);
          if (winner) publishGameUpdate(room, winner);
        }
      }
    });

    socket.on(CLIENT_EVENTS.START_GAME, () => {
      const code = socket.data.roomCode;
      if (!code) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'Você precisa estar em uma sala para iniciar.');
        return;
      }

      const room = ensureRoomExists(code);
      if (!room) {
        return;
      }

      if (room.hostId !== socket.id) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'Apenas o host pode iniciar a partida.');
        return;
      }

      if (room.status !== ROOM_STATUS.LOBBY) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'A partida já foi iniciada.');
        return;
      }

      const activePlayers = room.players.filter((player) => !player.isSpectator);
      if (activePlayers.length < 2) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'São necessários pelo menos 2 jogadores para iniciar a partida.');
        return;
      }

      room.status = ROOM_STATUS.STARTING;
      const saboteurCount = Math.min(room.settings.impostorCount, Math.max(1, activePlayers.length - 1));
      assignRolesToPlayers(room, {
        saboteurCount,
      });
      const gameState = createInitialGameState(room);
      room.gameState = gameState;

      for (const player of room.players) {
        io.to(player.id).emit(SERVER_EVENTS.ROLE_ASSIGNED, {
          role: player.isSpectator ? 'spectator' : player.role,
          roomCode: room.code,
        });
      }

      emitRoomUpdate(room);
      io.to(code).emit(SERVER_EVENTS.ROOM_STARTED, { code, status: room.status });
      io.to(code).emit(SERVER_EVENTS.GAME_STATE, gameState);
      emitRoomList();
      startBotLoop(room);
    });

    socket.on(CLIENT_EVENTS.INTERACT, ({ objectId } = {}) => {
      const code = socket.data.roomCode;
      const room = code ? ensureRoomExists(code) : null;
      if (!room || room.status !== ROOM_STATUS.PLAYING || room.game?.meeting) return;
      const result = interactWithObject(room, socket.id, objectId);
      if (!result.valid) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'Aproxime-se de um terminal para interagir.');
        return;
      }
      publishGameUpdate(room);
    });

    socket.on(CLIENT_EVENTS.START_SABOTAGE, ({ sabotageId } = {}) => {
      const code = socket.data.roomCode;
      const room = code ? ensureRoomExists(code) : null;
      if (!room || room.status !== ROOM_STATUS.PLAYING) return;
      const result = startSabotage(room, socket.id, sabotageId);
      if (!result.valid) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'Sabotagem indisponível agora.');
        return;
      }
      io.to(code).emit(SERVER_EVENTS.SABOTAGE_STARTED, result.sabotage);
      publishGameUpdate(room);
      scheduleSabotageFailure(room, result.sabotage);
    });

    socket.on(CLIENT_EVENTS.FIX_SABOTAGE, ({ objectId } = {}) => {
      const code = socket.data.roomCode;
      const room = code ? ensureRoomExists(code) : null;
      if (!room || room.status !== ROOM_STATUS.PLAYING) return;
      const result = resolveSabotage(room, socket.id, objectId);
      if (!result.valid) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'Este sistema não pode ser estabilizado daqui.');
        return;
      }
      io.to(code).emit(SERVER_EVENTS.SABOTAGE_RESOLVED, { name: result.sabotage.name });
      publishGameUpdate(room);
    });

    socket.on(CLIENT_EVENTS.COMPLETE_TASK, ({ taskId, answer } = {}) => {
      const code = socket.data.roomCode;
      const room = code ? ensureRoomExists(code) : null;
      if (!room || room.status !== ROOM_STATUS.PLAYING) return;
      if (room.game?.meeting) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'A partida fica pausada durante a reunião.');
        return;
      }

      const result = completePlayerTask(room, socket.id, taskId, answer);
      if (!result.valid) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'Essa tarefa não pode ser concluída.');
        return;
      }
      publishGameUpdate(room, result.winner);
    });

    socket.on(CLIENT_EVENTS.KILL_PLAYER, ({ targetId } = {}) => {
      const code = socket.data.roomCode;
      const room = code ? ensureRoomExists(code) : null;
      if (!room || room.status !== ROOM_STATUS.PLAYING) return;
      if (room.game?.meeting) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'A partida fica pausada durante a reunião.');
        return;
      }

      const result = killPlayer(room, socket.id, targetId);
      if (!result.valid) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'Eliminação inválida.');
        return;
      }
      publishGameUpdate(room, result.winner);
    });

    socket.on(CLIENT_EVENTS.VOTE_PLAYER, ({ targetId } = {}) => {
      const code = socket.data.roomCode;
      const room = code ? ensureRoomExists(code) : null;
      if (!room || room.status !== ROOM_STATUS.VOTING) return;

      if (!room.game?.meeting) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'Inicie uma reunião antes de votar.');
        return;
      }

      const result = voteForPlayer(room, socket.id, targetId);
      if (!result.valid) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'Voto inválido.');
        return;
      }
      publishGameUpdate(room, result.winner);
      if (result.resolved) io.to(code).emit(SERVER_EVENTS.MEETING_ENDED);
    });

    socket.on(CLIENT_EVENTS.CALL_MEETING, () => {
      const code = socket.data.roomCode;
      const room = code ? ensureRoomExists(code) : null;
      if (!room || room.status !== ROOM_STATUS.PLAYING) return;
      const result = startMeeting(room, socket.id);
      if (!result.valid) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, result.reason === 'too-far-from-table' ? 'Aproxime-se da mesa central para convocar a reunião.' : 'Não é possível iniciar uma reunião agora.');
        return;
      }
      io.to(code).emit(SERVER_EVENTS.MEETING_STARTED, result.meeting);
      publishGameUpdate(room);
      setTimeout(() => {
        if (room.game?.meeting !== result.meeting || room.status !== ROOM_STATUS.PLAYING) return;
        room.game.votes.clear();
        room.game.meeting = null;
        publishGameUpdate(room);
        io.to(code).emit(SERVER_EVENTS.MEETING_ENDED);
      }, room.settings.meetingDuration * 1000);
    });

    socket.on(CLIENT_EVENTS.REPORT_BODY, ({ bodyId } = {}) => {
      const code = socket.data.roomCode;
      const room = code ? ensureRoomExists(code) : null;
      if (!room || room.status !== ROOM_STATUS.PLAYING) return;
      const result = reportBody(room, socket.id, bodyId);
      if (!result.valid) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'Aproxime-se de um corpo para denunciá-lo.');
        return;
      }
      io.to(code).emit(SERVER_EVENTS.MEETING_STARTED, result.meeting);
      publishGameUpdate(room);
      scheduleMeetingEnd(room, result.meeting);
    });

    socket.on(CLIENT_EVENTS.SKIP_VOTE, () => {
      const code = socket.data.roomCode;
      const room = code ? ensureRoomExists(code) : null;
      if (!room || room.status !== ROOM_STATUS.PLAYING || !room.game?.meeting) return;
      const result = voteForPlayer(room, socket.id, 'skip');
      if (!result.valid) return;
      publishGameUpdate(room, result.winner);
      if (result.resolved) {
        emitRoomUpdate(room);
        io.to(code).emit(SERVER_EVENTS.MEETING_ENDED);
      }
    });

    socket.on(CLIENT_EVENTS.SEND_CHAT, ({ text } = {}) => {
      const code = socket.data.roomCode;
      const room = code ? ensureRoomExists(code) : null;
      if (!room || room.status !== ROOM_STATUS.PLAYING) return;
      if (!room.game?.meeting) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'Só é possível conversar durante uma reunião.');
        return;
      }
      const message = addMeetingMessage(room, socket.id, text);
      if (message) io.to(code).emit(SERVER_EVENTS.CHAT_MESSAGE, message);
    });

    socket.on(CLIENT_EVENTS.ENTER_VENT, ({ ventId } = {}) => {
      const code = socket.data.roomCode;
      const room = code ? ensureRoomExists(code) : null;
      if (!room || room.status !== ROOM_STATUS.PLAYING) return;
      if (room.game?.meeting) return;
      const result = toggleVent(room, socket.id, ventId, true);
      if (!result.valid) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'Você precisa ser impostor e estar perto do duto.');
        return;
      }
      publishGameUpdate(room);
    });

    socket.on(CLIENT_EVENTS.EXIT_VENT, ({ ventId } = {}) => {
      const code = socket.data.roomCode;
      const room = code ? ensureRoomExists(code) : null;
      if (!room || room.status !== ROOM_STATUS.PLAYING) return;
      if (room.game?.meeting) return;
      const result = toggleVent(room, socket.id, ventId, false);
      if (result.valid) publishGameUpdate(room);
    });

    socket.on(CLIENT_EVENTS.MOVE_PLAYER, ({ x, y } = {}) => {
      const code = socket.data.roomCode;
      if (!code) {
        return;
      }

      const room = ensureRoomExists(code);
      if (!room || room.status !== ROOM_STATUS.PLAYING) {
        return;
      }
      if (room.game?.meeting) return;

      const result = applyPlayerMove(room, socket.id, { x: Number(x) || 0, y: Number(y) || 0 });
      if (!result.valid) {
        socket.emit(SERVER_EVENTS.SERVER_ERROR, 'Movimento inválido.');
        return;
      }

      io.to(code).emit(SERVER_EVENTS.PLAYER_MOVED, {
        id: result.player.id,
        x: result.player.x,
        y: result.player.y,
      });
    });

    socket.on('disconnect', () => {
      const code = socket.data.roomCode;
      if (!code) {
        return;
      }

      const room = ensureRoomExists(code);
      if (!room) {
        return;
      }

      const removed = removePlayerFromRoom(room, socket.id);
      if (removed) {
        removeBotsIfNoHumanPlayers(room);
        socket.leave(code);
        emitRoomUpdate(room);
        deleteRoomIfEmpty(code);
        emitRoomList();
        if (room.status === ROOM_STATUS.PLAYING) {
          const winner = getGameWinner(room);
          if (winner) publishGameUpdate(room, winner);
        }
      }
    });
  });

  server.listen(port, () => {
    console.log(`SUSPECT server running on http://localhost:${port}`);
    const networkAddresses = Object.values(os.networkInterfaces())
      .flat()
      .filter((entry) => entry && entry.family === 'IPv4' && !entry.internal)
      .map((entry) => `http://${entry.address}:${server.address().port}`);
    for (const address of networkAddresses) {
      console.log(`SUSPECT available on network at ${address}`);
    }
  });

  server.on('close', () => {
    for (const room of rooms.values()) {
      if (room.botTimer) clearInterval(room.botTimer);
      room.botTimer = null;
    }
  });

  return { app, io, server, rooms };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  createSuspectServer();
}
