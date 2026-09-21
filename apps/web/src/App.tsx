import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  planFingerspell, activeSegment, PlaybackClock,
  type FingerspellPlan, type LetterSegment,
} from '@signflow/engine';
import { AvatarStage } from './components/AvatarStage.js';
import { Controls } from './components/Controls.js';
import { SpellingStrip } from './components/SpellingStrip.js';

const SUGGESTIONS = ['EVAN', 'HELLO', 'MISSISSIPPI', 'ZEBRA'];

export function App() {
  const [input, setInput] = useState('Evan');
  const [word, setWord] = useState('Evan');
  const [speed, setSpeed] = useState(1);
  const [timeMs, setTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  const plan: FingerspellPlan = useMemo(
    () => planFingerspell(word, { speed }),
    [word, speed],
  );

  const clockRef = useRef<PlaybackClock>(null);
  if (clockRef.current === null) clockRef.current = new PlaybackClock(plan.durationMs);
  const clock = clockRef.current;

  // Changing the word restarts; changing speed re-plans but keeps position.
  const previousWord = useRef(word);
  useEffect(() => {
    if (previousWord.current !== word) {
      previousWord.current = word;
      clock.reset();
      clock.retime(plan.durationMs);
      clock.play();
    } else {
      clock.retime(plan.durationMs);
    }
    clock.setSpeed(speed);
    setTimeMs(clock.state.timeMs);
    setPlaying(clock.state.playing);
  }, [plan, word, speed, clock]);

  const handleTime = useCallback((ms: number) => {
    setTimeMs(ms);
    setPlaying(clock.state.playing);
  }, [clock]);

  const submit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    setWord(input.trim());
  }, [input]);

  const active: LetterSegment | undefined = activeSegment(plan, timeMs);

  const seekToLetter = useCallback((segment: LetterSegment) => {
    // Land just before the hold so the letter is seen forming, not already formed.
    clock.seek(Math.max(0, segment.holdStartMs - plan.options.transitionMs * 0.5));
    clock.play();
    setTimeMs(clock.state.timeMs);
    setPlaying(true);
  }, [clock, plan]);

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="mark" aria-hidden="true" />
          <h1>SignFlow</h1>
        </div>
        <p className="tagline">Fingerspelling prototype &middot; Milestones 1&ndash;2</p>
      </header>

      <main className="main">
        <section className="viewport">
          <AvatarStage plan={plan} clock={clock} onTime={handleTime} resetSignal={resetSignal} />
          <div className="viewport__caption">
            <SpellingStrip plan={plan} active={active} onSelectLetter={seekToLetter} />
          </div>
        </section>

        <section className="panel">
          <form className="composer" onSubmit={submit}>
            <label className="composer__label" htmlFor="word">Word to fingerspell</label>
            <div className="composer__row">
              <input
                id="word"
                className="composer__input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Type a word and press Enter"
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" className="primary">Spell it</button>
            </div>
          </form>

          <div className="suggestions">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="chip"
                onClick={() => { setInput(suggestion); setWord(suggestion); }}
              >
                {suggestion}
              </button>
            ))}
          </div>

          {plan.skipped.length > 0 && (
            <p className="notice" role="status">
              Skipped {plan.skipped.map((c) => `"${c}"`).join(', ')} &mdash; no handshape yet.
              Numbers and punctuation come later.
            </p>
          )}

          <Controls
            playing={playing}
            timeMs={timeMs}
            durationMs={plan.durationMs}
            speed={speed}
            onTogglePlay={() => { clock.toggle(); setPlaying(clock.state.playing); }}
            onSeek={(t) => { clock.seekNormalized(t); setTimeMs(clock.state.timeMs); }}
            onSpeed={setSpeed}
            onResetCamera={() => setResetSignal((n) => n + 1)}
          />

          <p className="footnote">
            Placeholder mannequin, procedurally rigged to the VRM&nbsp;1.0 humanoid bone
            standard. Handshapes are hand-authored and verified geometrically, not
            extracted from video. M, N, T and R are known approximations.
          </p>
        </section>
      </main>
    </div>
  );
}
