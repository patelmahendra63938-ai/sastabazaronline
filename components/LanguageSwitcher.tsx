'use client';

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

const INCLUDED_LANGUAGES =
  'en,hi,gu,mr,bn,ta,te,kn,ml,pa,ur,or,as';

function ensureTranslateElement() {
  let element = document.getElementById(
    GOOGLE_TRANSLATE_ELEMENT_ID
  );

  if (!element) {
    element = document.createElement('div');
    element.id = GOOGLE_TRANSLATE_ELEMENT_ID;

    // Do NOT use element.hidden = true.
    // Google Translate needs the element to initialize its selector.
    element.style.position = 'fixed';
    element.style.left = '-9999px';
    element.style.top = '-9999px';
    element.style.width = '1px';
    element.style.height = '1px';
    element.style.overflow = 'hidden';

    document.body.appendChild(element);
  }
}

function initializeGoogleTranslate() {
  const translateWindow = window as GoogleTranslateWindow;

  ensureTranslateElement();

  const TranslateElement =
    translateWindow.google?.translate?.TranslateElement;

  if (!TranslateElement) {
    return false;
  }

  const container = document.getElementById(
    GOOGLE_TRANSLATE_ELEMENT_ID
  );

  if (
    container &&
    !container.querySelector('.goog-te-combo')
  ) {
    new TranslateElement(
      {
        pageLanguage: 'en',
        includedLanguages: INCLUDED_LANGUAGES,
        autoDisplay: false,
      },
      GOOGLE_TRANSLATE_ELEMENT_ID
    );
  }

  return true;
}

function loadGoogleTranslate(): Promise<void> {
  return new Promise((resolve, reject) => {
    const translateWindow = window as GoogleTranslateWindow;

    ensureTranslateElement();

    if (
      translateWindow.google?.translate?.TranslateElement
    ) {
      initializeGoogleTranslate();
      resolve();
      return;
    }

    translateWindow.googleTranslateElementInit = () => {
      try {
        initializeGoogleTranslate();
        resolve();
      } catch (error) {
        reject(error);
      }
    };

    const existingScript =
      document.getElementById(
        GOOGLE_TRANSLATE_SCRIPT_ID
      ) as HTMLScriptElement | null;

    if (existingScript) {
      const timer = window.setInterval(() => {
        if (
          translateWindow.google?.translate?.TranslateElement
        ) {
          window.clearInterval(timer);
          initializeGoogleTranslate();
          resolve();
        }
      }, 100);

      window.setTimeout(() => {
        window.clearInterval(timer);
        reject(
          new Error(
            'Google Translate initialization timed out.'
          )
        );
      }, 10000);

      return;
    }

    const script = document.createElement('script');

    script.id = GOOGLE_TRANSLATE_SCRIPT_ID;
    script.src =
      'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;

    script.onerror = () => {
      reject(
        new Error(
          'Google Translate script could not be loaded.'
        )
      );
    };

    document.head.appendChild(script);
  });
}

function setTranslateCookie(langCode: string) {
  const value = `/en/${langCode}`;
  const hostname = window.location.hostname;

  // Current host cookie
  document.cookie =
    `googtrans=${value}; path=/; SameSite=Lax`;

  // Production parent-domain cookie
  if (
    hostname === 'sastabazaronline.in' ||
    hostname.endsWith('.sastabazaronline.in')
  ) {
    document.cookie =
      `googtrans=${value}; path=/; domain=.sastabazaronline.in; SameSite=Lax`;
  }
}

