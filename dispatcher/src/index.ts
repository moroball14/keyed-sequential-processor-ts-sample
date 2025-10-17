import express from 'express';
import { Redis } from 'ioredis';
import axios from 'axios';
import { ENQUEUE_AND_TRY_LOCK } from './redisScripts';

const app = express();
app.use(express.json());

const {
  PORT = 8080,
  REDIS_HOST = 'localhost',
  WORKER_URL = 'http://localhost:8081',
} = process.env;

const redis = new Redis({ host: REDIS_HOST, port: 6379 });

app.post('/', async (req, res) => {
  try {
    if (!req.body || !req.body.message) {
      console.warn('Invalid Pub/Sub message received');
      return res.status(400).send('Bad Request: Invalid Pub/Sub message format');
    }

    const pubsubMessage = req.body.message;
    const eventData = Buffer.from(pubsubMessage.data, 'base64').toString('utf8');
    const eventId = pubsubMessage.attributes?.eventId;

    if (!eventId) {
      console.warn('Message without eventId attribute received');
      return res.status(400).send('Bad Request: "eventId" attribute is required.');
    }

    console.log(`[Dispatcher] Received event for ID: ${eventId}`);

    // アトミックにエンキューとロック取得を実行
    const result = await redis.eval(
      ENQUEUE_AND_TRY_LOCK,
      2,
      `queue:${eventId}`,
      `lock:${eventId}`,
      eventData,
      '3600'
    ) as [string, boolean];

    const [_action, lockAcquired] = result;

    if (lockAcquired) {
      console.log(`[Dispatcher] Lock acquired for ${eventId}. Invoking worker.`);
      // 非同期でWorkerを起動 (完了は待たない)
      axios.post(WORKER_URL, { eventId }).catch(err => {
        console.error(`[Dispatcher] Failed to invoke worker for ${eventId}. Releasing lock.`, err.message);
        redis.del(`lock:${eventId}`);
      });
    } else {
      console.log(`[Dispatcher] Lock for ${eventId} is already held. Event queued.`);
    }

    res.status(204).send();
  } catch (error) {
    console.error('[Dispatcher] An unexpected error occurred:', error);
    res.status(500).send();
  }
});

app.listen(PORT, () => console.log(`[Dispatcher] Service listening on port ${PORT}`));