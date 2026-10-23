(() => {
  'use strict';
  const probability = (base, failures) => Math.min(100, base * (10 + failures) / 10);
  function createState(from, target) {
    return {level:from, target, failures:0, attempts:0, stones:0, history:[]};
  }
  function attempt(state, steps, random=Math.random) {
    if(state.level >= state.target) return null;
    const step=steps.find(s=>s.from===state.level);
    if(!step) throw new Error('돌파 단계 자료가 없습니다.');
    const chance=probability(step.base,state.failures);
    const success=chance>=100 || random()<chance/100;
    const event={number:++state.attempts,from:step.from,to:step.to,chance,success,cost:step.stone};
    state.stones+=step.stone;
    if(success){state.level=step.to;state.failures=0;}else state.failures++;
    state.history.push(event);
    return event;
  }
  function finish(state,steps,random=Math.random){
    while(state.level<state.target) attempt(state,steps,random);
    return state;
  }
  if(typeof module!=='undefined' && module.exports){module.exports={probability,createState,attempt,finish};return;}
  const root=document.getElementById('breakthroughSimulator');
  if(!root) return;
  // Read the same source as the site's breakthrough cost table; no duplicated rates.
  const steps=BREAKTHROUGH_DATA.map(([range,stone,pct])=>{
    const [from,to]=range.split('→').map(Number);
    return {from,to,stone:parseInt(stone,10),base:parseFloat(pct)};
  });
  const min=steps[0].from,max=steps.at(-1).to;
  const fmt=n=>n.toLocaleString('ko-KR',{maximumFractionDigits:2});
  root.innerHTML=`<header><p class="bs-eyebrow">BREAKTHROUGH LAB</p><h2>돌파 시뮬레이션</h2><p>한 번의 성공까지, 돌파석이 얼마나 필요할까요?</p></header>
  <div class="bs-settings"><label>시작 레벨<select id="bsFrom"></select></label><label>목표 레벨<select id="bsTarget"></select></label><button type="button" id="bsReset">처음부터 다시</button></div>
  <p class="bs-note">실패할 때마다 초기 확률의 10%를 더합니다. 예: 20% → 22% → 24%. 확률은 최대 100%이며, 성공하면 다음 단계의 초기 확률로 시작합니다. 레벨 변경 시 현재 시도 기록이 초기화됩니다.</p>
  <div class="bs-current" aria-live="polite"></div><div class="bs-meter"><div></div></div><div class="bs-totals"></div>
  <div class="bs-actions"><button type="button" id="bsTry">1회 돌파 시도</button><button type="button" id="bsFinish">목표까지 진행</button></div><p class="bs-status" role="status">레벨을 선택하고 돌파를 시도하세요.</p>
  <section class="bs-batch"><h3>1,000번 도전하면?</h3><p>선택한 시작 레벨부터 목표까지 1,000회 새로 진행해 비교합니다. 현재 시도 기록에는 영향을 주지 않습니다.</p><button type="button" id="bsBatch">1,000회 반복 통계</button><div class="bs-batch-result" aria-live="polite"></div></section>
  <details class="bs-source"><summary>단계별 초기 확률 · 1회 비용</summary><div class="bs-table-wrap"><table><thead><tr><th>돌파 단계</th><th>초기 확률</th><th>실패당 증가</th><th>돌파석 / 시도</th></tr></thead><tbody></tbody></table></div></details>
  <h3>시도 기록 <small>최근 200회 · 최신순</small></h3><div class="bs-table-wrap"><table><thead><tr><th>시도</th><th>단계</th><th>적용 확률</th><th>결과</th><th>사용 돌파석</th></tr></thead><tbody class="bs-history"></tbody></table></div>
  <p class="bs-note">사이트의 돌파석·초기 확률 표와 사용자 지정 실패 보정 규칙으로 계산한 가상 결과입니다. 실제 게임 결과를 예측하거나 보장하지 않습니다. 성공·실패 모두 해당 단계의 1회 비용을 합산합니다.</p>`;
  const $=s=>root.querySelector(s);
  const from=$('#bsFrom'),target=$('#bsTarget');
  function options(select,lo,hi,selected){select.replaceChildren();for(let n=lo;n<=hi;n++){const option=document.createElement('option');option.value=n;option.textContent=`Lv.${n}`;select.append(option);}select.value=selected;}
  options(from,min,max-1,min);options(target,min+1,max,max);
  let state=createState(min,max),generation=0,busy=false;
  $('.bs-source tbody').innerHTML=steps.map(s=>`<tr><td>${s.from} → ${s.to}</td><td>${fmt(s.base)}%</td><td>+${fmt(s.base/10)}%p</td><td>${s.stone}개</td></tr>`).join('');
  function render(){
    const done=state.level>=state.target,step=steps.find(s=>s.from===state.level);
    const chance=done?100:probability(step.base,state.failures);
    $('.bs-current').innerHTML=done?`<strong>Lv.${state.target} 도달!</strong><span>목표 돌파를 완료했습니다.</span>`:`<span>현재 Lv.${state.level} → Lv.${step.to}</span><strong>${fmt(chance)}%</strong><span>초기 ${fmt(step.base)}% · 연속 실패 ${state.failures}회 · 이번 시도 ${step.stone}개</span>`;
    $('.bs-meter div').style.width=`${chance}%`;
    $('.bs-totals').textContent=`총 ${fmt(state.attempts)}회 시도 · 돌파석 ${fmt(state.stones)}개 사용`;
    $('#bsTry').disabled=done;$('#bsFinish').disabled=done;
    $('.bs-history').innerHTML=state.history.length?state.history.slice(-200).reverse().map(e=>`<tr><td>${e.number}</td><td>${e.from} → ${e.to}</td><td>${fmt(e.chance)}%</td><td class="${e.success?'bs-success':'bs-failure'}">${e.success?'성공':'실패'}</td><td>${e.cost}개</td></tr>`).join(''):'<tr><td colspan="5">아직 시도한 기록이 없습니다.</td></tr>';
  }
  function reset(){generation++;busy=false;$('#bsBatch').disabled=false;state=createState(Number(from.value),Number(target.value));$('.bs-batch-result').textContent='';$('.bs-status').textContent='새로운 돌파를 시작합니다.';render();}
  from.addEventListener('change',()=>{options(target,Number(from.value)+1,max,Math.max(Number(from.value)+1,Number(target.value)));reset();});
  target.addEventListener('change',reset);$('#bsReset').addEventListener('click',reset);
  $('#bsTry').addEventListener('click',()=>{const e=attempt(state,steps);if(e){$('.bs-status').textContent=e.success?`성공! Lv.${e.to}에 도달했습니다.`:`실패했습니다. 다음 확률은 ${fmt(probability(steps.find(s=>s.from===state.level).base,state.failures))}%입니다.`;render();}});
  $('#bsFinish').addEventListener('click',()=>{finish(state,steps);$('.bs-status').textContent=`목표 도달! 총 ${fmt(state.attempts)}회, 돌파석 ${fmt(state.stones)}개를 사용했습니다.`;render();});
  $('#bsBatch').addEventListener('click',async()=>{
    if(busy)return;busy=true;$('#bsBatch').disabled=true;
    const token=++generation,start=Number(from.value),goal=Number(target.value),costs=[],tries=[];
    for(let i=0;i<1000;i++){
      if(token!==generation)return;
      const result=finish(createState(start,goal),steps);costs.push(result.stones);tries.push(result.attempts);
      if(i%50===49){$('.bs-batch-result').textContent=`${i+1} / 1,000회 계산 중…`;await new Promise(resolve=>setTimeout(resolve,0));}
    }
    if(token!==generation)return;
    costs.sort((a,b)=>a-b);const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
    $('.bs-batch-result').innerHTML=`<h4>Lv.${start} → Lv.${goal} · 1,000회 결과</h4><dl><div><dt>평균 돌파석</dt><dd>${fmt(mean(costs))}개</dd></div><div><dt>중앙값</dt><dd>${fmt((costs[499]+costs[500])/2)}개</dd></div><div><dt>90%가 이내에 완료</dt><dd>${fmt(costs[899])}개</dd></div><div><dt>최소 / 최대</dt><dd>${fmt(costs[0])} / ${fmt(costs[999])}개</dd></div><div><dt>평균 시도 횟수</dt><dd>${fmt(mean(tries))}회</dd></div></dl><p>무작위 표본 통계이며, 다시 실행하면 값이 달라집니다.</p>`;
    busy=false;$('#bsBatch').disabled=false;
  });
  render();
})();
