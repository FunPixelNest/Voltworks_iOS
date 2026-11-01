const { chromium } = require('playwright');
const fs=require('fs');
(async()=>{const b=await chromium.launch({args:['--allow-file-access-from-files']});const p=await b.newPage();
await p.goto('file:///home/claude/icon/icon.html');const o=await p.evaluate(()=>window.go());
for(const k in o) fs.writeFileSync('/home/claude/icon/'+k+'.png',Buffer.from(o[k].split(',')[1],'base64'));await b.close();console.log('ok')})();
