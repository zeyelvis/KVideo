'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useIsTV } from '@/lib/contexts/TVContext';

type DetectedPlatform = 'ios' | 'android' | 'macos' | null;

const DISMISS_KEY = 'iKanPP-download-dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 天不再提示
const SHOW_DELAY = 5000; // 延迟 5 秒显示
const MIN_VISITS_TO_SHOW = 2; // 至少访问 2 次才显示
const VISIT_COUNT_KEY = 'iKanPP-visit-count';

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

// 根据设备给出简洁的提示语
function getSmartMessage(platform: DetectedPlatform): string {
    switch (platform) {
        case 'ios': return '体验更流畅的 iOS 客户端';
        case 'android': return '获取 Android 客户端';
        case 'macos': return '获取 Mac 桌面客户端';
        default: return '获取客户端';
    }
}

const platformAction: Record<string, string> = {
    ios: '立即获取',
    android: '立即获取',
    macos: '立即获取',
};

export function AppDownloadBanner() {
    const isTV = useIsTV();
    const [platform, setPlatform] = useState<DetectedPlatform>(null);
    const [visible, setVisible] = useState(false);
    const [show, setShow] = useState(false);

    // TV 模式下完全不显示下载提示
    if (isTV) return null;

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
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                transition: 'transform 0.4s ease, opacity 0.4s ease',
                transform: show ? 'translateY(0)' : 'translateY(100%)',
                opacity: show ? 1 : 0,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: 'var(--glass-bg, rgba(255,255,255,0.95))',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderTop: '1px solid var(--glass-border, rgba(0,0,0,0.08))',
                    boxShadow: '0 -2px 20px rgba(0,0,0,0.08)',
                }}
            >
                {/* 图标 */}
                <div style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                }}>
                    {platform === 'ios' ? '📱' : platform === 'android' ? '🤖' : '💻'}
                </div>

                {/* 文案 - 单行 */}
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-color, #1a1a1a)' }}>
                        {message}
                    </span>
                </div>

                {/* 按钮 */}
                <Link
                    href="/download"
                    style={{
                        padding: '8px 16px',
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        borderRadius: 20,
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                    }}
                >
                    {platformAction[platform]}
                </Link>

                {/* 关闭 */}
                <button
                    onClick={handleDismiss}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-color-secondary, #999)',
                        fontSize: 20, lineHeight: 1, padding: '0 2px', flexShrink: 0,
                    }}
                    aria-label="关闭"
                >
                    ×
                </button>
            </div>
        </div>
    );
}

