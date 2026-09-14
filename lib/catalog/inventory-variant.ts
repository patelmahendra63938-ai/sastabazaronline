export type ParsedInventoryVariant = {
  size: string;
  colour: string;
};

const NORMALIZED_GENERIC_SIZES = new Set(['STANDARD', 'FREE SIZE', 'ONE SIZE']);

function clean(value: unknown) {
  return String(value ?? '').trim();
}

export function normalizeColours(colours: unknown): string[] {
  if (!Array.isArray(colours)) return [];
  const seen = new Set<string>();
  const output: string[] = [];
  for (const raw of colours) {
    const value = clean(raw);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(value);
  }
  return output;
}

export function parseInventoryVariant(label: unknown, productColours: unknown): ParsedInventoryVariant {
  const raw = clean(label) || 'Standard';
  const colours = normalizeColours(productColours);
  const exactColour = colours.find((colour) => colour.toLowerCase() === raw.toLowerCase());
  if (exactColour) return { size: 'Standard', colour: exactColour };

  for (const colour of colours) {
    const suffix = ` / ${colour}`;
    if (raw.toLowerCase().endsWith(suffix.toLowerCase())) {
      const size = raw.slice(0, raw.length - suffix.length).trim() || 'Standard';
      return { size, colour };
    }
  }

  return { size: raw, colour: '' };
}

export function buildInventoryVariantLabel(size: unknown, colour: unknown): string {
  const cleanSize = clean(size) || 'Standard';
  const cleanColour = clean(colour);
  if (!cleanColour) return cleanSize;
  if (NORMALIZED_GENERIC_SIZES.has(cleanSize.toUpperCase())) return cleanColour;
  return `${cleanSize} / ${cleanColour}`;
}

export function inventoryVariantDisplay(label: unknown, productColours: unknown) {
  const parsed = parseInventoryVariant(label, productColours);
  return {
    ...parsed,
    label: parsed.colour ? `${parsed.size} • ${parsed.colour}` : parsed.size,
  };
}
