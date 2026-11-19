(() => {
  'use strict';
  const GRADES = ['일반','희귀','영웅','전설','신화'];
  const COSTS = [5,10,20,30];
  const createState = () => ({slots:Array(5).fill(null),keys:0,rolls:0});
  const matches = (slot,goal) => slot && slot.id===goal.id && slot.grade===goal.grade && slot.percent>=goal.percent;
  // Maximum one-to-one matching: a single figure cannot satisfy two goals.
  function matchGoals(slots,goals) {
    const owner=Array(5).fill(-1);
    const order=slots.map((_,i)=>i).sort((a,b)=>Number(!!slots[b]?.locked)-Number(!!slots[a]?.locked));
    function visit(g,seen) {
      for(const i of order) {
        if(owner[i]<0&&!seen.has(i)&&matches(slots[i],goals[g])){seen.add(i);owner[i]=g;return true;}
      }
      for(const i of order) {
        if(seen.has(i)||!matches(slots[i],goals[g])) continue;
        seen.add(i);
        if(owner[i]<0||visit(owner[i],seen)){owner[i]=g;return true;}
      }
      return false;
    }
    const goalOrder=goals.map((_,i)=>i).sort((a,b)=>goals[b].percent-goals[a].percent);
    for(const g of goalOrder) visit(g,new Set());
    return owner;
  }
  const complete=(state,goals)=>goals.length>0&&matchGoals(state.slots,goals).filter(g=>g>=0).length===goals.length;
  const lockCount=state=>state.slots.filter(s=>s?.locked).length;
  const cost=state=>COSTS[lockCount(state)];
  function autoLock(state,goals,eligible=new Set([0,1,2,3,4])) {
    const owner=matchGoals(state.slots,goals);
    // Prefer the stricter target when several goals arrive in the same roll.
    const candidates=owner.map((g,i)=>({g,i})).filter(({g,i})=>g>=0&&!state.slots[i].locked&&eligible.has(i))
      .sort((a,b)=>goals[b.g].percent-goals[a.g].percent||a.g-b.g);
    let room=3-lockCount(state);
    for(const {i} of candidates){if(room<=0)break;state.slots[i].locked=true;room--;}
  }
  function toggleLock(state,index) {
    const slot=state.slots[index];
    if(!slot)return false;
    if(slot.locked){slot.locked=false;return true;}
    if(lockCount(state)>=3)return false;
    slot.locked=true;return true;
  }
  function roll(state,ids,goals,random=Math.random) {
    if(!ids.length)throw new Error('블롭 자료가 없습니다.');
    const lockedIds=state.slots.filter(slot=>slot?.locked).map(slot=>slot.id);
    const pool=[...new Set(ids)].filter(id=>!lockedIds.includes(id));
    if(new Set(lockedIds).size!==lockedIds.length||pool.length<5-lockedIds.length)throw new Error('중복 없이 5칸을 채울 블롭 자료가 부족합니다.');
    const paid=cost(state),changed=new Set();
    state.slots=state.slots.map((slot,i)=>{
      if(slot?.locked)return slot;
      changed.add(i);
      const [id]=pool.splice(Math.floor(random()*pool.length),1);
      return {id,grade:Math.floor(random()*5),percent:Math.floor(random()*101),locked:false};
    });
    state.keys+=paid;state.rolls++;
    autoLock(state,goals,changed);
    return {paid,done:complete(state,goals)};
  }
  const api={GRADES,COSTS,createState,matches,matchGoals,complete,lockCount,cost,autoLock,toggleLock,roll};
  if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
  const root=document.getElementById('blobSimulator');if(!root)return;
  const figures=window.BLOB_FIGURE_DATA||[],ids=figures.map(f=>f.id),byId=new Map(figures.map(f=>[f.id,f]));
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>n.toLocaleString('ko-KR');
  let state=createState(),goals=[],running=false,generation=0;
  const defaults=['one-eye-blob','water-blob','santa-blob','bread-blob','cola-blob'];
  root.innerHTML=`<header><p class="bls-eyebrow">BLOB FIGURE LAB</p><h2>블롭 피규어 뽑기</h2><p>원하는 5칸을 완성하기까지, 열쇠가 얼마나 필요할까요?</p></header>
  <div class="bls-rules"><span>블롭 ${ids.length}종 · 중복 없이 균등 추첨</span><span>등급별 20%</span><span>퍼센트 0~100 정수 · 균등</span></div>
  <section class="bls-goals"><h3>원하는 블롭 설정</h3><p>최대 5개 목표를 설정하세요. 선택한 <strong>등급과 동일하고 퍼센트가 목표 이상</strong>이면 충족합니다. 블롭 종류는 목표 사이에 중복으로 지정할 수 없습니다.</p>
  <div class="bls-goal-list">${defaults.map((id,i)=>`<div class="bls-goal" data-goal="${i}"><label class="bls-goal-use"><input type="checkbox" checked aria-label="목표 ${i+1} 사용">목표 ${i+1}</label><label>블롭<button type="button" class="bls-kind" value="${id}" aria-label="목표 ${i+1} 블롭 선택" aria-haspopup="dialog"><img src="${byId.get(id).image}" alt=""><span>${esc(byId.get(id).name)}</span><span aria-hidden="true">▾</span></button></label><label>등급<select class="bls-grade" aria-label="목표 ${i+1} 등급">${GRADES.map((g,j)=>`<option value="${j}" ${j===4?'selected':''}>${g}</option>`).join('')}</select></label><label>최소 퍼센트<div class="bls-percent-field"><input type="number" class="bls-percent" min="0" max="100" step="1" value="80" aria-label="목표 ${i+1} 최소 퍼센트"><span>%</span></div></label><span class="bls-goal-state"></span></div>`).join('')}</div>
  <p class="bls-help">목표에 맞는 결과는 최대 3개까지 자동 잠금됩니다. 동시에 여러 개가 맞으면 최소 퍼센트가 높은 목표부터, 같으면 목표 순서대로 잠급니다. 설정 변경 시 현재 결과와 누적 사용량이 초기화됩니다.</p></section>
  <section class="bls-results" aria-label="뽑기 결과"><div class="bls-result-head"><h3>나의 피규어 5칸</h3><span class="bls-lock-count"></span></div><p class="bls-help">카드를 터치하면 잠금 / 해제됩니다. 잠기지 않은 칸은 다음 뽑기에서 모두 바뀝니다.</p><div class="bls-slots"></div></section>
  <div class="bls-dashboard" aria-live="polite"><div><span>누적 사용 열쇠</span><strong class="bls-keys">0개</strong></div><div><span>뽑기 횟수</span><strong class="bls-rolls">0회</strong></div><div><span>다음 뽑기 비용</span><strong class="bls-cost">5개</strong></div><div><span>목표 충족</span><strong class="bls-progress">0 / 5</strong></div></div>
  <div class="bls-actions"><button type="button" data-action="roll">1회 뽑기</button><button type="button" data-action="auto" aria-label="목표까지 자동 뽑기">목표까지 자동</button><button type="button" data-action="stop" disabled>자동 뽑기 중지</button><button type="button" data-action="reset">초기화</button></div>
  <p class="bls-status" role="status">목표를 설정하고 뽑기를 시작하세요.</p>
  <details class="bls-info"><summary>열쇠 비용과 시뮬레이션 기준</summary><p>잠금 0개: 5열쇠 / 1개: 10열쇠 / 2개: 20열쇠 / 3개: 30열쇠. 뽑기 직전 잠금 수로 비용을 계산합니다.</p><p>5칸은 서로 다른 블롭으로 추첨합니다. 잠긴 블롭과 이번 뽑기에서 나온 블롭은 나머지 칸의 추첨에서 제외합니다. 퍼센트는 해당 등급 내 수치 위치를 나타내는 시뮬레이션 값이며 실제 효과 증가율과 다릅니다. 사용자 지정 확률이며 게임의 실제 등급 확률을 재현한 것은 아닙니다.</p><p>자동 뽑기는 현재 결과가 모든 목표를 충족하면 종료합니다. 횟수 제한 없이 목표 달성까지 계속 진행합니다. 중지 버튼으로 언제든 멈추고 누적을 유지한 채 이어갈 수 있습니다. 페이지를 새로고침하면 기록이 초기화됩니다.</p></details>`;
  const $=s=>root.querySelector(s),action=n=>$(`[data-action="${n}"]`);
  const picker=document.createElement('dialog');
  picker.className='bls-picker';picker.setAttribute('aria-labelledby','blsPickerTitle');
  picker.innerHTML=`<div class="bls-picker-head"><h3 id="blsPickerTitle">블롭 선택</h3><button type="button" class="bls-picker-close" aria-label="블롭 선택 닫기">×</button></div><div class="bls-picker-grid">${figures.map(f=>`<button type="button" data-pick-blob="${esc(f.id)}"><img src="${f.image}" alt="" loading="lazy"><span>${esc(f.name)}</span></button>`).join('')}</div>`;
  document.body.appendChild(picker);
  let pickerTrigger=null;
  function closePicker(){picker.close();pickerTrigger?.focus();}
  picker.querySelector('.bls-picker-close').onclick=closePicker;
  picker.addEventListener('click',event=>{
    const choice=event.target.closest('[data-pick-blob]');
    if(choice&&pickerTrigger){
      if(choice.disabled||[...root.querySelectorAll('.bls-kind')].some(b=>b!==pickerTrigger&&b.value===choice.dataset.pickBlob))return;
      const f=byId.get(choice.dataset.pickBlob),changed=pickerTrigger.value!==f.id;
      pickerTrigger.value=f.id;pickerTrigger.querySelector('img').src=f.image;pickerTrigger.querySelector('span').textContent=f.name;
      if(changed)pickerTrigger.dispatchEvent(new Event('change',{bubbles:true}));
      closePicker();return;
    }
    if(event.target===picker){const r=picker.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closePicker();}
  });

  const status=text=>$('.bls-status').textContent=text;
  function readGoals(){
    const next=[];
    for(const row of root.querySelectorAll('.bls-goal')){
      const used=row.querySelector('input[type="checkbox"]').checked;
      for(const control of row.querySelectorAll('select,.bls-kind,.bls-percent'))control.disabled=!used;
      if(!used)continue;
      const input=row.querySelector('.bls-percent'),value=Number(input.value);
      if(input.value===''||!Number.isInteger(value)||value<0||value>100){status('최소 퍼센트는 0~100 사이의 정수로 입력하세요.');input.focus();return false;}
      if(next.some(g=>g.id===row.querySelector('.bls-kind').value)){status('같은 블롭을 목표에 중복 지정할 수 없습니다.');return false;}
      next.push({id:row.querySelector('.bls-kind').value,grade:Number(row.querySelector('.bls-grade').value),percent:value,row:Number(row.dataset.goal)});
    }
    goals=next;return true;
  }
  function stop(){generation++;running=false;}
  function render(){
    const owner=matchGoals(state.slots,goals),count=owner.filter(g=>g>=0).length;
    const matchedRows=new Set(owner.filter(g=>g>=0).map(g=>goals[g].row));
    for(const row of root.querySelectorAll('.bls-goal'))row.querySelector('.bls-goal-state').textContent=!row.querySelector('input').checked?'사용 안 함':matchedRows.has(Number(row.dataset.goal))?'✓ 충족':'대기';
    $('.bls-slots').innerHTML=state.slots.map((slot,i)=>{
      const f=slot&&byId.get(slot.id);
      return `<button type="button" class="bls-slot ${slot?.locked?'is-locked':''} ${owner[i]>=0?'is-matched':''}" data-slot="${i}" ${slot?`data-grade="${slot.grade}"`:''} aria-pressed="${!!slot?.locked}" ${!slot?'disabled':''} aria-label="${i+1}번 칸 ${slot?`${esc(f.name)} ${GRADES[slot.grade]} ${slot.percent}% ${slot.locked?'잠금 해제':'잠금'}`:'비어 있음'}"><span class="bls-slot-number">${i+1}번 칸</span>${slot?`<img src="${f.image}" alt=""><strong>${esc(f.name)}</strong><span class="bls-grade-badge" data-grade="${slot.grade}">${GRADES[slot.grade]}</span><span class="bls-slot-percent">${slot.percent}%</span><span class="bls-slot-lock">${slot.locked?'🔒 잠김':'터치하여 잠금'}</span><span class="bls-match-label">${owner[i]>=0?'✓ 목표 충족':'목표 미충족'}</span>`:'<span class="bls-empty">?</span><strong>첫 뽑기를 기다려요</strong>'}</button>`;
    }).join('');
    $('.bls-keys').textContent=`${fmt(state.keys)}개`;$('.bls-rolls').textContent=`${fmt(state.rolls)}회`;$('.bls-cost').textContent=`${cost(state)}개`;$('.bls-progress').textContent=`${count} / ${goals.length}`;$('.bls-lock-count').textContent=`잠금 ${lockCount(state)} / 3`;
    action('roll').disabled=running;action('auto').disabled=running||!goals.length||complete(state,goals);action('stop').disabled=!running;
  }
  function reset(){stop();state=createState();render();status('새로운 뽑기를 시작합니다. 누적 열쇠가 초기화됐습니다.');}
  root.addEventListener('change',event=>{if(event.target.closest('.bls-goal')){stop();state=createState();const valid=readGoals();render();if(valid)status('목표가 변경되어 결과와 누적 열쇠를 초기화했습니다.');}});
  root.addEventListener('click',event=>{
    const trigger=event.target.closest('.bls-kind');
    if(trigger){
      stop();render();pickerTrigger=trigger;
      const used=new Set([...root.querySelectorAll('.bls-kind')].filter(b=>b!==trigger).map(b=>b.value));
      for(const choice of picker.querySelectorAll('[data-pick-blob]')){
        const taken=used.has(choice.dataset.pickBlob);
        choice.disabled=taken;choice.title=taken?'다른 목표에서 선택한 블롭입니다.':'';
        choice.setAttribute('aria-pressed',String(choice.dataset.pickBlob===trigger.value));
        choice.querySelector('span').textContent=byId.get(choice.dataset.pickBlob).name+(taken?' · 선택됨':'');
      }
      picker.querySelector('h3').textContent=`목표 ${Number(trigger.closest('.bls-goal').dataset.goal)+1} · 블롭 선택`;
      picker.showModal();picker.querySelector('[aria-pressed="true"]')?.focus();return;
    }
    const button=event.target.closest('[data-slot]');if(!button)return;
    stop();const changed=toggleLock(state,Number(button.dataset.slot));render();status(changed?'잠금 상태를 변경했습니다.':'최대 3개까지 잠글 수 있습니다. 다른 칸의 잠금을 먼저 해제하세요.');
  });
  action('reset').onclick=()=>{readGoals();reset();};
  action('stop').onclick=()=>{stop();render();status('자동 뽑기를 멈췄습니다. 결과와 누적 열쇠는 유지됩니다.');};
  action('roll').onclick=()=>{if(!readGoals())return;const result=roll(state,ids,goals);render();status(result.done?'모든 목표를 달성했습니다!':`${result.paid}열쇠를 사용했습니다.`);};
  action('auto').onclick=async()=>{
    if(running||!readGoals()||!goals.length)return;
    if(complete(state,goals)){render();status('이미 모든 목표를 달성했습니다.');return;}
    // Every locked slot must be usable by a distinct goal; otherwise completion is impossible.
    const locked=state.slots.map(s=>s?.locked?s:null);
    if(matchGoals(locked,goals).filter(g=>g>=0).length<lockCount(state)){
      status('목표에 사용할 수 없는 잠금이 있습니다. 해당 칸의 잠금을 해제한 뒤 자동 뽑기를 시작하세요.');return;
    }
    running=true;const token=++generation;render();status('목표를 향해 자동 뽑기 중…');
    while(running&&token===generation){
      const start=performance.now();
      do{roll(state,ids,goals);if(complete(state,goals))break;}while(performance.now()-start<12);
      render();
      if(complete(state,goals)){running=false;render();status(`모든 목표 달성! ${fmt(state.rolls)}회 · 열쇠 ${fmt(state.keys)}개 사용`);return;}
      status(`자동 뽑기 중 · ${fmt(state.rolls)}회 진행`);
      await new Promise(resolve=>setTimeout(resolve,20));
    }
  };
  for(const tab of document.querySelectorAll('[data-blob-view]'))tab.addEventListener('click',()=>{
    stop();render();const simulator=tab.dataset.blobView==='simulator';
    root.hidden=!simulator;document.getElementById('blobWrap').style.display=simulator?'none':'';
    document.getElementById('blobTierFooter').hidden=simulator;
    for(const button of document.querySelectorAll('[data-blob-view]'))button.setAttribute('aria-pressed',String(button===tab));
  });
  // Leaving the blob page also stops background key consumption.
  new MutationObserver(()=>{if(document.getElementById('blobPage').style.display==='none'&&running){stop();render();status('다른 메뉴로 이동하여 자동 뽑기를 멈췄습니다.');}}).observe(document.getElementById('blobPage'),{attributes:true,attributeFilter:['style']});
  readGoals();render();
})();
