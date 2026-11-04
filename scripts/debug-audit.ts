// تشخيص: لماذا لم يجد تدقيق التغطية عناوين المهام؟
import { readFileSync } from "node:fs";

const code = readFileSync("src/lib/dataset.ts", "utf8");
const stripped = code
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .map((l) => {
    const idx = l.indexOf("//");
    return idx >= 0 ? l.slice(0, idx) : l;
  })
  .join("\n");

const AR = /[\u0600-\u06FF]/;
const re = /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
let m: RegExpExecArray | null;
const found: string[] = [];
while ((m = re.exec(stripped))) {
  if (AR.test(m[2])) found.push(m[2]);
}
console.log("extracted:", found.length);
console.log("has task title?", found.includes("تجديد عقد كراء المحل"));
const i = stripped.indexOf("تجديد ععد كراء");
const j = stripped.indexOf("تجديد عقد كراء المحل");
console.log("index of task title in stripped code:", j);
if (j >= 0) console.log("context:", JSON.stringify(stripped.slice(j - 20, j + 30)));
// كم سطراً بقي بعد stripComments؟
console.log("stripped lines:", stripped.split("\n").length, "vs original:", code.split("\n").length);
