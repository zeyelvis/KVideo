import { useState, useEffect, useCallback, useRef } from 'react';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { settingsStore } from '@/lib/store/settings-store';

interface PremiumVideo {
    vod_id: string | number;
    vod_name: string;
    vod_pic?: string;
    vod_remarks?: string;
    type_name?: string;
    source: string;
}

const PAGE_LIMIT = 20;

export function usePremiumContent(categoryValue: string) {
    const [videos, setVideos] = useState<PremiumVideo[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);

    // 用 ref 追踪 loading 状态，避免 useCallback 依赖 loading 导致死循环
    const loadingRef = useRef(false);
    const categoryRef = useRef(categoryValue);
    categoryRef.current = categoryValue;

    const loadVideos = useCallback(async (pageNum: number, append = false) => {
        if (loadingRef.current) return;

        loadingRef.current = true;
        setLoading(true);
        try {
            // 获取 premium 源
            const settings = settingsStore.getSettings();
            const premiumSources = [
                ...settings.premiumSources,
                ...settings.subscriptions.filter(s => (s as any).group === 'premium')
            ].filter(s => (s as any).enabled !== false);

            if (premiumSources.length === 0) {
                // 源还没加载，不算错，保持 hasMore 以便重试
                return;
            }

            const response = await fetch('/api/premium/category', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sources: premiumSources,
                    category: categoryRef.current,
                    page: pageNum.toString(),
                    limit: PAGE_LIMIT.toString()
                })
            });

            if (!response.ok) throw new Error('Failed to fetch');

            const data = await response.json();
            const newVideos = data.videos || [];

            setVideos(prev => append ? [...prev, ...newVideos] : newVideos);
            setHasMore(newVideos.length >= PAGE_LIMIT);
        } catch (error) {
            console.error('Failed to load videos:', error);
            setHasMore(false);
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }, []); // 不依赖 loading 和 categoryValue，用 ref 代替

    // 分类变化时重置并重新加载
    useEffect(() => {
        setPage(1);
        setVideos([]);
        setHasMore(true);
        loadVideos(1, false);
    }, [categoryValue, loadVideos]);

    // 订阅设置变化，源异步加载完成后自动重试
    useEffect(() => {
        const handleSettingsUpdate = () => {
            const settings = settingsStore.getSettings();
            const premiumSources = [
                ...settings.premiumSources,
                ...settings.subscriptions.filter(s => (s as any).group === 'premium')
            ].filter(s => (s as any).enabled !== false);

            // 如果当前没有视频且有可用源且未在加载，自动重试
            if (premiumSources.length > 0 && !loadingRef.current) {
                // 获取当前状态判断是否需要重新加载
                setVideos(currentVideos => {
                    if (currentVideos.length === 0) {
                        // 用 setTimeout 避免在 setState 回调中执行异步操作
                        setTimeout(() => loadVideos(1, false), 0);
                    }
                    return currentVideos;
                });
            }
        };

        const unsubscribe = settingsStore.subscribe(handleSettingsUpdate);
        return () => unsubscribe();
    }, [loadVideos]);

    const { prefetchRef, loadMoreRef } = useInfiniteScroll({
        hasMore,
        loading,
        page,
        onLoadMore: (nextPage) => {
            setPage(nextPage);
            loadVideos(nextPage, true);
        },
    });

    return {
        videos,
        loading,
        hasMore,
        prefetchRef,
        loadMoreRef,
    };
}
