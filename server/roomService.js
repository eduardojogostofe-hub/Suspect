export function createRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';

  for (let i = 0; i < 4; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

export const MAP_BOUNDS = {
  width: 1200,
  height: 700,
  meetingTable: { x: 600, y: 350, radius: 64, name: 'Mesa de Convergência' },
  spawnPoints: [
    { x: 600, y: 244 }, { x: 680, y: 270 }, { x: 710, y: 350 }, { x: 680, y: 430 },
    { x: 600, y: 456 }, { x: 520, y: 430 }, { x: 490, y: 350 }, { x: 520, y: 270 },
  ],
  walls: [
    { x: 300, y: 30, w: 24, h: 210 }, { x: 300, y: 335, w: 24, h: 335 },
    { x: 876, y: 30, w: 24, h: 210 }, { x: 876, y: 335, w: 24, h: 335 },
    { x: 366, y: 205, w: 165, h: 24 }, { x: 669, y: 205, w: 165, h: 24 },
    { x: 366, y: 480, w: 165, h: 24 }, { x: 669, y: 480, w: 165, h: 24 },
    { x: 30, y: 275, w: 210, h: 22 }, { x: 30, y: 403, w: 210, h: 22 },
    { x: 960, y: 275, w: 210, h: 22 }, { x: 960, y: 403, w: 210, h: 22 },
  ],
  circularObstacles: [{ x: 600, y: 350, radius: 64, id: 'convergence-table' }],
  vents: [
    { id: 'vent-storage', x: 460, y: 350 },
    { id: 'vent-engine', x: 1030, y: 330 },
  ],
  cameras: [
    { id: 'camera-observatory', x: 125, y: 90 },
    { id: 'camera-relay', x: 1075, y: 90 },
    { id: 'camera-archive', x: 1080, y: 605 },
  ],
};

export const MAP_OBJECTS = [
  { id: 'nav-console', name: 'Console de Navegação', type: 'terminal', x: 160, y: 140, w: 58, h: 36, color: '#38bdf8', interactable: true, obstacle: true },
  { id: 'signal-oscillator', name: 'Oscilador de Sinal', type: 'terminal', x: 675, y: 110, w: 58, h: 36, color: '#a78bfa', interactable: true, obstacle: true },
  { id: 'star-window', name: 'Janela Estelar', type: 'window', x: 86, y: 72, w: 155, h: 18, color: '#1d4ed8', interactable: false, obstacle: true },
  { id: 'relay-array', name: 'Matriz de Sinal', type: 'terminal', x: 1000, y: 140, w: 64, h: 36, color: '#a78bfa', interactable: true, obstacle: true },
  { id: 'power-core', name: 'Núcleo de Energia', type: 'machine', x: 1040, y: 510, w: 68, h: 68, color: '#f59e0b', interactable: true, obstacle: true },
  { id: 'archive-terminal', name: 'Arquivo de Evidências', type: 'terminal', x: 145, y: 550, w: 66, h: 40, color: '#4ade80', interactable: true, obstacle: true },
  { id: 'cargo-crates', name: 'Módulos de Carga', type: 'crate', x: 245, y: 520, w: 58, h: 76, color: '#b77945', interactable: false, obstacle: true },
  { id: 'fabricator', name: 'Fabricador', type: 'machine', x: 510, y: 575, w: 76, h: 46, color: '#fb7185', interactable: true, obstacle: true },
  { id: 'specimen-tank', name: 'Câmara de Amostras', type: 'tank', x: 705, y: 570, w: 72, h: 48, color: '#22d3ee', interactable: true, obstacle: true },
  { id: 'atrium-beacon', name: 'Farol do Átrio', type: 'beacon', x: 770, y: 330, w: 28, h: 44, color: '#facc15', interactable: true, obstacle: true },
];

export const TASKS = [
  { id: 'task-cafeteria', name: 'Ajustar navegação', prompt: 'Digite NEXO', x: 245, y: 180, answer: 'NEXO', objectId: 'nav-console' },
  { id: 'task-reactor', name: 'Sincronizar eco', prompt: 'Digite ORBITA', x: 650, y: 150, answer: 'ORBITA', objectId: 'signal-oscillator' },
  { id: 'task-storage', name: 'Catalogar evidência', prompt: 'Digite ARQUIVO', x: 245, y: 605, answer: 'ARQUIVO', objectId: 'archive-terminal' },
  { id: 'task-engine', name: 'Estabilizar pulso', prompt: 'Digite PULSO', x: 950, y: 600, answer: 'PULSO', objectId: 'power-core' },
  { id: 'task-lab', name: 'Regular fabricador', prompt: 'Digite FORJA', x: 640, y: 610, answer: 'FORJA', objectId: 'fabricator' },
];

export const SABOTAGES = [
  { id: 'signal-fog', name: 'Névoa de Sinal', objectId: 'relay-array', duration: 35_000, description: 'O enlace externo está falhando.' },
  { id: 'core-surge', name: 'Surto do Núcleo', objectId: 'power-core', duration: 30_000, description: 'A contenção de energia está instável.' },
];

export const MAP_ROOMS = [
  { id: 'observatory', name: 'OBSERVATÓRIO', x: 45, y: 45, w: 285, h: 185, color: '#18395b', accent: '#38bdf8' },
  { id: 'signal', name: 'ESTAÇÃO DE SINAL', x: 430, y: 45, w: 340, h: 150, color: '#362b58', accent: '#a78bfa' },
  { id: 'relay', name: 'RETRANSMISSÃO', x: 870, y: 45, w: 285, h: 185, color: '#3f2948', accent: '#f472b6' },
  { id: 'atrium', name: 'ÁTRIO NEXO', x: 380, y: 230, w: 440, h: 245, color: '#25364a', accent: '#facc15' },
  { id: 'archive', name: 'ARQUIVO', x: 45, y: 470, w: 285, h: 180, color: '#28483c', accent: '#4ade80' },
  { id: 'fabrication', name: 'OFICINA', x: 430, y: 515, w: 340, h: 135, color: '#55343b', accent: '#fb7185' },
  { id: 'power', name: 'NÚCLEO DE ENERGIA', x: 870, y: 470, w: 285, h: 180, color: '#4b4129', accent: '#f59e0b' },
];

export function createLobby(code = createRoomCode(), settings = {}) {
  return {
    code,
    status: 'lobby',
    maxPlayers: 8,
    hostId: null,
    players: [],
    settings: {
      map: 'starter-arc',
      impostorCount: Math.min(2, Math.max(1, Number(settings.impostorCount) || 1)),
      crewCount: Math.min(7, Math.max(1, Number(settings.crewCount) || 3)),
      botCount: Math.min(7, Math.max(0, Number(settings.botCount) || 0)),
      allowBots: settings.allowBots !== false,
      fillBots: settings.fillBots === true,
      sabotageCount: 1,
      meetingDuration: 25,
      voteDuration: 20,
      speed: 1,
    },
  };
}

export function addPlayerToRoom(lobby, socketId, name) {
  const existingPlayer = lobby.players.find((player) => player.id === socketId);

  if (existingPlayer) {
    existingPlayer.name = name;
    return existingPlayer;
  }

  const player = {
    id: socketId,
    name,
    isHost: lobby.hostId === null,
    connected: true,
    joinedAt: Date.now(),
    x: 0,
    y: 0,
    radius: 18,
    color: '#38bdf8',
    role: null,
    isBot: false,
    isSpectator: false,
    skin: {
      color: '#38bdf8',
      hat: 'none',
      outfit: 'standard',
      pet: 'none',
    },
    inVent: false,
  };

  lobby.players.push(player);

  if (lobby.hostId === null) {
    lobby.hostId = socketId;
    player.isHost = true;
  }

  const spawnIndex = lobby.players.length - 1;
  const spawnPoint = MAP_BOUNDS.spawnPoints[spawnIndex % MAP_BOUNDS.spawnPoints.length] ?? { x: 100, y: 100 };
  player.x = spawnPoint.x;
  player.y = spawnPoint.y;

  return player;
}

export function addBotToRoom(lobby, name = `IA ${lobby.players.length}`) {
  const botId = `bot-${Date.now()}-${lobby.players.length}`;
  const bot = addPlayerToRoom(lobby, botId, name);
  bot.isBot = true;
  bot.color = '#f97316';
  return bot;
}

export function updatePlayerSkin(lobby, socketId, skin = {}) {
  const player = lobby.players.find((entry) => entry.id === socketId);
  if (!player) return null;

  const allowed = {
    color: ['#38bdf8', '#f97316', '#a78bfa', '#4ade80', '#f43f5e', '#facc15'],
    hat: ['none', 'cap', 'crown'],
    outfit: ['standard', 'space', 'detective'],
    pet: ['none', 'mini', 'drone'],
  };

  for (const key of Object.keys(allowed)) {
    if (allowed[key].includes(skin[key])) player.skin[key] = skin[key];
  }
  player.color = player.skin.color;
  return player;
}

export function removePlayerFromRoom(lobby, socketId) {
  const index = lobby.players.findIndex((player) => player.id === socketId);

  if (index === -1) {
    return false;
  }

  lobby.players.splice(index, 1);

  if (lobby.hostId === socketId) {
    lobby.hostId = lobby.players[0]?.id ?? null;
    if (lobby.players[0]) {
      lobby.players[0].isHost = true;
    }
  }

  for (const player of lobby.players) {
    player.isHost = player.id === lobby.hostId;
  }

  return true;
}

export function createPublicGameState(lobby) {
  return {
    map: {
      width: MAP_BOUNDS.width,
      height: MAP_BOUNDS.height,
      walls: MAP_BOUNDS.walls,
      circularObstacles: MAP_BOUNDS.circularObstacles,
      meetingTable: MAP_BOUNDS.meetingTable,
      cameras: MAP_BOUNDS.cameras,
      vents: MAP_BOUNDS.vents,
      objects: MAP_OBJECTS,
      rooms: MAP_ROOMS,
    },
    players: lobby.players.map((player, index) => ({
      id: player.id,
      name: player.name,
      x: player.x ?? MAP_BOUNDS.spawnPoints[index % MAP_BOUNDS.spawnPoints.length].x,
      y: player.y ?? MAP_BOUNDS.spawnPoints[index % MAP_BOUNDS.spawnPoints.length].y,
      color: player.color,
      radius: player.radius,
      alive: player.alive !== false,
      completedTasks: player.completedTasks ?? 0,
      tasks: player.role === 'crew' ? player.tasks ?? [] : [],
      inVent: player.inVent === true,
      activity: player.activity ?? 'idle',
    })),
    game: {
      totalTasks: lobby.game.totalTasks,
      completedTasks: lobby.game.completedTasks,
      tasksPerCrew: lobby.game.tasksPerCrew,
      result: lobby.game.result,
      sabotage: lobby.game.sabotage ? { ...lobby.game.sabotage } : null,
      tasks: TASKS.map(({ answer, ...task }) => task),
      meeting: lobby.game.meeting,
    },
  };
}

export function createInitialGameState(lobby) {
  lobby.status = 'playing';
  const livingPlayers = lobby.players.filter((player) => !player.isSpectator);
  const tasksPerCrew = 3;
  lobby.game = {
    totalTasks: livingPlayers.filter((player) => player.role === 'crew').length * tasksPerCrew,
    completedTasks: 0,
    votes: new Map(),
    tasksPerCrew,
    result: null,
    meeting: null,
    sabotage: null,
  };

  for (const [index, player] of livingPlayers.entries()) {
    player.alive = true;
    player.completedTasks = 0;
    player.tasks = player.role === 'crew'
      ? Array.from({ length: tasksPerCrew }, (_, taskIndex) => TASKS[(index + taskIndex) % TASKS.length].id)
      : [];
    player.nextKillAt = 0;
  }

  assignGameSpawns(lobby);

  return createPublicGameState(lobby);
}

export function assignGameSpawns(lobby) {
  const activePlayers = lobby.players.filter((player) => !player.isSpectator);
  for (const [index, player] of activePlayers.entries()) {
    const spawn = MAP_BOUNDS.spawnPoints[index % MAP_BOUNDS.spawnPoints.length];
    player.x = spawn.x;
    player.y = spawn.y;
    player.inVent = false;
  }
}

function getLivingPlayers(lobby) {
  return lobby.players.filter((player) => !player.isSpectator && player.alive !== false);
}

export function getGameWinner(lobby) {
  if (!lobby.game || lobby.game.result) return lobby.game?.result ?? null;
  const living = getLivingPlayers(lobby);
  const livingCrew = living.filter((player) => player.role === 'crew').length;
  const livingSaboteurs = living.filter((player) => player.role === 'saboteur').length;

  if (lobby.game.completedTasks >= lobby.game.totalTasks && lobby.game.totalTasks > 0) return 'crew-tasks';
  if (livingSaboteurs === 0) return 'crew-discovery';
  if (livingCrew <= livingSaboteurs) return 'saboteur-elimination';
  return null;
}

function distanceBetween(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

export function completePlayerTask(lobby, socketId, taskId, answer = '') {
  const player = lobby.players.find((entry) => entry.id === socketId);
  if (!lobby.game || !player || player.isSpectator || player.role !== 'crew' || player.alive === false) return { valid: false, reason: 'invalid-task', winner: null };
  if (player.completedTasks >= lobby.game.tasksPerCrew) return { valid: false, reason: 'tasks-complete', winner: getGameWinner(lobby) };

  const nextTaskId = player.tasks?.[player.completedTasks];
  const task = TASKS.find((entry) => entry.id === (taskId || nextTaskId));
  if (!task || task.id !== nextTaskId) return { valid: false, reason: 'wrong-task', winner: null };
  if (distanceBetween(player, task) > 110) return { valid: false, reason: 'too-far', winner: null };
  if (String(answer).trim().toUpperCase() !== task.answer) return { valid: false, reason: 'wrong-puzzle-answer', winner: null };

  player.completedTasks += 1;
  lobby.game.completedTasks += 1;
  const winner = getGameWinner(lobby);
  if (winner) lobby.game.result = winner;
  return { valid: true, reason: 'task-complete', winner };
}

export function killPlayer(lobby, killerId, targetId) {
  const killer = lobby.players.find((entry) => entry.id === killerId);
  const target = lobby.players.find((entry) => entry.id === targetId);
  if (!lobby.game || !killer || !target || killer.isSpectator || target.isSpectator || killer.role !== 'saboteur' || killer.alive === false || target.role !== 'crew' || target.alive === false) {
    return { valid: false, reason: 'invalid-kill', winner: null };
  }

  if (Date.now() < (killer.nextKillAt ?? 0)) return { valid: false, reason: 'kill-cooldown', winner: null };

  if (distanceBetween(killer, target) > 110) return { valid: false, reason: 'too-far', winner: null };

  target.alive = false;
  target.inVent = false;
  killer.nextKillAt = Date.now() + 20_000;
  const winner = getGameWinner(lobby);
  if (winner) lobby.game.result = winner;
  return { valid: true, reason: 'player-eliminated', winner };
}

export function voteForPlayer(lobby, voterId, targetId) {
  const voter = lobby.players.find((entry) => entry.id === voterId);
  const isSkip = targetId === null || targetId === 'skip';
  const target = isSkip ? null : lobby.players.find((entry) => entry.id === targetId);
  if (!lobby.game || !voter || (!isSkip && (!target || target.isSpectator || target.alive === false)) || voter.isSpectator || voter.alive === false) return { valid: false, reason: 'invalid-vote', winner: null };

  lobby.game.votes.set(voterId, isSkip ? 'skip' : targetId);
  const living = getLivingPlayers(lobby);
  if (lobby.game.votes.size < living.length) return { valid: true, reason: 'vote-recorded', winner: null, resolved: false };

  return finalizeVotes(lobby);
}

export function finalizeVotes(lobby) {
  const living = getLivingPlayers(lobby);
  const counts = new Map();
  for (const votedTarget of lobby.game.votes.values()) counts.set(votedTarget, (counts.get(votedTarget) ?? 0) + 1);
  const highestVotes = Math.max(0, ...counts.values());
  const leaders = [...counts.entries()].filter(([, votes]) => votes === highestVotes).map(([id]) => id);
  const exiledId = leaders.length === 1 ? leaders[0] : null;
  const votes = leaders.length === 1 ? highestVotes : 0;
  lobby.game.votes.clear();
  if (lobby.game.meeting) lobby.game.meeting = null;
  if (lobby.status === 'meeting' || lobby.status === 'voting') lobby.status = 'playing';
  if (exiledId && exiledId !== 'skip' && votes > living.length / 2) {
    const exiled = lobby.players.find((entry) => entry.id === exiledId);
    if (exiled) exiled.alive = false;
  }

  const winner = getGameWinner(lobby);
  if (winner) lobby.game.result = winner;
  return { valid: true, reason: 'vote-resolved', winner, resolved: true, exiledId: exiledId ?? null };
}

export function startMeeting(lobby, callerId) {
  const caller = lobby.players.find((player) => player.id === callerId);
  if (!lobby.game || lobby.status !== 'playing' || !caller || caller.alive === false || lobby.game.meeting) return { valid: false, reason: 'meeting-unavailable' };
  if (Math.hypot(caller.x - MAP_BOUNDS.meetingTable.x, caller.y - MAP_BOUNDS.meetingTable.y) > 120) return { valid: false, reason: 'too-far-from-table' };
  const startedAt = Date.now();
  lobby.status = 'meeting';
  lobby.game.meeting = { callerId, messages: [], votes: 0, phase: 'discussion', startedAt, endsAt: startedAt + lobby.settings.meetingDuration * 1000 };
  lobby.game.votes.clear();
  return { valid: true, meeting: lobby.game.meeting };
}

export function interactWithObject(lobby, socketId, objectId) {
  const player = lobby.players.find((entry) => entry.id === socketId);
  const object = MAP_OBJECTS.find((entry) => entry.id === objectId && entry.interactable);
  if (!lobby.game || !player || player.isSpectator || player.alive === false || !object) return { valid: false, reason: 'invalid-interaction' };
  const center = { x: object.x + object.w / 2, y: object.y + object.h / 2 };
  if (distanceBetween(player, center) > 105) return { valid: false, reason: 'too-far' };
  player.activity = `inspecionando ${object.name}`;
  return { valid: true, object: { id: object.id, name: object.name }, activity: player.activity };
}

export function startSabotage(lobby, socketId, sabotageId) {
  const player = lobby.players.find((entry) => entry.id === socketId);
  const sabotage = SABOTAGES.find((entry) => entry.id === sabotageId);
  if (!lobby.game || lobby.status !== 'playing' || !player || player.role !== 'saboteur' || player.alive === false || !sabotage || lobby.game.sabotage) return { valid: false, reason: 'invalid-sabotage' };
  if (Date.now() < (player.nextSabotageAt ?? 0)) return { valid: false, reason: 'sabotage-cooldown' };
  lobby.game.sabotage = { id: sabotage.id, name: sabotage.name, objectId: sabotage.objectId, description: sabotage.description, startedAt: Date.now(), endsAt: Date.now() + sabotage.duration };
  player.nextSabotageAt = Date.now() + 40_000;
  return { valid: true, sabotage: lobby.game.sabotage };
}

export function resolveSabotage(lobby, socketId, objectId) {
  const player = lobby.players.find((entry) => entry.id === socketId);
  const sabotage = lobby.game?.sabotage;
  const object = MAP_OBJECTS.find((entry) => entry.id === objectId);
  if (!lobby.game || !player || player.alive === false || player.role !== 'crew' || !sabotage || sabotage.objectId !== objectId || !object) return { valid: false, reason: 'invalid-sabotage-fix' };
  const center = { x: object.x + object.w / 2, y: object.y + object.h / 2 };
  if (distanceBetween(player, center) > 105) return { valid: false, reason: 'too-far' };
  lobby.game.sabotage = null;
  player.activity = `estabilizou ${sabotage.name}`;
  return { valid: true, sabotage };
}

export function reportBody(lobby, reporterId, bodyId) {
  const reporter = lobby.players.find((player) => player.id === reporterId);
  const body = lobby.players.find((player) => player.id === bodyId);
  if (!lobby.game || lobby.status !== 'playing' || !reporter || reporter.alive === false || !body || body.alive !== false || lobby.game.meeting) {
    return { valid: false, reason: 'report-unavailable' };
  }
  if (distanceBetween(reporter, body) > 125) return { valid: false, reason: 'too-far-from-body' };
  const startedAt = Date.now();
  lobby.status = 'meeting';
  lobby.game.meeting = { callerId: reporterId, bodyId, messages: [], votes: 0, phase: 'discussion', startedAt, endsAt: startedAt + lobby.settings.meetingDuration * 1000 };
  lobby.game.votes.clear();
  return { valid: true, meeting: lobby.game.meeting };
}

export function addMeetingMessage(lobby, senderId, text) {
  const sender = lobby.players.find((player) => player.id === senderId);
  const cleanText = String(text ?? '').trim().slice(0, 120);
  if (!lobby.game?.meeting || !sender || sender.alive === false || !cleanText) return null;
  return { senderId, senderName: sender.name, text: cleanText };
}

function rectsOverlapCircle(rect, circle) {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return (dx * dx + dy * dy) < circle.radius * circle.radius;
}

function circlesOverlap(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y) < first.radius + second.radius;
}

export function isPositionWalkable(position, radius = 18) {
  const candidate = { x: position.x, y: position.y, radius };
  if (candidate.x < radius || candidate.y < radius || candidate.x > MAP_BOUNDS.width - radius || candidate.y > MAP_BOUNDS.height - radius) return false;
  if (MAP_BOUNDS.walls.some((wall) => rectsOverlapCircle(wall, candidate))) return false;
  if (MAP_OBJECTS.some((object) => object.obstacle && rectsOverlapCircle(object, candidate))) return false;
  return !MAP_BOUNDS.circularObstacles.some((obstacle) => circlesOverlap(obstacle, candidate));
}

export function findPath(start, goal, { radius = 18, cellSize = 20, maxVisited = 4000 } = {}) {
  const columns = Math.floor(MAP_BOUNDS.width / cellSize);
  const rows = Math.floor(MAP_BOUNDS.height / cellSize);
  const toCell = (point) => ({ x: Math.max(0, Math.min(columns - 1, Math.floor(point.x / cellSize))), y: Math.max(0, Math.min(rows - 1, Math.floor(point.y / cellSize))) });
  const toPoint = (cell) => ({ x: cell.x * cellSize + cellSize / 2, y: cell.y * cellSize + cellSize / 2 });
  const keyFor = (cell) => `${cell.x}:${cell.y}`;
  const closestWalkable = (origin) => {
    const originCell = toCell(origin);
    for (let distance = 0; distance <= 5; distance += 1) {
      for (let y = originCell.y - distance; y <= originCell.y + distance; y += 1) {
        for (let x = originCell.x - distance; x <= originCell.x + distance; x += 1) {
          const cell = { x, y };
          if (x < 0 || y < 0 || x >= columns || y >= rows || !isPositionWalkable(toPoint(cell), radius)) continue;
          return cell;
        }
      }
    }
    return null;
  };
  const startCell = closestWalkable(start);
  const goalCell = closestWalkable(goal);
  if (!startCell || !goalCell) return [];

  const open = [{ cell: startCell, cost: 0, priority: 0 }];
  const parent = new Map();
  const cost = new Map([[keyFor(startCell), 0]]);
  const targetKey = keyFor(goalCell);
  const distance = (first, second) => Math.abs(first.x - second.x) + Math.abs(first.y - second.y);
  let visited = 0;
  while (open.length && visited < maxVisited) {
    open.sort((first, second) => first.priority - second.priority);
    const current = open.shift();
    const currentKey = keyFor(current.cell);
    visited += 1;
    if (currentKey === targetKey) {
      const cells = [];
      let key = currentKey;
      while (key) {
        const [x, y] = key.split(':').map(Number);
        cells.push({ x, y });
        key = parent.get(key);
      }
      return cells.reverse().slice(1).map(toPoint);
    }
    for (const delta of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
      const next = { x: current.cell.x + delta.x, y: current.cell.y + delta.y };
      if (next.x < 0 || next.y < 0 || next.x >= columns || next.y >= rows || !isPositionWalkable(toPoint(next), radius)) continue;
      const nextKey = keyFor(next);
      const nextCost = current.cost + 1;
      if (nextCost >= (cost.get(nextKey) ?? Infinity)) continue;
      cost.set(nextKey, nextCost);
      parent.set(nextKey, currentKey);
      open.push({ cell: next, cost: nextCost, priority: nextCost + distance(next, goalCell) });
    }
  }
  return [];
}

export function applyPlayerMove(lobby, socketId, nextPosition) {
  const player = lobby.players.find((entry) => entry.id === socketId);

  if (!player) {
    return { valid: false, reason: 'player-not-found', player: null };
  }

  if (player.isSpectator) {
    return { valid: false, reason: 'spectator-cannot-move', player };
  }

  if (player.alive === false) {
    return { valid: false, reason: 'dead-player-cannot-move', player };
  }

  if (Math.hypot(nextPosition.x - player.x, nextPosition.y - player.y) > 18) {
    return { valid: false, reason: 'movement-too-fast', player };
  }

  const maxX = MAP_BOUNDS.width - player.radius;
  const maxY = MAP_BOUNDS.height - player.radius;
  const candidate = {
    x: Math.min(Math.max(0, nextPosition.x), maxX),
    y: Math.min(Math.max(0, nextPosition.y), maxY),
    radius: player.radius,
  };

  if (!isPositionWalkable(candidate, player.radius)) {
    return { valid: false, reason: 'wall-collision', player };
  }

  player.x = candidate.x;
  player.y = candidate.y;

  return { valid: true, reason: 'ok', player };
}

export function toggleVent(lobby, socketId, ventId, entering) {
  const player = lobby.players.find((entry) => entry.id === socketId);
  const vent = MAP_BOUNDS.vents.find((entry) => entry.id === ventId);
  if (!player || !vent || player.role !== 'saboteur' || player.alive === false) return { valid: false, reason: 'invalid-vent' };
  if (Math.hypot(player.x - vent.x, player.y - vent.y) > 110) return { valid: false, reason: 'too-far' };
  player.inVent = entering;
  return { valid: true, inVent: entering };
}

export function assignRolesToPlayers(lobby, { saboteurCount = 1 } = {}) {
  const players = lobby.players.filter((player) => !player.isSpectator);
  const totalSaboteurs = Math.min(Math.max(0, saboteurCount), players.length);

  for (const player of lobby.players) {
    player.role = 'crew';
  }

  for (const player of lobby.players.filter((entry) => entry.isSpectator)) {
    player.role = null;
  }

  const shuffled = [...players].sort(() => Math.random() - 0.5);

  for (let i = 0; i < totalSaboteurs; i += 1) {
    const player = shuffled[i];
    if (player) {
      player.role = 'saboteur';
    }
  }

  return players;
}

export function getPlayerRole(lobby, socketId) {
  const player = lobby.players.find((entry) => entry.id === socketId);
  return player ? player.role : null;
}
