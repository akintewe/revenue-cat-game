import type { Poll } from '../../services/social/feed';

/** The poll as it will look after the caller's vote lands. The server reply replaces it. */
export function moveVote(poll: Poll, optionId: string): Poll {
  const previous = poll.my_option_id;
  return {
    ...poll,
    my_option_id: optionId,
    total_votes: poll.total_votes + (previous ? 0 : 1),
    options: poll.options.map((o) => ({
      ...o,
      votes: o.votes + (o.id === optionId ? 1 : 0) - (o.id === previous ? 1 : 0),
    })),
  };
}
