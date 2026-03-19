import { useState, useEffect, useCallback, useRef } from 'react';

interface DoubanMovie {
    id: string;
    title: string;
    cover: string;
    rate: string;
    url: string;
}

const PAGE_SIZE = 20;

export function usePopularMovies(selectedTag: string, tags: any[], contentType: 'movie' | 'tv' = 'movie') {
    const [movies, setMovies] = useState<DoubanMovie[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const abortRef = useRef<AbortController | null>(null);

    // 解析标签值
    const resolveTagValue = useCallback((tag: string) => {
        if (!tags.length) return '热门'; // tags 还没加载时用默认值
        const matched = tags.find((t: any) => t.id === tag) || tags.find((t: any) => t.value === tag);
        return matched?.value || '热门';
    }, [tags]);

    // 加载指定页
    const loadPage = useCallback(async (tag: string, pageNum: number, signal?: AbortSignal) => {
        setLoading(true);
        try {
            const tagValue = resolveTagValue(tag);

            // 创建超时控制器 (12 秒)
            const timeoutController = new AbortController();
            const timer = setTimeout(() => timeoutController.abort(), 12000);

            // 合并外部 signal 和超时 signal
            const combinedSignal = signal
                ? (AbortSignal as any).any
                    ? (AbortSignal as any).any([signal, timeoutController.signal])
                    : timeoutController.signal  // 降级：只用超时信号
                : timeoutController.signal;

            const response = await fetch(
                `/api/douban/recommend?type=${contentType}&tag=${encodeURIComponent(tagValue)}&page_limit=${PAGE_SIZE}&page_start=${pageNum * PAGE_SIZE}`,
                { signal: combinedSignal }
            );

            clearTimeout(timer);

            if (!response.ok) throw new Error('Failed to fetch');

            const data = await response.json();
            const newMovies = data.subjects || [];

            if (!signal?.aborted) {
                setMovies(newMovies);
                setHasMore(newMovies.length === PAGE_SIZE);
                setLoading(false);
            }
        } catch (error: any) {
            if (signal?.aborted) return;
            console.error('加载失败:', error);
            setHasMore(false);
            setLoading(false);
        }
    }, [resolveTagValue, contentType]);

    // 标签或类型变化时回到第 1 页
    useEffect(() => {
        // tags 未加载也发请求（用默认值 '热门'），避免卡住
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setPage(0);
        setMovies([]);
        setHasMore(true);
        loadPage(selectedTag, 0, controller.signal);

        return () => controller.abort();
    }, [selectedTag, contentType, tags.length]); // tags.length 变化时重新请求

    // 翻页
    const goToPage = useCallback((newPage: number) => {
        if (newPage < 0) return;
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setPage(newPage);
        loadPage(selectedTag, newPage, controller.signal);

        // 翻页后滚动到影片网格顶部
        setTimeout(() => {
            const grid = document.getElementById('movie-grid-top');
            if (grid) {
                grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    }, [selectedTag, loadPage]);

    return {
        movies,
        loading,
        page,
        hasMore,
        goToPage,
    };
}
