/// <reference types="node" />

import fs from 'fs';
import path from 'path';

function readRepoFile(...segments: string[]): string {
  return fs.readFileSync(path.resolve(__dirname, ...segments), 'utf8');
}

describe('release config hygiene', () => {
  it('keeps the Android dev-client URL scheme out of the shipping manifest', () => {
    const mainManifest = readRepoFile('../android/app/src/main/AndroidManifest.xml');
    const debugManifest = readRepoFile('../android/app/src/debug/AndroidManifest.xml');

    expect(mainManifest).not.toContain('exp+upi-spend-tracker');
    expect(debugManifest).toContain('exp+upi-spend-tracker');
    expect(debugManifest).toContain('SYSTEM_ALERT_WINDOW');
  });

  it('keeps iOS release plist free of Expo dev-launcher keys', () => {
    const releasePlist = readRepoFile('../ios/UPISpendTracker/Info.Release.plist');

    expect(releasePlist).not.toContain('exp+upi-spend-tracker');
    expect(releasePlist).not.toContain('NSBonjourServices');
    expect(releasePlist).not.toContain('NSLocalNetworkUsageDescription');
    expect(releasePlist).toContain('<string>upispendtracker</string>');
  });
});
