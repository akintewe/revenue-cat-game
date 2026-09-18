import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { Alert, Share } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  deletePost,
  likePost,
  recordShare,
  repostPost,
  unlikePost,
  unrepostPost,
  votePoll,
  type FeedPost,
} from '../../../services/social/feed';
import { blockUser, reportContent } from '../../../services/social/moderation';
import { useAuthStore } from '../../auth/store/useAuthStore';
import type { RootStackParamList } from '../../../core/navigation/types';
import type { PostCardHandlers } from '../components/PostCard';
import { moveVote } from '../poll';

const REPORT_REASONS = ['Spam', 'Harassment', 'Inappropriate content', 'Impersonation', 'Other'];

type Options = {
  setPosts: Dispatch<SetStateAction<FeedPost[]>>;
  /** The detail screen passes false: it already is the post's page. */
  canOpen?: boolean;
  /** Called after the caller deletes a post or blocks its author. */
  onRemoved?: (post: FeedPost) => void;
};

/**
 * Everything a PostCard can do. Likes, reposts, votes and shares change the list at once and
 * roll back if the server refuses.
 */
export function usePostHandlers({ setPosts, canOpen = true, onRemoved }: Options): PostCardHandlers {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const userId = useAuthStore((state) => state.session?.user.id);

  return useMemo(() => {
    const patch = (id: string, change: (post: FeedPost) => FeedPost) =>
      setPosts((prev) => prev.map((p) => (p.id === id ? change(p) : p)));
    const remove = (match: (post: FeedPost) => boolean) => setPosts((prev) => prev.filter((p) => !match(p)));

    function open(post: FeedPost) {
      navigation.navigate('PostDetail', {
        post,
        onPostUpdated: (updated) => patch(updated.id, () => updated),
        onPostDeleted: (postId) => remove((p) => p.id === postId),
      });
    }

    function toggleLike(post: FeedPost) {
      if (!userId) return;
      const was = post.liked_by_me;
      const flip = (p: FeedPost, on: boolean) => ({ ...p, liked_by_me: on, like_count: p.like_count + (on ? 1 : -1) });
      patch(post.id, (p) => flip(p, !was));
      (was ? unlikePost(userId, post.id) : likePost(userId, post.id)).catch((err) => {
        console.warn('[feed] like failed', err);
        patch(post.id, (p) => flip(p, was));
      });
    }

    function toggleRepost(post: FeedPost) {
      if (!userId) return;
      const was = post.reposted_by_me;
      const flip = (p: FeedPost, on: boolean) => ({
        ...p,
        reposted_by_me: on,
        repost_count: p.repost_count + (on ? 1 : -1),
      });
      patch(post.id, (p) => flip(p, !was));
      (was ? unrepostPost(userId, post.id) : repostPost(userId, post.id)).catch((err) => {
        console.warn('[feed] repost failed', err);
        patch(post.id, (p) => flip(p, was));
      });
    }

    async function share(post: FeedPost) {
      const game = post.game_title ? ` (${post.game_title})` : '';
      try {
        const result = await Share.share({
          message: `${post.display_name} (@${post.handle}) on Prysm${game}: “${post.body}”`,
        });
        if (result.action !== Share.sharedAction || !userId) return;
        patch(post.id, (p) => ({ ...p, share_count: p.share_count + 1 }));
        await recordShare(userId, post.id);
      } catch (err) {
        console.warn('[feed] share failed', err);
      }
    }

    function vote(post: FeedPost, optionId: string) {
      if (!userId || !post.poll) return;
      const before = post.poll;
      patch(post.id, (p) => ({ ...p, poll: p.poll && moveVote(p.poll, optionId) }));
      votePoll(post.id, optionId)
        .then((poll) => patch(post.id, (p) => ({ ...p, poll })))
        .catch((err) => {
          console.warn('[feed] vote failed', err);
          patch(post.id, (p) => ({ ...p, poll: before }));
          Alert.alert('Could not vote', 'This poll may have closed.');
        });
    }

    function more(post: FeedPost) {
      if (!userId) return;
      if (post.author_id === userId) {
        Alert.alert('Delete post?', "This can't be undone.", [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              remove((p) => p.id === post.id);
              onRemoved?.(post);
              deletePost(post.id).catch((err) => {
                console.warn('[feed] delete failed', err);
                Alert.alert('Could not delete', 'Please try again.');
              });
            },
          },
        ]);
        return;
      }
      Alert.alert(`@${post.handle}`, undefined, [
        {
          text: 'Block this account',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Block this account?', 'You will no longer see each other on Prysm.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Block',
                style: 'destructive',
                onPress: () => {
                  blockUser(userId, post.author_id)
                    .then(() => {
                      remove((p) => p.author_id === post.author_id);
                      onRemoved?.(post);
                    })
                    .catch((err) => console.warn('[moderation] blockUser failed', err));
                },
              },
            ]),
        },
        {
          text: 'Report post',
          onPress: () =>
            Alert.alert('Report this post', 'What best describes the issue?', [
              ...REPORT_REASONS.map((reason) => ({
                text: reason,
                onPress: () => {
                  reportContent(userId, 'post', post.id, reason).catch((err) =>
                    console.warn('[moderation] reportContent failed', err),
                  );
                  Alert.alert('Reported', "Thanks — we've received your report.");
                },
              })),
              { text: 'Cancel', style: 'cancel' as const },
            ]),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }

    return {
      onOpen: canOpen ? open : undefined,
      onAuthorPress: (handle) => navigation.navigate('FriendProfile', { handle }),
      onGamePress: (catalogId) => navigation.navigate('GameDetail', { catalogId }),
      onLike: toggleLike,
      onRepost: toggleRepost,
      onComment: canOpen ? open : () => undefined,
      onShare: share,
      onVote: vote,
      onMore: more,
    };
  }, [navigation, userId, setPosts, canOpen, onRemoved]);
}
