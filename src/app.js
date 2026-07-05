
'use strict';

const BUILD_ID = "core08-f1-full-mode-experience-20260705";
const MODES = [
  {
    "id": "M01",
    "name": "予定モード",
    "フェーズ": "探す/予定",
    "分類": "予定",
    "役割": "次に行くキャンプと複数予定を管理する。準備対象を間違えないための起点。",
    "開始条件": "予定作成/予約入力/カレンダー日付タップ",
    "最初に出す情報": "次回予定カード、日程、場所、チェックイン/アウト、同行者、準備状況",
    "主要ボタン": "準備へ、予約確認、予定切替、削除ではなく保留",
    "自動で拾う情報": "作成日時、更新履歴、関連準備ID",
    "連携データ": "予約情報、準備、ルート、料理、ギア、コタ、天気",
    "完了条件": "予定確定/保留/キャンセル",
    "思い出へ残す": "準備対象ID、当日運転席の元データ",
    "次回改善へ戻す": "次回候補、予定重複・予定上書き防止",
    "UIルール": "日付と予定名を大きく。複数予定は選択中を固定表示。",
    "保護ルール": "予定・準備・記録を勝手に統合/上書きしない。"
  },
  {
    "id": "M02",
    "name": "探すモード",
    "フェーズ": "探す/予定",
    "分類": "候補",
    "役割": "犬可・温水・景色・距離など、行きたいキャンプ場候補を探して予定候補化する。",
    "開始条件": "探すタブ/候補登録",
    "最初に出す情報": "候補カード、犬可、ドッグフリー、温水、景色、距離、季節条件",
    "主要ボタン": "候補保存、比較、予定化、却下",
    "自動で拾う情報": "検索条件、比較メモ、候補評価",
    "連携データ": "予定、過去レビュー、コタ条件、季節、天気傾向",
    "完了条件": "候補保存/予定化/却下",
    "思い出へ残す": "候補DB、予定候補",
    "次回改善へ戻す": "次回行きたいリスト、候補比較軸",
    "UIルール": "検索画面を大きくしすぎない。候補カードは要点だけ。",
    "保護ルール": "候補は予定に勝手に変換しない。"
  },
  {
    "id": "M03",
    "name": "予約情報取込モード",
    "フェーズ": "探す/予定",
    "分類": "予定",
    "役割": "予約メール/スクショ/手入力から予定情報を候補として取り込む。",
    "開始条件": "予約情報貼付/写真/メール転記",
    "最初に出す情報": "候補抽出結果、日程、場所、金額、サイト、チェックイン/アウト",
    "主要ボタン": "採用、修正、未確認、予定へ反映",
    "自動で拾う情報": "入力元、抽出候補、信頼度",
    "連携データ": "予定、準備、当日運転席",
    "完了条件": "ユーザー確認後に反映",
    "思い出へ残す": "予約情報候補、予定更新履歴",
    "次回改善へ戻す": "予約ミス防止",
    "UIルール": "抽出結果は必ず確認カードにする。",
    "保護ルール": "AIが勝手に予定を更新しない。"
  },
  {
    "id": "M04",
    "name": "準備モード",
    "フェーズ": "準備",
    "分類": "準備",
    "役割": "行く前に決める場所。買う/持つ/食べる/コタ/ギア/ルート/天気を予定ごとに持つ。",
    "開始条件": "準備タブ/予定選択",
    "最初に出す情報": "選択中予定、準備進捗、買う/持つ/食べる/コタ/ルート",
    "主要ボタン": "買物、料理、ギア、ルート、天気、当日積込",
    "自動で拾う情報": "更新時刻、完了率、未決定",
    "連携データ": "予定、買物、料理、ギア、コタ、天気、当日",
    "完了条件": "準備完了/一部保留",
    "思い出へ残す": "当日運転席へ渡す準備データ",
    "次回改善へ戻す": "未準備・忘れ物候補",
    "UIルール": "1予定前提にしない。選択中予定を常時表示。",
    "保護ルール": "別予定の準備を上書きしない。"
  },
  {
    "id": "M05",
    "name": "買い物モード",
    "フェーズ": "準備",
    "分類": "準備",
    "役割": "詳細買物リストを作る。品名だけでなく量・代替品・不要品・LINEコピペを持つ。",
    "開始条件": "準備→買物",
    "最初に出す情報": "食材/調味料/消耗品/代替品/買わなくて良い物",
    "主要ボタン": "追加、購入済み、代替、LINEコピー、当日買う",
    "自動で拾う情報": "購入チェック、代替理由、未購入",
    "連携データ": "料理、人数、泊数、友人、コタ、天気",
    "完了条件": "買物完了/当日買うへ移動",
    "思い出へ残す": "買物リスト、当日買出し候補",
    "次回改善へ戻す": "余った/不足した食材を次回量へ反映",
    "UIルール": "カテゴリは少なく、買う順で見せる。LINE用は一発コピー。",
    "保護ルール": "購入済みを削除せず履歴化。"
  },
  {
    "id": "M06",
    "name": "料理計画モード",
    "フェーズ": "準備",
    "分類": "準備",
    "役割": "1日目/2日目の朝昼晩、量、設営/撤収時間、友人有無を考慮する。",
    "開始条件": "準備→料理",
    "最初に出す情報": "泊数別の朝昼晩、予定メニュー、量、調理タイミング",
    "主要ボタン": "メニュー追加、買物へ送る、量調整、バケット不要等判断",
    "自動で拾う情報": "選択メニュー、人数、量、食材",
    "連携データ": "買物、当日料理、思い出、次回改善",
    "完了条件": "献立確定/保留",
    "思い出へ残す": "料理予定、買物素材",
    "次回改善へ戻す": "量が多い/少ない、次回メニュー候補",
    "UIルール": "一画面に全日程を詰めない。日別カード。",
    "保護ルール": "料理予定を勝手に買物へ確定しない。"
  },
  {
    "id": "M07",
    "name": "ギア準備モード",
    "フェーズ": "準備",
    "分類": "準備",
    "役割": "持参/積載/使った/使わなかった/濡れ物/乾燥をつなげる。",
    "開始条件": "準備→ギア",
    "最初に出す情報": "持参候補、必須、任意、積載、忘れ物注意",
    "主要ボタン": "持つ、不要、積載済み、当日積込、メモ",
    "自動で拾う情報": "チェック、積載時刻、使用予定",
    "連携データ": "ギアDB、当日設営/撤収、次回改善",
    "完了条件": "積載完了/未積載",
    "思い出へ残す": "持参リスト、当日積込、撤収チェック",
    "次回改善へ戻す": "使わなかった/忘れた/濡れ物を次回へ",
    "UIルール": "カテゴリはテント/寝具/料理/コタ/電源など。",
    "保護ルール": "ギア台帳を勝手に削除しない。"
  },
  {
    "id": "M08",
    "name": "ルート・経由地モード",
    "フェーズ": "準備",
    "分類": "準備",
    "役割": "Google Maps前提で出発時間、経由地、買出し、給油、休憩を管理する。",
    "開始条件": "準備→ルート",
    "最初に出す情報": "出発予定、目的地、経由地、買出し、給油、休憩",
    "主要ボタン": "Google Mapsで開く、経由地追加、給油、買出し",
    "自動で拾う情報": "Maps起動時刻、戻り時刻、位置差分",
    "連携データ": "当日運転席、往路/帰路ドライブ",
    "完了条件": "ルート確定/保留",
    "思い出へ残す": "当日ドライブ候補",
    "次回改善へ戻す": "寄り道/渋滞/休憩を次回へ",
    "UIルール": "OUTBASEはナビしない。Google Mapsを開く。",
    "保護ルール": "運転中操作を求めない。"
  },
  {
    "id": "M09",
    "name": "コタ準備モード",
    "フェーズ": "準備",
    "分類": "準備",
    "役割": "コタ用品と散歩・暑さ寒さ・足元・水・休憩・寝床を準備する。",
    "開始条件": "準備→コタ",
    "最初に出す情報": "コタ用品、散歩予定、暑さ/寒さ、足元、休憩、水",
    "主要ボタン": "持つ、当日注意、散歩候補、メモ",
    "自動で拾う情報": "準備チェック、注意メモ",
    "連携データ": "当日、散歩、場内探索、撤収",
    "完了条件": "コタ準備完了",
    "思い出へ残す": "コタ持参/注意リスト",
    "次回改善へ戻す": "足元/暑さ/休憩を次回へ",
    "UIルール": "ペット情報は目立ちすぎず必要時に出す。",
    "保護ルール": "コタ情報を勝手に公開/削除しない。"
  },
  {
    "id": "M10",
    "name": "当日運転席モード",
    "フェーズ": "当日",
    "分類": "当日",
    "役割": "今日やることの運転席。記録ボタン置き場ではない。",
    "開始条件": "予定日/当日タブ/＋から当日開始",
    "最初に出す情報": "今の状態、次にやること、出発時間、経由地、チェックイン、設営順、料理、天気風、コタ散歩、撤収、帰り予定",
    "主要ボタン": "次へ、記録、Maps、メモ、あとで",
    "自動で拾う情報": "時刻差分、位置、天気更新、未確認候補",
    "連携データ": "準備、ルート、料理、ギア、コタ、天気、記録",
    "完了条件": "1日の流れ完了/帰宅後へ",
    "思い出へ残す": "時系列ログ、未確認箱",
    "次回改善へ戻す": "遅れ、忘れ物、段取り改善",
    "UIルール": "次に押すボタンを1つ大きく。全部並べない。",
    "保護ルール": "当日推定を勝手に確定しない。"
  },
  {
    "id": "M11",
    "name": "出発前モード",
    "フェーズ": "当日",
    "分類": "当日",
    "役割": "起床、朝食、積込、給油、出発準備を扱う。",
    "開始条件": "当日運転席の出発前/朝",
    "最初に出す情報": "起床予定、朝食、当日積込、給油、出発予定、天気",
    "主要ボタン": "積込済み、給油済み、出発、メモ",
    "自動で拾う情報": "時刻、GPS、自宅出発推定",
    "連携データ": "準備、ギア、買物、ルート",
    "完了条件": "出発完了",
    "思い出へ残す": "出発ログ、遅れ候補",
    "次回改善へ戻す": "積込忘れ、出発時間改善",
    "UIルール": "朝はチェックだけ。入力を増やさない。",
    "保護ルール": "積込チェックを勝手に完了しない。"
  },
  {
    "id": "M12",
    "name": "往路ドライブモード",
    "フェーズ": "当日",
    "分類": "移動",
    "役割": "往路移動をGoogle Maps中心で扱う。運転中操作させない。",
    "開始条件": "出発/Maps起動",
    "最初に出す情報": "目的地、経由地、到着予定、買出し/給油/休憩候補",
    "主要ボタン": "Google Mapsで開く、休憩、給油、買出し、到着",
    "自動で拾う情報": "Maps起動/復帰、GPS、時刻、停車候補",
    "連携データ": "ルート、買物、コタ、当日",
    "完了条件": "到着/受付へ",
    "思い出へ残す": "往路ログ、寄り道候補",
    "次回改善へ戻す": "出発時間、休憩場所、買出し改善",
    "UIルール": "画面は最小。大ボタンはMaps。",
    "保護ルール": "運転中に確認操作を求めない。"
  },
  {
    "id": "M13",
    "name": "寄り道・買出し・給油モード",
    "フェーズ": "当日",
    "分類": "移動",
    "役割": "ドライブ中の買出し・給油・休憩を候補化する。",
    "開始条件": "停車/GPS/手動",
    "最初に出す情報": "現在地、目的、買う物、給油/休憩/コタ休憩",
    "主要ボタン": "買出し、給油、休憩、コタ休憩、メモ",
    "自動で拾う情報": "停車時間、場所、写真/メモ",
    "連携データ": "買物、ルート、コタ",
    "完了条件": "再出発/完了",
    "思い出へ残す": "寄り道ログ、未購入更新",
    "次回改善へ戻す": "買い忘れ、寄り道便利度",
    "UIルール": "運転中ではなく停車中だけ表示。",
    "保護ルール": "推定寄り道は未確認へ。"
  },
  {
    "id": "M14",
    "name": "到着・受付モード",
    "フェーズ": "当日",
    "分類": "当日",
    "役割": "到着、受付、サイト移動、注意事項を扱う。",
    "開始条件": "キャンプ場付近到着/手動",
    "最初に出す情報": "到着時刻、チェックイン差分、受付、サイト、注意事項",
    "主要ボタン": "到着、受付済み、サイトへ、注意メモ",
    "自動で拾う情報": "GPS、到着時刻、写真",
    "連携データ": "予定、キャンプ場DB、当日",
    "完了条件": "サイト移動へ",
    "思い出へ残す": "到着/受付ログ",
    "次回改善へ戻す": "受付待ち、案内事項、チェックイン改善",
    "UIルール": "迷わず次に進む導線。",
    "保護ルール": "到着推定は未確認へ。"
  },
  {
    "id": "M15",
    "name": "サイト移動モード",
    "フェーズ": "当日",
    "分類": "当日",
    "役割": "受付後、サイトまでの移動とサイト情報を残す。",
    "開始条件": "受付済み/サイトへ",
    "最初に出す情報": "サイト番号、移動、地面、傾斜、近隣、景色",
    "主要ボタン": "サイト到着、写真、メモ、レイアウトへ",
    "自動で拾う情報": "位置、写真、時刻",
    "連携データ": "キャンプ場DB、場内探索、設営",
    "完了条件": "レイアウト検討へ",
    "思い出へ残す": "サイトカード素材",
    "次回改善へ戻す": "次回サイト選び",
    "UIルール": "サイトカード化を意識した表示。",
    "保護ルール": "サイト情報を勝手に公開しない。"
  },
  {
    "id": "M16",
    "name": "レイアウト検討モード",
    "フェーズ": "設営",
    "分類": "設営",
    "役割": "テント/タープ/車/動線/コタの位置を検討する。",
    "開始条件": "サイト到着/設営前",
    "最初に出す情報": "サイト写真、方角、地面、風、動線、コタ位置",
    "主要ボタン": "写真、メモ、決定、設営開始",
    "自動で拾う情報": "写真、方角メモ、風、地面",
    "連携データ": "天気、ギア、設営",
    "完了条件": "レイアウト決定",
    "思い出へ残す": "レイアウト候補、設営ログ",
    "次回改善へ戻す": "次回配置メモ",
    "UIルール": "写真大きめ、メモ短く。",
    "保護ルール": "レイアウト候補を勝手に確定しない。"
  },
  {
    "id": "M17",
    "name": "設営モード",
    "フェーズ": "設営",
    "分類": "設営",
    "役割": "設営全体の親モード。テント/タープ/寝室/リビング/外回りを工程化。",
    "開始条件": "レイアウト決定/手動",
    "最初に出す情報": "設営開始時刻、工程、天気風、休憩、進捗",
    "主要ボタン": "開始、工程切替、写真、声、メモ、完了",
    "自動で拾う情報": "タイマー、写真、GPS、時刻",
    "連携データ": "ギア、天気、コタ、思い出",
    "完了条件": "設営完了",
    "思い出へ残す": "設営時間、工程ログ",
    "次回改善へ戻す": "段取り、ギア不足、風対策",
    "UIルール": "工程はタブではなく次工程カード。",
    "保護ルール": "完了ミスは復旧可能。"
  },
  {
    "id": "M18",
    "name": "テント設営モード",
    "フェーズ": "設営",
    "分類": "設営",
    "役割": "テント設営工程を記録する。",
    "開始条件": "設営→テント",
    "最初に出す情報": "使用テント、向き、ペグ、風、地面",
    "主要ボタン": "開始、写真、注意、完了",
    "自動で拾う情報": "時刻、写真、メモ",
    "連携データ": "ギア、天気",
    "完了条件": "工程完了",
    "思い出へ残す": "テント設営ログ",
    "次回改善へ戻す": "次回向き/ペグ/地面対策",
    "UIルール": "工程の詳細は折りたたむ。",
    "保護ルール": "注意を消さない。"
  },
  {
    "id": "M19",
    "name": "タープ設営モード",
    "フェーズ": "設営",
    "分類": "設営",
    "役割": "タープ設営工程を記録する。",
    "開始条件": "設営→タープ",
    "最初に出す情報": "タープ種、張り方向、風、雨、影",
    "主要ボタン": "開始、写真、注意、完了",
    "自動で拾う情報": "時刻、写真、メモ",
    "連携データ": "ギア、天気",
    "完了条件": "工程完了",
    "思い出へ残す": "タープログ",
    "次回改善へ戻す": "風対策/張り方改善",
    "UIルール": "写真を主役。",
    "保護ルール": "未確認メモ保持。"
  },
  {
    "id": "M20",
    "name": "寝室準備モード",
    "フェーズ": "設営",
    "分類": "設営",
    "役割": "寝室、寝具、ライト、寒暖、コタ寝床を準備する。",
    "開始条件": "設営→寝室",
    "最初に出す情報": "寝具、マット、ライト、温度、コタ寝床",
    "主要ボタン": "完了、写真、寒い/暑い、メモ",
    "自動で拾う情報": "時刻、写真、メモ",
    "連携データ": "ギア、コタ、天気、就寝",
    "完了条件": "寝室完了",
    "思い出へ残す": "寝室準備ログ",
    "次回改善へ戻す": "寝具/ライト/温度改善",
    "UIルール": "シンプルなチェック。",
    "保護ルール": "寝具設定を勝手に変更しない。"
  },
  {
    "id": "M21",
    "name": "リビング準備モード",
    "フェーズ": "設営",
    "分類": "設営",
    "役割": "タープ下/リビング、テーブル、チェア、キッチンを整える。",
    "開始条件": "設営→リビング",
    "最初に出す情報": "テーブル、チェア、IGT、キッチン、導線",
    "主要ボタン": "完了、写真、使いにくい、メモ",
    "自動で拾う情報": "時刻、写真、メモ",
    "連携データ": "ギア、料理",
    "完了条件": "リビング完了",
    "思い出へ残す": "リビング配置ログ",
    "次回改善へ戻す": "次回配置改善",
    "UIルール": "配置写真を残しやすく。",
    "保護ルール": "写真/配置は公開候補にしない。"
  },
  {
    "id": "M22",
    "name": "外回り準備モード",
    "フェーズ": "設営",
    "分類": "設営",
    "役割": "車周り、ロープ、ゴミ、電源、外灯などを整える。",
    "開始条件": "設営→外回り",
    "最初に出す情報": "車、ロープ、ゴミ、電源、灯り、風雨対策",
    "主要ボタン": "完了、注意、写真、メモ",
    "自動で拾う情報": "時刻、写真、メモ",
    "連携データ": "ギア、天気、撤収",
    "完了条件": "外回り完了",
    "思い出へ残す": "外回りログ",
    "次回改善へ戻す": "忘れ物/安全改善",
    "UIルール": "注意項目だけ目立たせる。",
    "保護ルール": "危険メモは消さない。"
  },
  {
    "id": "M23",
    "name": "休憩モード",
    "フェーズ": "滞在",
    "分類": "滞在",
    "役割": "設営中/移動中/滞在中の休憩を記録する。",
    "開始条件": "手動/長時間停止",
    "最初に出す情報": "休憩開始、場所、コタ、水分、天気",
    "主要ボタン": "写真、メモ、再開",
    "自動で拾う情報": "時刻、場所、気温",
    "連携データ": "コタ、天気、当日",
    "完了条件": "再開",
    "思い出へ残す": "休憩ログ",
    "次回改善へ戻す": "次回休憩タイミング",
    "UIルール": "小さく邪魔しない。",
    "保護ルール": "休憩推定は未確認。"
  },
  {
    "id": "M24",
    "name": "料理実行モード",
    "フェーズ": "料理",
    "分類": "料理",
    "役割": "予定メニューを実行し、写真・量・味・余り・失敗を残す。",
    "開始条件": "当日料理/手動",
    "最初に出す情報": "今日の料理、予定量、材料、手順、開始時刻",
    "主要ボタン": "写真、量、味、余り、失敗、完了",
    "自動で拾う情報": "時刻、写真、声、メモ",
    "連携データ": "料理計画、買物、思い出",
    "完了条件": "料理完了",
    "思い出へ残す": "料理ログ、写真、評価",
    "次回改善へ戻す": "量/材料/手順を次回へ",
    "UIルール": "予定メニューから選ぶ。ボタンだけ並べない。",
    "保護ルール": "料理メモを勝手に上書きしない。"
  },
  {
    "id": "M25",
    "name": "食事モード",
    "フェーズ": "料理",
    "分類": "料理",
    "役割": "食べた感想、量、満足度、コタ対応を残す。",
    "開始条件": "料理完了/手動",
    "最初に出す情報": "食事写真、量、残り、味、コタ",
    "主要ボタン": "美味しい、多い/少ない、残った、メモ",
    "自動で拾う情報": "写真、メモ、時刻",
    "連携データ": "料理、コタ、思い出",
    "完了条件": "食事終了",
    "思い出へ残す": "食事ログ",
    "次回改善へ戻す": "次回量調整",
    "UIルール": "感想は一言で残せる。",
    "保護ルール": "評価を勝手に公開しない。"
  },
  {
    "id": "M26",
    "name": "片付けモード",
    "フェーズ": "料理",
    "分類": "料理",
    "役割": "食後片付け、洗い物、ゴミ、残り食材を整理する。",
    "開始条件": "食事終了/手動",
    "最初に出す情報": "洗い物、ゴミ、残り食材、保冷",
    "主要ボタン": "完了、残り、ゴミ、メモ",
    "自動で拾う情報": "時刻、メモ",
    "連携データ": "料理、撤収、買物",
    "完了条件": "片付け完了",
    "思い出へ残す": "片付けログ",
    "次回改善へ戻す": "次回食材量/ゴミ対策",
    "UIルール": "短いチェック。",
    "保護ルール": "残り食材を勝手に買物更新しない。"
  },
  {
    "id": "M27",
    "name": "自宅散歩モード",
    "フェーズ": "散歩",
    "分類": "散歩",
    "役割": "日常散歩。地図主役、GPS、距離、時間、写真/声/メモ、履歴、復旧。",
    "開始条件": "＋→散歩/自宅散歩",
    "最初に出す情報": "地図、時間、距離、現在地、コタ状態",
    "主要ボタン": "写真、声、メモ、現在地、終了",
    "自動で拾う情報": "GPS連続、距離、時刻、写真",
    "連携データ": "コタ、履歴、場所カード",
    "完了条件": "終了保存/復旧",
    "思い出へ残す": "散歩履歴、ルート",
    "次回改善へ戻す": "体調/散歩コース改善",
    "UIルール": "地図は広域すぎずチカチカしない。",
    "保護ルール": "終了/破棄ミスは復旧。"
  },
  {
    "id": "M28",
    "name": "キャンプ場散歩モード",
    "フェーズ": "散歩",
    "分類": "散歩",
    "役割": "キャンプ滞在の子記録。場内レビュー素材、設備、景色、水場、トイレなど。",
    "開始条件": "キャンプ滞在中/場内散歩",
    "最初に出す情報": "地図、場内ルート、設備候補、写真",
    "主要ボタン": "写真、設備、注意、景色、現在地、終了",
    "自動で拾う情報": "GPS、写真、時刻、場所候補",
    "連携データ": "キャンプ滞在、場所カード、思い出",
    "完了条件": "子記録保存",
    "思い出へ残す": "場内散歩ログ、場所カード",
    "次回改善へ戻す": "キャンプ場レビュー、次回サイト選び",
    "UIルール": "キャンプ中の散歩は親子関係を表示。",
    "保護ルール": "親記録と勝手に統合しない。"
  },
  {
    "id": "M29",
    "name": "場内探索モード",
    "フェーズ": "散歩",
    "分類": "探索",
    "役割": "サイト周辺/施設/景色/騒音/地面/傾斜/犬連れ目線を残す。",
    "開始条件": "到着後/滞在中",
    "最初に出す情報": "探索テーマ、現在地、写真、レビュー素材",
    "主要ボタン": "写真、設備、景色、注意、メモ",
    "自動で拾う情報": "GPS、写真、時刻",
    "連携データ": "キャンプ場DB、場所カード、思い出",
    "完了条件": "探索終了",
    "思い出へ残す": "探索ログ、レビュー素材",
    "次回改善へ戻す": "次回サイト/場内導線",
    "UIルール": "探索テーマを絞って表示。",
    "保護ルール": "公開前確認必須。"
  },
  {
    "id": "M30",
    "name": "コタ対応モード",
    "フェーズ": "コタ/天気",
    "分類": "コタ",
    "役割": "散歩、暑さ寒さ、足元、水、休憩、寝床、用品を記録する。",
    "開始条件": "必要時/コタ注意カード",
    "最初に出す情報": "コタ状態、気温、足元、水、休憩、寝床",
    "主要ボタン": "水、休憩、暑い/寒い、足元注意、メモ",
    "自動で拾う情報": "時刻、天気、場所、メモ",
    "連携データ": "準備、散歩、就寝、撤収",
    "完了条件": "対応完了",
    "思い出へ残す": "コタ対応ログ",
    "次回改善へ戻す": "コタ用品/休憩/寝床改善",
    "UIルール": "常時大きくは出さず必要時だけ。",
    "保護ルール": "ペット情報の公開注意。"
  },
  {
    "id": "M31",
    "name": "天気・風確認モード",
    "フェーズ": "コタ/天気",
    "分類": "天気",
    "役割": "現在天気、風、雨、気温を設営/撤収/乾燥判断へつなげる。",
    "開始条件": "準備/当日/設営/撤収",
    "最初に出す情報": "現在/予報、雨、風、気温、判断メモ",
    "主要ボタン": "更新、設営判断、撤収判断、服装、メモ",
    "自動で拾う情報": "時刻、天気データ、位置",
    "連携データ": "設営、撤収、コタ、料理",
    "完了条件": "判断完了",
    "思い出へ残す": "天気ログ、判断理由",
    "次回改善へ戻す": "雨撤収/乾燥/冷暖房改善",
    "UIルール": "数値より判断を大きく。",
    "保護ルール": "天気由来の提案は未確認。"
  },
  {
    "id": "M32",
    "name": "就寝モード",
    "フェーズ": "夜/朝",
    "分類": "滞在",
    "役割": "寝室準備、ライト、寒暖、音、コタ、翌朝予定を扱う。",
    "開始条件": "夜/手動",
    "最初に出す情報": "寝室、灯り、気温、音、コタ、翌朝予定",
    "主要ボタン": "就寝、寒い/暑い、音、メモ",
    "自動で拾う情報": "時刻、メモ",
    "連携データ": "寝室、コタ、天気、翌朝",
    "完了条件": "就寝記録",
    "思い出へ残す": "就寝ログ",
    "次回改善へ戻す": "寝具/ライト/防寒改善",
    "UIルール": "暗所で見やすくボタン少なめ。",
    "保護ルール": "個人メモを公開しない。"
  },
  {
    "id": "M33",
    "name": "翌朝モード",
    "フェーズ": "夜/朝",
    "分類": "滞在",
    "役割": "起床、朝食、散歩、撤収前準備、レイトチェックアウト判断。",
    "開始条件": "翌朝/手動",
    "最初に出す情報": "起床、天気、朝食、散歩、撤収予定",
    "主要ボタン": "起床、朝食、散歩、撤収へ、メモ",
    "自動で拾う情報": "時刻、天気、写真",
    "連携データ": "料理、散歩、撤収",
    "完了条件": "撤収へ移行",
    "思い出へ残す": "朝ログ",
    "次回改善へ戻す": "朝食量/撤収開始改善",
    "UIルール": "次の行動を1つ大きく。",
    "保護ルール": "予定を勝手に変更しない。"
  },
  {
    "id": "M34",
    "name": "朝食モード",
    "フェーズ": "夜/朝",
    "分類": "料理",
    "役割": "キャンプ朝食または帰路/なしの判断を扱う。",
    "開始条件": "翌朝/料理予定",
    "最初に出す情報": "朝食予定、量、片付け時間、撤収時間",
    "主要ボタン": "写真、量、なし、完了",
    "自動で拾う情報": "時刻、写真、メモ",
    "連携データ": "料理、撤収",
    "完了条件": "朝食完了",
    "思い出へ残す": "朝食ログ",
    "次回改善へ戻す": "朝食量/撤収時間改善",
    "UIルール": "撤収とのバランスを見せる。",
    "保護ルール": "食事予定を勝手に削除しない。"
  },
  {
    "id": "M35",
    "name": "撤収モード",
    "フェーズ": "撤収/帰宅",
    "分類": "撤収",
    "役割": "撤収全体。開始、濡れ物、乾燥、収納、忘れ物、積載、ゴミ、完了時間。",
    "開始条件": "撤収開始",
    "最初に出す情報": "撤収開始時刻、天気、濡れ物、収納、忘れ物、積載",
    "主要ボタン": "開始、濡れ物、乾燥、収納、忘れ物、完了",
    "自動で拾う情報": "時刻、写真、メモ、天気",
    "連携データ": "ギア、天気、コタ、帰路",
    "完了条件": "撤収完了",
    "思い出へ残す": "撤収ログ、忘れ物候補",
    "次回改善へ戻す": "収納順/乾燥/忘れ物改善",
    "UIルール": "工程チェックは少なく。重要項目優先。",
    "保護ルール": "完了/破棄ミス復旧。"
  },
  {
    "id": "M36",
    "name": "濡れ物・乾燥モード",
    "フェーズ": "撤収/帰宅",
    "分類": "撤収",
    "役割": "雨撤収や濡れ物の乾燥管理を残す。",
    "開始条件": "撤収中/雨/手動",
    "最初に出す情報": "濡れ物、乾燥要否、袋、帰宅後乾燥",
    "主要ボタン": "濡れ物追加、乾燥済み、帰宅後へ",
    "自動で拾う情報": "写真、メモ、天気",
    "連携データ": "ギア、帰宅後片付け",
    "完了条件": "乾燥完了/帰宅後へ",
    "思い出へ残す": "乾燥タスク",
    "次回改善へ戻す": "乾燥忘れ防止",
    "UIルール": "帰宅後タスクに残す導線。",
    "保護ルール": "乾燥タスクを勝手に消さない。"
  },
  {
    "id": "M37",
    "name": "忘れ物確認モード",
    "フェーズ": "撤収/帰宅",
    "分類": "撤収",
    "役割": "忘れ物、ゴミ、積載、サイト確認を扱う。",
    "開始条件": "撤収終盤",
    "最初に出す情報": "忘れ物チェック、ゴミ、サイト写真、積載",
    "主要ボタン": "確認、写真、忘れ物、完了",
    "自動で拾う情報": "写真、時刻、メモ",
    "連携データ": "ギア、撤収、思い出",
    "完了条件": "チェックアウトへ",
    "思い出へ残す": "忘れ物ログ",
    "次回改善へ戻す": "次回チェックリスト",
    "UIルール": "最後に一画面で済ませる。",
    "保護ルール": "確認前に完了扱いしない。"
  },
  {
    "id": "M38",
    "name": "帰路ドライブモード",
    "フェーズ": "撤収/帰宅",
    "分類": "移動",
    "役割": "帰路、休憩、観光、買物、渋滞、帰宅予定差分を扱う。",
    "開始条件": "チェックアウト/帰路開始",
    "最初に出す情報": "自宅まで、寄り道、休憩、帰宅予定",
    "主要ボタン": "Google Maps、休憩、観光、買物、帰宅",
    "自動で拾う情報": "Maps、GPS、時刻、停車",
    "連携データ": "ルート、思い出、コタ",
    "完了条件": "帰宅",
    "思い出へ残す": "帰路ログ",
    "次回改善へ戻す": "帰路休憩/寄り道改善",
    "UIルール": "Maps中心、運転中操作禁止。",
    "保護ルール": "帰宅推定は未確認。"
  },
  {
    "id": "M39",
    "name": "観光・立ち寄りモード",
    "フェーズ": "撤収/帰宅",
    "分類": "移動",
    "役割": "帰り/行きの観光や立ち寄りを思い出に残す。",
    "開始条件": "寄り道/手動",
    "最初に出す情報": "場所、写真、滞在、コタ可、メモ",
    "主要ボタン": "写真、メモ、保存、あとで",
    "自動で拾う情報": "GPS、写真、時刻",
    "連携データ": "思い出、場所カード",
    "完了条件": "立ち寄り終了",
    "思い出へ残す": "立ち寄りログ",
    "次回改善へ戻す": "次回寄り道候補",
    "UIルール": "写真中心。",
    "保護ルール": "公開前確認。"
  },
  {
    "id": "M40",
    "name": "帰宅後片付けモード",
    "フェーズ": "撤収/帰宅",
    "分類": "帰宅後",
    "役割": "荷下ろし、乾燥、洗い物、充電、補充、破損確認を次回準備へ戻す。",
    "開始条件": "帰宅/手動",
    "最初に出す情報": "荷下ろし、乾燥、洗い物、充電、補充、破損",
    "主要ボタン": "完了、あとで、次回へ、破損",
    "自動で拾う情報": "時刻、メモ",
    "連携データ": "ギア、買物、次回改善",
    "完了条件": "片付け完了/未完了保存",
    "思い出へ残す": "帰宅後タスク",
    "次回改善へ戻す": "補充/乾燥/破損を次回へ",
    "UIルール": "疲れている前提で最小チェック。",
    "保護ルール": "未完了を消さない。"
  },
  {
    "id": "M41",
    "name": "思い出整理モード",
    "フェーズ": "思い出/改善",
    "分類": "思い出",
    "役割": "写真/動画/音声/メモ/GPS/時系列/レビュー/反省/未確認を整理する。",
    "開始条件": "帰宅後/思い出タブ",
    "最初に出す情報": "時系列、写真、未確認、レビュー素材、地図",
    "主要ボタン": "確認、修正、レビュー、次回へ、Google Photos連携",
    "自動で拾う情報": "記録全体、メディア参照、GPS",
    "連携データ": "Google Photos、次回改善、チャッピー",
    "完了条件": "整理済み/保留",
    "思い出へ残す": "思い出カード、レビュー",
    "次回改善へ戻す": "次回準備へ反映",
    "UIルール": "一気に整理させない。未確認を小分け。",
    "保護ルール": "勝手に統合・削除しない。"
  },
  {
    "id": "M42",
    "name": "次回改善モード",
    "フェーズ": "思い出/改善",
    "分類": "改善",
    "役割": "忘れ物、料理量、設営順、ギア、コタ、天気対策、キャンプ場評価を次回準備へ反映する。",
    "開始条件": "思い出→次回改善",
    "最初に出す情報": "改善候補、根拠、反映先予定",
    "主要ボタン": "採用、保留、却下、準備へ戻す",
    "自動で拾う情報": "記録/メモ/写真由来候補",
    "連携データ": "準備、ギア、料理、買物",
    "完了条件": "反映/保留",
    "思い出へ残す": "次回準備タスク",
    "次回改善へ戻す": "次回の具体タスク",
    "UIルール": "根拠を短く表示。",
    "保護ルール": "AIが勝手に反映しない。"
  },
  {
    "id": "M43",
    "name": "チャッピー提案モード",
    "フェーズ": "思い出/改善",
    "分類": "AI",
    "役割": "次回やること、改善、不要データ整理、レビュー文案、買物/ギア/料理提案を出す。",
    "開始条件": "思い出/準備/未確認",
    "最初に出す情報": "提案、根拠、影響、反映先",
    "主要ボタン": "採用、保留、違う、修正",
    "自動で拾う情報": "過去記録、予定、天気、ギア、料理",
    "連携データ": "準備、思い出、データ管理",
    "完了条件": "採用/保留/却下",
    "思い出へ残す": "提案履歴、改善候補",
    "次回改善へ戻す": "次回アクション",
    "UIルール": "提案は押し付けない。",
    "保護ルール": "自動確定しない。"
  },
  {
    "id": "M44",
    "name": "復旧・修正モード",
    "フェーズ": "データ/安全",
    "分類": "安全",
    "役割": "間違い登録、終了ミス、破棄ミス、あとで確認、未確認、復元を扱う。",
    "開始条件": "常時/ミス時",
    "最初に出す情報": "直前操作、復旧候補、未確認箱",
    "主要ボタン": "復旧、戻す、移動、違う、あとで",
    "自動で拾う情報": "操作履歴、削除箱、状態",
    "連携データ": "全モード",
    "完了条件": "復旧完了/保留",
    "思い出へ残す": "監査ログ、復元状態",
    "次回改善へ戻す": "操作事故防止",
    "UIルール": "安心感を最優先。危険操作は控えめ。",
    "保護ルール": "削除せず却下/復元可能へ。"
  },
  {
    "id": "M45",
    "name": "データ管理・Google Photosモード",
    "フェーズ": "データ/安全",
    "分類": "保存",
    "役割": "Google Photosを正本メディア置き場とし、OUTBASEは参照/メタデータ管理する。",
    "開始条件": "思い出/管理",
    "最初に出す情報": "保存状態、同期、共有アルバム、容量、参照切れ",
    "主要ボタン": "同期、確認、再接続、あとで",
    "自動で拾う情報": "写真ID、参照、メタデータ",
    "連携データ": "思い出、家族共有、データ管理",
    "完了条件": "同期確認",
    "思い出へ残す": "参照DB、保存ログ",
    "次回改善へ戻す": "参照切れ修正",
    "UIルール": "内部事情を出しすぎない。",
    "保護ルール": "写真/動画を勝手に複製/削除しない。"
  },
  {
    "id": "M46",
    "name": "オフライン・復旧モード",
    "フェーズ": "データ/安全",
    "分類": "安全",
    "役割": "電波不安定でも記録を失わず、後で同期する。",
    "開始条件": "常時/圏外",
    "最初に出す情報": "オフライン状態、未同期件数、復旧状態",
    "主要ボタン": "保存、あとで同期、復旧",
    "自動で拾う情報": "ローカル記録、同期状態",
    "連携データ": "全モード",
    "完了条件": "同期完了/保留",
    "思い出へ残す": "未同期キュー",
    "次回改善へ戻す": "データ損失防止",
    "UIルール": "不安を煽らず状態表示。",
    "保護ルール": "オフライン中も保存を止めない。"
  },
  {
    "id": "M47",
    "name": "テストリセットモード",
    "フェーズ": "データ/安全",
    "分類": "安全",
    "役割": "テスト中の記録だけ安全に消す。本番データは守る。",
    "開始条件": "管理/テスト時",
    "最初に出す情報": "消える対象、残る対象、復旧可否",
    "主要ボタン": "テスト記録リセット、復元、キャンセル",
    "自動で拾う情報": "対象ID、バックアップ",
    "連携データ": "全モード",
    "完了条件": "リセット完了/復旧",
    "思い出へ残す": "テスト状態リセット",
    "次回改善へ戻す": "開発検証効率化",
    "UIルール": "確認は短く明確。",
    "保護ルール": "予定/準備/過去記録を消さない。"
  }
];
const MVP23 = [
  {
    "no": "01",
    "title": "カレンダー・予定",
    "mode": "予定モード/予約取込/準備対象切替",
    "desc": "複数予定・予約情報・日程・場所・チェックイン/アウトを保持"
  },
  {
    "no": "02",
    "title": "キャンプ候補探し",
    "mode": "探すモード",
    "desc": "犬可/温水/景色/距離/季節条件/候補比較"
  },
  {
    "no": "03",
    "title": "複数キャンプ予定の管理",
    "mode": "予定/準備モード",
    "desc": "予定ごとに買う/持つ/食べる/コタ/ギア/ルートを分離"
  },
  {
    "no": "04",
    "title": "予約情報取込",
    "mode": "予約情報取込モード",
    "desc": "候補抽出→確認→予定反映。自動確定禁止"
  },
  {
    "no": "05",
    "title": "準備",
    "mode": "準備モード",
    "desc": "買物/料理/ギア/コタ/ルート/天気/積込"
  },
  {
    "no": "06",
    "title": "詳細買物リスト",
    "mode": "買い物モード",
    "desc": "肉部位/魚介/チーズ/野菜/調味料/量/代替/不要/LINEコピー"
  },
  {
    "no": "07",
    "title": "料理計画",
    "mode": "料理計画/料理実行/食事/片付け",
    "desc": "1泊2日・朝昼晩・人数・友人・設営撤収時間・食べ過ぎ防止"
  },
  {
    "no": "08",
    "title": "ギア管理",
    "mode": "ギア準備/設営/撤収/帰宅後",
    "desc": "台帳/持参/積載/使用有無/濡れ物/乾燥/次回"
  },
  {
    "no": "09",
    "title": "ルート・経由地",
    "mode": "ルート/往路/帰路/寄り道",
    "desc": "Google Maps起動・経由地・給油・買出し・休憩・差分"
  },
  {
    "no": "10",
    "title": "当日進行",
    "mode": "当日運転席/出発前/到着/設営/撤収/帰宅",
    "desc": "今日やることの運転席。記録ボタン置き場にしない"
  },
  {
    "no": "11",
    "title": "キャンプ滞在記録",
    "mode": "キャンプ滞在/子記録群",
    "desc": "設営/料理/場内散歩/撤収を親子関係で保持"
  },
  {
    "no": "12",
    "title": "自宅散歩",
    "mode": "自宅散歩モード",
    "desc": "地図主役・GPS・距離・履歴・復旧"
  },
  {
    "no": "13",
    "title": "キャンプ場散歩",
    "mode": "キャンプ場散歩/場内探索",
    "desc": "キャンプ滞在＞キャンプ場散歩。場内レビュー素材"
  },
  {
    "no": "14",
    "title": "設営・撤収ログ",
    "mode": "設営/撤収/各工程",
    "desc": "工程、タイマー、写真、注意、復旧、次回段取り"
  },
  {
    "no": "15",
    "title": "写真・動画・音声・メモ",
    "mode": "全記録モード",
    "desc": "今すぐ残す。分類は候補。確定は後から"
  },
  {
    "no": "16",
    "title": "GPS・地図・場所カード",
    "mode": "散歩/場内/ドライブ/場所カード",
    "desc": "地図は広すぎず、チカチカしない。場所カードへ"
  },
  {
    "no": "17",
    "title": "履歴詳細",
    "mode": "思い出/履歴詳細",
    "desc": "時系列・写真・メモ・GPS・活動ログを詳細表示"
  },
  {
    "no": "18",
    "title": "思い出整理",
    "mode": "思い出整理モード",
    "desc": "未確認箱、レビュー、反省、写真整理、Google Photos参照"
  },
  {
    "no": "19",
    "title": "次回改善",
    "mode": "次回改善モード",
    "desc": "忘れ物、料理量、ギア、設営順、コタ、天気対策を準備へ戻す"
  },
  {
    "no": "20",
    "title": "天気・イベント監視",
    "mode": "天気/風確認モード",
    "desc": "設営・撤収・乾燥・服装・冷暖房・コタ判断"
  },
  {
    "no": "21",
    "title": "Google Photos / データ保存",
    "mode": "データ管理モード",
    "desc": "写真動画はGoogle Photos、OUTBASEは参照/メタデータ"
  },
  {
    "no": "22",
    "title": "オフライン・復旧",
    "mode": "オフライン/復旧/修正",
    "desc": "圏外でも保存。終了/破棄ミス復旧。未同期キュー"
  },
  {
    "no": "23",
    "title": "チャッピー提案",
    "mode": "チャッピー提案モード",
    "desc": "提案は候補。採用/保留/違う/修正。自動確定禁止"
  }
];
const FLOW = [
  {
    "id": "search",
    "label": "探す",
    "mode": "M02",
    "next": "予定化",
    "short": "犬可・温水・景色・距離で候補化"
  },
  {
    "id": "plan",
    "label": "予定",
    "mode": "M01",
    "next": "準備へ",
    "short": "予約・日程・サイト・チェックイン/アウトを保持"
  },
  {
    "id": "prep",
    "label": "準備",
    "mode": "M04",
    "next": "出発前へ",
    "short": "買う/持つ/食べる/コタ/ギア/ルート/天気"
  },
  {
    "id": "before",
    "label": "出発前",
    "mode": "M11",
    "next": "往路へ",
    "short": "起床・朝食・積込・給油・出発"
  },
  {
    "id": "drive_out",
    "label": "往路",
    "mode": "M12",
    "next": "到着受付へ",
    "short": "Google Maps中心。運転中に操作させない"
  },
  {
    "id": "arrival",
    "label": "到着受付",
    "mode": "M14",
    "next": "サイトへ",
    "short": "到着時刻・受付・注意事項"
  },
  {
    "id": "site",
    "label": "サイト移動",
    "mode": "M15",
    "next": "レイアウトへ",
    "short": "サイト番号・地面・傾斜・景色"
  },
  {
    "id": "layout",
    "label": "レイアウト",
    "mode": "M16",
    "next": "設営へ",
    "short": "テント/タープ/車/コタ動線"
  },
  {
    "id": "setup",
    "label": "設営",
    "mode": "M17",
    "next": "滞在へ",
    "short": "工程・天気風・休憩・設営時間"
  },
  {
    "id": "stay",
    "label": "滞在",
    "mode": "M24",
    "next": "就寝/翌朝へ",
    "short": "料理・食事・散歩・場内探索・コタ対応"
  },
  {
    "id": "sleep",
    "label": "夜/翌朝",
    "mode": "M32",
    "next": "撤収へ",
    "short": "就寝・起床・朝食・散歩・撤収前準備"
  },
  {
    "id": "teardown",
    "label": "撤収",
    "mode": "M35",
    "next": "帰路へ",
    "short": "濡れ物・乾燥・収納・忘れ物・積載"
  },
  {
    "id": "drive_home",
    "label": "帰路",
    "mode": "M38",
    "next": "帰宅後へ",
    "short": "Google Maps・休憩・観光・買物・渋滞"
  },
  {
    "id": "home_after",
    "label": "帰宅後",
    "mode": "M40",
    "next": "思い出へ",
    "short": "荷下ろし・乾燥・洗い物・充電・補充"
  },
  {
    "id": "memory",
    "label": "思い出",
    "mode": "M41",
    "next": "次回改善へ",
    "short": "時系列・未確認・レビュー・Google Photos参照"
  },
  {
    "id": "improve",
    "label": "次回改善",
    "mode": "M42",
    "next": "次回準備へ",
    "short": "忘れ物・料理量・ギア・コタ・天気対策"
  }
];
const MODE_GROUPS = {
  "予定/探す": [
    "M01",
    "M02",
    "M03"
  ],
  "準備": [
    "M04",
    "M05",
    "M06",
    "M07",
    "M08",
    "M09"
  ],
  "当日": [
    "M10",
    "M11",
    "M12",
    "M13",
    "M14",
    "M15",
    "M16"
  ],
  "設営": [
    "M17",
    "M18",
    "M19",
    "M20",
    "M21",
    "M22",
    "M23"
  ],
  "料理/滞在": [
    "M24",
    "M25",
    "M26",
    "M30",
    "M31",
    "M32",
    "M33",
    "M34"
  ],
  "散歩/探索": [
    "M27",
    "M28",
    "M29"
  ],
  "撤収/帰宅": [
    "M35",
    "M36",
    "M37",
    "M38",
    "M39",
    "M40"
  ],
  "思い出/改善": [
    "M41",
    "M42",
    "M43"
  ],
  "安全/保存": [
    "M44",
    "M45",
    "M46",
    "M47"
  ]
};
const PREP_SECTIONS = [
  {
    "id": "shopping",
    "label": "買い物",
    "mode": "M05",
    "items": [
      "肉・部位",
      "魚介/代替",
      "チーズ/野菜",
      "調味料",
      "当日買う物",
      "LINEコピー"
    ]
  },
  {
    "id": "meals",
    "label": "料理",
    "mode": "M06",
    "items": [
      "1日目夜",
      "2日目朝",
      "人数/友人",
      "量が多すぎないか",
      "撤収時間との両立"
    ]
  },
  {
    "id": "gear",
    "label": "ギア",
    "mode": "M07",
    "items": [
      "テント/タープ",
      "寝具",
      "料理道具",
      "電源/冷暖房",
      "コタ用品",
      "濡れ物対策"
    ]
  },
  {
    "id": "route",
    "label": "ルート",
    "mode": "M08",
    "items": [
      "出発時間",
      "Google Maps",
      "経由地",
      "買い出し",
      "給油",
      "休憩"
    ]
  },
  {
    "id": "kota",
    "label": "コタ",
    "mode": "M09",
    "items": [
      "水",
      "休憩",
      "足元",
      "暑さ/寒さ",
      "寝床",
      "散歩タイミング"
    ]
  },
  {
    "id": "weather",
    "label": "天気/風",
    "mode": "M31",
    "items": [
      "雨",
      "風",
      "気温",
      "設営判断",
      "撤収判断",
      "乾燥判断"
    ]
  }
];

