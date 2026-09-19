import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Avatar } from '../../../shared/components/Avatar';
import { GameCover } from '../../../shared/components/GameCover';
import { useResolvedGames } from '../../../shared/hooks/useResolvedGames';
import { isUuid } from '../../../shared/utils/id';
import { resolveRemoteId, searchAllCatalog } from '../../../services/catalog/unifiedCatalog';
import { createPost, uploadPostImage, type PostCategory } from '../../../services/social/feed';
import { fetchMyProfile, searchUsers, type MyProfile, type ProfileSummary } from '../../../services/social/profiles';
import type { CatalogGame } from '../../../data/catalog';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useLibraryStore } from '../../library/store/useLibraryStore';
import type { RootScreenProps } from '../../../core/navigation/types';
import { CategoryChip } from '../components/CategoryChip';
import { GameCard } from '../components/GameCard';
import { useFeedStore } from '../store/useFeedStore';
import { CATEGORIES, feedColors, feedLayout } from '../theme';

const MAX_BODY = 500;
const MAX_OPTION = 40;
/** One tap adds the tag to the end of the text. */
const QUICK_TAGS = ['Review', 'Started Playing', '#nowplaying', '#justcompleted', '#unlockedachievement'];
const SEARCH_DEBOUNCE_MS = 350;
const POLL_LENGTHS = [
  { hours: 1, label: '1 hour' },
  { hours: 6, label: '6 hours' },
  { hours: 24, label: '1 day' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '7 days' },
];

type Attachment =
  | { kind: 'none' }
  | { kind: 'photo'; uri: string; mimeType: string }
  | { kind: 'game'; game: CatalogGame }
  | { kind: 'poll'; options: string[]; hours: number };

type Props = RootScreenProps<'ComposePost'>;

/**
 * New post. A post has text, an optional category, and at most one attachment: a photo, a game
 * from the caller's library, or a poll (the text is the question). Typing @ suggests people.
 */
