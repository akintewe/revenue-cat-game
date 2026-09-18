import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, coverColors, discoverColors, radii, spacing } from '../../../shared/theme/theme';
import { PlatformIcon } from '../../../shared/components/PlatformIcon';
import { timeAgo } from '../../../shared/utils/formatDate';
import { parsePostText } from '../../../shared/utils/postText';
import { resolveCatalogGame } from '../../../services/catalog/unifiedCatalog';
import { postImageUrl, type FeedPost } from '../../../services/social/feed';
import type { CatalogGame } from '../../../data/catalog';
import { PostCategoryPill } from './PostCategoryPill';
import { PollCard } from './PollCard';

type Props = {
  post: FeedPost;
  onPressAuthor: () => void;
  onOpenDetail: () => void;
  onToggleLike: () => void;
  onRepost: () => void;
  onShare: () => void;
  onMoreOptions: () => void;
  onVotePoll: (optionId: string) => void;
  onPressGame?: (catalogId: string) => void;
};

export function PostRichText({ text, style }: { text: string; style?: object }) {
  const segments = parsePostText(text);
  return (
    <Text style={style}>
      {segments.map((seg, i) =>
        seg.type === 'text' ? (
          <Text key={i}>{seg.value}</Text>
        ) : (
          <Text key={i} style={styles.token}>
            {seg.value}
          </Text>
        ),
      )}
    </Text>
  );
}

export function PostCard({
  post,
  onPressAuthor,
  onOpenDetail,
  onToggleLike,
  onRepost,
  onShare,
  onMoreOptions,
  onVotePoll,
  onPressGame,
}: Props) {
  const [gameDetails, setGameDetails] = useState<CatalogGame | null>(null);

  useEffect(() => {
    if (!post.game_id) {
      setGameDetails(null);
      return;
    }
    let cancelled = false;
    resolveCatalogGame(post.game_id).then((game) => {
      if (!cancelled && game) setGameDetails(game);
    });
    return () => {
      cancelled = true;
    };
  }, [post.game_id]);

  return (
    <Pressable style={styles.card} onPress={onOpenDetail}>
      <View style={styles.header}>
        <Pressable style={styles.authorTapArea} onPress={onPressAuthor} hitSlop={4}>
          <View style={[styles.avatar, { backgroundColor: coverColors[post.avatar_color] ?? coverColors.slate }]} />
          <View style={styles.headerText}>
            <Text style={styles.name}>{post.display_name}</Text>
            <Text style={styles.handle}>@{post.handle}</Text>
          </View>
        </Pressable>
        <Text style={styles.time}>{timeAgo(post.created_at)}</Text>
        <Pressable style={styles.moreButton} onPress={onMoreOptions} hitSlop={8}>
          <Ionicons name="ellipsis-vertical" size={16} color={discoverColors.mutedText} />
        </Pressable>
      </View>

      {post.category && (
        <View style={styles.categoryRow}>
          <PostCategoryPill category={post.category} />
        </View>
      )}

      {post.body ? <PostRichText text={post.body} style={styles.body} /> : null}

      {post.poll ? (
        <PollCard poll={post.poll} onVote={onVotePoll} />
      ) : post.game_id ? (
        <Pressable
          style={styles.gameCard}
          onPress={() => post.game_id && onPressGame?.(post.game_id)}
        >
          {post.game_cover && (
            <Image source={{ uri: post.game_cover }} style={StyleSheet.absoluteFill} contentFit="cover" />
          )}
          <LinearGradient
            colors={['rgba(9,9,9,0.05)', 'rgba(9,9,9,0.15)', 'rgba(9,9,9,0.85)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          {gameDetails && (
            <View style={styles.gameCardTopRow}>
              {gameDetails.year && <Text style={styles.gameCardYear}>{gameDetails.year}</Text>}
              <PlatformIcon platform={gameDetails.platform} size={14} color="#FFFFFF" />
            </View>
          )}
          <View style={styles.gameCardBottom}>
            <Text style={styles.gameCardTitle} numberOfLines={2}>
              {post.game_title}
            </Text>
            {gameDetails && (
              <View style={styles.gameCardMetaRow}>
                {gameDetails.genre && (
                  <View style={styles.genrePill}>
                    <Text style={styles.genrePillText}>{gameDetails.genre}</Text>
                  </View>
                )}
                {gameDetails.criticScore != null && (
                  <View style={styles.ratingRow}>
                    <Text style={styles.ratingText}>{gameDetails.criticScore.toFixed(1)}</Text>
                    <Ionicons name="star" size={12} color="#F2C744" />
                  </View>
                )}
              </View>
            )}
          </View>
        </Pressable>
      ) : post.image_path ? (
        <Image source={{ uri: postImageUrl(post.image_path) }} style={styles.image} contentFit="cover" />
      ) : null}

      <View style={styles.actions}>
        <Pressable style={styles.actionButton} hitSlop={8} onPress={onToggleLike}>
          <Ionicons
            name={post.liked_by_me ? 'heart' : 'heart-outline'}
            size={18}
            color={post.liked_by_me ? colors.accent : discoverColors.mutedText}
          />
          {post.like_count > 0 && <Text style={styles.actionCount}>{post.like_count}</Text>}
        </Pressable>
        <Pressable style={styles.actionButton} hitSlop={8} onPress={onRepost}>
          <Ionicons
            name="repeat-outline"
            size={19}
            color={post.reposted_by_me ? colors.success : discoverColors.mutedText}
          />
          {(post.repost_count ?? 0) > 0 && <Text style={styles.actionCount}>{post.repost_count}</Text>}
        </Pressable>
        <Pressable style={styles.actionButton} hitSlop={8} onPress={onOpenDetail}>
          <Ionicons name="chatbubble-outline" size={17} color={discoverColors.mutedText} />
          {post.comment_count > 0 && <Text style={styles.actionCount}>{post.comment_count}</Text>}
        </Pressable>
        <Pressable style={[styles.actionButton, styles.shareButton]} hitSlop={8} onPress={onShare}>
          <Ionicons name="arrow-redo-outline" size={18} color={discoverColors.mutedText} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  authorTapArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  handle: {
    color: discoverColors.mutedText,
    fontSize: 13,
  },
  time: {
    color: discoverColors.mutedText,
    fontSize: 13,
  },
  moreButton: {
    marginLeft: spacing.xs,
    padding: 2,
  },
  categoryRow: {
    flexDirection: 'row',
  },
  body: {
    color: discoverColors.titleText,
    fontSize: 14,
    lineHeight: 20,
  },
  token: {
    color: colors.accent,
    fontWeight: '600',
  },
  image: {
    height: 180,
    borderRadius: radii.md,
    backgroundColor: discoverColors.rowBg,
  },
  gameCard: {
    height: 200,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: discoverColors.rowBg,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  gameCardTopRow: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    alignItems: 'center',
    gap: 6,
  },
  gameCardYear: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  gameCardBottom: {
    gap: 6,
  },
  gameCardTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  gameCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  genrePill: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  genrePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 2,
  },
  shareButton: {
    marginLeft: 'auto',
  },
  actionCount: {
    color: discoverColors.mutedText,
    fontSize: 12,
    fontWeight: '600',
  },
});
