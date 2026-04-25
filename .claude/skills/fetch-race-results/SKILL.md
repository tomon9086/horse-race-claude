---
name: fetch-race-results
description: "JRAのレース成績ページを取得して着順・払戻金などを構造化データとして出力する"
argument-hint: "<JRAレース成績URL>"
allowed-tools: ["Bash(npx tsx *)"]
---

# レース成績取得スキル

JRA公式サイトのレース成績URLを受け取り、着順・払戻金・タイム・コーナー通過順位を構造化して出力します。

## 使い方

1. ユーザからJRAレース成績のURLを受け取る
2. URLが以下のパターンに一致するか確認する:
   - `https://jra.jp/datafile/seiseki/replay/\d{4}/\d+\.html`
   - 一致しない場合は **コマンドを実行せず**、「レース成績のURLではありません。JRAのレース成績URL（例: `https://jra.jp/datafile/seiseki/replay/2026/043.html`）を指定してください。」とエラーを返して終了する
3. `npx tsx src/fetch-results.ts "$ARGUMENTS"` を実行する
4. 結果をそのまま出力する

## 出力内容

- 着順表（馬番・馬名・騎手・タイム・着差・コーナー通過順・上り3F・馬体重・人気）
- 払戻金一覧（単勝・複勝・枠連・ワイド・馬連・馬単・3連複・3連単）
- ハロンタイム・上り
- コーナー通過順位

## 引数

`$ARGUMENTS` にはJRAのレース成績URLが入ります。URLが指定されていない場合はユーザに確認してください。
