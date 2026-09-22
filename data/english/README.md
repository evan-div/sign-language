# English frequency list

`frequency-top2000.txt` is the 2,000 most frequent English words, in rank order,
one per line.

**Provenance.** The ranking comes from Google's Trillion Word Corpus by way of
Peter Norvig's `count_1w` list, distributed as `google-10000-english-usa.txt` in
the `first20hours/google-10000-english` repository. Only the top 2,000 are
vendored here, which is what the coverage measurement uses.

**Why it is here.** Coverage has to be measured against a word list that was not
chosen by the same person who chose the vocabulary, or the number means nothing.
This one was fixed before SignFlow existed and has no connection to ASL, which
is exactly what makes it a fair test. It is vendored rather than fetched so the
measurement reproduces without a network.

**Licensing.** The word list is a frequency ranking derived from a public corpus.
It is used here only as a test fixture -- nothing in the shipped product reads
it. Confirm the upstream terms before any commercial use, as with every other
third-party asset in this repository.

**What it is not.** It is web text, not conversation. Words people would actually
type into a sign-language app skew more conversational than this, so treat the
resulting coverage figure as a lower bound on everyday input and an upper bound
on nothing.
