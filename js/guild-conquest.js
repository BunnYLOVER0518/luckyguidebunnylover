(() => {
  'use strict';
  const root = document.getElementById('guildConquest');
  if (!root) return;
  const members = (window.GUILD_MEMBERS || []).filter(m => !['용병','예비길드원','리미티드2기'].includes((m.role || '').replace(/\s/g,'')));
  const caps = root.dataset.capacities.split(',').map(Number);
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
    const assigned = members.filter(m=>entries.some(e=>e.id===m.id&&e.zone===zone));
    $('.cq-assigned').replaceChildren();
    assigned.forEach(m=>$('.cq-assigned').append(button(`${m.name} × ${entries.filter(e=>e.id===m.id&&e.zone===zone).length}회 ×`,()=>change(m.id,-1))));
    if(!assigned.length) $('.cq-assigned').textContent='아직 배정된 길드원이 없습니다.';
    renderRoster(); renderOverview(); $('.cq-status').textContent = notice; $('.cq-export textarea').value = report();
  }
  $('.cq-search').addEventListener('input', e => {query=e.target.value; renderRoster();});
  $('.cq-actions').append(button('분배표 복사', async () => {
    try { await navigator.clipboard.writeText(report()); notice='분배표를 복사했습니다.'; }
    catch { $('.cq-export').open=true; $('.cq-export textarea').focus(); $('.cq-export textarea').select(); notice='자동 복사가 차단되어 내용을 선택했습니다. Ctrl+C 또는 길게 눌러 복사하세요.'; }
    $('.cq-status').textContent=notice;
  }, 'cq-primary'), button('배정 전체 초기화', () => {
    if (!entries.length || !confirm('이 브라우저에 저장된 점령전 배정을 모두 초기화할까요?')) return;
    entries=[]; save(); render();
  }));
  render();
})();
