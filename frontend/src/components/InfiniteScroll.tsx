import React, { useEffect, useRef } from 'react';
import { Box, CircularProgress } from '@mui/material';

interface InfiniteScrollProps {
  loadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  children: React.ReactNode;
  root?: Element | null;
  threshold?: number;
}

const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  loadMore,
  hasMore,
  loading,
  children,
  root = null,
  threshold = 200,
}) => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(loadMore);
  const loadingRef = useRef(loading);
  const hasMoreRef = useRef(hasMore);

  useEffect(() => {
    loadMoreRef.current = loadMore;
    loadingRef.current = loading;
    hasMoreRef.current = hasMore;
  });

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current) {
          loadMoreRef.current();
        }
      },
      { root, rootMargin: `${threshold}px` }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [root, threshold]);

  return (
    <>
      {children}
      <Box
        ref={sentinelRef}
        data-testid="infinite-scroll-sentinel"
        sx={{ display: 'flex', justifyContent: 'center', py: 2, minHeight: 40 }}
      >
        {loading && hasMore && <CircularProgress size={24} />}
      </Box>
    </>
  );
};

export default InfiniteScroll;
