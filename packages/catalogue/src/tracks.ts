export type Track = {
  side: string;
  position: number;
  title: string;
  durationSeconds: number | null;
};

export type TracklistResult = { tracks: Track[]; errors: string[] };

// "A1 Title 3:45", "B2. Title" or "3 Title"; a missing side means side A.
const LINE = /^([A-Za-z])?(\d+)[.)]?\s+(.+?)(?:\s+(\d{1,2}):([0-5]\d))?$/;

const parseLine = (line: string): Track | null => {
  const match = LINE.exec(line);
  if (!match) return null;
  const [, side = 'A', position, title, minutes, seconds] = match;
  const durationSeconds = minutes ? Number(minutes) * 60 + Number(seconds) : null;
  return { side: side.toUpperCase(), position: Number(position), title: title!, durationSeconds };
};

export const parseTracklist = (text: string): TracklistResult => {
  const result: TracklistResult = { tracks: [], errors: [] };
  text.split('\n').forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    const track = parseLine(line);
    if (track) result.tracks.push(track);
    else result.errors.push(`Line ${index + 1} needs a position and a title, as in "A1 Title".`);
  });

  return result;
};

const duration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export const formatTracklist = (tracks: Track[]) =>
  tracks
    .map((track) => {
      const time = track.durationSeconds === null ? '' : ` ${duration(track.durationSeconds)}`;
      return `${track.side}${track.position} ${track.title}${time}`;
    })
    .join('\n');
