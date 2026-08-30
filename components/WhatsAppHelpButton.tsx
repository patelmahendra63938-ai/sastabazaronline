'use client';

import { usePathname } from 'next/navigation';

const WHATSAPP_NUMBER = '919723268666';

export default function WhatsAppHelpButton() {
  const pathname = usePathname();

  // Keep customer support UI out of the admin workspace.
  if (pathname?.startsWith('/admin')) return null;

  const openWhatsApp = () => {
    const pageUrl = window.location.href;
    const isProductPage = pathname?.startsWith('/product/');
    const message = isProductPage
      ? `Hi ADHYEY BROTHERS, I need help with this product: ${pageUrl}`
      : `Hi ADHYEY BROTHERS, I need help with your website: ${pageUrl}`;

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      type="button"
      onClick={openWhatsApp}
      aria-label="Chat with ADHYEY BROTHERS on WhatsApp"
      title="Need Help? Chat on WhatsApp"
      className="fixed bottom-5 right-4 z-40 flex min-h-12 items-center gap-2 rounded-full bg-[#25D366] px-3.5 py-3 text-sm font-bold text-white shadow-lg transition hover:scale-[1.03] hover:bg-[#1ebe5d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 sm:bottom-6 sm:right-6 sm:px-4"
    >
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        className="h-6 w-6 shrink-0 fill-current"
      >
        <path d="M16.04 3C8.86 3 3 8.73 3 15.78c0 2.25.6 4.45 1.74 6.38L3 28.5l6.55-1.7a13.2 13.2 0 0 0 6.48 1.68h.01C23.23 28.48 29 22.75 29 15.7 29 8.7 23.22 3 16.04 3Zm0 23.32a11 11 0 0 1-5.6-1.5l-.4-.23-3.89 1.01 1.04-3.72-.26-.39a10.49 10.49 0 0 1-1.67-5.71c0-5.86 4.84-10.62 10.8-10.62 5.94 0 10.77 4.75 10.77 10.58 0 5.84-4.84 10.58-10.79 10.58Zm5.93-7.93c-.32-.16-1.91-.92-2.21-1.03-.3-.1-.51-.15-.73.16-.21.31-.83 1.03-1.02 1.24-.19.21-.38.23-.7.08-.32-.16-1.36-.49-2.59-1.57-.96-.84-1.6-1.88-1.79-2.2-.19-.31-.02-.48.14-.64.15-.14.32-.36.49-.54.16-.18.21-.31.32-.52.11-.2.05-.39-.03-.54-.08-.16-.73-1.73-1-2.37-.26-.63-.53-.54-.73-.55h-.62c-.22 0-.57.08-.86.39-.3.31-1.13 1.08-1.13 2.64 0 1.55 1.16 3.06 1.32 3.27.16.21 2.28 3.42 5.53 4.8.77.32 1.38.52 1.85.67.78.24 1.48.21 2.04.13.62-.09 1.91-.77 2.18-1.51.27-.75.27-1.39.19-1.52-.08-.13-.3-.21-.62-.36Z" />
      </svg>
      <span className="hidden sm:inline">Need Help? Chat on WhatsApp</span>
      <span className="sm:hidden">Help</span>
    </button>
  );
}