export function ComposePostScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((state) => state.session?.user.id);
  const bumpFeed = useFeedStore((state) => state.bump);

  const [me, setMe] = useState<MyProfile | null>(null);
  const [body, setBody] = useState('');
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [category, setCategory] = useState<PostCategory | null>(null);
  const [attachment, setAttachment] = useState<Attachment>({ kind: 'none' });
  const [pickingGame, setPickingGame] = useState(false);
  const [posting, setPosting] = useState(false);
  const [bodyFocused, setBodyFocused] = useState(false);
  const input = useRef<TextInput>(null);
  const keyboardUp = useKeyboardUp();

  useEffect(() => {
    if (userId) fetchMyProfile(userId).then(setMe).catch(() => undefined);
  }, [userId]);

  // Suggestions follow the caret in the text box only, not in the poll options.
  const mention = bodyFocused ? mentionAt(body, selection.start) : null;
  const suggestions = useMentionSuggestions(mention?.query ?? null);

  const pollOptions = attachment.kind === 'poll' ? attachment.options.map((o) => o.trim()).filter(Boolean) : [];
  const canPost =
    !posting &&
    body.trim().length > 0 &&
    body.length <= MAX_BODY &&
    (attachment.kind !== 'poll' || pollOptions.length >= 2);

  function insertTag(tag: string) {
    const needsSpace = body.length > 0 && !/\s$/.test(body);
    const next = `${body}${needsSpace ? ' ' : ''}${tag} `.slice(0, MAX_BODY);
    setBody(next);
    setSelection({ start: next.length, end: next.length });
  }

  function insertMention(handle: string) {
    if (!mention) return;
    const next = `${body.slice(0, mention.start)}@${handle} ${body.slice(selection.start)}`;
    setBody(next);
    const caret = mention.start + handle.length + 2;
    setSelection({ start: caret, end: caret });
  }

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setAttachment({ kind: 'photo', uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
  }

  function togglePoll() {
    setAttachment((current) => (current.kind === 'poll' ? { kind: 'none' } : { kind: 'poll', options: ['', ''], hours: 24 }));
    if (!category) setCategory('questions');
  }

  async function submit() {
    if (!userId || !canPost) return;
    setPosting(true);
    try {
      const imagePath =
        attachment.kind === 'photo' ? await uploadPostImage(userId, attachment.uri, attachment.mimeType) : null;
      await createPost({
        body: body.trim(),
        category,
        imagePath,
        gameId: attachment.kind === 'game' ? await gameUuid(attachment.game) : null,
        pollOptions: attachment.kind === 'poll' ? pollOptions : undefined,
        pollHours: attachment.kind === 'poll' ? attachment.hours : undefined,
      });
      bumpFeed();
      navigation.goBack();
    } catch (err) {
      setPosting(false);
      Alert.alert('Could not post', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>New post</Text>
        <Pressable
          style={[styles.postButton, !canPost && styles.postButtonDisabled]}
          onPress={submit}
          disabled={!canPost}
          accessibilityRole="button"
        >
          {posting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.postButtonText}>Post</Text>}
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.authorRow}>
            {me && <Avatar handle={me.handle} color={me.avatar_color} size={feedLayout.avatar} />}
            <View style={styles.flex}>
              <Text style={styles.name} numberOfLines={1}>
                {me?.display_name ?? ' '}
              </Text>
              <Text style={styles.handle} numberOfLines={1}>
                {me ? `@${me.handle}` : ' '}
              </Text>
            </View>
          </View>

          <View style={styles.categories}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCategory((current) => (current === c ? null : c))}
                style={[styles.categoryHit, category !== c && styles.categoryOff]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityState={{ selected: category === c }}
              >
                <CategoryChip category={c} />
              </Pressable>
            ))}
          </View>

          <TextInput
            ref={input}
            value={body}
            onChangeText={setBody}
            selection={selection}
            onSelectionChange={(e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) =>
              setSelection(e.nativeEvent.selection)
            }
            placeholder={attachment.kind === 'poll' ? 'Ask your friends a question…' : 'What are you playing?'}
            placeholderTextColor={feedColors.muted}
            style={styles.input}
            multiline
            autoFocus
            maxLength={MAX_BODY}
            onFocus={() => setBodyFocused(true)}
            onBlur={() => setBodyFocused(false)}
          />

          {suggestions.length > 0 && (
            <View style={styles.suggestions}>
              {suggestions.map((person) => (
                <Pressable key={person.user_id} style={styles.suggestion} onPress={() => insertMention(person.handle)}>
                  <Avatar handle={person.handle} color={person.avatar_color} size={28} />
                  <Text style={styles.suggestionName} numberOfLines={1}>
                    {person.display_name}
                  </Text>
                  <Text style={styles.suggestionHandle} numberOfLines={1}>
                    @{person.handle}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {attachment.kind === 'photo' && (
            <View>
              <Image source={{ uri: attachment.uri }} style={styles.photo} contentFit="cover" />
              <RemoveButton onPress={() => setAttachment({ kind: 'none' })} />
            </View>
          )}

          {attachment.kind === 'game' && (
            <View>
              <GameCard post={gamePreview(attachment.game)} />
              <RemoveButton onPress={() => setAttachment({ kind: 'none' })} />
            </View>
          )}

          {attachment.kind === 'poll' && (
            <PollEditor
              options={attachment.options}
              hours={attachment.hours}
              onChange={(options, hours) => setAttachment({ kind: 'poll', options, hours })}
            />
          )}

          <View style={styles.tagsRow}>
            <Text style={styles.tagsLabel}>Activity</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tags}>
              {QUICK_TAGS.map((tag) => (
                <Pressable key={tag} style={styles.tagChip} onPress={() => insertTag(tag)}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </ScrollView>

        <View style={[styles.toolbar, { paddingBottom: keyboardUp ? 10 : Math.max(insets.bottom, 10) }]}>
          <ToolButton icon="image-outline" label="Photo" active={attachment.kind === 'photo'} onPress={pickPhoto} />
          <ToolButton
            icon="game-controller-outline"
            label="Game"
            active={attachment.kind === 'game'}
            onPress={() => setPickingGame(true)}
          />
          <ToolButton icon="stats-chart-outline" label="Poll" active={attachment.kind === 'poll'} onPress={togglePoll} />
          <ToolButton
            icon="at-outline"
            label="Tag"
            onPress={() => {
              const next = `${body.slice(0, selection.start)}@${body.slice(selection.end)}`;
              setBody(next);
              setSelection({ start: selection.start + 1, end: selection.start + 1 });
              input.current?.focus();
            }}
          />
          <Text style={[styles.counter, body.length > MAX_BODY - 40 && styles.counterWarn]}>
            {body.length}/{MAX_BODY}
          </Text>
        </View>
      </KeyboardAvoidingView>

      <GamePicker
        visible={pickingGame}
        onClose={() => setPickingGame(false)}
        onPick={(game) => {
          setAttachment({ kind: 'game', game });
          setPickingGame(false);
        }}
      />
    </View>
  );
}

/** Posts store the games table uuid. Local demo-catalog games resolve by title. */
async function gameUuid(game: CatalogGame): Promise<string | null> {
  return isUuid(game.id) ? game.id : resolveRemoteId(game.title);
}

/** The feed's game card, filled from a catalog game until the post exists. */
function gamePreview(game: CatalogGame) {
  const family = game.platform.toLowerCase();
  const platforms = family.includes('ps')
    ? ['playstation']
    : family.includes('xbox')
      ? ['xbox']
      : family.includes('switch')
        ? ['nintendo']
        : family.includes('pc')
          ? ['pc']
          : [];
  return {
    game_id: game.id,
    game_title: game.title,
    game_cover: game.coverImageUrl ?? null,
    // Only games-table ids have wide art. A local demo game shows its cover.
    game_artwork: isUuid(game.id) ? null : '',
    game_year: game.year ?? null,
    game_genres: game.genre ? [game.genre] : null,
    game_rating: game.criticScore ? Math.round(game.criticScore / 2) / 10 : null,
    game_platforms: platforms,
  };
}

function PollEditor({
  options,
  hours,
  onChange,
}: {
  options: string[];
  hours: number;
  onChange: (options: string[], hours: number) => void;
}) {
  return (
    <View style={styles.pollEditor}>
      {options.map((option, index) => (
        <View key={index} style={styles.pollOption}>
          <TextInput
            value={option}
            onChangeText={(text) => onChange(options.map((o, i) => (i === index ? text : o)), hours)}
            placeholder={`Option ${index + 1}`}
            placeholderTextColor={feedColors.muted}
            style={styles.pollInput}
            maxLength={MAX_OPTION}
          />
          {options.length > 2 && (
            <Pressable onPress={() => onChange(options.filter((_, i) => i !== index), hours)} hitSlop={8}>
              <Ionicons name="close" size={16} color={feedColors.muted} />
            </Pressable>
          )}
        </View>
      ))}
      {options.length < 4 && (
        <Pressable style={styles.addOption} onPress={() => onChange([...options, ''], hours)}>
          <Ionicons name="add" size={16} color={feedColors.muted} />
          <Text style={styles.addOptionText}>Add option</Text>
        </Pressable>
      )}
      <View style={styles.pollLengths}>
        {POLL_LENGTHS.map((length) => (
          <Pressable
            key={length.hours}
            style={[styles.lengthChip, hours === length.hours && styles.lengthChipOn]}
            onPress={() => onChange(options, length.hours)}
          >
            <Text style={[styles.lengthText, hours === length.hours && styles.lengthTextOn]}>{length.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function GamePicker({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (game: CatalogGame) => void;
}) {
  const entries = useLibraryStore((state) => state.entries);
  const ids = useMemo(() => entries.map((e) => e.catalogId), [entries]);
  const { games: library, loading: libraryLoading } = useResolvedGames(visible ? ids : []);
  const [query, setQuery] = useState('');
  const search = useCatalogSearch(visible ? query : '');
  const searching = query.trim().length > 0;
  const shown = searching ? search.games : library;
  const loading = searching ? search.loading : libraryLoading;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.pickerRoot}>
        <View style={styles.pickerHeader}>
          <Text style={styles.title}>Share a game</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.cancel}>Close</Text>
          </Pressable>
        </View>
        <View style={styles.pickerSearch}>
          <Ionicons name="search" size={16} color={feedColors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search any game"
            placeholderTextColor={feedColors.muted}
            style={styles.pickerSearchInput}
            autoCorrect={false}
          />
        </View>
        <FlatList
          data={shown}
          keyExtractor={(g) => g.id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator style={styles.pickerEmpty} color={feedColors.muted} />
            ) : (
              <Text style={[styles.handle, styles.pickerEmpty]}>
                {searching ? 'No games match.' : 'Search for a game, or add games to your library.'}
              </Text>
            )
          }
          renderItem={({ item }) => (
            <Pressable style={styles.pickerRow} onPress={() => onPick(item)}>
              <GameCover
                abbreviation={item.abbreviation}
                colorKey={item.colorKey}
                imageUrl={item.coverImageUrl}
                size={44}
              />
              <View style={styles.flex}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.handle}>{item.year ?? '—'}</Text>
              </View>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

function ToolButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.tool} onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={22} color={active ? feedColors.accent : feedColors.icon} />
    </Pressable>
  );
}

function RemoveButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.remove} onPress={onPress} hitSlop={8} accessibilityLabel="Remove attachment">
      <Ionicons name="close" size={14} color="#FFFFFF" />
    </Pressable>
  );
}

/** The whole catalog, searched as the caller types. */
function useCatalogSearch(query: string): { games: CatalogGame[]; loading: boolean } {
  const trimmed = query.trim();
  const [result, setResult] = useState<{ query: string; games: CatalogGame[] }>({ query: '', games: [] });
  useEffect(() => {
    if (!trimmed) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchAllCatalog(trimmed)
        .then(({ games }) => !cancelled && setResult({ query: trimmed, games }))
        .catch(() => !cancelled && setResult({ query: trimmed, games: [] }));
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed]);
  const current = trimmed.length > 0 && result.query === trimmed;
  return { games: current ? result.games : [], loading: trimmed.length > 0 && !current };
}

/** The home-indicator inset is only needed while the keyboard is down. */
function useKeyboardUp() {
  const [up, setUp] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setUp(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return up;
}

/** The @word under the caret, if the caller is typing one. */
function mentionAt(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const match = /(^|\s)@([a-z0-9_]*)$/i.exec(before);
  if (!match) return null;
  return { start: caret - match[2].length - 1, query: match[2] };
}

function useMentionSuggestions(query: string | null): ProfileSummary[] {
  // shelf_search_users needs two characters.
  const active = query !== null && query.length >= 2 ? query : null;
  const [results, setResults] = useState<{ query: string; rows: ProfileSummary[] }>({ query: '', rows: [] });
  useEffect(() => {
    if (active === null) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchUsers(active, 5)
        .then((rows) => !cancelled && setResults({ query: active, rows }))
        .catch(() => !cancelled && setResults({ query: active, rows: [] }));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active]);
  // Rows for an older query stay hidden until the new ones arrive.
  return active !== null && results.query === active ? results.rows : [];
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: feedColors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    height: 52,
    paddingHorizontal: feedLayout.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancel: {
    fontSize: 15,
    fontWeight: '500',
    color: feedColors.name,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  postButton: {
    minWidth: 64,
    height: 32,
    paddingHorizontal: 16,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: feedColors.accent,
  },
  postButtonDisabled: {
    opacity: 0.4,
  },
  postButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scroll: {
    paddingHorizontal: feedLayout.gutter,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 16,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  name: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0.15,
    color: feedColors.name,
  },
  handle: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
    color: feedColors.muted,
  },
  categories: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryHit: {
    paddingVertical: 4,
  },
  categoryOff: {
    opacity: 0.4,
  },
  input: {
    minHeight: 96,
    fontSize: 16,
    lineHeight: 21,
    color: feedColors.name,
    textAlignVertical: 'top',
  },
  suggestions: {
    borderRadius: 12,
    backgroundColor: feedColors.pollTrack,
    paddingVertical: 4,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  suggestionName: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '500',
    color: feedColors.name,
  },
  suggestionHandle: {
    flexShrink: 2,
    fontSize: 14,
    color: feedColors.muted,
  },
  photo: {
    width: '100%',
    aspectRatio: feedLayout.photoAspect,
    borderRadius: feedLayout.cardRadius,
  },
  remove: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  pollEditor: {
    gap: 8,
  },
  pollOption: {
    height: feedLayout.pollRowHeight,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: feedColors.pollTrack,
  },
  pollInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  addOption: {
    height: feedLayout.pollRowHeight,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: feedColors.pollTrack,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: feedColors.muted,
  },
  pollLengths: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  lengthChip: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 100,
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: feedColors.pollFooterBorder,
  },
  lengthChipOn: {
    backgroundColor: 'rgba(57, 4, 111, 0.6)',
  },
  lengthText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.22,
    color: feedColors.pollFooterText,
  },
  lengthTextOn: {
    color: '#FFFFFF',
  },
  tagsRow: {
    gap: 6,
  },
  tagsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: feedColors.muted,
  },
  tags: {
    flexDirection: 'row',
    gap: 6,
  },
  tagChip: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 100,
    justifyContent: 'center',
    backgroundColor: feedColors.pollTrack,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: feedColors.name,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: feedLayout.gutter,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: feedColors.background,
  },
  tool: {
    height: 32,
    justifyContent: 'center',
  },
  counter: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: '500',
    color: feedColors.muted,
  },
  counterWarn: {
    color: feedColors.accent,
  },
  pickerRoot: {
    flex: 1,
    backgroundColor: '#0F0E0D',
    paddingTop: 12,
  },
  pickerHeader: {
    height: 44,
    paddingHorizontal: feedLayout.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerSearch: {
    marginHorizontal: feedLayout.gutter,
    marginBottom: 8,
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: feedColors.pollTrack,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: feedLayout.gutter,
    paddingVertical: 8,
  },
  pickerEmpty: {
    marginTop: 32,
    textAlign: 'center',
  },
});
