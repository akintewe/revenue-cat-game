# Vague search: it works, but it feels slow — can we shave the latency down?

Feedback from the client side, 19 September 2026, after wiring up and live-testing
`/functions/v1/vague-search` end to end against the real deployed endpoint.

## It's working correctly

Ran the exact example query from `time-to-beat-for-sola.md` §2
("the one where you play a bald assassin with a barcode tattoo on the back of his
head") straight through the real job-creation + polling flow. It resolved in one
run at **~15 seconds**, `confidence: 0.9`, candidates `Hitman, Hitman: Codename 47,
Hitman: Blood Money, Hitman 2, Hitman 3` — matching your own documented sample
response exactly. The two-call job/poll pattern, the `fromCache` flag, and the
`done`/`error`/empty-candidates states are all handled client-side and behave as
documented. No bug report here — this is a UX/perf ask.

## The ask: can this come down?

Even at ~15s (inside your stated median of 25.7s), it's a long wait for a mobile
interaction that's meant to feel magical, not like submitting a support ticket. The
client already does what we can on our end — a real "still thinking" state with
rotating reassurance copy rather than a bare spinner, so 15-70s doesn't read as
frozen — but that's covering for the latency, not fixing it. If there's headroom to
make the common case faster, it would meaningfully change how this feature feels,
especially since you've flagged it as "the most impressive thing the app does" and
the thing worth Pro-gating.

A few concrete questions, since we don't have visibility into the model/infra
choices behind the two calls (DeepSeek + Voyage per the doc):

1. **Is the median (25.7s) mostly one slow step, or spread evenly across the
   pipeline?** If it's dominated by one call (e.g. the embedding step throttled at
   3 req/min on Voyage's free plan), upgrading just that one piece might move the
   median a lot more than optimizing everything evenly.
2. **Is there a cheaper/faster model tier that would trade a little accuracy for a
   lot of latency**, at least as a first-pass fast guess the user could accept or
   fall through to the slower/more-accurate path on rejection?
3. **Could the job expose intermediate progress** (e.g. `status: 'processing'`
   already exists — could it carry a sub-stage like `'embedding'` /
   `'matching'` / `'ranking'`?) so the client can show something more informative
   than a generic "still thinking," even if the total time doesn't change? Perceived
   wait often matters as much as actual wait.
4. **Is the p90/max (68.8s / 227.5s) driven by retries or rate-limit backoff**
   rather than genuine compute time? If so, a paid tier bump on whichever service is
   throttling might be the highest-leverage fix available.

Not asking for a specific number — just flagging that "it works" and "it feels
fast enough to ship as the flagship feature" are two different bars, and right now
we're only confidently at the first one. Let us know what's actually tunable on
your end versus what's an inherent floor, and we'll adjust the client-side framing
(and the Pro-gating copy in `prysm-pro-for-sola.md` §4.1) accordingly either way.
