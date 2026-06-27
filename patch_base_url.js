const fs = require('fs');
const file = 'frontend/src/app/api/terminal/chat/route.ts';
let content = fs.readFileSync(file, 'utf8');

const oldCode = `    const openaiProvider = createOpenAI({ apiKey: api_key || 'not-needed', baseURL: base_url || undefined });`;
const newCode = `    let finalBaseUrl = base_url || undefined;
    if (finalBaseUrl && !finalBaseUrl.endsWith('/v1')) {
      finalBaseUrl = finalBaseUrl.replace(/\\/?$/, '/v1');
    }
    const openaiProvider = createOpenAI({ apiKey: api_key || 'not-needed', baseURL: finalBaseUrl });`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(file, content);
console.log("Patched baseURL in route.ts");
