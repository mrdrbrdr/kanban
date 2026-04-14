import { useState, type MouseEvent } from 'react';

interface ShiftHoverPopup {
  popupRect: DOMRect | null;
  handlers: {
    onMouseEnter: (e: MouseEvent) => void;
    onMouseMove: (e: MouseEvent) => void;
    onMouseLeave: () => void;
  };
}

export function useShiftHoverPopup(): ShiftHoverPopup {
  const [popupRect, setPopupRect] = useState<DOMRect | null>(null);

  function handleShiftHover(e: MouseEvent): void {
    if (e.shiftKey) {
      setPopupRect(e.currentTarget.getBoundingClientRect());
    } else if (popupRect) {
      setPopupRect(null);
    }
  }

  return {
    popupRect,
    handlers: {
      onMouseEnter: handleShiftHover,
      onMouseMove: handleShiftHover,
      onMouseLeave: () => setPopupRect(null),
    },
  };
}
