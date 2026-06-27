const fs = require('fs');
const file = 'frontend/src/app/api/terminal/chat/route.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    'return result.toDataStreamResponse();',
    'return (result.toDataStreamResponse || result.toUIMessageStreamResponse || result.toAIStreamResponse || result.toTextStreamResponse).bind(result)();'
);

fs.writeFileSync(file, content);
console.log("Patched route.ts");
