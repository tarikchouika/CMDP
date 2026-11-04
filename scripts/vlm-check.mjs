import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

async function main() {
  const zai = await ZAI.create();
  const files = process.argv.slice(2);
  const content = [{ type: 'text', text: 'You are a UI QA reviewer. For each screenshot (in order), briefly answer: 1) Is Arabic/French text rendered correctly (no tofu boxes/mojibake)? 2) Is the golden ornate CMDP logo visible in the header? 3) Is a faint watermark emblem visible in the background? 4) Any layout breakage or overlap? Answer concisely per image.' }];
  for (const f of files) {
    const b64 = fs.readFileSync(f).toString('base64');
    content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } });
  }
  const res = await zai.chat.completions.createVision({
    messages: [{ role: 'user', content }],
    
  });
  console.log(res.choices[0]?.message?.content);
}
main().catch(e => { console.error(e.message); process.exit(1); });
