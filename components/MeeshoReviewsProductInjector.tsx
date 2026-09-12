'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import MeeshoReviewsPreview from '@/components/MeeshoReviewsPreview';

export default function MeeshoReviewsProductInjector({ productId }: { productId: string }) {
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const placeReviews = () => {
      if (cancelled) return;

      const headings = Array.from(document.querySelectorAll('h3'));
      const specsHeading = headings.find((heading) =>
        heading.textContent?.toLowerCase().includes('product specifications')
      );

      const specsCard = specsHeading?.closest('div.mt-10');
      if (!specsCard || !specsCard.parentElement) return false;

      let node = document.getElementById('meesho-reviews-product-mount');
      if (!node) {
        node = document.createElement('div');
        node.id = 'meesho-reviews-product-mount';
        specsCard.insertAdjacentElement('afterend', node);
      }

      setMountNode(node);
      return true;
    };

    if (placeReviews()) return () => { cancelled = true; };

    const observer = new MutationObserver(() => {
      if (placeReviews()) observer.disconnect();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => observer.disconnect(), 8000);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, []);

  if (!mountNode) return null;
  return createPortal(<MeeshoReviewsPreview productId={productId} />, mountNode);
}
