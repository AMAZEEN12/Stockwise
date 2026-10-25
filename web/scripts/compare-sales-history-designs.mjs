// Compare all supplied Sales History states; differences are evidence, not approval.
import {createRequire} from 'node:module';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {PNG}=require(resolve(dirname(require.resolve('playwright-core/package.json')),'lib/utilsBundle.js'));
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const base=resolve(root,process.argv[2] || 'test-results-sales-history-final');
const folders=await readdir(base,{withFileTypes:true});
const states={list:'Sales list',credit:'Credit filter',loading:'Loading',error:'Error with retry',empty:'Empty (no sales)',success:'New sale appears'};
const report=[];
for(const kind of ['desktop','mobile'])for(const [state,label] of Object.entries(states)) {
  let capture;
  for(const folder of folders.filter((entry)=>entry.isDirectory() && entry.name.endsWith(kind))) {
    try{capture=PNG.sync.read(await readFile(resolve(base,folder.name,`history-${state}.png`)));break;}catch{/* Different scenario. */}
  }
  if(!capture)throw new Error(`Missing ${kind} ${state} capture`);
  const reference=PNG.sync.read(await readFile(resolve(root,'Screens','sales history',`${kind==='desktop' ? 'Desktop' : 'Mobile'} \u00b7 Sales \u00b7 ${label}.png`)));
  const width=kind==='desktop'?1440:360;const height=kind==='desktop'?900:1000;
  if([reference,capture].some((png)=>png.width!==width*2 || png.height!==height*2))throw new Error(`Unexpected export/capture size: ${kind} ${state}`);
  let changed=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const offset=(y*2*reference.width+x*2)*4;
    if(Math.max(...[0,1,2].map((channel)=>Math.abs(reference.data[offset+channel]-capture.data[offset+channel])))>24)changed++;
  }
  report.push({kind,state,logicalViewport:[width,height],differentPixelsPercent:Number((100*changed/(width*height)).toFixed(2))});
}
await mkdir(resolve(root,'.mock'),{recursive:true});
await writeFile(resolve(root,'.mock/sales-history-design-comparison.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
