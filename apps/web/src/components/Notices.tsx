import type { ASLPlan, Ambiguity } from '@signflow/engine';

interface NoticesProps {
  plan: ASLPlan;
  senseChoices: Record<string, string>;
  onChooseSense: (word: string, signId: string) => void;
}

const ICON: Record<string, string> = {
  substitution: '⇄',
  fingerspelled: 'A',
  ambiguous: '?',
  dropped: '−',
  spatial: '⌖',
  reordered: '↦',
};

/**
 * Everything the translation did to the user's sentence, said out loud.
 *
 * The product rule is that we never quietly change what someone meant. A
 * substituted sign, a dropped word, a word we had to spell and a meaning we
 * could not choose between are all departures from the input, so each one is
 * reported rather than absorbed.
 */
export function Notices({ plan, senseChoices, onChooseSense }: NoticesProps) {
  if (plan.notices.length === 0 && plan.ambiguities.length === 0) return null;

  return (
    <div className="notices">
      {plan.ambiguities.map((ambiguity: Ambiguity) => (
        <div key={`amb-${ambiguity.segmentIndex}`} className="notice notice--ask">
          <span className="notice__icon" aria-hidden="true">?</span>
          <div className="notice__body">
            <p className="notice__text">
              <strong>&ldquo;{ambiguity.word}&rdquo;</strong> has more than one meaning.
              Signing the first until you choose.
            </p>
            <div className="notice__choices">
              {ambiguity.senses.map((sense) => {
                const chosen = senseChoices[ambiguity.word.toLowerCase()] === sense.signId;
                return (
                  <button
                    key={sense.signId}
                    type="button"
                    className={`choice${chosen ? ' choice--active' : ''}`}
                    onClick={() => onChooseSense(ambiguity.word.toLowerCase(), sense.signId)}
                    aria-pressed={chosen}
                  >
                    {sense.sense ?? sense.signId}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {plan.notices
        .filter((notice) => notice.kind !== 'ambiguous')
        .map((notice, index) => (
          <div key={`${notice.kind}-${index}`} className={`notice notice--${notice.kind}`}>
            <span className="notice__icon" aria-hidden="true">{ICON[notice.kind] ?? '•'}</span>
            <p className="notice__text">{notice.message}</p>
          </div>
        ))}
    </div>
  );
}
