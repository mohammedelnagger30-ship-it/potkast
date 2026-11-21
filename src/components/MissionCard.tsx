import { useState, useEffect } from 'react';
import { Check, Target, Zap, Clock, Mic, ChevronDown, ChevronUp, Play, Pause } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import {
  type Mission,
  type UserMission,
  type UserMissionStatus,
  difficultyLabels,
  difficultyBadgeVariant,
  formatDurationShort,
} from '@/types/mission';
import { useAudioPlayer } from '@/context/AudioPlayerContext';

interface MissionCardProps {
  userMission: UserMission;
  onComplete: (userMissionId: string, notes: string) => void;
  onStart: (userMissionId: string) => void;
  saving?: boolean;
}

export function MissionCard({ userMission, onComplete, onStart, saving }: MissionCardProps) {
  const { playEpisode, currentEpisode, isPlaying, togglePlay } = useAudioPlayer();
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(userMission.notes || '');
  const [justCompleted, setJustCompleted] = useState(false);
  const mission = userMission.mission;
  const status = userMission.status as UserMissionStatus;
  const isCompleted = status === 'completed';
  const isInProgress = status === 'in_progress';

  // Sync notes if they change externally
  useEffect(() => {
    setNotes(userMission.notes || '');
  }, [userMission.notes]);

  if (!mission) return null;

  const handleComplete = () => {
    onComplete(userMission.id, notes);
    setJustCompleted(true);
    setTimeout(() => setJustCompleted(false), 2000);
  };

  const handlePlayEpisode = () => {
    if (!mission.linked_episode) return;
    if (currentEpisode?.id === mission.linked_episode!.id) {
      togglePlay();
    } else {
      playEpisode(mission.linked_episode);
    }
  };

  const isEpisodePlaying = currentEpisode?.id === mission.linked_episode?.id && isPlaying;

  return (
    <div
      className={`animate-fade-in-up transition-all duration-300 ${
        justCompleted ? 'scale-[1.02]' : ''
      }`}
    >
      <Card
        className={`${
          isCompleted ? 'opacity-70' : ''
        } ${justCompleted ? 'ring-2 ring-success-500 shadow-card-hover' : ''}`}
      >
        <div className="flex items-start gap-3">
          {/* Checkbox / status icon */}
          <button
            onClick={() => {
              if (isCompleted) return;
              if (!isInProgress) onStart(userMission.id);
              handleComplete();
            }}
            disabled={isCompleted || saving}
            className={`flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${
              isCompleted
                ? 'bg-success-500 text-white'
                : isInProgress
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-success-500 hover:text-white'
                : 'border-2 border-neutral-300 dark:border-neutral-600 text-transparent hover:border-primary-500'
            }`}
            aria-label={isCompleted ? 'مكتملة' : 'إكمال المهمة'}
          >
            <Check size={22} strokeWidth={3} />
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3
                  className={`font-bold text-neutral-900 dark:text-neutral-100 ${
                    isCompleted ? 'line-through text-neutral-400 dark:text-neutral-500' : ''
                  }`}
                >
                  {mission.title}
                </h3>
                {mission.description && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                    {mission.description}
                  </p>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Badge variant={difficultyBadgeVariant[mission.difficulty]} size="sm">
                {difficultyLabels[mission.difficulty]}
              </Badge>
              <span className="flex items-center gap-0.5 text-xs text-accent-600 dark:text-accent-400 font-semibold">
                <Zap size={12} />
                {mission.xp_reward} نقطة
              </span>
              {mission.duration_minutes > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-neutral-400">
                  <Clock size={12} />
                  {formatDurationShort(mission.duration_minutes)}
                </span>
              )}
              {isCompleted && userMission.completed_at && (
                <span className="text-xs text-success-500 font-semibold">تم الإكمال</span>
              )}
            </div>

            {/* Linked episode */}
            {mission.linked_episode && (
              <button
                onClick={handlePlayEpisode}
                className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-all w-full text-right"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-600 text-white flex-shrink-0">
                  {isEpisodePlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="mr-0.5" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-primary-700 dark:text-primary-300 truncate">
                    {mission.linked_episode.title}
                  </p>
                  <p className="text-[10px] text-primary-500 dark:text-primary-400">حلقة مرتبطة — استمع وأكمل المهمة</p>
                </div>
                <Mic size={14} className="text-primary-400 mr-auto flex-shrink-0" />
              </button>
            )}

            {/* Notes section */}
            {!isCompleted && (
              <div className="mt-2">
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-primary-600 dark:text-neutral-400 transition-all"
                >
                  {showNotes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  ملاحظة تأملية (اختياري)
                </button>
                {showNotes && (
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="اكتب تأملك في هذه المهمة..."
                    rows={3}
                    className="mt-2 w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all resize-none animate-fade-in"
                  />
                )}
              </div>
            )}

            {/* Show notes if completed and has notes */}
            {isCompleted && userMission.notes && (
              <div className="mt-2 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 animate-fade-in">
                <p className="text-xs font-semibold text-neutral-400 mb-1">تأملك:</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{userMission.notes}</p>
              </div>
            )}

            {/* Action button */}
            {!isCompleted && !isInProgress && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => onStart(userMission.id)}
                disabled={saving}
              >
                <Target size={16} />
                ابدأ المهمة
              </Button>
            )}
            {!isCompleted && isInProgress && (
              <Button
                size="sm"
                variant="primary"
                className="mt-3"
                onClick={handleComplete}
                disabled={saving}
              >
                <Check size={16} />
                {saving ? 'جارٍ الحفظ...' : 'إكمال'}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