const STORAGE_KEY = 'outbase_core08_f1_state';
const nowIso = () => new Date().toISOString();
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const modeById = Object.fromEntries(MODES.map(m => [m.id, m]));
const modeLabel = id => modeById[id]?.name?.replace('モード','') || id;
const uid = (prefix='id') => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
const splitItems = (text='') => String(text || '').split(/[、/・]/).map(s => s.trim()).filter(Boolean);

const defaultState = () => ({
  route: 'day',
  selectedPlanId: 'plan_default',
  plans: [{
    id: 'plan_default',
    title: '次回キャンプ',
    campground: 'キャンプ場未設定',
    dateText: '日程未設定',
    site: '',
    checkin: '',
    checkout: '',
    people: '夫婦＋コタ',
    status: '予定候補',
    memo: '正本統合MVP：予定・準備・当日・記録・思い出・次回改善を一本で扱う'
  }],
  candidates: [
    {id: uid('cand'), title:'犬可・温水・景色候補', dog:'犬可', warm:'温水確認', view:'景色候補', distance:'4時間以内', status:'候補'}
  ],
  prep: {
    shopping: [], meals: [], gear: [], route: [], kota: [], weather: [],
    checks: {}
  },
  day: {
    activeFlowIndex: 0,
    activeModeId: 'M10',
    dayStartedAt: null,
    status: '未開始',
  },
  activeSession: null,
  records: [],
  inbox: [],
  memories: [],
  improvements: [],
  trash: [],
  audit: [],
  backups: [],
  settings: {
    googlePhotos: '参照メタデータ管理：未接続',
    offline: navigator.onLine ? 'オンライン' : 'オフライン',
    testMode: true
  }
});

