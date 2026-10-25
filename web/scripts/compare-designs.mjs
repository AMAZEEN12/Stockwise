// Read-only pixel analysis. References stay local; reports are ignored QA artifacts.
import {createRequire} from 'node:module';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {PNG}=require(resolve(dirname(require.resolve('playwright-core/package.json')),'lib/utilsBundle.js'));
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const references=await readdir(resolve(root,'Screens/sales'));
const results=await readdir(resolve(root,'test-results'));
const report=[];
for (const kind of ['desktop','mobile']) for (const state of ['stock','credit']) {
  const referenceName=references.find((name)=>name.startsWith(kind==='desktop'?'Desktop':'Mobile') && name.includes(state==='stock'?'Stock conflict':'Store credit'));
  const resultDirectory=results.find((name)=>name.endsWith(kind) && name.startsWith(state==='stock'?'sales-updated-stock-confli':'sales-corrected-store-cred'));
  if (!referenceName || !resultDirectory) throw new Error(`Missing ${kind} ${state} visual input`);
  const reference=PNG.sync.read(await readFile(resolve(root,'Screens/sales',referenceName)));
  const capture=PNG.sync.read(await readFile(resolve(root,'test-results',resultDirectory,state==='stock'?'stock-conflict-updated.png':'store-credit-updated.png')));
  const width=kind==='desktop'?1440:360; const height=kind==='desktop'?900:1000;
  const sample=(png,x,y)=>{const scale=png.width/width; const offset=(Math.floor(y*scale)*png.width+Math.floor(x*scale))*4; return [...png.data.subarray(offset,offset+3)];};
  let changed=0; let absolute=0;
  for (let y=0;y<height;y++) for (let x=0;x<width;x++) {const a=sample(reference,x,y); const b=sample(capture,x,y); const differences=a.map((value,index)=>Math.abs(value-b[index])); absolute+=differences.reduce((sum,value)=>sum+value,0); if (Math.max(...differences)>24) changed++;}
  report.push({state,kind,reference:referenceName,referencePixels:[reference.width,reference.height],capturePixels:[capture.width,capture.height],logicalViewport:[width,height],differentPixelsPercent:Number((100*changed/(width*height)).toFixed(2)),meanAbsoluteChannelDifference:Number((absolute/(width*height*3)).toFixed(2)),note:state==='credit'?'Design-only pending annotation omitted; simulation label added. Difference is reported, not treated as a perfect match.':'Simulation/logout affordances retained; disabled controls and SVG icons may differ. Human visual approval required.'});
}
await mkdir(resolve(root,'.mock'),{recursive:true}); await writeFile(resolve(root,'.mock/design-comparison.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
