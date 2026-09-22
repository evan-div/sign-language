import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  translate, activePlanSegment, PlaybackClock,
  type ASLPlan, type PlanSegment,
} from '@signflow/engine';
import { AvatarStage } from './components/AvatarStage.js';
import { Controls } from './components/Controls.js';
import { SentenceView } from './components/SentenceView.js';
import { GlossView } from './components/GlossView.js';
import { Notices } from './components/Notices.js';

const EXAMPLES = [
  'hello my name is Evan',
  'what is your name?',
  'thank you',
  'I love you',
  'you are right',
];

export function App() {
  const [input, setInput] = useState('hello my name is Evan');
  const [sentence, setSentence] = useState('hello my name is Evan');
  const [speed, setSpeed] = useState(1);
  const [timeMs, setTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [showGloss, setShowGloss] = useState(true);
  const [senseChoices, setSenseChoices] = useState<Record<string, string>>({});

  const { plan, prepared, sequence } = useMemo(
    () => translate(sentence, { speed, senseChoices }),
    [sentence, speed, senseChoices],
  );

  const clockRef = useRef<PlaybackClock>(null);
  if (clockRef.current === null) clockRef.current = new PlaybackClock(plan.durationMs);
  const clock = clockRef.current;

  // A new sentence restarts; changing speed or a sense re-plans in place.
  const previousSentence = useRef(sentence);
  useEffect(() => {
    if (previousSentence.current !== sentence) {
      previousSentence.current = sentence;
      clock.reset();
      clock.retime(plan.durationMs);
      clock.play();
    } else {
      clock.retime(plan.durationMs);
    }
    clock.setSpeed(speed);
    setTimeMs(clock.state.timeMs);
    setPlaying(clock.state.playing);
  }, [plan, sentence, speed, clock]);

  const handleTime = useCallback((ms: number) => {
    setTimeMs(ms);
    setPlaying(clock.state.playing);
  }, [clock]);

  const submit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    const next = input.trim();
    if (next) setSentence(next);
  }, [input]);

  const active: PlanSegment | undefined = activePlanSegment(plan, timeMs);

  const replaySegment = useCallback((segment: PlanSegment) => {
    // Land just before the stroke, so the sign is seen forming.
    clock.seek(Math.max(0, segment.strokeStartMs - segment.transitionInMs * 0.6));
    clock.play();
    setTimeMs(clock.state.timeMs);
    setPlaying(true);
  }, [clock]);

  const chooseSense = useCallback((word: string, signId: string) => {
    setSenseChoices((previous) => ({ ...previous, [word]: signId }));
  }, []);

  const useExample = useCallback((example: string) => {
    setInput(example);
    setSentence(example);
    setSenseChoices({});
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="mark" aria-hidden="true" />
          <h1>SignFlow</h1>
        </div>
        <p className="tagline">Sentence prototype &middot; Milestones 1&ndash;4</p>
      </header>

      <main className="main">
        <section className="viewport">
          <AvatarStage
            plan={plan}
            prepared={prepared}
            sequence={sequence}
            clock={clock}
            onTime={handleTime}
            resetSignal={resetSignal}
          />
          <div className="viewport__caption">
            <SentenceView plan={plan} active={active} onSelect={replaySegment} />
            {showGloss && <GlossView plan={plan} active={active} onSelect={replaySegment} />}
          </div>
        </section>

        <section className="panel">
          <form className="composer" onSubmit={submit}>
            <label className="composer__label" htmlFor="sentence">Sentence to sign</label>
            <div className="composer__row">
              <input
                id="sentence"
                className="composer__input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Type a sentence and press Enter"
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" className="primary">Sign it</button>
            </div>
          </form>

          <div className="suggestions">
            {EXAMPLES.map((example) => (
              <button key={example} type="button" className="chip" onClick={() => useExample(example)}>
                {example}
              </button>
            ))}
          </div>

          <Notices plan={plan} senseChoices={senseChoices} onChooseSense={chooseSense} />

          <Controls
            playing={playing}
            timeMs={timeMs}
            durationMs={plan.durationMs}
            speed={speed}
            showGloss={showGloss}
            onTogglePlay={() => { clock.toggle(); setPlaying(clock.state.playing); }}
            onSeek={(t) => { clock.seekNormalized(t); setTimeMs(clock.state.timeMs); }}
            onSpeed={setSpeed}
            onToggleGloss={() => setShowGloss((v) => !v)}
            onResetCamera={() => setResetSignal((n) => n + 1)}
          />

          <p className="footnote">
            <strong>These signs are placeholders.</strong> They were authored from written
            descriptions by someone who is not a fluent signer and reviewed by no Deaf
            signer, so treat the vocabulary as a demonstration of the pipeline rather than
            as ASL. Facial grammar is carried in the data but only rendered as head
            movement &mdash; the placeholder mannequin has no face.
          </p>
        </section>
      </main>
    </div>
  );
}