let state = load();
let mediaInputKind = 'photo';

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return saved ? normalize(saved) : defaultState();
  } catch {
    return defaultState();
  }
}
function normalize(s) {
  const base = defaultState();
  return {
    ...base,
    ...s,
    plans: Array.isArray(s.plans) && s.plans.length ? s.plans : base.plans,
    candidates: Array.isArray(s.candidates) ? s.candidates : base.candidates,
    prep: {...base.prep, ...(s.prep || {}), checks: {...((s.prep||{}).checks || {})}},
    day: {...base.day, ...(s.day || {})},
    records: Array.isArray(s.records) ? s.records : [],
    inbox: Array.isArray(s.inbox) ? s.inbox : [],
    memories: Array.isArray(s.memories) ? s.memories : [],
    improvements: Array.isArray(s.improvements) ? s.improvements : [],
    trash: Array.isArray(s.trash) ? s.trash : [],
    audit: Array.isArray(s.audit) ? s.audit : [],
    backups: Array.isArray(s.backups) ? s.backups : [],
    settings: {...base.settings, ...(s.settings || {})}
  };
}
function save(reason='state-save') {
  state.audit = [{id: uid('audit'), at: nowIso(), reason}, ...(state.audit || [])].slice(0, 120);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  refreshChrome();
}
function backup(reason) {
  state.backups = [{id: uid('backup'), at: nowIso(), reason, snapshot: JSON.stringify(state)}, ...(state.backups || [])].slice(0, 6);
}
function selectedPlan() { return state.plans.find(p => p.id === state.selectedPlanId) || state.plans[0]; }
function routeTo(route) { state.route = route; save('route:'+route); render(); }
function currentFlow() { return FLOW[state.day.activeFlowIndex] || FLOW[0]; }
function currentMode() { return modeById[state.activeSession?.modeId || state.day.activeModeId || currentFlow().mode] || modeById.M10; }

