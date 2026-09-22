import type { ASLPlan, PlanSegment } from '@signflow/engine';

interface SentenceViewProps {
  plan: ASLPlan;
  active?: PlanSegment;
  onSelect: (segment: PlanSegment) => void;
}

interface Run {
  readonly text: string;
  readonly segment?: PlanSegment;
  readonly key: string;
}

/**
 * Splits the original sentence into runs, one per segment plus the gaps between.
 *
 * Driven entirely off each segment's character span, which is why the plan
 * carries them: after dropping words and moving the question word to the end,
 * the sign order no longer matches the English, and only the spans still tie
 * the two together.
 */
function toRuns(plan: ASLPlan): Run[] {
  const ordered = [...plan.segments].sort((a, b) => a.sourceSpan[0] - b.sourceSpan[0]);
  const runs: Run[] = [];
  let cursor = 0;

  ordered.forEach((segment) => {
    const [start, end] = segment.sourceSpan;
    if (start > cursor) runs.push({ text: plan.source.slice(cursor, start), key: `gap-${cursor}` });
    runs.push({ text: plan.source.slice(start, end), segment, key: `seg-${segment.index}` });
    cursor = end;
  });

  if (cursor < plan.source.length) {
    runs.push({ text: plan.source.slice(cursor), key: `gap-${cursor}` });
  }
  return runs;
}

const RESOLUTION_TITLE: Record<string, string> = {
  direct: 'Signed directly',
  synonym: 'A different word was signed — see the notes',
  fingerspelled: 'No sign for this word, so it is fingerspelled',
  ambiguous: 'More than one meaning — pick one below',
};

export function SentenceView({ plan, active, onSelect }: SentenceViewProps) {
  if (plan.segments.length === 0) {
    return <p className="sentence sentence--empty">Type a sentence to sign it.</p>;
  }

  return (
    <p className="sentence" aria-label="Input sentence">
      {toRuns(plan).map((run) =>
        run.segment ? (
          <button
            key={run.key}
            type="button"
            className={`word word--${run.segment.resolution}${active?.index === run.segment.index ? ' word--active' : ''}`}
            onClick={() => onSelect(run.segment!)}
            aria-current={active?.index === run.segment.index ? 'true' : undefined}
            title={RESOLUTION_TITLE[run.segment.resolution]}
            data-segment={run.segment.index}
          >
            {run.text}
          </button>
        ) : (
          // A gap holds whatever sits between two signed spans. Only strike it
          // through when it actually contains a word the translation dropped --
          // spacing and punctuation were never going to be signed, and marking
          // them as omissions is just noise.
          <span
            key={run.key}
            className={/[\p{L}\p{N}]/u.test(run.text) ? 'word word--dropped' : 'word word--gap'}
          >
            {run.text}
          </span>
        ),
      )}
    </p>
  );
}
