import { chmodSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

async function build() {
  console.log('Building bazi-mcp bundle for Node/Bun...');
  const rootDir = resolve(import.meta.dir, '..');
  const entryPoint = resolve(rootDir, 'src/index.ts');
  const outDir = resolve(rootDir, 'dist');

  const result = await Bun.build({
    entrypoints: [entryPoint],
    outdir: outDir,
    target: 'node',
    minify: true,
    naming: 'index.js',
    // geo-tz reads its data files at runtime via fs.readSync from
    // path.join(__dirname, '..', 'data'); bundling it would rebase __dirname
    // to dist/ and break that read. Keep it external so the published
    // dist/index.js resolves it from the consumer's node_modules instead
    // (npm installs it because it's a declared dependency).
    external: ['geo-tz'],
  });

  if (!result.success) {
    console.error('Build failed:', result.logs);
    process.exit(1);
  }

  const distPath = resolve(outDir, 'index.js');
  let content = readFileSync(distPath, 'utf8');

  // Strip any existing shebangs produced by bundler
  content = content.replace(/^(#!.*\n)+/, '');
  // Add clean single node shebang
  content = '#!/usr/bin/env node\n' + content;
  writeFileSync(distPath, content, 'utf8');

  try {
    chmodSync(distPath, 0o755);
  } catch (e) {
    // Ignore chmod error on platforms where not supported
  }
  console.log('Build completed successfully:', distPath);
}

build();
