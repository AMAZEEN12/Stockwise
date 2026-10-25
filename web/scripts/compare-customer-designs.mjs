// Compare supplied 2x reference exports with real browser captures; never approve a baseline.
import {createRequire} from 'node:module';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {PNG}=require(resolve(dirname(require.resolve('playwright-core/package.json')),'lib/utilsBundle.js'));
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const directories=await readdir(resolve(root,'test-results'),{withFileTypes:true});
const groups={picker:{folder:'customer picker',states:{list:'Customer list',add:'Add new customer','name-required':'Name required',selected:'Customer selected',loading:'Loading',error:'Error with retry',empty:'Empty (no customers)'}},customers:{folder:'customers',states:{list:'Customer list',add:'Add customer dialog','name-required':'Name required',saving:'Saving','save-error':'Save error',success:'Success toast',admin:'Admin read-only',loading:'Loading',error:'Error with retry',empty:'Empty (no customers)','no-match':'No search match'}}};
const report=[];
for (const [group,{folder,states}] of Object.entries(groups)) for (const kind of ['desktop','mobile']) for (const [state,referenceState] of Object.entries(states)) {
  const file=`${group}-${state}.png`;let capturePath;
  for (const entry of directories) if (entry.isDirectory() && entry.name.endsWith(kind)) {
    const candidate=resolve(root,'test-results',entry.name,file);
    try {await readFile(candidate);capturePath=candidate;break;} catch { /* This case captures a different state. */ }
  }
  if (!capturePath) continue;
  const referencePath=resolve(root,'Screens',folder,`${kind==='desktop'?'Desktop':'Mobile'} · ${folder==='customers'?'Customers':'Customer picker'} · ${referenceState}.png`);
  const reference=PNG.sync.read(await readFile(referencePath));const capture=PNG.sync.read(await readFile(capturePath));
  const width=kind==='desktop'?1440:360;const height=kind==='desktop'?900:1000;
  if(reference.width!==width*2 || reference.height!==height*2 || capture.width!==width*2 || capture.height!==height*2) throw new Error(`Unexpected export size: ${file}`);
  let changed=0;let absolute=0;
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const offset=((y*2)*reference.width+x*2)*4;
    const delta=[0,1,2].map((channel)=>Math.abs(reference.data[offset+channel]-capture.data[offset+channel]));
    absolute+=delta.reduce((sum,value)=>sum+value,0);if(Math.max(...delta)>24)changed++;
  }
  report.push({group,kind,state,logicalViewport:[width,height],differentPixelsPercent:Number((100*changed/(width*height)).toFixed(2)),meanAbsoluteChannelDifference:Number((absolute/(width*height*3)).toFixed(2)),referencePath,capturePath});
}
if(!report.length)throw new Error('No customer reference captures found');
await mkdir(resolve(root,'.mock'),{recursive:true});
await writeFile(resolve(root,'.mock/customer-design-comparison.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report.map(({group,kind,state,differentPixelsPercent})=>({group,kind,state,differentPixelsPercent})),null,2));
