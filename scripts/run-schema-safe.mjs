import fs from 'node:fs/promises';
import path from 'node:path';
import { createWriteStream } from 'node:fs';

const outputPath = path.resolve(process.cwd(), 'supabase', 'schema.safe.sql');

const schemaPath = path.resolve(process.cwd(), 'supabase', 'schema.sql');

const shouldSkipStatement = (statement) => {
  const normalized = statement.trim().toLowerCase();
  if (!normalized) return true;

  const disallowed = [
    'drop table',
    'drop schema',
    'drop extension',
    'truncate',
    'delete from',
    'drop policy',
    'create policy',
  ];

  return disallowed.some((token) => normalized.startsWith(token));
};

const run = async () => {
  const sql = await fs.readFile(schemaPath, 'utf8');
  const statements = sql
    .split(/;\s*\n/)
    .map((statement) => statement.trim())
    .filter(Boolean);

  const output = createWriteStream(outputPath, { flags: 'w' });

  for (const statement of statements) {
    if (shouldSkipStatement(statement)) {
      console.log('Skipping statement:', statement.split('\n')[0]);
      continue;
    }

    output.write(`${statement};\n\n`);
  }

  output.end();
  console.log(`Safe schema written to ${outputPath}`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
