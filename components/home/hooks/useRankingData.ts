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

/**
 * 获取排行榜数据：按 contentType 懒加载，不再同时拉 movie + tv。
 * Detail 信息按需加载（仅 active 项），不再批量请求。
 */
export function useRankingData({ limit = 10 }: UseRankingDataOptions = {}) {
    const [movieRanking, setMovieRanking] = useState<RankingMovie[]>([]);
    const [tvRanking, setTvRanking] = useState<RankingMovie[]>([]);
    const [loading, setLoading] = useState(true);
    const movieFetchedRef = useRef(false);
    const tvFetchedRef = useRef(false);
    // 缓存已加载的详情，避免重复请求
    const detailCacheRef = useRef<Map<string, Partial<RankingMovie>>>(new Map());

    // 获取单个影片详情（带缓存）
    const fetchDetail = useCallback(async (movieId: string): Promise<Partial<RankingMovie> | null> => {
        if (detailCacheRef.current.has(movieId)) {
            return detailCacheRef.current.get(movieId)!;
        }
        try {
            const res = await fetch(`/api/douban/detail?id=${movieId}`);
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

        // 只在首次加载（两种类型都还没数据）时才显示全局 loading
        // 切换 tab 时另一种数据已有，不闪骨架屏
        const isInitialLoad = movieRanking.length === 0 && tvRanking.length === 0;
        if (isInitialLoad) setLoading(true);

        try {
            const res = await fetch(
                `/api/douban/recommend?type=${type}&tag=${encodeURIComponent('热门')}&page_limit=${limit}&page_start=0`
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
        } catch (error) {
            console.error(`获取${type}排行榜失败:`, error);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, [limit, movieRanking.length, tvRanking.length]);

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

    // 首次只加载电影排行榜（TV 在切换 tab 时由外部调用 fetchType('tv')）
    useEffect(() => {
        fetchType('movie');
    }, [fetchType]);

    return {
        movieRanking,
        tvRanking,
        loading,
        /** 触发某个类型排行榜的加载（TV tab 切换时调用） */
        fetchType,
        /** 按需加载某部影片的详情 */
        enrichMovie,
    };
}