function card(content, cls='') { return `<section class="card ${cls}">${content}</section>`; }
function chip(text, cls='') { return `<span class="chip ${cls}">${esc(text)}</span>`; }
function pillList(text) { return splitItems(text).map(x => chip(x)).join(''); }
function fieldLabel(label, value) { return `<div class="kv"><span>${esc(label)}</span><strong>${esc(value || '未設定')}</strong></div>`; }
function primaryButton(label, action, cls='') { return `<button class="btn primary ${cls}" data-action="${esc(action)}">${esc(label)}</button>`; }
function ghostButton(label, action, cls='') { return `<button class="btn ghost ${cls}" data-action="${esc(action)}">${esc(label)}</button>`; }

function refreshChrome() {
  document.body.dataset.route = state.route;
  document.body.dataset.recording = state.activeSession ? 'active' : 'idle';
  const titleMap = {home:'予定', search:'探す', prep:'準備', day:'当日運転席', memory:'思い出'};
  $('#appTitle').textContent = titleMap[state.route] || 'OUTBASE';
  $('#appStatus').textContent = state.activeSession ? `記録中：${modeLabel(state.activeSession.modeId)}` : (navigator.onLine ? '保存OK' : '圏外保存');
  $$('.bottom-nav button').forEach(b => b.classList.toggle('active', b.dataset.route === state.route));
  const fab = $('#captureFab');
  if (fab) fab.classList.toggle('live', Boolean(state.activeSession));
}

