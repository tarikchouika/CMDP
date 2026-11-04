// CMDP — دمج الترجمات الجديدة في قواميس FR/EN/IT/ES مع الحفاظ على الموجود
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const DIR = "/home/z/my-project/scripts/translations";

// 1) تحميل الدفعات والتحقق منها
const entries: Record<string, Record<string, string>> = {};
for (const f of readdirSync(DIR).filter((x) => x.endsWith(".json")).sort()) {
  const chunk = JSON.parse(readFileSync(`${DIR}/${f}`, "utf8")) as Record<string, Record<string, string>>;
  for (const [k, v] of Object.entries(chunk)) {
    if (entries[k]) throw new Error(`مفتاح مكرر عبر الدفعات: ${k.slice(0, 40)}`);
    for (const lang of ["fr", "en", "it", "es"] as const) {
      if (!v[lang] || !v[lang].trim()) throw new Error(`ترجمة ناقصة (${lang}) للمفتاح: ${k.slice(0, 40)}`);
    }
    entries[k] = v;
  }
}
console.log("مدخلات جديدة متحقق منها:", Object.keys(entries).length);

// 2) قراءة كل قاموس وتحليله
function parseDict(path: string): [string, string][] {
  const code = readFileSync(path, "utf8");
  const body = code.slice(code.indexOf("{"), code.lastIndexOf("}"));
  const re = /"((?:\\.|[^"\\])*)":\s*(?:"(?:\\.|[^"\\])*")/g;
  const out: [string, string][] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const key = JSON.parse(`"${m[1]}"`);
    const valRaw = m[0].slice(1 + m[1].length + 2).trim();
    const val = JSON.parse(valRaw);
    out.push([key, val]);
  }
  return out;
}

// 3) الدمج والكتابة
for (const lang of ["fr", "en", "it", "es"] as const) {
  const path = `/home/z/my-project/src/lib/i18n/${lang}.ts`;
  const existing = parseDict(path);
  const map = new Map(existing);
  let added = 0;
  for (const [k, v] of Object.entries(entries)) {
    if (!map.has(k)) {
      map.set(k, v[lang]);
      added++;
    }
  }
  const keys = [...map.keys()].sort();
  const header = `// ═══════════════════════════════════════════════════════════════════════════
// CMDP — قاموس ${lang.toUpperCase()}: ${lang === "fr" ? "Français" : lang === "en" ? "English" : lang === "it" ? "Italiano" : "Español"} — traduction professionnelle de la plateforme CMDP
// المفاتيح هي النصوص العربية الأصلية؛ أي مفتاح غائب يسقط آمناً إلى العربية.
// ═══════════════════════════════════════════════════════════════════════════

export const ${lang.toUpperCase()}: Record<string, string> = {
`;
  const body = keys.map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(map.get(k))},`).join("\n");
  writeFileSync(path, header + body + "\n};\n", "utf8");
  console.log(`${lang.toUpperCase()}: كان ${existing.length} → صار ${keys.length} (+${added})`);
}
