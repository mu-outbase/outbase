import { updateState, getState, patchState } from '../../core/store.js';
import { go } from '../../core/router.js';
import { extractReservationCandidate, createProjectFromCandidate } from '../prep/prepEngine.js';
import { escapeHtml, kv, listItems } from '../../ui/components.js';

let selectedFile = null;
let selectedFileText = '';
let selectedFileDataUrl = '';

export function renderImportPanel() {
  const state = getState();
  const candidate = state.activeCandidate;
  return `<section class="card" id="importPanel">
    <h2>予約情報取込</h2>
    <p class="muted">手入力で予定を作る画面ではなく、予約スクショ・PDF・予約メール・カレンダー予定から候補を作る入口。</p>

    <label class="label" for="sourceType">取込元</label>
    <select id="sourceType" class="field">
      <option value="screenshot">予約スクショ / 画像OCR</option>
      <option value="pdf">PDF / 予約確認書</option>
      <option value="mail">予約メール本文</option>
      <option value="calendar">カレンダー予定</option>
    </select>

    <label class="label" for="reservationFile">スクショ / PDFを選択</label>
    <div class="file-row">
      <input id="reservationFile" class="field file-field" type="file" accept="image/*,.pdf,text/plain" />
      <button id="clearFileOnly" class="btn mini" type="button">スクショ取消</button>
    </div>
    <div id="reservationPreview" class="preview">予約スクショ/PDFを選択</div>

    <label class="label" for="sourceText">メール・カレンダー・PDF本文</label>
    <textarea id="sourceText" class="field textarea" placeholder="予約メール本文、カレンダー予定の詳細、PDFからコピーした本文を貼る。スクショOCR後はここに読取結果が入る。"></textarea>

    <div class="grid" style="margin-top:10px">
      <button id="runOcr" class="btn">画像を読み取る</button>
      <button id="createCandidate" class="btn primary">候補化する</button>
    </div>
    <div class="grid" style="margin-top:10px">
      <button id="approveCandidate" class="btn primary-soft">候補を次のキャンプに保存</button>
      <button id="clearCandidate" class="btn danger-soft">候補・取込をクリア</button>
    </div>
    <div id="candidateStatus" class="status-box ${candidate ? 'ok' : ''}">${candidate ? '候補あり。内容を確認して保存できます。' : '候補なし'}</div>
    <div id="candidatePreview" class="candidate-preview">${candidate ? renderCandidate(candidate) : ''}</div>
  </section>`;
}

function renderCandidate(candidate) {
  const reservation = candidate?.payload?.reservation || {};
  const prep = candidate?.payload?.prep || {};
  return `<div class="candidate-card" id="candidateCard">
    <div class="section-heading">抽出候補 <span>${candidate.confidence || 0}%</span></div>
    ${kv('キャンプ場', reservation.campground || '未検出')}
    ${kv('日程', reservation.dateText || '未検出')}
    ${kv('泊数', reservation.nights || '未検出')}
    ${kv('チェックイン', reservation.checkIn || '未検出')}
    ${kv('チェックアウト', reservation.checkOut || '未検出')}
    ${kv('住所', reservation.address || '未検出')}
    <details open>
      <summary>この候補から作る準備</summary>
      <h3>買い物</h3>${listItems(prep.shopping)}
      <h3>持ち物</h3>${listItems(prep.packing)}
      <h3>コタ用品</h3>${listItems(prep.kota)}
      <h3>反省・注意</h3>${listItems(prep.reflection)}
    </details>
  </div>`;
}

