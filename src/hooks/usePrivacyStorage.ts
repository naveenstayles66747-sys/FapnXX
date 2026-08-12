import { useState, useCallback } from 'react';
import {
  getStoredSavedVideos,
  toggleStoredSavedVideo,
  getStoredLikedVideos,
  toggleStoredLikedVideo,
  getStoredWatchHistory,
  addStoredWatchHistory,
  getStoredAgeVerified,
  setStoredAgeVerified,
  HistoryItem,
} from '../utils/storage';

export function usePrivacyStorage() {
  const [isAgeVerified, setIsAgeVerifiedState] = useState<boolean>(() => getStoredAgeVerified());
  const [savedVideoIds, setSavedVideoIds] = useState<string[]>(() => getStoredSavedVideos());
  const [likedVideoIds, setLikedVideoIds] = useState<string[]>(() => getStoredLikedVideos());
  const [watchHistory, setWatchHistory] = useState<HistoryItem[]>(() => getStoredWatchHistory());

  const confirmAge = useCallback(() => {
    setStoredAgeVerified(true);
    setIsAgeVerifiedState(true);
  }, []);

  const declineAge = useCallback(() => {
    setStoredAgeVerified(false);
    setIsAgeVerifiedState(false);
    window.location.href = 'https://www.google.com';
  }, []);

  const toggleSave = useCallback((videoId: string) => {
    const updated = toggleStoredSavedVideo(videoId);
    setSavedVideoIds(updated);
    return updated.includes(videoId);
  }, []);

  const toggleLike = useCallback((videoId: string) => {
    const updated = toggleStoredLikedVideo(videoId);
    setLikedVideoIds(updated);
    return updated.includes(videoId);
  }, []);

  const recordWatch = useCallback((videoId: string) => {
    const updated = addStoredWatchHistory(videoId);
    setWatchHistory(updated);
  }, []);

  const isSaved = useCallback((videoId: string) => savedVideoIds.includes(videoId), [savedVideoIds]);
  const isLiked = useCallback((videoId: string) => likedVideoIds.includes(videoId), [likedVideoIds]);

  return {
    isAgeVerified,
    confirmAge,
    declineAge,
    savedVideoIds,
    likedVideoIds,
    watchHistory,
    toggleSave,
    toggleLike,
    recordWatch,
    isSaved,
    isLiked,
  };
}

export default usePrivacyStorage;
