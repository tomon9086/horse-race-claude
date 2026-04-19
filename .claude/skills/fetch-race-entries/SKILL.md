---
name: fetch-race-entries
description: "JRAの出走表を取得して構造化データとして出力する"
argument-hint: "<JRA出馬表URL>"
allowed-tools: ["Bash(npx tsx *)"]
---

# 出走表取得スキル

JRA公式サイトの出馬表URLを受け取り、出走馬の情報を構造化して出力します。

## 使い方

1. ユーザからJRA出馬表のURLを受け取る
2. `npx tsx src/fetch-entries.ts "$ARGUMENTS"` を実行する
3. 結果をそのまま出力する

## URL構造ガイド

- G1レース: `https://www.jra.go.jp/keiba/g1/{レース名}/syutsuba.html`
  - 皐月賞: satsuki, ダービー: derby, オークス: oaks, 宝塚記念: takarazuka
  - 天皇賞春: tennoshospring, 天皇賞秋: tenshoautumn
  - 有馬記念: arima, ジャパンカップ: japancup
  - 桜花賞: ouka, NHKマイルC: nhk, 安田記念: yasuda
  - スプリンターズS: sprinters, マイルCS: milecs
  - 菊花賞: kikka, 秋華賞: shuka, エリザベス女王杯: elizabeth
  - 阪神JF: hanshinJF, 朝日杯FS: asahiFS, ホープフルS: hopeful
  - 中山大障害: nakayamagj, 中山グランドジャンプ: ngj
  - フェブラリーS: february, チャンピオンズC: championscup
  - 高松宮記念: takamatsunomiya, ヴィクトリアマイル: vm

- 今週のレース: `https://www.jra.go.jp/keiba/thisweek/{年}/{MMDD}_N/horse.html`

URLが分からない場合は、https://www.jra.go.jp/keiba/ からリンクを探すか、ユーザに確認してください。

## 引数

`$ARGUMENTS` にはJRAの出馬表URLが入ります。URLが指定されていない場合はユーザに確認してください。
