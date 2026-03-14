import { connectServerDatabase, resetServerDatabase } from '../runner.js';

async function main(): Promise<void> {
  const client = await connectServerDatabase();

  try {
    await resetServerDatabase(client);
    console.info(JSON.stringify({ reset: true }));
  } finally {
    await client.end();
  }
}

void main();
