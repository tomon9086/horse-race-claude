---
name: fetch-race-results
description: "netkeibaのレース成績を取得して着順・払戻金などを構造化データとして出力する"
argument-hint: "<race_id (12桁)>"
allowed-tools: ["Bash(npx tsx *)"]
---

# レース成績取得スキル

netkeibaのrace_idを受け取り、着順・払戻金・タイム・コーナー通過順位を構造化して出力します。

## 使い方

1. ユーザからrace_idを受け取る
2. race_idが12桁の数字であることを確認する
   - 一致しない場合は **コマンドを実行せず**、「race_idは12桁の数字で指定してください。（例: `202605021211`）」とエラーを返して終了する
3. `npx tsx src/fetch-netkeiba-results.ts "$ARGUMENTS"` を実行する
4. 結果をそのまま出力する

## 出力内容

- 着順表（馬番・馬名・騎手・タイム・着差・コーナー通過順・上り3F・馬体重・人気）
- 払戻金一覧（単勝・複勝・枠連・ワイド・馬連・馬単・3連複・3連単）
- コーナー通過順位

## 引数

`$ARGUMENTS` にはnetkeibaのrace_idが入ります。指定されていない場合はユーザに確認してください。
