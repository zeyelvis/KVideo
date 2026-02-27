/**
 * PopularFeatures - Main component for popular movies section
 * Displays Douban movie recommendations with tag filtering and infinite scroll.
 * Default tab is "热门" (trending).
 * Clicking a movie navigates directly to the player page for instant playback.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TagManager } from './TagManager';
import { MovieGrid } from './MovieGrid';
import { useTagManager } from './hooks/useTagManager';
import { usePopularMovies } from './hooks/usePopularMovies';

interface PopularFeaturesProps {
  onSearch?: (query: string) => void;
}

export function PopularFeatures({ onSearch }: PopularFeaturesProps) {
  const router = useRouter();
  const [showMidnightToast, setShowMidnightToast] = useState(false);

  // 午夜版 toast 自动消失
  useEffect(() => {
    if (showMidnightToast) {
      const timer = setTimeout(() => setShowMidnightToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showMidnightToast]);
  const {
    tags,
    selectedTag,
    contentType,
    newTagInput,
    showTagManager,
    justAddedTag,
    setContentType,
    setSelectedTag,
    setNewTagInput,
    setShowTagManager,
    setJustAddedTag,
    handleAddTag,
    handleDeleteTag,
    handleRestoreDefaults,
    handleDragEnd,
    isLoadingTags,
  } = useTagManager();

  const {
    movies,
    loading,
    hasMore,
    prefetchRef,
    loadMoreRef,
  } = usePopularMovies(selectedTag, tags, contentType);

  const handleMovieClick = (movie: any) => {
    // 直达播放：导航到播放页，自动搜索最佳源并播放
    const params = new URLSearchParams();
    params.set('title', movie.title);
    router.push(`/player?${params.toString()}`);
  };

  const handleTagSelect = (tagId: string) => {
    if (tagId === 'custom_高级' || tags.find(t => t.id === tagId)?.label === '高级') {
      window.location.href = '/premium';
      return;
    }
    setSelectedTag(tagId);
  };

  return (
    <div className="animate-fade-in">
      {/* Content Type Toggle (Capsule Liquid Glass - Fixed & Centered) */}
      <div className="mb-10 flex justify-center">
        <div className="content-type-toggle relative w-[28rem] bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-full grid grid-cols-3 backdrop-blur-2xl shadow-lg ring-1 ring-white/10 overflow-hidden">
          {/* Sliding Indicator - 三等分定位 */}
          <div
            className="absolute rounded-full transition-all duration-400 cubic-bezier(0.4, 0, 0.2, 1) pointer-events-none"
            style={{
              top: '4px',
              bottom: '4px',
              width: 'calc(33.333% - 4px)',
              left: contentType === 'movie' ? '4px' : 'calc(33.333%)',
              background: 'var(--accent-color)',
              boxShadow: '0 0 15px rgba(0,122,255,0.4)',
            }}
          />

          <button
            onClick={() => setContentType('movie')}
            className={`relative z-10 py-2.5 text-sm font-bold transition-colors duration-300 cursor-pointer flex justify-center items-center ${contentType === 'movie' ? 'text-white' : 'text-[var(--text-color-secondary)] hover:text-[var(--text-color)]'
              }`}
          >
            电影
          </button>
          <button
            onClick={() => setContentType('tv')}
            className={`relative z-10 py-2.5 text-sm font-bold transition-colors duration-300 cursor-pointer flex justify-center items-center ${contentType === 'tv' ? 'text-white' : 'text-[var(--text-color-secondary)] hover:text-[var(--text-color)]'
              }`}
          >
            电视剧
          </button>
          <button
            onClick={() => setShowMidnightToast(true)}
            className="relative z-10 py-2.5 text-sm font-bold transition-colors duration-300 cursor-pointer flex justify-center items-center text-[var(--text-color-secondary)] hover:text-[var(--text-color)]"
          >
            午夜版
          </button>
        </div>
      </div>

      {/* 午夜版提示 Toast */}
      {showMidnightToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] animate-fade-in">
          <div className="px-6 py-3 bg-[#1a1a2e] text-white rounded-2xl shadow-2xl border border-purple-500/30 flex items-center gap-3 backdrop-blur-xl">
            <span className="text-xl">🔮</span>
            <div>
              <p className="text-sm font-semibold">午夜版功能开发中</p>
              <p className="text-xs text-white/60">敬请期待，精彩内容即将上线</p>
            </div>
            <button
              onClick={() => setShowMidnightToast(false)}
              className="ml-2 text-white/40 hover:text-white/80 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <TagManager
        tags={tags}
        selectedTag={selectedTag}
        showTagManager={showTagManager}
        newTagInput={newTagInput}
        justAddedTag={justAddedTag}
        onTagSelect={handleTagSelect}
        onTagDelete={handleDeleteTag}
        onToggleManager={() => setShowTagManager(!showTagManager)}
        onRestoreDefaults={handleRestoreDefaults}
        onNewTagInputChange={setNewTagInput}
        onAddTag={handleAddTag}
        onDragEnd={handleDragEnd}
        onJustAddedTagHandled={() => setJustAddedTag(false)}
        isLoadingTags={isLoadingTags}
      />

      <MovieGrid
        movies={movies}
        loading={loading}
        hasMore={hasMore}
        onMovieClick={handleMovieClick}
        prefetchRef={prefetchRef}
        loadMoreRef={loadMoreRef}
      />
    </div>
  );
}
