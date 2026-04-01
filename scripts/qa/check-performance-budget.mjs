import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ANDROID_BUNDLE_DIR = path.join(
  process.cwd(),
  'client',
  'dist',
  '_expo',
  'static',
  'js',
  'android',
);
const ANDROID_BUNDLE_MAX_BYTES = 2_600_000;

const bundleFiles = readdirSync(ANDROID_BUNDLE_DIR).filter((fileName) =>
  fileName.endsWith('.hbc'),
);

if (bundleFiles.length === 0) {
  console.error(`No Android Hermes bundle found in ${ANDROID_BUNDLE_DIR}`);
  process.exit(1);
}

const bundles = bundleFiles.map((fileName) => {
  const filePath = path.join(ANDROID_BUNDLE_DIR, fileName);

  return {
    fileName,
    sizeBytes: statSync(filePath).size,
  };
});

bundles.sort((left, right) => right.sizeBytes - left.sizeBytes);

const largestBundle = bundles[0];

if (!largestBundle) {
  console.error(`No readable Android Hermes bundle found in ${ANDROID_BUNDLE_DIR}`);
  process.exit(1);
}

console.log(
  `Largest Android Hermes bundle: ${largestBundle.fileName} (${largestBundle.sizeBytes} bytes)`,
);

if (largestBundle.sizeBytes > ANDROID_BUNDLE_MAX_BYTES) {
  console.error(
    `Android Hermes bundle exceeds repo-side QA-003 budget of ${ANDROID_BUNDLE_MAX_BYTES} bytes.`,
  );
  process.exit(1);
}

console.log(
  `Android Hermes bundle is within the repo-side QA-003 budget of ${ANDROID_BUNDLE_MAX_BYTES} bytes.`,
);
