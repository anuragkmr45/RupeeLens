import type { SqlStatementManifestEntry } from '@upi-spend-tracker/shared-utils';

const sqliteNowExpression = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

const defaultCategories = [
  ['category-default-groceries', 'groceries', 'Groceries'],
  ['category-default-food-delivery', 'food-delivery', 'Food Delivery'],
  ['category-default-dining', 'dining', 'Dining'],
  ['category-default-transport', 'transport', 'Transport'],
  ['category-default-utilities', 'utilities', 'Utilities'],
  ['category-default-healthcare', 'healthcare', 'Healthcare'],
  ['category-default-shopping', 'shopping', 'Shopping'],
  ['category-default-entertainment', 'entertainment', 'Entertainment'],
  ['category-default-education', 'education', 'Education'],
  ['category-default-personal-care', 'personal-care', 'Personal Care'],
  ['category-default-household', 'household', 'Household'],
  ['category-default-travel', 'travel', 'Travel'],
  ['category-default-miscellaneous', 'miscellaneous', 'Miscellaneous'],
] as const;

function createCategoryInsertStatement(
  id: string,
  slug: string,
  name: string,
  sortOrder: number,
): string {
  return `INSERT OR IGNORE INTO categories (
    id,
    slug,
    name,
    kind,
    sort_order,
    record_version,
    created_at,
    updated_at,
    deleted_at
  ) VALUES (
    '${id}',
    '${slug}',
    '${name}',
    'default',
    ${sortOrder},
    1,
    ${sqliteNowExpression},
    ${sqliteNowExpression},
    NULL
  );`;
}

function createSettingInsertStatement(key: string, valueJson: string): string {
  return `INSERT OR IGNORE INTO settings (
    key,
    value_json,
    updated_at
  ) VALUES (
    '${key}',
    '${valueJson}',
    ${sqliteNowExpression}
  );`;
}

export const clientDatabaseSeeds = [
  {
    id: '0001_default_categories_and_settings',
    statements: [
      ...defaultCategories.map(([id, slug, name], index) =>
        createCategoryInsertStatement(id, slug, name, index),
      ),
      createSettingInsertStatement('app.mode', '"local_only"'),
      createSettingInsertStatement('budget.cycle_type', '"monthly"'),
      createSettingInsertStatement('theme.preference', '"system"'),
    ],
  },
] as const satisfies readonly SqlStatementManifestEntry[];
