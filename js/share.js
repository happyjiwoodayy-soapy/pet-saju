/**
 * 반려동물 사주 — 공유 & 저장 기능
 */

const ShareManager = (() => {

  /**
   * CSS 변수를 실제 값으로 변환 (html2canvas가 var() 해석 못 하는 문제 대응)
   */
  function resolveCSSVariables(container) {
    const computed = getComputedStyle(document.documentElement);
    const varMap = {
      '--color-wood': computed.getPropertyValue('--color-wood').trim(),
      '--color-fire': computed.getPropertyValue('--color-fire').trim(),
      '--color-earth': computed.getPropertyValue('--color-earth').trim(),
      '--color-metal': computed.getPropertyValue('--color-metal').trim(),
      '--color-water': computed.getPropertyValue('--color-water').trim(),
      '--color-text-primary': computed.getPropertyValue('--color-text-primary').trim(),
      '--color-text-secondary': computed.getPropertyValue('--color-text-secondary').trim(),
      '--color-primary': computed.getPropertyValue('--color-primary').trim(),
      '--color-bg-white': computed.getPropertyValue('--color-bg-white').trim(),
      '--color-border': computed.getPropertyValue('--color-border').trim()
    };

    // 오행 바 색상을 인라인으로 치환
    container.querySelectorAll('.element-bar-fill').forEach(bar => {
      const style = getComputedStyle(bar);
      bar.dataset.origBg = bar.style.background || '';
      bar.style.backgroundColor = style.backgroundColor;
    });

    // 오행 바 너비를 인라인 고정 (transition 중 0%로 캡처되는 문제 방지)
    container.querySelectorAll('.element-bar-fill').forEach(bar => {
      bar.dataset.origWidth = bar.style.width || '';
      bar.style.width = bar.dataset.width + '%';
    });

    return varMap;
  }

  /**
   * 캡처 전 임시 스타일 적용 → 캡처 후 복원
   */
  function enterCaptureMode(container) {
    // overflow: hidden 해제 (html2canvas 클리핑 방지)
    const app = document.getElementById('app');
    app.dataset.origOverflow = app.style.overflow || '';
    app.style.overflow = 'visible';

    // 캡처 영역에 캡처 전용 클래스 추가
    container.classList.add('capturing');

    resolveCSSVariables(container);
  }

  function exitCaptureMode(container) {
    const app = document.getElementById('app');
    app.style.overflow = app.dataset.origOverflow || '';

    container.classList.remove('capturing');

    // 인라인 스타일 복원
    container.querySelectorAll('.element-bar-fill').forEach(bar => {
      if (bar.dataset.origBg !== undefined) {
        bar.style.background = bar.dataset.origBg;
        delete bar.dataset.origBg;
      }
      if (bar.dataset.origWidth !== undefined) {
        bar.style.width = bar.dataset.origWidth;
        delete bar.dataset.origWidth;
      }
    });
  }

  /**
   * 결과 전체를 이미지로 저장
   */
  async function saveAsImage(elementId, petName) {
    const el = document.getElementById(elementId);
    if (!el) return;

    try {
      showToast('이미지를 생성하는 중...');

      // 캡처 모드 진입 (CSS 변수 해결, overflow 해제 등)
      enterCaptureMode(el);

      // 잠시 대기 (리플로우 반영)
      await new Promise(r => setTimeout(r, 100));

      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#FFF5F7',
        useCORS: true,
        logging: false,
        allowTaint: true,
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight
      });

      // 캡처 모드 해제
      exitCaptureMode(el);

      const link = document.createElement('a');
      link.download = `${petName || '반려동물'}_사주결과.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      showToast('이미지가 저장되었어요! 📷');
    } catch (err) {
      console.error('Image save failed:', err);
      exitCaptureMode(el);
      showToast('이미지 저장에 실패했어요 😢');
    }
  }

  /**
   * 공유 URL 생성
   */
  function buildShareUrl(state) {
    const base = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    params.set('t', state.animal || '');
    params.set('n', state.name || '');

    const y = String(state.year || '');
    const m = String(state.month || '').padStart(2, '0');
    const d = String(state.day || '').padStart(2, '0');
    params.set('b', y + m + d);

    params.set('g', state.gender || 'm');
    params.set('h', String(state.hour != null ? state.hour : -1));

    return base + '?' + params.toString();
  }

  /**
   * Web Share API / 클립보드 복사 폴백
   */
  async function share({ title, text, url }) {
    // Try Web Share API first (mobile native)
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // User cancelled
        console.warn('Web Share failed, falling back to clipboard', err);
      }
    }

    // Fallback: copy URL to clipboard
    try {
      await navigator.clipboard.writeText(url);
      showToast('링크가 복사되었어요! 📋');
    } catch (err) {
      // Last resort: create temp input
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showToast('링크가 복사되었어요! 📋');
    }
  }

  /**
   * Toast helper (reuses app.js toast if available)
   */
  function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.remove('show');
    // Force reflow
    void toast.offsetWidth;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  return {
    saveAsImage,
    buildShareUrl,
    share
  };

})();
