import { useEffect, useState } from 'react';

let scrollLocks = 0;
let previousOverflow = '';
export const PHONE_QUERY = '(max-width: 720px), (max-width: 1024px) and (pointer: coarse)';

export function useScrollLock(enabled) {
  useEffect(() => {
    if (!enabled) return;
    if (scrollLocks === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    scrollLocks++;
    return () => {
      scrollLocks--;
      if (scrollLocks === 0) document.body.style.overflow = previousOverflow;
    };
  }, [enabled]);
}

export function usePhoneLayout() {
  const [isPhone, setIsPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches);
  useEffect(() => {
    const media = window.matchMedia(PHONE_QUERY);
    const viewport = window.visualViewport;
    let widest = window.innerWidth;
    let tallest = viewport?.height || window.innerHeight;
    let frame;
    const update = () => {
      const height = viewport?.height || window.innerHeight;
      if (Math.abs(window.innerWidth - widest) > 80) {
        widest = window.innerWidth;
        tallest = height;
      } else tallest = Math.max(tallest, height);
      const editable = document.activeElement?.matches('input:not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]');
      const keyboard = media.matches && editable && (!viewport || viewport.scale === 1) && tallest - height > 120;
      document.documentElement.style.setProperty('--visible-height', `${height}px`);
      document.documentElement.style.setProperty('--visible-top', `${viewport?.offsetTop || 0}px`);
      document.documentElement.dataset.keyboardOpen = keyboard ? 'true' : 'false';
      setIsPhone(media.matches);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    update();
    media.addEventListener('change', schedule);
    window.addEventListener('resize', schedule);
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener('change', schedule);
      window.removeEventListener('resize', schedule);
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', schedule);
      document.documentElement.style.removeProperty('--visible-height');
      document.documentElement.style.removeProperty('--visible-top');
      delete document.documentElement.dataset.keyboardOpen;
    };
  }, []);
  return isPhone;
}
