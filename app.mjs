import { createApiClient } from './api-client.mjs';
import { API_BASE } from './config.mjs';
const api = createApiClient({ baseUrl: API_BASE });
const $ = id => document.getElementById(id);
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e = escapeHtml;
const safeImage = source => {
  if (/^assets\/images\/[a-f0-9]{64}\.(png|webp|jpg)$/.test(source || '')) return source;
  try { const url=new URL(source); return url.protocol==='https:' ? url.href : ''; } catch { return ''; }
};
const img = (item, cls='avatar-img') => `<img class="${cls}" src="${e(safeImage(item.image))}" alt="${e(item.name)}" loading="lazy" />`;
const roles = item => (item.roles || []).map(role=>`<span class="role-tag ${e(role)}">${e(role)}</span>`).join(' ');
const state = {view:'hero',role:'전체',grade:'전체',q:''};
const pages = {guide:'guidePage',calc:'calcPage',artifact:'artifactPage',blob:'blobPage',treasure:'treasurePage',tiermaker:'tierMakerPage',formation:'formationPage',guildformation:'guildFormationPage',pet:'petPage',boss:'bossPage',detail:'heroDetailPage'};
const titles = {guide:'운빨존많겜 종합 가이드',calc:'영웅 강화 재화 계산',artifact:'유물 정보',blob:'블롭 피규어 티어',treasure:'전설보물 티어',tiermaker:'나만의 티어메이커',formation:'영웅 배치표 만들기',guildformation:'길드레이드 배치표',pet:'불멸펫 펫먹이 계산',boss:'지옥&신&태초 보스 정보'};
let currentPage='guide', returnPage='guide', guideSequence=0, detailSequence=0, popupSequence=0, artifactSequence=0;
const initialized = new Set(), initializing = new Map();
let popupAnchor=null;
const popup=document.createElement('dialog'); popup.className='api-popup'; popup.setAttribute('aria-label','상세 정보'); document.body.append(popup);
function closePopup(){popupSequence++; popup.close(); popupAnchor?.focus();}
popup.addEventListener('click',event=>{ if(event.target===popup || event.target.closest('.api-popup-close')) closePopup(); });
popup.addEventListener('cancel',()=>{popupSequence++;});
function popupHTML(content){return `<button class="api-popup-close" type="button" aria-label="정보 창 닫기">×</button>${content}`;}
function placePopup(event){
  const rect=popupAnchor?.getBoundingClientRect();
  const x=event?.clientX || rect?.left || 30, y=event?.clientY || rect?.bottom || 100;
  popup.style.left=`${Math.max(12,Math.min(x+10,innerWidth-popup.offsetWidth-12))}px`;
  popup.style.top=`${Math.max(12,Math.min(y+10,innerHeight-popup.offsetHeight-12))}px`;
}
function errorInto(container,error,retry){
  container.innerHTML=`<div class="api-error">${e(error.message)} <button type="button">다시 시도</button></div>`;
  const button=container.querySelector('button');
  const delay=Math.max(0,(error.retryAt || 0)-Date.now());
  button.disabled=delay>0;
  if(delay) setTimeout(()=>{button.disabled=false;},delay);
  button.addEventListener('click',retry,{once:true});
}
function setPage(page){
  currentPage=page;
  detailSequence++;
  closePopup();
  for(const [key,id] of Object.entries(pages)) $(id).style.display=key===page?'':'none';
  $('mainTabs').style.display=page==='guide'?'':'none';
  $('pageTitle').textContent=titles[page] || '영웅 상세정보';
  document.querySelectorAll('[data-page]').forEach(item=>item.classList.toggle('active',item.dataset.page===page));
  $('menuOverlay').classList.remove('open'); $('menuPanel').classList.remove('open');
}
function setupTheme(){
  const media=matchMedia('(prefers-color-scheme: dark)');
  const apply=theme=>{
    document.documentElement.dataset.theme=theme;
    const dark=theme==='dark', label=dark?'라이트 모드로 전환':'다크 모드로 전환';
    $('themeToggle').setAttribute('aria-label',label); $('themeToggle').setAttribute('aria-pressed',String(dark)); $('themeToggle').title=label;
  };
  let saved; try{saved=localStorage.getItem('luckyGuideTheme');}catch{}
  apply(['light','dark'].includes(saved)?saved:media.matches?'dark':'light');
  $('themeToggle').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';apply(theme);try{localStorage.setItem('luckyGuideTheme',theme);}catch{}};
  media.addEventListener('change',event=>{let preference;try{preference=localStorage.getItem('luckyGuideTheme');}catch{} if(!preference)apply(event.matches?'dark':'light');});
}
setupTheme();
$('menuBtn').onclick=()=>{$('menuOverlay').classList.add('open');$('menuPanel').classList.add('open');};
$('menuOverlay').onclick=()=>{$('menuOverlay').classList.remove('open');$('menuPanel').classList.remove('open');};

