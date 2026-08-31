(() => {
  'use strict';

  const page = document.getElementById('formationPage');
  if (!page) return;

  const GRADE_ORDER = ['전체', '불멸', '신화', '전설', '영웅', '희귀', '일반'];
  const LOCAL_HERO_NAMES = {
    '신화': ['개구리 왕자', '골라조', '냥법사', '닌자', '드래곤', '랜슬롯', '레이', '로카', '로켓츄', '마마', '마스터 쿤', '모노폴리맨', '밤바', '배트맨', '베인', '블롭', '아이언미야옹', '아토', '오크주술사', '와트', '우치', '인디', '중력자탄', '지지', '채드', '초나', '콜디', '타르', '펄스생성기', '펭귄악사', '헤일리'],
    '전설': ['보안관', '워머신', '폭풍거인', '호랑이사부'],
    '영웅': ['나무', '늑대전사', '독수리장군', '사냥꾼', '전기로봇'],
    '희귀': ['레인저', '샌드맨', '성기사', '악마병사', '충격로봇'],
    '일반': ['궁수', '물의정령', '산적', '야만인', '투척병']
  };
  const HEROES = [
    ...DATA.heroes.map(hero => ({
      id: `immortal:${hero.id}`,
      name: hero.name,
      grade: '불멸',
      image: HERO_IMG(hero.id),
      unique: true
    })),
    ...Object.entries(LOCAL_HERO_NAMES).flatMap(([grade, names]) => names.map(name => ({
      id: `local:${grade}:${name}`,
      name,
      grade,
      image: `영웅모음/${grade}_${name}.png`,
      unique: false
    })))
  ];
  const HERO_BY_ID = new Map(HEROES.map(hero => [hero.id, hero]));
  const STORAGE_KEY = 'luckyGuideFormationV1';
  let selectedHeroId = null;
  let selectedGrade = '전체';
  let query = '';

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function freshState() {
    return { slots: Array(18).fill(null) };
  }

  function normalizeState(saved) {
    const source = Array.isArray(saved?.slots) ? saved.slots.slice(0, 18) : [];
    const seenUnique = new Set();
    return {
      slots: Array.from({ length: 18 }, (_, index) => {
        const id = typeof source[index] === 'string' && HERO_BY_ID.has(source[index]) ? source[index] : null;
        if (!id) return null;
        const hero = HERO_BY_ID.get(id);
        if (hero.unique && seenUnique.has(id)) return null;
        if (hero.unique) seenUnique.add(id);
        return id;
      })
    };
  }

  function loadState() {
    try {
      return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
    } catch (error) {
      return freshState();
    }
  }

  let state = loadState();

  function setStatus(message) {
    document.getElementById('formationStatus').textContent = message || '';
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      setStatus('이 브라우저에서는 자동 저장을 사용할 수 없습니다.');
    }
  }

  function isUsed(heroId) {
    return state.slots.includes(heroId);
  }

  function renderBoard() {
    document.getElementById('formationBoard').innerHTML = state.slots.map((heroId, index) => {
      const hero = heroId ? HERO_BY_ID.get(heroId) : null;
      const label = `${index + 1}번 칸${hero ? `, ${hero.name}` : ', 비어 있음'}`;
      return `<div class="formation-slot${hero ? ' filled' : ''}" data-formation-slot="${index}" tabindex="0" role="button" draggable="${Boolean(hero)}" aria-label="${escapeHtml(label)}">
        <span class="formation-slot-number">${index + 1}</span>
        ${hero ? `<img class="formation-slot-image" src="${hero.image}" alt="" draggable="false" />
          <span class="formation-slot-name">${escapeHtml(hero.name)}</span>
          <button type="button" class="formation-slot-remove" data-remove-slot="${index}" aria-label="${escapeHtml(hero.name)} 제거">×</button>`
          : '<span class="formation-slot-empty">배치</span>'}
      </div>`;
    }).join('');
  }

  function renderGradeTabs() {
    document.getElementById('formationGradeTabs').innerHTML = GRADE_ORDER.map(grade => {
      const count = grade === '전체' ? HEROES.length : HEROES.filter(hero => hero.grade === grade).length;
      return `<button type="button" class="formation-grade-tab${selectedGrade === grade ? ' active' : ''}" data-formation-grade="${grade}">${grade} ${count}</button>`;
    }).join('');
  }

  function renderHeroList() {
    const normalizedQuery = query.toLowerCase().replace(/\s+/g, '');
    const filtered = HEROES.filter(hero => {
      const gradeMatches = selectedGrade === '전체' || hero.grade === selectedGrade;
      const nameMatches = !normalizedQuery || hero.name.toLowerCase().replace(/\s+/g, '').includes(normalizedQuery);
      return gradeMatches && nameMatches;
    });
    document.getElementById('formationHeroList').innerHTML = filtered.length ? filtered.map(hero => {
      const unavailable = hero.unique && isUsed(hero.id);
      const selected = selectedHeroId === hero.id;
      return `<button type="button" class="formation-hero${selected ? ' selected' : ''}${unavailable ? ' unavailable' : ''}" draggable="${!unavailable}" data-formation-hero="${escapeHtml(hero.id)}" aria-pressed="${selected}" aria-disabled="${unavailable}">
        <img class="formation-hero-image" src="${hero.image}" alt="" loading="lazy" draggable="false" />
        <span class="formation-hero-name">${escapeHtml(hero.name)}</span>
        <span class="formation-hero-grade">${hero.grade}${unavailable ? ' · 배치됨' : ''}</span>
      </button>`;
    }).join('') : '<div class="formation-empty-search">검색 결과가 없습니다.</div>';
    const selected = HERO_BY_ID.get(selectedHeroId);
    document.getElementById('formationSelection').innerHTML = selected
      ? `<strong>${escapeHtml(selected.name)}</strong> 선택됨 · 배치할 칸을 눌러 주세요.`
      : '배치할 영웅을 선택해 주세요.';
  }

  function render() {
    renderBoard();
    renderGradeTabs();
    renderHeroList();
  }

  function placeHero(heroId, slotIndex) {
    const hero = HERO_BY_ID.get(heroId);
    const index = Number(slotIndex);
    if (!hero || !Number.isInteger(index) || index < 0 || index >= 18) return;
    const usedIndex = hero.unique ? state.slots.indexOf(hero.id) : -1;
    if (usedIndex >= 0 && usedIndex !== index) {
      setStatus(`${hero.name}은(는) 불멸 영웅이라 중복 배치할 수 없습니다.`);
      return;
    }
    state.slots[index] = hero.id;
    if (hero.unique) selectedHeroId = null;
    saveState();
    render();
    setStatus(`${index + 1}번 칸에 ${hero.name} 배치 완료`);
  }

  function removeSlot(slotIndex) {
    const index = Number(slotIndex);
    const hero = HERO_BY_ID.get(state.slots[index]);
    if (!hero) return;
    state.slots[index] = null;
    saveState();
    render();
    setStatus(`${index + 1}번 칸의 ${hero.name}을(를) 제거했습니다.`);
  }

  function moveSlot(fromIndex, toIndex) {
    const from = Number(fromIndex);
    const to = Number(toIndex);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from === to) return;
    const moving = state.slots[from];
    if (!moving) return;
    const replaced = state.slots[to];
    state.slots[to] = moving;
    state.slots[from] = replaced;
    saveState();
    render();
    setStatus(`${from + 1}번과 ${to + 1}번 칸의 위치를 변경했습니다.`);
  }

  page.addEventListener('click', event => {
    const removeButton = event.target.closest('[data-remove-slot]');
    if (removeButton) {
      event.stopPropagation();
      removeSlot(removeButton.dataset.removeSlot);
      return;
    }
    const heroButton = event.target.closest('[data-formation-hero]');
    if (heroButton) {
      const hero = HERO_BY_ID.get(heroButton.dataset.formationHero);
      if (!hero) return;
      if (hero.unique && isUsed(hero.id)) {
        setStatus(`${hero.name}은(는) 이미 배치되어 있습니다.`);
        return;
      }
      selectedHeroId = selectedHeroId === hero.id ? null : hero.id;
      renderHeroList();
      setStatus(selectedHeroId ? `${hero.name} 선택` : '선택을 해제했습니다.');
      return;
    }
    const slot = event.target.closest('[data-formation-slot]');
    if (slot) {
      if (selectedHeroId) placeHero(selectedHeroId, slot.dataset.formationSlot);
      else setStatus('먼저 아래 목록에서 배치할 영웅을 선택해 주세요.');
    }
  });

  page.addEventListener('keydown', event => {
    const slot = event.target.closest('[data-formation-slot]');
    if (!slot || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    if (selectedHeroId) placeHero(selectedHeroId, slot.dataset.formationSlot);
  });

  page.addEventListener('dragstart', event => {
    const heroButton = event.target.closest('[data-formation-hero]');
    if (heroButton && event.dataTransfer) {
      const hero = HERO_BY_ID.get(heroButton.dataset.formationHero);
      if (!hero || (hero.unique && isUsed(hero.id))) {
        event.preventDefault();
        return;
      }
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('text/plain', `hero:${hero.id}`);
      return;
    }
    const slot = event.target.closest('[data-formation-slot]');
    if (slot && state.slots[Number(slot.dataset.formationSlot)] && event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', `slot:${slot.dataset.formationSlot}`);
    }
  });

  page.addEventListener('dragover', event => {
    const slot = event.target.closest('[data-formation-slot]');
    if (!slot) return;
    event.preventDefault();
    slot.classList.add('drag-over');
  });

  page.addEventListener('dragleave', event => {
    const slot = event.target.closest('[data-formation-slot]');
    if (slot && !slot.contains(event.relatedTarget)) slot.classList.remove('drag-over');
  });

  page.addEventListener('drop', event => {
    const slot = event.target.closest('[data-formation-slot]');
    if (!slot) return;
    event.preventDefault();
    slot.classList.remove('drag-over');
    const payload = event.dataTransfer?.getData('text/plain') || '';
    if (payload.startsWith('hero:')) placeHero(payload.slice(5), slot.dataset.formationSlot);
    else if (payload.startsWith('slot:')) moveSlot(payload.slice(5), slot.dataset.formationSlot);
  });

  document.getElementById('formationGradeTabs').addEventListener('click', event => {
    const button = event.target.closest('[data-formation-grade]');
    if (!button) return;
    selectedGrade = button.dataset.formationGrade;
    renderGradeTabs();
    renderHeroList();
  });

  document.getElementById('formationSearch').addEventListener('input', event => {
    query = event.target.value || '';
    renderHeroList();
  });

  document.getElementById('formationReset').addEventListener('click', () => {
    if (!confirm('18칸의 모든 영웅 배치를 초기화할까요?')) return;
    state = freshState();
    selectedHeroId = null;
    saveState();
    render();
    setStatus('배치표를 초기화했습니다.');
  });

  function loadImage(src) {
    return new Promise(resolve => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      let settled = false;
      const finish = value => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      image.onload = () => finish(image);
      image.onerror = () => finish(null);
      image.src = src;
      setTimeout(() => finish(null), 8000);
    });
  }

  async function buildCanvas() {
    const width = 1800;
    const height = 1040;
    const margin = 54;
    const gap = 12;
    const startY = 154;
    const cellWidth = (width - margin * 2 - gap * 5) / 6;
    const cellHeight = 260;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.fillStyle = '#f7f3ea';
    context.fillRect(0, 0, width, height);
    context.fillStyle = '#201d18';
    context.font = '900 42px "Noto Sans KR", sans-serif';
    context.fillText('6 × 3 영웅 배치표', margin, 64);
    context.fillStyle = '#766956';
    context.font = '700 18px "Noto Sans KR", sans-serif';
    context.fillText('운빨존많겜 종합 가이드', margin, 98);
    const usedIds = [...new Set(state.slots.filter(Boolean))];
    const imageEntries = await Promise.all(usedIds.map(async id => {
      const hero = HERO_BY_ID.get(id);
      return [id, hero ? await loadImage(hero.image) : null];
    }));
    const images = new Map(imageEntries);
    state.slots.forEach((heroId, index) => {
      const column = index % 6;
      const row = Math.floor(index / 6);
      const x = margin + column * (cellWidth + gap);
      const y = startY + row * (cellHeight + gap);
      context.fillStyle = '#fffdf8';
      context.fillRect(x, y, cellWidth, cellHeight);
      context.strokeStyle = heroId ? '#aa9982' : '#cfc2b0';
      context.lineWidth = 3;
      context.setLineDash(heroId ? [] : [12, 9]);
      context.strokeRect(x, y, cellWidth, cellHeight);
      context.setLineDash([]);
      context.fillStyle = '#5d5040';
      context.font = '900 16px "Noto Sans KR", sans-serif';
      context.fillText(String(index + 1), x + 13, y + 24);
      const hero = heroId ? HERO_BY_ID.get(heroId) : null;
      if (!hero) {
        context.fillStyle = '#a49581';
        context.font = '800 18px "Noto Sans KR", sans-serif';
        context.textAlign = 'center';
        context.fillText('빈 칸', x + cellWidth / 2, y + cellHeight / 2 + 5);
        context.textAlign = 'left';
        return;
      }
      const image = images.get(heroId);
      if (image) {
        const scale = Math.min((cellWidth - 28) / image.width, 190 / image.height);
        const drawWidth = image.width * scale;
        const drawHeight = image.height * scale;
        context.drawImage(image, x + (cellWidth - drawWidth) / 2, y + 25 + (190 - drawHeight) / 2, drawWidth, drawHeight);
      }
      context.fillStyle = '#30291f';
      context.font = '900 18px "Noto Sans KR", sans-serif';
      context.textAlign = 'center';
      context.fillText(hero.name, x + cellWidth / 2, y + 231, cellWidth - 18);
      context.fillStyle = '#7a6a56';
      context.font = '750 13px "Noto Sans KR", sans-serif';
      context.fillText(hero.grade, x + cellWidth / 2, y + 250, cellWidth - 18);
      context.textAlign = 'left';
    });
    return canvas;
  }

  document.getElementById('formationDownload').addEventListener('click', async () => {
    const button = document.getElementById('formationDownload');
    button.disabled = true;
    setStatus('배치표 이미지를 만드는 중입니다...');
    try {
      const canvas = await buildCanvas();
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('PNG 생성 실패');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = '운빨존많겜_6x3_영웅배치표.png';
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      setStatus('PNG 파일로 저장했습니다.');
    } catch (error) {
      setStatus('이미지 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      button.disabled = false;
    }
  });

  render();
})();
