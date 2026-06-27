const fs = require('fs');
const file = 'frontend/src/app/api/terminal/chat/route.ts';
let content = fs.readFileSync(file, 'utf8');

const oldCode = `    // Default to OpenAI compatible
    let finalBaseUrl = base_url || undefined;
    if (finalBaseUrl && !finalBaseUrl.endsWith('/v1')) {
      finalBaseUrl = finalBaseUrl.replace(/\\/?$/, '/v1');
    }
    const openaiProvider = createOpenAI({ apiKey: api_key || 'not-needed', baseURL: finalBaseUrl });`;

const newCode = `    // Default to OpenAI compatible
    let finalBaseUrl = base_url || undefined;
    
    // Auto-detect baseURL for known providers if missing
    if (!finalBaseUrl) {
      const m = model.toLowerCase();
      if (m.includes('deepseek')) finalBaseUrl = 'https://api.deepseek.com/v1';
      else if (m.includes('qwen') || m.includes('dashscope')) finalBaseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
      else if (m.includes('glm') || m.includes('zhipu')) finalBaseUrl = 'https://open.bigmodel.cn/api/paas/v4';
      else if (m.includes('moonshot')) finalBaseUrl = 'https://api.moonshot.cn/v1';
      else if (m.includes('silicon')) finalBaseUrl = 'https://api.siliconflow.cn/v1';
      else if (m.includes('doubao')) finalBaseUrl = 'https://ark.cn-beijing.volces.com/api/v3';
    }

    if (finalBaseUrl && !finalBaseUrl.endsWith('/v1') && !finalBaseUrl.includes('/v4') && !finalBaseUrl.includes('/v3')) {
      finalBaseUrl = finalBaseUrl.replace(/\\/?$/, '/v1');
    }
    
    const openaiProvider = createOpenAI({ apiKey: api_key || 'not-needed', baseURL: finalBaseUrl });`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(file, content);
console.log("Patched providers in route.ts");
