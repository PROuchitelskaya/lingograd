// WebSocket-клиент: автопереподключение и восстановление состояния (ТЗ §41, §51).
// Игрок, у которого пропал вайфай, возвращается в свою команду с её счётом.

const listeners = new Map();
let ws = null;
let hello = null;
let retry = 0;
let reconnectTimer = null;
let manualClose = false;
let timeOffset = 0;           // серверное время минус локальное
let status = 'idle';

export function on(type, fn) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(fn);
  return () => listeners.get(type).delete(fn);
}

function emit(type, data) {
  for (const fn of listeners.get(type) || []) {
    try { fn(data); } catch (e) { console.error('[net]', type, e); }
  }
  for (const fn of listeners.get('*') || []) {
    try { fn({ type, data }); } catch { /* noop */ }
  }
}

export function getStatus() { return status; }

function setStatus(next) {
  if (status === next) return;
  status = next;
  emit('status', next);
}

export function serverNow() {
  return Date.now() + timeOffset;
}

export function connect(params) {
  hello = { t: 'hello', ...params };
  manualClose = false;
  open();
}

function open() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  setStatus(retry ? 'reconnecting' : 'connecting');
  try {
    ws = new WebSocket(`${proto}://${location.host}/ws`);
  } catch {
    return scheduleReconnect();
  }

  ws.addEventListener('open', () => {
    retry = 0;
    ws.send(JSON.stringify(hello));
    setStatus('connected');
    ping();
  });

  ws.addEventListener('message', (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }

    if (msg.t === 'pong' && msg.now) {
      timeOffset = msg.now - Date.now();
      return;
    }
    if (msg.t === 'state' || msg.t === 'tick') {
      if (msg.now) timeOffset = msg.now - Date.now();
    }
    if (msg.t === 'welcome' && msg.player_id) {
      hello.player_id = msg.player_id;   // при реконнекте вернёмся тем же игроком
    }
    emit(msg.t, msg);
  });

  ws.addEventListener('close', () => {
    if (manualClose) return setStatus('closed');
    scheduleReconnect();
  });

  ws.addEventListener('error', () => { /* обработается в close */ });
}

function scheduleReconnect() {
  setStatus('reconnecting');
  if (reconnectTimer) return;
  retry++;
  const delay = Math.min(600 * retry, 4000);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    open();
  }, delay);
}

function ping() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  send({ t: 'ping' });
  setTimeout(ping, 15000);
}

export function send(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
    return true;
  }
  return false;
}

export function sync() { send({ t: 'sync' }); }

export function close() {
  manualClose = true;
  if (ws) ws.close();
}

export function setName(name) {
  if (hello) hello.name = name;
}

// Вкладка вернулась из фона — тут же просим свежее состояние.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (!ws || ws.readyState !== WebSocket.OPEN) open();
    else sync();
  }
});
