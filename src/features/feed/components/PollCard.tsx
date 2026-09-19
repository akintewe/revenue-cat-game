import React, { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from '../../../shared/components/Avatar';
import type { Poll, PollOption } from '../../../services/social/feed';
import { pollTimeLeft, voteCountLabel } from '../format';
import { feedColors, feedLayout } from '../theme';

type Props = {
  poll: Poll;
  onVote?: (optionId: string) => void;
};

/**
 * Frame 295. Before the caller votes, the rows show the split with no fill (the mock's right
 * phone). After a vote, or once the poll ends, each row fills to its share and the caller's
 * pick turns orange (the left phone). Tapping another row moves the vote while the poll is open.
 */
export function PollCard({ poll, onVote }: Props) {
  const now = useMinuteClock();
  const ended = new Date(poll.ends_at).getTime() <= now;
  const showFill = poll.my_option_id !== null || ended;

  return (
    <View style={styles.poll}>
      {poll.options.map((option) => (
        <OptionRow
          key={option.id}
          option={option}
          total={poll.total_votes}
          showFill={showFill}
          mine={option.id === poll.my_option_id}
          onPress={!ended && onVote && option.id !== poll.my_option_id ? () => onVote(option.id) : undefined}
        />
      ))}
      <LinearGradient colors={feedColors.pollFooter} style={styles.footer}>
        <Text style={styles.footerText}>{voteCountLabel(poll.total_votes)}</Text>
        <View style={styles.footerDot} />
        <Text style={styles.footerText}>{pollTimeLeft(poll.ends_at, now)}</Text>
      </LinearGradient>
    </View>
  );
}

function OptionRow({
  option,
  total,
  showFill,
  mine,
  onPress,
}: {
  option: PollOption;
  total: number;
  showFill: boolean;
  mine: boolean;
  onPress?: () => void;
}) {
  const percent = total > 0 ? Math.round((option.votes * 100) / total) : 0;
  const target = showFill ? percent : 0;
  const [width] = useState(() => new Animated.Value(target));

  useEffect(() => {
    Animated.timing(width, { toValue: target, duration: 320, useNativeDriver: false }).start();
  }, [target, width]);

  return (
    <View style={styles.optionRow}>
      <Pressable
        style={styles.bar}
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={`${option.label}, ${percent} percent`}
        accessibilityState={{ selected: mine }}
      >
        <Animated.View
          style={[
            styles.fill,
            mine && styles.fillMine,
            { width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) },
          ]}
        />
        <Text style={styles.label} numberOfLines={1}>
          {option.label}
        </Text>
        <Text style={[styles.percent, mine && styles.percentMine]}>{percent}%</Text>
      </Pressable>
      <VoterStack voters={option.voters} />
    </View>
  );
}

/** Frame 297: up to three 24pt faces, 12pt apart, the first one on top. */
function VoterStack({ voters }: { voters: PollOption['voters'] }) {
  return (
    <View style={styles.voters}>
      {voters.slice(0, 3).map((voter, index) => (
        <Avatar
          key={voter.handle}
          handle={voter.handle}
          color={voter.avatar_color}
          size={feedLayout.voterSize}
          ringColor={feedColors.background}
          style={{ marginLeft: index === 0 ? 0 : -12, zIndex: 3 - index }}
        />
      ))}
    </View>
  );
}

/** Re-renders once a minute, so "Ends in …" keeps counting down while the feed is open. */
function useMinuteClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const styles = StyleSheet.create({
  poll: {
    gap: 8,
  },
  optionRow: {
    height: feedLayout.pollRowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bar: {
    flex: 1,
    height: feedLayout.pollRowHeight,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 2,
    overflow: 'hidden',
    backgroundColor: feedColors.pollTrack,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 12,
    backgroundColor: feedColors.pollFill,
  },
  fillMine: {
    backgroundColor: feedColors.accent,
  },
  label: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.13,
    color: feedColors.pollLabel,
  },
  percent: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.13,
    color: feedColors.pollPercent,
  },
  percentMine: {
    color: feedColors.accent,
  },
  voters: {
    width: 48,
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    height: 29,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: feedColors.pollFooterBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '500',
    letterSpacing: 0.22,
    color: feedColors.pollFooterText,
  },
  footerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: feedColors.pollFooterText,
  },
});
