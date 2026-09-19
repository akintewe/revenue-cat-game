import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, coverColors, discoverColors, radii, spacing } from '../../../shared/theme/theme';
import { ScreenBackground } from '../../../shared/components/ScreenBackground';
import { GameCover } from '../../../shared/components/GameCover';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { fetchMyProfile, type MyProfile } from '../../../services/social/profiles';
import { createPost, uploadPostImage, type FeedPost, type Poll, type PostCategory } from '../../../services/social/feed';
import { searchAllCatalog, resolveRemoteId } from '../../../services/catalog/unifiedCatalog';
import { isUuid } from '../../../shared/utils/id';
import type { CatalogGame } from '../../../data/catalog';
import { POST_CATEGORIES, PostCategoryPill, categoryLabel } from '../components/PostCategoryPill';
import type { RootScreenProps } from '../../../core/navigation/types';

type Props = RootScreenProps<'ComposePost'>;

const BODY_MAX = 500;
const MAX_POLL_OPTIONS = 4;
const POLL_DURATION_MS = 24 * 60 * 60 * 1000;
const QUICK_TAGS = ['Review', 'Started Playing', '#nowplaying', '#justcompleted', '#unlockedachievement'];
const SEARCH_DEBOUNCE_MS = 350;

type Attachment = 'none' | 'game' | 'image' | 'poll';

