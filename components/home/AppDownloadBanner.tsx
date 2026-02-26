'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type DetectedPlatform = 'ios' | 'android' | 'macos' | null;

const DISMISS_KEY = 'theone58-download-dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 天不再提示
const SHOW_DELAY = 5000; // 延迟 5 秒显示
const MIN_VISITS_TO_SHOW = 2; // 至少访问 2 次才显示
const VISIT_COUNT_KEY = 'theone58-visit-count';

function detectMobilePlatform(): DetectedPlatform {
    if (typeof window === 'undefined') return null;
    const ua = navigator.userAgent.toLowerCase();
    // 已经是 PWA/standalone 模式则不显示
    if (window.matchMedia('(display-mode: standalone)').matches) return null;
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (/android/.test(ua)) return 'android';
    if (/macintosh|mac os/.test(ua)) return 'macos';
    return null;
}

// 根据设备和时间段给出不同的提示语
function getSmartMessage(platform: DetectedPlatform): { title: string; subtitle: string } {
    const hour = new Date().getHours();
    const isNight = hour >= 20 || hour < 6;
    const isEvening = hour >= 17 && hour < 20;

    const contextHint = isNight
        ? '夜间追剧更舒适'
        : isEvening
            ? '下班时间，来一部好片'
            : '随时随地享受观影';

    switch (platform) {
        case 'ios':
            return {
                title: '📱 更适合 iPhone 的观影体验',
                subtitle: `客户端更流畅 · ${contextHint}`,
            };
        case 'android':
            return {
                title: '🤖 Android 客户端已上线',
                subtitle: `离线缓存 · 后台播放 · ${contextHint}`,
            };
        case 'macos':
            return {
                title: '💻 Mac 桌面版更沉浸',
                subtitle: `独立窗口 · 画中画 · ${contextHint}`,
            };
        default:
            return {
                title: '下载客户端',
                subtitle: contextHint,
            };
    }
}

const platformAction: Record<string, string> = {
    ios: '获取 iOS 版',
    android: '获取 Android 版',
    macos: '获取桌面版',
};

export function AppDownloadBanner() {
    const [platform, setPlatform] = useState<DetectedPlatform>(null);
    const [visible, setVisible] = useState(false);
    const [show, setShow] = useState(false);

    useEffect(() => {
        // 累计访问次数
        const visits = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10) + 1;
        localStorage.setItem(VISIT_COUNT_KEY, String(visits));

        // 检查是否在 7 天内关闭过
        const dismissedAt = localStorage.getItem(DISMISS_KEY);
        if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < DISMISS_DURATION) {
            return;
        }

        // 至少第 2 次访问才弹出
        if (visits < MIN_VISITS_TO_SHOW) return;

        const detected = detectMobilePlatform();
        if (!detected) return;

        setPlatform(detected);

        // 延迟 5 秒后显示，避免打扰用户
        const timer = setTimeout(() => {
            setVisible(true);
            // 动画渐入
            requestAnimationFrame(() => setShow(true));
        }, SHOW_DELAY);

        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = () => {
        setShow(false);
        // 等动画结束后移除
        setTimeout(() => setVisible(false), 400);
        // 记住 7 天不再提示
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
    };

    if (!visible || !platform) return null;

    const message = getSmartMessage(platform);

    return (
        <div
            className={`
                fixed bottom-5 left-1/2 z-9999 flex items-center gap-3 px-5 py-3
                bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)]
                rounded-2xl shadow-lg max-w-[calc(100vw-32px)]
                transition-all duration-400 ease-out
                ${show
                    ? 'opacity-100 -translate-x-1/2 translate-y-0'
                    : 'opacity-0 -translate-x-1/2 translate-y-5'
                }
            `}
        >
            <div style={{ flex: 1, minWidth: 0 }}>
                <div className="text-[var(--text-color)] text-sm font-semibold">
                    {message.title}
                </div>
                <div className="text-[var(--text-color-secondary)] text-xs mt-0.5">
                    {message.subtitle}
                </div>
            </div>

            <Link
                href="/download"
                className="px-4 py-2 text-white text-xs font-semibold rounded-lg no-underline whitespace-nowrap transition-transform hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
            >
                {platformAction[platform]}
            </Link>

            <button
                onClick={handleDismiss}
                className="text-[var(--text-color-secondary)] hover:text-[var(--text-color)] cursor-pointer bg-transparent border-none text-lg px-1 leading-none transition-colors"
                aria-label="关闭"
            >
                ×
            </button>
        </div>
    );
}
