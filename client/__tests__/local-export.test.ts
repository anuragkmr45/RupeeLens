import {
  getDefaultCategories,
  type BudgetDefinition,
  type Transaction,
} from '../src/features/spend-tracker/domain';
import type { PersistedSpendTrackerState } from '../src/features/spend-tracker/persistence';
import {
  buildCsvExportArtifact,
  buildLocalBackupArtifact,
  CSV_EXPORT_SCHEMAS,
  LOCAL_BACKUP_SCHEMA_VERSION,
  type CsvExportKind,
} from '../src/features/export/local-export';

function buildState(
  overrides: Partial<PersistedSpendTrackerState> = {},
): PersistedSpendTrackerState {
  const categories = [
    ...getDefaultCategories(),
    {
      description: 'Club subscriptions and member events.',
      id: 'custom_club',
      isDefault: false,
      label: 'Club',
    },
  ];
  const transactions: Transaction[] = [
    {
      amountMinor: 49900,
      capturedAt: '2026-03-30T07:15:00.000Z',
      history: [
        {
          at: '2026-03-30T07:15:00.000Z',
          id: 'history_txn_alpha_1',
          kind: 'captured',
          summary: 'Captured a local test notification.',
        },
      ],
      id: 'txn_alpha',
      items: [
        {
          amountMinor: 29900,
          categoryId: 'food_drink',
          id: 'txn_alpha_item_1',
          label: 'Team lunch',
        },
        {
          amountMinor: 10000,
          categoryId: 'custom_club',
          id: 'txn_alpha_item_2',
          label: 'Member dues',
        },
      ],
      merchant: 'Blue Tokai',
      merchantConfidenceBps: 9400,
      merchantId: 'merchant_blue_tokai',
      merchantMatchKind: 'deterministic',
      merchantRaw: 'BLUE TOKAI COFFEE',
      note: 'Met the design team.',
      parserInfo: {
        confidenceBps: 9200,
        parserId: 'google_pay_v1',
        parserVersion: '1.2.0',
      },
      sourceApp: 'Google Pay',
      status: 'partially_classified',
    },
  ];
  const budgets: BudgetDefinition[] = [
    {
      categoryId: 'custom_club',
      createdAt: '2026-03-01T00:00:00.000Z',
      id: 'budget_club',
      itemLabel: 'Member dues',
      label: 'Club plan',
      merchantId: 'merchant_blue_tokai',
      merchantLabel: 'Blue Tokai',
      merchantNormalizedLabel: 'blue_tokai',
      period: 'monthly',
      scope: 'category',
      startsOnDay: 1,
      targetMinor: 80000,
      updatedAt: '2026-03-15T00:00:00.000Z',
    },
  ];

  return {
    budgetAlertSettings: {
      quietHoursEndHour: 8,
      quietHoursStartHour: 22,
      quietModeEnabled: true,
    },
    budgetAlerts: [],
    budgets,
    categories,
    merchantAliases: [],
    merchants: [
      {
        id: 'merchant_blue_tokai',
        label: 'Blue Tokai',
        normalizedLabel: 'blue_tokai',
      },
    ],
    onboardingCompleted: true,
    onboardingPreferences: {
      budgetCycleId: 'calendar_month',
      selectedSourceAppIds: ['google_pay'],
      syncMode: 'local_only',
    },
    notificationAccessState: 'settings_opened',
    privacyModeEnabled: false,
    rules: [],
    transactions,
    ...overrides,
  };
}

function parseCsv(csv: string): { header: string[]; rows: string[][] } {
  const lines = csv.trim().split('\n');
  return {
    header: lines[0]?.split(',') ?? [],
    rows: lines.slice(1).map((line) => line.split(',')),
  };
}

describe('local export helpers', () => {
  it.each<CsvExportKind>(['transactions', 'items', 'categories', 'budgets'])(
    'builds a stable %s CSV artifact',
    (kind) => {
      const artifact = buildCsvExportArtifact(kind, buildState(), {
        now: '2026-03-30T10:15:00.000Z',
      });
      const parsed = parseCsv(artifact.contents);

      expect(parsed.header).toEqual([...CSV_EXPORT_SCHEMAS[kind]]);
      expect(artifact.fileName).toContain(`upi-spend-tracker-${kind}-20260330T101500Z`);
      expect(artifact.mimeType).toBe('text/csv');
    },
  );

  it('redacts sensitive CSV fields when privacy mode is enabled', () => {
    const state = buildState({ privacyModeEnabled: true });
    const transactionCsv = buildCsvExportArtifact('transactions', state, {
      now: '2026-03-30T10:15:00.000Z',
    }).contents;
    const itemCsv = buildCsvExportArtifact('items', state, {
      now: '2026-03-30T10:15:00.000Z',
    }).contents;
    const categoryCsv = buildCsvExportArtifact('categories', state, {
      now: '2026-03-30T10:15:00.000Z',
    }).contents;
    const budgetCsv = buildCsvExportArtifact('budgets', state, {
      now: '2026-03-30T10:15:00.000Z',
    }).contents;

    expect(transactionCsv).toContain('[redacted]');
    expect(transactionCsv).not.toContain('BLUE TOKAI COFFEE');
    expect(transactionCsv).not.toContain('Met the design team.');
    expect(itemCsv).toContain('[redacted]');
    expect(itemCsv).not.toContain('Team lunch');
    expect(categoryCsv).toContain('[redacted custom category]');
    expect(categoryCsv).not.toContain('Club subscriptions and member events.');
    expect(budgetCsv).toContain('[redacted budget]');
    expect(budgetCsv).not.toContain('Club plan');
  });

  it('builds a full-fidelity local backup artifact', () => {
    const artifact = buildLocalBackupArtifact(buildState({ privacyModeEnabled: true }), {
      now: '2026-03-30T10:15:00.000Z',
    });

    expect(artifact.schemaVersion).toBe(LOCAL_BACKUP_SCHEMA_VERSION);
    expect(artifact.fileName).toBe(
      'upi-spend-tracker-local-backup-20260330T101500Z.json',
    );
    expect(artifact.contents).toContain('"schema_version": "local_backup_v1"');
    expect(artifact.contents).toContain('"privacy_mode_enabled": true');
    expect(artifact.contents).toContain('"note": "Met the design team."');
  });
});