async function renderGuide(){
  const sequence=++guideSequence, category=state.view==='hero'?'heroes':'runes';
  $('list').innerHTML='<div class="api-load">목록을 불러오는 중…</div>';
  try{
    const items=await api.catalog(category,{q:state.q,role:state.role,grade:state.grade});
    if(sequence!==guideSequence)return;
    $('countLine').textContent=`${items.length}${category==='heroes'?'명의 영웅':'개의 룬'}`;
    $('list').innerHTML=items.map(item=>`<div class="card"><button type="button" class="card-head api-card" data-guide-id="${e(item.id)}" data-category="${category}"><div class="avatar-wrap">${img(item)}</div><div class="head-text"><div class="name">${e(item.name)}</div><div class="sub">${roles(item)} · 클릭하여 정보 보기</div></div><span aria-hidden="true">＋</span></button></div>`).join('') || '<div class="empty">조건에 맞는 항목이 없습니다.</div>';
  }catch(error){if(sequence===guideSequence)errorInto($('list'),error,renderGuide);}
}
$('list').addEventListener('click',event=>{
  const button=event.target.closest('[data-guide-id]');if(!button)return;
  if(button.dataset.category==='heroes')showHero(button.dataset.guideId,'guide');
  else showPopup('runes',button.dataset.guideId,event,button);
});
document.querySelectorAll('[data-view]').forEach(button=>{
  button.tabIndex=0; button.setAttribute('role','button');
  button.onclick=()=>{state.view=button.dataset.view;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b===button));renderGuide();};
  button.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();button.click();}};
});
for(const key of ['role','grade'])document.querySelectorAll(`#${key}Row .chip`).forEach(button=>{
  button.tabIndex=0;button.setAttribute('role','button');
  button.onclick=()=>{state[key]=button.dataset[key];document.querySelectorAll(`#${key}Row .chip`).forEach(b=>b.classList.toggle('on',b===button));renderGuide();};
  button.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();button.click();}};
});
let searchTimer;
$('search').maxLength=60;
$('search').oninput=()=>{state.q=$('search').value;$('clearX').style.display=state.q?'block':'none';clearTimeout(searchTimer);searchTimer=setTimeout(renderGuide,250);};
$('clearX').onclick=()=>{clearTimeout(searchTimer);state.q='';$('search').value='';$('clearX').style.display='none';renderGuide();};