function render() {
  refreshChrome();
  const app = $('#app');
  if (state.route === 'home') app.innerHTML = renderHome();
  else if (state.route === 'search') app.innerHTML = renderSearch();
  else if (state.route === 'prep') app.innerHTML = renderPrep();
  else if (state.route === 'day') app.innerHTML = renderDay();
  else if (state.route === 'memory') app.innerHTML = renderMemory();
  bind();
}

function renderHome() {
  const p = selectedPlan();
  return `
    ${card(`<div class="hero-title"><span>次の予定</span><h2>${esc(p.title)}</h2><p>${esc(p.campground)} / ${esc(p.dateText)}</p></div>
      <div class="grid two">
        ${fieldLabel('チェックイン', p.checkin)}${fieldLabel('チェックアウト', p.checkout)}
        ${fieldLabel('同行', p.people)}${fieldLabel('サイト', p.site || '未設定')}
      </div>
      <div class="btn-row">${primaryButton('準備へ進む','goPrep')}${ghostButton('予約情報を取込','openMode:M03')}${ghostButton('予定を追加','addPlan')}</div>`, 'hero-card')}
    ${renderPlanList()}
    ${card(`<h3>MVP23 反映状況</h3><div class="mvp-grid">${MVP23.map(item => `<button class="mvp-tile" data-action="showMvp:${item.no}"><strong>${item.no} ${esc(item.title)}</strong><span>${esc(item.desc)}</span></button>`).join('')}</div>`, 'mvp-card')}
  `;
}

