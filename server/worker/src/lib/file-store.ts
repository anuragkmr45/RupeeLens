import {
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

export function readJsonFile<T>(filePath: string, fallbackValue: T): T {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return fallbackValue;
    }

    throw error;
  }
}

export function writeJsonFile(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), {
    recursive: true,
  });

  const tempFile = `${filePath}.${process.pid}.tmp`;

  try {
    writeFileSync(tempFile, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    renameSync(tempFile, filePath);
  } catch (error) {
    try {
      unlinkSync(tempFile);
    } catch (cleanupError) {
      if ((cleanupError as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw cleanupError;
      }
    }

    throw error;
  }
}
