import { useState, useEffect, useCallback, useRef } from 'react';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';

interface DoubanMovie {
    id: string;
    title: string;
    cover: string;
    rate: string;
    url: string;
}

const PAGE_LIMIT = 20;

export function usePopularMovies(selectedTag: string, tags: any[], contentType: 'movie' | 'tv' = 'movie') {
    const [movies, setMovies] = useState<DoubanMovie[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const abortRef = useRef<AbortController | null>(null);

    // 解析标签值：兼容 id 和 value 两种格式
    const resolveTagValue = useCallback((tag: string) => {
        if (!tags.length) return '热门';
        const matched = tags.find((t: any) => t.id === tag) || tags.find((t: any) => t.value === tag);
        return matched?.value || '热门';
    }, [tags]);

    // 加载内容（支持取消）
    const loadMovies = useCallback(async (tag: string, pageStart: number, append = false, signal?: AbortSignal) => {
        setLoading(true);
        try {
            const tagValue = resolveTagValue(tag);
            const response = await fetch(
                `/api/douban/recommend?type=${contentType}&tag=${encodeURIComponent(tagValue)}&page_limit=${PAGE_LIMIT}&page_start=${pageStart}`,
                { signal }
            );

            if (!response.ok) throw new Error('Failed to fetch');

            const data = await response.json();
            const newMovies = data.subjects || [];

            if (!signal?.aborted) {
                setMovies(prev => append ? [...prev, ...newMovies] : newMovies);
                setHasMore(newMovies.length === PAGE_LIMIT);
                setLoading(false);
            }
        } catch (error) {
            if (signal?.aborted) return; // 被取消了，不处理
            console.error('Failed to load movies:', error);
            setHasMore(false);
            setLoading(false);
        }
    }, [resolveTagValue, contentType]);

    // 核心 effect：当 selectedTag、contentType 或 tags 变化时重新加载
    useEffect(() => {
        if (tags.length === 0) return; // tags 还没加载

        // 取消上一次未完成的请求
        if (abortRef.current) {
            abortRef.current.abort();
        }
        const controller = new AbortController();
        abortRef.current = controller;

        setPage(0);
        setMovies([]);
        setHasMore(true);
        loadMovies(selectedTag, 0, false, controller.signal);

        return () => {
            controller.abort();
        };
    }, [selectedTag, contentType, tags]); // eslint-disable-line react-hooks/exhaustive-deps

    const { prefetchRef, loadMoreRef } = useInfiniteScroll({
        hasMore,
        loading,
        page,
        onLoadMore: (nextPage) => {
            setPage(nextPage);
            loadMovies(selectedTag, nextPage * PAGE_LIMIT, true);
        },
    });

    return {
        movies,
        loading,
        hasMore,
        prefetchRef,
        loadMoreRef,
    };
}
