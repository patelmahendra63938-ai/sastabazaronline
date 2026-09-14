'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type ColourProduct = {
  id: string;
  colour_selection_mode?: string | null;
  available_colours?: string[] | null;
};

function cleanColours(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const output: string[] = [];
  for (const raw of value) {
    const colour = String(raw || '').trim();
    if (!colour) continue;
    const key = colour.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(colour);
  }
  return output;
}

function containsKnownColour(label: string, colours: string[]) {
  const normalized = String(label || '').trim().toLowerCase();
  return colours.some((colour) => {
    const value = colour.toLowerCase();
    return normalized === value || normalized.endsWith(` / ${value}`);
  });
}

export default function ProductColourPurchaseBridge({
  product,
  children,
}: {
  product: ColourProduct | null;
  children: React.ReactNode;
}) {
  const colours = useMemo(() => cleanColours(product?.available_colours), [product?.available_colours]);
  const enabled = product?.colour_selection_mode === 'customer' && colours.length > 0;
  const [selectedColour, setSelectedColour] = useState(colours[0] || '');
  const selectedColourRef = useRef(selectedColour);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    selectedColourRef.current = selectedColour;
  }, [selectedColour]);

  useEffect(() => {
    if (enabled && colours.length && !colours.includes(selectedColour)) {
      setSelectedColour(colours[0]);
    }
  }, [enabled, colours, selectedColour]);

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;
    let observer: MutationObserver | null = null;

    const attach = () => {
      const labels = Array.from(document.querySelectorAll('label'));
      const variantLabel = labels.find((label) => /select variant\s*\/\s*size/i.test(label.textContent || ''));
      const variantBlock = variantLabel?.parentElement?.parentElement;
      if (!variantBlock?.parentElement) return false;

      let host = document.getElementById('product-colour-selector-host');
      if (!host) {
        host = document.createElement('div');
        host.id = 'product-colour-selector-host';
        variantBlock.parentElement.insertBefore(host, variantBlock);
      }
      setMountNode(host);
      return true;
    };

    if (!attach()) {
      observer = new MutationObserver(() => {
        if (attach()) observer?.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
      setMountNode(null);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !product?.id) return;

    const syncSelectedColour = () => {
      try {
        const colour = selectedColourRef.current;
        if (!colour) return;
        const raw = localStorage.getItem('sastabazar_cart');
        const cart = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(cart)) return;

        let changed = false;
        for (let index = cart.length - 1; index >= 0; index -= 1) {
          const item = cart[index];
          const itemProductId = item?.product_id || item?.id;
          if (itemProductId !== product.id) continue;
          const currentOption = String(item?.size || 'Standard').trim() || 'Standard';
          if (containsKnownColour(currentOption, colours)) continue;
          item.size = `${currentOption} / ${colour}`;
          item.selected_colour = colour;
          changed = true;
          break;
        }

        if (!changed) return;

        const merged: any[] = [];
        for (const item of cart) {
          const itemId = item?.product_id || item?.id;
          const itemOption = String(item?.size || '');
          const existing = merged.find((candidate) => {
            const candidateId = candidate?.product_id || candidate?.id;
            return candidateId === itemId && String(candidate?.size || '') === itemOption;
          });
          if (existing) {
            existing.quantity = Number(existing.quantity || 0) + Number(item.quantity || 0);
          } else {
            merged.push(item);
          }
        }

        localStorage.setItem('sastabazar_cart', JSON.stringify(merged));
      } catch (error) {
        console.error('Colour option could not be synchronized with the cart:', error);
      }
    };

    window.addEventListener('cartUpdated', syncSelectedColour);
    return () => window.removeEventListener('cartUpdated', syncSelectedColour);
  }, [enabled, colours, product?.id]);

  const selector = enabled ? (
    <div className="mb-3 space-y-2 rounded-xl border border-[#ead8b8] bg-[#fffdf9] p-3 md:p-4">
      <div className="flex items-center justify-between gap-3">
        <label className="text-[11px] font-bold uppercase tracking-wider text-gray-800 md:text-xs">Select Colour:</label>
        <span className="text-[10px] font-bold text-[#741f23] md:text-[11px]">{selectedColour}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {colours.map((colour) => {
          const active = selectedColour === colour;
          return (
            <button
              key={colour}
              type="button"
              onClick={() => setSelectedColour(colour)}
              aria-pressed={active}
              className={`min-w-[64px] rounded-xl border px-3 py-2 text-xs font-bold transition ${active ? 'border-[#741f23] bg-[#741f23] text-white shadow-sm ring-2 ring-[#741f23]/15' : 'border-[#ead8b8] bg-white text-gray-800 hover:border-[#b5843d]'}`}
            >
              {colour}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <>
      {children}
      {mountNode && selector ? createPortal(selector, mountNode) : null}
    </>
  );
}