function renderPlanList() {
  return card(`<div class="section-head"><h3>複数予定</h3><span>${state.plans.length}件</span></div>
    <div class="stack">${state.plans.map(p => `<article class="plan-row ${p.id === state.selectedPlanId ? 'selected' : ''}">
      <button data-action="selectPlan:${p.id}">
        <strong>${esc(p.title)}</strong><span>${esc(p.campground)} / ${esc(p.dateText)}</span>
      </button>
      <em>${esc(p.status || '予定')}</em>
    </article>`).join('')}</div>`);
}

function renderSearch() {
  return `
    ${card(`<div class="section-head"><h3>探す</h3><span>犬可・温水・景色・距離</span></div>
      <div class="search-filter">
        ${['犬可','ドッグフリー','温水','景色','4時間以内','暑期エアコン','1泊2万円以下'].map(x => chip(x)).join('')}
      </div>
      <div class="btn-row">${primaryButton('候補を追加','addCandidate')}${ghostButton('探すモード詳細','openMode:M02')}</div>`, 'hero-card')}
    ${card(`<h3>候補カード</h3><div class="stack">${state.candidates.map(c => `<article class="candidate-row">
      <div><strong>${esc(c.title)}</strong><span>${esc([c.dog,c.warm,c.view,c.distance].filter(Boolean).join(' / '))}</span></div>
      <div class="btn-row mini">${ghostButton('比較','candidateCompare:'+c.id)}${primaryButton('予定化','candidateToPlan:'+c.id)}</div>
    </article>`).join('')}</div>`)}
  `;
}

function prepProgress() {
  const sections = PREP_SECTIONS;
  const done = Object.values(state.prep.checks || {}).filter(Boolean).length;
  const total = sections.reduce((n, s) => n + s.items.length, 0);
  return {done,total,pct: total ? Math.round(done/total*100) : 0};
}
function renderPrep() {
  const p = selectedPlan();
  const pr = prepProgress();
  return `
    ${card(`<div class="hero-title"><span>準備対象</span><h2>${esc(p.title)}</h2><p>${esc(p.campground)} / ${esc(p.dateText)}</p></div>
      <div class="progress"><i style="width:${pr.pct}%"></i></div><p class="muted">準備 ${pr.done}/${pr.total} / 別予定へ勝手に上書きしない</p>
      <div class="btn-row">${primaryButton('当日運転席へ渡す','goDay')}${ghostButton('LINE買物コピー','copyShopping')}</div>`, 'hero-card')}
    <div class="prep-grid">
      ${PREP_SECTIONS.map(renderPrepSection).join('')}
    </div>
  `;
}
function renderPrepSection(sec) {
  return card(`<div class="section-head"><h3>${esc(sec.label)}</h3><button class="link" data-action="openMode:${sec.mode}">中身</button></div>
    <div class="check-list">${sec.items.map(item => {
      const key = sec.id + '::' + item;
      return `<label><input type="checkbox" data-prep-key="${esc(key)}" ${state.prep.checks[key] ? 'checked' : ''}> <span>${esc(item)}</span></label>`;
    }).join('')}</div>
    <textarea class="field small" data-prep-memo="${esc(sec.id)}" placeholder="${esc(sec.label)}メモ">${esc(state.prep[sec.id]?.memo || '')}</textarea>`, 'prep-card');
}

function renderDay() {
  const p = selectedPlan();
  const flow = currentFlow();
  const mode = modeById[flow.mode];
  const active = state.activeSession;
  return `
    ${active ? renderActiveSession(active) : ''}
    ${card(`<div class="hero-title"><span>今日の運転席</span><h2>${esc(flow.label)}</h2><p>${esc(flow.short)}</p></div>
      <div class="route-line">${FLOW.map((s,i) => `<button class="${i === state.day.activeFlowIndex ? 'active' : ''} ${i < state.day.activeFlowIndex ? 'done' : ''}" data-action="setFlow:${i}"><span>${i+1}</span>${esc(s.label)}</button>`).join('')}</div>
      <div class="driver-card">
        <strong>次にやること</strong>
        <h3>${esc(mode['最初に出す情報'])}</h3>
        <div class="pill-row">${pillList(mode['連携データ'])}</div>
      </div>
      <div class="btn-row">${primaryButton(flow.next, 'advanceFlow')}${ghostButton('このモードを開始','startMode:'+flow.mode)}${ghostButton('メモ','quickMemo')}${ghostButton('あとで','quickLater')}</div>`, 'hero-card driver')}
    ${renderModeGroupNavigator()}
    ${renderDayBridge()}
  `;
}

function renderDayBridge() {
  const p = selectedPlan();
  return card(`<div class="section-head"><h3>準備から引き継ぐ</h3><span>${esc(p.title)}</span></div>
    <div class="bridge-grid">
      ${PREP_SECTIONS.map(s => `<button data-action="openMode:${s.mode}"><strong>${esc(s.label)}</strong><span>${esc(s.items.slice(0,3).join(' / '))}</span></button>`).join('')}
    </div>
    <p class="guard-text">AI/GPSの推定は未確認候補。予定・準備・記録を勝手に確定/統合/削除しない。</p>`, 'bridge-card');
}

function renderModeGroupNavigator() {
  return card(`<div class="section-head"><h3>全モード</h3><span>${MODES.length}モード</span></div>
    <div class="mode-groups">${Object.entries(MODE_GROUPS).map(([group, ids]) => `<details><summary>${esc(group)} <small>${ids.length}</small></summary><div class="mode-list">${ids.map(id => {
      const m=modeById[id]; return `<button data-action="openMode:${id}"><strong>${id} ${esc(m.name.replace('モード',''))}</strong><span>${esc(m['役割'])}</span></button>`;
    }).join('')}</div></details>`).join('')}</div>`, 'mode-nav-card');
}

function renderActiveSession(s) {
  const m = modeById[s.modeId] || modeById.M10;
  const elapsed = s.startedAt ? formatElapsed(new Date(s.startedAt)) : '00:00';
  return card(`<div class="active-head"><div><span>記録中</span><h2>${esc(m.name)}</h2><p>${esc(m['役割'])}</p></div><strong>${elapsed}</strong></div>
    <div class="mode-panels">
      <div>${fieldLabel('画面に出す情報', m['最初に出す情報'])}</div>
      <div>${fieldLabel('自動で拾う', m['自動で拾う情報'])}</div>
      <div>${fieldLabel('次回改善へ戻す', m['次回改善へ戻す'])}</div>
    </div>
    <div class="action-grid">${splitItems(m['主要ボタン']).map(btn => `<button data-action="modeAction:${esc(btn)}"><strong>${esc(btn)}</strong><span>${esc(m.name.replace('モード',''))}</span></button>`).join('')}</div>
    <div class="quick-grid">
      ${captureButton('写真','capture:photo')}${captureButton('動画','capture:video')}${captureButton('声','voice')}${captureButton('メモ','quickMemo')}${captureButton('GPS','gps')}${captureButton('あとで','quickLater')}
    </div>
    <div class="btn-row">${m['主要ボタン'].includes('Google Maps') || m['主要ボタン'].includes('Maps') ? primaryButton('Google Mapsで開く','openMaps') : ''}${primaryButton('完了して思い出へ','finishMode')}${ghostButton('中断/復旧候補へ','pauseMode')}</div>`, 'active-card');
}
function captureButton(label, action) { return `<button data-action="${esc(action)}"><strong>${esc(label)}</strong><span>残す</span></button>`; }

