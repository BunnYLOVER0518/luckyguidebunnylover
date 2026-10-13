(() => {
  'use strict';
  const root = document.getElementById('guildConquest');
  if (!root) return;
  const members = (window.GUILD_MEMBERS || []).filter(m => !['용병','예비길드원','리미티드2기'].includes((m.role || '').replace(/\s/g,'')));
  const caps = root.dataset.capacities.split(',').map(Number);
  const bosses = root.dataset.bosses.split(',');
  const restrictedZones = new Set(root.dataset.restrictedZones.split(',').map(Number));
  const zoneInfo = z => `${bosses[z]} · 영웅 제한 ${restrictedZones.has(z+1)?'있음':'없음'}`;
  const limit = Number(root.dataset.memberLimit), key = 'limited-conquest-preseason11-v1';
  const positions = [[14,43],[30,33],[49,37],[70,33],[88,40],[33,50],[53,58],[70,45],[87,52],[17,79],[34,63],[57,84],[72,72],[88,67],[88,81]];
  let zone = 0, query = '', notice = '', entries = [], selectedMember = null;
  const total = id => entries.filter(e => e.id === id).length;
  const count = z => entries.filter(e => e.zone === z).length;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(saved)) throw new Error('invalid');
    for (const e of saved) {
      if (e && members.some(m => m.id === e.id) && Number.isInteger(e.zone) && e.zone >= 0 && e.zone < caps.length && total(e.id) < limit && count(e.zone) < caps[e.zone]) entries.push({id:e.id, zone:e.zone});
    }
    if (entries.length !== saved.length) notice = '명단에서 빠진 인원이나 한도를 초과한 저장 항목을 제외했습니다.';
  } catch { notice = '저장 자료를 읽지 못했습니다. 새 분배표로 시작합니다.'; }
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const button = (label, fn, className) => {
    const b = el('button', label, className); b.type = 'button'; b.addEventListener('click', fn); return b;
  };
  root.innerHTML = `<div class="cq-heading"><p class="cq-eyebrow">PRESEASON 11 · GUILD CONQUEST</p><h2>길드 점령전</h2><p>길드원 카드를 지도 속 구역으로 드래그하면 1회 배정됩니다.<br>카드를 선택한 뒤 구역을 눌러도 배정할 수 있습니다. 1인 최대 3회.</p></div><div class="cq-stats" aria-live="polite"></div><div class="cq-map" aria-label="점령전 구역 선택"></div><p class="cq-caption">원본 이미지의 점수·시간·잔여 횟수는 촬영 당시 표시입니다. 각 구역 위 배지가 현재 배정 현황입니다.</p><div class="cq-pool"><div class="cq-pool-head"><h3>길드원 카드</h3><label class="cq-search-label">길드원 검색<input class="cq-search" type="search" placeholder="이름 또는 직책 검색"></label></div><p class="cq-selection" aria-live="polite"></p><div class="cq-roster"></div></div><div class="cq-panel"><h3 class="cq-zone-title"></h3><p class="cq-caption">선택 구역의 배정 명단 · 이름을 누르면 1회 취소됩니다. 카드의 + / −로도 조절할 수 있습니다.</p><div class="cq-assigned"></div></div><div class="cq-actions"></div><p class="cq-status" role="status"></p><p class="cq-caption">이 브라우저에 자동 저장됩니다. 다른 기기나 길드원과 자동으로 공유되지 않습니다.</p><details class="cq-export"><summary>전체 분배표 · 복사할 내용 확인</summary><textarea readonly aria-label="전체 점령전 분배표"></textarea></details>`;
  const $ = s => root.querySelector(s);
  const zoneMeta = el('p', undefined, 'cq-zone-meta');
  $('.cq-zone-title').after(zoneMeta);
  const namesKey = 'limited-conquest-share-names-v1';
  let shareNames = {};
  try {
    const saved=JSON.parse(localStorage.getItem(namesKey)||'{}');
    if(saved && !Array.isArray(saved) && typeof saved==='object') {
      for(const m of members) if(typeof saved[m.id]==='string') shareNames[m.id]=saved[m.id].replace(/\s+/g,' ').trim().slice(0,40);
    }
  } catch { notice='공유용 이름을 읽지 못해 기본 이름을 사용합니다.'; }
  function defaultShareName(name){
    return name.replace(/^[ᴸᴹ\s]+/u,'').trim()
      .replace(/(?:[./]\s*\d{2}|\s+\d{2}|(?<=[가-힣])\d{2}).*$/u,'')
      .replace(/[^a-zA-Z0-9가-힣]/gu,'') || name;
  }
  const shortName = m => shareNames[m.id] || defaultShareName(m.name);
  const sharedLabel = m => members.some(other=>other.id!==m.id && shortName(other)===shortName(m)) ? `${shortName(m)} (${m.name})` : shortName(m);
  const kakaoPreview=el('details',undefined,'cq-kakao-preview');
  kakaoPreview.append(el('summary','카톡용 분배표 미리보기'));
  const kakaoText=el('textarea');kakaoText.readOnly=true;kakaoText.setAttribute('aria-label','카톡용 분배표');kakaoPreview.append(kakaoText);
  $('.cq-export').before(kakaoPreview);
  $('.cq-export summary').textContent='관리용 분배표 미리보기';
  const nameEditor=el('details',undefined,'cq-name-editor');
  nameEditor.append(el('summary','공유용 이름 수정'),el('p','카톡용 복사에 사용할 이름입니다. 빈칸은 기본 이름으로 돌아갑니다. 이 브라우저에 저장되며, 이름이 겹치면 원래 이름을 함께 표시합니다.','cq-caption'));
  const nameGrid=el('div',undefined,'cq-name-grid');
  for(const m of members){
    const label=el('label',m.name);const input=el('input');input.type='text';input.maxLength=40;input.value=shortName(m);input.placeholder=defaultShareName(m.name);input.setAttribute('aria-label',`${m.name} 공유용 이름`);
    input.addEventListener('input',()=>{
      shareNames[m.id]=input.value.replace(/\s+/g,' ').trim();
      try{localStorage.setItem(namesKey,JSON.stringify(shareNames));notice='공유용 이름을 저장했습니다.';}catch{notice='공유용 이름을 저장하지 못했습니다. 현재 화면에서만 적용됩니다.';}
      kakaoText.value=kakaoReport();$('.cq-status').textContent=notice;
    });
    label.append(input);nameGrid.append(label);
  }
  nameEditor.append(nameGrid);kakaoPreview.before(nameEditor);
  const layout = el('div', undefined, 'cq-layout');
  const mapColumn = el('div', undefined, 'cq-map-column');
  const map = $('.cq-map'), caption = map.nextElementSibling, pool = $('.cq-pool');
  map.before(layout);
  mapColumn.append(map, caption);
  layout.append(mapColumn, pool);
  let overviewMode = 'zone';
  const overview = el('section', undefined, 'cq-overview');
  overview.setAttribute('aria-label','전체 배정 현황');
  overview.append(el('h3','전체 배정 현황'),el('p','배정하거나 취소하면 바로 반영됩니다. 미배정 구역과 길드원도 모두 표시합니다.','cq-caption'));
  const views=el('div',undefined,'cq-view-buttons');
  const zoneView=button('구역별 보기',()=>{overviewMode='zone';renderOverview();});
  const memberView=button('길드원별 보기',()=>{overviewMode='member';renderOverview();});
  views.append(zoneView,memberView);
  const overviewBody=el('div',undefined,'cq-overview-grid');
  overview.append(views,overviewBody);
  $('.cq-panel').after(overview);
  function renderOverview(){
    zoneView.setAttribute('aria-pressed',String(overviewMode==='zone'));
    memberView.setAttribute('aria-pressed',String(overviewMode==='member'));
    overviewBody.replaceChildren();
    if(overviewMode==='zone'){
      caps.forEach((cap,z)=>{
        const card=el('article',undefined,'cq-overview-card');
        card.append(el('h4',`${z+1}구역`),el('p',`${count(z)} / ${cap}회 배정 · ${cap-count(z)}회 남음`,'cq-overview-count'));
        const assigned=members.filter(m=>entries.some(e=>e.id===m.id&&e.zone===z));
        const list=el('ul');
        assigned.forEach(m=>list.append(el('li',`${m.name} · ${entries.filter(e=>e.id===m.id&&e.zone===z).length}회`)));
        if(assigned.length)card.append(list);else card.append(el('p','미배정','cq-caption'));
        overviewBody.append(card);
      });
    }else{
      members.forEach(m=>{
        const card=el('article',undefined,'cq-overview-card');
        card.append(el('h4',m.name),el('p',`${total(m.id)} / ${limit}회 배정 · ${limit-total(m.id)}회 남음`,'cq-overview-count'));
        const list=el('ul');
        caps.forEach((cap,z)=>{const n=entries.filter(e=>e.id===m.id&&e.zone===z).length;if(n)list.append(el('li',`${z+1}구역 · ${n}회`));});
        if(total(m.id))card.append(list);else card.append(el('p','미배정','cq-caption'));
        overviewBody.append(card);
      });
    }
  }
  // Keep distant map regions reachable when dragging from the member roster.
  let dragY = null, scrollFrame = null;
  function scrollDrag() {
    if (dragY === null) return;
    const dy = dragY < 90 ? -14 : dragY > innerHeight-90 ? 14 : 0;
    if (dy) window.scrollBy(0,dy);
    scrollFrame=requestAnimationFrame(scrollDrag);
  }
  document.addEventListener('dragover',e=>{
    if (!root.classList.contains('cq-dragging')) return;
    dragY=e.clientY;
    if(scrollFrame===null) scrollFrame=requestAnimationFrame(scrollDrag);
  });
  function stopScroll(){dragY=null;cancelAnimationFrame(scrollFrame);scrollFrame=null;}
  document.addEventListener('drop',stopScroll);
  document.addEventListener('dragend',stopScroll);
  function save() {
    try { localStorage.setItem(key, JSON.stringify(entries)); notice = '이 브라우저에 저장했습니다.'; }
    catch { notice = '브라우저 저장이 불가능합니다. 분배표를 복사해 보관하세요.'; }
  }
  function change(id, delta) {
    if (delta > 0) {
      if (!members.some(m=>m.id===id)) return;
      if (total(id) >= limit || count(zone) >= caps[zone]) { notice='개인 3회 또는 구역별 배정 한도에 도달했습니다.'; $('.cq-status').textContent=notice; return; }
      entries.push({id, zone});
    } else {
      const i = entries.findIndex(e => e.id === id && e.zone === zone);
      if (i < 0) return;
      entries.splice(i, 1);
    }
    save(); render();
  }
  function report() {
    const lines = ['길드 점령전 프리시즌 11 분배표', `총 ${entries.length}/${caps.reduce((a,b)=>a+b,0)}회 배정 · 1인 최대 ${limit}회`, ''];
    caps.forEach((cap,z) => {
      lines.push(`${z+1}구역 (${count(z)}/${cap}회)`);
      const assigned = members.filter(m => entries.some(e => e.id === m.id && e.zone === z));
      lines.push(...(assigned.length ? assigned.map(m => `  ${m.name} × ${entries.filter(e=>e.id===m.id&&e.zone===z).length}회`) : ['  미배정']));
    });
    lines.push('', '길드원별 배정 / 남은 횟수');
    members.forEach(m => lines.push(`${m.name}: ${total(m.id)}회 / ${limit-total(m.id)}회 남음`));
    return lines.join('\n');
  }
  function kakaoReport(){
    const sorted=[...members].sort((a,b)=>shortName(a).localeCompare(shortName(b),'ko',{numeric:true}) || a.name.localeCompare(b.name,'ko'));
    const lines=['📌 점령전 프리시즌 11 배정표','본인 이름을 찾아 지정된 구역에 참여해주세요.','괄호는 공격 횟수입니다.',''];
    for(const m of sorted.filter(m=>total(m.id)>0)){
      const targets=caps.flatMap((cap,z)=>{const n=entries.filter(e=>e.id===m.id&&e.zone===z).length;return n?[`${z+1}구역(${n}회)`]:[];});
      lines.push(`${sharedLabel(m)} → ${targets.join(' · ')}`);
    }
    const waiting=sorted.filter(m=>total(m.id)===0);
    if(waiting.length)lines.push('','⏳ 배정 대기',waiting.map(sharedLabel).join(' · '));
    return lines.join('\n');
  }
  function renderRoster() {
    const roster = $('.cq-roster'); roster.replaceChildren();
    const shown = members.filter(m => `${m.name} ${m.role}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
    for (const m of shown) {
      const row = el('div', undefined, 'cq-member');
      row.draggable = total(m.id) < limit;
      row.dataset.memberId = m.id;
      row.classList.toggle('picked', selectedMember === m.id);
      row.addEventListener('dragstart', e => {
        if (!row.draggable) { e.preventDefault(); return; }
        e.dataTransfer.setData('text/plain', m.id); e.dataTransfer.effectAllowed='copy';
        root.classList.add('cq-dragging');
      });
      row.addEventListener('dragend', () => {root.classList.remove('cq-dragging'); root.querySelectorAll('.drag-over').forEach(n=>n.classList.remove('drag-over'));});
      const pick = button('', () => {selectedMember=selectedMember===m.id?null:m.id; renderRoster();}, 'cq-pick');
      pick.setAttribute('aria-label', `${m.name} 카드 선택`); pick.setAttribute('aria-pressed', String(selectedMember===m.id));
      const photo=el('img'); photo.src=m.image; photo.alt=''; photo.loading='lazy'; photo.draggable=false;
      pick.append(photo); row.append(pick);
      const info = el('div'); info.append(el('strong', m.name), el('small', `${m.role} · 전체 ${total(m.id)}/${limit}회 · 남음 ${limit-total(m.id)}회`));
      const controls = el('div', undefined, 'cq-stepper');
      const n = entries.filter(e=>e.id===m.id&&e.zone===zone).length;
      const minus = button('−', () => change(m.id,-1)); minus.disabled = n === 0; minus.setAttribute('aria-label',`${m.name} ${zone+1}구역 1회 취소`);
      const plus = button('+', () => change(m.id,1)); plus.disabled = total(m.id) >= limit || count(zone) >= caps[zone]; plus.setAttribute('aria-label',`${m.name} ${zone+1}구역 1회 배정`);
      controls.append(minus, el('span', `${n}`), plus); row.append(info, controls); roster.append(row);
    }
    $('.cq-selection').textContent=selectedMember ? `${members.find(m=>m.id===selectedMember).name} 선택됨 · 배정할 구역을 누르세요. 다시 카드를 누르면 선택 해제됩니다.` : '카드를 드래그하거나 사진을 선택하세요. + / −는 현재 선택 구역에 적용됩니다.';
    if (!shown.length) roster.append(el('p','검색 결과가 없습니다.'));
  }
  function render() {
    const needed = caps.reduce((a,b)=>a+b,0);
    $('.cq-stats').textContent = `배정 ${entries.length} / ${needed}회 · 미배정 ${needed-entries.length}회 · 명단 ${members.length}명 / 잔여 ${members.length*limit-entries.length}회 · 완료 구역 ${caps.filter((c,z)=>count(z)===c).length}/15`;
    const map = $('.cq-map'); map.replaceChildren();
    const background=el('img'); background.src='assets/guild-conquest-preseason11.png'; background.alt='길드 점령전 프리시즌 11 원본 지도'; background.draggable=false; map.append(background);
    caps.forEach((cap,z) => {
      const b = button('', () => {zone=z; if(selectedMember) change(selectedMember,1); render();}, `cq-pin${zone===z?' selected':''}${count(z)===cap?' complete':''}`);
      b.dataset.zone=String(z);
      b.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';b.classList.add('drag-over');});
      b.addEventListener('dragleave',()=>b.classList.remove('drag-over'));
      b.addEventListener('drop',e=>{e.preventDefault(); const id=e.dataTransfer.getData('text/plain');zone=z;root.classList.remove('cq-dragging');change(id,1);render();});
      b.style.left = `${positions[z][0]}%`; b.style.top = `${positions[z][1]}%`;
      b.setAttribute('aria-pressed', String(zone===z)); b.setAttribute('aria-label',`${z+1}구역 ${count(z)}/${cap}회 배정`);
      b.append(el('strong',`${cap===15?'♜':'⚑'} ${z+1}구역`), el('span',`${count(z)} / ${cap}`));
      const placed = members.filter(m=>entries.some(e=>e.id===m.id&&e.zone===z));
      if(placed.length){
        const strip=el('div',undefined,'cq-placed');
        placed.slice(0,3).forEach(m=>{const img=el('img');img.src=m.image;img.alt=m.name;img.draggable=false;strip.append(img);});
        if(placed.length>3)strip.append(el('small',`+${placed.length-3}`));
        b.append(strip);
        b.title=placed.map(m=>`${m.name} × ${entries.filter(e=>e.id===m.id&&e.zone===z).length}회`).join('\n');
      }
      map.append(b);
    });
    $('.cq-zone-title').textContent = `${zone+1}구역 · ${count(zone)}/${caps[zone]}회 배정`;
    zoneMeta.textContent = zoneInfo(zone);
    const assigned = members.filter(m=>entries.some(e=>e.id===m.id&&e.zone===zone));
    $('.cq-assigned').replaceChildren();
    assigned.forEach(m=>$('.cq-assigned').append(button(`${m.name} × ${entries.filter(e=>e.id===m.id&&e.zone===zone).length}회 ×`,()=>change(m.id,-1))));
    if(!assigned.length) $('.cq-assigned').textContent='아직 배정된 길드원이 없습니다.';
    renderRoster(); renderOverview(); $('.cq-status').textContent = notice; $('.cq-export textarea').value = report();kakaoText.value=kakaoReport();
  }
  $('.cq-search').addEventListener('input', e => {query=e.target.value; renderRoster();});
  async function copyReport(kind){
    const isKakao=kind==='kakao',text=isKakao?kakaoReport():report();
    try { await navigator.clipboard.writeText(text); notice=`${isKakao?'카톡용':'관리용'} 분배표를 복사했습니다.`; }
    catch { const panel=isKakao?kakaoPreview:$('.cq-export'),area=panel.querySelector('textarea');panel.open=true;area.value=text;area.focus();area.select();notice='자동 복사가 차단되어 내용을 선택했습니다. Ctrl+C 또는 길게 눌러 복사하세요.'; }
    $('.cq-status').textContent=notice;
  }
  $('.cq-actions').append(button('카톡용 복사',()=>copyReport('kakao'),'cq-primary'),button('관리용 복사',()=>copyReport('admin')), button('배정 전체 초기화', () => {
    if (!entries.length || !confirm('이 브라우저에 저장된 점령전 배정을 모두 초기화할까요?')) return;
    entries=[]; save(); render();
  }));
  const tabs=el('div',undefined,'cq-tabs');
  tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','점령전 화면');
  const allocation=el('div',undefined,'cq-tab-panel');allocation.id='cq-allocation';
  const information=el('section',undefined,'cq-tab-panel cq-zone-info');information.id='cq-information';
  // Move existing controls together, keeping assignments and search state intact.
  for(const node of [...root.children])if(!node.classList.contains('cq-heading'))allocation.append(node);
  const panels=[allocation,information];
  const tabButtons=['배치표','구역 정보'].map((label,i)=>{
    const tab=button(label,()=>selectTab(i));tab.id=`cq-tab-${i}`;tab.setAttribute('role','tab');
    tab.setAttribute('aria-controls',panels[i].id);
    panels[i].setAttribute('role','tabpanel');panels[i].setAttribute('aria-labelledby',tab.id);
    tab.addEventListener('keydown',e=>{
      let target;
      if(e.key==='ArrowRight'||e.key==='ArrowLeft')target=1-i;
      else if(e.key==='Home')target=0;else if(e.key==='End')target=1;else return;
      e.preventDefault();selectTab(target);tabButtons[target].focus();
    });
    return tab;
  });
  function selectTab(index){
    panels.forEach((panel,i)=>{panel.hidden=i!==index;tabButtons[i].setAttribute('aria-selected',String(i===index));tabButtons[i].tabIndex=i===index?0:-1;});
  }
  tabs.append(...tabButtons);
  const mythics=Object.keys(window.FORMATION_IMAGE_DATA || {}).filter(k=>k.startsWith('신화_')).map(k=>k.slice(3)).sort((a,b)=>a.localeCompare(b,'ko'));
  const restrictionKey='limited-conquest-preseason11-restrictions-v1';
  let restrictions={};
  try {
    const saved=JSON.parse(localStorage.getItem(restrictionKey)||'{}');
    for(const z of restrictedZones){
      const seen=new Set();
      restrictions[z]=Array.from({length:4},(_,i)=>{
        const name=saved?.[z]?.[i];
        if(!mythics.includes(name)||seen.has(name))return null;
        seen.add(name);return name;
      });
    }
  } catch { for(const z of restrictedZones)restrictions[z]=Array(4).fill(null); }
  const infoStatus=el('p','슬롯을 눌러 제한 신화 영웅을 선택하세요. 이 브라우저에 자동 저장됩니다.','cq-caption');
  infoStatus.setAttribute('role','status');
  const mapViewport=el('div',undefined,'cq-info-map-viewport');
  mapViewport.tabIndex=0;mapViewport.setAttribute('aria-label','보스와 제한 영웅 지도 · 좌우로 이동 가능');
  const grid=el('div',undefined,'cq-info-map');
  mapViewport.append(grid);
  const picker=el('dialog',undefined,'cq-hero-dialog');
  const pickerTitle=el('h3');pickerTitle.id='cq-picker-title';picker.setAttribute('aria-labelledby',pickerTitle.id);
  const search=el('input');search.type='search';search.placeholder='신화 영웅 검색';search.setAttribute('aria-label','제한 신화 영웅 검색');
  const choices=el('div',undefined,'cq-hero-choices');
  let targetZone=2,targetSlot=0,opener=null;
  const closePicker=()=>{picker.close();opener?.focus();};
  picker.addEventListener('cancel',()=>{opener?.focus();});
  function heroImage(name){const img=el('img');img.src=window.FORMATION_IMAGE_DATA[`신화_${name}`];img.alt='';return img;}
  function setHero(name){
    restrictions[targetZone][targetSlot]=name;
    try{localStorage.setItem(restrictionKey,JSON.stringify(restrictions));infoStatus.textContent='제한 영웅을 저장했습니다. 이 브라우저에 자동 저장됩니다.';}
    catch{infoStatus.textContent='저장하지 못했습니다. 현재 화면에서만 적용됩니다.';}
    picker.close();renderZoneMap();
    grid.querySelector(`[data-zone="${targetZone}"] [data-slot="${targetSlot}"]`).focus();
  }
  function renderChoices(){
    choices.replaceChildren();
    for(const name of mythics.filter(n=>n.includes(search.value.trim()))){
      const b=button('',()=>setHero(name),'cq-hero-choice');
      b.append(heroImage(name),el('span',name));
      b.disabled=restrictions[targetZone].some((n,i)=>n===name&&i!==targetSlot);
      choices.append(b);
    }
    if(!choices.children.length)choices.append(el('p','검색 결과가 없습니다.'));
  }
  search.addEventListener('input',renderChoices);
  const pickerActions=el('div',undefined,'cq-actions');
  pickerActions.append(button('슬롯 비우기',()=>setHero(null)),button('닫기',closePicker));
  picker.append(pickerTitle,search,choices,pickerActions);
  function renderZoneMap(){
    const background=el('img');background.src='assets/guild-conquest-preseason11.png';background.alt='길드 점령전 프리시즌 11 구역 지도';background.className='cq-info-background';
    grid.replaceChildren(background);
    caps.forEach((_,z)=>{
      const card=el('article',undefined,'cq-info-pin');card.dataset.zone=String(z+1);
      card.style.left=`${positions[z][0]}%`;card.style.top=`${positions[z][1]}%`;
      const header=el('div',undefined,'cq-boss-heading'),img=el('img');
      img.src=`${root.dataset.bossImageBase}/${bosses[z]}.png`;img.alt=bosses[z];img.className='cq-boss-image';
      const label=el('div');label.append(el('h3',`${z+1}구역`),el('strong',bosses[z],'cq-boss-name'));
      header.append(img,label);card.append(header);
      if(restrictedZones.has(z+1)){
        card.append(el('p','신화 제한','cq-restriction-label'));
        const slots=el('div',undefined,'cq-restriction-slots');
        restrictions[z+1].forEach((name,i)=>{
          const slot=button('',()=>{
            targetZone=z+1;targetSlot=i;opener=slot;search.value='';
            pickerTitle.textContent=`${z+1}구역 · 제한 영웅 ${i+1}`;renderChoices();picker.showModal();search.focus();
          },'cq-restriction-slot');
          slot.title=name||'제한 영웅 선택';slot.dataset.slot=String(i);slot.setAttribute('aria-label',`${z+1}구역 제한 영웅 ${i+1}: ${name||'빈칸'}`);
          if(name)slot.append(heroImage(name),el('span',name));else slot.append(el('span','+'),el('small','선택'));
          slots.append(slot);
        });
        card.append(slots);
      }else card.append(el('p','영웅 제한 없음','cq-caption'));
      grid.append(card);
    });
  }
  renderZoneMap();
  information.append(infoStatus,el('p','작은 화면에서는 지도를 좌우로 밀어 확인하세요.','cq-map-hint'),mapViewport,picker);root.append(tabs,allocation,information);
  selectTab(0);
  render();
})();
