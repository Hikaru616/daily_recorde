# STRATA プロジェクト構成

## 概要

STRATA は、日々の取り組みを一日一行で記録し、月ごとの進捗をブロックの幅と色で可視化するアプリケーションです。ReactクライアントはExpress APIを呼び、記録はMySQLへ保存されます。

主な技術は React 19、TypeScript、Vite、Motion、Lucide React、Express、MySQL、Docker Composeです。

## ディレクトリツリー

```text
daily_recorde/
├── .gitignore              # 依存、ビルド成果物、ローカル設定の除外指定
├── index.html              # Vite のHTMLエントリーポイント
├── package.json            # 依存パッケージとnpmスクリプト
├── package-lock.json       # npmの依存バージョン固定
├── tsconfig.json           # TypeScript設定
├── vite.config.ts          # 開発時のAPIプロキシ
├── Dockerfile              # フロントビルドと本番APIイメージ
├── compose.yaml            # アプリとMySQL、永続ボリューム
├── server/
│   ├── index.js            # REST API、本番静的ファイル配信
│   ├── database.js         # MySQLスキーマ、読込、保存
│   └── validation.js       # API入力検証
├── README.md               # アプリの機能、起動方法、制約
├── PROJECT_STRUCTURE.md    # 本ファイル
└── src/
    ├── main.tsx            # React起動、画面構成、状態管理、操作フロー
    ├── model.ts            # データ型、評価計算、検証、サンプルデータ
    ├── storage.ts          # APIへの読み書きと旧IndexedDB移行
    ├── colors.ts           # カテゴリーとポイントに応じた色の計算
    ├── Tower.tsx           # 進捗ブロック列とツールチップ
    ├── Categories.tsx      # カテゴリー作成・編集・削除UI
    ├── model.test.ts       # データモデルと検証のテスト
    ├── colors.test.ts      # 色計算のテスト
    ├── style.css           # 基本レイアウト、フォーム、共通部品
    ├── space.css           # 宇宙テーマと画面別スタイル
    ├── compact.css         # 月全体を画面内に収めるレイアウト
    └── categories.css      # カテゴリーUIとブロックの発光表現
```

`node_modules/` とビルド成果物の `dist/` は `.gitignore` の対象です。

## 実行時の構成

```text
ブラウザ
└── src/main.tsx（App）
    ├── Tower.tsx
    │   ├── model.ts
    │   └── colors.ts ── model.ts
    ├── Categories.tsx
    │   ├── model.ts
    │   └── colors.ts
    ├── storage.ts ── model.ts ── /api/data
    └── CSS（style → space → compact → categories の順に読込）

server/index.js（Express）
└── server/database.js ── MySQL
                         ├── projects
                         ├── categories
                         ├── entries
                         └── app_metadata
```

- `index.html` の `#root` に `main.tsx` が React アプリをマウントします。
- `main.tsx` の `App` が月間表示、日別詳細、記録フォーム、プロジェクト画面、カテゴリー管理、JSON入出力をまとめて制御します。
- 永続化の入口は `storage.ts` の `repository` に限定されています。
- データの作成・読込・インポート時には `model.ts` の型と `validate()` が共通の基準になります。
- CSS は後から読み込まれるファイルが前の定義を上書きする設計です。特に `space.css` が基本テーマをダークな宇宙テーマへ変更し、`compact.css` が月間画面の寸法を調整します。

## 各ソースの責務

### `src/main.tsx`

アプリケーションの統合層です。主に次を担当します。

- MySQL APIからの初期読込と、変更内容を保存してから画面状態へ反映する `commit()`
- 月移動、日付選択、月間集計、日別詳細
- 記録の追加・編集・削除
- プロジェクトの作成、選択、関連記録の履歴表示
- カテゴリー管理モーダルと記録フォームの行き来
- サンプルデータと利用者データの表示切替
- JSONのエクスポートと、検証・確認を伴う全置換インポート
- ダイアログ、トースト、エラー、レスポンシブ詳細シートの状態管理

現在はルーティングライブラリを使わず、`view` と `modal` の状態で表示を切り替えています。

### `src/model.ts`

UIや保存方式に依存しないドメイン層です。

| 要素 | 役割 |
| --- | --- |
| `Entry` | 1件の進捗記録。日付、内容、深さ、進捗、メモ、数量、プロジェクト・カテゴリー参照を持つ |
| `Project` | 複数の記録をまとめるプロジェクト |
| `Category` | 記録の分類名と基準色 |
| `Data` | 保存データ全体。現在のスキーマはバージョン2 |
| `weight()` | 深さと進捗から1件のポイントを算出 |
| `sum()` | 記録配列のポイントを合計 |
| `validate()` | JSON構造、値域、ID重複、参照整合性などを検証し、v1をv2へ移行 |
| `sample()` | 指定月の閲覧用サンプルデータを生成 |
| `localDate()` | Asia/Tokyo基準の当日を返す |

ポイントの計算式は次のとおりです。

```text
weight = 1 + 0.8 × (depth - 1) + 0.5 × progress
```

