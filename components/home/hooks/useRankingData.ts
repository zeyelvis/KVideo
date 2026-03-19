'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface RankingMovie {
    id: string;
    title: string;
    cover: string;
    rate: string;
    url: string;
    // 详情字段（按需加载）
    description?: string;
    directors?: string[];
    actors?: string[];
    year?: string;
    types?: string[];
    region?: string[];
}

interface UseRankingDataOptions {
    limit?: number;
}

// 带超时的 fetch
function fetchWithTimeout(url: string, timeoutMs: number = 12000): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * 获取排行榜数据：按 contentType 懒加载，不再同时拉 movie + tv。
 * Detail 信息按需加载（仅 active 项），不再批量请求。
 *
 * 修复: 添加超时 + 错误状态 + 强制加载兜底
 */
export function useRankingData({ limit = 10 }: UseRankingDataOptions = {}) {
    const [movieRanking, setMovieRanking] = useState<RankingMovie[]>([]);
    const [tvRanking, setTvRanking] = useState<RankingMovie[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const movieFetchedRef = useRef(false);
    const tvFetchedRef = useRef(false);
    // 用 ref 独立追踪加载状态，避免闭包捕获陈旧值
    const loadingRef = useRef(true);
    // 缓存已加载的详情，避免重复请求
    const detailCacheRef = useRef<Map<string, Partial<RankingMovie>>>(new Map());

    // 获取单个影片详情（带缓存）
    const fetchDetail = useCallback(async (movieId: string): Promise<Partial<RankingMovie> | null> => {
        if (detailCacheRef.current.has(movieId)) {
            return detailCacheRef.current.get(movieId)!;
        }
        try {
            const res = await fetchWithTimeout(`/api/douban/detail?id=${movieId}`, 8000);
            if (!res.ok) return null;
            const detail = await res.json();
            const enriched = {
                description: detail.description || '',
                directors: detail.directors || [],
                actors: detail.actors || [],
                year: detail.year || '',
                types: detail.types || [],
                region: detail.region || [],
            };
            detailCacheRef.current.set(movieId, enriched);
            return enriched;
        } catch {
            return null;
        }
    }, []);

    // 获取某个类型的排行榜
    const fetchType = useCallback(async (type: 'movie' | 'tv') => {
        const fetchedRef = type === 'movie' ? movieFetchedRef : tvFetchedRef;
        if (fetchedRef.current) return;
        fetchedRef.current = true;

        // 用 ref 判断是否需要设置全局 loading，避免闭包陈旧问题
        const shouldShowLoading = loadingRef.current;
        if (shouldShowLoading) {
            setLoading(true);
            setError(null);
        }

        try {
            const res = await fetchWithTimeout(
                `/api/douban/recommend?type=${type}&tag=${encodeURIComponent('热门')}&page_limit=${limit}&page_start=0`,
                12000 // 12 秒超时
            );
            const data = res.ok ? await res.json() : { subjects: [] };
            const sortByRate = (a: RankingMovie, b: RankingMovie) =>
                parseFloat(b.rate || '0') - parseFloat(a.rate || '0');
            const sorted = (data.subjects || []).sort(sortByRate).slice(0, limit);

            if (type === 'movie') {
                setMovieRanking(sorted);
            } else {
                setTvRanking(sorted);
            }
            setError(null);
        } catch (err: any) {
            const isTimeout = err?.name === 'AbortError';
            const message = isTimeout ? '加载超时，请重试' : '加载失败，请检查网络';
            console.error(`获取${type}排行榜失败:`, err);
            // 只在首次加载失败时设置全局错误
            if (shouldShowLoading) {
                setError(message);
            }
        } finally {
            if (shouldShowLoading) {
                setLoading(false);
                loadingRef.current = false;
            }
        }
    }, [limit]);

    /**
     * 按需加载某部影片的详情并更新排行榜数据。
     * 由组件在 hover/选中时调用，不再批量请求。
     */
    const enrichMovie = useCallback(async (movieId: string, type: 'movie' | 'tv') => {
        const detail = await fetchDetail(movieId);
        if (!detail) return;

        const updater = (prev: RankingMovie[]) =>
            prev.map(m => m.id === movieId ? { ...m, ...detail } : m);

        if (type === 'movie') {
            setMovieRanking(updater);
        } else {
            setTvRanking(updater);
        }
    }, [fetchDetail]);

    // 重试：重置标记并重新请求
    const retry = useCallback(() => {
        movieFetchedRef.current = false;
        tvFetchedRef.current = false;
        loadingRef.current = true;
        setLoading(true);
        setError(null);
        setMovieRanking([]);
        setTvRanking([]);
        fetchType('movie');
    }, [fetchType]);

    // 首次只加载电影排行榜（TV 在切换 tab 时由外部调用 fetchType('tv')）
    useEffect(() => {
        fetchType('movie');
    }, [fetchType]);

    // 兜底：15 秒后如果还在 loading 就强制结束
    useEffect(() => {
        if (!loading) return;
        const timer = setTimeout(() => {
            if (loadingRef.current) {
                loadingRef.current = false;
                setLoading(false);
                setError('加载超时，请重试');
            }
        }, 15000);
        return () => clearTimeout(timer);
    }, [loading]);

    return {
        movieRanking,
        tvRanking,
        loading,
        error,
        /** 触发某个类型排行榜的加载（TV tab 切换时调用） */
        fetchType,
        /** 按需加载某部影片的详情 */
        enrichMovie,
        /** 重试加载 */
        retry,
    };
}
