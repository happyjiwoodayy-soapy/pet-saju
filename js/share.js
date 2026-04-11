/**
 * 반려동물 사주 — 공유 & 저장 기능
 */

const ShareManager = (() => {

  /**
   * 결과 카드를 이미지로 저장
   */
  async function saveAsImage(elementId, petName) {
    const el = document.getElementById(elementId);
    if (!el) return;

    try {
      // Show toast while capturing
      showToast('이미지를 생성하는 중...');

      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        logging: false
      });

      const link = document.createElement('a');
      link.download = `${petName || '반려동물'}_사주결과.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      showToast('이미지가 저장되었어요! 📷');
    } catch (err) {
      console.error('Image save failed:', err);
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
