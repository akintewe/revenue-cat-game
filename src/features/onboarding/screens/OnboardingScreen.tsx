import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, coverColors, discoverColors, radii, spacing, typography } from '../../../shared/theme/theme';
import { ScreenBackground } from '../../../shared/components/ScreenBackground';
import { GameCover } from '../../../shared/components/GameCover';
import { PlatformIcon } from '../../../shared/components/PlatformIcon';
import { hapticError, hapticSelection, hapticSuccess } from '../../../shared/utils/haptics';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useLibraryStore } from '../../library/store/useLibraryStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import {
  updateMyProfile,
  searchUsers,
  followUser,
  unfollowUser,
  ProfileUpdateError,
  type ProfileSummary,
} from '../../../services/social/profiles';
import { searchAllCatalog, fetchPopularSuggestions, resolveRemoteId } from '../../../services/catalog/unifiedCatalog';
import type { SearchDevice } from '../../../services/catalog/remoteCatalog';
import { isUuid } from '../../../shared/utils/id';
import type { CatalogGame } from '../../../data/catalog';
import type { RootScreenProps } from '../../../core/navigation/types';

type Props = RootScreenProps<'Onboarding'>;

const STEP_COUNT = 5;
const NAME_MAX = 20;
const USERNAME_MAX = 20;
const MIN_GAMES = 3;
const SEARCH_DEBOUNCE_MS = 350;