function renderMemory() {
  return `
    ${card(`<div class="hero-title"><span>思い出整理</span><h2>未確認 ${state.inbox.length}件</h2><p>キャンプ中は整理させない。帰ってから小分けに確認。</p></div>
      <div class="btn-row">${primaryButton('チャッピー提案を見る','openMode:M43')}${ghostButton('データ管理','openMode:M45')}${ghostButton('テストリセット','openMode:M47')}</div>`, 'hero-card')}
    ${renderInbox()}
    ${renderTimeline()}
    ${renderImprovements()}
    ${renderSafetyPanel()}
  `;
}
function renderInbox() {
  return card(`<div class="section-head"><h3>未確認箱</h3><span>勝手に確定しない</span></div>
    <div class="stack">${state.inbox.length ? state.inbox.map(item => `<article class="inbox-row">
      <div><strong>${esc(item.title)}</strong><span>${esc(item.detail || '')}</span><small>${esc(formatTime(item.at))} / ${esc(item.modeName || '')}</small></div>
      <div class="btn-row mini">${primaryButton('採用','acceptInbox:'+item.id)}${ghostButton('あとで','laterInbox:'+item.id)}${ghostButton('違う','rejectInbox:'+item.id)}</div>
    </article>`).join('') : '<p class="empty">未確認はありません。</p>'}</div>`, 'inbox-card');
}
function renderTimeline() {
  const rows = state.records.slice(0,40);
  return card(`<div class="section-head"><h3>時系列ログ</h3><span>${state.records.length}件</span></div>
    <div class="timeline">${rows.length ? rows.map(r => `<article><time>${esc(formatTime(r.at))}</time><strong>${esc(r.title)}</strong><p>${esc(r.detail || '')}</p></article>`).join('') : '<p class="empty">まだ記録がありません。</p>'}</div>`, 'timeline-card');
}
function renderImprovements() {
  return card(`<div class="section-head"><h3>次回改善</h3><button class="link" data-action="openMode:M42">中身</button></div>
    <div class="stack">${state.improvements.length ? state.improvements.map(i => `<article class="improve-row"><strong>${esc(i.title)}</strong><span>${esc(i.detail)}</span><div class="btn-row mini">${primaryButton('準備へ戻す','applyImprove:'+i.id)}${ghostButton('保留','holdImprove:'+i.id)}</div></article>`).join('') : '<p class="empty">改善候補は、記録・未確認から作られます。</p>'}</div>`);
}
function renderSafetyPanel() {
  return card(`<div class="section-head"><h3>管理・復旧</h3><span>削除禁止/復元</span></div>
    <div class="safety-grid">
      <button data-action="openMode:M44"><strong>復旧・修正</strong><span>終了ミス/破棄ミス/未確認</span></button>
      <button data-action="openMode:M45"><strong>Google Photos</strong><span>${esc(state.settings.googlePhotos)}</span></button>
      <button data-action="openMode:M46"><strong>オフライン</strong><span>${navigator.onLine ? 'オンライン' : '圏外でも保存'}</span></button>
      <button data-action="testReset"><strong>テストリセット</strong><span>予定/準備/過去記録は守る</span></button>
      <button data-action="restoreBackup"><strong>直前復元</strong><span>${state.backups.length}件</span></button>
    </div>`, 'safety-card');
}

function renderCaptureSheet() {
  let sheet = $('#captureSheet');
  if (!sheet) {
    sheet = document.createElement('div');
    sheet.id = 'captureSheet';
    sheet.className = 'sheet';
    document.body.appendChild(sheet);
  }
  sheet.innerHTML = `<div class="sheet-backdrop" data-action="closeSheet"></div>
    <section class="sheet-panel">
      <div class="sheet-handle"></div>
      <div class="section-head"><h3>今すぐ残す</h3><button class="link" data-action="closeSheet">閉じる</button></div>
      <div class="quick-grid big">
        ${captureButton('写真','capture:photo')}${captureButton('動画','capture:video')}${captureButton('声','voice')}${captureButton('メモ','quickMemo')}${captureButton('あとで','quickLater')}${captureButton('GPS','gps')}
      </div>
      <div class="section-head"><h3>活動を始める</h3><span>中身まで出し分け</span></div>
      <div class="mode-start-grid">
        ${['M27','M12','M17','M24','M35','M28','M29','M30','M31','M40'].map(id => `<button data-action="startMode:${id}"><strong>${esc(modeLabel(id))}</strong><span>${esc(modeById[id]['最初に出す情報'])}</span></button>`).join('')}
      </div>
      <button class="btn ghost full" data-action="openAllModes">全47モードから選ぶ</button>
    </section>`;
  sheet.classList.add('open');
  bind(sheet);
}
function closeSheet() { $('#captureSheet')?.classList.remove('open'); }

