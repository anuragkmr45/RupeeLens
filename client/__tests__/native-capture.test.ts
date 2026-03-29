import {
  buildRedactedCaptureDebugBundle,
  type NativeCaptureDiagnostics,
} from '../src/features/android-capture/native-capture';

function buildDiagnostics(
  overrides: Partial<NativeCaptureDiagnostics> = {},
): NativeCaptureDiagnostics {
  return {
    allowedSourceAppIds: ['google_pay', 'phonepe'],
    dedupeConfig: {
      exactMatchWindowSeconds: 120,
      fuzzyMatchWindowSeconds: 300,
      merchantSimilarityThreshold: 0.88,
    },
    exactDuplicateCount: 1,
    fuzzyDuplicateCount: 2,
    lastCapture: {
      capturedAtMs: new Date('2026-03-29T09:00:00.000Z').getTime(),
      packageName: 'com.google.android.apps.nbu.paisa.user',
      preview: 'title=Paid Rs 299 text=Corner Store',
      sourceAppId: 'google_pay',
    },
    lastDedupeDecision: {
      amountMinor: 29900,
      dedupeKind: 'exact_duplicate',
      dedupedAtMs: new Date('2026-03-29T09:02:00.000Z').getTime(),
      duplicateCount: 3,
      merchantRaw: 'Corner Store',
      similarityScore: 0.99,
      sourceAppId: 'google_pay',
    },
    listenerPermissionGranted: true,
    recentCaptureLog: [
      {
        captureEventId: 11,
        captureState: 'captured',
        capturedAtMs: new Date('2026-03-29T09:00:00.000Z').getTime(),
        parseStatus: 'success',
        parserId: 'google_pay_v1',
        parserVersion: '1.0.0',
        sourceAppId: 'google_pay',
        totalDuplicateCount: 0,
      },
    ],
    recentParseFailures: [
      {
        captureEventId: 12,
        capturedAtMs: new Date('2026-03-29T09:10:00.000Z').getTime(),
        failureReasonCode: 'merchant_not_found',
        parserTrace: 'generic_upi_v1:merchant_not_found',
        sourceAppId: 'phonepe',
      },
    ],
    serviceAvailable: true,
    storedSnapshotCount: 4,
    supportedParsers: [
      {
        parserId: 'google_pay_v1',
        parserVersion: '1.0.0',
        sourceAppIds: ['google_pay'],
      },
    ],
    ...overrides,
  };
}

describe('buildRedactedCaptureDebugBundle', () => {
  it('omits preview and merchant raw fields from the shared bundle', () => {
    const bundle = buildRedactedCaptureDebugBundle({
      captureDiagnostics: buildDiagnostics(),
      enabledParserTemplates: [
        {
          sourceAppIds: ['google_pay', 'phonepe'],
          templateId: 'generic_upi_v1',
          version: '1.0.0',
        },
      ],
      notificationAccessState: 'settings_opened',
      rolloutChannel: 'beta',
      runtimeCompatibility: {
        compatible: true,
      },
      selectedSourceAppIds: ['google_pay'],
    });

    expect(bundle.nativeCapture.lastCapture).toEqual({
      capturedAtMs: new Date('2026-03-29T09:00:00.000Z').getTime(),
      packageName: 'com.google.android.apps.nbu.paisa.user',
      sourceAppId: 'google_pay',
    });
    expect(bundle.nativeCapture.lastCapture).not.toHaveProperty('preview');
    expect(bundle.nativeCapture.lastDedupeDecision).toEqual({
      amountMinor: 29900,
      dedupeKind: 'exact_duplicate',
      dedupedAtMs: new Date('2026-03-29T09:02:00.000Z').getTime(),
      duplicateCount: 3,
      similarityScore: 0.99,
      sourceAppId: 'google_pay',
    });
    expect(bundle.nativeCapture.lastDedupeDecision).not.toHaveProperty('merchantRaw');
    expect(bundle.rollout.enabledParserTemplates).toHaveLength(1);
  });
});
