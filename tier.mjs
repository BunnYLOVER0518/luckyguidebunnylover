export function initTier(DATA, HERO_IMG, TIER_MAKER_DEFAULTS, escapeHeroInfoHtml){
const tierMakerPage=document.getElementById('tierMakerPage');
const TIER_MAKER_TIERS = ['S','A','B','C'];

const TIER_MAKER_STORAGE_KEY = 'luckyGuideTierMakerV1';
let tierMakerSelectedHeroId = null;

function createFreshTierMakerState(){
  return {
    tiers: { S:[], A:[], B:[], C:[] },
    unranked: DATA.heroes.map(hero=>String(hero.id)),
    names: { ...TIER_MAKER_DEFAULTS.names },
    colors: { ...TIER_MAKER_DEFAULTS.colors }
  };
}

function normalizeTierMakerState(saved){
  const fresh = createFreshTierMakerState();
  if(!saved || typeof saved !== 'object') return fresh;
  const validIds = new Set(DATA.heroes.map(hero=>String(hero.id)));
  const usedIds = new Set();
  const normalized = {
    tiers: { S:[], A:[], B:[], C:[] },
    unranked: [],
    names: { ...fresh.names },
    colors: { ...fresh.colors }
  };
  const takeValidIds = list => (Array.isArray(list) ? list : []).map(String).filter(id=>{
    if(!validIds.has(id) || usedIds.has(id)) return false;
    usedIds.add(id);
    return true;
  });
  TIER_MAKER_TIERS.forEach(tier=>{
    normalized.tiers[tier] = takeValidIds(saved.tiers?.[tier]);
    const customName = String(saved.names?.[tier] ?? '').trim();
    if(customName) normalized.names[tier] = customName.slice(0,8);
  });
  normalized.unranked = takeValidIds(saved.unranked);
  DATA.heroes.forEach(hero=>{
    const id = String(hero.id);
    if(!usedIds.has(id)) normalized.unranked.push(id);
  });
  return normalized;
}

function loadTierMakerState(){
  try{
    return normalizeTierMakerState(JSON.parse(localStorage.getItem(TIER_MAKER_STORAGE_KEY) || 'null'));
  }catch(error){
    return createFreshTierMakerState();
  }
}

let tierMakerState = loadTierMakerState();

function saveTierMakerState(){
  try{
    localStorage.setItem(TIER_MAKER_STORAGE_KEY, JSON.stringify(tierMakerState));
  }catch(error){
    setTierMakerStatus('이 브라우저에서는 자동 저장을 사용할 수 없습니다.');
  }
}

function setTierMakerStatus(message){
  document.getElementById('tierMakerStatus').textContent = message || '';
}

function tierMakerHeroById(heroId){
  return DATA.heroes.find(hero=>String(hero.id) === String(heroId));
}

function renderTierMakerHero(heroId){
  const hero = tierMakerHeroById(heroId);
  if(!hero) return '';
  const initial = escapeHeroInfoHtml(hero.name.trim()[0] || '?');
  return `<button type="button" class="tier-maker-hero" draggable="true" data-tier-hero-id="${escapeHeroInfoHtml(hero.id)}" aria-pressed="false" aria-label="${escapeHeroInfoHtml(hero.name)} 선택">
    <span class="tier-maker-hero-image-wrap">
      <img class="tier-maker-hero-image" src="${HERO_IMG(hero.id)}" alt="" loading="lazy" draggable="false"
           onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
      <span class="tier-maker-hero-fallback">${initial}</span>
    </span>
    <span class="tier-maker-hero-name">${escapeHeroInfoHtml(hero.name)}</span>
  </button>`;
}

function updateTierMakerSelection(){
  document.querySelectorAll('.tier-maker-hero').forEach(card=>{
    const selected = card.dataset.tierHeroId === tierMakerSelectedHeroId;
    card.classList.toggle('selected', selected);
    card.setAttribute('aria-pressed', String(selected));
  });
  const hero = tierMakerHeroById(tierMakerSelectedHeroId);
  document.getElementById('tierMakerSelection').innerHTML = hero
    ? `<strong>${escapeHeroInfoHtml(hero.name)}</strong> 이동할 티어를 선택하세요`
    : '영웅을 선택해 주세요';
  document.querySelectorAll('.tier-maker-move').forEach(button=>button.disabled = !hero);
}

function syncTierMakerControls(){
  TIER_MAKER_TIERS.forEach(tier=>{
    const nameInput = document.querySelector(`[data-tier-name="${tier}"]`);
    const row = document.querySelector(`[data-tier-row="${tier}"]`);
    nameInput.value = tierMakerState.names[tier];
    row.style.setProperty('--tier-color', tierMakerState.colors[tier]);
  });
}

function renderTierMaker(){
  TIER_MAKER_TIERS.forEach(tier=>{
    const zone = document.querySelector(`[data-tier-zone="${tier}"]`);
    const heroIds = tierMakerState.tiers[tier];
    zone.innerHTML = heroIds.length
      ? heroIds.map(renderTierMakerHero).join('')
      : '<div class="tier-maker-empty">영웅을 이곳에 배치하세요</div>';
  });
  const pool = document.getElementById('tierMakerPool');
  pool.innerHTML = tierMakerState.unranked.length
    ? tierMakerState.unranked.map(renderTierMakerHero).join('')
    : '<div class="tier-maker-empty">모든 영웅을 배치했습니다</div>';
  document.getElementById('tierMakerPoolCount').textContent = `${tierMakerState.unranked.length}명`;
  syncTierMakerControls();
  updateTierMakerSelection();
}

function moveTierMakerHero(heroId, destination, beforeHeroId=''){
  const id = String(heroId);
  if(!tierMakerHeroById(id)) return;
  TIER_MAKER_TIERS.forEach(tier=>{
    tierMakerState.tiers[tier] = tierMakerState.tiers[tier].filter(item=>item !== id);
  });
  tierMakerState.unranked = tierMakerState.unranked.filter(item=>item !== id);
  const targetList = destination === 'unranked' ? tierMakerState.unranked : tierMakerState.tiers[destination];
  if(!targetList) return;
  const beforeIndex = beforeHeroId ? targetList.indexOf(String(beforeHeroId)) : -1;
  if(beforeIndex >= 0) targetList.splice(beforeIndex, 0, id);
  else targetList.push(id);
  saveTierMakerState();
  renderTierMaker();
  const hero = tierMakerHeroById(id);
  const destinationName = destination === 'unranked' ? '미배치' : tierMakerState.names[destination];
  setTierMakerStatus(`${hero.name} → ${destinationName}`);
}

tierMakerPage.addEventListener('click', event=>{
  const heroCard = event.target.closest('.tier-maker-hero');
  if(!heroCard) return;
  const heroId = heroCard.dataset.tierHeroId;
  tierMakerSelectedHeroId = tierMakerSelectedHeroId === heroId ? null : heroId;
  updateTierMakerSelection();
});

tierMakerPage.addEventListener('dragstart', event=>{
  const heroCard = event.target.closest('.tier-maker-hero');
  if(!heroCard || !event.dataTransfer) return;
  tierMakerSelectedHeroId = heroCard.dataset.tierHeroId;
  heroCard.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', heroCard.dataset.tierHeroId);
  updateTierMakerSelection();
});

tierMakerPage.addEventListener('dragend', event=>{
  event.target.closest('.tier-maker-hero')?.classList.remove('dragging');
  document.querySelectorAll('.tier-maker-dropzone').forEach(zone=>zone.classList.remove('drag-over'));
});

document.querySelectorAll('.tier-maker-dropzone').forEach(zone=>{
  zone.addEventListener('dragover', event=>{
    event.preventDefault();
    if(event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', event=>{
    if(!zone.contains(event.relatedTarget)) zone.classList.remove('drag-over');
  });
  zone.addEventListener('drop', event=>{
    event.preventDefault();
    zone.classList.remove('drag-over');
    const heroId = event.dataTransfer?.getData('text/plain');
    const beforeCard = event.target.closest('.tier-maker-hero');
    if(heroId) moveTierMakerHero(heroId, zone.dataset.tierZone, beforeCard?.dataset.tierHeroId || '');
  });
});

document.querySelectorAll('.tier-maker-move').forEach(button=>{
  button.addEventListener('click', ()=>{
    if(tierMakerSelectedHeroId) moveTierMakerHero(tierMakerSelectedHeroId, button.dataset.moveTier);
  });
});

document.querySelectorAll('[data-tier-name]').forEach(input=>{
  input.addEventListener('input', ()=>{
    const tier = input.dataset.tierName;
    tierMakerState.names[tier] = input.value.trim().slice(0,8) || TIER_MAKER_DEFAULTS.names[tier];
    saveTierMakerState();
  });
  input.addEventListener('blur', ()=>{
    const tier = input.dataset.tierName;
    input.value = tierMakerState.names[tier];
  });
});

document.getElementById('tierMakerReset').addEventListener('click', ()=>{
  if(!confirm('티어메이커의 모든 배치를 초기화할까요?')) return;
  tierMakerState = createFreshTierMakerState();
  tierMakerSelectedHeroId = null;
  saveTierMakerState();
  renderTierMaker();
  setTierMakerStatus('모든 영웅을 미배치 상태로 초기화했습니다.');
});

function loadTierMakerCanvasImage(src){
  return new Promise(resolve=>{
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = ()=>resolve(image);
    image.onerror = ()=>resolve(null);
    image.src = src;
  });
}

function tierMakerCanvasTextLines(context, text, maxWidth, maxLines=2){
  const lines = [];
  let line = '';
  for(const character of String(text)){
    const next = line + character;
    if(line && context.measureText(next).width > maxWidth){
      lines.push(line);
      line = character;
      if(lines.length === maxLines - 1) break;
    }else{
      line = next;
    }
  }
  if(lines.length < maxLines && line) lines.push(line);
  return lines;
}

async function buildTierMakerCanvas(){
  const rows = TIER_MAKER_TIERS.map(tier=>({
    key:tier, name:tierMakerState.names[tier], color:tierMakerState.colors[tier], heroIds:tierMakerState.tiers[tier]
  }));
  if(tierMakerState.unranked.length){
    rows.push({ key:'unranked', name:'미배치', color:'#766956', heroIds:tierMakerState.unranked });
  }
  const width = 1400;
  const margin = 42;
  const labelWidth = 150;
  const cardWidth = 94;
  const cardHeight = 103;
  const cardsPerLine = Math.max(1, Math.floor((width - margin * 2 - labelWidth - 20) / cardWidth));
  const rowHeights = rows.map(row=>Math.max(126, 18 + Math.ceil(Math.max(1,row.heroIds.length) / cardsPerLine) * cardHeight));
  const height = 128 + rowHeights.reduce((sum,value)=>sum+value,0) + 44;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.fillStyle = '#f7f3ea';
  context.fillRect(0,0,width,height);
  context.fillStyle = '#201d18';
  context.font = '900 38px "Noto Sans KR", sans-serif';
  context.fillText('나만의 영웅 티어표', margin, 58);
  context.fillStyle = '#766956';
  context.font = '700 16px "Noto Sans KR", sans-serif';
  context.fillText('운빨존많겜 종합 가이드', margin, 88);

  const heroIds = [...new Set(rows.flatMap(row=>row.heroIds))];
  const imageEntries = await Promise.all(heroIds.map(async heroId=>{
    const hero = tierMakerHeroById(heroId);
    return [heroId, hero ? await loadTierMakerCanvasImage(HERO_IMG(hero.id)) : null];
  }));
  const images = new Map(imageEntries);
  let y = 112;

  rows.forEach((row,rowIndex)=>{
    const rowHeight = rowHeights[rowIndex];
    context.fillStyle = row.color;
    context.fillRect(margin,y,labelWidth,rowHeight);
    context.fillStyle = '#fffdf8';
    context.fillRect(margin+labelWidth,y,width-margin*2-labelWidth,rowHeight);
    context.strokeStyle = '#bcae99';
    context.lineWidth = 2;
    context.strokeRect(margin,y,width-margin*2,rowHeight);
    context.fillStyle = '#fff';
    const labelSize = row.name.length > 4 ? 24 : 36;
    context.font = `900 ${labelSize}px "Noto Sans KR", sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(row.name, margin + labelWidth/2, y + rowHeight/2, labelWidth - 18);
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';

    row.heroIds.forEach((heroId,index)=>{
      const hero = tierMakerHeroById(heroId);
      if(!hero) return;
      const column = index % cardsPerLine;
      const line = Math.floor(index / cardsPerLine);
      const x = margin + labelWidth + 12 + column * cardWidth;
      const cardY = y + 10 + line * cardHeight;
      context.fillStyle = '#fff';
      context.strokeStyle = '#d8cbb8';
      context.lineWidth = 1.5;
      context.fillRect(x,cardY,84,93);
      context.strokeRect(x,cardY,84,93);
      const image = images.get(heroId);
      if(image){
        const scale = Math.min(66/image.width, 62/image.height);
        const drawWidth = image.width * scale;
        const drawHeight = image.height * scale;
        context.drawImage(image, x+(84-drawWidth)/2, cardY+4+(62-drawHeight)/2, drawWidth, drawHeight);
      }else{
        context.fillStyle = '#776854';
        context.fillRect(x+9,cardY+5,66,61);
        context.fillStyle = '#fff';
        context.font = '900 24px "Noto Sans KR", sans-serif';
        context.textAlign = 'center';
        context.fillText(hero.name.trim()[0] || '?',x+42,cardY+45);
        context.textAlign = 'left';
      }
      context.fillStyle = '#30291f';
      context.font = '800 12px "Noto Sans KR", sans-serif';
      context.textAlign = 'center';
      tierMakerCanvasTextLines(context,hero.name,76,2).forEach((lineText,lineIndex)=>{
        context.fillText(lineText,x+42,cardY+78+lineIndex*13,76);
      });
      context.textAlign = 'left';
    });
    y += rowHeight;
  });
  return canvas;
}

document.getElementById('tierMakerDownload').addEventListener('click', async ()=>{
  const button = document.getElementById('tierMakerDownload');
  button.disabled = true;
  setTierMakerStatus('티어표 이미지를 만드는 중입니다...');
  try{
    const canvas = await buildTierMakerCanvas();
    const blob = await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!blob) throw new Error('PNG 생성 실패');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '운빨존많겜_나만의_티어표.png';
    link.click();
    setTimeout(()=>URL.revokeObjectURL(link.href),1000);
    setTierMakerStatus('PNG 파일로 저장했습니다.');
  }catch(error){
    setTierMakerStatus('이미지 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
  }finally{
    button.disabled = false;
  }
});

renderTierMaker();


}