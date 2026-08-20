import Link from 'next/link';

interface PaginationProps {
  pathname: string;
  searchParams: Record<string, string | undefined>;
  currentPage: number;
  pageSize: number;
  totalCount: number;
}

function pageHref(pathname: string, searchParams: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value !== undefined && key !== 'page') params.set(key, value);
  });
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function Pagination({ pathname, searchParams, currentPage, pageSize, totalCount }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  if (totalCount <= pageSize && currentPage === 1) return null;

  const sharedClass = 'inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-xs font-bold';

  return (
    <nav aria-label="Product results pagination" className="mt-8 flex flex-wrap items-center justify-center gap-3">
      {hasPrevious ? (
        <Link href={pageHref(pathname, searchParams, currentPage - 1)} scroll={false} className={`${sharedClass} border border-indigo-200 bg-white text-indigo-950 hover:border-indigo-400`}>
          Previous
        </Link>
      ) : (
        <span aria-disabled="true" className={`${sharedClass} cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400`}>
          Previous
        </span>
      )}

      <span className="min-w-28 text-center text-xs font-bold text-gray-600" aria-live="polite">
        Page {currentPage} of {totalPages}
      </span>

      {hasNext ? (
        <Link href={pageHref(pathname, searchParams, currentPage + 1)} scroll={false} className={`${sharedClass} bg-indigo-950 text-white hover:bg-indigo-900`}>
          Next
        </Link>
      ) : (
        <span aria-disabled="true" className={`${sharedClass} cursor-not-allowed bg-gray-200 text-gray-400`}>
          Next
        </span>
      )}
    </nav>
  );
}
