import { updateState, getState, patchState } from '../../core/store.js?v=core05-3-visual-ux-20260703';
import { go } from '../../core/router.js?v=core05-3-visual-ux-20260703';
import { extractReservationCandidate, createProjectFromCandidate, buildPracticalPrep, normalizePrepContext } from '../prep/prepEngine.js?v=core05-3-visual-ux-20260703';
import { escapeHtml, kv, listItems } from '../../ui/components.js?v=core05-3-visual-ux-20260703';

let selectedFile = null;
let selectedFileText = '';
let selectedFileDataUrl = '';

export function renderImportPanel() {
  const state = getState();
  const candidate = state.activeCandidate;
  return `<section class="card import-card" id="reservationImportCard">
    <div class="compact-row top-align"><div><p class="eyebrow">IMPORT</p><h2>予約を入れる</h2></div><span class="mini-badge">screenshot / mail</span></div>

    <div class="import-drop">
      <input id="reservationFile" class="field file-field" type="file" accept="image/*,.pdf,text/plain" />
      <div id="reservationPreview" class="preview compact-preview">スクショ / PDF</div>
    </div>

    <textarea id="sourceText" class="field textarea import-text" placeholder="予約メール・カレンダー本文を貼る"></textarea>

    <div class="action-row">
      <button id="runOcr" class="btn">読む</button>
      <button id="createCandidate" class="btn primary">候補化</button>
      <button id="approveCandidate" class="btn primary">保存</button>
    </div>

    <div class="import-subrow">
      <select id="sourceType" class="field mini-select"><option value="screenshot">画像</option><option value="pdf">PDF</option><option value="mail">メール</option><option value="calendar">カレンダー</option></select>
      <button id="resetFile" class="link-button">取消</button>
      <button id="resetImport" class="link-button danger-text">リセット</button>
    </div>

    <div id="candidateStatus" class="muted mini-status">${candidate ? '候補あり' : '未取込'}</div>
    <div id="candidatePreview" class="candidate-preview">${candidate ? renderCandidate(candidate) : ''}</div>
  </section>`;
}

function renderCandidate(candidate) {
  const reservation = candidate?.payload?.reservation || {};
  const prep = candidate?.payload?.prep || {};
  return `<details class="quiet-details candidate-fold" open>
    <summary>候補 ${candidate.confidence || 0}%</summary>
    <div class="candidate-card clean">
      ${kv('キャンプ場', reservation.campground)}
      ${kv('日程', reservation.dateText)}
      ${kv('IN', reservation.checkIn)}
      ${kv('OUT', reservation.checkOut)}
      <details><summary>準備候補</summary><h3>買い物</h3>${listItems(prep.shopping)}<h3>持ち物</h3>${listItems(prep.packing)}<h3>コタ</h3>${listItems(prep.kota)}<h3>注意</h3>${listItems(prep.reflection)}</details>
    </div>
  </details>`;
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
      preview.innerHTML = `<img src="${selectedFileDataUrl}" alt="予約スクショプレビュー">`;
      status.textContent = '画像選択済み';
    } else if (selectedFile.type === 'text/plain') {
      selectedFileText = await selectedFile.text();
      textArea.value = selectedFileText;
      preview.textContent = selectedFile.name;
      status.textContent = 'テキスト読込済み';
    } else {
      preview.textContent = selectedFile.name;
      status.textContent = 'PDFは本文貼付けか画像読取';
    }
  });

  document.getElementById('resetFile')?.addEventListener('click', () => {
    clearSelectedFile(file, preview);
    status.textContent = 'ファイル取消';
  });

  document.getElementById('resetImport')?.addEventListener('click', () => {
    clearSelectedFile(file, preview);
    if (textArea) textArea.value = '';
    patchState({ activeCandidate: null });
    if (candidatePreview) candidatePreview.innerHTML = '';
    status.textContent = 'リセット済み';
  });

  document.getElementById('runOcr')?.addEventListener('click', async () => {
    if (!selectedFile || !selectedFile.type.startsWith('image/')) {
      status.textContent = '画像を選択';
      return;
    }
    status.textContent = '読取中…';
    try {
      const text = await runImageOcr(selectedFile);
      textArea.value = [textArea.value, text].filter(Boolean).join('\n');
      status.textContent = '読取完了';
    } catch (error) {
      console.warn(error);
      status.textContent = '読取失敗。本文貼付けで候補化';
    }
  });

  document.getElementById('createCandidate')?.addEventListener('click', () => {
    const sourceType = document.getElementById('sourceType')?.value || 'text';
    const rawText = textArea?.value?.trim() || selectedFileText || '';
    if (!rawText) {
      status.textContent = selectedFile ? '本文が必要' : '予約情報を入れる';
      return;
    }
    const candidate = extractReservationCandidate(rawText, sourceType, selectedFile?.name || '');
    updateState((state) => ({ activeCandidate: candidate, importCandidates: [...(state.importCandidates || []), candidate] }));
    candidatePreview.innerHTML = renderCandidate(candidate);
    status.textContent = '候補化完了';
    candidatePreview.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.getElementById('approveCandidate')?.addEventListener('click', () => {
    const candidate = getState().activeCandidate;
    if (!candidate) {
      status.textContent = '候補なし';
      return;
    }
    const project = createProjectFromCandidate(candidate);
    const prepContext = normalizePrepContext(getState().prepContext || {}, project.reservation || {});
    const practicalPrep = buildPracticalPrep(project, prepContext);
    const nextProject = { ...project, prep: practicalPrep, prepContext };
    patchState({ nextProject, prepContext, activeCandidate: { ...candidate, status: 'approved' } });
    status.textContent = '保存しました';
    setTimeout(() => go('prep'), 450);
  });
}

function clearSelectedFile(file, preview) {
  selectedFile = null;
  selectedFileText = '';
  selectedFileDataUrl = '';
  if (file) file.value = '';
  if (preview) preview.textContent = 'スクショ / PDF';
}

async function runImageOcr(file) {
  const workerSource = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  if (!window.Tesseract) await loadScript(workerSource);
  const result = await window.Tesseract.recognize(file, 'jpn+eng', {
    logger: (message) => {
      const status = document.getElementById('candidateStatus');
      if (status && message.status) status.textContent = `OCR ${Math.round((message.progress || 0) * 100)}%`;
    }
  });
  return result?.data?.text || '';
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const exists = document.querySelector(`script[src="${src}"]`);
    if (exists) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

window.OUTBASE_IMPORT = { bind: bindImportPanel };
