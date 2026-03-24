'use client';

/**
 * Cloudflare Turnstile 人机验证组件
 * 文档：https://developers.cloudflare.com/turnstile/
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

// Turnstile 类型定义
declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: TurnstileOptions) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

interface TurnstileOptions {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: (error: any) => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
  language?: string;
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: any) => void;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

export interface TurnstileHandle {
  reset: () => void;
}

// Turnstile site key
// 本地开发使用测试密钥（始终通过），线上使用正式密钥
const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const TURNSTILE_SITE_KEY = isLocalDev
  ? '1x00000000000000000000AA'  // Cloudflare 官方测试密钥（始终通过）
  : (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '');

/** 外部可判断 Turnstile 是否已启用（有密钥） */
export const isTurnstileEnabled = !!TURNSTILE_SITE_KEY;

let scriptLoaded = false;
let scriptLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve) => {
    if (scriptLoaded) {
      resolve();
      return;
    }

    loadCallbacks.push(resolve);

    if (scriptLoading) return;
    scriptLoading = true;

    window.onTurnstileLoad = () => {
      scriptLoaded = true;
      scriptLoading = false;
      loadCallbacks.forEach(cb => cb());
      loadCallbacks.length = 0;
    };

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
}

export const Turnstile = forwardRef<TurnstileHandle, TurnstileProps>(
  function Turnstile({ onVerify, onExpire, onError, theme = 'dark', className }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [widgetStatus, setWidgetStatus] = useState<'loading' | 'ready' | 'verified' | 'error'>('loading');

    // 稳定化回调 — 用 ref 避免 useEffect 因回调变化重建 widget
    const onVerifyRef = useRef(onVerify);
    const onExpireRef = useRef(onExpire);
    const onErrorRef = useRef(onError);
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;

    // 暴露 reset 方法给父组件
    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.reset(widgetIdRef.current);
            setWidgetStatus('ready');
          } catch { /* ignore */ }
        }
      },
    }));

    useEffect(() => {
      // 没有密钥 → 不渲染 widget
      if (!TURNSTILE_SITE_KEY) {
        setWidgetStatus('verified');
        return;
      }

      let mounted = true;

      const initWidget = async () => {
        try {
          await loadTurnstileScript();
        } catch {
          if (mounted) setWidgetStatus('error');
          return;
        }

        if (!mounted || !containerRef.current || !window.turnstile) {
          if (mounted) setWidgetStatus('error');
          return;
        }

        // 清理旧 widget
        if (widgetIdRef.current) {
          try { window.turnstile.remove(widgetIdRef.current); } catch {}
        }

        try {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            callback: (token: string) => {
              onVerifyRef.current(token);
              setWidgetStatus('verified');
            },
            'expired-callback': () => {
              onExpireRef.current?.();
              setWidgetStatus('ready');
            },
            'error-callback': (err: any) => {
              onErrorRef.current?.(err);
              setWidgetStatus('error');
            },
            theme,
            size: 'normal',
            language: 'zh-cn',
          });
          if (mounted) setWidgetStatus('ready');
        } catch {
          if (mounted) setWidgetStatus('error');
        }
      };

      initWidget();

      return () => {
        mounted = false;
        if (widgetIdRef.current && window.turnstile) {
          try { window.turnstile.remove(widgetIdRef.current); } catch {}
        }
      };
    // 只依赖 theme，回调通过 ref 稳定化，不会导致 widget 重建
    }, [theme]);

    // 密钥为空 → 完全不渲染
    if (!TURNSTILE_SITE_KEY) return null;

    return (
      <div className={className}>
        <div ref={containerRef} />
        {widgetStatus === 'error' && (
          <p className="text-xs text-amber-400/70 mt-1.5 text-center">
            人机验证加载失败，请刷新页面重试
          </p>
        )}
      </div>
    );
  }
);
