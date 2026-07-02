import { patchState, getState } from '../../core/store.js';

export function renderImportPanel() {
  return `<section class="card">
    <h2>予約情報取込</h2>
    <p class="muted">MVP固定版では、手入力ではなく取込→候補→承認を基本にする。OCR本体は次ゲートで接続する。</p>
    <input id="reservationFile" class="field" type="file" accept="image/*,.pdf" />
    <div id="reservationPreview" class="preview">予約スクショ/PDFを選択</div>
    <div class="stack" style="margin-top:10px">
      <button id="createCandidate" class="btn primary">候補化する</button>
      <button id="approveCandidate" class="btn">候補を次のキャンプに保存</button>
    </div>
    <div id="candidateStatus" class="muted" style="margin-top:10px">候補なし</div>
  </section>`;
}

function bindImportPanel() {
  const file = document.getElementById('reservationFile');
  const preview = document.getElementById('reservationPreview');
  const status = document.getElementById('candidateStatus');
  file?.addEventListener('change', () => {
    const selected = file.files?.[0];
    if (!selected) return;
    if (selected.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => { preview.innerHTML = `<img src="${reader.result}" alt="予約スクショプレビュー">`; };
      reader.readAsDataURL(selected);
    } else {
      preview.textContent = `${selected.name} を選択済み`;
    }
    status.textContent = '取込元を保存。OCR/AI候補化は次ゲートで接続。';
  });
  document.getElementById('createCandidate')?.addEventListener('click', () => {
    const selected = file?.files?.[0];
    if (!selected) {
      status.textContent = '予約スクショ/PDFを選択してください。';
      return;
    }
    const candidate = {
      candidate_id: `candidate_${Date.now()}`,
      source: selected.name,
      status: 'needs_review',
      payload: {
        title: '予約情報候補（OCR接続前）',
        note: '次ゲートでキャンプ場名・日程・泊数・チェックイン/アウト候補を抽出する'
      }
    };
    patchState({ importCandidates: [...getState().importCandidates, candidate] });
    status.textContent = '候補を作成。次ゲートではOCR/AIで内容抽出する。';
  });
  document.getElementById('approveCandidate')?.addEventListener('click', () => {
    const candidates = getState().importCandidates;
    const latest = candidates[candidates.length - 1];
    if (!latest) {
      status.textContent = '保存する候補がありません。';
      return;
    }
    patchState({ nextProject: { title: latest.payload.title, status: 'planning', sourceCandidateId: latest.candidate_id } });
    status.textContent = '次のキャンプカードへ仮保存。次ゲートで候補内容を実データ化する。';
  });
}

window.OUTBASE_IMPORT = { bind: bindImportPanel };
