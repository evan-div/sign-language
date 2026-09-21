import type { FingerspellPlan, LetterSegment } from '@signflow/engine';

interface SpellingStripProps {
  plan: FingerspellPlan;
  active?: LetterSegment;
  onSelectLetter: (segment: LetterSegment) => void;
}

/**
 * The spelled word, with the current letter highlighted.
 *
 * Each letter is its own control, so clicking one seeks to it. This is the
 * letter-level case of the word-level highlighting the full product needs, and
 * it runs off the same segment list the animation does -- there is no second
 * source of truth for "which letter is happening now".
 */
export function SpellingStrip({ plan, active, onSelectLetter }: SpellingStripProps) {
  if (plan.segments.length === 0) {
    return <p className="strip strip--empty">Type a word to fingerspell it.</p>;
  }

  return (
    <div className="strip" role="group" aria-label="Spelled letters">
      {plan.segments.map((segment) => {
        const isActive = active?.index === segment.index;
        return (
          <button
            key={segment.index}
            type="button"
            className={`letter${isActive ? ' letter--active' : ''}${segment.doubled ? ' letter--doubled' : ''}`}
            onClick={() => onSelectLetter(segment)}
            aria-current={isActive ? 'true' : undefined}
            data-hold-start={segment.holdStartMs}
            data-hold-end={segment.holdEndMs}
            title={segment.doubled ? 'Repeated letter — re-articulated with a bounce' : undefined}
          >
            {segment.letter}
          </button>
        );
      })}
    </div>
  );
}
