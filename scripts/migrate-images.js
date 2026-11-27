// Move inline customer images out of v2/customers into v2/customerImages.
//
// Works ONLY on a local JSON export of the database. It never connects to Firebase.
// Export the database yourself, then pass the file here.
//
//   node scripts/migrate-images.js --input export.json                 # dry-run (default)
//   node scripts/migrate-images.js --input export.json --apply \
//        --output migrated.json [--batch 200]                          # write migrated copy
//   node scripts/migrate-images.js --input export.json --apply --output migrated.json --resume
//   node scripts/migrate-images.js --input export.json --apply --output migrated.json --force
//   node scripts/migrate-images.js --verify migrated.json              # check a migrated file
//
// Safety:
// - Dry-run is the default and prints counts, sizes and the expected saving. Nothing is written.
// - The input file is never modified. --apply writes a NEW output file, and refuses to overwrite the input.
// - Progress is checkpointed per batch in <output>.progress.json and <output>.ndjson.
//   --resume continues where the last run stopped. Re-running is safe: records already split are skipped.
// - Uploading migrated.json back to the database is a separate, manual step. Do it only after --verify passes.
import { createReadStream, existsSync, readFileSync, writeFileSync, appendFileSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { planSectionMigration, imageNodeFor, hashImage } from '../src/image-store.js';

const SECTIONS = ['customers'];

function parseArgs(argv) {
  const args = { apply: false, resume: false, force: false, batch: 200, sections: SECTIONS };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input') args.input = argv[++i];
    else if (a === '--output') args.output = argv[++i];
    else if (a === '--batch') args.batch = Number(argv[++i]);
    else if (a === '--sections') args.sections = argv[++i].split(',').map(s => s.trim());
    else if (a === '--apply') args.apply = true;
    else if (a === '--resume') args.resume = true;
    else if (a === '--force') args.force = true;
    else if (a === '--verify') args.verify = argv[++i];
    else throw new Error(`unknown argument: ${a}`);
  }
  return args;
}

const mb = n => (n / 1048576).toFixed(2) + ' MB';

function readExport(file) {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  if (!data || typeof data !== 'object' || !data.v2) throw new Error('export must contain a top-level "v2" object');
  return data;
}

function dryRun(data, sections) {
  const report = {};
  for (const section of sections) {
    const records = data.v2[section] || {};
    const plan = planSectionMigration(section, records, {});
    const imageBytes = Object.values(plan.images).reduce((s, w) => s + (w ? Buffer.byteLength(w.data) : 0), 0);
    report[section] = {
      records: plan.stats.records,
      recordsWithInlineImage: plan.stats.withInlineImage,
      imageBytes,
      recordBytesBefore: plan.stats.recordBytesBefore,
      recordBytesAfter: plan.stats.recordBytesAfter,
      expectedSavingBytes: plan.stats.bytesSaved,
    };
  }
  return report;
}

function printReport(report, mode) {
  console.log(`mode: ${mode}`);
  for (const [section, r] of Object.entries(report)) {
    console.log(`\n[${section}]`);
    console.log(`  records:                 ${r.records}`);
    console.log(`  with inline image:       ${r.recordsWithInlineImage}`);
    console.log(`  image data to move:      ${mb(r.imageBytes)}`);
    console.log(`  record bytes before:     ${mb(r.recordBytesBefore)}`);
    console.log(`  record bytes after:      ${mb(r.recordBytesAfter)}`);
    console.log(`  expected saving on the main node: ${mb(r.expectedSavingBytes)}`);
  }
}

function checkpointPaths(output) {
  return { progress: `${output}.progress.json`, ndjson: `${output}.ndjson` };
}

