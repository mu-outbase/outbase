OUTBASE 下部ナビ安定化

実機症状
- HOMEでは4項目
- カレンダーを開いた後だけ5項目
- 下部ナビが継続的に点滅
- 保管庫が2段目に落ちる

原因
- MutationObserverが本体再描画と自分自身のDOM変更を監視
- 本体レンダラーと後付け処理が下部ナビを交互に作り直していた
- 項目順とレイアウトが固定されていなかった

修正
- MutationObserverを完全撤去
- 起動完了、ルート変更、pageshow時だけ3回の時限同期
- 下部ナビ順を固定
  ホーム / カレンダー / 追加 / 探す / 保管庫
- CSS Grid 5列を強制
- 中央追加ボタンの特殊配置を解除
- 保管庫の2段落ちを防止
- カレンダーv4.4統合処理は維持

監査
{'MutationObserver残存': False, 'observeAuthoritativeRenderer残存': False, '固定順序あり': True}

構文確認
{'route': 'OK', 'calendar': 'OK', 'sw': 'OK'}
