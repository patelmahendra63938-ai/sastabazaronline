'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { SUPPORTED_INDIAN_LANGUAGES, logLanguageError, logLanguageSuccess } from '@/lib/i18n';

const GOOGLE_TRANSLATE_SCRIPT_ID = 'google-translate-script';
const GOOGLE_TRANSLATE_ELEMENT_ID = 'google_translate_element';

type GoogleTranslateWindow = Window & {
  google?: {
    translate?: {
      TranslateElement: new (
        options: { pageLanguage: string; includedLanguages: string; autoDisplay: boolean },
        elementId: string
      ) => unknown;
    };
  };
  googleTranslateElementInit?: () => void;
};

function loadGoogleTranslate() {
  const translateWindow = window as GoogleTranslateWindow;

  if (!document.getElementById(GOOGLE_TRANSLATE_ELEMENT_ID)) {
    const element = document.createElement('div');
    element.id = GOOGLE_TRANSLATE_ELEMENT_ID;
    element.hidden = true;
    document.body.appendChild(element);
  }

  const initialize = () => {
    const TranslateElement = translateWindow.google?.translate?.TranslateElement;
    if (TranslateElement) {
      new TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'en,hi,gu,mr,bn,ta,te,kn,ml,pa,ur,or,as',
        autoDisplay: false,
      }, GOOGLE_TRANSLATE_ELEMENT_ID);
    }
  };

  translateWindow.googleTranslateElementInit = initialize;

  if (translateWindow.google?.translate?.TranslateElement) {
    initialize();
    return;
  }

  if (!document.getElementById(GOOGLE_TRANSLATE_SCRIPT_ID)) {
    const script = document.createElement('script');
    script.id = GOOGLE_TRANSLATE_SCRIPT_ID;
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.head.appendChild(script);
  }
}

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const match = document.cookie.match(/(^|;\s*)googtrans=([^;]*)/);
      if (match) {
        const langCode = match[2].split('/').pop();
        if (langCode) {
          setCurrentLang(langCode);
          if (langCode !== 'en') loadGoogleTranslate();
        }
      } else {
        const saved = localStorage.getItem('sastabazaronline_lang');
        if (saved) {
          setCurrentLang(saved);
          if (saved !== 'en') loadGoogleTranslate();
        }
      }
    } catch (err: any) {
      logLanguageError('Read Language Preference', err.message);
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const switchLanguage = (langCode: string) => {
    try {
      const cookieValue = `/en/${langCode}`;
      document.cookie = `googtrans=${cookieValue}; path=/; domain=${window.location.hostname}`;
      document.cookie = `googtrans=${cookieValue}; path=/;`;
      localStorage.setItem('sastabazaronline_lang', langCode);

      setCurrentLang(langCode);
      setIsOpen(false);
      logLanguageSuccess(langCode);
      window.location.reload();
    } catch (err: any) {
      logLanguageError('Switch Language', err.message);
      alert('Failed to switch language. Please try again.');
    }
  };

  const toggleLanguageMenu = () => {
    if (!isOpen) loadGoogleTranslate();
    setIsOpen(open => !open);
  };

  const activeLangObj = SUPPORTED_INDIAN_LANGUAGES.find(l => l.code === currentLang) || SUPPORTED_INDIAN_LANGUAGES[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleLanguageMenu}
        className="flex min-h-11 items-center gap-1.5 bg-indigo-900/90 hover:bg-indigo-900 text-white px-3 rounded-xl text-xs font-bold border border-indigo-700 transition cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
        aria-label={`Select language. Current language: ${activeLangObj.native}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Globe size={15} className="text-orange-300 shrink-0" aria-hidden="true" />
        <span className="uppercase">{activeLangObj.native}</span>
        <ChevronDown size={13} className={`opacity-80 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div role="menu" aria-label="Choose language" className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 z-50 max-h-80 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
            <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">
              SASTABAZARONLINE Languages
            </span>
          </div>
          <div className="py-1">
            {SUPPORTED_INDIAN_LANGUAGES.map((lang) => (
              <button
                type="button"
                role="menuitemradio"
                aria-checked={currentLang === lang.code}
                key={lang.code}
                onClick={() => switchLanguage(lang.code)}
                className={`w-full min-h-11 text-left px-4 py-2.5 text-xs flex items-center justify-between hover:bg-orange-50 hover:text-orange-800 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-700 ${
                  currentLang === lang.code ? 'font-black text-orange-800 bg-orange-50/60' : 'text-gray-800 font-semibold'
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-bold">{lang.native}</span>
                  <span className="text-[10px] text-gray-600 font-normal">{lang.name}</span>
                </div>
                {currentLang === lang.code && <Check size={14} className="text-orange-700 shrink-0" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
