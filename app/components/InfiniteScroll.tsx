'use client';

import { useEffect, useRef, memo } from 'react';
import { Box, CircularProgress } from '@mui/material';

interface InfiniteScrollProps {
  loadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  root?: Element | null;
  threshold?: number;
}

const InfiniteScroll = memo<InfiniteScrollProps>(({
  loadMore,
  hasMore,
  loading,
  root = null,
  threshold = 100,
}) => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(loadMore);
  const canLoadRef = useRef(hasMore && !loading);

  useEffect(() => {
    loadMoreRef.current = loadMore;
    canLoadRef.current = hasMore && !loading;
  }, [loadMore, hasMore, loading]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && canLoadRef.current) {
          loadMoreRef.current();
        }
      },
      { root, rootMargin: `0px 0px ${threshold}px 0px`, threshold: 0.1 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [root, threshold]);

  return (
    <Box ref={sentinelRef} sx={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      py: 3, minHeight: 60, width: '100%',
      visibility: hasMore ? 'visible' : 'hidden'
    }}>
      {loading && <CircularProgress size={24} thickness={4} color="primary" />}
    </Box>
  );
});

InfiniteScroll.displayName = 'InfiniteScroll';
export default InfiniteScroll;
