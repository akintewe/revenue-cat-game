import type { Poll } from '../../../services/social/feed';
import { moveVote } from '../poll';

const poll = (my: string | null, votes: [number, number, number]): Poll => ({
  ends_at: '2026-09-18T12:00:00Z',
  total_votes: votes[0] + votes[1] + votes[2],
  my_option_id: my,
  options: ['a', 'b', 'c'].map((id, i) => ({ id, label: id.toUpperCase(), votes: votes[i], voters: [] })),
});

describe('moveVote', () => {
  it('adds a first vote to the option and to the total', () => {
    const next = moveVote(poll(null, [3, 1, 0]), 'b');
    expect(next.my_option_id).toBe('b');
    expect(next.total_votes).toBe(5);
    expect(next.options.map((o) => o.votes)).toEqual([3, 2, 0]);
  });

  it('moves an earlier vote without changing the total', () => {
    const next = moveVote(poll('a', [3, 1, 0]), 'c');
    expect(next.my_option_id).toBe('c');
    expect(next.total_votes).toBe(4);
    expect(next.options.map((o) => o.votes)).toEqual([2, 1, 1]);
  });

  it('does not change the poll it was given', () => {
    const before = poll('a', [3, 1, 0]);
    moveVote(before, 'b');
    expect(before.options.map((o) => o.votes)).toEqual([3, 1, 0]);
    expect(before.my_option_id).toBe('a');
  });
});
