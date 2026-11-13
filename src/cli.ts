import { readFileSync, writeFileSync } from 'node:fs';
import { analyze } from './core.ts';
const args=process.argv.slice(2);
if(args.length<2){console.error('Usage: npm run analyze -- source.txt rewrite.txt [report.json] [locked.txt]');process.exitCode=2;}
else{try{const report=analyze(readFileSync(args[0],'utf8'),readFileSync(args[1],'utf8'),args[3]?readFileSync(args[3],'utf8').split(/\r?\n/):[]);const json=JSON.stringify(report,null,2)+'\n';if(args[2])writeFileSync(args[2],json);else process.stdout.write(json);}catch(e){console.error(e instanceof Error?e.message:String(e));process.exitCode=1;}}
