import { useMemo, useState } from 'react';
import { SIGNS, SIGN_IDS, LEXICON, type SignCategory, type SignDefinition } from '@signflow/engine';

interface VocabularyProps {
  onPlay: (signId: string) => void;
}

/** Which English words reach each sign, for the card's second line. */
const WORDS_BY_SIGN = new Map<string, string[]>();
for (const entry of LEXICON) {
  for (const id of [entry.signId, ...(entry.then ?? [])]) {
    const list = WORDS_BY_SIGN.get(id);
    if (list) { if (!list.includes(entry.lemma)) list.push(entry.lemma); }
    else WORDS_BY_SIGN.set(id, [entry.lemma]);
  }
}

const FIDELITY_TITLE: Record<string, string> = {
  citation: 'The author understands the dictionary form and the notation can express it. A self-assessment, not a validation.',
  approximate: 'The form is understood but part of it cannot be drawn: finger movement, real contact between hands. A stand-in is shown.',
  uncertain: 'The author is working from a vague recollection. Treat as the most likely to be wrong.',
};

type Filter = 'all' | 'citation' | 'approximate' | 'uncertain';

/**
 * The sign library, browsable.
 *
 * At a hundred signs a scrolling list was enough. At three hundred it is not:
 * a person looking for one sign, or trying to check a family of related ones,
 * needs to narrow by meaning, and a reviewer needs to be able to go straight to
 * the signs the author doubts most.
 *
 * The provenance badge is shown on every card on purpose. A library this size
 * that looked uniformly authoritative would be the misleading thing, and the
 * honest state of every entry is that no fluent signer has seen it.
 */
export function Vocabulary({ onPlay }: VocabularyProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SignCategory | 'all'>('all');
  const [fidelity, setFidelity] = useState<Filter>('all');

  const categories = useMemo(() => {
    const counts = new Map<SignCategory, number>();
    for (const id of SIGN_IDS) {
      const c = SIGNS[id]!.category;
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1]);
  }, []);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return SIGN_IDS.filter((id) => {
      const sign: SignDefinition = SIGNS[id]!;
      if (category !== 'all' && sign.category !== category) return false;
      if (fidelity !== 'all' && (sign.provenance.fidelity ?? 'citation') !== fidelity) return false;
      if (!needle) return true;
      return (
        id.toLowerCase().includes(needle) ||
        sign.gloss.toLowerCase().includes(needle) ||
        sign.description.toLowerCase().includes(needle) ||
        (WORDS_BY_SIGN.get(id) ?? []).some((w) => w.startsWith(needle))
      );
    });
  }, [query, category, fidelity]);

  return (
    <div className="vocabulary">
      <div className="vocabulary__head">
        <label className="composer__label" htmlFor="vocab-search">
          Vocabulary &middot; {matches.length === SIGN_IDS.length ? `${SIGN_IDS.length} signs` : `${matches.length} of ${SIGN_IDS.length}`}
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
        <div className="vocabulary__filters" role="group" aria-label="Filter by confidence">
          {(['all', 'citation', 'approximate', 'uncertain'] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={`filter${fidelity === f ? ' filter--active' : ''}`}
              onClick={() => setFidelity(f)}
              aria-pressed={fidelity === f}
              title={f === 'all' ? 'Every sign' : FIDELITY_TITLE[f]}
            >
              {f === 'all' ? 'any confidence' : f}
            </button>
          ))}
        </div>
        <div className="vocabulary__filters" role="group" aria-label="Filter by category">
          <button
            type="button"
            className={`filter${category === 'all' ? ' filter--active' : ''}`}
            onClick={() => setCategory('all')}
            aria-pressed={category === 'all'}
          >
            all categories
          </button>
          {categories.map(([c, n]) => (
            <button
              key={c}
              type="button"
              className={`filter${category === c ? ' filter--active' : ''}`}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
            >
              {c} <span className="filter__count">{n}</span>
            </button>
          ))}
        </div>
      </div>

      {matches.length === 0 && (
        <p className="vocabulary__empty">
          No sign for &ldquo;{query.trim()}&rdquo;{category !== 'all' || fidelity !== 'all' ? ' with these filters' : ''}.
          Typing it into a sentence will fingerspell it.
        </p>
      )}

      <ul className="vocabulary__list">
        {matches.map((id) => {
          const sign = SIGNS[id]!;
          const words = WORDS_BY_SIGN.get(id) ?? [];
          const rating = sign.provenance.fidelity;
          return (
            <li key={id}>
              <button type="button" className="vocab" onClick={() => onPlay(id)}>
                <span className="vocab__gloss">{sign.gloss}</span>
                <span className="vocab__description">{sign.description}</span>
                {words.length > 0 && (
                  <span className="vocab__words">{words.slice(0, 8).join(' · ')}{words.length > 8 ? ' …' : ''}</span>
                )}
                <span className="vocab__badges">
                  <span className={`vocab__provenance vocab__provenance--${sign.provenance.validation}`}>
                    {sign.provenance.source === 'hand-authored' ? 'hand-authored' : sign.provenance.source}
                    {' · '}
                    {sign.provenance.validation}
                  </span>
                  {rating && (
                    <span
                      className={`vocab__fidelity vocab__fidelity--${rating}`}
                      title={FIDELITY_TITLE[rating]}
                    >
                      {rating}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
