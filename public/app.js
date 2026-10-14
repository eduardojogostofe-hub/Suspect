const CLIENT_EVENTS = {
  CREATE_ACCOUNT: 'create_account',
  LOGIN_ACCOUNT: 'login_account',
  LIST_ROOMS: 'list_rooms',
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  UPDATE_SKIN: 'update_skin',
  ADD_BOT: 'add_bot',
  LEAVE_ROOM: 'leave_room',
  START_GAME: 'start_game',
  MOVE_PLAYER: 'move_player',
  COMPLETE_TASK: 'complete_task',
  KILL_PLAYER: 'kill_player',
  VOTE_PLAYER: 'vote_player',
  CALL_MEETING: 'call_meeting',
  REPORT_BODY: 'report_body',
  SKIP_VOTE: 'skip_vote',
  SEND_CHAT: 'send_chat',
  INTERACT: 'interact',
  START_SABOTAGE: 'start_sabotage',
  FIX_SABOTAGE: 'fix_sabotage',
};

const SERVER_EVENTS = {
  ACCOUNT_READY: 'account_ready',
  ROOM_LIST: 'room_list',
  ROOM_STATE: 'room_state',
  LOBBY_UPDATE: 'lobby_update',
  SERVER_ERROR: 'server_error',
  GAME_STATE: 'game_state',
  PLAYER_MOVED: 'player_moved',
  GAME_UPDATE: 'game_update',
  GAME_OVER: 'game_over',
  MEETING_STARTED: 'meeting_started',
  MEETING_ENDED: 'meeting_ended',
  SABOTAGE_STARTED: 'sabotage_started',
  SABOTAGE_RESOLVED: 'sabotage_resolved',
  CHAT_MESSAGE: 'chat_message',
  ROLE_ASSIGNED: 'role_assigned',
};

const serverFromUrl = new URLSearchParams(window.location.search).get('server');
const socket = io(serverFromUrl || undefined);
const $ = (id) => document.getElementById(id);
const panels = ['welcomePanel', 'accountPanel', 'mainMenuPanel', 'createRoomPanel', 'roomsPanel', 'skinPanel', 'lobbyPanel', 'gamePanel'];
let accountName = '';
let accountMode = 'login';
let currentRoom = null;
let gameState = null;
let skin = { color: '#38bdf8', hat: 'none', outfit: 'standard', pet: 'none' };
const pressedKeys = new Set();

