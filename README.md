## 概要

ID（キー）に基づいてイベントをグループ化し、異なる ID 間では並列に、同じ ID 内では到着順に直列で処理を行う、ステートフルなイベント処理システムのサンプルプロジェクト

- ordering key と Redis のキュー機構を組み合わせて同一キーのイベントを順次処理するサンプル実装
- Redis のキュー機構で atomic な操作を実現するために Lua スクリプトを使用

## アーキテクチャ

1. Dispatcher: 全てのイベントを受け取り、ID に基づいて Redis 内の適切なキューに格納する。もしその ID の処理が実行されていなければ、Worker を起動する。
2. Worker: 担当する ID のキューからイベントを 1 つ取り出して処理。処理完了後、キューにまだイベントが残っていれば次の Worker を非同期で起動。
3. Redis: ID ごとのイベントキューと、処理中であることを示すロック情報を保持する、システムの状態管理の役割を担う。

```mermaid
graph TD
    Client[イベント発行元] --> PubSub[① Pub/Sub Topic]
    PubSub -- 1.Push配信 --> Dispatcher[② Dispatcher Service - Cloud Run]
    Dispatcher -- 2.Lock確認 & キュー追加 --> Redis[③ Memorystore for Redis]
    Dispatcher -- 3.Worker起動 (HTTP Request) --> Worker[④ Worker Service - Cloud Run]
    Worker -- 4.キューからイベント取得 --> Redis
    Worker -- 5.ビジネスロジック実行 --> Logic((処理完了))
    Worker -- 6.次のイベントがあれば自身を再起動 --> Worker
    Worker -- 7.キューが空ならLock解除 --> Redis
```

## Setup

```bash
npm install && \
npm install --prefix worker && \
npm install --prefix dispatcher
```

## 動作確認

ローカル環境の構築

```bash
docker compose up --build -d
docker compose run --rm setup
```

イベント送信

```bash
docker compose run --rm send
```

worker と dispatcher のログを確認

```bash
docker compose logs -f worker dispatcher
```

send によって、worker と dispatcher にログが出力されることを確認

## プロジェクト構成

```text
keyed-sequential-processor-ts-sample/
├── dispatcher/         # イベントを受け取り振り分けるサービス
├── worker/             # イベントを実際に処理するサービス
├── scripts/            # ローカル開発用のセットアップ・テストスクリプト
├── docker-compose.yml  # ローカル開発環境の定義
└── package.json        # ルートパッケージ
```
