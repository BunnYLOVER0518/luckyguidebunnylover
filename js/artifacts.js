(() => {
  'use strict';

  const artifacts = Array.isArray(window.ARTIFACT_DATA) ? window.ARTIFACT_DATA : [];
  const page = document.getElementById('artifactPage');
  if (!page || !artifacts.length) return;

  const image = document.getElementById('artifactDetailImage');
  const name = document.getElementById('artifactDetailName');
  const levelList = document.getElementById('artifactLevelList');
  const picker = document.getElementById('artifactPicker');
  const search = document.getElementById('artifactSearch');
  const count = document.getElementById('artifactCount');
  let selectedId = artifacts[0].id;

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function numberText(value) {
    return Number(value.toFixed(3)).toLocaleString('ko-KR', { maximumFractionDigits: 3 });
  }

  function valueAt(artifact, selectedLevel) {
    return (artifact.baseUnits + artifact.incrementUnits * (selectedLevel - 1)) / artifact.scale;
  }

  function displayValue(artifact, selectedLevel) {
    return `${numberText(valueAt(artifact, selectedLevel))}${artifact.unit}`;
  }

  function renderDetail() {
    const artifact = artifacts.find(item => item.id === selectedId) || artifacts[0];
    image.src = artifact.image;
    image.alt = `${artifact.name} 유물`;
    name.textContent = artifact.name;
    levelList.innerHTML = Array.from({ length: 11 }, (_, index) => {
      const artifactLevel = index + 1;
      return `<div class="artifact-level-row">
        <span class="artifact-level-number">Lv.${artifactLevel}</span>
        <span class="artifact-level-effect">${escapeHtml(artifact.effectBefore)}<strong>${escapeHtml(displayValue(artifact, artifactLevel))}</strong>${escapeHtml(artifact.effectAfter)}</span>
      </div>`;
    }).join('');
    picker.querySelectorAll('[data-artifact-id]').forEach(button => {
      const selected = button.dataset.artifactId === artifact.id;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function renderPicker() {
    const query = search.value.trim().toLowerCase().replace(/\s+/g, '');
    const visible = artifacts.filter(artifact => artifact.name.toLowerCase().replace(/\s+/g, '').includes(query));
    count.textContent = `${visible.length} / ${artifacts.length}`;
    picker.innerHTML = visible.length ? visible.map(artifact => `
      <button type="button" class="artifact-choice${artifact.id === selectedId ? ' selected' : ''}"
        data-artifact-id="${escapeHtml(artifact.id)}" aria-pressed="${artifact.id === selectedId}">
        <img src="${artifact.image}" alt="" loading="lazy" draggable="false" />
        <span>${escapeHtml(artifact.name)}</span>
      </button>
    `).join('') : '<div class="artifact-empty">검색 결과가 없습니다.</div>';

    picker.querySelectorAll('[data-artifact-id]').forEach(button => {
      button.addEventListener('click', () => {
        selectedId = button.dataset.artifactId;
        renderDetail();
      });
    });
  }

  search.addEventListener('input', renderPicker);
  renderPicker();
  renderDetail();
})();