const PLATFORM_OPTIONS: { label: string; value: SearchDevice; icon: React.ComponentProps<typeof Ionicons>['name']; tint: string }[] = [
  { label: 'PlayStation', value: 'playstation', icon: 'logo-playstation', tint: '#2D5FE0' },
  { label: 'Mobile', value: 'mobile', icon: 'phone-portrait-outline', tint: '#8B5CF6' },
  { label: 'Nintendo', value: 'nintendo', icon: 'game-controller-outline', tint: '#E4302B' },
  { label: 'Xbox', value: 'xbox', icon: 'logo-xbox', tint: '#3A9E3A' },
  { label: 'PC', value: 'pc', icon: 'desktop-outline', tint: '#4A4A57' },
];

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function OnboardingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((state) => state.session?.user.id);
  const [step, setStep] = useState(0);
  const stepAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(stepAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    stepAnim.setValue(0);
    Animated.timing(stepAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Step 1 — name
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const nameValid = name.trim().length >= 3;
  const nameError = nameTouched && !nameValid ? 'Name must be at least 3 letters' : null;

  // Step 2 — username
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const usernameValid = USERNAME_PATTERN.test(username);

  useEffect(() => {
    if (!usernameValid) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    let cancelled = false;
    const timer = setTimeout(() => {
      searchUsers(username, 5)
        .then((results) => {
          if (cancelled) return;
          const taken = results.some((r) => r.handle.toLowerCase() === username.toLowerCase());
          setUsernameStatus(taken ? 'taken' : 'available');
        })
        .catch(() => {
          if (!cancelled) setUsernameStatus('idle');
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, usernameValid]);

  // Step 3 — games
  const [gameQuery, setGameQuery] = useState('');
  const [gameResults, setGameResults] = useState<CatalogGame[]>([]);
  const [popularGames, setPopularGames] = useState<CatalogGame[]>([]);
  const [selectedGames, setSelectedGames] = useState<Map<string, CatalogGame>>(new Map());

  useEffect(() => {
    fetchPopularSuggestions(new Set(), 24).then(({ games }) => setPopularGames(games));
  }, []);

  useEffect(() => {
    const trimmed = gameQuery.trim();
    if (!trimmed) {
      setGameResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      searchAllCatalog(trimmed).then(({ games }) => {
        if (!cancelled) setGameResults(games);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [gameQuery]);

  function toggleGame(game: CatalogGame) {
    hapticSelection();
    setSelectedGames((prev) => {
      const next = new Map(prev);
      if (next.has(game.id)) next.delete(game.id);
      else next.set(game.id, game);
      return next;
    });
  }

  // Step 4 — platforms (no backend field yet; kept local, flagged to Tunde separately)
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<SearchDevice>>(new Set());

  function togglePlatform(value: SearchDevice) {
    hapticSelection();
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  // Step 5 — follow suggestions
  const [friendQuery, setFriendQuery] = useState('');
  const [friendResults, setFriendResults] = useState<ProfileSummary[]>([]);
  const [friendSearching, setFriendSearching] = useState(false);
  const [followedCount, setFollowedCount] = useState(0);
  const [followBusyId, setFollowBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ProfileSummary | null>(null);

  useEffect(() => {
    const trimmed = friendQuery.trim();
    if (trimmed.length < 2) {
      setFriendResults([]);
      setFriendSearching(false);
      return;
    }
    setFriendSearching(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      searchUsers(trimmed, 20)
        .then((rows) => {
          if (!cancelled) setFriendResults(rows);
        })
        .catch(() => {
          if (!cancelled) setFriendResults([]);
        })
        .finally(() => {
          if (!cancelled) setFriendSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [friendQuery]);

  async function toggleFollow(person: ProfileSummary) {
    if (!userId || followBusyId) return;
    setFollowBusyId(person.user_id);
    const wasFollowing = person.followed_by_me;
    setFriendResults((prev) =>
      prev.map((p) => (p.user_id === person.user_id ? { ...p, followed_by_me: !wasFollowing } : p)),
    );
    setFollowedCount((c) => c + (wasFollowing ? -1 : 1));
    try {
      if (wasFollowing) await unfollowUser(userId, person.user_id);
      else await followUser(userId, person.user_id);
      hapticSuccess();
    } catch {
      setFriendResults((prev) =>
        prev.map((p) => (p.user_id === person.user_id ? { ...p, followed_by_me: wasFollowing } : p)),
      );
      setFollowedCount((c) => c + (wasFollowing ? 1 : -1));
    } finally {
      setFollowBusyId(null);
    }
  }

  // Navigation between steps
  function blockedShake(message: string) {
    hapticError();
    if (step === 0) setNameTouched(true);
    // A lightweight nudge is enough here — the inline error text already explains why.
    console.warn('[onboarding] blocked:', message);
  }

  async function handleContinue() {
    if (step === 0) {
      if (!nameValid) return blockedShake('name too short');
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!usernameValid || usernameStatus === 'taken' || usernameStatus === 'checking') {
        return blockedShake('username not ready');
      }
      if (userId) {
        try {
          await updateMyProfile(userId, { display_name: name.trim(), handle: username.toLowerCase() });
        } catch (err) {
          if (err instanceof ProfileUpdateError && err.field === 'handle') {
            setUsernameStatus('taken');
            return;
          }
        }
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (selectedGames.size < MIN_GAMES) return blockedShake('not enough games');
      for (const game of selectedGames.values()) {
        const catalogId = isUuid(game.id) ? game.id : await resolveRemoteId(game.title);
        if (catalogId) useLibraryStore.getState().addGame(catalogId);
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      setStep(4);
      return;
    }
    finishOnboarding();
  }

  function handleSkip() {
    hapticSelection();
    if (step === 2) return setStep(3);
    if (step === 3) return setStep(4);
  }

  function handleBack() {
    if (step === 0) return;
    setStep((s) => s - 1);
  }

  function finishOnboarding() {
    if (userId) useOnboardingStore.getState().markComplete(userId);
    navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  }

  const canContinue =
    step === 0
      ? nameValid
      : step === 1
        ? usernameValid && usernameStatus === 'available'
        : step === 2
          ? selectedGames.size >= MIN_GAMES
          : step === 3
            ? selectedPlatforms.size >= 1
            : followedCount >= 1;

  const showSkip = step >= 2 && step <= 3;
  const showBack = step >= 1;

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.progressRow}>
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <View key={i} style={[styles.progressDot, i === step && styles.progressDotActive]} />
          ))}
        </View>
        {showSkip && (
          <Pressable onPress={handleSkip} hitSlop={10}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={step === 0 || step === 1}
      >
        <Animated.View style={[styles.flex, { opacity: stepAnim }]}>
          {step === 0 && (
            <NameStep name={name} onChangeName={setName} onBlur={() => setNameTouched(true)} error={nameError} />
          )}
          {step === 1 && (
            <UsernameStep username={username} onChangeUsername={setUsername} status={usernameStatus} />
          )}
          {step === 2 && (
            <GamesStep
              query={gameQuery}
              onChangeQuery={setGameQuery}
              results={gameQuery.trim() ? gameResults : popularGames}
              selected={selectedGames}
              onToggle={toggleGame}
            />
          )}
          {step === 3 && <PlatformsStep selected={selectedPlatforms} onToggle={togglePlatform} />}
          {step === 4 && (
            <FriendsStep
              query={friendQuery}
              onChangeQuery={setFriendQuery}
              results={friendResults}
              searching={friendSearching}
              busyId={followBusyId}
              onToggleFollow={toggleFollow}
              onExpand={setExpanded}
              expanded={expanded}
              onCloseExpanded={() => setExpanded(null)}
            />
          )}
        </Animated.View>

        <View style={[styles.ctaRow, { paddingBottom: insets.bottom + spacing.md }]}>
          {showBack && (
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </Pressable>
          )}
          <Pressable
            style={[
              styles.continueButton,
              !showBack && styles.continueButtonFull,
              !canContinue && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>{step === STEP_COUNT - 1 ? 'Done' : 'Continue'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ---------- Step 1 ----------

function NameStep({
  name,
  onChangeName,
  onBlur,
  error,
}: {
  name: string;
  onChangeName: (v: string) => void;
  onBlur: () => void;
  error: string | null;
}) {
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (name.length > 0) {
      cursorOpacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [name.length, cursorOpacity]);

  return (
    <View style={styles.stepBody}>
      <Text style={styles.eyebrow}>Let's get to know you</Text>
      <Text style={styles.title}>What do we call you?</Text>

      <View style={styles.nameFieldRow}>
        <View style={styles.nameInputWrap}>
          <TextInput
            value={name}
            onChangeText={(t) => onChangeName(t.slice(0, NAME_MAX))}
            onBlur={onBlur}
            placeholder="Your Name"
            placeholderTextColor={colors.textFaint}
            style={styles.nameInput}
            autoFocus={false}
            maxLength={NAME_MAX}
          />
          {name.length === 0 && (
            <Animated.View style={[styles.blinkCursor, { opacity: cursorOpacity }]} pointerEvents="none" />
          )}
        </View>
        <Text style={styles.charCount}>
          {name.length}/{NAME_MAX}
        </Text>
      </View>
      {error && (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>{error}</Text>
          <Ionicons name="alert-circle" size={16} color={colors.accent} />
        </View>
      )}
    </View>
  );
}

// ---------- Step 2 ----------

function UsernameStep({
  username,
  onChangeUsername,
  status,
}: {
  username: string;
  onChangeUsername: (v: string) => void;
  status: 'idle' | 'checking' | 'available' | 'taken';
}) {
  const showError = username.length > 0 && username.length < 3;
  return (
    <View style={styles.stepBody}>
      <Text style={styles.eyebrow}>Enter your username</Text>
      <Text style={styles.title}>Choose your unique identifier</Text>

      <View style={styles.nameFieldRow}>
        <View style={styles.usernameInputWrap}>
          <Text style={styles.atSign}>@</Text>
          <TextInput
            value={username}
            onChangeText={(t) => onChangeUsername(t.toLowerCase().slice(0, USERNAME_MAX))}
            placeholder="username"
            placeholderTextColor={colors.textFaint}
            style={styles.usernameInput}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={USERNAME_MAX}
          />
        </View>
        <Text style={styles.charCount}>
          {username.length}/{USERNAME_MAX}
        </Text>
      </View>

      {showError ? (
        <View style={styles.errorRow}>
          <Text style={[styles.errorText, styles.usernameStatusIndent]}>Username must be at least 3 characters</Text>
          <Ionicons name="alert-circle" size={16} color={colors.accent} />
        </View>
      ) : status === 'checking' ? (
        <View style={styles.errorRow}>
          <ActivityIndicator size="small" color={colors.textMuted} />
          <Text style={[styles.statusText, styles.usernameStatusIndent]}>Checking…</Text>
        </View>
      ) : status === 'available' ? (
        <View style={styles.errorRow}>
          <Text style={[styles.statusText, styles.usernameStatusIndent, styles.statusAvailable]}>Username is available</Text>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
        </View>
      ) : status === 'taken' ? (
        <View style={styles.errorRow}>
          <Text style={[styles.errorText, styles.usernameStatusIndent]}>Username is taken</Text>
          <Ionicons name="close-circle" size={16} color={colors.accent} />
        </View>
      ) : null}
    </View>
  );
}

// ---------- Step 3 ----------

function GamesStep({
  query,
  onChangeQuery,
  results,
  selected,
  onToggle,
}: {
  query: string;
  onChangeQuery: (v: string) => void;
  results: CatalogGame[];
  selected: Map<string, CatalogGame>;
  onToggle: (game: CatalogGame) => void;
}) {
  return (
    <View style={styles.stepBody}>
      <Text style={styles.title}>Select at least {MIN_GAMES} games to add to your library</Text>
      <Text style={styles.subtitle}>You can change this later</Text>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={discoverColors.mutedText} />
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Search games"
          placeholderTextColor={discoverColors.mutedText}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <ScrollView contentContainerStyle={styles.gameGrid} showsVerticalScrollIndicator={false}>
        {results.map((game) => {
          const isSelected = selected.has(game.id);
          return (
            <Pressable key={game.id} style={styles.gameCell} onPress={() => onToggle(game)}>
              <View style={[styles.gameCoverWrap, isSelected && styles.gameCoverWrapSelected]}>
                <GameCover
                  abbreviation={game.abbreviation}
                  colorKey={game.colorKey}
                  imageUrl={game.coverImageUrl}
                  size={104}
                  style={!isSelected ? styles.gameCoverDim : undefined}
                />
                {isSelected && (
                  <View style={styles.gameCheck}>
                    <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ---------- Step 4 ----------

function PlatformsStep({
  selected,
  onToggle,
}: {
  selected: Set<SearchDevice>;
  onToggle: (value: SearchDevice) => void;
}) {
  return (
    <View style={styles.stepBody}>
      <Text style={styles.title}>Where do you play on?</Text>
      <Text style={styles.subtitle}>You can change this later</Text>

      <View style={styles.platformGrid}>
        {PLATFORM_OPTIONS.map((option) => {
          const isSelected = selected.has(option.value);
          return (
            <Pressable
              key={option.value}
              style={[styles.platformTile, isSelected && styles.platformTileSelected]}
              onPress={() => onToggle(option.value)}
            >
              <View style={[styles.platformIconWrap, { backgroundColor: isSelected ? option.tint : discoverColors.rowBg }]}>
                <Ionicons name={option.icon} size={18} color={isSelected ? '#FFFFFF' : discoverColors.mutedText} />
              </View>
              <Text style={styles.platformLabel}>{option.label}</Text>
              <Text style={styles.platformYear}>2026</Text>
              {isSelected && (
                <View style={styles.platformCheck}>
                  <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ---------- Step 5 ----------

function FriendsStep({
  query,
  onChangeQuery,
  results,
  searching,
  busyId,
  onToggleFollow,
  onExpand,
  expanded,
  onCloseExpanded,
}: {
  query: string;
  onChangeQuery: (v: string) => void;
  results: ProfileSummary[];
  searching: boolean;
  busyId: string | null;
  onToggleFollow: (p: ProfileSummary) => void;
  onExpand: (p: ProfileSummary) => void;
  expanded: ProfileSummary | null;
  onCloseExpanded: () => void;
}) {
  return (
    <View style={styles.stepBody}>
      <Text style={styles.title}>Meet players like you</Text>
      <Text style={styles.subtitle}>Tap any player card to view more details</Text>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={discoverColors.mutedText} />
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Search friends"
          placeholderTextColor={discoverColors.mutedText}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && <ActivityIndicator size="small" color={colors.accent} />}
      </View>

      {expanded ? (
        <View style={styles.expandedCard}>
          <Pressable style={styles.expandedClose} onPress={onCloseExpanded} hitSlop={10}>
            <Ionicons name="close" size={16} color={colors.text} />
          </Pressable>
          <View style={[styles.expandedAvatar, { backgroundColor: coverColors[expanded.avatar_color] ?? coverColors.slate }]} />
          <Text style={styles.expandedName}>{expanded.display_name}</Text>
          <Text style={styles.expandedHandle}>@{expanded.handle}</Text>
          {expanded.bio ? <Text style={styles.expandedBio}>{expanded.bio}</Text> : null}
          <Pressable
            style={[styles.followButton, expanded.followed_by_me && styles.followButtonActive]}
            onPress={() => onToggleFollow(expanded)}
            disabled={busyId === expanded.user_id}
          >
            <Text style={[styles.followButtonText, expanded.followed_by_me && styles.followButtonTextActive]}>
              {expanded.followed_by_me ? 'Following' : 'Follow'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.friendList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {results.length === 0 && !searching && (
            <Text style={styles.emptyText}>
              {query.trim().length < 2 ? 'Search by handle or name to find people to follow.' : `No one found matching "${query.trim()}".`}
            </Text>
          )}
          {results.map((person) => (
            <Pressable key={person.user_id} style={styles.friendRow} onPress={() => onExpand(person)}>
              <View style={[styles.friendAvatar, { backgroundColor: coverColors[person.avatar_color] ?? coverColors.slate }]} />
              <View style={styles.friendInfo}>
                <Text style={styles.friendName} numberOfLines={1}>
                  {person.display_name}
                </Text>
                <Text style={styles.friendHandle} numberOfLines={1}>
                  @{person.handle}
                </Text>
              </View>
              <Pressable
                style={[styles.followButtonSmall, person.followed_by_me && styles.followButtonActive]}
                onPress={() => onToggleFollow(person)}
                disabled={busyId === person.user_id}
              >
                <Text style={[styles.followButtonSmallText, person.followed_by_me && styles.followButtonTextActive]}>
                  {person.followed_by_me ? 'Following' : 'Follow'}
                </Text>
              </Pressable>
            </Pressable>
          ))}
        </ScrollView>
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
  },
  progressDotActive: {
    width: 28,
    backgroundColor: colors.accent,
  },
  skipText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  stepBody: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  eyebrow: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.heading,
    fontSize: 24,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  nameFieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  nameInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameInput: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    padding: 0,
    flexShrink: 1,
  },
  blinkCursor: {
    width: 2,
    height: 28,
    backgroundColor: colors.accent,
    marginLeft: 4,
  },
  charCount: {
    color: colors.textFaint,
    fontSize: 12,
    marginLeft: spacing.sm,
  },
  usernameInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  atSign: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginRight: 2,
  },
  usernameInput: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    padding: 0,
    flexShrink: 1,
    flex: 1,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  errorText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  statusAvailable: {
    color: colors.success,
  },
  usernameStatusIndent: {
    marginLeft: 26,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: discoverColors.rowBg,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  gameGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  gameCell: {
    width: '31%',
  },
  gameCoverWrap: {
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  gameCoverWrapSelected: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  gameCoverDim: {
    opacity: 0.8,
  },
  gameCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  platformTile: {
    width: '47%',
    backgroundColor: discoverColors.rowBg,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  platformTileSelected: {
    borderColor: colors.accent,
  },
  platformIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  platformLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  platformYear: {
    color: colors.textFaint,
    fontSize: 11,
    marginTop: 2,
  },
  platformCheck: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendList: {
    gap: spacing.xs,
    paddingBottom: spacing.xl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  friendInfo: {
    flex: 1,
    gap: 2,
  },
  friendName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  friendHandle: {
    color: colors.textMuted,
    fontSize: 13,
  },
  followButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.lg,
  },
  followButtonSmall: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  followButtonActive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  followButtonText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  followButtonSmallText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 13,
  },
  followButtonTextActive: {
    color: colors.text,
  },
  expandedCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginTop: spacing.lg,
  },
  expandedClose: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  expandedAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: spacing.md,
  },
  expandedName: {
    ...typography.subheading,
    fontSize: 18,
  },
  expandedHandle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  expandedBio: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  backButton: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  continueButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  continueButtonFull: {
    flex: 1,
  },
  continueButtonDisabled: {
    opacity: 0.4,
  },
  continueButtonText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 15,
  },
});
