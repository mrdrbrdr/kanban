import { useState, useRef, useCallback } from 'react';

interface Options {
  storageKey: string;
  defaultWidth: number;
  min: number;
  max: number;
  edge: 'left' | 'right';
}

export function useResizable({ storageKey, defaultWidth, min, max, edge }: Options) {
  const [width, setWidth] = useState<number>(() => {
    const saved = localStorage.getItem(storageKey);
    const parsed = saved !== null ? Number(saved) : defaultWidth;
    if (!Number.isFinite(parsed)) return defaultWidth;
    return Math.max(min, Math.min(max, parsed));
  });

  const widthRef = useRef(width);
  widthRef.current = width;

  const startDrag = useCallback((e: React.MouseEvent): void => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = widthRef.current;
    let lastWidth = startWidth;

    function onMove(ev: MouseEvent): void {
      const delta = ev.clientX - startX;
      const raw = edge === 'left' ? startWidth - delta : startWidth + delta;
      lastWidth = Math.max(min, Math.min(max, raw));
      setWidth(lastWidth);
    }

    function onUp(): void {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem(storageKey, String(lastWidth));
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [edge, min, max, storageKey]);

  return { width, startDrag };
}
