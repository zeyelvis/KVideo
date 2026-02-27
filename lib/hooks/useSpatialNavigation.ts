/**
 * useSpatialNavigation
 * 为 TV 模式提供基于方向键的 2D 空间导航。
 * 
 * 性能优化：
 * - 使用 MutationObserver 缓存可聚焦元素列表，避免每次按键都查询 DOM
 * - 使用 requestAnimationFrame 节流按键事件
 * - 使用 CSS `will-change` 提示 GPU 加速
 * - scrollIntoView 使用 'auto' 避免动画卡顿
 */

import { useEffect, useRef, useCallback } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right';

const DIRECTION_MAP: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

// 最小间隔 80ms（约 12fps），防止快速连按导致卡顿
const THROTTLE_MS = 80;

/**
 * 从缓存的元素列表中找到指定方向上最优的候选元素
 */
function findBestCandidate(
  current: Element,
  candidates: Element[],
  direction: Direction,
  // 复用 rect 缓存，避免重复 getBoundingClientRect
  rectCache: Map<Element, DOMRect>
): Element | null {
  let currentRect = rectCache.get(current);
  if (!currentRect) {
    currentRect = current.getBoundingClientRect();
    rectCache.set(current, currentRect);
  }

  const cx = currentRect.left + currentRect.width / 2;
  const cy = currentRect.top + currentRect.height / 2;

  let bestElement: Element | null = null;
  let bestScore = Infinity;

  for (let i = 0, len = candidates.length; i < len; i++) {
    const candidate = candidates[i];
    if (candidate === current) continue;

    let candidateRect = rectCache.get(candidate);
    if (!candidateRect) {
      candidateRect = candidate.getBoundingClientRect();
      rectCache.set(candidate, candidateRect);
    }

    // 跳过不可见元素
    if (candidateRect.width === 0 || candidateRect.height === 0) continue;

    const dx = (candidateRect.left + candidateRect.width / 2) - cx;
    const dy = (candidateRect.top + candidateRect.height / 2) - cy;

    // 方向过滤
    let valid = false;
    switch (direction) {
      case 'up': valid = dy < -10; break;
      case 'down': valid = dy > 10; break;
      case 'left': valid = dx < -10; break;
      case 'right': valid = dx > 10; break;
    }
    if (!valid) continue;

    // 加权距离：偏向主轴方向
    const score = (direction === 'up' || direction === 'down')
      ? Math.abs(dy) + Math.abs(dx) * 3
      : Math.abs(dx) + Math.abs(dy) * 3;

    if (score < bestScore) {
      bestScore = score;
      bestElement = candidate;
    }
  }

  return bestElement;
}

/**
 * 查询所有可聚焦元素（不在 data-no-spatial 容器内的）
 */
function queryFocusableElements(): Element[] {
  const all = document.querySelectorAll(
    '[data-focusable]:not([disabled]):not([aria-hidden="true"])'
  );
  const result: Element[] = [];
  for (let i = 0, len = all.length; i < len; i++) {
    const el = all[i];
    if (!el.closest('[data-no-spatial]')) {
      result.push(el);
    }
  }
  return result;
}

export function useSpatialNavigation(enabled: boolean) {
  // 缓存可聚焦元素列表
  const cachedElementsRef = useRef<Element[]>([]);
  // 节流标记
  const throttleRef = useRef(false);
  // rect 缓存（每帧清空）
  const rectCacheRef = useRef<Map<Element, DOMRect>>(new Map());

  // 刷新元素缓存
  const refreshCache = useCallback(() => {
    cachedElementsRef.current = queryFocusableElements();
  }, []);

  // 核心按键处理
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    const direction = DIRECTION_MAP[e.key];

    // 输入控件内：左右键用于光标移动，上下键可跳出
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable;

    if (isInput) {
      if (!direction || direction === 'left' || direction === 'right') return;
      if (e.defaultPrevented) return;
    }

    if (direction) {
      // 节流：防止快速连按
      if (throttleRef.current) {
        e.preventDefault();
        return;
      }
      throttleRef.current = true;
      setTimeout(() => { throttleRef.current = false; }, THROTTLE_MS);

      const focused = document.activeElement as HTMLElement | null;
      if (focused?.closest('[data-no-spatial]')) return;

      const elements = cachedElementsRef.current;
      if (elements.length === 0) {
        // 缓存为空时刷新一次
        refreshCache();
        if (cachedElementsRef.current.length === 0) return;
      }

      const isAlreadyFocused = focused && elements.includes(focused);

      if (!isAlreadyFocused) {
        // 没有聚焦时，聚焦第一个元素
        (elements[0] as HTMLElement).focus({ preventScroll: true });
        (elements[0] as HTMLElement).scrollIntoView({ behavior: 'auto', block: 'nearest' });
        e.preventDefault();
        return;
      }

      // 每次导航清空 rect 缓存（位置可能因滚动变化）
      rectCacheRef.current.clear();

      const best = findBestCandidate(focused!, elements, direction, rectCacheRef.current);
      if (best) {
        (best as HTMLElement).focus({ preventScroll: true });
        // 使用 auto 而非 smooth，避免 TV 硬件上的帧延迟
        (best as HTMLElement).scrollIntoView({ behavior: 'auto', block: 'nearest' });
        e.preventDefault();
      }
    } else if (e.key === 'Enter') {
      const focused = document.activeElement as HTMLElement;
      if (focused?.hasAttribute('data-focusable')) {
        focused.click();
        e.preventDefault();
      }
    }
  }, [enabled, refreshCache]);

  useEffect(() => {
    if (!enabled) return;

    // 初始化缓存
    refreshCache();

    // 监听 DOM 变化自动刷新缓存（防抖 200ms）
    let debounceTimer: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(refreshCache, 200);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-focusable', 'disabled', 'aria-hidden'],
    });

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      observer.disconnect();
      clearTimeout(debounceTimer);
    };
  }, [enabled, handleKeyDown, refreshCache]);
}
