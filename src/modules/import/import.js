import { updateState, getState, patchState } from '../../core/store.js?v=core05-2-intuitive-ux-20260703';
import { go } from '../../core/router.js?v=core05-2-intuitive-ux-20260703';
import { extractReservationCandidate, createProjectFromCandidate, buildPracticalPrep, normalizePrepContext } from '../prep/prepEngine.js?v=core05-2-intuitive-ux-20260703';
import { escapeHtml, kv, listItems } from '../../ui/components.js?v=core05-2-intuitive-ux-20260703';

let selectedFile = null;
let selectedFileText = '';
let selectedFileDataUrl = '';

export function renderImportPanel() {
  const state = getState();
  const candidate = state.activeCandidate;
  return `<section class="card" id="reservationImportCard">
    <h2>予約情報を入れる</h2>
    <p class="muted">予約スクショ、予約メール、PDF本文、カレンダー文から次のキャンプを作ります。</p>
    <label class="label" for="sourceType">取込元</label>
    <select id="sourceType" class="field">
      <option value="screenshot">予約スクショ / 画像OCR</option>
      <option value="pdf">PDF / 予約確認書</option>
      <option value="mail">予約メール本文</option>
      <option value="calendar">カレンダー予定</option>
    </select>
    <label class="label" for="reservationFile">スクショ / PDF</label>
    <input id="reservationFile" class="field" type="file" accept="image/*,.pdf,text/plain" />
    <div class="grid" style="margin-top:8px"><button id="resetFile" class="btn">スクショ取消</button><button id="resetImport" class="btn danger">取込リセット</button></div>
    <div id="reservationPreview" class="preview">予約スクショ/PDFを選択</div>
    <label class="label" for="sourceText">本文を貼る</label>
    <textarea id="sourceText" class="field textarea" placeholder="予約メール本文、カレンダー予定、PDFからコピーした本文を貼る。OCR結果もここに入ります。"></textarea>
    <div class="grid" style="margin-top:10px"><button id="runOcr" class="btn">画像を読む</button><button id="createCandidate" class="btn primary">候補を作る</button></div>
    <div class="grid" style="margin-top:10px"><button id="approveCandidate" class="btn primary">保存する</button><button id="clearCandidate" class="btn danger">候補クリア</button></div>
    <div id="candidateStatus" class="muted" style="margin-top:10px">${candidate ? '候補あり。確認して保存できます。' : '候補なし'}</div>
    <div id="candidatePreview" class="candidate-preview">${candidate ? renderCandidate(candidate) : ''}</div>
  </section>`;
}

