import React, { useEffect, useRef, memo } from 'react';
import { Box, CircularProgress } from '@mui/material';

interface InfiniteScrollProps {
  loadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  root?: Element | null;
  threshold?: number;
}

/**
 * A more stable InfiniteScroll component that uses IntersectionObserver.
 * It uses refs to avoid unnecessary re-subscriptions when loading state changes.
 */
const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  loadMore,
  hasMore,
  loading,
  root = null,
  threshold = 100,
}) => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  
  // Keep values in refs to avoid re-creating the observer
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
      { 
        root, 
        rootMargin: `0px 0px ${threshold}px 0px`,
        threshold: 0.1
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [root, threshold]);

  return (
    <Box
      ref={sentinelRef}
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        py: 3, 
        minHeight: 60,
        width: '100%',
        visibility: hasMore ? 'visible' : 'hidden'
      }}
    >
      {loading && <CircularProgress size={24} thickness={4} color="primary" />}
    </Box>
  );
};

export default memo(InfiniteScroll);
