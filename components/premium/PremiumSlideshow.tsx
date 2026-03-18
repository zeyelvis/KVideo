'use client';

/**
 * PremiumSlideshow — 午夜版首页幻灯片推荐
 * 从最新内容中取前 5 张有封面的影片，自动轮播
 * 图片直接用采集站外链，不经过 Cloudflare 代理
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

interface SlideItem {
    vod_id: string | number;
    vod_name: string;
    vod_pic: string;
    vod_remarks?: string;
    type_name?: string;
    source: string;
}

interface PremiumSlideshowProps {
    onSearch?: (query: string) => void;
}

export function PremiumSlideshow({ onSearch }: PremiumSlideshowProps) {
    const [slides, setSlides] = useState<SlideItem[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [imgLoaded, setImgLoaded] = useState<Record<number, boolean>>({});
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [isPaused, setIsPaused] = useState(false);

    // 获取推荐数据
    const fetchedRef = useRef(false);

    const fetchSlides = useCallback(async () => {
        try {
            // 从设置中获取 premium sources
            const { settingsStore } = await import('@/lib/store/settings-store');
            const settings = settingsStore.getSettings();
            const premiumSources = [
                ...settings.premiumSources,
                ...settings.subscriptions.filter((s: any) => s.group === 'premium')
            ].filter((s: any) => s.enabled !== false);

            if (premiumSources.length === 0) {
                // 源还没加载，不设为 loading=false，等待 settings 更新后重试
                return;
            }

            const response = await fetch('/api/premium/category', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sources: premiumSources,
                    category: '',
                    page: '1',
                    limit: '30'
                })
            });

            if (!response.ok) throw new Error('fetch failed');
            const data = await response.json();
            const videos = data.videos || [];

            // 筛选有封面图的影片，取前 5 个
            const withCover = videos.filter((v: any) => v.vod_pic && v.vod_pic.startsWith('http'));
            fetchedRef.current = true;
            setSlides(withCover.slice(0, 5));
            setLoading(false);
        } catch {
            setLoading(false);
        }
    }, []);

    // 首次加载
    useEffect(() => {
        fetchSlides();
    }, [fetchSlides]);

    // 订阅设置变化，源异步加载完成后自动重试
    useEffect(() => {
        let cancelled = false;

        const initSubscription = async () => {
            const { settingsStore } = await import('@/lib/store/settings-store');
            const unsubscribe = settingsStore.subscribe(() => {
                if (cancelled || fetchedRef.current) return;
                fetchSlides();
            });
            return unsubscribe;
        };

        let unsubFn: (() => void) | undefined;
        initSubscription().then(unsub => {
            if (cancelled) {
                unsub();
            } else {
                unsubFn = unsub;
            }
        });

        return () => {
            cancelled = true;
            unsubFn?.();
        };
    }, [fetchSlides]);

    // 自动轮播
    useEffect(() => {
        if (slides.length <= 1 || isPaused) return;

        timerRef.current = setInterval(() => {
            setActiveIndex(prev => (prev + 1) % slides.length);
        }, 5000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [slides.length, isPaused]);

    const goTo = useCallback((index: number) => {
        setActiveIndex(index);
        // 重置自动播放定时器
        if (timerRef.current) clearInterval(timerRef.current);
    }, []);

    const goPrev = () => goTo((activeIndex - 1 + slides.length) % slides.length);
    const goNext = () => goTo((activeIndex + 1) % slides.length);

    const handleClick = (slide: SlideItem) => {
        onSearch?.(slide.vod_name);
    };

    // 骨架屏
    if (loading) {
        return (
            <div className="relative w-full aspect-[21/9] md:aspect-[3/1] rounded-[var(--radius-2xl)] overflow-hidden mb-8">
                <div className="absolute inset-0 slideshow-skeleton skeleton-shimmer" />
                <div className="absolute bottom-8 left-8 space-y-3">
                    <div className="h-8 w-64 skeleton-shimmer rounded-lg" />
                    <div className="h-5 w-40 skeleton-shimmer rounded-lg" style={{ animationDelay: '0.1s' }} />
                </div>
            </div>
        );
    }

    if (slides.length === 0) return null;

    const current = slides[activeIndex];

    return (
        <div
            className="relative w-full aspect-[21/9] md:aspect-[3/1] rounded-[var(--radius-2xl)] overflow-hidden mb-8 group cursor-pointer"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onClick={() => handleClick(current)}
        >
            {/* 背景图 */}
            {slides.map((slide, i) => (
                <div
                    key={`${slide.source}-${slide.vod_id}`}
                    className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                    style={{ opacity: i === activeIndex ? 1 : 0 }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={slide.vod_pic}
                        alt={slide.vod_name}
                        className="w-full h-full object-cover"
                        loading={i === 0 ? 'eager' : 'lazy'}
                        onLoad={() => setImgLoaded(prev => ({ ...prev, [i]: true }))}
                        onError={(e) => {
                            // 图片加载失败时显示渐变底色
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                    {/* 渐变遮罩 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
                </div>
            ))}

            {/* 内容信息 */}
            <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 right-20 z-10">
                <div className="flex items-center gap-2 mb-2">
                    {current.vod_remarks && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-[var(--accent-color)] text-white rounded-full">
                            {current.vod_remarks}
                        </span>
                    )}
                    {current.type_name && (
                        <span className="px-2 py-0.5 text-xs text-white/70 bg-white/10 rounded-full backdrop-blur-sm">
                            {current.type_name}
                        </span>
                    )}
                </div>
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white line-clamp-1 mb-3">
                    {current.vod_name}
                </h2>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleClick(current);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-color)] hover:brightness-110 text-white font-semibold rounded-full transition-all duration-200 hover:translate-y-[-1px] shadow-lg"
                >
                    <Play size={18} fill="white" />
                    立即播放
                </button>
            </div>

            {/* 左右箭头 */}
            {slides.length > 1 && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); goPrev(); }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/60 backdrop-blur-sm"
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); goNext(); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/60 backdrop-blur-sm"
                    >
                        <ChevronRight size={22} />
                    </button>
                </>
            )}

            {/* 指示器 */}
            {slides.length > 1 && (
                <div className="absolute bottom-3 right-6 z-20 flex gap-1.5">
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            onClick={(e) => { e.stopPropagation(); goTo(i); }}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                i === activeIndex
                                    ? 'w-6 bg-[var(--accent-color)]'
                                    : 'w-1.5 bg-white/40 hover:bg-white/60'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
