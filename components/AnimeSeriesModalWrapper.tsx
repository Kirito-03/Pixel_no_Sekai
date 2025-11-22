import React, { useState } from 'react';
import { Modal } from 'react-native';
import AnimeSeriesModal from './AnimeSeriesModal';
import EpisodePlayer from './EpisodePlayer';
import { ContentItem, AnimeEpisode, AnimeSeason } from '../types';

interface AnimeSeriesModalWrapperProps {
  content: ContentItem | null;
  visible: boolean;
  onClose: () => void;
}

export default function AnimeSeriesModalWrapper({
  content,
  visible,
  onClose,
}: AnimeSeriesModalWrapperProps) {
  const [showEpisodePlayer, setShowEpisodePlayer] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<AnimeEpisode | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<AnimeSeason | null>(null);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);

  const handlePlayEpisode = (episode: AnimeEpisode, season: AnimeSeason) => {
  console.log('Wrapper: Playing episode:', episode.title);
    
    // NO cerrar el modal de detalles, solo abrir el reproductor
    setSelectedEpisode(episode);
    setSelectedSeason(season);
    setCurrentEpisodeIndex(season.episodes.findIndex(ep => ep.id === episode.id));
    setShowEpisodePlayer(true);
  console.log('Wrapper: Episode player opened');
  };

  const handleCloseEpisodePlayer = () => {
  console.log('Wrapper: Closing episode player');
    setShowEpisodePlayer(false);
    setSelectedEpisode(null);
    setSelectedSeason(null);
    setCurrentEpisodeIndex(0);
  };

  const handleNextEpisode = () => {
    if (!selectedSeason || currentEpisodeIndex >= selectedSeason.episodes.length - 1) return;
    
    const nextIndex = currentEpisodeIndex + 1;
    const nextEpisode = selectedSeason.episodes[nextIndex];
    setCurrentEpisodeIndex(nextIndex);
    setSelectedEpisode(nextEpisode);
  };

  const handlePreviousEpisode = () => {
    if (!selectedSeason || currentEpisodeIndex <= 0) return;
    
    const prevIndex = currentEpisodeIndex - 1;
    const prevEpisode = selectedSeason.episodes[prevIndex];
    setCurrentEpisodeIndex(prevIndex);
    setSelectedEpisode(prevEpisode);
  };

  const getTitle = () => {
    return content?.title || 'Sin título';
  };

  return (
    <>
      <AnimeSeriesModal
        content={content}
        visible={visible}
        onClose={onClose}
        onPlayEpisode={handlePlayEpisode}
      />
      
      {/* Episode Player Modal - Completamente separado */}
      {showEpisodePlayer && selectedEpisode && selectedSeason && (
        <Modal
          visible={showEpisodePlayer}
          transparent={false}
          animationType="slide"
          statusBarTranslucent
        >
          <EpisodePlayer
            episode={selectedEpisode}
            animeTitle={getTitle()}
            seasonNumber={selectedSeason.season}
            onClose={handleCloseEpisodePlayer}
            onNextEpisode={handleNextEpisode}
            onPreviousEpisode={handlePreviousEpisode}
            hasNextEpisode={currentEpisodeIndex < (selectedSeason?.episodes.length || 0) - 1}
            hasPreviousEpisode={currentEpisodeIndex > 0}
          />
        </Modal>
      )}
    </>
  );
}

