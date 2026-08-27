'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';

import {
  SUPPORTED_INDIAN_LANGUAGES,
  SupportedLanguage,
  logLanguageError,
  logLanguageSuccess,
} from '@/lib/i18n';

const GOOGLE_TRANSLATE_SCRIPT_ID = 'google-translate-script';
const GOOGLE_TRANSLATE_ELEMENT_ID = 'google_translate_element';

/*
 * IMPORTANT:
 * Keep this legacy key unchanged so existing customer
 * language preferences continue to work.
 */
const LANGUAGE_STORAGE_KEY = 'sastabazaronline_lang';

const INCLUDED_GOOGLE_LANGUAGES =
  'en,hi,gu,mr,bn,ta,te,kn,ml,pa,ur,or,as';

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

  __adhyeyGoogleTranslateInitialized?: boolean;
};

function isSupportedLanguage(
  value: string | null | undefined
): value is SupportedLanguage {
  if (!value) {
    return false;
  }

  return SUPPORTED_INDIAN_LANGUAGES.some(
    (language) => language.code === value
  );
}

function isLocalEnvironment() {
  const hostname = window.location.hostname.toLowerCase();

  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)
  );
}

function getProductionRootDomain(): string | null {
  const hostname = window.location.hostname.toLowerCase();

  if (isLocalEnvironment()) {
    return null;
  }

  if (
    hostname === 'adhyeybrothers.in' ||
    hostname.endsWith('.adhyeybrothers.in')
  ) {
    return '.adhyeybrothers.in';
  }

  return null;
}

function expireCookie(name: string, domain?: string) {
  const domainPart = domain
    ? ` Domain=${domain};`
    : '';

  document.cookie =
    `${name}=;` +
    ` Path=/;` +
    `${domainPart}` +
    ` Expires=Thu, 01 Jan 1970 00:00:00 GMT;` +
    ` Max-Age=0;` +
    ` SameSite=Lax`;
}

function clearGoogleTranslateCookies() {
  const hostname = window.location.hostname.toLowerCase();
  const rootDomain = getProductionRootDomain();

  /*
   * Remove host-only cookie.
   */
  expireCookie('googtrans');

  /*
   * Remove possible hostname-scoped cookies left by
   * older versions of the switcher.
   */
  if (!isLocalEnvironment()) {
    expireCookie('googtrans', hostname);
    expireCookie('googtrans', `.${hostname}`);
  }

  /*
   * Remove production root-domain cookie.
   */
  if (rootDomain) {
    expireCookie('googtrans', rootDomain);
  }
}

function writeGoogleTranslateCookie(
  langCode: SupportedLanguage
) {
  clearGoogleTranslateCookies();

  /*
   * English = original page language.
   * No googtrans cookie should remain.
   */
  if (langCode === 'en') {
    return;
  }

  const cookieValue = `/en/${langCode}`;

  const rootDomain =
    getProductionRootDomain();

  /*
   * Production:
   * Use ONE authoritative root-domain cookie.
   */
  if (rootDomain) {
    document.cookie =
      `googtrans=${cookieValue};` +
      ` Path=/;` +
      ` Domain=${rootDomain};` +
      ` SameSite=Lax`;

    return;
  }

  /*
   * Localhost / LAN testing.
   */
  document.cookie =
    `googtrans=${cookieValue};` +
    ` Path=/;` +
    ` SameSite=Lax`;
}

function ensureTranslateContainer() {
  const existing =
    document.getElementById(
      GOOGLE_TRANSLATE_ELEMENT_ID
    );

  if (existing) {
    return;
  }

  const element =
    document.createElement('div');

  element.id =
    GOOGLE_TRANSLATE_ELEMENT_ID;

  element.style.position = 'fixed';
  element.style.left = '-10000px';
  element.style.top = '-10000px';
  element.style.width = '1px';
  element.style.height = '1px';
  element.style.overflow = 'hidden';
  element.style.pointerEvents = 'none';

  document.body.appendChild(element);
}

function loadGoogleTranslate() {
  const translateWindow =
    window as GoogleTranslateWindow;

  ensureTranslateContainer();

  const initialize = () => {
    try {
      if (
        translateWindow.__adhyeyGoogleTranslateInitialized
      ) {
        return;
      }

      const TranslateElement =
        translateWindow.google?.translate
          ?.TranslateElement;

      if (!TranslateElement) {
        return;
      }

      new TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages:
            INCLUDED_GOOGLE_LANGUAGES,
          autoDisplay: false,
        },
        GOOGLE_TRANSLATE_ELEMENT_ID
      );

      translateWindow.__adhyeyGoogleTranslateInitialized =
        true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Google Translate initialization failed';

      logLanguageError(
        'Initialize Google Translate',
        message
      );
    }
  };

  translateWindow.googleTranslateElementInit =
    initialize;

  if (
    translateWindow.google?.translate
      ?.TranslateElement
  ) {
    initialize();

    return;
  }

  if (
    document.getElementById(
      GOOGLE_TRANSLATE_SCRIPT_ID
    )
  ) {
    return;
  }

  const script =
    document.createElement('script');

  script.id =
    GOOGLE_TRANSLATE_SCRIPT_ID;

  script.src =
    'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';

  script.async = true;
  script.defer = true;

  script.onerror = () => {
    logLanguageError(
      'Load Google Translate',
      'Google Translate script failed to load.'
    );
  };

  document.head.appendChild(script);
}

