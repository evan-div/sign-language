import { activeNonManual, NMM_SPECS, type ASLPlan } from '@signflow/engine';

interface MarkersProps {
  plan: ASLPlan;
  timeMs: number;
}

/** Short labels. The spec's own description is the tooltip. */
const LABEL: Record<string, string> = {
  yes_no_question: 'yes/no question',
  wh_question: 'WH question',
  topic: 'topic',
  conditional: 'conditional',
  negation: 'negation',
  affirmation: 'affirmation',
};

/**
 * What the face is doing, named.
 *
 * ASL puts sentence type on the face, and a hearing user learning to read this
 * has no idea that raised brows are a question rather than an expression. The
 * gloss line says what the hands are saying; this says what the face is, so the
 * grammar is legible to someone who cannot yet read it off the avatar.
 */
export function Markers({ plan, timeMs }: MarkersProps) {
  const active = activeNonManual(plan.segments, plan.nmmSpans, timeMs);
  if (plan.nmmSpans.length === 0) return null;

  return (
    <div className="markers" aria-label="Non-manual markers">
      {plan.nmmSpans.map((span, index) => {
        const on = active.includes(span.type);
        return (
          <span
            key={`${span.type}-${index}`}
            className={`marker${on ? ' marker--active' : ''}`}
            title={NMM_SPECS[span.type].description}
          >
            {LABEL[span.type] ?? span.type}
          </span>
        );
      })}
    </div>
  );
}
