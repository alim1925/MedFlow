'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Eye, Type, SlidersHorizontal, X } from 'lucide-react';

const AccessibilityContext = createContext({
  isLargeText: false,
  toggleLargeText: () => {},
  isHighContrast: false,
  toggleHighContrast: () => {},
});

export function AccessibilityProvider({ children }) {
  const [isLargeText, setIsLargeText] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Load accessibility preferences from localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    try {
      const savedLarge = localStorage.getItem('medflow_large_text');
      const savedContrast = localStorage.getItem('medflow_high_contrast');
      if (savedLarge === 'true') setIsLargeText(true);
      if (savedContrast === 'true') setIsHighContrast(true);
    } catch (e) {
      console.warn('Unable to access localStorage for accessibility settings', e);
    }
  }, []);

  // Update DOM classes and save state whenever preferences change
  useEffect(() => {
    if (!isMounted) return;

    const root = document.documentElement;

    if (isLargeText) {
      root.classList.add('text-large');
      localStorage.setItem('medflow_large_text', 'true');
    } else {
      root.classList.remove('text-large');
      localStorage.setItem('medflow_large_text', 'false');
    }

    if (isHighContrast) {
      root.classList.add('high-contrast');
      localStorage.setItem('medflow_high_contrast', 'true');
    } else {
      root.classList.remove('high-contrast');
      localStorage.setItem('medflow_high_contrast', 'false');
    }
  }, [isLargeText, isHighContrast, isMounted]);

  const toggleLargeText = () => setIsLargeText((prev) => !prev);
  const toggleHighContrast = () => setIsHighContrast((prev) => !prev);

  return (
    <AccessibilityContext.Provider
      value={{
        isLargeText,
        toggleLargeText,
        isHighContrast,
        toggleHighContrast,
      }}
    >
      {children}
      <AccessibilityToggle />
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}

export function AccessibilityToggle() {
  const { isLargeText, toggleLargeText, isHighContrast, toggleHighContrast } = useAccessibility();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Accessibility Controls Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Panel Aksesibilitas"
          className="mb-3 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-4 animate-slideUp text-slate-800"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
              <SlidersHorizontal className="w-4 h-4 text-sky-600" />
              <span>Aksesibilitas</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Tutup Panel Aksesibilitas"
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Toggle Teks Besar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl transition-colors ${isLargeText ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
                  <Type className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-800 leading-tight">Teks Besar</div>
                  <div className="text-[11px] text-slate-500">Perbesar ukuran font</div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isLargeText}
                onClick={toggleLargeText}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                  isLargeText ? 'bg-sky-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isLargeText ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle Kontras Tinggi */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl transition-colors ${isHighContrast ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-800 leading-tight">Kontras Tinggi</div>
                  <div className="text-[11px] text-slate-500">Pertajam ketajaman warna</div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isHighContrast}
                onClick={toggleHighContrast}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                  isHighContrast ? 'bg-sky-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isHighContrast ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Pengaturan Aksesibilitas"
        title="Pengaturan Aksesibilitas (Teks Besar & Kontras)"
        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full shadow-lg transition-all duration-200 ${
          isOpen || isLargeText || isHighContrast
            ? 'bg-sky-600 text-white shadow-sky-600/30'
            : 'bg-white text-slate-700 hover:text-sky-600 border border-slate-200/80 hover:border-sky-300'
        }`}
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span className="text-xs font-semibold pr-1">Aksesibilitas</span>
        {(isLargeText || isHighContrast) && (
          <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white"></span>
        )}
      </button>
    </div>
  );
}