function recommendationHTML(items,category){
  if(!items.length)return '<div class="empty">등록된 추천이 없습니다.</div>';
  return `<div class="api-links">${items.map(item=>`<button type="button" data-related-id="${e(item.id)}" data-related-category="${category}"><span class="gem ${e(item.grade)}">${e(item.grade)}</span> ${e(item.name)}</button>`).join('')}</div>` || '등록된 추천이 없습니다.';
}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-related-id]');if(!button)return;
  if(button.dataset.relatedCategory==='heroes')showHero(button.dataset.relatedId,currentPage==='detail'?returnPage:currentPage);
  else showPopup(button.dataset.relatedCategory,button.dataset.relatedId,event,button);
});
function treasureHTML(item){
  return `<div class="hero-detail-treasure-head">${img(item,'hero-detail-treasure-image')}<div><b>${e(item.name)}</b><div>${e(item.hero)} 전용 · ${e(item.tier)} 티어</div></div></div><div class="hero-detail-treasure-levels">${item.levels.map((values,index)=>{
    let cursor=0;const effect=e(item.effect).replace(/\{\}/g,()=>`<strong>${e(values[cursor++])}</strong>`);
    return `<div class="treasure-level-row"><div class="treasure-level-number">Lv.${index+1}</div><div class="treasure-level-effect">${effect}</div></div>`;
  }).join('')}</div>`;
}
async function showHero(id,from='guide',treasureId){
  returnPage=from;setPage('detail');const sequence=++detailSequence;
  for(const target of ['heroDetailHeader','heroDetailSkills','heroDetailAbilities','heroDetailRunes','heroDetailTreasure'])$(target).innerHTML='<div class="api-load">불러오는 중…</div>';
  $('heroDetailBackBtn').textContent='← 목록으로';
  try{
    const hero=id?await api.detail('heroes',id):null;
    if(sequence!==detailSequence)return;
    if(hero){
      $('pageTitle').textContent=`${hero.name} 영웅 정보`;
      $('heroDetailHeader').innerHTML=`<div class="hero-detail-avatar-wrap">${img(hero,'hero-detail-avatar')}</div><div><h2 class="hero-detail-name">${e(hero.name)}</h2>${roles(hero)}</div>`;
      $('heroDetailSkills').innerHTML=hero.skills.map(skill=>`<div class="hero-info-item"><div class="hero-info-skill-head"><b>${e(skill.name)}</b><span class="hero-info-skill-type">${e(skill.type)}</span></div><div>${e(skill.description)}</div></div>`).join('');
      $('heroDetailAbilities').innerHTML=hero.specialAbilities.map(text=>`<div class="hero-info-item">${e(text)}</div>`).join('');
      $('heroDetailRunes').innerHTML=recommendationHTML(hero.recommendations,'runes');
      treasureId=hero.treasureId;
    }else{
      $('heroDetailHeader').textContent='전설 보물 정보';
      for(const target of ['heroDetailSkills','heroDetailAbilities','heroDetailRunes'])$(target).textContent='등록된 영웅 상세정보가 없습니다.';
    }
    async function loadTreasure(){
      try{
        const treasure=treasureId?await api.detail('treasures',treasureId):null;
        if(sequence!==detailSequence)return;
        $('heroDetailTreasure').innerHTML=treasure?treasureHTML(treasure):'등록된 보물이 없습니다.';
        if(!hero&&treasure)$('heroDetailHeader').innerHTML=`${img(treasure,'hero-detail-avatar')}<h2>${e(treasure.hero)}</h2>`;
      }catch(error){if(sequence===detailSequence)errorInto($('heroDetailTreasure'),error,loadTreasure);}
    }
    await loadTreasure();
  }catch(error){if(sequence===detailSequence){errorInto($('heroDetailHeader'),error,()=>showHero(id,from,treasureId));for(const target of ['heroDetailSkills','heroDetailAbilities','heroDetailRunes','heroDetailTreasure'])$(target).textContent='';}}
}
$('heroDetailBackBtn').onclick=()=>navigate(returnPage);
async function showPopup(category,id,event,anchor){
  const sequence=++popupSequence;popupAnchor=anchor;
  popup.innerHTML=popupHTML('<div class="api-load">불러오는 중…</div>');if(!popup.open)popup.showModal();placePopup(event);
  try{
    const item=await api.detail(category,id);if(sequence!==popupSequence||!popup.open)return;
    let content='';
    if(category==='runes')content=`${item.effects.map(([tier,text])=>`<div class="rune-effect-row"><b>${e(tier)}</b><span>${e(text)}</span></div>`).join('')}<h3>추천 영웅</h3>${recommendationHTML(item.recommendations,'heroes')}`;
    if(category==='blobs')content=`<p>${e(item.hint)}</p><div class="blob-grade-list">${item.grades.map(grade=>`<div class="blob-grade-row"><span class="blob-grade-label" data-grade="${e(grade.grade)}">${e(grade.grade)}</span><span>${e(grade.effect)}</span></div>`).join('')}</div>`;
    if(category==='bosses')content=Object.entries({분류:item.type,효과:item.effect,지옥:item.hell,신:item.god,지속:item.dur,공략:item.strategy,주의:item.warn}).filter(([,text])=>text).map(([label,text])=>`<p><b>${label}</b><br>${e(text).replace(/&lt;br\s*\/?&gt;/gi,'<br>')}</p>`).join('');
    popup.innerHTML=popupHTML(`${item.image?img(item):''}<h3>${e(item.name)} ${e(item.tier || '')}</h3>${content}`);placePopup(event);popup.querySelector('.api-popup-close').focus();
  }catch(error){if(sequence===popupSequence&&popup.open){popup.innerHTML=popupHTML('<div class="popup-error"></div>');errorInto(popup.querySelector('.popup-error'),error,()=>showPopup(category,id,event,anchor));placePopup(event);}}
}
async function setupArtifacts(){
  const artifacts=await api.catalog('artifacts');let selected=artifacts[0]?.id;
  async function select(id){
    selected=id;const sequence=++artifactSequence;
    $('artifactLevelList').innerHTML='<div class="api-load">효과를 불러오는 중…</div>';
    $('artifactPicker').querySelectorAll('button').forEach(b=>{const active=b.dataset.artifactId===id;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
    try{const item=await api.detail('artifacts',id);if(sequence!==artifactSequence)return;
      $('artifactDetailImage').src=safeImage(item.image);$('artifactDetailImage').alt=item.name;$('artifactDetailName').textContent=item.name;
      $('artifactLevelList').innerHTML=item.levels.map(level=>`<div class="artifact-level-row"><span class="artifact-level-number">Lv.${level.level}</span><span>${e(level.effect)}</span></div>`).join('');
    }catch(error){if(sequence===artifactSequence)errorInto($('artifactLevelList'),error,()=>select(id));}
  }
  function picker(){const q=$('artifactSearch').value.replace(/\s/g,'');const items=artifacts.filter(item=>item.name.replace(/\s/g,'').includes(q));
    $('artifactCount').textContent=`${items.length} / ${artifacts.length}`;
    $('artifactPicker').innerHTML=items.map(item=>`<button type="button" class="artifact-choice ${item.id===selected?'selected':''}" data-artifact-id="${e(item.id)}">${img(item,'')}<span>${e(item.name)}</span></button>`).join('') || '<div class="empty">검색 결과가 없습니다.</div>';
  }
  $('artifactSearch').oninput=picker;$('artifactPicker').onclick=event=>{const b=event.target.closest('[data-artifact-id]');if(b)select(b.dataset.artifactId);};picker();if(selected)await select(selected);
}
async function setupBlobs(){
  const items=await api.catalog('blobs'), groups=Map.groupBy(items,item=>item.tier);
  $('blobWrap').innerHTML=[...groups].map(([tier,blobs])=>`<section class="calc-card blob-tier-card"><div class="calc-card-head"><div class="calc-card-title">${e(tier)}</div></div><div class="blob-tier-grid">${blobs.map(item=>`<article class="blob-row"><button type="button" class="blob-card-button" data-blob-id="${e(item.id)}" aria-haspopup="dialog"><div class="blob-identity"><div class="blob-image-wrap">${img(item,'blob-image')}</div><div class="blob-copy"><div class="blob-name">${e(item.name)}</div></div></div><div class="blob-card-action">클릭해서 효과 보기 ↗</div></button></article>`).join('')}</div></section>`).join('');
  $('blobWrap').onclick=event=>{const b=event.target.closest('[data-blob-id]');if(b)showPopup('blobs',b.dataset.blobId,event,b);};
}
async function setupTreasures(){
  const items=await api.catalog('treasures');
  for(const tier of ['S','A','B']){
    const container=$(`treasure${tier}List`);
    container.innerHTML=items.filter(item=>item.tier===tier).map(item=>`<div class="treasure-item"><button type="button" class="treasure-card" data-treasure-id="${e(item.id)}">${img(item,'treasure-image')}<div class="treasure-card-head"><div class="treasure-name">${e(item.name)}</div><div class="treasure-card-owner">${e(item.hero)} 전용</div><div class="treasure-badge tier-${tier.toLowerCase()}">${tier} 티어</div></div><div class="treasure-card-action">영웅 정보 · 레벨별 효과 보기 →</div></button></div>`).join('');
    container.onclick=event=>{const b=event.target.closest('[data-treasure-id]');if(!b)return;const item=items.find(item=>item.id===b.dataset.treasureId);showHero(item.heroId,'treasure',item.id);};
  }
}
async function setupBosses(){
  const items=await api.catalog('bosses');
  for(const [mode,target,span] of [['regular','bossTableBody',6],['origin','originBossBody',4]]){
    $(target).innerHTML=items.filter(item=>item.mode===mode).map(item=>`<tr><td colspan="${span}"><button type="button" class="api-boss" data-boss-id="${e(item.id)}">${e(item.name)} · 설명/공략 보기</button></td></tr>`).join('');
    $(target).onclick=event=>{const b=event.target.closest('[data-boss-id]');if(b)showPopup('bosses',b.dataset.bossId,event,b);};
  }
}
async function initialize(page){
  const key=['formation','guildformation'].includes(page)?'formation':page;
  if(initialized.has(key))return;
  if(initializing.has(key))return initializing.get(key);
  const task=(async()=>{
    if(key==='artifact')await setupArtifacts();
    if(key==='blob')await setupBlobs();
    if(key==='treasure')await setupTreasures();
    if(key==='boss')await setupBosses();
    if(key==='formation'){
      const [items,settings,module]=await Promise.all([api.catalog('formation'),api.detail('settings','formation'),import('./formation.mjs')]);
      module.initFormation(items.map(item=>({...item,image:safeImage(item.image)})),settings.configs);
    }
    if(key==='tiermaker'){
      const [heroes,settings,module]=await Promise.all([api.catalog('heroes'),api.detail('settings','tier-maker'),import('./tier.mjs')]);
      module.initTier({heroes},id=>safeImage(heroes.find(hero=>hero.id===id)?.image),settings.defaults,escapeHtml);
    }
    if(key==='calc'){
      const [upgrade,breakthrough,module]=await Promise.all([api.detail('costs','hero-upgrade'),api.detail('costs','hero-breakthrough'),import('./calculators.mjs')]);
      module.initHeroCalculator(upgrade.rows,breakthrough.rows);
    }
    if(key==='pet'){
      const [levels,ranges,module]=await Promise.all([api.detail('costs','pet-levels'),api.detail('costs','pet-ranges'),import('./calculators.mjs')]);
      module.initPetCalculator(levels.rows,ranges.rows);
    }
    initialized.add(key);
  })();
  initializing.set(key,task);try{await task;}finally{initializing.delete(key);}
}
async function navigate(page){
  setPage(page);$('apiStatus').textContent='';
  if(page==='guide'){renderGuide();return;}
  const host=$(pages[page]);
  let status=host.querySelector('.page-api-status');
  if(!status){status=document.createElement('div');status.className='page-api-status';host.prepend(status);}
  status.innerHTML='<div class="api-load">불러오는 중…</div>';
  try{await initialize(page);status.innerHTML='';}catch(error){errorInto(status,error,()=>navigate(page));}
}
document.querySelectorAll('form').forEach(form=>form.addEventListener('submit',event=>event.preventDefault()));
document.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.page)));
renderGuide();
