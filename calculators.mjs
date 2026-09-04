export function initHeroCalculator(MYTHIC_DATA,BREAKTHROUGH_DATA){
const MYTHIC_SUMMARY_ROWS = new Set(['6 → 12','12 → 15','1 → 12','1 → 15']);

document.getElementById('breakthroughBody').innerHTML = BREAKTHROUGH_DATA.map(([lvl,stone,pct])=>
  `<tr><td class="lvl">${lvl}</td><td>${stone}</td><td class="pct">${pct}</td></tr>`
).join('');

document.getElementById('mythicBody').innerHTML = MYTHIC_DATA.map(([lvl,cnt,myth,immo])=>
  `<tr class="${MYTHIC_SUMMARY_ROWS.has(lvl) ? 'calc-highlight' : ''}"><td class="lvl">${lvl}</td><td>${cnt}</td><td>${myth}</td><td>${immo}</td></tr>`
).join('');

const HERO_UPGRADE_COSTS = MYTHIC_DATA
  .filter(([range]) => !MYTHIC_SUMMARY_ROWS.has(range))
  .map(([range, stone, mythicGold, immortalGold]) => {
    const [from, to] = range.split('→').map(value => Number(value.trim()));
    return {
      from, to,
      stone:Number(String(stone).replace(/,/g,'')),
      mythicGold:Number(String(mythicGold).replace(/,/g,'')),
      immortalGold:Number(String(immortalGold).replace(/,/g,''))
    };
  });
const HERO_BREAKTHROUGH_COSTS = BREAKTHROUGH_DATA.map(([range, stone, chance]) => {
  const [from, to] = range.split('→').map(value => Number(value.trim()));
  return { from, to, stone:Number(String(stone).replace(/[^0-9]/g,'')), chance };
});
const heroNumberFormat = new Intl.NumberFormat('ko-KR');
const heroGoalInputs = [
  document.getElementById('heroGrade'), document.getElementById('heroCurrentLevel'),
  document.getElementById('heroTargetLevel'), document.getElementById('heroOwnedStone'),
  document.getElementById('heroOwnedGold'), document.getElementById('heroOwnedBreakthrough')
];

function renderHeroGoalError(message){
  document.getElementById('heroNeededStone').innerHTML = '—<span>개</span>';
  document.getElementById('heroNeededGold').innerHTML = '—<span>골드</span>';
  document.getElementById('heroNeededBreakthrough').innerHTML = '—<span>개</span>';
  document.getElementById('heroStoneDetail').textContent = '';
  document.getElementById('heroGoldDetail').textContent = '';
  document.getElementById('heroBreakthroughDetail').textContent = '';
  const summary = document.getElementById('heroGoalSummary');
  summary.textContent = message;
  summary.classList.add('error');
}

function calculateHeroGoal(){
  const grade = document.getElementById('heroGrade').value;
  const currentLevel = Number(document.getElementById('heroCurrentLevel').value);
  const targetLevel = Number(document.getElementById('heroTargetLevel').value);
  const ownedValues = ['heroOwnedStone','heroOwnedGold','heroOwnedBreakthrough'].map(id => Number(document.getElementById(id).value));

  if(!['mythic','immortal'].includes(grade)) return renderHeroGoalError('영웅 등급을 선택해 주세요.');
  if(!Number.isInteger(currentLevel) || currentLevel < 1 || currentLevel > 24){
    return renderHeroGoalError('현재 영웅 레벨은 1부터 24까지 입력해 주세요.');
  }
  if(!Number.isInteger(targetLevel) || targetLevel < 2 || targetLevel > 25){
    return renderHeroGoalError('목표 영웅 레벨은 2부터 25까지 입력해 주세요.');
  }
  if(targetLevel <= currentLevel) return renderHeroGoalError('목표 영웅 레벨은 현재 레벨보다 높아야 합니다.');
  if(ownedValues.some(value => !Number.isFinite(value) || value < 0)){
    return renderHeroGoalError('보유 재화는 0 이상의 숫자로 입력해 주세요.');
  }

  const [ownedStone, ownedGold, ownedBreakthrough] = ownedValues.map(Math.floor);
  const upgradeSteps = HERO_UPGRADE_COSTS.filter(item => item.from >= currentLevel && item.to <= Math.min(targetLevel, 15));
  const breakthroughSteps = HERO_BREAKTHROUGH_COSTS.filter(item => item.from >= Math.max(currentLevel, 15) && item.to <= targetLevel);
  const totalStone = upgradeSteps.reduce((sum, item) => sum + item.stone, 0);
  const goldKey = grade === 'immortal' ? 'immortalGold' : 'mythicGold';
  const totalGold = upgradeSteps.reduce((sum, item) => sum + item[goldKey], 0);
  const totalBreakthrough = breakthroughSteps.reduce((sum, item) => sum + item.stone, 0);
  const neededStone = Math.max(0, totalStone - ownedStone);
  const neededGold = Math.max(0, totalGold - ownedGold);
  const neededBreakthrough = Math.max(0, totalBreakthrough - ownedBreakthrough);

  document.getElementById('heroNeededStone').innerHTML = `${heroNumberFormat.format(neededStone)}<span>개</span>`;
  document.getElementById('heroNeededGold').innerHTML = `${heroNumberFormat.format(neededGold)}<span>골드</span>`;
  document.getElementById('heroNeededBreakthrough').innerHTML = `${heroNumberFormat.format(neededBreakthrough)}<span>개</span>`;
  document.getElementById('heroStoneDetail').textContent = `총 ${heroNumberFormat.format(totalStone)}개 필요 · ${heroNumberFormat.format(ownedStone)}개 보유`;
  document.getElementById('heroGoldDetail').textContent = `총 ${heroNumberFormat.format(totalGold)}골드 필요 · ${heroNumberFormat.format(ownedGold)}골드 보유`;
  document.getElementById('heroBreakthroughDetail').textContent = `1회 시도 기준 ${heroNumberFormat.format(totalBreakthrough)}개 · ${heroNumberFormat.format(ownedBreakthrough)}개 보유`;
  const summary = document.getElementById('heroGoalSummary');
  summary.classList.remove('error');
  const gradeLabel = grade === 'immortal' ? '불멸' : '신화';
  const enough = neededStone === 0 && neededGold === 0 && neededBreakthrough === 0
    ? ' 보유량만으로 목표 레벨 구간의 기본 비용을 충당할 수 있습니다.' : '';
  const breakthroughNote = breakthroughSteps.length
    ? ' 돌파 구간은 각 단계 1회 시도 기준이며, 성공 확률에 따른 재시도 비용은 포함하지 않습니다.' : '';
  summary.innerHTML = `<strong>${gradeLabel} Lv.${currentLevel} → Lv.${targetLevel}</strong> 강화 기준입니다.${enough}${breakthroughNote}`;
}

document.getElementById('heroGoalForm').addEventListener('submit', event => event.preventDefault());
heroGoalInputs.forEach(input => {
  input.addEventListener('input', calculateHeroGoal);
  input.addEventListener('change', calculateHeroGoal);
});
calculateHeroGoal();


}
export function initPetCalculator(PET_LEVEL_DATA,PET_RANGE_DATA){
document.getElementById('petLevelBody').innerHTML = PET_LEVEL_DATA.map(([lvl,pet,bone])=>
  `<tr><td class="lvl">${lvl}</td><td>${pet}</td><td>${bone}</td></tr>`
).join('');
document.getElementById('petRangeBody').innerHTML = PET_RANGE_DATA.map(([range,pet,bone])=>
  `<tr class="calc-highlight"><td class="lvl">${range}</td><td>${pet}</td><td>${bone}</td></tr>`
).join('');

const PET_LEVEL_COSTS = PET_LEVEL_DATA.map(([level,pet,food])=>({
  level:Number(level),
  pet:Number(String(pet).replace(/,/g,'')),
  food:Number(String(food).replace(/,/g,''))
}));
const petNumberFormat = new Intl.NumberFormat('ko-KR');
const petGoalInputs = [
  document.getElementById('petCurrentLevel'),
  document.getElementById('petOwnedCount'),
  document.getElementById('petOwnedFood'),
  document.getElementById('petTargetLevel')
];

function renderPetGoalError(message){
  document.getElementById('petNeededCount').innerHTML = '—<span>개</span>';
  document.getElementById('petNeededFood').innerHTML = '—<span>개</span>';
  document.getElementById('petCountDetail').textContent = '';
  document.getElementById('petFoodDetail').textContent = '';
  const summary = document.getElementById('petGoalSummary');
  summary.textContent = message;
  summary.classList.add('error');
}

function calculatePetGoal(){
  const currentLevel = Number(document.getElementById('petCurrentLevel').value);
  const targetLevel = Number(document.getElementById('petTargetLevel').value);
  const ownedPetValue = Number(document.getElementById('petOwnedCount').value);
  const ownedFoodValue = Number(document.getElementById('petOwnedFood').value);

  if(!Number.isInteger(currentLevel) || currentLevel < 10 || currentLevel > 34){
    renderPetGoalError('현재 펫 레벨은 10부터 34까지 입력해 주세요.');
    return;
  }
  if(!Number.isInteger(targetLevel) || targetLevel < 11 || targetLevel > 35){
    renderPetGoalError('목표 펫 레벨은 11부터 35까지 입력해 주세요.');
    return;
  }
  if(targetLevel <= currentLevel){
    renderPetGoalError('목표 펫 레벨은 현재 레벨보다 높아야 합니다.');
    return;
  }
  if(!Number.isFinite(ownedPetValue) || ownedPetValue < 0 || !Number.isFinite(ownedFoodValue) || ownedFoodValue < 0){
    renderPetGoalError('보유 수량은 0 이상의 숫자로 입력해 주세요.');
    return;
  }

  const ownedPet = Math.floor(ownedPetValue);
  const ownedFood = Math.floor(ownedFoodValue);
  const required = PET_LEVEL_COSTS.filter(item=>item.level > currentLevel && item.level <= targetLevel);
  const totalPet = required.reduce((sum,item)=>sum+item.pet,0);
  const totalFood = required.reduce((sum,item)=>sum+item.food,0);
  const neededPet = Math.max(0,totalPet-ownedPet);
  const neededFood = Math.max(0,totalFood-ownedFood);
  document.getElementById('petNeededCount').innerHTML = `${petNumberFormat.format(neededPet)}<span>개</span>`;
  document.getElementById('petNeededFood').innerHTML = `${petNumberFormat.format(neededFood)}<span>개</span>`;
  document.getElementById('petCountDetail').textContent = `총 ${petNumberFormat.format(totalPet)}개 필요 · ${petNumberFormat.format(ownedPet)}개 보유`;
  document.getElementById('petFoodDetail').textContent = `총 ${petNumberFormat.format(totalFood)}개 필요 · ${petNumberFormat.format(ownedFood)}개 보유`;
  const summary = document.getElementById('petGoalSummary');
  summary.classList.remove('error');
  const enoughMessage = neededPet === 0 && neededFood === 0 ? ' 보유량만으로 목표 레벨을 달성할 수 있습니다.' : '';
  summary.innerHTML = `<strong>Lv.${currentLevel} → Lv.${targetLevel}</strong> 강화 기준입니다.${enoughMessage}`;
}

document.getElementById('petGoalForm').addEventListener('submit', event=>event.preventDefault());
petGoalInputs.forEach(input=>input.addEventListener('input', calculatePetGoal));
calculatePetGoal();


}