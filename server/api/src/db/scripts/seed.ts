import { serverDatabaseSeeds } from '../seeds.js';
import { connectServerDatabase, runServerSeeds } from '../runner.js';

async function main(): Promise<void> {
  const client = await connectServerDatabase();

  try {
    const latestSeedId = await runServerSeeds(client, serverDatabaseSeeds);

    console.info(
      JSON.stringify({
        latestSeedId,
      }),
    );
  } finally {
    await client.end();
  }
}

void main();
