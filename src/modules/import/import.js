import { updateState, getState, patchState } from '../../core/store.js?v=core06-05-all-pages-visual-unify-20260704';
import { go } from '../../core/router.js?v=core06-05-all-pages-visual-unify-20260704';
import { extractReservationCandidate, createProjectFromCandidate, buildPracticalPrep, normalizePrepContext } from '../prep/prepEngine.js?v=core06-05-all-pages-visual-unify-20260704';
import { escapeHtml, toast } from '../../ui/components.js?v=core06-05-all-pages-visual-unify-20260704';

let selectedFile = null;
let selectedFileText = '';
let selectedFileDataUrl = '';

export function renderImportPanel() {
  const state = getState();
  const candidate = state.activeCandidate;
  return `<section class="card import-card focus premium-card">
    <div class="premium-card-head"><span>予約取込</span><strong>スクショ・PDF・メールから予定を作る</strong></div>
    <div class="import-grid premium-form">
      <select id="sourceType" class="field"><option value="screenshot">スクショ</option><option value="pdf">PDF</option><option value="mail">メール</option><option value="calendar">カレンダー</option></select>
      <input id="reservationFile" class="field" type="file" accept="image/*,.pdf,text/plain" />
      <div id="reservationPreview" class="import-preview premium-preview">スクショ / PDF</div>
      <textarea id="sourceText" class="field textarea" placeholder="予約メールやカレンダー本文を貼る"></textarea>
      <div class="compact-actions"><button id="runOcr" class="btn">読む</button><button id="createCandidate" class="btn primary">候補を作る</button></div>
      <button id="approveCandidate" class="btn primary wide">保存して準備へ</button>
      <div class="mini-row"><button id="resetFile" class="link-button">ファイル取消</button><button id="clearCandidate" class="link-button danger-text">候補クリア</button></div>
      <div id="candidateStatus" class="muted">${candidate ? '候補あり' : '未作成'}</div>
      <div id="candidatePreview">${candidate ? renderCandidate(candidate) : ''}</div>
    </div>
  </section>`;
}

function renderCandidate(candidate) {
  const r = candidate?.payload?.reservation || {};
  return `<div class="history-card premium-row"><strong>${escapeHtml(r.campground || 'キャンプ場未確定')}</strong><span>${escapeHtml([r.dateText, r.checkIn && `IN ${r.checkIn}`, r.checkOut && `OUT ${r.checkOut}`].filter(Boolean).join(' / ') || '日程未確定')}</span><span class="chip">${candidate.confidence || 0}%</span></div>`;
}

function bindImportPanel() {
  const file = document.getElementById('reservationFile');
  const preview = document.getElementById('reservationPreview');
  const textArea = document.getElementById('sourceText');
  const status = document.getElementById('candidateStatus');
  const candidatePreview = document.getElementById('candidatePreview');

  file?.addEventListener('change', async () => {
    selectedFile = file.files?.[0] || null;
    selectedFileText = '';
    selectedFileDataUrl = '';
    if (!selectedFile) return;
    if (selectedFile.type.startsWith('image/')) {
      selectedFileDataUrl = await readAsDataUrl(selectedFile);
      preview.innerHTML = `<img src="${selectedFileDataUrl}" alt="予約スクショ">`;
      status.textContent = 'スクショを選択。読むか本文貼付けで候補作成。';
    } else if (selectedFile.type === 'text/plain') {
      selectedFileText = await selectedFile.text();
      textArea.value = selectedFileText;
      preview.textContent = selectedFile.name;
      status.textContent = 'テキスト読込済み。候補を作れます。';
    } else {
      preview.textContent = selectedFile.name;
      status.textContent = 'PDFは本文を貼るか、スクショを読み取ります。';
    }
  });

  document.getElementById('resetFile')?.addEventListener('click', () => { clearSelectedFile(file, preview); status.textContent = 'ファイルを取り消しました。'; });
  document.getElementById('runOcr')?.addEventListener('click', async () => {
    if (!selectedFile || !selectedFile.type.startsWith('image/')) return toast('画像を選んでください');
    status.textContent = '読み取り中…';
    try { const text = await runImageOcr(selectedFile); textArea.value = [textArea.value, text].filter(Boolean).join('\n'); status.textContent = '読取完了。候補を作れます。'; toast('読み取りました'); }
    catch (error) { console.warn(error); status.textContent = '読取失敗。本文を貼ってください。'; toast('読取に失敗'); }
  });
  document.getElementById('createCandidate')?.addEventListener('click', () => {
    const sourceType = document.getElementById('sourceType')?.value || 'text';
    const rawText = textArea?.value?.trim() || selectedFileText || '';
    if (!rawText) return toast('本文を入れてください');
    const candidate = extractReservationCandidate(rawText, sourceType, selectedFile?.name || '');
    updateState((state) => ({ activeCandidate: candidate, importCandidates: [...(state.importCandidates || []), candidate] }));
    candidatePreview.innerHTML = renderCandidate(candidate);
    status.textContent = '候補を作りました。';
    toast('候補を作りました');
  });
  document.getElementById('approveCandidate')?.addEventListener('click', () => {
    const candidate = getState().activeCandidate;
    if (!candidate) return toast('候補がありません');
    const project = createProjectFromCandidate(candidate);
    const prepContext = normalizePrepContext(getState().prepContext || {}, project.reservation || {});
    const practicalPrep = buildPracticalPrep(project, prepContext);
    patchState({ nextProject: { ...project, prep: practicalPrep, prepContext }, prepContext, activeCandidate: { ...candidate, status: 'approved' } });
    toast('保存しました');
    setTimeout(() => go('prep'), 500);
  });
  document.getElementById('clearCandidate')?.addEventListener('click', () => { patchState({ activeCandidate: null }); if (candidatePreview) candidatePreview.innerHTML = ''; status.textContent = '候補をクリアしました。'; });
}

function clearSelectedFile(file, preview) { selectedFile = null; selectedFileText = ''; selectedFileDataUrl = ''; if (file) file.value = ''; if (preview) preview.textContent = 'スクショ / PDF'; }
async function runImageOcr(file) { const workerSource = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'; if (!window.Tesseract) await loadScript(workerSource); const result = await window.Tesseract.recognize(file, 'jpn+eng'); return result?.data?.text || ''; }
function loadScript(src) { return new Promise((resolve, reject) => { const exists = document.querySelector(`script[src="${src}"]`); if (exists) return resolve(); const script = document.createElement('script'); script.src = src; script.async = true; script.onload = resolve; script.onerror = reject; document.head.appendChild(script); }); }
function readAsDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }

window.OUTBASE_IMPORT = { bind: bindImportPanel };
