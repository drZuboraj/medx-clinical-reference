// MEDx app logic: load existing catalogue and Batch 2, then merge by unique ID.
let DB;
Promise.all([
  fetch('./medicines.json').then(r=>{if(!r.ok)throw new Error('Could not load medicines.json');return r.json()}),
  fetch('./batch2.json').then(r=>{if(!r.ok)throw new Error('Could not load batch2.json');return r.json()})
]).then(([base,batch2])=>{
  const seen=new Set((base.conditions||[]).map(c=>c.id));
  const additions=(batch2.conditions||[]).filter(c=>!seen.has(c.id));
  DB={...base,conditions:[...(base.conditions||[]),...additions]};
  initMEDx();
}).catch(error=>{
  console.error(error);
  const root=document.querySelector('main')||document.body;
  root.insertAdjacentHTML('afterbegin','<p class="notice">MEDx could not load clinical data. Check that medicines.json and batch2.json are in the repository root, then reload.</p>');
});
function initMEDx() {
const $=x=>document.getElementById(x);let active=DB.conditions[0].id,mode='opd';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
[...new Set(DB.conditions.map(x=>x.specialty))].sort().forEach(s=>{let o=document.createElement('option');o.value=s;o.textContent=s;$('spec').append(o)});
function normalize(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
const ALIASES={
 'community acquired pneumonia':'cap pneumonia chest infection','acute upper respiratory infection':'urti common cold viral cold',
 'pulmonary tuberculosis':'tb tuberculosis','urinary tract infection':'uti cystitis urine infection',
 'acute diarrhoea gastroenteritis':'diarrhea diarrhoea loose motion food poisoning','dengue':'dengue fever',
 'acute coronary syndrome':'acs heart attack myocardial infarction chest pain','type 2 diabetes mellitus':'diabetes dm hyperglycemia',
 'hypertension':'high blood pressure bp','acute kidney injury':'aki renal failure','chronic kidney disease':'ckd renal disease',
 'diabetic ketoacidosis':'dka ketoacidosis','deep vein thrombosis pulmonary embolism':'dvt pe blood clot',
 'postpartum haemorrhage':'pph postpartum hemorrhage','pre eclampsia eclampsia':'preeclampsia eclampsia pregnancy hypertension',
 'acute bacterial prostatitis':'prostatitis','acute angle closure glaucoma':'glaucoma painful red eye',
 'iron deficiency anaemia':'iron deficiency anemia ida','asthma exacerbation':'asthma wheeze',
 'chronic obstructive pulmonary disease exacerbation':'copd','acute otitis media':'ear infection',
 'pharyngitis tonsillitis':'sore throat tonsillitis','cellulitis erysipelas':'skin infection',
 'upper gastrointestinal bleed':'ugib haematemesis melena','acute urinary retention':'urine retention unable to urinate',
 'small bowel obstruction':'bowel obstruction intestinal obstruction','renal colic suspected ureteric stone':'kidney stone ureteric calculus',
 'acute cholecystitis':'gallbladder inflammation','acute pancreatitis':'pancreas inflammation',
 'perforated peptic ulcer':'perforated ulcer acute abdomen','diabetic ketoacidosis dka':'dka ketoacidosis'
};
function getMatches(){let q=normalize($('search').value),sp=$('spec').value,st=$('setting').value;return DB.conditions.filter(c=>{let hay=normalize([c.name,c.specialty,c.setting,c.opd,c.indoor,ALIASES[normalize(c.name)]||ALIASES[c.name]||''].join(' '));return(!sp||c.specialty===sp)&&(!st||c.setting===st)&&(!q||hay.includes(q))})}
function chooseTopic(id){active=id;mode='opd';renderList();renderContent();if(window.matchMedia('(max-width:760px)').matches)$('content').scrollIntoView({behavior:'smooth',block:'start'})}
function renderList(){let arr=getMatches();$('count').textContent=arr.length+' matching topic · '+DB.conditions.length+' total';$('list').innerHTML=arr.map(c=>`<button type="button" class="item ${c.id===active?'active':''}" data-id="${c.id}"><strong>${esc(c.name)}</strong><small>${esc(c.specialty)} · ${esc(c.setting)}</small></button>`).join('')||'<p class="empty">No matching topic. Try a broader term, e.g. “infection”, “pain” or “fever”.</p>';document.querySelectorAll('.item').forEach(b=>b.addEventListener('click',()=>chooseTopic(b.dataset.id)));if($('search').value.trim()&&arr.length===1&&arr[0].id!==active){active=arr[0].id;mode='opd';renderContent()}}
function sourcesPage(){mode='sources';$('content').innerHTML=`<div class="kicker">Reference directory</div><h2>Clinical guideline sources</h2><p>Use primary and national guidance where available. Each disease page links to a relevant source.</p><div class="sources">${(DB.sources||[]).map(s=>`<div class="sourcecard"><a href="${s.url}" target="_blank" rel="noopener">${esc(s.name)}</a><small>${esc(s.type||'Guideline')}</small></div>`).join('')}</div>`}
function renderContent(){if(mode==='sources'){sourcesPage();return}let matches=getMatches();let c=DB.conditions.find(x=>x.id===active);if($('search').value.trim()&&matches.length===0){$('content').innerHTML='<div class="kicker">Search</div><h2>No matching disease found</h2><p>Try a disease name, abbreviation, symptom, or clear the filters.</p>';return}if($('search').value.trim()&&matches.length&&(!c||!matches.some(x=>x.id===c.id)))c=matches[0];if(!c)return;$('content').innerHTML=`<div class="kicker">Clinical topic</div><h2>${esc(c.name)}</h2><div class="meta"><span class="tag">${esc(c.specialty)}</span><span class="tag">${esc(c.setting)}</span><span class="tag">Guideline-linked</span></div><div class="notice"><b>Clinical safety:</b> This is a reference starting point, not a complete verified prescription. Confirm local protocol, patient-specific factors and medicine details before treatment.</div><div class="tabs"><button class="tab ${mode==='opd'?'active':''}" id="opd">OPD approach</button><button class="tab ${mode==='indoor'?'active':''}" id="indoor">Inpatient / emergency</button><button class="tab" id="sourceTab">Source</button></div><div class="section ${mode==='opd'?'':'hidden'}"><h3>Outpatient / initial assessment</h3><p>${esc(c.opd)}</p></div><div class="section ${mode==='indoor'?'':'hidden'}"><h3>Inpatient / emergency approach</h3><p>${esc(c.indoor)}</p></div><div class="section"><h3>Guideline for this topic</h3><p class="source"><a href="${esc(c.source_url)}" target="_blank" rel="noopener">${esc(c.source_name)} ↗</a></p></div><div class="toolbar"><button class="action primary" id="copy">Copy topic summary</button><button class="action" id="openSource">Open guideline</button></div><p class="count">Topic ${DB.conditions.findIndex(x=>x.id===c.id)+1} of ${DB.conditions.length}. Always verify current guidance before prescribing.</p>`;$('opd').onclick=()=>{mode='opd';renderContent()};$('indoor').onclick=()=>{mode='indoor';renderContent()};$('sourceTab').onclick=()=>window.open(c.source_url,'_blank','noopener');$('openSource').onclick=()=>window.open(c.source_url,'_blank','noopener');$('copy').onclick=async()=>{let t=c.name+'\nOPD: '+c.opd+'\nIndoor/Emergency: '+c.indoor+'\nSource: '+c.source_name+' — '+c.source_url;try{await navigator.clipboard.writeText(t);$('copy').textContent='Copied'}catch(e){prompt('Copy topic summary:',t)}}}
$('search').addEventListener('input',()=>{mode='opd';renderList();renderContent()});$('search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();let a=getMatches();if(a.length)chooseTopic(a[0].id);else renderContent()}});$('spec').onchange=()=>{renderList();renderContent()};$('setting').onchange=()=>{renderList();renderContent()};$('allSources').onclick=sourcesPage;renderList();renderContent();
}