function bindImportPanel() {
  const file = document.getElementById('reservationFile');
  const preview = document.getElementById('reservationPreview');
  const textArea = document.getElementById('sourceText');
  const status = document.getElementById('candidateStatus');
  const candidatePreview = document.getElementById('candidatePreview');

  const setStatus = (message, ok = false) => {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('ok', ok);
  };

  const resetFileOnly = () => {
    selectedFile = null;
    selectedFileText = '';
    selectedFileDataUrl = '';
    if (file) file.value = '';
    if (preview) preview.textContent = '予約スクショ/PDFを選択';
    setStatus('スクショ/PDFを取り消しました。本文貼付けでも候補化できます。');
  };

  file?.addEventListener('change', async () => {
    selectedFile = file.files?.[0] || null;
    selectedFileText = '';
    selectedFileDataUrl = '';
    if (!selectedFile) return;
    if (selectedFile.type.startsWith('image/')) {
      selectedFileDataUrl = await readAsDataUrl(selectedFile);
      preview.innerHTML = `<img src="${selectedFileDataUrl}" alt="予約スクショプレビュー">`;
      setStatus('画像を選択。OCRするか、本文欄に文字を貼って候補化してください。');
    } else if (selectedFile.type === 'text/plain') {
      selectedFileText = await selectedFile.text();
      textArea.value = selectedFileText;
      preview.textContent = `${selectedFile.name} を読み込み済み`;
      setStatus('テキストを読み込み済み。候補化できます。');
    } else {
      preview.textContent = `${selectedFile.name} を選択済み。PDFは本文コピーかスクショ化して読み取ります。`;
      setStatus('PDFは直接本文抽出しません。予約本文を貼るかスクショOCRを使ってください。');
    }
  });

  document.getElementById('clearFileOnly')?.addEventListener('click', resetFileOnly);

  document.getElementById('runOcr')?.addEventListener('click', async () => {
    if (!selectedFile || !selectedFile.type.startsWith('image/')) {
      setStatus('画像スクショを選択してください。');
      return;
    }
    setStatus('画像を読み取り中。スマホでは30秒以上かかる場合があります。');
    try {
      const text = await runImageOcr(selectedFile);
      textArea.value = [textArea.value, text].filter(Boolean).join('\n');
      setStatus('OCR読取完了。内容を確認して候補化してください。', true);
    } catch (error) {
      console.warn(error);
      setStatus('OCR読取に失敗。予約本文を貼って候補化してください。');
    }
  });

  document.getElementById('createCandidate')?.addEventListener('click', () => {
    const candidate = buildCandidateFromForm(textArea, selectedFile);
    if (!candidate) {
      setStatus('予約スクショ、メール本文、カレンダー予定のどれかを入れてください。');
      return;
    }
    updateState((state) => ({
      activeCandidate: candidate,
      importCandidates: [...(state.importCandidates || []), candidate]
    }));
    if (candidatePreview) candidatePreview.innerHTML = renderCandidate(candidate);
    setStatus('候補化完了。下に抽出結果が出ています。確認して保存してください。', true);
    document.getElementById('candidateCard')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  document.getElementById('approveCandidate')?.addEventListener('click', () => {
    let candidate = getState().activeCandidate;
    if (!candidate) {
      candidate = buildCandidateFromForm(textArea, selectedFile);
      if (candidate) {
        updateState((state) => ({
          activeCandidate: candidate,
          importCandidates: [...(state.importCandidates || []), candidate]
        }));
      }
    }
    if (!candidate) {
      setStatus('保存する候補がありません。先に候補化してください。');
      return;
    }
    const project = createProjectFromCandidate(candidate);
    patchState({ nextProject: project, activeCandidate: { ...candidate, status: 'approved' } });
    setStatus('次のキャンプカードを作成しました。画面を更新します。', true);
    setTimeout(() => go('prep'), 120);
  });

  document.getElementById('clearCandidate')?.addEventListener('click', () => {
    selectedFile = null;
    selectedFileText = '';
    selectedFileDataUrl = '';
    patchState({ activeCandidate: null });
    if (file) file.value = '';
    if (textArea) textArea.value = '';
    if (preview) preview.textContent = '予約スクショ/PDFを選択';
    if (candidatePreview) candidatePreview.innerHTML = '';
    setStatus('候補と取込内容をクリアしました。');
  });
}

function buildCandidateFromForm(textArea, selectedFile) {
  const sourceType = document.getElementById('sourceType')?.value || 'text';
  const rawText = textArea?.value?.trim() || selectedFileText || selectedFile?.name || '';
  if (!rawText && !selectedFile) return null;
  return extractReservationCandidate(rawText, sourceType, selectedFile?.name || '');
}

async function runImageOcr(file) {
  const workerSource = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  if (!window.Tesseract) {
    await loadScript(workerSource);
  }
  const result = await window.Tesseract.recognize(file, 'jpn+eng', {
    logger: (message) => {
      const status = document.getElementById('candidateStatus');
      if (status && message.status) status.textContent = `OCR: ${message.status} ${Math.round((message.progress || 0) * 100)}%`;
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
