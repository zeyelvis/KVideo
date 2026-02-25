'use client';

import { useEffect, useState } from 'react';

type Platform = 'ios' | 'android' | 'macos' | 'windows' | 'tv' | 'unknown';

function detectPlatform(): Platform {
    if (typeof window === 'undefined') return 'unknown';
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (/android/.test(ua)) return 'android';
    if (/macintosh|mac os/.test(ua)) return 'macos';
    if (/windows/.test(ua)) return 'windows';
    return 'unknown';
}

const platforms = [
    {
        id: 'ios' as Platform,
        name: 'iOS',
        icon: '📱',
        description: 'iPhone & iPad',
        minVersion: 'iOS 15.0+',
        size: '~8 MB',
        action: '下载 IPA',
        url: '#', // 替换为实际下载链接
    },
    {
        id: 'android' as Platform,
        name: 'Android',
        icon: '🤖',
        description: '手机 & 平板',
        minVersion: 'Android 8.0+',
        size: '~5 MB',
        action: '下载 APK',
        url: '#', // 替换为实际下载链接
    },
    {
        id: 'macos' as Platform,
        name: 'macOS',
        icon: '💻',
        description: 'Mac 桌面端',
        minVersion: 'macOS 13.0+',
        size: '~12 MB',
        action: '下载 DMG',
        url: '#', // 替换为实际下载链接
    },
    {
        id: 'tv' as Platform,
        name: 'TV 版',
        icon: '📺',
        description: 'Android TV & Apple TV',
        minVersion: 'Android TV 8.0+ / tvOS 16+',
        size: '~6 MB',
        action: '下载 TV 版',
        url: '#', // 替换为实际下载链接
    },
];

export default function DownloadPage() {
    const [currentPlatform, setCurrentPlatform] = useState<Platform>('unknown');

    useEffect(() => {
        setCurrentPlatform(detectPlatform());
    }, []);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0d0d2b 100%)',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '60px 20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
            {/* 头部 */}
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
                <div style={{
                    fontSize: 48,
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: 16,
                }}>
                    theone58
                </div>
                <p style={{
                    fontSize: 18,
                    color: 'rgba(255,255,255,0.6)',
                    maxWidth: 500,
                    lineHeight: 1.6,
                }}>
                    多源聚合视频平台 · 支持全平台
                </p>
            </div>

            {/* 平台卡片网格 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 24,
                maxWidth: 1100,
                width: '100%',
            }}>
                {platforms.map((platform) => {
                    const isRecommended = platform.id === currentPlatform;
                    return (
                        <div
                            key={platform.id}
                            style={{
                                position: 'relative',
                                background: isRecommended
                                    ? 'linear-gradient(135deg, rgba(102,126,234,0.2) 0%, rgba(118,75,162,0.2) 100%)'
                                    : 'rgba(255,255,255,0.05)',
                                border: isRecommended
                                    ? '2px solid rgba(102,126,234,0.5)'
                                    : '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 20,
                                padding: 32,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                backdropFilter: 'blur(20px)',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            {isRecommended && (
                                <div style={{
                                    position: 'absolute',
                                    top: -12,
                                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                    padding: '4px 16px',
                                    borderRadius: 20,
                                    fontSize: 12,
                                    fontWeight: 600,
                                }}>
                                    推荐当前设备
                                </div>
                            )}

                            <div style={{ fontSize: 48, marginBottom: 16 }}>
                                {platform.icon}
                            </div>

                            <h3 style={{
                                fontSize: 22,
                                fontWeight: 700,
                                marginBottom: 4,
                            }}>
                                {platform.name}
                            </h3>

                            <p style={{
                                color: 'rgba(255,255,255,0.5)',
                                fontSize: 14,
                                marginBottom: 16,
                            }}>
                                {platform.description}
                            </p>

                            <div style={{
                                display: 'flex',
                                gap: 16,
                                marginBottom: 20,
                                fontSize: 13,
                                color: 'rgba(255,255,255,0.4)',
                            }}>
                                <span>{platform.minVersion}</span>
                                <span>·</span>
                                <span>{platform.size}</span>
                            </div>

                            <a
                                href={platform.url}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '12px 32px',
                                    background: isRecommended
                                        ? 'linear-gradient(135deg, #667eea, #764ba2)'
                                        : 'rgba(255,255,255,0.1)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 12,
                                    fontSize: 15,
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                ⬇️ {platform.action}
                            </a>
                        </div>
                    );
                })}
            </div>

            {/* Web 提示 */}
            <div style={{
                marginTop: 60,
                padding: '24px 40px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.1)',
                textAlign: 'center',
                backdropFilter: 'blur(10px)',
            }}>
                <p style={{ fontSize: 16, marginBottom: 8 }}>
                    🌐 也可以直接在浏览器中使用
                </p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                    theone58 是渐进式 Web 应用（PWA），无需下载，
                    <a href="/" style={{ color: '#667eea', textDecoration: 'none' }}>
                        打开网页版 →
                    </a>
                </p>
            </div>

            {/* 底部 */}
            <footer style={{
                marginTop: 60,
                color: 'rgba(255,255,255,0.3)',
                fontSize: 13,
            }}>
                © 2026 theone58 · 多源聚合视频平台
            </footer>
        </div>
    );
}