### `src/storage.ts`

MySQL APIを扱う保存アダプターです。

- API: `GET /api/data` / `PUT /api/data`
- 公開API: `repository.load()` / `repository.save()`
- APIが空の場合のみ、旧 `strata-v1` IndexedDBの `main` データを読み、MySQLへ自動移行

読込後と保存前の両方で `validate()` を通します。API側も入力を再検証し、MySQLトランザクション完了後に成功を返します。

### `server/`

`index.js` はヘルスチェックとデータAPIを提供し、本番では `dist/` も配信します。`database.js` は起動時にテーブルを作成し、プロジェクト・カテゴリー・記録をリレーショナルテーブルへ保存します。`app_metadata` の有無で「未初期化」と「保存済みの空データ」を区別します。

### `src/colors.ts`

カテゴリーの基準色をHSLへ変換し、ポイントが高いほど明度を下げて濃く見せます。カテゴリーIDが空、または見つからない場合は「未分類」の色へフォールバックします。

### `src/Tower.tsx`

記録を横並びの角丸ブロックとして描画する共用コンポーネントです。

- 月共通の尺度に対するポイント比で幅を決定
- カテゴリーとポイントから背景色・発光色を決定
- ホバー、フォーカス、クリック時のツールチップ
- 再生時の順次表示アニメーション
- `prefers-reduced-motion` への対応
- 月間行と日別詳細の2サイズに対応

### `src/Categories.tsx`

カテゴリー管理に限定したフォームコンポーネントです。カテゴリーの一覧、作成、編集、削除、プリセット色・自由色の選択、ポイント別の濃淡プレビューを提供します。実際の保存処理は親の `main.tsx` からコールバックで受け取ります。

## データの流れ

### 起動時

1. `main.tsx` が `repository.load()` を呼びます。
2. `storage.ts` が `GET /api/data` を呼びます。
3. APIが未初期化なら同一オリジンの旧IndexedDBを確認し、見つかればMySQLへ移行します。
4. `model.ts` の `validate()` が形式を検証します。
5. 保存データがあれば利用者データを、なければ閲覧専用サンプルを表示します。

### 更新時

1. フォーム操作から次の `Data` オブジェクトを作ります。
2. `commit()` が `repository.save()` を呼びます。
3. APIの検証とMySQLトランザクションが完了した後、Reactの状態を更新します。
4. 失敗した場合は従来の画面状態を維持し、エラーを表示します。

### JSON復元時

インポートするファイルは5MB以下に制限され、JSON解析後に `validate()` を通します。利用者の確認後、現在のデータを全置換します。エクスポートは表示中の全データを整形済みJSONとして保存します。

## スタイルの分担

| ファイル | 主な範囲 |
| --- | --- |
| `style.css` | リセット、基本レイアウト、ナビゲーション、月間・詳細・プロジェクト・ダイアログ・フォーム |
| `space.css` | ダーク配色、星空背景、宇宙テーマ、画面幅ごとの見た目の上書き |
| `compact.css` | 28〜31日の行をビューポート内へ収める寸法、進捗ブロック、モバイル詳細シート |
| `categories.css` | カテゴリー管理、色見本、カテゴリー表示、ブロックの発光アニメーション |

スタイルを変更するときは、同じセレクターが複数ファイルに存在し得ることと、`main.tsx` のimport順を確認してください。

## テストとコマンド

```sh
npm ci          # package-lock.jsonどおりに依存関係をインストール
npm run dev     # Express APIとVite開発サーバーを同時起動
npm test        # モデル、色、API入力検証のテストを実行
npm run build   # TypeScript型チェック後にViteの本番ビルドを作成
docker compose up --build -d # アプリとMySQLを起動
```

`model.test.ts` はポイント計算、集計、入力検証、参照整合性、v1からv2への移行、大量データを確認します。`colors.test.ts` はカテゴリー内での色相維持、ポイントに応じた濃淡、未分類へのフォールバックを確認します。

## 変更箇所の目安

| 変更したい内容 | 主な変更先 |
| --- | --- |
| 保存データの項目やスキーマ | `model.ts`、`model.test.ts`、`main.tsx` |
| 保存先や永続化方法 | `storage.ts`、`server/database.js`、`compose.yaml` |
| ポイントの計算方法 | `model.ts`、`model.test.ts` |
| カテゴリー色の算出方法 | `colors.ts`、`colors.test.ts` |
| 月間・日別ブロックの描画 | `Tower.tsx`、`compact.css`、`categories.css` |
| カテゴリー管理画面 | `Categories.tsx`、`categories.css`、`main.tsx` |
| 記録・プロジェクト・データ管理の画面 | `main.tsx`、`style.css`、`space.css` |
| レスポンシブ表示 | `compact.css`、`space.css` |
| アプリ名やHTMLメタ情報 | `index.html` |

保存スキーマを変更する場合は、既存データを失わないよう `validate()` に移行処理を追加し、旧バージョンのテストも合わせて更新する必要があります。
