"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface ResizablePanelProps {
  defaultWidth: number; // px
  minWidth?: number;
  maxWidth?: number;
  position: 'left' | 'right';
  children: React.ReactNode;
  /** Additional class names for the panel content wrapper */
  className?: string;
  /** Called when resize completes */
  onResize?: (width: number) => void;
}

export function ResizablePanel({
  defaultWidth,
  minWidth = 280,
  maxWidth = 800,
  position,
  children,
  className = '',
  onResize,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);

      const startX = e.clientX;
      const startWidth = width;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        const delta = position === 'right'
          ? -(moveEvent.clientX - startX)
          : moveEvent.clientX - startX;
        const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + delta));
        setWidth(newWidth);
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        upEvent.preventDefault();
        setIsDragging(false);
        onResize?.(width);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [width, minWidth, maxWidth, position, onResize]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  return (
    <div
      ref={panelRef}
      className={`relative flex flex-col shrink-0 border-l border-zinc-200 bg-white ${className}`}
      style={{ width: `${width}px`, height: '100%' }}
    >
      {/* Drag handle */}
      <div
        className={`absolute top-0 bottom-0 z-20 cursor-col-resize select-none group ${
          position === 'right' ? '-left-[3px]' : '-right-[3px]'
        }`}
        style={{ width: '6px' }}
        onMouseDown={handleMouseDown}
      >
        {/* Visible handle bar */}
        <div
          className={`h-full w-[3px] mx-auto transition-colors duration-150 ${
            isDragging
              ? 'bg-blue-400'
              : 'bg-transparent group-hover:bg-blue-300/60'
          }`}
        />
      </div>
      {/* Panel content */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
