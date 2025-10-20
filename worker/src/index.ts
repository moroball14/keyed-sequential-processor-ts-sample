import express from 'express';
import { Redis } from 'ioredis';
import axios from 'axios';
import { RELEASE_LOCK_AND_CHECK_QUEUE, POP_AND_CHECK_QUEUE } from './redisScripts';

const app = express();
app.use(express.json());

const {
  PORT = 8081,
  REDIS_HOST = 'localhost',
  SELF_URL = 'http://localhost:8081',
} = process.env;

const redis = new Redis({ host: REDIS_HOST, port: 6379 });

const processBusinessLogic = async (eventId: string, data: string) => {
  const processTime = Math.floor(Math.random() * 2000) + 1000; // 1〜3秒のランダムな処理時間
  console.log(`[Worker] START processing for ID: ${eventId}, Data: ${data}. Will take ${processTime}ms.`);
  await new Promise(resolve => setTimeout(resolve, processTime));
  console.log(`[Worker] ✅ FINISHED processing for ID: ${eventId}, Data: ${data}.`);
};

const runWorker = async (eventId: string) => {
  // アトミックにキューからデータを取得し、空の場合はロックを解放
  const popResult = await redis.eval(
    POP_AND_CHECK_QUEUE,
    2,
    `queue:${eventId}`,
    `lock:${eventId}`
  ) as [string, string | null];

  const [popAction, eventData] = popResult;

  if (popAction === 'empty' || eventData === null) {
    console.log(`[Worker] Queue for ${eventId} is empty, but worker was invoked. Lock released by Lua script.`);
    return;
  }

  await processBusinessLogic(eventId, eventData);

  // アトミックにロック解放とキューチェックを実行
  const checkResult = await redis.eval(
    RELEASE_LOCK_AND_CHECK_QUEUE,
    2,
    `queue:${eventId}`,
    `lock:${eventId}`,
    SELF_URL
  ) as [string, number];

  const [checkAction, queueLength] = checkResult;

  if (checkAction === 'continue') {
    console.log(`[Worker] Found ${queueLength} more tasks for ${eventId}. Chaining next worker.`);
    axios.post(SELF_URL, { eventId }).catch(err => {
      console.error(`[Worker] Failed to chain worker for ${eventId}.`, err.message);
    });
  } else {
    console.log(`[Worker] No more tasks for ${eventId}. Lock released.`);
  }
};

app.post('/', (req, res) => {
  const { eventId } = req.body;
  if (!eventId) {
    return res.status(400).send('Bad Request: "eventId" is required.');
  }

  // リクエスト元を待たせないように、すぐにレスポンスを返す
  res.status(202).send('Accepted');

  // レスポンスを返した後に、非同期で処理を開始
  runWorker(eventId).catch(error => {
    console.error(`[Worker] Unhandled error in worker process for ${eventId}:`, error);
  });
});

app.listen(PORT, () => console.log(`[Worker] Service listening on port ${PORT}`));