export function ComposePostScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((state) => state.session?.user.id);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const inputRef = useRef<TextInput>(null);

  const [body, setBody] = useState('');
  const [category, setCategory] = useState<PostCategory | null>(null);
  const [attachment, setAttachment] = useState<Attachment>('none');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [posting, setPosting] = useState(false);

  const [composerImage, setComposerImage] = useState<{ uri: string; mimeType: string } | null>(null);

  const [selectedGame, setSelectedGame] = useState<CatalogGame | null>(null);
  const [gameQuery, setGameQuery] = useState('');
  const [gameResults, setGameResults] = useState<CatalogGame[]>([]);
  const [gameSearching, setGameSearching] = useState(false);

  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  useEffect(() => {
    if (!userId) return;
    fetchMyProfile(userId).then(setProfile).catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    if (attachment !== 'game') {
      setGameResults([]);
      return;
    }
    const trimmed = gameQuery.trim();
    if (!trimmed) {
      setGameResults([]);
      return;
    }
    setGameSearching(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      searchAllCatalog(trimmed)
        .then(({ games }) => {
          if (!cancelled) setGameResults(games);
        })
        .finally(() => {
          if (!cancelled) setGameSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [gameQuery, attachment]);

  function insertTag(tag: string) {
    setBody((prev) => {
      if (!prev) return tag + ' ';
      const needsSpace = !prev.endsWith(' ') && !prev.endsWith('\n');
      return prev + (needsSpace ? ' ' : '') + tag + ' ';
    });
  }

  function chooseAttachment(next: Exclude<Attachment, 'none'>) {
    setShowAttachMenu(false);
    setAttachment(next);
    if (next === 'game') {
      setComposerImage(null);
      setPollOptions(['', '']);
    } else if (next === 'image') {
      setSelectedGame(null);
      setPollOptions(['', '']);
      handlePickImage();
    } else if (next === 'poll') {
      setComposerImage(null);
      setSelectedGame(null);
    }
  }

  function clearAttachment() {
    setAttachment('none');
    setComposerImage(null);
    setSelectedGame(null);
    setPollOptions(['', '']);
  }

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAttachment('none');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (result.canceled || result.assets.length === 0) {
      setAttachment('none');
      return;
    }
    const asset = result.assets[0];
    setComposerImage({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
  }

  function updatePollOption(index: number, text: string) {
    setPollOptions((prev) => {
      const next = [...prev];
      next[index] = text;
      if (index === next.length - 1 && text.trim() && next.length < MAX_POLL_OPTIONS) {
        next.push('');
      }
      return next;
    });
  }

  function removePollOption(index: number) {
    setPollOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  }

  const trimmedBody = body.trim();
  const validPollOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
  const pollReady = attachment !== 'poll' || validPollOptions.length >= 2;
  const canPost = Boolean(userId) && trimmedBody.length > 0 && trimmedBody.length <= BODY_MAX && pollReady && !posting;

  async function handlePost() {
    if (!canPost || !userId) return;
    setPosting(true);
    try {
      let imagePath: string | undefined;
      if (attachment === 'image' && composerImage) {
        imagePath = await uploadPostImage(userId, composerImage.uri, composerImage.mimeType);
      }
      let gameId: string | undefined;
      if (attachment === 'game' && selectedGame) {
        gameId = isUuid(selectedGame.id) ? selectedGame.id : (await resolveRemoteId(selectedGame.title)) ?? undefined;
      }

      const postId = await createPost({
        body: trimmedBody,
        category,
        gameId,
        imagePath,
        pollOptions: attachment === 'poll' && validPollOptions.length >= 2 ? validPollOptions : undefined,
        pollHours: POLL_DURATION_MS / (60 * 60 * 1000),
      });

      let poll: Poll | null = null;
      if (attachment === 'poll' && validPollOptions.length >= 2) {
        poll = {
          options: validPollOptions.map((label, i) => ({ id: `${postId}-opt-${i}`, label, votes: 0, voters: [] })),
          ends_at: new Date(Date.now() + POLL_DURATION_MS).toISOString(),
          total_votes: 0,
          my_option_id: null,
        };
      }

      const optimisticPost: FeedPost = {
        id: postId,
        body: trimmedBody,
        link_url: null,
        image_path: imagePath ?? null,
        created_at: new Date().toISOString(),
        edited_at: null,
        author_id: userId,
        handle: profile?.handle ?? '',
        display_name: profile?.display_name ?? '',
        avatar_color: profile?.avatar_color ?? 'slate',
        game_id: gameId ?? null,
        game_title: selectedGame?.title ?? null,
        game_cover: selectedGame?.coverImageUrl ?? null,
        game_artwork: null,
        game_year: null,
        game_genres: null,
        game_rating: null,
        game_platforms: null,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        liked_by_me: false,
        category,
        poll,
        repost_count: 0,
        reposted_by_me: false,
        reposted_by_handle: null,
        reposted_by_name: null,
        reason: 'self',
      };

      route.params.onPostCreated(optimisticPost);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Could not post', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.authorRow}>
            <View style={[styles.avatar, profile && { backgroundColor: coverColors[profile.avatar_color] ?? coverColors.slate }]} />
            <View>
              <Text style={styles.authorName}>{profile?.display_name ?? 'You'}</Text>
              <Text style={styles.authorHandle}>@{profile?.handle ?? ''}</Text>
            </View>
          </View>

          <TextInput
            ref={inputRef}
            value={body}
            onChangeText={(t) => setBody(t.slice(0, BODY_MAX))}
            placeholder="What are you currently playing?"
            placeholderTextColor={colors.textFaint}
            style={styles.textInput}
            multiline
            autoFocus
          />

          {attachment === 'image' && composerImage && (
            <View style={styles.imagePreviewWrap}>
              <Image source={{ uri: composerImage.uri }} style={styles.imagePreview} contentFit="cover" />
              <Pressable style={styles.removeChip} onPress={clearAttachment} hitSlop={8}>
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          )}

          {attachment === 'game' && (
            <View style={styles.gameAttach}>
              {selectedGame ? (
                <View style={styles.gameChip}>
                  <GameCover
                    abbreviation={selectedGame.abbreviation}
                    colorKey={selectedGame.colorKey}
                    imageUrl={selectedGame.coverImageUrl}
                    size={44}
                  />
                  <Text style={styles.gameChipTitle} numberOfLines={1}>
                    {selectedGame.title}
                  </Text>
                  <Pressable onPress={clearAttachment} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color={discoverColors.mutedText} />
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={styles.searchBar}>
                    <Ionicons name="search" size={16} color={discoverColors.mutedText} />
                    <TextInput
                      value={gameQuery}
                      onChangeText={setGameQuery}
                      placeholder="Search a game to attach"
                      placeholderTextColor={discoverColors.mutedText}
                      style={styles.searchInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {gameSearching && <ActivityIndicator size="small" color={colors.accent} />}
                  </View>
                  {gameResults.slice(0, 6).map((game) => (
                    <Pressable key={game.id} style={styles.gameResultRow} onPress={() => setSelectedGame(game)}>
                      <GameCover abbreviation={game.abbreviation} colorKey={game.colorKey} imageUrl={game.coverImageUrl} size={40} />
                      <Text style={styles.gameResultTitle} numberOfLines={1}>
                        {game.title}
                      </Text>
                    </Pressable>
                  ))}
                </>
              )}
            </View>
          )}

          {attachment === 'poll' && (
            <View style={styles.pollAttach}>
              {pollOptions.map((option, index) => (
                <View key={index} style={styles.pollOptionRow}>
                  <Ionicons name="reorder-two" size={18} color={discoverColors.mutedText} />
                  <TextInput
                    value={option}
                    onChangeText={(t) => updatePollOption(index, t)}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor={discoverColors.mutedText}
                    style={styles.pollOptionInput}
                    maxLength={40}
                  />
                  {pollOptions.length > 2 && (
                    <Pressable onPress={() => removePollOption(index)} hitSlop={8}>
                      <Ionicons name="remove-circle" size={20} color={discoverColors.mutedText} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={styles.tagsRow}>
            <Text style={styles.tagsLabel}>Activity</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsScroll}>
              {QUICK_TAGS.map((tag) => (
                <Pressable key={tag} style={styles.tagChip} onPress={() => insertTag(tag)}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.tagsRow}>
            <Text style={styles.tagsLabel}>Topic</Text>
            <View style={styles.tagsScroll}>
              {POST_CATEGORIES.map((cat) => (
                <Pressable key={cat} onPress={() => setCategory((prev) => (prev === cat ? null : cat))}>
                  <View style={category !== cat && styles.categoryDim}>
                    <PostCategoryPill category={cat} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={[styles.toolbar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <View style={styles.toolbarIcons}>
            <Pressable style={styles.toolbarIcon} onPress={() => setShowAttachMenu((v) => !v)} hitSlop={8}>
              <Ionicons
                name={attachment === 'image' ? 'image' : 'image-outline'}
                size={20}
                color={attachment === 'image' ? colors.accent : discoverColors.mutedText}
              />
            </Pressable>
            <Pressable style={styles.toolbarIcon} onPress={() => setShowAttachMenu((v) => !v)} hitSlop={8}>
              <Ionicons
                name={attachment === 'game' ? 'game-controller' : 'game-controller-outline'}
                size={20}
                color={attachment === 'game' ? colors.accent : discoverColors.mutedText}
              />
            </Pressable>
            <Pressable style={styles.toolbarIcon} onPress={() => setShowAttachMenu((v) => !v)} hitSlop={8}>
              <Ionicons
                name="bar-chart"
                size={20}
                color={attachment === 'poll' ? colors.accent : discoverColors.mutedText}
              />
            </Pressable>
          </View>

          {showAttachMenu && (
            <View style={styles.attachMenu}>
              <Pressable style={styles.attachMenuRow} onPress={() => chooseAttachment('game')}>
                <Ionicons name="game-controller-outline" size={16} color={colors.text} />
                <Text style={styles.attachMenuText}>Attach Game</Text>
              </Pressable>
              <Pressable style={styles.attachMenuRow} onPress={() => chooseAttachment('image')}>
                <Ionicons name="image-outline" size={16} color={colors.text} />
                <Text style={styles.attachMenuText}>Attach Image</Text>
              </Pressable>
              <Pressable style={styles.attachMenuRow} onPress={() => chooseAttachment('poll')}>
                <Ionicons name="bar-chart-outline" size={16} color={colors.text} />
                <Text style={styles.attachMenuText}>Attach Poll</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.visibilityPill}>
            <Text style={styles.visibilityText}>Public</Text>
            <Ionicons name="chevron-down" size={14} color={discoverColors.mutedText} />
          </View>

          <Pressable style={[styles.postButton, !canPost && styles.postButtonDisabled]} onPress={handlePost} disabled={!canPost}>
            {posting ? (
              <ActivityIndicator color={colors.onAccent} size="small" />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  body: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: discoverColors.rowBg,
  },
  authorName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  authorHandle: {
    color: colors.textMuted,
    fontSize: 13,
  },
  textInput: {
    color: colors.text,
    fontSize: 17,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  imagePreviewWrap: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  imagePreview: {
    width: 140,
    height: 105,
    borderRadius: radii.md,
    backgroundColor: discoverColors.rowBg,
  },
  removeChip: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameAttach: {
    gap: spacing.xs,
  },
  gameChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: discoverColors.rowBg,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  gameChipTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: discoverColors.rowBg,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
  },
  gameResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  gameResultTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
  },
  pollAttach: {
    gap: spacing.sm,
  },
  pollOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: discoverColors.rowBg,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  pollOptionInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
  },
  tagsRow: {
    gap: spacing.xs,
  },
  tagsLabel: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '700',
  },
  tagsScroll: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  tagChip: {
    backgroundColor: discoverColors.rowBg,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
  },
  tagChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryDim: {
    opacity: 0.5,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  toolbarIcons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  toolbarIcon: {
    padding: 2,
  },
  attachMenu: {
    position: 'absolute',
    bottom: 56,
    left: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.xs,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  attachMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  attachMenuText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  visibilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  visibilityText: {
    color: discoverColors.mutedText,
    fontSize: 13,
    fontWeight: '600',
  },
  postButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  postButtonDisabled: {
    opacity: 0.4,
  },
  postButtonText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 14,
  },
});