function showModeDetail(id) {
  const m = modeById[id];
  if (!m) return;
  let modal = $('#modeModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modeModal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `<div class="modal-backdrop" data-action="closeModal"></div>
    <section class="modal-panel">
      <div class="section-head"><h3>${esc(m.id)} ${esc(m.name)}</h3><button class="link" data-action="closeModal">閉じる</button></div>
      <p class="lead">${esc(m['役割'])}</p>
      <div class="detail-grid">
        ${['開始条件','最初に出す情報','主要ボタン','自動で拾う情報','連携データ','完了条件','思い出へ残す','次回改善へ戻す','UIルール','保護ルール'].map(k => `<article><span>${esc(k)}</span><strong>${esc(m[k])}</strong></article>`).join('')}
      </div>
      <div class="btn-row">${primaryButton('このモードを開始','startMode:'+id)}${ghostButton('未確認候補にする','candidateMode:'+id)}</div>
    </section>`;
  modal.classList.add('open');
  bind(modal);
}
function closeModal() { $('#modeModal')?.classList.remove('open'); }

function formatTime(iso) {
  try { return new Date(iso).toLocaleString('ja-JP', {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}); } catch { return iso || ''; }
}
function formatElapsed(start) {
  const s = Math.max(0, Math.floor((Date.now() - start.getTime())/1000));
  const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); const sec = s%60;
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
}

function addInbox(title, detail='', modeId='M10', extra={}) {
  const m = modeById[modeId] || currentMode();
  state.inbox = [{id: uid('inbox'), at: nowIso(), title, detail, modeId, modeName: m.name, status:'未確認', ...extra}, ...state.inbox].slice(0,200);
  save('inbox');
}
function addRecord(title, detail='', modeId=null, extra={}) {
  const id = modeId || state.activeSession?.modeId || state.day.activeModeId || 'M10';
  const m = modeById[id] || modeById.M10;
  const rec = {id: uid('rec'), at: nowIso(), title, detail, modeId:id, modeName:m.name, ...extra};
  state.records = [rec, ...state.records].slice(0,500);
  addInbox(title, detail, id, {recordId: rec.id});
  return rec;
}

function startMode(modeId) {
  const m = modeById[modeId];
  if (!m) return;
  if (state.activeSession) {
    backup('active-session-switch');
    state.records = [{id:uid('rec'), at:nowIso(), title:'モード中断', detail:modeLabel(state.activeSession.modeId), modeId:state.activeSession.modeId}, ...state.records];
  }
  state.activeSession = {id: uid('session'), modeId, startedAt: nowIso(), status:'active', planId: state.selectedPlanId};
  state.day.activeModeId = modeId;
  addRecord(`${m.name} 開始`, m['開始条件'], modeId);
  closeSheet(); closeModal();
  save('startMode:'+modeId);
  routeTo('day');
}
function finishMode() {
  if (!state.activeSession) return;
  const s = state.activeSession;
  const m = modeById[s.modeId];
  const detail = `${m['思い出へ残す']} / 次回：${m['次回改善へ戻す']}`;
  state.memories = [{id: uid('mem'), at: nowIso(), title:`${m.name} 完了`, detail, modeId:s.modeId}, ...state.memories].slice(0,200);
  state.improvements = [{id: uid('imp'), at: nowIso(), title:`${modeLabel(s.modeId)}から次回改善`, detail:m['次回改善へ戻す'], modeId:s.modeId, status:'候補'}, ...state.improvements].slice(0,120);
  state.records = [{id:uid('rec'), at:nowIso(), title:`${m.name} 完了`, detail:m['完了条件'], modeId:s.modeId}, ...state.records];
  state.activeSession = null;
  save('finishMode');
  render();
}
function pauseMode() {
  if (!state.activeSession) return;
  backup('pause-mode');
  addInbox('中断/復旧候補', modeLabel(state.activeSession.modeId), state.activeSession.modeId);
  state.activeSession = null;
  save('pauseMode');
  render();
}

function advanceFlow() {
  const i = state.day.activeFlowIndex;
  const current = FLOW[i];
  addRecord(`${current.label} 完了候補`, current.short, current.mode);
  state.day.activeFlowIndex = Math.min(FLOW.length - 1, i + 1);
  state.day.activeModeId = FLOW[state.day.activeFlowIndex].mode;
  save('advanceFlow');
  render();
}

function action(type) {
  const [name, value] = String(type).split(':');
  switch(name) {
    case 'goPrep': routeTo('prep'); break;
    case 'goDay': routeTo('day'); break;
    case 'addPlan': addPlan(); break;
    case 'selectPlan': state.selectedPlanId = value; save('selectPlan'); render(); break;
    case 'addCandidate': addCandidate(); break;
    case 'candidateToPlan': candidateToPlan(value); break;
    case 'candidateCompare': addInbox('候補比較メモ', '犬可・温水・景色・距離を比較', 'M02'); render(); break;
    case 'copyShopping': copyShopping(); break;
    case 'setFlow': state.day.activeFlowIndex = Number(value); state.day.activeModeId = FLOW[state.day.activeFlowIndex].mode; save('setFlow'); render(); break;
    case 'advanceFlow': advanceFlow(); break;
    case 'startMode': startMode(value); break;
    case 'openMode': showModeDetail(value); break;
    case 'candidateMode': addInbox(`${modeLabel(value)}候補`, 'あとで確認', value); closeModal(); render(); break;
    case 'capture': mediaInputKind = value; $('#mediaInput').accept = value === 'video' ? 'video/*' : 'image/*'; $('#mediaInput').click(); break;
    case 'voice': voiceMemo(); break;
    case 'quickMemo': quickMemo(); break;
    case 'quickLater': addRecord('あとで確認', '分類せず未確認箱へ', state.activeSession?.modeId || state.day.activeModeId); closeSheet(); render(); break;
    case 'gps': captureGps(); break;
    case 'openMaps': openMaps(); break;
    case 'finishMode': finishMode(); break;
    case 'pauseMode': pauseMode(); break;
    case 'modeAction': addRecord(value, `${modeLabel(state.activeSession?.modeId || state.day.activeModeId)}の操作`, state.activeSession?.modeId || state.day.activeModeId); render(); break;
    case 'acceptInbox': acceptInbox(value); break;
    case 'laterInbox': updateInbox(value,'あとで'); break;
    case 'rejectInbox': updateInbox(value,'違う'); break;
    case 'applyImprove': applyImprove(value); break;
    case 'holdImprove': holdImprove(value); break;
    case 'testReset': testReset(); break;
    case 'restoreBackup': restoreBackup(); break;
    case 'closeSheet': closeSheet(); break;
    case 'closeModal': closeModal(); break;
    case 'openAllModes': closeSheet(); showAllModes(); break;
    case 'showMvp': showMvp(value); break;
    default: console.log('unknown action', type);
  }
}
function addPlan() {
  const title = prompt('予定名', '次回キャンプ');
  if (!title) return;
  const campground = prompt('キャンプ場', 'キャンプ場未設定') || '未設定';
  const plan = {id: uid('plan'), title, campground, dateText:'日程未設定', people:'夫婦＋コタ', status:'予定候補'};
  state.plans = [plan, ...state.plans];
  state.selectedPlanId = plan.id;
  save('addPlan'); render();
}
function addCandidate() {
  const title = prompt('候補名', '犬可キャンプ場候補');
  if (!title) return;
  state.candidates = [{id:uid('cand'), title, dog:'犬可確認', warm:'温水未確認', view:'景色メモ', distance:'距離未確認', status:'候補'}, ...state.candidates];
  save('addCandidate'); render();
}
function candidateToPlan(id) {
  const c = state.candidates.find(x=>x.id===id);
  if (!c) return;
  const plan = {id: uid('plan'), title:c.title, campground:c.title, dateText:'候補から予定化', people:'夫婦＋コタ', status:'予定候補'};
  state.plans = [plan, ...state.plans];
  state.selectedPlanId = plan.id;
  addInbox('候補を予定化', c.title, 'M02');
  save('candidateToPlan'); routeTo('home');
}
function copyShopping() {
  const lines = ['OUTBASE買い物リスト'];
  PREP_SECTIONS.find(s=>s.id==='shopping').items.forEach(item => lines.push('□ ' + item));
  navigator.clipboard?.writeText(lines.join('\n'));
  addInbox('LINE買物コピー', '買物リストをコピーしました', 'M05');
  render();
}
function quickMemo() {
  const text = prompt('メモを残す');
  if (!text) return;
  addRecord('メモ', text, state.activeSession?.modeId || state.day.activeModeId);
  closeSheet(); render();
}
function voiceMemo() {
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  const modeId = state.activeSession?.modeId || state.day.activeModeId;
  if (!Speech) {
    const t = prompt('音声認識未対応です。メモとして残す');
    if (t) addRecord('音声メモ', t, modeId);
    closeSheet(); render();
    return;
  }
  const rec = new Speech();
  rec.lang = 'ja-JP';
  rec.interimResults = false;
  rec.onresult = e => { addRecord('音声メモ', e.results?.[0]?.[0]?.transcript || '', modeId); closeSheet(); render(); };
  rec.onerror = () => { addInbox('音声失敗', 'もう一度試す', modeId); render(); };
  rec.start();
  $('#appStatus').textContent = '話してください';
}
function captureGps() {
  const modeId = state.activeSession?.modeId || state.day.activeModeId;
  if (!navigator.geolocation) { addInbox('GPS取得不可','位置情報が使えません',modeId); render(); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    const detail = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)} / ±${Math.round(pos.coords.accuracy)}m`;
    addRecord('現在地', detail, modeId, {lat:pos.coords.latitude,lng:pos.coords.longitude});
    closeSheet(); render();
  }, () => { addInbox('GPS取得失敗','権限を確認',modeId); render(); }, {enableHighAccuracy:true, timeout:10000, maximumAge:10000});
}
function openMaps() {
  const p = selectedPlan();
  const q = encodeURIComponent(p.campground || 'キャンプ場');
  addRecord('Google Maps起動', p.campground || '目的地未設定', state.activeSession?.modeId || 'M12');
  window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank', 'noopener');
}
function acceptInbox(id) {
  const item = state.inbox.find(x=>x.id===id);
  if (!item) return;
  state.memories = [{id:uid('mem'), at:nowIso(), title:item.title, detail:item.detail, modeId:item.modeId}, ...state.memories];
  state.inbox = state.inbox.filter(x=>x.id!==id);
  save('acceptInbox'); render();
}
function updateInbox(id, status) {
  state.inbox = state.inbox.map(x => x.id===id ? {...x, status} : x);
  save('updateInbox'); render();
}
function applyImprove(id) {
  const item = state.improvements.find(x=>x.id===id);
  if (!item) return;
  state.prep.shopping = state.prep.shopping || [];
  state.prep.shopping.push({id:uid('prep'), text:item.title + '：' + item.detail, at:nowIso()});
  state.improvements = state.improvements.map(x => x.id===id ? {...x, status:'準備へ反映候補'} : x);
  save('applyImprove'); render();
}
function holdImprove(id) {
  state.improvements = state.improvements.map(x => x.id===id ? {...x, status:'保留'} : x);
  save('holdImprove'); render();
}
function testReset() {
  if (!confirm('テスト記録・未確認・改善候補だけリセットします。予定/準備/過去バックアップは守ります。')) return;
  backup('test-reset');
  state.trash = [{id:uid('trash'), at:nowIso(), reason:'testReset', records:state.records, inbox:state.inbox}, ...state.trash].slice(0,10);
  state.records = [];
  state.inbox = [];
  state.improvements = [];
  state.activeSession = null;
  save('testReset'); render();
}
function restoreBackup() {
  const b = state.backups[0];
  if (!b) { alert('復元できるバックアップがありません'); return; }
  if (!confirm('直前バックアップを復元しますか？')) return;
  const restored = JSON.parse(b.snapshot);
  state = normalize(restored);
  save('restoreBackup'); render();
}
function showAllModes() {
  showModeDetail('M01');
  const modal = $('#modeModal .modal-panel');
  modal.innerHTML = `<div class="section-head"><h3>全47モード</h3><button class="link" data-action="closeModal">閉じる</button></div>
    <p class="lead">モード名だけではなく、中身・自動記録・連携・復旧・思い出・次回改善まで保持。</p>
    <div class="mode-list all">${MODES.map(m => `<button data-action="openMode:${m.id}"><strong>${m.id} ${esc(m.name)}</strong><span>${esc(m['役割'])}</span></button>`).join('')}</div>`;
  bind(modal);
}
function showMvp(no) {
  const item = MVP23.find(x => x.no === no);
  if (!item) return;
  let modal = $('#modeModal');
  if (!modal) { modal = document.createElement('div'); modal.id='modeModal'; modal.className='modal'; document.body.appendChild(modal); }
  modal.innerHTML = `<div class="modal-backdrop" data-action="closeModal"></div><section class="modal-panel">
    <div class="section-head"><h3>MVP${esc(item.no)} ${esc(item.title)}</h3><button class="link" data-action="closeModal">閉じる</button></div>
    <p class="lead">${esc(item.desc)}</p>
    <div class="detail-grid"><article><span>対応モード</span><strong>${esc(item.mode)}</strong></article><article><span>扱い</span><strong>画面/保存/未確認/次回改善へ接続</strong></article></div>
  </section>`;
  modal.classList.add('open'); bind(modal);
}
function handleMediaFile(file) {
  if (!file) return;
  const modeId = state.activeSession?.modeId || state.day.activeModeId;
  const reader = new FileReader();
  reader.onload = () => {
    addRecord(mediaInputKind === 'video' ? '動画' : '写真', file.name, modeId, {mediaName:file.name, preview: mediaInputKind === 'photo' ? reader.result : ''});
    closeSheet(); render();
  };
  reader.readAsDataURL(file);
}
function bind(root=document) {
  $$('[data-action]', root).forEach(el => {
    if (el.dataset.bound) return;
    el.dataset.bound = '1';
    el.addEventListener('click', e => { e.preventDefault(); action(el.dataset.action); });
  });
  $$('[data-route]', root).forEach(el => {
    if (el.dataset.navBound) return;
    el.dataset.navBound = '1';
    el.addEventListener('click', () => routeTo(el.dataset.route));
  });
  $$('[data-prep-key]', root).forEach(el => {
    if (el.dataset.prepBound) return;
    el.dataset.prepBound = '1';
    el.addEventListener('change', () => { state.prep.checks[el.dataset.prepKey] = el.checked; save('prep-check'); render(); });
  });
  $$('[data-prep-memo]', root).forEach(el => {
    if (el.dataset.memoBound) return;
    el.dataset.memoBound = '1';
    el.addEventListener('change', () => {
      const k = el.dataset.prepMemo;
      state.prep[k] = {...(state.prep[k] || {}), memo: el.value};
      save('prep-memo');
    });
  });
}
function installEvents() {
  $('#captureFab').addEventListener('click', renderCaptureSheet);
  $('#mediaInput').addEventListener('change', e => handleMediaFile(e.target.files?.[0]));
  window.addEventListener('online', () => { state.settings.offline='オンライン'; save('online'); render(); });
  window.addEventListener('offline', () => { state.settings.offline='オフライン保存'; save('offline'); render(); });
  setInterval(() => { if (state.activeSession && state.route === 'day') render(); }, 15000);
}

document.addEventListener('DOMContentLoaded', () => {
  document.body.dataset.build = BUILD_ID;
  installEvents();
  render();
});
