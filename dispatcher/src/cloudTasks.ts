import { CloudTasksClient } from '@google-cloud/tasks';
import { credentials } from '@grpc/grpc-js';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'local-project';
const LOCATION = 'us-central1';
const QUEUE_NAME = 'worker-queue';

export class CloudTasksManager {
  private client: CloudTasksClient;
  private queuePath: string;

  constructor() {
    const emulatorHost = process.env.CLOUD_TASKS_EMULATOR_HOST;
    
    if (emulatorHost) {
      // エミュレーター用の設定
      const [host, port] = emulatorHost.split(':');
      this.client = new CloudTasksClient({
        port: parseInt(port, 10),
        servicePath: host,
        sslCreds: credentials.createInsecure(),
        // エミュレーター用に認証を無効化
        auth: {
          getClient: () => Promise.resolve({
            getAccessToken: () => Promise.resolve({ token: 'fake-token' }),
            getUniverseDomain: () => Promise.resolve('googleapis.com'),
            getProjectId: () => Promise.resolve(PROJECT_ID),
          } as any),
          getUniverseDomain: () => Promise.resolve('googleapis.com'),
          getProjectId: () => Promise.resolve(PROJECT_ID),
        } as any,
      });
    } else {
      // 本番環境用の設定
      this.client = new CloudTasksClient();
    }

    this.queuePath = this.client.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME);
  }

  async createWorkerTask(eventId: string, workerUrl: string): Promise<void> {
    const serviceAccountEmail = "account@project_id.iam.gserviceaccount.com"
    const task = {
      httpRequest: {
        httpMethod: 'POST' as const,
        url: workerUrl,
        headers: {
          'Content-Type': 'application/json',
        },
        body: Buffer.from(JSON.stringify({ eventId })),
        oidcToken: {
            serviceAccountEmail,
        },
      },
    };

    try {
      const [response] = await this.client.createTask({
        parent: this.queuePath,
        task,
      });
      console.log(`[CloudTasks] Task created for eventId: ${eventId}, task name: ${response.name}`);
    } catch (error) {
      console.error(`[CloudTasks] Failed to create task for eventId: ${eventId}`, error);
      throw error;
    }
  }
}