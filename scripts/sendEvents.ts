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
  });
  console.log(`Published message ${messageId} for event ID ${eventId}`);
}

async function main() {
  console.log('Sending a batch of test events...');

  const events = [
    { id: 'AAAAAAAA', data: { step: 1 } },
    { id: 'BBBBBBBB', data: { step: 1 } },
    { id: 'AAAAAAAA', data: { step: 2 } },
    { id: 'CCCCCCCC', data: { step: 1 } },
    { id: 'BBBBBBBB', data: { step: 2 } },
    { id: 'AAAAAAAA', data: { step: 3 } },
    { id: 'BBBBBBBB', data: { step: 3 } },
  ];

  for (const event of events) {
    await publishEvent(event.id, event.data);
  }

  console.log('All test events sent.');
}

main().catch(console.error);