import { useMemo, useState } from 'react';
import { SIGNS, SIGN_IDS, LEXICON, type SignDefinition } from '@signflow/engine';

interface VocabularyProps {
  onPlay: (signId: string) => void;
}

/** Which English words reach each sign, for the card's second line. */
const WORDS_BY_SIGN = new Map<string, string[]>();
for (const entry of LEXICON) {
  const list = WORDS_BY_SIGN.get(entry.signId);
  if (list) list.push(entry.lemma);
  else WORDS_BY_SIGN.set(entry.signId, [entry.lemma]);
}

/**
 * The sign library, browsable.
 *
 * A hundred signs that can only be reached by guessing a sentence that uses
 * them are not really inspectable, and the whole point of the provenance field
 * is that someone can look at a sign and see what it claims to be. So each one
 * is listed with its description, the English that reaches it, and how far it
 * should be trusted -- which, for every entry here, is not very far.
 */
export function Vocabulary({ onPlay }: VocabularyProps) {
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return SIGN_IDS.filter((id) => {
      if (!needle) return true;
      const sign: SignDefinition = SIGNS[id]!;
      return (
        id.toLowerCase().includes(needle) ||
        sign.gloss.toLowerCase().includes(needle) ||
        sign.description.toLowerCase().includes(needle) ||
        (WORDS_BY_SIGN.get(id) ?? []).some((w) => w.includes(needle))
      );
    });
  }, [query]);

  return (
    <div className="vocabulary">
      <div className="vocabulary__head">
        <label className="composer__label" htmlFor="vocab-search">
          Vocabulary &middot; {SIGN_IDS.length} signs
        </label>
        <input
          id="vocab-search"
          className="vocabulary__search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search signs or English words"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {matches.length === 0 && (
        <p className="vocabulary__empty">
          No sign for &ldquo;{query.trim()}&rdquo;. Typing it into a sentence will
          fingerspell it.
        </p>
      )}

      <ul className="vocabulary__list">
        {matches.map((id) => {
          const sign = SIGNS[id]!;
          const words = WORDS_BY_SIGN.get(id) ?? [];
          return (
            <li key={id}>
              <button type="button" className="vocab" onClick={() => onPlay(id)}>
                <span className="vocab__gloss">{sign.gloss}</span>
                <span className="vocab__description">{sign.description}</span>
                {words.length > 0 && (
                  <span className="vocab__words">{words.join(' · ')}</span>
                )}
                <span className={`vocab__provenance vocab__provenance--${sign.provenance.validation}`}>
                  {sign.provenance.source === 'hand-authored' ? 'hand-authored' : sign.provenance.source}
                  {' · '}
                  {sign.provenance.validation}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
