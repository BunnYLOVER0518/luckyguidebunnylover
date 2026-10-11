/* DPM-backed local questions. No remote AI, chat storage, or HTML evaluation. */
(() => {
  'use strict';
  const compact = s => String(s).replace(/\s+/g, '').toLowerCase();
  const normalize = s => compact(s).replace(/집조/g,'집중조준').replace(/마수/g,'마력수확').replace(/시역/g,'시간역행').replace(/육강/g,'육체강화').replace(/뭐낌|뭐껴|뭐써|머낌/g,'룬추천').replace(/머가/g,'뭐가');
  const partialRuneCache=new WeakMap();
  function expandPartialRunes(data,text){
    let vocabulary=partialRuneCache.get(data);
    if(!vocabulary){
      const names=[...new Set(data.catalog.map(r=>compact(r.name)))],prefixes=new Map();
      for(const name of names)if(name.length>=4&&!['시간역행','집중조준'].includes(name))for(let n=2;n<name.length;n++){
        const prefix=name.slice(0,n);
        if(!prefixes.has(prefix))prefixes.set(prefix,new Set());
        prefixes.get(prefix).add(name);
      }
      const reserved=new Set([...names,'전설','신화','불멸','초월','고정']);
      vocabulary=[...names.map(name=>({token:name,name,exact:true})),...[...prefixes].filter(([p,matches])=>matches.size===1&&!reserved.has(p)).map(([token,matches])=>({token,name:[...matches][0],exact:false}))].sort((a,b)=>b.token.length-a.token.length);
      partialRuneCache.set(data,vocabulary);
    }
    let output='';
    for(let at=0;at<text.length;){
      const match=vocabulary.find(v=>text.startsWith(v.token,at)&&(v.exact||/^(?:$|[+?,./!]|vs|대비|룬|은|는|이|가|을|를|랑|과|와|하고|비교|추천|누가|누구|어떤|어느|뭐|어때|좋|조합|끼|포함|고정|없|제외|빼|말고|하나|나머지|사용|쓰|장착)/.test(text.slice(at+v.token.length))));
      if(match){output+=match.name;at+=match.token.length;}else output+=text[at++];
    }
    return output;
  }
  function mentions(data,text){
    const hits=[];
    for(const name of [...new Set(data.catalog.map(r=>r.name))].sort((a,b)=>compact(b).length-compact(a).length)){
      let at=text.indexOf(compact(name));
      while(at!==-1){const end=at+compact(name).length;if(!hits.some(h=>at<h.end&&end>h.at))hits.push({name,at,end});at=text.indexOf(compact(name),end);}
    }
    return hits.sort((a,b)=>a.at-b.at);
  }
  const defaultSupport = role => role==='물리'?6:12;
  function continueQuestion(data, previous, question, previousHero, previousReply=null){
    const q=expandPartialRunes(data,normalize(question)), old=expandPartialRunes(data,normalize(previous));
    if(!old)return question;
    const heroes=[...new Set([...data.raw.map(r=>r.hero),...data.supporters.map(r=>r.support)])];
    const aliases=h=>[compact(h),compact(h.split(' ').at(-1))];
    const found=heroes.filter(h=>aliases(h).some(a=>q.includes(a)));
    const hero=previousHero||heroes.find(h=>aliases(h).some(a=>old.includes(a)));
    const dealer=data.raw.find(r=>r.hero===hero);
    if(!found.length&&/저거|그거|그것|방금|다른룬|다른추천/.test(q)&&/말고|제외|빼|다른/.test(q)){
      const reply=previousReply||answer(data,old,{hero});
      if(reply.runes?.length){
        const base=old.replace(/상위(\d+|한|두|세)(?:개|가지)(?:의)?(?:룬)?(?:을|를)?(?:제외하고|제외|빼고|말고)/g,'');
        return base+' '+[...new Set([...(reply.excluded||[]),...reply.runes])].map(n=>n+' 말고').join(' ')+' 룬 추천';
      }
    }

    if((!found.length||found.length===1&&found[0]===hero)&&/없|제외|빼|말고/.test(q)&&mentions(data,q).length&&!/지원없/.test(q))return old+' '+q;
    const level=q.match(/(\d+)(?:레벨|렙)|lv\.?(\d+)/);
    const newIntent=/룬|추천|조합|vs|누가|누구|어떤영웅|영웅추천/.test(q);
    const supportName=dealer?.role==='물리'?'(?:시공)?아토':'(?:대냥법사|대냥)';
    const supportMatch=dealer && q.match(new RegExp(supportName+'(?:가|는|이|을|를)?(\\d+)(?:레벨|렙)'));
    const genericSupport=q.match(/지원(?:을|이|은)?(없음|\d+(?:레벨|렙)?)/);
    if(dealer && !newIntent && (supportMatch||genericSupport)){
      const value=supportMatch?supportMatch[1]:genericSupport[1]==='없음'?'0':genericSupport[1].match(/\d+/)[0];
      return (old.replace(/지원(?:없음|\d+(?:레벨|렙)?)/g,'')+' '+hero+' 지원'+value);
    }
    if(!newIntent && level && (!found.length||found.length===1&&found[0]===hero)){
      // Preserve support levels while replacing only the subject hero's level.
      let saved=[];
      let base=old.replace(/지원(?:없음|\d+(?:레벨|렙)?)/g,m=>{saved.push(m);return '';});
      base=base.replace(/\d+(?:레벨|렙)|lv\.?\d+/g,'');
      return base+' '+(hero||'')+' '+(level[1]||level[2])+'레벨 '+saved.join(' ');
    }
    const short=q.match(/^(?:그럼|그러면)?(초월|불멸|신화|전설)(?:은요?|는요?|으로|으로는|\?)?\??$/);
    if(short)return old.replace(/초월|불멸(?!공명)|신화|전설/g,'')+' '+short[1];
    return question;
  }
  function recommendWearers(data,q,options){
    const names=[...new Set(data.catalog.map(r=>r.name))].sort((a,b)=>compact(b).length-compact(a).length);
    let rest=q;const matches=[];
    for(const name of names){if(rest.includes(compact(name))){matches.push(name);rest=rest.replaceAll(compact(name),'');}}
    if(matches.length!==1)return {text:'추천받을 룬을 하나 지정해 주세요. 예: 초월 속공의 룬은 누가 끼면 좋아?'};
    const grades=['전설','신화','불멸','초월'].filter(g=>rest.includes(g));
    if(grades.length>1)return {text:'룬 등급을 하나만 지정해 주세요. 예: 불멸 속공 추천 영웅'};
    const grade=grades[0]||'신화',rune=matches[0];
    const boss=/레이드|보스1/.test(q)||options.scenario==='raid'?1:2;
    const sm=q.match(/지원(\d+)/),support=/지원없음/.test(q)?0:sm?Number(sm[1]):options.support!==undefined&&options.support!==''?Number(options.support):null;
    if(support!==null&&![0,6,12].includes(support))return {text:'지원 레벨은 0·6·12 중에서 골라 주세요.'};
    const lm=q.replace(/지원(?:없음|\d+(?:레벨|렙)?)/g,'').match(/(\d+)(?:레벨|렙)|lv\.?(\d+)/);
    const level=lm?Number(lm[1]||lm[2]):Number(options.level)||null;
    const dealerLevels=new Map(),supportLevels=new Map();
    data.raw.forEach(r=>dealerLevels.set(r.hero,Math.max(dealerLevels.get(r.hero)||0,r.level)));
    data.supporters.forEach(r=>supportLevels.set(r.support,Math.max(supportLevels.get(r.support)||0,r.level)));
    const dealers=[];
    for(const r of data.raw){
      if(r.boss!==boss||r.level!==(level||dealerLevels.get(r.hero)))continue;
      const row=(data.cases[JSON.stringify([r.hero,r.level,r.variant,boss,support??defaultSupport(r.role)])]||[]).find(x=>data.catalog[x[0]].name===rune&&data.catalog[x[0]].grade===grade&&![1062,1064].includes(data.catalog[x[0]].id));
      if(row&&row[1]>100)dealers.push([`${r.hero} ${r.level}레벨${r.variant==='기본'?'':' · '+r.variant}`,row[1]-100]);
    }
    const lines=[`${grade} ${rune} 추천 영웅`,`${level?level+'레벨':'영웅별 보유 최고레벨'} · ${boss===1?'길드 레이드':'태초80 밀집 2보스'} · ${support===null?'물리 아토6 / 마법 대냥12':'딜러 지원'+support}`,];
    const group=(title,rows)=>{
      lines.push('',title);rows.sort((a,b)=>b[1]-a[1]);
      lines.push(...(rows.length?rows.slice(0,3).map((r,i)=>`${i+1}. ${r[0]}  +${r[1].toFixed(3)}%`):['이 조건에서 증가 효과가 확인된 추천 자료가 없습니다.']));
    };
    group('딜러 · 본인 DPM 증가율 (무룬 대비)',dealers);
    if(boss===2){
      const requestedDeck=/물리덱|물덱/.test(q)?'물리':/마법덱|마덱/.test(q)?'마법':options.deck;
      const eligible=data.supporters.filter(r=>r.rune===rune&&r.grade===grade&&r.level===(level||supportLevels.get(r.support))&&r.applicable&&r.gainPercent>0);
      for(const deck of requestedDeck?[requestedDeck]:['물리','마법']){
        group(`서포터 · ${deck} 덱 딜러 평균 DPM 증가율 (무룬 대비)`,eligible.filter(r=>r.deck===deck&&r.metric==='dealer_dpm').map(r=>[`${r.support} ${r.level}레벨`,r.gainPercent]));
      }
      const stones=eligible.filter(r=>r.metric!=='dealer_dpm'&&r.support==='악마 모노폴리'&&(!requestedDeck||r.deck===requestedDeck));
      if(stones.length)group('악마 모노폴리 · 악마석 획득량 증가율',stones.map(r=>[`${r.level}레벨 · ${r.deck} 덱`,r.gainPercent]));
    }else lines.push('서포터는 레이드 조건 자료가 없어 순위에서 제외했습니다.');
    return {text:lines.join('\n'),hero:null};
  }
  function supportPairAnswer(data,q,hero,options,dealer=null){
    const result=text=>({text,hero}), support=data.supporters.filter(r=>r.support===hero);
    const lm=q.match(/(\d+)(?:레벨|렙)|lv\.?(\d+)/);
    const level=dealer?.level||(lm?Number(lm[1]||lm[2]):Number(options.level)||Math.max(...support.map(r=>r.level)));
    const decks=[...new Set(support.map(r=>r.deck))];
    const deck=dealer?'물리':/물리덱|물덱/.test(q)?'물리':/마법덱|마덱/.test(q)?'마법':options.deck||(decks.length===1?decks[0]:null);
    if(!deck)return {text:'어떤 덱에 사용할까요? 덱에 따라 지원 효율이 달라집니다.',hero,need:'deck',choices:decks};
    if(!dealer&&(/레이드|보스1|지원없음/.test(q)||options.scenario==='raid'))return result('서포터 비교 자료는 DPM 페이지의 고정 실험 조건입니다. 조건에서 태초80을 선택해 주세요.');
    const clean=q.replace(/물리덱|마법덱|물덱|마덱/g,'');
    function spec(text){
      const hits=mentions(data,text),excluded=[];
      for(let i=0;i<hits.length;i++)if(/^(?:의룬|룬)?(?:은|는|이|가|을|를|도)?(?:없|제외|빼|말고)/.test(text.slice(hits[i].end,hits[i+1]?.at))){
        excluded.push(hits[i].name);
        for(let j=i-1;j>=0&&/^(?:랑|와|과|하고|,|및|도|은|는|이|가)*$/.test(text.slice(hits[j].end,hits[j+1].at));j--)excluded.push(hits[j].name);
      }
      let gradeText=text;
      for(const hit of [...hits].reverse())gradeText=gradeText.slice(0,hit.at)+gradeText.slice(hit.end);
      const gs=gradeText.match(/전설|신화|불멸|초월/g)||[];
      if(gs.length>2)return null;
      const grades=gs.length===2?gs:[gs[0]||options.grade||'신화',gs[0]||options.grade||'신화'];
      const named=hits.filter(h=>!excluded.includes(h.name)).map(h=>{
        const prefix=text.slice(0,h.at).match(/(전설|신화|불멸|초월)$/);
        const suffix=text.slice(h.end).match(/^(?:의룬|룬)?(전설|신화|불멸|초월)(?=$|\+|룬|조합|추천|뭐|어때|끼)/);
        return {name:h.name,grade:prefix?.[1]||suffix?.[1]};
      });
      if(named.length>2||named.length===2&&named[0].name===named[1].name)return null;
      if(text.includes('+')&&!excluded.length&&named.length!==2&&!(named.length===0&&gs.length===2))return null;
      return {grades,named,excluded};
    }
    const metric=dealer?'DPM 증가율':hero==='악마 모노폴리'?'악마석 획득량 증가율':'딜러 평균 DPM 증가율';
    const base=dealer?dealer.rows.map(r=>({names:r[0],gainPercent:r[1],grades:r[3]||['신화','신화']})):(data.supportPairs||[]).filter(r=>r.support===hero&&r.level===level&&r.deck===deck&&r.applicable);
    const rowGrades=r=>r.grades||[r.grade,r.grade];
    const label=r=>rowGrades(r).every(g=>g==='신화')?r.names.join(' + '):r.names.map((n,i)=>rowGrades(r)[i]+' '+n).join(' + ');
    const select=s=>base.filter(r=>rowGrades(r).slice().sort().join('|')===s.grades.slice().sort().join('|')&&!s.excluded.some(n=>r.names.includes(n))&&s.named.every(n=>r.names.some((name,i)=>name===n.name&&(!n.grade||rowGrades(r)[i]===n.grade)))).sort((a,b)=>b.gainPercent-a.gainPercent);
    const context=dealer?.context||`${hero} ${level}레벨 · ${deck} 덱`;
    const format=r=>`${label(r)}  ${r.gainPercent>=0?'+':''}${r.gainPercent.toFixed(3)}%`;
    const parts=clean.split(/vs|대비|쓰는데|쓰고있는데|에서/);
    if(parts.length>1){
      const specs=parts.map(spec);
      if(parts.length!==2||specs.some(s=>!s||s.named.length!==2))return result('비교할 두 조합을 적어 주세요. 예: 아토 신화 속공+신화 순환 VS 신화 연쇄+신화 순환');
      const rows=specs.map(s=>select(s)[0]);
      if(rows.some(r=>!r))return result(context+'\n지정한 등급·룬 조합의 계산 자료가 없습니다.');
      const [a,b]=rows,delta=b.gainPercent-a.gainPercent,relative=((100+b.gainPercent)/(100+a.gainPercent)-1)*100;
      return result([context,'현재: '+format(a),'교체: '+format(b),`${metric} 차이 (무룬 대비): ${delta>=0?'+':''}${delta.toFixed(3)}%p`,`현재 세팅 대비 교체 후 상대 변화: ${relative>=0?'+':''}${relative.toFixed(3)}%`,Math.abs(relative)<.0005?'표시 정밀도에서 두 조합의 계산값이 같습니다.':relative>0?'이 조건에서는 교체 조합이 더 높습니다.':'이 조건에서는 현재 조합이 더 높습니다.'].join('\n'));
    }
    const s=spec(clean);
    if(!s)return result('서로 다른 룬 두 개와 각각의 등급을 적어 주세요. 예: 아토 신화 속공 + 신화 순환');
    const rows=select(s),heading=dealer?`${context} · ${s.grades.join(' + ')}`:`${hero} ${level}레벨 · ${s.grades.join(' + ')} · ${deck} 덱`;
    if(!rows.length)return result(heading+'\n지정한 등급·룬 조합의 계산 자료가 없습니다.');
    const top=rows[0],tied=rows.filter(r=>Math.abs(r.gainPercent-top.gainPercent)<1e-9).length>1;
    return result([heading,...(s.excluded.length?['제외한 룬: '+[...new Set(s.excluded)].join(', ')]:[]),s.named.length===2?`요청한 ${label(top)} 조합의 계산 결과입니다.`:`이 조건에서 ${s.named.length===1?s.named[0].name+((s.named[0].name.charCodeAt(s.named[0].name.length-1)-0xac00)%28?'을':'를')+' 포함한 조합 중 ':''}${label(top)} 조합이 ${tied?'공동 ':''}1위입니다.`,`${metric} (무룬 대비)`,...rows.slice(0,3).map((r,i)=>`${i+1}. ${format(r)}`),...(rows.length>1?['그다음 후보는 '+rows.slice(1,3).map(label).join(', ')+' 조합입니다.']:[])].join('\n'));
  }
  function answer(data, question, options = {}) {
    const q = expandPartialRunes(data,normalize(question));
    if(/시간(?!역행)|집중조(?!준)/.test(q))return {text:'시간 역행은 “시역”, 집중 조준은 “집조”로 적어 주세요. 정식 이름도 사용할 수 있습니다.'};
    if(/누가|누구|어떤영웅|어느영웅|추천영웅|영웅추천/.test(q))return recommendWearers(data,q,options);
    const heroes = [...new Set([...data.raw.map(r => r.hero), ...data.supporters.map(r => r.support)])];
    const found = heroes.filter(h => [h, h.split(' ').at(-1)].some(a => q.includes(compact(a))));
    if (found.length > 1) return {text:'영웅을 한 명씩 질문해 주세요.'};
    const hero = found[0] || options.hero;
    if (!heroes.includes(hero)) return {text:'어떤 영웅의 룬인가요? 아래에서 영웅을 골라 주세요.', need:'hero', choices:heroes};
    const result = text => ({text, hero});
    const comparisonSides=q.split(/vs|대비/);
    const pair = /조합|2룬|양룬|두룬|두개|(?:^|[^\d])2개|\+|나머지|한자리|하나더|고정/.test(q)
      || comparisonSides.length===2&&comparisonSides.every(side=>mentions(data,side).length===2);
    if(pair){
      // Strip rune names first so 불멸 공명 is not mistaken for a grade.
      let gradeText=q;
      for(const hit of [...mentions(data,q)].reverse())gradeText=gradeText.slice(0,hit.at)+gradeText.slice(hit.end);
      const grades=gradeText.match(/전설|신화|불멸|초월/g)||[options.grade||'신화'];
      if(grades.some(g=>g!=='신화'))return result('2룬 조합 상담은 신화 + 신화만 지원합니다. 신화 등급으로 질문하거나 계산 조건의 룬 등급을 신화로 바꿔 주세요.');
    }
    if(pair&&data.supporters.some(r=>r.support===hero))return supportPairAnswer(data,q,hero,options);
    if(pair&&data.raw.some(r=>r.hero===hero&&r.role==='물리')){
      const base=data.raw.filter(r=>r.hero===hero),levelQ=q.replace(/지원(?:없음|\d+(?:레벨|렙)?)/g,'');
      const lm=[...levelQ.matchAll(/(\d+)(?:레벨|렙)|lv\.?(\d+)/g)].at(-1);
      const level=lm?Number(lm[1]||lm[2]):Number(options.level)||Math.max(...base.map(r=>r.level));
      const boss=/레이드|보스1/.test(q)||options.scenario==='raid'?1:2,sm=q.match(/지원(\d+)/);
      const support=/지원없음/.test(q)?0:sm?Number(sm[1]):options.support!==undefined&&options.support!==''?Number(options.support):6;
      if(![0,6,12].includes(support))return result('지원 레벨은 자료가 있는 0·6·12 중에서 골라 주세요.');
      const variants=[...new Set(base.filter(r=>r.level===level&&r.boss===boss).map(r=>r.variant))];
      if(!variants.length)return result(`${hero} ${level}레벨은 비교 자료가 없습니다.`);
      const variant=variants.find(v=>q.includes(compact(v))||['타자폼','투수폼'].includes(v)&&q.includes(v.slice(0,-1)))||(variants.includes(options.variant)?options.variant:variants.length===1?variants[0]:null);
      if(!variant)return {text:'비교할 영웅 형태/조건을 골라 주세요.',hero,need:'variant',choices:variants};
      return supportPairAnswer(data,q,hero,options,{level,rows:data.pairs?.[JSON.stringify([hero,level,variant,boss,support])]||[],context:`${hero} ${level}레벨 · ${variant} · ${boss===1?'길드 레이드':'태초80 밀집 2보스'} · 아토 지원${support}레벨`});
    }
    const hits=mentions(data,q),excluded=[];
    for(let i=0;i<hits.length;i++){
      if(/^(?:의룬|룬)?(?:은|는|이|가|을|를|도)?(?:없|제외|빼|말고)/.test(q.slice(hits[i].end,hits[i+1]?.at))){
        excluded.push(hits[i].name);
        for(let j=i-1;j>=0&&/^(?:랑|와|과|하고|,|및|도|은|는|이|가)*$/.test(q.slice(hits[j].end,hits[j+1].at));j--)excluded.push(hits[j].name);
      }
    }
    let pairComparison=null;
    if(pair&&/vs|대비|쓰는데|쓰고있는데|에서/.test(q)){
      const parts=q.split(/vs|대비|쓰는데|쓰고있는데|에서/);
      if(parts.length===2){const sets=parts.map(p=>mentions(data,p).map(h=>h.name));if(sets.every(s=>s.length===2&&s[0]!==s[1]))pairComparison=sets;}
    }
    const runeNames=[...new Set(data.catalog.map(r=>r.name))].sort((a,b)=>compact(b).length-compact(a).length);
    const findRunes=text=>{const names=[];for(const name of runeNames){if(text.includes(compact(name))){names.push(name);text=text.replaceAll(compact(name),'');}}return {names,text};};
    // Remove complete rune names first: "불멸 공명" is a name, not a grade.
    const gradeText=findRunes(q).text;
    const grades = ['전설','신화','불멸','초월'].filter(g => gradeText.includes(g));
    const grade = grades[0] || options.grade || '신화';
    if (pair && (grades.length>1 || grade !== '신화')) return result('2룬 조합은 현재 신화 + 신화 계산 자료만 있습니다. 신화 등급으로 질문하거나 계산 조건의 룬 등급을 바꿔 주세요.');
    let comparisons=null;
    if(grades.length>1){
      const sides=q.split(/vs|대비/);
      if(sides.length===2){
        comparisons=sides.map(side=>{
          const parsed=findRunes(side);
          const gs=['전설','신화','불멸','초월'].filter(g=>parsed.text.includes(g));
          return parsed.names.length===1 && gs.length===1 ? {name:parsed.names[0],grade:gs[0]} : null;
        });
      }else{
        // Also recognize "불멸 마법룬 전설 집중조준 비교" without VS.
        const pattern=new RegExp('(전설|신화|불멸|초월)('+runeNames.map(compact).join('|')+')(?:룬)?','g');
        comparisons=[...q.matchAll(pattern)].map(m=>({grade:m[1],name:runeNames.find(n=>compact(n)===m[2])}));
      }
      if(comparisons?.length!==2 || comparisons.some(r=>!r)) return result('각 룬의 등급을 붙여 두 개를 지정해 주세요. 예: 헤일리 불멸 마법룬 VS 전설 집중조준');
    }
    const gradeLabel=comparisons?'등급별 비교':grade+' 룬';
    const matchesRune=(name,g)=>comparisons ? comparisons.some(r=>r.name===name&&r.grade===g) : g===grade;
    const runeLabel=(name,g)=>comparisons?g+' '+name:name;
    // Support-level text is removed before extracting the hero level.
    const levelQ = q.replace(/지원(?:없음|\d+(?:레벨|렙)?)/g, '');
    const levels = [...levelQ.matchAll(/(\d+)(?:레벨|렙)|lv\.?(\d+)/g)];
    let level = levels.length ? Number(levels.at(-1)[1] || levels.at(-1)[2]) : Number(options.level) || null;
    let rest = q.replaceAll(compact(hero), '').replaceAll(compact(hero.split(' ').at(-1)), '').replace(/물리덱|마법덱|물덱|마덱/g, '');
    const wanted = [];
    for (const name of [...new Set(data.catalog.map(r => r.name))].sort((a,b) => compact(b).length - compact(a).length)) {
      if (rest.includes(compact(name))) { wanted.push(name); rest = rest.replaceAll(compact(name), ''); }
    }
    if (pair && /vs|비교|바꾸|교체/.test(q) && !pairComparison) return result('현재 조합과 교체할 조합을 각각 두 룬으로 적어 주세요. 예: 헤일리 마법+사냥꾼 VS 집조+마수');
    if (pair && !pairComparison && q.includes('+') && wanted.length!==2 && !excluded.length) return result('조회할 조합의 룬 이름 두 개를 정확히 적어 주세요. 예: 헤일리 집중조준 + 마력수확');
    if ((!pair && !comparisons && /vs|비교/.test(q) && wanted.length !== 2) || (!pairComparison&&wanted.filter(n=>!excluded.includes(n)).length>2)) return result('비교할 룬 이름 두 개를 적어 주세요. 예: 순환 vs 연쇄');
    if (!pair && !wanted.length && !/룬|추천|뭐|어떤|좋|레벨|렙|신화|초월|불멸|전설/.test(q)) return result('룬 추천이나 비교를 질문해 주세요. 예: 시공아토 룬 추천');
    let rows, context, metric;
    const supports = data.supporters.filter(r => r.support === hero);
    if (supports.length) {
      level ||= Math.max(...supports.map(r=>r.level));
      const decks = [...new Set(supports.map(r=>r.deck))];
      const deck = /물리덱|물덱/.test(q) ? '물리' : /마법덱|마덱/.test(q) ? '마법' : options.deck || (decks.length === 1 ? decks[0] : null);
      if (!deck) return {text:'어떤 덱에 사용할까요? 덱에 따라 지원 효율이 달라집니다.',hero,need:'deck',choices:decks};
      if (/레이드|보스1|지원없음/.test(q) || options.scenario === 'raid') return result('서포터 비교 자료는 DPM 페이지의 고정 실험 조건입니다. 레이드 등 별도 조건으로 환산하지 않습니다. 조건에서 태초80을 선택해 주세요.');
      rows = pair
        ? (data.supportPairs || []).filter(r=>r.support===hero && r.level===level && r.grade===grade && r.deck===deck && r.applicable).map(r=>[r.names.join(' + '),r.gainPercent,r.names])
        : supports.filter(r=>r.level===level && matchesRune(r.rune,r.grade) && r.deck===deck && r.applicable).map(r=>[runeLabel(r.rune,r.grade),r.gainPercent]);
      context = `${hero} ${level}레벨 · ${pair?'신화 + 신화':gradeLabel} · ${deck} 덱`;
      metric = hero==='악마 모노폴리' ? '악마석 획득량 증가율' : '딜러 평균 DPM 증가율';
    } else {
      const base = data.raw.filter(r=>r.hero===hero);
      level ||= Math.max(...base.map(r=>r.level));
      const boss = /레이드|보스1/.test(q) || options.scenario==='raid' ? 1 : 2;
      const sm = q.match(/지원(\d+)/);
      const support = /지원없음/.test(q) ? 0 : sm ? Number(sm[1]) : options.support!==undefined&&options.support!=='' ? Number(options.support) : defaultSupport(base[0].role);
      if (![0,6,12].includes(support)) return result('지원 레벨은 자료가 있는 0·6·12 중에서 골라 주세요.');
      const variants = [...new Set(base.filter(r=>r.level===level && r.boss===boss).map(r=>r.variant))];
      const variant = variants.find(v=>q.includes(compact(v))||['타자폼','투수폼'].includes(v)&&q.includes(v.slice(0,-1))) || (variants.includes(options.variant) ? options.variant : variants.length===1 ? variants[0] : null);
      if (!variants.length) return result(`${hero} ${level}레벨은 비교 자료가 없습니다.`);
      if (!variant) return {text:'비교할 영웅 형태/조건을 골라 주세요.',hero,need:'variant',choices:variants};
      const key = JSON.stringify([hero,level,variant,boss,support]);
      rows = pair
        ? (data.pairs?.[key] || []).map(r=>[r[0].join(' + '),r[1],r[0]])
        : (data.cases[key] || []).filter(r=>matchesRune(data.catalog[r[0]].name,data.catalog[r[0]].grade) && ![1062,1064].includes(data.catalog[r[0]].id)).map(r=>[runeLabel(data.catalog[r[0]].name,data.catalog[r[0]].grade),r[1]-100]);
      context = `${hero} ${level}레벨 · ${variant} · ${pair?'신화 + 신화':gradeLabel} · ${boss===1?'길드 레이드':'태초80 밀집 2보스'} · ${base[0].role==='물리'?'아토':'대냥법사'} 지원${support}레벨`;
      metric = 'DPM 증가율';
    }
    if (!rows.length) return result(context + '\n이 조건의 비교 자료가 없습니다. 레벨·룬 등급·덱을 확인해 주세요.');
    if (pair) {
      if(pairComparison){
        const selected=pairComparison.map(names=>rows.find(r=>names.every(n=>r[2].includes(n))));
        if(selected.some(r=>!r))return result(context+'\n'+pairComparison.filter((_,i)=>!selected[i]).map(n=>n.join(' + ')).join(', ')+': 해당 조합 자료가 없습니다.');
        const [before,after]=selected,delta=after[1]-before[1],relative=((100+after[1])/(100+before[1])-1)*100;
        return result([context,`현재: ${before[0]} (${before[1]>=0?'+':''}${before[1].toFixed(3)}%)`,`교체: ${after[0]} (${after[1]>=0?'+':''}${after[1].toFixed(3)}%)`,`${metric} 차이 (무룬 대비): ${delta>=0?'+':''}${delta.toFixed(3)}%p`,`현재 세팅 대비 교체 후 상대 변화: ${relative>=0?'+':''}${relative.toFixed(3)}%`,Math.abs(relative)<0.0005?'표시 정밀도에서 두 조합의 계산값이 같습니다.':relative>0?'이 조건에서는 교체 조합이 더 높습니다.':'이 조건에서는 현재 조합이 더 높습니다.'].join('\n'));
      }
      const fixed=wanted.filter(n=>!excluded.includes(n));
      rows=rows.filter(r=>!excluded.some(n=>r[2].includes(n))&&fixed.every(name=>r[2].includes(name)));
      if (!rows.length) return result(context+'\n지정한 룬이 포함된 조합 자료가 없습니다. 단일 룬 효율을 더해 추정하지 않습니다.');
      rows.sort((a,b)=>b[1]-a[1]);
      const top=rows[0], tied=rows.filter(r=>Math.abs(r[1]-top[1])<1e-9).length>1;
      const intro=fixed.length===2 ? `요청한 ${top[0]} 조합의 계산 결과입니다.`
        : `이 조건${fixed.length?'에서 '+fixed[0]+((fixed[0].charCodeAt(fixed[0].length-1)-0xac00)%28?'을':'를')+' 포함한 조합 중':'에서'} ${top[0]} 조합이 ${tied?'공동 ':''}1위입니다.`;
      const lines=[context,intro,`${metric} (무룬 대비)`,...rows.slice(0,3).map((r,i)=>`${i+1}. ${r[0]}  ${r[1]>=0?'+':''}${r[1].toFixed(3)}%`)];
      if(excluded.length)lines.splice(1,0,'제외한 룬: '+[...new Set(excluded)].join(', '));
      if(rows.length>1)lines.push('그다음 후보는 '+rows.slice(1,3).map(r=>r[0]).join(', ')+' 조합입니다.');
      return result(lines.join('\n'));
    }
    rows=rows.filter(r=>!excluded.includes(r[0]));
    if(!rows.length)return result(context+'\n제외 조건을 만족하는 추천 자료가 없습니다.');
    const requested=comparisons?comparisons.map(r=>runeLabel(r.name,r.grade)):wanted.filter(n=>!excluded.includes(n));
    if (requested.length) {
      const missing = requested.filter(n=>!rows.some(r=>r[0]===n));
      if (missing.length) return result(context + '\n' + missing.join(', ') + ': 유효한 비교 자료가 없습니다. 낮은 효율이나 효과 없음으로 단정할 수 없습니다.');
      rows = rows.filter(r=>requested.includes(r[0]));
    }
    rows.sort((a,b)=>b[1]-a[1]);
    const skipMatch=q.match(/상위(\d+|한|두|세)(?:개|가지)(?:의)?(?:룬)?(?:을|를)?(?:제외|빼|말고)/);
    if(skipMatch){
      const count=Number(skipMatch[1])||({한:1,두:2,세:3}[skipMatch[1]]);
      excluded.push(...rows.slice(0,count).map(r=>r[0]));
      rows=rows.slice(count);
      if(!rows.length)return result(context+'\n제외 조건을 만족하는 추천 자료가 없습니다.');
    }
    const lines = [context, `${metric} (무룬 대비)`, ...rows.slice(0,3).map((r,i)=>`${i+1}. ${r[0]}  ${r[1]>=0?'+':''}${r[1].toFixed(3)}%`)];
    if(excluded.length)lines.splice(1,0,'제외한 룬: '+[...new Set(excluded)].join(', '));
    if (requested.length===2 && rows.length===2) {
      const gap=rows[0][1]-rows[1][1];
      lines.push(gap<0.0005?'표시 정밀도에서 두 룬의 계산값이 같습니다.':`이 조건에서는 ${rows[0][0]}의 ${metric}이 더 높습니다. 계산값 차이: ${gap.toFixed(3)}%p.`);
      if(comparisons&&comparisons[0].name===comparisons[1].name){
        const order=['전설','신화','불멸','초월'];
        const [lower,upper]=[...comparisons].sort((a,b)=>order.indexOf(a.grade)-order.indexOf(b.grade));
        const lowerValue=rows.find(r=>r[0]===runeLabel(lower.name,lower.grade))[1];
        const upperValue=rows.find(r=>r[0]===runeLabel(upper.name,upper.grade))[1];
        if(lowerValue-upperValue>1e-9){
          const effect=lower.name==='확산 사격'
            ? '확산 사격은 등급이 올라갈수록 피해 감소 페널티도 커져, 높은 등급의 DPM이 더 낮게 계산될 수 있습니다.'
            : `공격속도나 궁극기 사용 시점이 바뀌면 다른 스킬의 사용 횟수와 버프 적용 타이밍도 달라져, 높은 등급의 ${hero==='악마 모노폴리'?'악마석 획득량':'DPM'}이 더 낮게 계산될 수 있습니다.`;
          lines.push('등급 역전이 나타난 계산 결과입니다. '+effect+' 이 수치만으로 낮은 등급이 실전에서도 더 좋다고 단정하기는 어렵습니다.');
        }
      }

    }
    return {...result(lines.join('\n')),runes:rows.slice(0,3).map(r=>r[0]),excluded:[...new Set(excluded)]};
  }
  if (typeof module !== 'undefined') module.exports = {answer,continueQuestion};
  if (typeof document === 'undefined') return;
  const panel = document.getElementById('runeChat');
  if (!panel) return;
  const scriptURL = new URL(document.currentScript.src);
  const dataURL = new URL('generated/rune-chat-data.js'+scriptURL.search, scriptURL);
  let loading, lastHero, lastReply=null, lastQuestion='', extra={};
  function load() {
    if (window.RUNE_CHAT_DATA) return Promise.resolve(window.RUNE_CHAT_DATA);
    if (!loading) loading = new Promise((resolve,reject)=>{
      const script = document.createElement('script'); script.src=dataURL.href;
      script.onload=()=>window.RUNE_CHAT_DATA ? resolve(window.RUNE_CHAT_DATA) : reject(Error('자료 형식 오류'));
      script.onerror=()=>{script.remove();loading=null;reject(Error('자료를 불러오지 못했습니다. 다시 질문해 주세요.'));};
      document.head.append(script);
    });
    return loading;
  }
  const input=panel.querySelector('input'), log=panel.querySelector('[role="log"]'), submit=panel.querySelector('[type="submit"]'), choices=panel.querySelector('.rc-choices');
  const add=(text,who)=>{const p=document.createElement('p');p.className='rc-message '+who;p.textContent=text;log.append(p);while(log.children.length>12)log.firstChild.remove();log.scrollTop=log.scrollHeight;};
  async function ask(question, follow=false) {
    if (!question.trim() || submit.disabled) return;
    if (!follow) {
      input.value='';
      add(question,'rc-user');
      extra={};
    }
    log.hidden=false;panel.querySelector('.rc-toggle').hidden=false;panel.querySelector('.rc-toggle').textContent='대화 접기';panel.querySelector('.rc-toggle').setAttribute('aria-expanded','true');
    submit.disabled=true;submit.textContent='확인 중…';choices.replaceChildren();choices.hidden=false;
    try {
      const data=await load();
      if(!follow){question=continueQuestion(data,lastQuestion,question,lastHero,lastReply);lastQuestion=question;}
      const options={hero:lastHero,...extra};
      panel.querySelectorAll('[data-option]').forEach(el=>{if(el.value)options[el.dataset.option]=el.value;});
      const reply=answer(data,question,options);if(Object.hasOwn(reply,'hero'))lastHero=reply.hero;
      if(!reply.need)lastReply=reply;
      add(reply.text,'rc-bot');
      if(reply.need){
        const select=document.createElement('select');select.setAttribute('aria-label','추가 조건 선택');select.add(new Option('선택해 주세요',''));
        reply.choices.forEach(v=>select.add(new Option(v,v)));
        select.onchange=()=>{if(!select.value)return;extra[reply.need]=select.value;if(['variant','deck'].includes(reply.need))lastQuestion+=' '+select.value+(reply.need==='deck'?'덱':'');if(reply.need==='hero')lastHero=select.value;ask(lastQuestion,true);};choices.append(select);
      }
    } catch(error){add(error.message,'rc-bot');}
    finally{submit.disabled=false;submit.textContent='질문하기';}
  }
  panel.querySelector('form').onsubmit=e=>{e.preventDefault();ask(input.value);};
  panel.querySelectorAll('[data-question]').forEach(b=>b.onclick=()=>{input.value=b.dataset.question;input.focus();});
  panel.querySelector('.rc-toggle').onclick=e=>{log.hidden=!log.hidden;choices.hidden=log.hidden;e.target.textContent=log.hidden?'대화 펼치기':'대화 접기';e.target.setAttribute('aria-expanded',String(!log.hidden));};
  panel.querySelector('.rc-reset').onclick=()=>{log.replaceChildren();choices.replaceChildren();log.hidden=true;choices.hidden=false;lastHero=null;lastReply=null;lastQuestion='';extra={};input.value='';panel.querySelector('.rc-toggle').hidden=true;};
})();
