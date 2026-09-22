interface ControlsProps {
  playing: boolean;
  timeMs: number;
  durationMs: number;
  speed: number;
  onTogglePlay: () => void;
  onSeek: (normalized: number) => void;
  onSpeed: (speed: number) => void;
  onResetCamera: () => void;
  showGloss: boolean;
  onToggleGloss: () => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.5, 2];

export function Controls({
  playing, timeMs, durationMs, speed, showGloss,
  onTogglePlay, onSeek, onSpeed, onToggleGloss, onResetCamera,
}: ControlsProps) {
  const progress = durationMs > 0 ? timeMs / durationMs : 0;
  const disabled = durationMs === 0;

  return (
    <div className="controls">
      <button
        type="button"
        className="play"
        onClick={onTogglePlay}
        disabled={disabled}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="5" width="3.5" height="14" rx="1" /><rect x="13.5" y="5" width="3.5" height="14" rx="1" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.2v13.6a1 1 0 0 0 1.53.85l10.2-6.8a1 1 0 0 0 0-1.7L9.53 4.35A1 1 0 0 0 8 5.2Z" /></svg>
        )}
      </button>

      <input
        className="scrub"
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={progress}
        disabled={disabled}
        onChange={(event) => onSeek(Number(event.target.value))}
        aria-label="Playback position"
        data-duration-ms={durationMs}
        style={{ ['--progress' as string]: `${progress * 100}%` }}
      />

      <span className="time" aria-hidden="true">
        {(timeMs / 1000).toFixed(1)}s / {(durationMs / 1000).toFixed(1)}s
      </span>

      <div className="speeds" role="group" aria-label="Playback speed">
        {SPEEDS.map((value) => (
          <button
            key={value}
            type="button"
            className={`speed${value === speed ? ' speed--active' : ''}`}
            onClick={() => onSpeed(value)}
            aria-pressed={value === speed}
          >
            {value}&times;
          </button>
        ))}
      </div>

      <button
        type="button"
        className={`ghost${showGloss ? ' ghost--active' : ''}`}
        onClick={onToggleGloss}
        aria-pressed={showGloss}
      >
        Gloss
      </button>

      <button type="button" className="ghost" onClick={onResetCamera}>
        Reset view
      </button>
    </div>
  );
}
