import { PubSub } from '@google-cloud/pubsub';

const TOPIC_NAME = 'events-topic';
const SUBSCRIPTION_NAME = 'events-subscription-dispatcher';
const PUSH_ENDPOINT = 'http://dispatcher:8080/';

async function main() {
  const pubsub = new PubSub({
    projectId: 'local-project',
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

  console.log('Setup complete!');
}

main().catch(console.error);