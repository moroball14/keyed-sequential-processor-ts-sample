import { PubSub } from '@google-cloud/pubsub';
import { CloudTasksClient } from '@google-cloud/tasks';
import { credentials } from '@grpc/grpc-js';

const TOPIC_NAME = 'events-topic';
const SUBSCRIPTION_NAME = 'events-subscription-dispatcher';
const PUSH_ENDPOINT = 'http://dispatcher:8080/';

const PROJECT_ID = 'local-project';
const LOCATION = 'us-central1';
const QUEUE_NAME = 'worker-queue';

async function setupPubSub() {
  const pubsub = new PubSub({
    projectId: PROJECT_ID,
  });

  console.log('Setting up Pub/Sub resources...');

  // トピックの作成
  try {
    await pubsub.createTopic(TOPIC_NAME);
    console.log(`Topic ${TOPIC_NAME} created.`);
  } catch (error: any) {
    if (error.code === 6) {
      console.log(`Topic ${TOPIC_NAME} already exists.`);
    } else {
      throw error;
    }
  }

  try {
    await pubsub.topic(TOPIC_NAME).createSubscription(SUBSCRIPTION_NAME, {
      enableMessageOrdering: true, // メッセージ順序付けを有効化。配信順序のみの保証だけどそれさえできれば後の順序制御は Redis に任せる
      pushEndpoint: PUSH_ENDPOINT,
    });
    console.log(`Subscription ${SUBSCRIPTION_NAME} created.`);
  } catch (error: any) {
    if (error.code === 6) {
      console.log(`Subscription ${SUBSCRIPTION_NAME} already exists.`);
    } else {
      throw error;
    }
  }
}

async function setupCloudTasks() {
  console.log('Setting up Cloud Tasks resources...');
  
  const emulatorHost = process.env.CLOUD_TASKS_EMULATOR_HOST;
  if (!emulatorHost) {
    console.log('CLOUD_TASKS_EMULATOR_HOST not set, skipping Cloud Tasks setup');
    return;
  }

  const [host, port] = emulatorHost.split(':');
  const client = new CloudTasksClient({
    port: parseInt(port, 10),
    servicePath: host,
    sslCreds: credentials.createInsecure(),
  });

  const parent = client.locationPath(PROJECT_ID, LOCATION);
  const queuePath = client.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME);

  try {
    // キューを作成
    const [queue] = await client.createQueue({
      parent,
      queue: {
        name: queuePath,
        rateLimits: {
          maxDispatchesPerSecond: 100,
        },
        retryConfig: {
          maxAttempts: 3,
        },
      },
    });
    console.log(`Queue ${QUEUE_NAME} created:`, queue.name);
  } catch (error: any) {
    if (error.code === 6) {
      console.log(`Queue ${QUEUE_NAME} already exists.`);
    } else {
      console.error('Error creating queue:', error);
      throw error;
    }
  }
}

async function main() {
  await setupPubSub();
  await setupCloudTasks();
  console.log('Setup complete!');
}

main().catch(console.error);