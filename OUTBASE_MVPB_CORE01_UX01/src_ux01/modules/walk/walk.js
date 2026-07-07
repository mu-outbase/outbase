import { app, card } from '../../ui/components.js';
import { getState, patchState } from '../../core/store.js';

let timer = null;

function elapsedText(startedAt) {
  if (!startedAt) return '00:00:00';
  const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const h = String(Math.floor(diff / 3600)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
  const s = String(diff % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function renderWalk() {
  const session = getState().walkSession;
  app().innerHTML = [
    card(`<div class="title">コタ散歩</div><p class="muted">MVPα1で動いた導線を残し、本開発ではSession/Record構造へ移す。</p>`, 'hero'),
    card(`<h2 id="walkTimer">${elapsedText(session?.startedAt)}</h2><div class="grid"><button id="startWalk" class="btn primary">散歩開始</button><button id="finishWalk" class="btn">終了して保存</button></div><button id="discardWalk" class="btn danger" style="margin-top:10px">破棄</button>`),
    card(`<h2>現地3秒記録</h2><div class="grid"><button class="btn">写真</button><button class="btn">動画</button><button class="btn">長押し音声メモ</button><button class="btn">💩/💧</button></div><p class="muted">音声は録音ではなく文字起こしメモとして扱う。</p>`)
  ].join('');
  bindWalk();
  startTimer();
}

function bindWalk() {
  document.getElementById('startWalk')?.addEventListener('click', () => {
    patchState({ walkSession: { session_id: `walk_${Date.now()}`, type: 'walk', startedAt: new Date().toISOString(), status: 'active', records: [] } });
    renderWalk();
  });
  document.getElementById('finishWalk')?.addEventListener('click', () => {
    const session = getState().walkSession;
    if (!session) return;
    patchState({ walkSession: { ...session, endedAt: new Date().toISOString(), status: 'finished' } });
    renderWalk();
  });
  document.getElementById('discardWalk')?.addEventListener('click', () => {
    patchState({ walkSession: null });
    renderWalk();
  });
}

function startTimer() {
  clearInterval(timer);
  timer = setInterval(() => {
    const el = document.getElementById('walkTimer');
    if (el) el.textContent = elapsedText(getState().walkSession?.startedAt);
  }, 1000);
}
