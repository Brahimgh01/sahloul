// Compares the key structure of fr.ts / en.ts / ar.ts.
// Every language must have exactly the same keys, or a screen shows a raw key.
// Usage: node scripts/check-i18n.js   (exit code 1 if something is missing)
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const dir = path.join(__dirname, '..', 'src', 'i18n');
const files = { fr: 'fr.ts', en: 'en.ts', ar: 'ar.ts' };

function keyPaths(file) {
  const full = path.join(dir, file);
  const src = fs.readFileSync(full, 'utf8');
  const sf = ts.createSourceFile(full, src, ts.ScriptTarget.Latest, true);
  const out = [];

  const walk = (node, prefix) => {
    if (ts.isObjectLiteralExpression(node)) {
      for (const prop of node.properties) {
        if (ts.isPropertyAssignment(prop)) {
          const name = prop.name.getText(sf).replace(/^['"]|['"]$/g, '');
          const key = prefix ? `${prefix}.${name}` : name;
          out.push(key);
          if (ts.isObjectLiteralExpression(prop.initializer)) walk(prop.initializer, key);
        } else if (ts.isShorthandPropertyAssignment(prop)) {
          const name = prop.name.getText(sf);
          out.push(prefix ? `${prefix}.${name}` : name);
        }
      }
    }
  };

  sf.forEachChild((node) => {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (decl.initializer && ts.isObjectLiteralExpression(decl.initializer)) {
          walk(decl.initializer, '');
        }
      }
    }
  });
  return out;
}

const sets = {};
for (const [lang, file] of Object.entries(files)) sets[lang] = keyPaths(file);

const reference = sets.fr;
const refSet = new Set(reference);
let bad = false;

for (const lang of ['en', 'ar']) {
  const s = new Set(sets[lang]);
  const missing = reference.filter((k) => !s.has(k));
  const extra = sets[lang].filter((k) => !refSet.has(k));
  if (missing.length || extra.length) {
    bad = true;
    console.log(`\n${lang}.ts`);
    if (missing.length) console.log(`  missing (${missing.length}): ${missing.join(', ')}`);
    if (extra.length) console.log(`  extra   (${extra.length}): ${extra.join(', ')}`);
  }
}

// Duplicate keys in the same language would silently drop one.
for (const lang of Object.keys(files)) {
  const seen = new Set();
  const dups = [];
  for (const k of sets[lang]) {
    if (seen.has(k)) dups.push(k);
    seen.add(k);
  }
  if (dups.length) {
    bad = true;
    console.log(`\n${lang}.ts duplicate keys: ${dups.join(', ')}`);
  }
}

if (bad) {
  console.log('\ni18n check FAILED');
  process.exit(1);
}
console.log(`i18n OK — ${reference.length} keys in fr, en, ar.`);
