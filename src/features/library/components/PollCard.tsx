import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../../../shared/theme/theme';
import type { Poll } from '../../../services/social/feed';

function timeRemaining(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 'Ended';
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `Ends in ${hours}hrs ${minutes}min`;
  return `Ends in ${minutes}min`;
}

export function PollCard({ poll, onVote }: { poll: Poll; onVote: (optionId: string) => void }) {
  const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0);
  const leadingId = poll.options.reduce(
    (best, o) => (o.votes > (best?.votes ?? -1) ? o : best),
    null as (typeof poll.options)[number] | null,
  )?.id;
  const hasVoted = poll.myVoteId != null;

  return (
    <View style={styles.root}>
      {poll.options.map((option) => {
        const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
        const isLeading = option.id === leadingId && totalVotes > 0;
        const isMine = option.id === poll.myVoteId;
        return (
          <Pressable
            key={option.id}
            style={styles.optionRow}
            onPress={() => onVote(option.id)}
            disabled={hasVoted}
          >
            <View
              style={[
                styles.optionFill,
                { width: `${hasVoted ? pct : 0}%` },
                isLeading && styles.optionFillLeading,
              ]}
            />
            <Text style={[styles.optionLabel, isMine && styles.optionLabelMine]} numberOfLines={1}>
              {option.label}
            </Text>
            {hasVoted && <Text style={styles.optionPct}>{pct}%</Text>}
          </Pressable>
        );
      })}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {totalVotes.toLocaleString()} {totalVotes === 1 ? 'Vote' : 'Votes'} · {timeRemaining(poll.endsAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
  },
  optionFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  optionFillLeading: {
    backgroundColor: colors.accent,
  },
  optionLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  optionLabelMine: {
    fontWeight: '700',
  },
  optionPct: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    backgroundColor: 'rgba(155,89,246,0.16)',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginTop: 2,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});
