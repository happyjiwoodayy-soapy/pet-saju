/**
 * 반려동물 사주 — App Controller
 * 화면 전환, UI 로직, 입력 유효성 검증
 */

(function () {
  'use strict';

  // ========== State ==========
  const state = {
    animal: null,
    breed: '',
    name: '',
    year: null,
    month: null,
    day: null,
    gender: null,
    hour: -1,
    photoDataUrl: null, // base64 Data URL of uploaded photo
    result: null
  };

  // 동물별 품종 힌트 (placeholder + 예시 텍스트)
  const breedHints = {
    dog: { placeholder: '예: 골든리트리버, 푸들, 말티즈...', hint: '모르면 비워두셔도 괜찮아요! 믹스견도 "믹스"라고 적어주세요 🐕' },
    cat: { placeholder: '예: 러시안블루, 페르시안, 코숏...', hint: '모르면 비워두셔도 괜찮아요! 한국 고양이는 "코숏"이라고 적어주세요 🐈' },
    hamster: { placeholder: '예: 골든, 드워프, 로보로브스키...', hint: '모르면 비워두셔도 괜찮아요! 🐹' },
    rabbit: { placeholder: '예: 홀랜드롭, 네덜란드 드워프...', hint: '모르면 비워두셔도 괜찮아요! 🐰' },
    bird: { placeholder: '예: 앵무새, 잉꼬, 카나리아...', hint: '모르면 비워두셔도 괜찮아요! 🐦' },
    reptile: { placeholder: '예: 레오파드 게코, 턱수염 도마뱀...', hint: '모르면 비워두셔도 괜찮아요! 🦎' }
  };

  // ========== DOM References ==========
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const screens = {
    landing: $('#screen-landing'),
    input: $('#screen-input'),
    loading: $('#screen-loading'),
    result: $('#screen-result')
  };

  // ========== URL Params (공유 링크 복원) ==========
  function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('t') && params.has('n') && params.has('b')) {
      try {
        const t = params.get('t');
        const n = decodeURIComponent(params.get('n'));
        const b = params.get('b');
        const g = params.get('g') || 'm';
        const h = parseInt(params.get('h') || '-1');
        const br = params.has('br') ? decodeURIComponent(params.get('br')) : '';

        const year = parseInt(b.substring(0, 4));
        const month = parseInt(b.substring(4, 6));
        const day = parseInt(b.substring(6, 8));

        if (t && n && year && month && day) {
          state.animal = t;
          state.breed = br;
          state.name = n;
          state.year = year;
          state.month = month;
          state.day = day;
          state.gender = g;
          state.hour = h;

          const result = SajuEngine.analyze({
            animal: state.animal,
            breed: state.breed,
            name: state.name,
            year: state.year,
            month: state.month,
            day: state.day,
            gender: state.gender,
            hour: state.hour
          });
          state.result = result;
          renderResult(result);
          switchScreen('result');
          return true;
        }
      } catch (e) {
        console.warn('URL param parsing failed', e);
      }
    }
    return false;
  }

  // ========== Screen Transitions ==========
  function switchScreen(targetName) {
    const current = document.querySelector('.screen.active');
    const target = screens[targetName];

    if (current === target) return;

    // 이전 화면 숨기기
    if (current) {
      current.classList.remove('active');
    }

    // 새 화면 표시 + 스크롤 최상단 리셋
    target.classList.add('active');
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  // ========== Populate Date Selects ==========
  function populateDateSelects() {
    const yearSel = $('#input-year');
    const monthSel = $('#input-month');
    const daySel = $('#input-day');

    const currentYear = new Date().getFullYear();

    for (let y = currentYear; y >= 1990; y--) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSel.appendChild(opt);
    }

    for (let m = 1; m <= 12; m++) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      monthSel.appendChild(opt);
    }

    for (let d = 1; d <= 31; d++) {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      daySel.appendChild(opt);
    }
  }

  // ========== Input Validation ==========
  function validateForm() {
    let valid = true;

    // Animal
    if (!state.animal) valid = false;

    // Breed (optional)
    state.breed = $('#input-breed').value.trim();

    // Name
    const name = $('#input-name').value.trim();
    state.name = name;
    if (!name || name.length < 1) valid = false;

    // Date
    const year = parseInt($('#input-year').value);
    const month = parseInt($('#input-month').value);
    const day = parseInt($('#input-day').value);
    state.year = year || null;
    state.month = month || null;
    state.day = day || null;

    if (!year || !month || !day) valid = false;
    else {
      // Check future date
      const inputDate = new Date(year, month - 1, day);
      if (inputDate > new Date()) valid = false;
      // Check valid date
      if (inputDate.getMonth() !== month - 1) valid = false;
    }

    // Gender
    if (!state.gender) valid = false;

    // Hour (optional)
    state.hour = parseInt($('#input-hour').value);

    // Update button
    const btn = $('#btn-analyze');
    if (valid) {
      btn.disabled = false;
      btn.classList.remove('btn-disabled');
    } else {
      btn.disabled = true;
      btn.classList.add('btn-disabled');
    }

    return valid;
  }

  function showErrors() {
    if (!state.animal) {
      $('#error-name').textContent = '';
    }

    const name = $('#input-name').value.trim();
    if (!name) {
      $('#error-name').textContent = '이름을 입력해주세요';
    } else {
      $('#error-name').textContent = '';
    }

    const year = parseInt($('#input-year').value);
    const month = parseInt($('#input-month').value);
    const day = parseInt($('#input-day').value);

    if (!year || !month || !day) {
      $('#error-date').textContent = '생년월일을 모두 선택해주세요';
    } else {
      const inputDate = new Date(year, month - 1, day);
      if (inputDate > new Date()) {
        $('#error-date').textContent = '미래 날짜는 선택할 수 없어요';
      } else if (inputDate.getMonth() !== month - 1) {
        $('#error-date').textContent = '유효하지 않은 날짜예요';
      } else {
        $('#error-date').textContent = '';
      }
    }

    if (!state.gender) {
      $('#error-gender').textContent = '성별을 선택해주세요';
    } else {
      $('#error-gender').textContent = '';
    }
  }

  // ========== Loading Animation ==========
  function runLoadingSequence(callback) {
    const messages = SajuEngine.getLoadingMessages(state.name);
    const progressFill = $('#progress-fill');
    const messageEl = $('#loading-message');
    const animalEl = $('#loading-animal');

    animalEl.textContent = SajuEngine.getAnimalEmoji(state.animal);

    let progress = 0;
    let msgIdx = 0;
    const duration = 3000;
    const interval = 30;
    const steps = duration / interval;
    const increment = 100 / steps;

    // Random message rotation
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % messages.length;
      messageEl.style.opacity = '0';
      setTimeout(() => {
        messageEl.textContent = messages[msgIdx];
        messageEl.style.opacity = '1';
      }, 200);
    }, 1000);

    // Progress bar
    const progInterval = setInterval(() => {
      progress += increment;
      if (progress >= 100) {
        progress = 100;
        progressFill.style.width = '100%';
        clearInterval(progInterval);
        clearInterval(msgInterval);
        setTimeout(callback, 300);
      } else {
        progressFill.style.width = progress + '%';
      }
    }, interval);
  }

  // ========== Render Result ==========
  function renderResult(result) {
    // Card gradient
    const card = $('#result-card');
    card.style.background = `linear-gradient(135deg, ${result.cardGradient[0]}, ${result.cardGradient[1]})`;

    // Pet photo (if uploaded)
    const resultPhotoWrap = $('#result-photo-wrap');
    const resultPhoto = $('#result-photo');
    const resultAnimalEmoji = $('#result-animal-emoji');
    if (state.photoDataUrl) {
      resultPhoto.src = state.photoDataUrl;
      resultPhotoWrap.style.display = '';
      resultAnimalEmoji.style.display = 'none';
    } else {
      resultPhotoWrap.style.display = 'none';
      resultAnimalEmoji.style.display = '';
    }

    // Animal emoji
    $('#result-animal-emoji').textContent = result.animalEmoji;

    // Type badge
    $('#result-type-badge').textContent = result.typeEmoji;

    // Type name
    $('#result-type-name').textContent = `${result.typeEmoji} ${result.typeName}`;

    // Subtitle
    $('#result-subtitle').textContent = `"${result.subtitle}"`;

    // Pet name
    const genderSymbol = result.gender === 'm' ? '♂' : '♀';
    $('#result-pet-name').textContent = `${result.petName} ${genderSymbol}`;

    // Breed
    const breedEl = $('#result-breed');
    if (result.breed) {
      breedEl.textContent = `${result.animalName} · ${result.breed}`;
      breedEl.style.display = '';
    } else {
      breedEl.textContent = '';
      breedEl.style.display = 'none';
    }

    // Elements chart
    const elementsChart = $('#elements-chart');
    elementsChart.innerHTML = '';
    const elementConfig = {
      목: { emoji: '🌿', color: 'var(--color-wood)' },
      화: { emoji: '🔥', color: 'var(--color-fire)' },
      토: { emoji: '🌍', color: 'var(--color-earth)' },
      금: { emoji: '⚡', color: 'var(--color-metal)' },
      수: { emoji: '💧', color: 'var(--color-water)' }
    };

    for (const [element, percent] of Object.entries(result.elements)) {
      const cfg = elementConfig[element];
      const row = document.createElement('div');
      row.className = 'element-row';
      row.innerHTML = `
        <span class="element-label">${element} ${cfg.emoji}</span>
        <div class="element-bar-bg">
          <div class="element-bar-fill" style="background: ${cfg.color};" data-width="${percent}"></div>
        </div>
        <span class="element-percent">${percent}%</span>
      `;
      elementsChart.appendChild(row);
    }

    // Animate bars after render
    requestAnimationFrame(() => {
      setTimeout(() => {
        elementsChart.querySelectorAll('.element-bar-fill').forEach(bar => {
          bar.style.width = bar.dataset.width + '%';
        });
      }, 100);
    });

    // Personality stars
    const personalityChart = $('#personality-chart');
    personalityChart.innerHTML = '';
    for (const [trait, score] of Object.entries(result.personality)) {
      const row = document.createElement('div');
      row.className = 'personality-row';
      let stars = '';
      for (let i = 1; i <= 5; i++) {
        stars += i <= score
          ? '<span class="star-filled">★</span>'
          : '<span class="star-empty">☆</span>';
      }
      row.innerHTML = `
        <span class="personality-label">${trait}</span>
        <span class="personality-stars">${stars}</span>
      `;
      personalityChart.appendChild(row);
    }

    // Description
    $('#result-description').textContent = result.description;

    // Lucky info
    const luckyInfo = $('#lucky-info');
    luckyInfo.innerHTML = `
      <div class="lucky-row">
        <span class="lucky-label">행운의 색상</span>
        <span class="lucky-value">${result.luckyColor}</span>
      </div>
      <div class="lucky-row">
        <span class="lucky-label">행운의 간식</span>
        <span class="lucky-value">${result.luckySnack}</span>
      </div>
      <div class="lucky-row">
        <span class="lucky-label">행운의 산책</span>
        <span class="lucky-value">${result.luckyWalkTime}</span>
      </div>
      <div class="lucky-row">
        <span class="lucky-label">베스트 프렌드</span>
        <span class="lucky-value">${result.luckyBestFriend || ''}</span>
      </div>
    `;
  }

  // ========== Toast ==========
  function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  // ========== Event Listeners ==========
  function bindEvents() {
    // Landing → Input
    $('#btn-start').addEventListener('click', () => switchScreen('input'));

    // Back to Landing
    $('#btn-back-landing').addEventListener('click', () => switchScreen('landing'));

    // Animal selection
    $$('.animal-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        $$('.animal-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        state.animal = chip.dataset.animal;

        // 품종 필드 표시
        const breedGroup = $('#breed-group');
        const breedInput = $('#input-breed');
        const breedHintEl = $('#breed-hint');
        const info = breedHints[state.animal];
        if (info) {
          breedInput.placeholder = info.placeholder;
          breedHintEl.textContent = info.hint;
          breedGroup.style.display = '';
        }

        validateForm();
      });
    });

    // Gender selection
    $$('.gender-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.gender-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.gender = btn.dataset.gender;
        validateForm();
      });
    });

    // Photo upload
    const photoInput = $('#input-photo');
    const photoPlaceholder = $('#photo-placeholder');
    const photoPreview = $('#photo-preview');
    const photoPreviewImg = $('#photo-preview-img');
    const photoRemove = $('#photo-remove');

    photoPlaceholder.addEventListener('click', () => photoInput.click());

    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Validate file type and size (max 5MB)
      if (!file.type.startsWith('image/')) {
        showToast('이미지 파일만 업로드할 수 있어요');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('5MB 이하의 이미지만 업로드할 수 있어요');
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        state.photoDataUrl = ev.target.result;
        photoPreviewImg.src = ev.target.result;
        photoPlaceholder.style.display = 'none';
        photoPreview.style.display = '';
      };
      reader.readAsDataURL(file);
    });

    photoRemove.addEventListener('click', (e) => {
      e.stopPropagation();
      state.photoDataUrl = null;
      photoInput.value = '';
      photoPreviewImg.src = '';
      photoPreview.style.display = 'none';
      photoPlaceholder.style.display = '';
    });

    // Input fields → validate on change
    ['#input-name', '#input-breed', '#input-year', '#input-month', '#input-day', '#input-hour'].forEach(sel => {
      $(sel).addEventListener('input', validateForm);
      $(sel).addEventListener('change', validateForm);
    });

    // Analyze button
    $('#btn-analyze').addEventListener('click', () => {
      if (!validateForm()) {
        showErrors();
        return;
      }

      // Run analysis
      const result = SajuEngine.analyze({
        animal: state.animal,
        breed: state.breed,
        name: state.name,
        year: state.year,
        month: state.month,
        day: state.day,
        gender: state.gender,
        hour: state.hour
      });
      state.result = result;

      // Switch to loading
      switchScreen('loading');

      // Run loading animation, then show result
      runLoadingSequence(() => {
        renderResult(result);
        switchScreen('result');
      });
    });

    // Save button — 전체 결과 영역 캡처
    $('#btn-save').addEventListener('click', () => {
      ShareManager.saveAsImage('result-capture', state.result.petName);
    });

    // Share button
    $('#btn-share').addEventListener('click', () => {
      const shareUrl = ShareManager.buildShareUrl(state);
      ShareManager.share({
        title: `🐾 ${state.result.petName}의 사주 결과`,
        text: `${state.result.petName}은(는) "${state.result.typeName}" 타입! 우리 아이의 사주도 확인해보세요!`,
        url: shareUrl
      });
    });

    // Retry button
    $('#btn-retry').addEventListener('click', () => {
      // Reset form
      state.animal = null;
      state.breed = '';
      state.name = '';
      state.year = null;
      state.month = null;
      state.day = null;
      state.gender = null;
      state.hour = -1;
      state.photoDataUrl = null;
      state.result = null;

      $$('.animal-chip').forEach(c => c.classList.remove('selected'));
      $$('.gender-btn').forEach(b => b.classList.remove('selected'));
      $('#input-name').value = '';
      $('#input-breed').value = '';
      $('#breed-group').style.display = 'none';
      $('#input-photo').value = '';
      $('#photo-preview').style.display = 'none';
      $('#photo-placeholder').style.display = '';
      $('#photo-preview-img').src = '';
      $('#input-year').value = '';
      $('#input-month').value = '';
      $('#input-day').value = '';
      $('#input-hour').value = '-1';
      $('#error-name').textContent = '';
      $('#error-date').textContent = '';
      $('#error-gender').textContent = '';
      $('#progress-fill').style.width = '0%';

      const btn = $('#btn-analyze');
      btn.disabled = true;
      btn.classList.add('btn-disabled');

      // Clear URL params
      if (window.history.replaceState) {
        window.history.replaceState({}, '', window.location.pathname);
      }

      switchScreen('input');
    });
  }

  // ========== Init ==========
  function init() {
    populateDateSelects();
    bindEvents();

    // Check if URL has params for shared result
    if (!checkUrlParams()) {
      // Normal flow: show landing
      screens.landing.classList.add('active');
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
