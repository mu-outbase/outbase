import { updateState, getState, patchState } from '../../core/store.js';
import { extractReservationCandidate, createProjectFromCandidate } from '../prep/prepEngine.js';
import { escapeHtml, kv, listItems } from '../../ui/components.js';

let selectedFile = null;
let selectedFileText = '';
let selectedFileDataUrl = '';

export function renderImportPanel() {
  const state = getState();
  const candidate = state.activeCandidate;
  return `<section class="card">
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
    <input id="reservationFile" class="field" type="file" accept="image/*,.pdf,text/plain" />
    <div id="reservationPreview" class="preview">予約スクショ/PDFを選択</div>

    <label class="label" for="sourceText">メール・カレンダー・PDF本文</label>
    <textarea id="sourceText" class="field textarea" placeholder="予約メール本文、カレンダー予定の詳細、PDFからコピーした本文を貼る。スクショOCR後はここに読取結果が入る。"></textarea>

    <div class="grid" style="margin-top:10px">
      <button id="runOcr" class="btn">画像を読み取る</button>
      <button id="createCandidate" class="btn primary">候補抽出</button>
    </div>
    <div class="grid" style="margin-top:10px">
      <button id="approveCandidate" class="btn">候補を承認して保存</button>
      <button id="clearCandidate" class="btn danger">候補クリア</button>
    </div>
    <div id="candidateStatus" class="muted" style="margin-top:10px">${candidate ? '候補あり。確認して承認できます。' : '候補なし'}</div>
    <div id="candidatePreview" class="candidate-preview">${candidate ? renderCandidate(candidate) : ''}</div>
  </section>`;
}

function renderCandidate(candidate) {
  const reservation = candidate?.payload?.reservation || {};
  const prep = candidate?.payload?.prep || {};
  return `<div class="candidate-card">
    <div class="section-heading">抽出候補 <span>${candidate.confidence || 0}%</span></div>
    ${kv('キャンプ場', reservation.campground)}
    ${kv('日程', reservation.dateText)}
    ${kv('泊数', reservation.nights)}
    ${kv('チェックイン', reservation.checkIn)}
    ${kv('チェックアウト', reservation.checkOut)}
    ${kv('住所', reservation.address)}
    <details>
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

  file?.addEventListener('change', async () => {
    selectedFile = file.files?.[0] || null;
    selectedFileText = '';
    selectedFileDataUrl = '';
    if (!selectedFile) return;
    if (selectedFile.type.startsWith('image/')) {
      selectedFileDataUrl = await readAsDataUrl(selectedFile);
      preview.innerHTML = `<img src="${selectedFileDataUrl}" alt="予約スクショプレビュー">`;
      status.textContent = '画像を選択。次に「画像を読み取る」か「候補抽出」。';
    } else if (selectedFile.type === 'text/plain') {
      selectedFileText = await selectedFile.text();
      textArea.value = selectedFileText;
      preview.textContent = `${selectedFile.name} を読み込み済み`;
      status.textContent = 'テキストを読み込み済み。候補抽出できます。';
    } else {
      preview.textContent = `${selectedFile.name} を選択済み。PDFは本文コピーかスクショ化して読み取ります。`;
      status.textContent = 'PDFはブラウザ内で直接本文抽出しません。予約本文を貼るかスクショOCRを使ってください。';
    }
  });

  document.getElementById('runOcr')?.addEventListener('click', async () => {
    if (!selectedFile || !selectedFile.type.startsWith('image/')) {
      status.textContent = '画像スクショを選択してください。';
      return;
    }
    status.textContent = '画像を読み取り中。スマホでは30秒以上かかる場合があります。';
    try {
      const text = await runImageOcr(selectedFile);
      textArea.value = [textArea.value, text].filter(Boolean).join('\\n');
      status.textContent = 'OCR読取完了。候補抽出してください。';
    } catch (error) {
      console.warn(error);
      status.textContent = 'OCR読取に失敗。予約本文を貼って候補抽出してください。';
    }
  });

  document.getElementById('createCandidate')?.addEventListener('click', () => {
    const sourceType = document.getElementById('sourceType')?.value || 'text';
    const rawText = textArea?.value?.trim() || selectedFileText || selectedFile?.name || '';
    if (!rawText && !selectedFile) {
      status.textContent = '予約スクショ、メール本文、カレンダー予定のどれかを入れてください。';
      return;
    }
    const candidate = extractReservationCandidate(rawText, sourceType, selectedFile?.name || '');
    updateState((state) => ({
      activeCandidate: candidate,
      importCandidates: [...(state.importCandidates || []), candidate]
    }));
    candidatePreview.innerHTML = renderCandidate(candidate);
    status.textContent = '候補抽出完了。内容を確認して承認してください。';
  });

  document.getElementById('approveCandidate')?.addEventListener('click', () => {
    const candidate = getState().activeCandidate;
    if (!candidate) {
      status.textContent = '承認する候補がありません。';
      return;
    }
    const project = createProjectFromCandidate(candidate);
    patchState({ nextProject: project, activeCandidate: { ...candidate, status: 'approved' } });
    status.textContent = '次のキャンプカードを作成しました。買い物・持ち物・コタ用品・反省へ接続済み。';
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
    status.textContent = '候補をクリアしました。';
  });
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
