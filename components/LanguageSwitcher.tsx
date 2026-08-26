

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import {
  SUPPORTED_INDIAN_LANGUAGES,
  logLanguageError,
  logLanguageSuccess,
} from '@/lib/i18n';

const GOOGLE_TRANSLATE_SCRIPT_ID = 'google-translate-script';
const GOOGLE_TRANSLATE_ELEMENT_ID = 'google_translate_element';

type GoogleTranslateWindow = Window & {
  google?: {
    translate?: {
      TranslateElement: new (
        options: {
          pageLanguage: string;
          includedLanguages: string;
          autoDisplay: boolean;
        },
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
    const TranslateElement =
      translateWindow.google?.translate?.TranslateElement;

    if (TranslateElement) {
      new TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: 'en,hi,gu,mr,bn,ta,te,kn,ml,pa,ur,or,as',
          autoDisplay: false,
        },
        GOOGLE_TRANSLATE_ELEMENT_ID
      );
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
    script.src =
      'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
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
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const switchLanguage = (langCode: string) => {
    try {
      const cookieValue = `/en/${langCode}`;

      document.cookie = `googtrans=${cookieValue}; path=/; domain=${window.location.hostname}`;
      document.cookie = `googtrans=${cookieValue}; path=/;`;

      // Keep the existing storage key so previous customer preferences continue working.
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
    setIsOpen((open) => !open);
  };

  const activeLangObj =
    SUPPORTED_INDIAN_LANGUAGES.find(
      (language) => language.code === currentLang
    ) || SUPPORTED_INDIAN_LANGUAGES[0];

  return (
    <div
      className="relative inline-block text-left"
      ref={dropdownRef}
    >
      <button
        type="button"
        onClick={toggleLanguageMenu}
        className="flex min-h-11 items-center gap-1.5 rounded-xl border border-[#d7aa5b] bg-[#fff7e8] px-3 text-xs font-bold text-[#741f23] shadow-sm transition hover:bg-[#fff2dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7aa5b] cursor-pointer"
        aria-label={`Select language. Current language: ${activeLangObj.native}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Globe
          size={15}
          className="shrink-0 text-[#b5843d]"
          aria-hidden="true"
        />

        <span className="uppercase">
          {activeLangObj.native}
        </span>

        <ChevronDown
          size={13}
          className={`opacity-80 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Choose language"
          className="absolute right-0 z-50 mt-2 max-h-80 w-56 overflow-y-auto rounded-2xl border border-[#ead8b8] bg-white py-2 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-[#ead8b8] bg-[#fffaf5] px-3 py-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#741f23]">
              ADHYEY BROTHERS Languages
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
                className={`flex min-h-11 w-full cursor-pointer items-center justify-between px-4 py-2.5 text-left text-xs transition hover:bg-[#fff2dc] hover:text-[#741f23] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d7aa5b] ${
                  currentLang === lang.code
                    ? 'bg-[#fff7e8] font-black text-[#741f23]'
                    : 'font-semibold text-stone-800'
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-bold">{lang.native}</span>
                  <span className="text-[10px] font-normal text-stone-500">
                    {lang.name}
                  </span>
                </div>

                {currentLang === lang.code && (
                  <Check
                    size={14}
                    className="shrink-0 text-[#b5843d]"
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
