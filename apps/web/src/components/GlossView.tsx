import type { ASLPlan, PlanSegment } from '@signflow/engine';

interface GlossViewProps {
  plan: ASLPlan;
  active?: PlanSegment;
  onSelect: (segment: PlanSegment) => void;
}

/**
 * The ASL gloss the avatar is actually signing.
 *
 * Worth showing rather than hiding: the gloss is where the translation's
 * decisions become visible, including the ones that are wrong. A user who can
 * see that "what is your name" became YOUR NAME WHAT can judge the system;
 * one who only sees the avatar cannot.
 */
export function GlossView({ plan, active, onSelect }: GlossViewProps) {
  return (
    <div className="gloss" aria-label="ASL gloss">
      {plan.segments.map((segment) => (
        <button
          key={segment.index}
          type="button"
          className={`gloss__item${active?.index === segment.index ? ' gloss__item--active' : ''}`}
          onClick={() => onSelect(segment)}
          title={segment.kind === 'fingerspell' ? 'Fingerspelled' : segment.signId}
        >
          {segment.gloss}
        </button>
      ))}
    </div>
  );
}
