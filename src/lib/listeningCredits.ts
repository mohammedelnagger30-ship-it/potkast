/**
 * Pure listening-time accounting used by the audio player.
 *
 * `countedSeconds` is the furthest playback position already credited to
 * user_stats for this episode. Only the forward difference is new listening
 * time. A lower position means the episode was replayed from the beginning,
 * so the new position itself is the listening time since the last save.
 */
export interface ListeningCredit {
  secondsListened: number;
  countedSeconds: number;
}

export function creditListeningSeconds(
  countedSeconds: number | undefined,
  positionSeconds: number
): ListeningCredit {
  const position = Math.max(0, Math.floor(positionSeconds || 0));
  const previous = Math.max(0, Math.floor(countedSeconds || 0));
  const secondsListened = position < previous ? position : position - previous;
  return { secondsListened, countedSeconds: position };
}
