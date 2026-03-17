'use client';

import { useState, useEffect } from 'react';
import { TagManager } from '@/components/home/TagManager';
import { PremiumContentGrid } from './PremiumContentGrid';
import { PremiumSlideshow } from './PremiumSlideshow';
import { usePremiumTagManager } from '@/lib/hooks/usePremiumTagManager';
import { usePremiumContent } from '@/lib/hooks/usePremiumContent';
import { usePersonalizedRecommendations } from '@/components/home/hooks/usePersonalizedRecommendations';

interface PremiumContentProps {
    onSearch?: (query: string) => void;
}

export function PremiumContent({ onSearch }: PremiumContentProps) {
    const {
        tags,
        selectedTag,
        newTagInput,
        showTagManager,
        justAddedTag,
        setSelectedTag,
        setNewTagInput,
        setShowTagManager,
        setJustAddedTag,
        handleAddTag,
        handleDeleteTag,
        handleRestoreDefaults,
        handleDragEnd,
    } = usePremiumTagManager();

    const {
        movies: recommendMovies,
        loading: recommendLoading,
        hasMore: recommendHasMore,
        hasHistory,
        prefetchRef: recommendPrefetchRef,
        loadMoreRef: recommendLoadMoreRef,
    } = usePersonalizedRecommendations(true);

    // Track whether the recommendation tab is active
    const [isRecommendSelected, setIsRecommendSelected] = useState(hasHistory);

    useEffect(() => {
        if (hasHistory) {
            setIsRecommendSelected(true);
        }
    }, [hasHistory]);

    const effectiveRecommendSelected = hasHistory && isRecommendSelected;

    // Get the category value from selected tag
    const categoryValue = tags.find(t => t.id === selectedTag)?.value || '';

    const {
        videos,
        loading,
        hasMore,
        prefetchRef,
        loadMoreRef,
    } = usePremiumContent(effectiveRecommendSelected ? '' : categoryValue);

    const handleVideoClick = (video: any) => {
        if (onSearch) {
            onSearch(video.vod_name || video.title);
        }
    };

    const handleRecommendSelect = () => {
        setIsRecommendSelected(true);
    };

    const handleRegularTagSelect = (tagId: string) => {
        setIsRecommendSelected(false);
        setSelectedTag(tagId);
    };

    // 将豆瓣推荐数据适配为 PremiumContentGrid 所需的 Video 类型
    const adaptedRecommendVideos = recommendMovies.map((m: any) => ({
        vod_id: m.id,
        vod_name: m.title,
        vod_pic: m.cover,
        vod_remarks: m.rate ? `${m.rate}分` : '',
        type_name: m.sourceLabel || '',
        source: 'douban',
    }));

    return (
        <div className="animate-fade-in">            {/* 幻灯片推荐 */}
            <PremiumSlideshow onSearch={onSearch} />

            <TagManager
                tags={tags}
                selectedTag={effectiveRecommendSelected ? '' : selectedTag}
                showTagManager={showTagManager}
                newTagInput={newTagInput}
                justAddedTag={justAddedTag}
                onTagSelect={handleRegularTagSelect}
                onTagDelete={handleDeleteTag}
                onToggleManager={() => setShowTagManager(!showTagManager)}
                onRestoreDefaults={handleRestoreDefaults}
                onNewTagInputChange={setNewTagInput}
                onAddTag={handleAddTag}
                onDragEnd={handleDragEnd}
                onJustAddedTagHandled={() => setJustAddedTag(false)}
                recommendTag={hasHistory ? {
                    label: '为你推荐',
                    isSelected: effectiveRecommendSelected,
                    onSelect: handleRecommendSelect,
                } : undefined}
            />

            {effectiveRecommendSelected ? (
                <PremiumContentGrid
                    videos={adaptedRecommendVideos}
                    loading={recommendLoading}
                    hasMore={recommendHasMore}
                    onVideoClick={handleVideoClick}
                    prefetchRef={recommendPrefetchRef}
                    loadMoreRef={recommendLoadMoreRef}
                />
            ) : (
                <PremiumContentGrid
                    videos={videos}
                    loading={loading}
                    hasMore={hasMore}
                    onVideoClick={handleVideoClick}
                    prefetchRef={prefetchRef}
                    loadMoreRef={loadMoreRef}
                />
            )}
        </div>
    );
}

