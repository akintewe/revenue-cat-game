import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../../shared/components/Avatar';
import { timeAgo } from '../../../shared/utils/formatDate';
import { postImageUrl, type FeedPost } from '../../../services/social/feed';
import { CategoryChip } from './CategoryChip';
import { GameCard } from './GameCard';
import { PollCard } from './PollCard';
import { PostActions } from './PostActions';
import { RichText } from './RichText';
import { feedColors, feedLayout } from '../theme';

const REPEAT = require('../../../../assets/feed-icons/repeat_regular.png') as ImageSource;

export type PostCardHandlers = {
  onOpen?: (post: FeedPost) => void;
  onAuthorPress: (handle: string) => void;
  onGamePress: (gameId: string) => void;
  onLike: (post: FeedPost) => void;
  onRepost: (post: FeedPost) => void;
  onComment: (post: FeedPost) => void;
  onShare: (post: FeedPost) => void;
  onVote: (post: FeedPost, optionId: string) => void;
  onMore: (post: FeedPost) => void;
};

/**
 * One post, from Frame 251: a 40pt avatar, 16pt gap, then a column of header, body, one
 * attachment (poll, game card or photo) and the action row, 14pt apart.
 */
export function PostCard({ post, ...handlers }: { post: FeedPost } & PostCardHandlers) {
  const open = handlers.onOpen ? () => handlers.onOpen!(post) : undefined;

  return (
    <View>
      {post.reposted_by_handle && (
        <Pressable style={styles.repostedBy} onPress={() => handlers.onAuthorPress(post.reposted_by_handle!)}>
          <Image source={REPEAT} style={styles.repostedIcon} contentFit="contain" />
          <Text style={styles.repostedText} numberOfLines={1}>
            {post.reposted_by_name ?? `@${post.reposted_by_handle}`} reposted
          </Text>
        </Pressable>
      )}

      {/* accessible={false}: otherwise iOS merges the post into one element and VoiceOver
          cannot reach the like, repost, share or menu buttons inside it. */}
      <Pressable style={styles.post} onPress={open} disabled={!open} accessible={false}>
        <Pressable
          onPress={() => handlers.onAuthorPress(post.handle)}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={`${post.display_name}'s profile`}
        >
          <Avatar handle={post.handle} color={post.avatar_color} size={feedLayout.avatar} />
        </Pressable>

        <View style={styles.column}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <View style={styles.nameRow}>
                <Pressable style={styles.names} onPress={() => handlers.onAuthorPress(post.handle)} hitSlop={4}>
                  <Text style={styles.name} numberOfLines={1}>
                    {post.display_name}
                  </Text>
                  <Text style={styles.handle} numberOfLines={1}>
                    @{post.handle}
                  </Text>
                </Pressable>
                <Text style={styles.time}>{timeAgo(post.created_at)}</Text>
              </View>
              {post.category && <CategoryChip category={post.category} />}
            </View>
            <Pressable
              onPress={() => handlers.onMore(post)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="More options"
            >
              <Ionicons name="ellipsis-vertical" size={16} color={feedColors.icon} style={styles.more} />
            </Pressable>
          </View>

          <RichText text={post.body} style={styles.body} onMentionPress={handlers.onAuthorPress} />

          {/* One attachment per post, as in the mock: a poll, else a photo, else the game card. */}
          {post.poll ? (
            <PollCard poll={post.poll} onVote={(optionId) => handlers.onVote(post, optionId)} />
          ) : post.image_path ? (
            <Image
              source={{ uri: postImageUrl(post.image_path) }}
              style={styles.photo}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : post.game_id && post.game_title ? (
            <GameCard post={post} onPress={() => handlers.onGamePress(post.game_id!)} />
          ) : null}

          <PostActions
            likeCount={post.like_count}
            repostCount={post.repost_count}
            commentCount={post.comment_count}
            shareCount={post.share_count}
            liked={post.liked_by_me}
            reposted={post.reposted_by_me}
            onLike={() => handlers.onLike(post)}
            onRepost={() => handlers.onRepost(post)}
            onComment={() => handlers.onComment(post)}
            onShare={() => handlers.onShare(post)}
          />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  repostedBy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: feedLayout.avatar + feedLayout.avatarGap,
    marginBottom: 6,
  },
  repostedIcon: {
    width: 14,
    height: 14,
  },
  repostedText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: 0.12,
    color: feedColors.muted,
  },
  post: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: feedLayout.avatarGap,
  },
  column: {
    flex: 1,
    paddingVertical: 4,
    gap: feedLayout.sectionGap,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 4,
  },
  headerText: {
    flex: 1,
    paddingHorizontal: 4,
    gap: 4,
  },
  nameRow: {
    height: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
  },
  names: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0.15,
    color: feedColors.name,
  },
  handle: {
    flexShrink: 2,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0.15,
    color: feedColors.muted,
  },
  time: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: 0.12,
    color: feedColors.muted,
  },
  // more_2_filled: a 20pt frame, the dots centred in it.
  more: {
    width: 20,
    height: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  body: {
    paddingHorizontal: 4,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.13,
    color: feedColors.body,
  },
  photo: {
    width: '100%',
    aspectRatio: feedLayout.photoAspect,
    borderRadius: feedLayout.cardRadius,
    backgroundColor: '#181615',
  },
});