function apply(args, data) {
  const input = resolve(args.input);
  const output = resolve(args.output || '');
  if (!args.output) throw new Error('--apply requires --output');
  if (output === input) throw new Error('refusing to write over the input file');
  const { progress, ndjson } = checkpointPaths(output);

  if (args.force) { for (const f of [progress, ndjson, output]) if (existsSync(f)) rmSync(f); }
  if (!args.resume && !args.force && (existsSync(progress) || existsSync(ndjson))) {
    throw new Error('checkpoint exists: use --resume to continue or --force to restart');
  }
  // One timestamp per migration (kept in the checkpoint), so a resumed run writes identical output.
  const state = existsSync(progress) ? JSON.parse(readFileSync(progress, 'utf8')) : { done: {}, startedAt: Date.now() };

  for (const section of args.sections) {
    const node = imageNodeFor(section);
    if (!node) throw new Error(`section not splittable: ${section}`);
    const records = data.v2[section] || {};
    const keys = Object.keys(records);
    const start = state.done[section] || 0;
    for (let i = start; i < keys.length; i += args.batch) {
      const batchKeys = keys.slice(i, i + args.batch);
      const batch = Object.fromEntries(batchKeys.map(k => [k, records[k]]));
      const plan = planSectionMigration(section, batch, {}, state.startedAt);
      for (const key of batchKeys) {
        appendFileSync(ndjson, JSON.stringify({ section, key, record: plan.records[key], image: plan.images[String(records[key]?.id ?? key)] ?? null }) + '\n');
      }
      state.done[section] = i + batchKeys.length;
      writeFileSync(progress, JSON.stringify(state));
      console.log(`[${section}] ${state.done[section]} / ${keys.length}`);
    }
  }

  // Assemble the migrated tree from the checkpoint file.
  const out = { v2: JSON.parse(JSON.stringify(data.v2)) };
  for (const section of args.sections) out.v2[section] = {};
  for (const section of args.sections) out.v2[imageNodeFor(section)] = out.v2[imageNodeFor(section)] || {};
  for (const line of readFileSync(ndjson, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    out.v2[row.section][row.key] = row.record;
    if (row.image) out.v2[imageNodeFor(row.section)][row.record.id ?? row.key] = row.image;
  }
  writeFileSync(output, JSON.stringify(out));
  console.log(`\nwritten: ${output} (${mb(statSync(output).size)})`);
  console.log(`next: node scripts/migrate-images.js --verify ${output}  (then upload manually after review)`);
}

// Checks a migrated file: every split record has its image with the same version,
// no inline images remain on split sections, and no record was lost.
export function verifyMigrated(migrated, original, sections = SECTIONS) {
  const problems = [];
  for (const section of sections) {
    const node = imageNodeFor(section);
    const before = Object.keys(original.v2[section] || {}).length;
    const after = Object.keys(migrated.v2[section] || {}).length;
    if (before !== after) problems.push(`${section}: record count changed ${before} -> ${after}`);
    for (const [key, rec] of Object.entries(migrated.v2[section] || {})) {
      if (typeof rec.imageUrl === 'string') problems.push(`${section}/${key}: inline image still present`);
      if (rec.imageRef) {
        const img = (migrated.v2[node] || {})[rec.imageRef];
        if (!img) problems.push(`${section}/${key}: image node missing`);
        else if (img.version !== rec.imageVersion) problems.push(`${section}/${key}: version mismatch`);
        else if (hashImage(img.data) !== rec.imageVersion) problems.push(`${section}/${key}: version does not match data`);
      }
    }
  }
  return problems;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.verify) {
    if (!args.input) throw new Error('--verify needs --input <original export>');
    const migrated = readExport(args.verify);
    const original = readExport(args.input);
    const problems = verifyMigrated(migrated, original, args.sections);
    if (problems.length) { console.error(problems.slice(0, 50).join('\n')); process.exit(1); }
    console.log('verify ok');
    return;
  }
  if (!args.input) throw new Error('--input is required');
  const data = readExport(args.input);
  if (!args.apply) {
    printReport(dryRun(data, args.sections), 'dry-run (nothing written)');
    return;
  }
  apply(args, data);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (isMain) {
  main().catch(err => { console.error(`error: ${err.message}`); process.exit(1); });
}