function updateDocumentLanguage(
  langCode: SupportedLanguage
) {
  document.documentElement.lang =
    langCode;

  document.documentElement.dir =
    langCode === 'ur'
      ? 'rtl'
      : 'ltr';
}

function hardReloadCurrentPage() {
  window.location.reload();
}

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] =
    useState(false);

  const [currentLang, setCurrentLang] =
    useState<SupportedLanguage>('en');

  const dropdownRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const savedLanguage =
        localStorage.getItem(
          LANGUAGE_STORAGE_KEY
        );

      const preferredLanguage:
        SupportedLanguage =
        isSupportedLanguage(savedLanguage)
          ? savedLanguage
          : 'en';

      setCurrentLang(
        preferredLanguage
      );

      updateDocumentLanguage(
        preferredLanguage
      );

      writeGoogleTranslateCookie(
        preferredLanguage
      );

      if (
        preferredLanguage !== 'en'
      ) {
        loadGoogleTranslate();
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to read language preference';

      logLanguageError(
        'Read Language Preference',
        message
      );

      setCurrentLang('en');
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

    const handleEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    document.addEventListener(
      'keydown',
      handleEscape
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );

      document.removeEventListener(
        'keydown',
        handleEscape
      );
    };
  }, []);

  const switchLanguage = (
    langCode: string
  ) => {
    try {
      if (
        !isSupportedLanguage(langCode)
      ) {
        throw new Error(
          `Unsupported language code: ${langCode}`
        );
      }

      if (
        currentLang === langCode
      ) {
        setIsOpen(false);

        return;
      }

      localStorage.setItem(
        LANGUAGE_STORAGE_KEY,
        langCode
      );

      writeGoogleTranslateCookie(
        langCode
      );

      updateDocumentLanguage(
        langCode
      );

      setCurrentLang(
        langCode
      );

      setIsOpen(false);

      logLanguageSuccess(
        langCode
      );

      hardReloadCurrentPage();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to switch language';

      logLanguageError(
        'Switch Language',
        message
      );

      alert(
        'Failed to switch language. Please try again.'
      );
    }
  };

  const toggleLanguageMenu = () => {
    loadGoogleTranslate();

    setIsOpen(
      (open) => !open
    );
  };

  const activeLangObj =
    SUPPORTED_INDIAN_LANGUAGES.find(
      (language) =>
        language.code ===
        currentLang
    ) ||
    SUPPORTED_INDIAN_LANGUAGES[0];

  return (
    <div
      ref={dropdownRef}
      className="relative block w-full text-left sm:inline-block sm:w-auto"
    >
      <button
        type="button"
        onClick={
          toggleLanguageMenu
        }
        className="flex min-h-11 cursor-pointer touch-manipulation items-center gap-1.5 rounded-xl border border-[#d7aa5b] bg-[#fff7e8] px-3 text-xs font-bold text-[#741f23] shadow-sm transition hover:bg-[#fff2dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7aa5b]"
        aria-label={`Select language. Current language: ${activeLangObj.native}`}
        aria-haspopup="menu"
        aria-expanded={
          isOpen
        }
      >
        <Globe
          size={15}
          className="shrink-0 text-[#b5843d]"
          aria-hidden="true"
        />

        <span>
          {activeLangObj.native}
        </span>

        <ChevronDown
          size={13}
          className={`opacity-80 transition-transform duration-200 ${
            isOpen
              ? 'rotate-180'
              : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Choose language"
          className="
            absolute
            left-0
            right-auto
            z-[100]
            mt-2
            max-h-[55vh]
            w-[min(18rem,calc(100vw-3.5rem))]
            overflow-y-auto
            overflow-x-hidden
            overscroll-contain
            rounded-2xl
            border
            border-[#ead8b8]
            bg-white
            py-2
            shadow-2xl

            sm:left-auto
            sm:right-0
            sm:max-h-[70vh]
            sm:w-60
          "
          style={{
            WebkitOverflowScrolling:
              'touch',
          }}
        >
          <div className="sticky top-0 z-10 border-b border-[#ead8b8] bg-[#fffaf5] px-3 py-2">
            <span className="block truncate text-[10px] font-black uppercase tracking-widest text-[#741f23]">
              ADHYEY BROTHERS Languages
            </span>
          </div>

          <div className="py-1">
            {SUPPORTED_INDIAN_LANGUAGES.map(
              (lang) => {
                const active =
                  currentLang ===
                  lang.code;

                return (
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={
                      active
                    }
                    key={
                      lang.code
                    }
                    onClick={() =>
                      switchLanguage(
                        lang.code
                      )
                    }
                    className={`flex min-h-12 w-full touch-manipulation cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-xs transition hover:bg-[#fff2dc] hover:text-[#741f23] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d7aa5b] ${
                      active
                        ? 'bg-[#fff7e8] font-black text-[#741f23]'
                        : 'font-semibold text-stone-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-bold">
                        {lang.native}
                      </span>

                      <span className="block truncate text-[10px] font-normal text-stone-500">
                        {lang.name}
                      </span>
                    </div>

                    {active && (
                      <Check
                        size={14}
                        className="shrink-0 text-[#b5843d]"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              }
            )}
          </div>
        </div>
      )}
    </div>
  );
}