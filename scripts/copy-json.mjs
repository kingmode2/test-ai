import { readdirSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const distDir = join(root, 'dist');

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

for (const entry of readdirSync(root, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  if (!entry.name.endsWith('.json')) continue;
  if (entry.name === 'package-lock.json') continue;

  const source = join(root, entry.name);
  const target = join(distDir, entry.name);
  copyFileSync(source, target);
}
