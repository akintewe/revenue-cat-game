import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { compactCount } from '../format';
import { feedColors } from '../theme';

const ICON = {
  heart: require('../../../../assets/feed-icons/heart_regular.png') as ImageSource,
  repeat: require('../../../../assets/feed-icons/repeat_regular.png') as ImageSource,
  chat: require('../../../../assets/feed-icons/chat_3_regular.png') as ImageSource,
  share: require('../../../../assets/feed-icons/share_forward_regular.png') as ImageSource,
};

type Props = {
  likeCount: number;
  repostCount: number;
  commentCount: number;
  shareCount: number;
  liked: boolean;
  reposted: boolean;
  onLike: () => void;
  onRepost: () => void;
  onComment: () => void;
  onShare: () => void;
};

/** Frame 241: like, repost and comment on the left (16pt apart), share on the right. */
export function PostActions(props: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.group}>
        <Action
          label={props.liked ? 'Unlike' : 'Like'}
          count={props.likeCount}
          active={props.liked}
          onPress={props.onLike}
          icon={
            props.liked ? (
              <Ionicons name="heart" size={20} color={feedColors.accent} style={styles.filledHeart} />
            ) : (
              <Image source={ICON.heart} style={styles.icon} contentFit="contain" />
            )
          }
        />
        <Action
          label={props.reposted ? 'Undo repost' : 'Repost'}
          count={props.repostCount}
          active={props.reposted}
          onPress={props.onRepost}
          icon={
            <Image
              source={ICON.repeat}
              style={styles.icon}
              contentFit="contain"
              tintColor={props.reposted ? feedColors.accent : undefined}
            />
          }
        />
        <Action
          label="Comments"
          count={props.commentCount}
          onPress={props.onComment}
          icon={<Image source={ICON.chat} style={styles.icon} contentFit="contain" />}
        />
      </View>
      <Action
        label="Share"
        count={props.shareCount}
        onPress={props.onShare}
        icon={<Image source={ICON.share} style={styles.icon} contentFit="contain" />}
      />
    </View>
  );
}

function Action({
  icon,
  count,
  active,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  count: number;
  active?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.action}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `${label}, ${count}` : label}
    >
      {icon}
      {count > 0 && <Text style={[styles.count, active && styles.countActive]}>{compactCount(count)}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    width: 22,
    height: 22,
  },
  // The filled heart is 20pt. Centre it in the 22pt slot of the outline icon, so nothing shifts.
  filledHeart: {
    width: 22,
    height: 22,
    textAlign: 'center',
    lineHeight: 22,
  },
  count: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: 0.12,
    color: feedColors.muted,
  },
  countActive: {
    color: feedColors.accent,
  },
});
