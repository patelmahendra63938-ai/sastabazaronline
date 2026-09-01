# Product SSR indexing test

Branch: `seo/product-ssr-indexing`

## Goal
Ensure `/product/[id]` sends real product content in the initial Next.js HTML instead of waiting for the browser-side Supabase fetch.

## Implementation
- `app/product/[id]/page.tsx` is now a Server Component.
- The server fetches the product record before rendering.
- The existing interactive product UI is preserved in `ProductPageClient.tsx` and receives `initialProduct`.
- Client-side inventory, offers, wishlist, pincode, similar-products and other interactive behavior continues after hydration.
- The route is request-time dynamic (`force-dynamic`, `revalidate = 0`) so admin catalog updates do not require a rebuild.

## Build verification
Vercel production build for commit `c9ca90b16e6d41082465e9ad54ba9e1be3c6bf1b` completed successfully. The Next.js route table reports `/product/[id]` as `ƒ` (Dynamic / server-rendered on demand).

## Production safety
This branch is not merged into `main`; the live production site is unchanged until explicit approval and merge.