function renderCandidate(candidate) {
  const reservation = candidate?.payload?.reservation || {};
  const prep = candidate?.payload?.prep || {};
  return `<div class="candidate-card">
    <div class="section-heading">抽出候補 <span>${candidate.confidence || 0}%</span></div>
    ${kv('キャンプ場', reservation.campground)}${kv('日程', reservation.dateText)}${kv('泊数', reservation.nights)}${kv('チェックイン', reservation.checkIn)}${kv('チェックアウト', reservation.checkOut)}${kv('住所', reservation.address)}
    <details><summary>この候補から作る準備</summary><h3>買い物</h3>${listItems(prep.shopping)}<h3>持ち物</h3>${listItems(prep.packing)}<h3>コタ用品</h3>${listItems(prep.kota)}<h3>反省・注意</h3>${listItems(prep.reflection)}</details>
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
      status.textContent = '画像を選択。画像を読む、または本文を貼って候補を作れます。';
    } else if (selectedFile.type === 'text/plain') {
      selectedFileText = await selectedFile.text();
      textArea.value = selectedFileText;
      preview.textContent = `${selectedFile.name} を読み込み済み`;
      status.textContent = 'テキストを読み込み済み。候補を作れます。';
    } else {
      preview.textContent = `${selectedFile.name} を選択済み。PDFは本文コピーかスクショ化して読み取ります。`;
      status.textContent = 'PDFは本文を貼るかスクショOCRを使ってください。';
    }
  });

  document.getElementById('resetFile')?.addEventListener('click', () => {
    clearSelectedFile(file, preview);
    status.textContent = 'スクショ/PDFを取り消しました。本文欄は残しています。';
  });

  document.getElementById('resetImport')?.addEventListener('click', () => {
    clearSelectedFile(file, preview);
    if (textArea) textArea.value = '';
    patchState({ activeCandidate: null });
    if (candidatePreview) candidatePreview.innerHTML = '';
    status.textContent = '取込内容をリセットしました。';
  });

  document.getElementById('runOcr')?.addEventListener('click', async () => {
    if (!selectedFile || !selectedFile.type.startsWith('image/')) { status.textContent = '画像スクショを選択してください。'; return; }
    status.textContent = '画像を読み取り中。スマホでは30秒以上かかる場合があります。';
    try {
      const text = await runImageOcr(selectedFile);
      textArea.value = [textArea.value, text].filter(Boolean).join('\n');
      status.textContent = 'OCR読取完了。候補を作れます。';
    } catch (error) {
      console.warn(error);
      status.textContent = 'OCR読取に失敗。予約本文を貼ってください。';
    }
  });

  document.getElementById('createCandidate')?.addEventListener('click', () => {
    const sourceType = document.getElementById('sourceType')?.value || 'text';
    const rawText = textArea?.value?.trim() || selectedFileText || '';
    if (!rawText) { status.textContent = selectedFile ? '画像/PDF名だけでは候補化しません。画像を読むか、予約本文を貼ってください。' : '予約スクショ、メール本文、カレンダー予定のどれかを入れてください。'; return; }
    const candidate = extractReservationCandidate(rawText, sourceType, selectedFile?.name || '');
    updateState((state) => ({ activeCandidate: candidate, importCandidates: [...(state.importCandidates || []), candidate] }));
    candidatePreview.innerHTML = renderCandidate(candidate);
    status.textContent = '候補を作りました。確認して保存してください。';
    candidatePreview.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.getElementById('approveCandidate')?.addEventListener('click', () => {
    const candidate = getState().activeCandidate;
    if (!candidate) { status.textContent = '保存する候補がありません。'; return; }
    const project = createProjectFromCandidate(candidate);
    const prepContext = normalizePrepContext(getState().prepContext || {}, project.reservation || {});
    const practicalPrep = buildPracticalPrep(project, prepContext);
    const nextProject = { ...project, prep: practicalPrep, prepContext };
    patchState({ nextProject, prepContext, activeCandidate: { ...candidate, status: 'approved' } });
    status.textContent = '保存しました。準備画面へ移動します。';
    setTimeout(() => go('prep'), 650);
  });

  document.getElementById('clearCandidate')?.addEventListener('click', () => {
    patchState({ activeCandidate: null });
    if (candidatePreview) candidatePreview.innerHTML = '';
    status.textContent = '候補をクリアしました。取込内容は残しています。';
  });
}

function clearSelectedFile(file, preview) {
  selectedFile = null; selectedFileText = ''; selectedFileDataUrl = '';
  if (file) file.value = '';
  if (preview) preview.textContent = '予約スクショ/PDFを選択';
}

async function runImageOcr(file) {
  const workerSource = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  if (!window.Tesseract) await loadScript(workerSource);
  const result = await window.Tesseract.recognize(file, 'jpn+eng', { logger: (message) => {
    const status = document.getElementById('candidateStatus');
    if (status && message.status) status.textContent = `OCR: ${message.status} ${Math.round((message.progress || 0) * 100)}%`;
  }});
  return result?.data?.text || '';
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const exists = document.querySelector(`script[src="${src}"]`);
    if (exists) return resolve();
    const script = document.createElement('script');
    script.src = src; script.async = true; script.onload = resolve; script.onerror = reject;
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
