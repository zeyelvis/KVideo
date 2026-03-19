import React from 'react';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./styles/tmdb-slideshow.css";
import "./styles/skeleton.css";
import "./styles/about.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TVProvider } from "@/lib/contexts/TVContext";
import { TVNavigationInitializer } from "@/components/TVNavigationInitializer";

import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { PasswordGate } from "@/components/PasswordGate";

import { AdKeywordsInjector } from "@/components/AdKeywordsInjector";
import { BackToTop } from "@/components/ui/BackToTop";
import { ScrollPositionManager } from "@/components/ScrollPositionManager";
import { Footer } from "@/components/layout/Footer";

import { Suspense } from 'react';
import { ReferralCapture } from '@/components/auth/ReferralCapture';

// Server Component specifically for reading env/file (async for best practices)
async function AdKeywordsWrapper() {
  let keywords: string[] = [];

  try {
    // 从环境变量读取广告关键词（兼容 Edge Runtime）
    const envKeywords = process.env.AD_KEYWORDS || process.env.NEXT_PUBLIC_AD_KEYWORDS;
    if (envKeywords) {
      keywords = envKeywords.split(/[\n,]/).map((k: string) => k.trim()).filter((k: string) => k);
    }
  } catch (error) {
    console.warn('[AdFilter] Failed to load keywords:', error);
  }

  return <AdKeywordsInjector keywords={keywords} />;
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ikanpp.com';

export const metadata: Metadata = {
  title: {
    default: 'iKanPP — 爱看片片 | 全网影视聚合搜索播放平台',
    template: `%s | iKanPP`,
  },
  description: 'iKanPP（爱看片片）— 影视聚合搜索引擎，多播放源聚合，一键搜索全网电影、电视剧、综艺、动漫资源。支持国产剧、美剧、韩剧、日剧、港剧，热播剧全集更新，高分电影推荐。2026 新片新剧尽在爱看片片。',
  keywords: [
    // 核心定位词
    'iKanPP', '爱看片片', '影视聚合搜索', '影视搜索引擎', '影片搜索', '播放源聚合', '片源聚合', '影视资源索引', '影视内容聚合',
    // 电影
    '电影搜索', '院线电影', '高分电影', '新片推荐', '电影全集',
    // 电视剧
    '电视剧搜索', '电视剧全集', '热播剧', '国产剧', '美剧', '韩剧', '日剧', '港剧', '台剧',
    // 综艺 + 动漫
    '综艺搜索', '热播综艺', '动漫搜索', '国漫', '日漫', '新番',
    // 长尾热词
    '2026新剧', '2026新片', '本周热播', '高评分美剧', '热门剧集',
    // 地域
    '海外影视', '欧美电影', '日韩电视剧',
  ],
  authors: [{ name: 'iKanPP' }],
  creator: 'iKanPP',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: SITE_URL,
    title: 'iKanPP — 爱看片片 | 全网影视聚合搜索播放平台',
    description: 'iKanPP（爱看片片）— 影视聚合搜索引擎，多播放源聚合，一键搜索全网电影、电视剧、综艺、动漫。支持国产剧、美剧、韩剧、日剧、港剧，2026 新片新剧尽在爱看片片。',
    siteName: 'iKanPP',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'iKanPP - 爱看片片 · 精彩无限',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'iKanPP — 爱看片片 | 全网影视聚合搜索播放平台',
    description: 'iKanPP（爱看片片）— 影视聚合搜索引擎，多播放源聚合，搜遍全网电影电视剧综艺动漫，2026 热播剧新片推荐。',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        {/* Apple PWA Support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="iKanPP" />
        <link rel="apple-touch-icon" href="/icon.png" />
        {/* Theme Color (for browser address bar) */}
        <meta name="theme-color" content="#000000" />
        {/* Mobile viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* JSON-LD 结构化数据 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: 'iKanPP',
                alternateName: '爱看片片',
                url: 'https://www.ikanpp.com',
                description: '影视聚合搜索引擎 — 多播放源聚合，搜遍全网电影、电视剧、综艺、动漫资源',
                inLanguage: 'zh-CN',
                potentialAction: {
                  '@type': 'SearchAction',
                  target: {
                    '@type': 'EntryPoint',
                    urlTemplate: 'https://www.ikanpp.com/?q={search_term_string}',
                  },
                  'query-input': 'required name=search_term_string',
                },
              },
              {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'iKanPP',
                alternateName: '爱看片片',
                url: 'https://www.ikanpp.com',
                logo: 'https://www.ikanpp.com/icon.png',
                sameAs: [],
                contactPoint: {
                  '@type': 'ContactPoint',
                  email: 'zeyelvis@icloud.com',
                  contactType: 'customer service',
                  availableLanguage: ['Chinese', 'English'],
                },
              },
            ]),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <TVProvider>
            <TVNavigationInitializer />
            <PasswordGate hasAuth={!!(process.env.ADMIN_PASSWORD || process.env.ACCOUNTS || process.env.ACCESS_PASSWORD)}>
              <AdKeywordsWrapper />
              <Suspense><ReferralCapture /></Suspense>
              {children}
              <Footer />
              <BackToTop />
              <ScrollPositionManager />
            </PasswordGate>
          </TVProvider>

          <ServiceWorkerRegister />
        </ThemeProvider>

        {/* ARIA Live Region for Screen Reader Announcements */}
        <div
          id="aria-live-announcer"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />

        {/* Google Cast SDK */}
        <script src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1" async />

        {/* Scroll Performance Optimization Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                let scrollTimer;
                const body = document.body;
                
                function handleScroll() {
                  body.classList.add('scrolling');
                  clearTimeout(scrollTimer);
                  scrollTimer = setTimeout(function() {
                    body.classList.remove('scrolling');
                  }, 150);
                }
                
                let ticking = false;
                window.addEventListener('scroll', function() {
                  if (!ticking) {
                    window.requestAnimationFrame(function() {
                      handleScroll();
                      ticking = false;
                    });
                    ticking = true;
                  }
                }, { passive: true });
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
