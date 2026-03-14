import { serverDatabaseMigrations } from '../manifest.js';
import { applyServerMigrations, connectServerDatabase } from '../runner.js';

async function main(): Promise<void> {
  const client = await connectServerDatabase();

  try {
    const manifestHash = await applyServerMigrations(
      client,
      serverDatabaseMigrations,
    );

    console.info(
      JSON.stringify({
        latestMigrationId:
          serverDatabaseMigrations[serverDatabaseMigrations.length - 1]?.id ??
          null,
        manifestHash,
      }),
    );
  } finally {
    await client.end();
  }
}

void main();
