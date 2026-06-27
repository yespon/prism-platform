import fs from 'fs';
const content = fs.readFileSync('node_modules/ai/dist/index.d.ts', 'utf-8');
const match = content.match(/interface StreamTextResult<.*?> \{([\s\S]*?)\}/);
if (match) {
    console.log(match[1].split('\n').filter(line => line.includes('(')).join('\n'));
} else {
    console.log("Not found");
}
