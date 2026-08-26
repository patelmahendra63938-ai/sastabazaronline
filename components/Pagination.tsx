import Link from 'next/link';

interface PaginationProps {
  pathname: string;
  searchParams: Record<string, string | undefined>;
  currentPage: number;
  pageSize: number;
  totalCount: number;
}

function pageHref(
  pathname: string,
  searchParams: Record<string, string | undefined>,
  page: number
) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value !== undefined && key !== 'page') {
      params.set(key, value);
    }
  });

  if (page > 1) {
    params.set('page', String(page));
  }

  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

export default function Pagination({
  pathname,
  searchParams,
  currentPage,
  pageSize,
  totalCount,
}: PaginationProps) {
  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / pageSize)
  );

  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  if (totalCount <= pageSize && currentPage === 1) {
    return null;
  }

  const sharedClass =
    'inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7aa5b] focus-visible:ring-offset-2';

  return (
    <nav
      aria-label="Product results pagination"
      className="mt-8 flex flex-wrap items-center justify-center gap-3"
    >
      {hasPrevious ? (
        <Link
          href={pageHref(
            pathname,
            searchParams,
            currentPage - 1
          )}
          scroll={false}
          className={`${sharedClass} border border-[#d7aa5b] bg-[#fffdf9] text-[#741f23] hover:bg-[#fff2dc] hover:border-[#b5843d]`}
        >
          Previous
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={`${sharedClass} cursor-not-allowed border border-stone-200 bg-stone-100 text-stone-400`}
        >
          Previous
        </span>
      )}

      <span
        className="min-w-28 text-center text-xs font-bold text-stone-600"
        aria-live="polite"
      >
        Page {currentPage} of {totalPages}
      </span>

      {hasNext ? (
        <Link
          href={pageHref(
            pathname,
            searchParams,
            currentPage + 1
          )}
          scroll={false}
          className={`${sharedClass} bg-[#741f23] text-white shadow-sm hover:bg-[#5e171b]`}
        >
          Next
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={`${sharedClass} cursor-not-allowed bg-stone-200 text-stone-400`}
        >
          Next
        </span>
      )}
    </nav>
  );
}