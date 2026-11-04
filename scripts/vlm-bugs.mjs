import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

async function main() {
  const zai = await ZAI.create();
  const files = process.argv.slice(2);
  for (const f of files) {
    const b64 = fs.readFileSync(f).toString('base64');
    const content = [
      { type: 'text', text: 'You are a precise UI QA reviewer. Look at this mobile screenshot. RED CIRCLES mark bugs. For EACH red circle: 1) quote the EXACT text inside/next to the circle (in its original language), 2) state what language the circled UI text is in, 3) state what language the REST of the page UI is in, 4) describe the visual problem (wrong language? low contrast/invisible text? overflow?). Also report the page/view name and whether dark or light mode. Be very concise and precise.' },
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } },
    ];
    const res = await zai.chat.completions.createVision({ messages: [{ role: 'user', content }] });
    console.log('=== ' + f.split('/').pop() + ' ===');
    console.log(res.choices[0]?.message?.content);
    console.log('');
  }
}
main().catch(e => { console.error(e.message); process.exit(1); });