async function applyGoogleLanguage(
  langCode: string
): Promise<boolean> {
  await loadGoogleTranslate();

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const combo =
      document.querySelector<HTMLSelectElement>(
        '.goog-te-combo'
      );

    if (combo) {
      combo.value = langCode;

      combo.dispatchEvent(
        new Event('change', {
          bubbles: true,
        })
      );

      return true;
    }

    await new Promise((resolve) =>
      window.setTimeout(resolve, 100)
    );
  }

  return false;
}

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] =
    useState('en');
  const [switching, setSwitching] =
    useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let preferredLanguage = 'en';

    try {
      const saved =
        localStorage.getItem(
          'sastabazaronline_lang'
        );

      const cookieMatch =
        document.cookie.match(
          /(?:^|;\s*)googtrans=([^;]+)/
        );

      const cookieLanguage =
        cookieMatch?.[1]
          ?.split('/')
          .filter(Boolean)
          .pop();

      if (
        cookieLanguage &&
        SUPPORTED_INDIAN_LANGUAGES.some(
          (language) =>
            language.code === cookieLanguage
        )
      ) {
        preferredLanguage = cookieLanguage;
      } else if (
        saved &&
        SUPPORTED_INDIAN_LANGUAGES.some(
          (language) =>
            language.code === saved
        )
      ) {
        preferredLanguage = saved;
      }

      setCurrentLang(preferredLanguage);

      // Preload translator so every language is ready.
      void loadGoogleTranslate().catch(() => {
        // Do not block storefront if Google is unavailable.
      });
    } catch (error) {
      logLanguageError(
        'Read Language Preference',
        error instanceof Error
          ? error.message
          : 'Unknown error'
      );
    }

    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target as Node
        )
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
    };
  }, []);

  const switchLanguage = async (
    langCode: string
  ) => {
    if (switching) return;

    try {
      setSwitching(true);

      localStorage.setItem(
        'sastabazaronline_lang',
        langCode
      );

      setTranslateCookie(langCode);

      setCurrentLang(langCode);
      setIsOpen(false);

      if (langCode === 'en') {
        logLanguageSuccess(langCode);

        window.location.reload();
        return;
      }

      const applied =
        await applyGoogleLanguage(langCode);

      logLanguageSuccess(langCode);

      if (!applied) {
        // Cookie is already set, so reload is a safe fallback.
        window.location.reload();
      }
    } catch (error) {
      logLanguageError(
        'Switch Language',
        error instanceof Error
          ? error.message
          : 'Unknown error'
      );

      // Cookie/localStorage fallback still allows translation after reload.
      window.location.reload();
    } finally {
      setSwitching(false);
    }
  };

  const activeLanguage =
    SUPPORTED_INDIAN_LANGUAGES.find(
      (language) =>
        language.code === currentLang
    ) ??
    SUPPORTED_INDIAN_LANGUAGES[0];

  return (
    <div
      ref={dropdownRef}
      className="relative inline-block text-left"
    >
      <button
        type="button"
        onClick={() =>
          setIsOpen((open) => !open)
        }
        disabled={switching}
        className="flex items-center gap-1.5 rounded-xl border border-indigo-700 bg-indigo-900/90 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-900 disabled:opacity-60"
        aria-label="Select Language"
        aria-expanded={isOpen}
      >
        <Globe
          size={15}
          className="shrink-0 text-orange-400"
        />

        <span>
          {activeLanguage.native}
        </span>

        <ChevronDown
          size={13}
          className={`opacity-70 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-[100] mt-2 max-h-[70vh] w-60 overflow-y-auto rounded-2xl border border-gray-200 bg-white py-2 shadow-2xl">
          <div className="border-b border-gray-100 bg-gray-50 px-3 py-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Select Language
            </span>
          </div>

          <div className="py-1">
            {SUPPORTED_INDIAN_LANGUAGES.map(
              (language) => (
                <button
                  type="button"
                  key={language.code}
                  onClick={() =>
                    void switchLanguage(
                      language.code
                    )
                  }
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-xs transition hover:bg-orange-50 hover:text-orange-600 ${
                    currentLang === language.code
                      ? 'bg-orange-50/60 font-black text-orange-600'
                      : 'font-semibold text-gray-700'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-bold">
                      {language.native}
                    </span>

                    <span className="text-[10px] font-normal text-gray-400">
                      {language.name}
                    </span>
                  </div>

                  {currentLang ===
                    language.code && (
                    <Check
                      size={14}
                      className="shrink-0 text-orange-500"
                    />
                  )}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}