import type { Track } from '@shelf/catalogue';
import type { FC } from 'hono/jsx';

const time = (seconds: number | null) =>
  seconds === null ? '' : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export const TrackList: FC<{ tracks: Track[] }> = ({ tracks }) => (
  <ol class="track-list">
    {tracks.map((track) => (
      <li class="track-list__track">
        <span class="track-list__position">{`${track.side}${track.position}`}</span>
        <span>{track.title}</span>
        <span class="track-list__time">{time(track.durationSeconds)}</span>
      </li>
    ))}
  </ol>
);
