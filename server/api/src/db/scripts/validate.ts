import { serverDatabaseExpectedTables, serverDatabaseMigrations } from '../manifest.js';
import {
  applyServerMigrations,
  connectServerDatabase,
  listServerTables,
  readServerMetadata,
  resetServerDatabase,
  runServerSeeds,
  waitForServerDatabase,
} from '../runner.js';
import { serverDatabaseSeeds } from '../seeds.js';

async function main(): Promise<void> {
  await waitForServerDatabase();

  const client = await connectServerDatabase();

  try {
    await resetServerDatabase(client);

    const firstManifestHash = await applyServerMigrations(
      client,
      serverDatabaseMigrations,
    );
    const firstSeedId = await runServerSeeds(client, serverDatabaseSeeds);
    const secondManifestHash = await applyServerMigrations(
      client,
      serverDatabaseMigrations,
    );
    const secondSeedId = await runServerSeeds(client, serverDatabaseSeeds);
    const metadata = await readServerMetadata(client);
    const tableNames = await listServerTables(client);

    for (const tableName of serverDatabaseExpectedTables) {
      if (!tableNames.includes(tableName)) {
        throw new Error(`missing expected server table: ${tableName}`);
      }
    }

    if (firstManifestHash !== secondManifestHash) {
      throw new Error('server manifest hash changed between validation passes');
    }

    if (firstSeedId !== secondSeedId) {
      throw new Error('server seed version changed between validation passes');
    }

    if (metadata.get('migration_manifest_hash') !== firstManifestHash) {
      throw new Error('server metadata does not match migration manifest hash');
    }

    if (metadata.get('seed_version') !== firstSeedId) {
      throw new Error('server metadata does not match latest seed id');
    }

    console.info(
      JSON.stringify({
        latestMigrationId:
          serverDatabaseMigrations[serverDatabaseMigrations.length - 1]?.id ??
          null,
        latestSeedId: firstSeedId,
        manifestHash: firstManifestHash,
        tableCount: tableNames.length,
      }),
    );
  } finally {
    await client.end();
  }
}

void main();
