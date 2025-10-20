import { PubSub } from '@google-cloud/pubsub';

const TOPIC_NAME = 'events-topic';

const pubsub = new PubSub({
  projectId: 'local-project',
  apiEndpoint: 'pubsub-emulator:8085',
});

async function publishEvent(eventId: string, data: object) {
  const dataBuffer = Buffer.from(JSON.stringify(data));
  const messageId = await pubsub.topic(TOPIC_NAME).publishMessage({
    data: dataBuffer,
    attributes: { eventId },
    orderingKey: eventId,
  });
  console.log(`Published message ${messageId} for event ID ${eventId}`);
}

async function main() {
  console.log('Sending a batch of test events...');

  // AAAAAAAA と BBBBBBBB を 50 件ずつ
  const events = ['AAAAAAAA', 'BBBBBBBB'].flatMap(id => Array.from({ length: 50 }, (_, i) => ({ id, data: { step: i + 1 } })));

  for (const event of events) {
    await publishEvent(event.id, event.data);
  }

  console.log('All test events sent.');
}

main().catch(console.error);