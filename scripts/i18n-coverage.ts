// CMDP — فحص تغطية القواميس: يستخرج كل النصوص العربية المعروضة من المصدر
// ويقارنها بمفاتيح قواميس FR/EN/IT/ES لإيجاد المفاتيح الغائبة.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "/home/z/my-project/src";
const AR = /[\u0600-\u06FF]/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(tsx?|jsx?)$/.test(f)) out.push(p);
  }
  return out;
}

function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((l) => {
      const idx = l.indexOf("//");
      return idx >= 0 ? l.slice(0, idx) : l;
    })
    .join("\n");
}

function extractStrings(code: string): string[] {
  const res: string[] = [];
  const re = /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    const s = m[2]
      .replace(/\\n/g, "\n")
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\`/g, "`")
      .replace(/\\\\/g, "\\");
    if (AR.test(s)) res.push(s);
  }
  return res;
}

const files = walk(ROOT).filter((f) => !f.includes("/i18n/"));
const usage = new Map<string, Set<string>>();
for (const f of files) {
  const code = stripComments(readFileSync(f, "utf8"));
  for (const s of extractStrings(code)) {
    let set = usage.get(s);
    if (!set) {
      set = new Set<string>();
      usage.set(s, set);
    }
    set.add(relative("/home/z/my-project", f));
  }
}

function dictKeys(path: string): Set<string> {
  const code = readFileSync(path, "utf8");
  const keys = new Set<string>();
  const re = /"((?:\\.|[^"\\])*)":\s*(?:"(?:\\.|[^"\\])*"|'[^']*'|`[^`]*`)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    keys.add(JSON.parse(`"${m[1]}"`));
  }
  return keys;
}

const dicts: Record<string, Set<string>> = {
  fr: dictKeys("/home/z/my-project/src/lib/i18n/fr.ts"),
  en: dictKeys("/home/z/my-project/src/lib/i18n/en.ts"),
  it: dictKeys("/home/z/my-project/src/lib/i18n/it.ts"),
  es: dictKeys("/home/z/my-project/src/lib/i18n/es.ts"),
};

console.log("total Arabic strings in source:", usage.size);
for (const [name, keys] of Object.entries(dicts)) {
  console.log(`dict ${name.toUpperCase()} keys:`, keys.size);
}

for (const [name, keys] of Object.entries(dicts)) {
  const missing = [...usage.keys()].filter((k) => !keys.has(k));
  console.log(`\n===== missing in ${name.toUpperCase()} (${missing.length}) =====`);
  for (const k of missing) {
    const where = [...(usage.get(k) ?? [])].slice(0, 2).join(", ");
    console.log(JSON.stringify(k), " <- ", where);
  }
}