function showPanel(id) {
  panels.forEach((panel) => $(panel).classList.toggle('hidden', panel !== id));
  document.body.classList.toggle('in-game', id === 'gamePanel');
  if (id === 'gamePanel') window.requestAnimationFrame(drawGame);
}
function showMessage(text, error = false) { $('accountMessage').textContent = text; $('accountMessage').classList.toggle('error', error); }
function setRoleDisplay(role) {
  const label = role === 'saboteur' ? 'Impostor' : role === 'spectator' ? 'Fantasma' : 'Tripulante';
  $('gameRoleLabel').textContent = `Papel: ${label}`;
  $('gameRoleLabel').classList.remove('hidden');
  $('completeTaskBtn').disabled = role !== 'crew';
}
function renderRoom(room) {
  currentRoom = room;
  if (room.status === 'playing' && gameState) {
    syncRoomPlayersFromGame();
    renderGameTargets();
    return;
  }
  if (room.status === 'ended' && gameState) return;
  showPanel('lobbyPanel');
  $('roleBadge').classList.add('hidden');
  $('roomCodeLabel').textContent = room.code;
  $('statusLabel').textContent = room.status === 'lobby' ? 'Lobby' : room.status === 'playing' ? 'Em andamento' : 'Iniciando';
  $('playerCountLabel').textContent = `${room.players.length}/${room.maxPlayers} jogadores`;
  $('playerList').replaceChildren(...room.players.map((player) => {
    const item = document.createElement('li'); item.className = 'player-item';
    const name = document.createElement('span'); name.className = 'player-name'; name.textContent = player.name;
    const badge = document.createElement('span'); badge.className = 'player-badge'; badge.textContent = player.isSpectator ? 'Fantasma' : player.isBot ? 'IA' : player.isHost ? 'Host' : 'Jogador';
    item.append(name, badge); return item;
  }));
  const host = room.players.some((player) => player.id === socket.id && player.isHost);
  $('startGameBtn').disabled = !host || room.players.length < 2 || room.status !== 'lobby';
  $('addBotBtn').disabled = !host || room.players.length >= room.maxPlayers || room.status !== 'lobby';
}
function renderRooms(rooms) {
  const list = $('roomsList'); list.replaceChildren();
  if (!rooms.length) { const empty = document.createElement('p'); empty.className = 'connection-status'; empty.textContent = 'Nenhuma sala disponível ainda.'; list.append(empty); return; }
  rooms.forEach((room) => {
    const card = document.createElement('div'); card.className = 'room-card';
    const title = document.createElement('strong'); title.textContent = `${room.code} · ${room.players}/${room.maxPlayers}`;
    const info = document.createElement('span'); info.textContent = room.status === 'lobby' ? 'Lobby aberto' : 'Partida em andamento';
    const button = document.createElement('button'); button.className = 'secondary'; button.textContent = room.status === 'lobby' ? 'Entrar' : 'Entrar como fantasma';
    button.addEventListener('click', () => socket.emit(CLIENT_EVENTS.JOIN_ROOM, { roomCode: room.code, name: accountName, skin, spectator: room.status !== 'lobby' }));
    card.append(title, info, button); list.append(card);
  });
}
function renderGameTargets() {
  const targetList = $('gameTargets');
  if (!currentRoom) return;
  targetList.replaceChildren();
  const canVote = Boolean(gameState?.game?.meeting);
  currentRoom.players.filter((player) => player.id !== socket.id && !player.isSpectator).forEach((player) => {
    if (canVote) {
      const voteButton = document.createElement('button');
      voteButton.className = 'ghost';
      voteButton.textContent = `Votar em ${player.name}`;
      voteButton.addEventListener('click', () => socket.emit(CLIENT_EVENTS.VOTE_PLAYER, { targetId: player.id }));
      if (player.alive === false) voteButton.disabled = true;
      targetList.appendChild(voteButton);
    }

  });
}
function renderTasks() {
  const player = gameState?.players.find((entry) => entry.id === socket.id);
  const taskList = $('taskList');
  taskList.replaceChildren();
  for (const taskId of player?.tasks ?? []) {
    const task = gameState.game.tasks.find((entry) => entry.id === taskId);
    const button = document.createElement('button');
    button.className = 'ghost';
    button.textContent = `${task.name}: ${task.prompt}`;
    taskList.appendChild(button);
  }
}
function openTaskModal() {
  const player = gameState?.players.find((entry) => entry.id === socket.id);
  const taskId = player?.tasks?.[player.completedTasks];
  const task = gameState?.game?.tasks?.find((entry) => entry.id === taskId);
  const target = window.nearbyActionTarget?.task;
  if (!task || !target) return;
  $('taskModalTitle').textContent = task.name;
  $('taskModalPrompt').textContent = task.prompt;
  $('taskAnswerInput').value = '';
  $('taskModal').classList.remove('hidden');
  $('taskAnswerInput').focus();
}
function interactWithNearby() {
  const target = window.nearbyActionTarget;
  if (target?.object && gameState?.game?.sabotage?.objectId === target.object.id && window.localRole === 'crew') {
    socket.emit(CLIENT_EVENTS.FIX_SABOTAGE, { objectId: target.object.id });
    return;
  }
  if (target?.task) {
    openTaskModal();
    return;
  }
  if (target?.object) socket.emit(CLIENT_EVENTS.INTERACT, { objectId: target.object.id });
}
function syncRoomPlayersFromGame() {
  if (!currentRoom || !gameState) return;
  for (const player of currentRoom.players) {
    const statePlayer = gameState.players.find((entry) => entry.id === player.id);
    if (statePlayer) player.alive = statePlayer.alive;
  }
}
function updateSkinPreview() { $('skinPreview').style.color = $('skinColor').value; $('skinPreview').textContent = $('skinHat').value === 'crown' ? '♛' : $('skinHat').value === 'cap' ? '▲' : '●'; }
function drawGame() {
  if (!gameState) return;
  const canvas = $('gameCanvas');
  const ctx = canvas.getContext('2d');
  const map = gameState.map;
  const local = gameState.players.find((entry) => entry.id === socket.id) ?? gameState.players[0];
  updateContextActions(local);
  const resizeScale = window.devicePixelRatio || 1;
  if (canvas.width !== Math.floor(canvas.clientWidth * resizeScale) || canvas.height !== Math.floor(canvas.clientHeight * resizeScale)) {
    canvas.width = Math.floor(canvas.clientWidth * resizeScale);
    canvas.height = Math.floor(canvas.clientHeight * resizeScale);
    ctx.scale(resizeScale, resizeScale);
  }
  const viewWidth = canvas.clientWidth;
  const viewHeight = canvas.clientHeight;
  const screenCameraX = (local?.x ?? 0) - viewWidth / 2;
  const screenCameraY = (local?.y ?? 0) - viewHeight / 2;
  ctx.clearRect(0, 0, viewWidth, viewHeight); ctx.save(); ctx.translate(-screenCameraX, -screenCameraY);
  ctx.fillStyle = '#07101d'; ctx.fillRect(screenCameraX, screenCameraY, viewWidth, viewHeight);
  ctx.fillStyle = '#0e1b2c'; ctx.fillRect(20, 20, map.width - 40, map.height - 40);
  ctx.strokeStyle = 'rgba(99, 180, 220, .12)'; ctx.lineWidth = 1;
  for (let x = 30; x <= map.width; x += 32) { ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, map.height - 20); ctx.stroke(); }
  for (let y = 20; y <= map.height; y += 32) { ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(map.width - 20, y); ctx.stroke(); }
  for (const room of map.rooms ?? []) {
    ctx.fillStyle = room.color;
    ctx.fillRect(room.x, room.y, room.w, room.h); ctx.fillStyle = 'rgba(255,255,255,.035)';
    ctx.fillRect(room.x + 12, room.y + 12, room.w - 24, room.h - 24);
    ctx.strokeStyle = room.accent || 'rgba(226,232,240,.45)'; ctx.globalAlpha = .7; ctx.lineWidth = 3;
    ctx.strokeRect(room.x, room.y, room.w, room.h); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(226,232,240,.78)'; ctx.font = 'bold 13px Segoe UI';
    ctx.textAlign = 'left';
    ctx.fillText(room.name, room.x + 12, room.y + 24);
  }
  if (map.meetingTable) {
    ctx.beginPath();
    ctx.fillStyle = '#243446';
    ctx.arc(map.meetingTable.x, map.meetingTable.y, map.meetingTable.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#facc15';
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 14px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('NEXO', map.meetingTable.x, map.meetingTable.y + 5);
  }
  for (const wall of map.walls ?? []) { ctx.fillStyle = '#111c2d'; ctx.fillRect(wall.x - 3, wall.y - 3, wall.w + 6, wall.h + 6); ctx.fillStyle = '#52667b'; ctx.fillRect(wall.x, wall.y, wall.w, wall.h); ctx.fillStyle = 'rgba(255,255,255,.13)'; ctx.fillRect(wall.x + 3, wall.y + 3, Math.max(0, wall.w - 6), 4); }
  for (const object of map.objects ?? []) {
    ctx.fillStyle = '#101827'; ctx.fillRect(object.x - 3, object.y - 3, object.w + 6, object.h + 6);
    ctx.fillStyle = object.color; ctx.fillRect(object.x, object.y, object.w, object.h);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(object.x + 5, object.y + 5, Math.max(0, object.w - 10), 5);
    if (object.interactable) { ctx.fillStyle = '#e2e8f0'; ctx.font = '10px Segoe UI'; ctx.textAlign = 'center'; ctx.fillText('⌁', object.x + object.w / 2, object.y + object.h / 2 + 4); }
  }
  for (const vent of map.vents ?? []) { ctx.beginPath(); ctx.fillStyle = '#111827'; ctx.ellipse(vent.x, vent.y, 22, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 3; ctx.stroke(); }
  for (const camera of map.cameras ?? []) { ctx.fillStyle = '#0f172a'; ctx.fillRect(camera.x - 12, camera.y - 8, 24, 16); ctx.fillStyle = '#67e8f9'; ctx.beginPath(); ctx.arc(camera.x, camera.y, 5, 0, Math.PI * 2); ctx.fill(); }
  for (const task of gameState.game.tasks ?? []) { ctx.beginPath(); ctx.fillStyle = '#facc15'; ctx.arc(task.x, task.y, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '11px Segoe UI'; ctx.fillText('T', task.x, task.y + 4); }
  for (const player of gameState.players ?? []) {
    if (player.inVent) continue;
    if (player.alive === false) {
      ctx.save(); ctx.translate(player.x, player.y); ctx.fillStyle = '#d7e2ee'; ctx.fillRect(-23, -7, 30, 14); ctx.fillStyle = '#fb7185'; ctx.fillRect(7, -5, 20, 10); ctx.fillStyle = '#0f172a'; ctx.fillRect(-2, -14, 8, 28); ctx.restore();
      continue;
    }
    ctx.save(); ctx.translate(player.x, player.y); ctx.fillStyle = player.color || '#38bdf8'; ctx.beginPath(); ctx.ellipse(0, 4, 17, 21, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-14, 12, 10, 16); ctx.fillRect(4, 12, 10, 16); ctx.fillStyle = '#bff4ff'; ctx.beginPath(); ctx.ellipse(6, -4, 13, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = player.id === socket.id ? '#facc15' : '#e2e8f0'; ctx.lineWidth = player.id === socket.id ? 4 : 2; ctx.stroke(); ctx.restore(); ctx.fillStyle = '#e2e8f0'; ctx.font = '12px Segoe UI'; ctx.textAlign = 'center'; ctx.fillText(player.name, player.x, player.y - 31); if (player.activity && player.id === socket.id) { ctx.fillStyle = '#94a3b8'; ctx.font = '10px Segoe UI'; ctx.fillText(player.activity, player.x, player.y + 43); }
  }
  ctx.restore();
}

function updateContextActions(local) {
  if (!local || !gameState) return;
  const nearbyTask = (gameState.game.tasks ?? []).find((task) => Math.hypot(task.x - local.x, task.y - local.y) <= 110 && local.tasks?.includes(task.id));
  const nearbyObject = (gameState.map.objects ?? []).find((object) => object.interactable && Math.hypot(object.x + object.w / 2 - local.x, object.y + object.h / 2 - local.y) <= 105);
  const nearbyPlayer = gameState.players.find((player) => player.id !== local.id && player.alive !== false && Math.hypot(player.x - local.x, player.y - local.y) <= 110);
  const nearbyBody = gameState.players.find((player) => player.alive === false && Math.hypot(player.x - local.x, player.y - local.y) <= 125);
  const nearbyVent = (gameState.map.vents ?? []).find((vent) => Math.hypot(vent.x - local.x, vent.y - local.y) <= 110);
  const nearMeetingTable = gameState.map.meetingTable && Math.hypot(gameState.map.meetingTable.x - local.x, gameState.map.meetingTable.y - local.y) <= 120;
  const isSaboteur = window.localRole === 'saboteur';
  const activeSabotage = gameState.game.sabotage;
  const canAct = local.alive !== false && !gameState.game.meeting;
  $('hudInteractBtn').disabled = (!nearbyTask && !nearbyObject) || !canAct;
  $('hudInteractBtn').classList.toggle('hidden', isSaboteur && !nearbyTask && !nearbyObject);
  $('hudKillBtn').classList.toggle('hidden', !isSaboteur);
  $('hudKillBtn').disabled = !nearbyPlayer || !canAct;
  $('hudVentBtn').classList.toggle('hidden', !isSaboteur);
  $('hudVentBtn').disabled = !nearbyVent || !canAct;
  $('hudReportBtn').classList.toggle('hidden', !nearbyBody);
  $('hudReportBtn').disabled = !nearbyBody || !canAct;
  $('hudVentBtn').textContent = local.inVent ? 'Sair' : 'Duto';
  $('hudSabotageBtn').classList.toggle('hidden', !isSaboteur);
  $('hudSabotageBtn').disabled = !canAct || Boolean(activeSabotage);
  $('hudMeetingBtn').disabled = !nearMeetingTable || !canAct;
  $('hudInteractBtn').textContent = nearbyTask ? 'Usar' : nearbyObject && activeSabotage?.objectId === nearbyObject.id && window.localRole === 'crew' ? 'Estabilizar' : nearbyObject ? 'Inspecionar' : 'Usar';
  window.nearbyActionTarget = { task: nearbyTask, object: nearbyObject, player: nearbyPlayer, body: nearbyBody, vent: nearbyVent, nearMeetingTable };
}

window.addEventListener('resize', () => {
  if (gameState) drawGame();
});
function moveLocalPlayer() {
  if (!gameState || !socket.connected) return;
  const player = gameState.players.find((entry) => entry.id === socket.id); const roomPlayer = currentRoom?.players.find((entry) => entry.id === socket.id);
  if (!player || roomPlayer?.isSpectator) return;
  const dx = (pressedKeys.has('arrowright') || pressedKeys.has('d') ? 4 : 0) - (pressedKeys.has('arrowleft') || pressedKeys.has('a') ? 4 : 0);
  const dy = (pressedKeys.has('arrowdown') || pressedKeys.has('s') ? 4 : 0) - (pressedKeys.has('arrowup') || pressedKeys.has('w') ? 4 : 0);
  if (dx || dy) socket.emit(CLIENT_EVENTS.MOVE_PLAYER, { x: player.x + dx, y: player.y + dy });
}

$('playBtn').addEventListener('click', () => showPanel('accountPanel'));
$('loginModeBtn').addEventListener('click', () => { accountMode = 'login'; $('accountForm').classList.remove('hidden'); $('submitAccountBtn').textContent = 'Entrar'; $('accountNameInput').focus(); });
$('createAccountModeBtn').addEventListener('click', () => { accountMode = 'create'; $('accountForm').classList.remove('hidden'); $('submitAccountBtn').textContent = 'Criar conta'; $('accountNameInput').focus(); });
$('backWelcomeBtn').addEventListener('click', () => showPanel('welcomePanel'));
function submitAccount() {
  const name = $('accountNameInput').value.trim().slice(0, 18);
  if (!name) {
    showMessage('Digite um nome.', true);
    $('accountNameInput').focus();
    return;
  }

  showMessage(accountMode === 'create' ? 'Criando conta...' : 'Entrando...');
  let completed = false;
  const timer = window.setTimeout(() => {
    if (!completed) showMessage('O servidor não respondeu. Reinicie iniciar-jogo.bat.', true);
  }, 8000);

  fetch('/api/account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mode: accountMode }),
  })
    .then(async (response) => {
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || 'Não foi possível continuar.');
      completed = true;
      window.clearTimeout(timer);
      finishAccount(result.name);
    })
    .catch((error) => {
      completed = true;
      window.clearTimeout(timer);
      showMessage(error.message || 'Não foi possível continuar.', true);
    });
}

function finishAccount(name) {
  accountName = name;
  $('welcomeNameLabel').textContent = `Olá, ${name}`;
  showPanel('mainMenuPanel');
}

$('submitAccountBtn').addEventListener('click', submitAccount);
$('accountNameInput').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    submitAccount();
  }
});
$('createRoomMenuBtn').addEventListener('click', () => showPanel('createRoomPanel'));
$('browseRoomsBtn').addEventListener('click', () => { showPanel('roomsPanel'); socket.emit(CLIENT_EVENTS.LIST_ROOMS); });
$('skinMenuBtn').addEventListener('click', () => { showPanel('skinPanel'); updateSkinPreview(); });
document.querySelectorAll('.back-menu-btn').forEach((button) => button.addEventListener('click', () => showPanel('mainMenuPanel')));
$('confirmCreateRoomBtn').addEventListener('click', () => socket.emit(CLIENT_EVENTS.CREATE_ROOM, { name: accountName, skin, settings: { impostorCount: Number($('impostorCountInput').value), crewCount: Number($('crewCountInput').value), botCount: Number($('botCountInput').value), allowBots: $('allowBotsInput').checked, fillBots: $('fillBotsInput').checked } }));
$('saveSkinBtn').addEventListener('click', () => { skin = { color: $('skinColor').value, hat: $('skinHat').value, outfit: $('skinOutfit').value, pet: $('skinPet').value }; socket.emit(CLIENT_EVENTS.UPDATE_SKIN, skin); showPanel('mainMenuPanel'); });
['skinColor', 'skinHat'].forEach((id) => $(id).addEventListener('change', updateSkinPreview));
$('addBotBtn').addEventListener('click', () => socket.emit(CLIENT_EVENTS.ADD_BOT, { name: `IA ${currentRoom?.players.length ?? 1}` }));
$('startGameBtn').addEventListener('click', () => socket.emit(CLIENT_EVENTS.START_GAME));
$('leaveRoomBtn').addEventListener('click', () => { socket.emit(CLIENT_EVENTS.LEAVE_ROOM); showPanel('mainMenuPanel'); });
$('leaveGameBtn').addEventListener('click', () => { socket.emit(CLIENT_EVENTS.LEAVE_ROOM); gameState = null; window.localRole = null; $('gameRoleLabel').classList.add('hidden'); showPanel('mainMenuPanel'); });
$('completeTaskBtn').addEventListener('click', () => {
  const player = gameState?.players.find((entry) => entry.id === socket.id);
  const taskId = player?.tasks?.[player.completedTasks];
  socket.emit(CLIENT_EVENTS.COMPLETE_TASK, { taskId, answer: $('taskAnswerInput').value });
  $('taskModal').classList.add('hidden');
});
$('hudInteractBtn').addEventListener('click', interactWithNearby);
$('hudKillBtn').addEventListener('click', () => { const target = window.nearbyActionTarget?.player; if (target) socket.emit(CLIENT_EVENTS.KILL_PLAYER, { targetId: target.id }); });
$('hudVentBtn').addEventListener('click', () => { const vent = window.nearbyActionTarget?.vent; if (!vent) return; socket.emit(window.localRole === 'saboteur' && !gameState.players.find((player) => player.id === socket.id)?.inVent ? CLIENT_EVENTS.ENTER_VENT : CLIENT_EVENTS.EXIT_VENT, { ventId: vent.id }); });
$('hudSabotageBtn').addEventListener('click', () => socket.emit(CLIENT_EVENTS.START_SABOTAGE, { sabotageId: 'core-surge' }));
$('hudReportBtn').addEventListener('click', () => { const body = window.nearbyActionTarget?.body; if (body) socket.emit(CLIENT_EVENTS.REPORT_BODY, { bodyId: body.id }); });
$('hudMeetingBtn').addEventListener('click', () => socket.emit(CLIENT_EVENTS.CALL_MEETING));
$('skipVoteBtn').addEventListener('click', () => socket.emit(CLIENT_EVENTS.SKIP_VOTE));
$('closeTaskBtn').addEventListener('click', () => $('taskModal').classList.add('hidden'));
$('sendChatBtn').addEventListener('click', () => { const input = $('chatInput'); if (input.value.trim()) { socket.emit(CLIENT_EVENTS.SEND_CHAT, { text: input.value }); input.value = ''; } });

