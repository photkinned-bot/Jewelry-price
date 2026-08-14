import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, GripHorizontal, RotateCcw } from 'lucide-react';

interface ModalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  maxWidthClass?: string; // e.g. 'max-w-xl', 'max-w-3xl', 'max-w-5xl'
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerActions?: React.ReactNode;
}

export const ModalDialog: React.FC<ModalDialogProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  maxWidthClass = 'max-w-xl',
  children,
  footer,
  headerActions,
}) => {
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialPosX: number; initialPosY: number }>({
    startX: 0,
    startY: 0,
    initialPosX: 0,
    initialPosY: 0,
  });
  const dialogRef = useRef<HTMLDivElement>(null);

  // Reset position when opened or closed
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // ESC key listener to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle Dragging - Mouse and Touch
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialPosX: position.x,
      initialPosY: position.y,
    };
  }, [position]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag from header if not clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a') || target.closest('select')) {
      return;
    }
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a') || target.closest('select')) {
      return;
    }
    const touch = e.touches[0];
    if (touch) {
      handleDragStart(touch.clientX, touch.clientY);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.startX;
      const deltaY = e.clientY - dragStartRef.current.startY;
      
      // Calculate clamped position so modal doesn't get lost off-screen
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const maxX = Math.max(50, viewportWidth * 0.45);
      const maxY = Math.max(50, viewportHeight * 0.4);

      const newX = Math.min(Math.max(dragStartRef.current.initialPosX + deltaX, -maxX), maxX);
      const newY = Math.min(Math.max(dragStartRef.current.initialPosY + deltaY, -maxY), maxY);

      setPosition({ x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      
      const deltaX = touch.clientX - dragStartRef.current.startX;
      const deltaY = touch.clientY - dragStartRef.current.startY;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const maxX = Math.max(50, viewportWidth * 0.45);
      const maxY = Math.max(50, viewportHeight * 0.4);

      const newX = Math.min(Math.max(dragStartRef.current.initialPosX + deltaX, -maxX), maxX);
      const newY = Math.min(Math.max(dragStartRef.current.initialPosY + deltaY, -maxY), maxY);

      setPosition({ x: newX, y: newY });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);
    window.addEventListener('touchcancel', handleDragEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
      window.removeEventListener('touchcancel', handleDragEnd);
    };
  }, [isDragging]);

  if (!isOpen) return null;

  const isMoved = position.x !== 0 || position.y !== 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 overflow-hidden"
      onClick={(e) => {
        // Close when clicking directly on the backdrop
        if (e.target === e.currentTarget && !isDragging) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          transition: isDragging ? 'none' : 'transform 0.15s ease-out',
        }}
        className={`bg-slate-900 border border-slate-800 rounded-2xl w-full ${maxWidthClass} text-slate-100 shadow-2xl flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden animate-in fade-in zoom-in-95 duration-150 relative`}
      >
        {/* Header - Fixed & Draggable */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className={`shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-slate-800 bg-slate-900/95 backdrop-blur select-none cursor-grab active:cursor-grabbing ${
            isDragging ? 'bg-slate-800/90' : ''
          }`}
          title="Затисніть для переміщення вікна"
        >
          {/* Left Title & Icon */}
          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
            {icon && <div className="shrink-0">{icon}</div>}
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold font-serif text-white truncate leading-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right Controls: Drag Indicator + Reset Position + Close Button */}
          <div className="flex items-center space-x-1.5 shrink-0">
            {headerActions}

            {isMoved && (
              <button
                type="button"
                onClick={() => setPosition({ x: 0, y: 0 })}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors text-xs flex items-center gap-1"
                title="Повернути вікно в центр екрана"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px]">В центр</span>
              </button>
            )}

            <div
              className="p-1 text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing hidden sm:flex items-center"
              title="Перетягнути вікно"
            >
              <GripHorizontal className="w-4 h-4" />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 -mr-1 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/40 border border-slate-700/60 transition-all active:scale-95 flex items-center justify-center shadow-sm"
              title="Закрити вікно (Esc)"
              aria-label="Закрити"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 sm:space-y-6">
          {children}
        </div>

        {/* Footer - Fixed at bottom */}
        {footer && (
          <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 bg-slate-950 border-t border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