document.querySelectorAll('[data-move]').forEach((button) => {
  const key = button.dataset.move;
  const start = (event) => { event.preventDefault(); pressedKeys.add(key); button.classList.add('active'); };
  const stop = (event) => { event.preventDefault(); pressedKeys.delete(key); button.classList.remove('active'); };
  button.addEventListener('pointerdown', start);
  button.addEventListener('pointerup', stop);
  button.addEventListener('pointercancel', stop);
  button.addEventListener('pointerleave', stop);
});
window.addEventListener('keydown', (event) => {
  const target = event.target;
  const isTextEntry = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable;
  if (isTextEntry) return;

  const key = event.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
    event.preventDefault();
    pressedKeys.add(key);
  }
});
window.addEventListener('keyup', (event) => {
  const target = event.target;
  const isTextEntry = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable;
  if (!isTextEntry) pressedKeys.delete(event.key.toLowerCase());
});
setInterval(moveLocalPlayer, 60);

socket.on('connect', () => { $('connectionStatus').textContent = 'Servidor conectado.'; });
socket.on('connect_error', () => { $('connectionStatus').textContent = 'Servidor indisponível. Execute iniciar-jogo.bat.'; $('connectionStatus').classList.add('error'); });
socket.on(SERVER_EVENTS.ACCOUNT_READY, ({ name }) => finishAccount(name));
socket.on(SERVER_EVENTS.ROOM_LIST, renderRooms);
socket.on(SERVER_EVENTS.ROOM_STATE, renderRoom);
socket.on(SERVER_EVENTS.LOBBY_UPDATE, renderRoom);
socket.on(SERVER_EVENTS.SERVER_ERROR, (error) => showMessage(error, true));
socket.on(SERVER_EVENTS.ROLE_ASSIGNED, ({ role }) => { window.localRole = role; const label = role === 'saboteur' ? 'Impostor' : role === 'spectator' ? 'Fantasma' : 'Tripulante'; $('roleBadge').textContent = `Papel: ${label}`; $('roleBadge').classList.remove('hidden'); setRoleDisplay(role); renderGameTargets(); });
socket.on(SERVER_EVENTS.GAME_STATE, (state) => { gameState = state; syncRoomPlayersFromGame(); showPanel('gamePanel'); $('gameCodeLabel').textContent = currentRoom?.code || '--'; $('gameStatusLabel').textContent = 'Partida iniciada — explore o Átrio Nexo.'; updateGameProgress(); drawGame(); renderGameTargets(); renderTasks(); if (window.localRole) setRoleDisplay(window.localRole); });
socket.on(SERVER_EVENTS.GAME_UPDATE, (state) => { gameState = state; syncRoomPlayersFromGame(); updateGameProgress(); drawGame(); renderGameTargets(); renderTasks(); });
socket.on(SERVER_EVENTS.CHAT_MESSAGE, ({ senderName, text }) => { const line = document.createElement('div'); line.textContent = `${senderName}: ${text}`; $('chatMessages').appendChild(line); });
socket.on(SERVER_EVENTS.MEETING_STARTED, ({ endsAt }) => {
  $('chatMessages').replaceChildren();
  $('meetingPanel').classList.remove('hidden');
  $('gameStatusLabel').textContent = 'Reunião aberta: converse, vote ou pule.';
  const timer = window.setInterval(() => {
    const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    $('meetingTimerLabel').textContent = `${remaining}s`;
    if (!remaining) window.clearInterval(timer);
  }, 250);
});
socket.on(SERVER_EVENTS.MEETING_ENDED, () => {
  $('meetingPanel').classList.add('hidden');
  $('gameStatusLabel').textContent = 'A reunião terminou.';
});
socket.on(SERVER_EVENTS.GAME_OVER, ({ reason }) => { const labels = { 'crew-tasks': 'Os inocentes concluíram todas as tarefas!', 'crew-discovery': 'Os inocentes descobriram o impostor!', 'saboteur-elimination': 'Os impostores venceram por eliminação!' }; $('gameStatusLabel').textContent = labels[reason] || 'Partida encerrada.'; $('completeTaskBtn').disabled = true; });
socket.on(SERVER_EVENTS.SABOTAGE_STARTED, (sabotage) => { $('gameStatusLabel').textContent = `ALERTA: ${sabotage.name}`; });
socket.on(SERVER_EVENTS.SABOTAGE_RESOLVED, ({ name }) => { $('gameStatusLabel').textContent = `${name} estabilizada.`; });
socket.on(SERVER_EVENTS.PLAYER_MOVED, ({ id, x, y }) => { const player = gameState?.players.find((entry) => entry.id === id); if (player) { player.x = x; player.y = y; drawGame(); } });

function updateGameProgress() {
  const game = gameState?.game;
  if (game) $('taskProgressLabel').textContent = `Tarefas: ${game.completedTasks}/${game.totalTasks}`;
  const alert = $('sabotageAlert');
  if (!game?.sabotage) { alert.classList.add('hidden'); return; }
  const remaining = Math.max(0, Math.ceil((game.sabotage.endsAt - Date.now()) / 1000));
  alert.textContent = `ALERTA · ${game.sabotage.name}: ${remaining}s · ${game.sabotage.description}`;
  alert.classList.remove('hidden');
}

setInterval(() => { if (gameState?.game?.sabotage) updateGameProgress(); }, 250);
