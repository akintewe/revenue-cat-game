import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { platformImage } from '../../../shared/utils/platformImage';
import type { FeedPost } from '../../../services/social/feed';
import { platformIconNames, shortGenres } from '../format';
import { useGameArtwork } from '../hooks/useGameArtwork';
import { feedColors, feedLayout } from '../theme';

type Props = {
  post: Pick<
    FeedPost,
    'game_id' | 'game_title' | 'game_cover' | 'game_artwork' | 'game_year' | 'game_genres' | 'game_rating' | 'game_platforms'
  >;
  onPress?: () => void;
};

/**
 * Frame 258: wide game art with a bottom shade, year and platforms top right, title, genre
 * chips and the IGDB rating at the bottom. Falls back to the portrait cover when IGDB has no art.
 */
export function GameCard({ post, onPress }: Props) {
  const artwork = useGameArtwork(post.game_id, post.game_artwork);
  const uri = artwork ? artwork : artwork === '' ? post.game_cover : null;
  const genres = shortGenres(post.game_genres);
  const platforms = platformIconNames(post.game_platforms);

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={post.game_title ?? 'Game'}
    >
      {uri && (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          recyclingKey={post.game_id ?? undefined}
        />
      )}
      <LinearGradient
        colors={feedColors.cardShade}
        locations={feedColors.cardShadeLocations}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {(post.game_year || platforms.length > 0) && (
        <View style={styles.topRight}>
          {post.game_year ? <Text style={styles.year}>{post.game_year}</Text> : null}
          {platforms.length > 0 && (
            <View style={styles.platforms}>
              {platforms.map((name) => (
                <PlatformGlyph key={name} name={name} />
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.bottom}>
        <Text style={styles.title} numberOfLines={1}>
          {post.game_title}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.genres}>
            {genres.map((genre) => (
              <View key={genre} style={styles.genreChip}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
          </View>
          {post.game_rating !== null && (
            <View style={styles.rating}>
              <Text style={styles.ratingText}>{post.game_rating.toFixed(1)}</Text>
              <Ionicons name="star" size={14} color={feedColors.star} style={styles.star} />
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

/** Frame 106: 14.4pt white glyphs, 4pt apart. */
function PlatformGlyph({ name }: { name: string }) {
  const logo = platformImage(name);
  return (
    <View style={styles.glyphBox}>
      {logo ? (
        <Image source={logo} style={styles.glyph} contentFit="contain" tintColor="#FFFFFF" />
      ) : (
        <Ionicons name={name === 'PC' ? 'desktop-outline' : 'phone-portrait-outline'} size={12} color="#FFFFFF" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: feedLayout.gameCardAspect,
    borderRadius: feedLayout.cardRadius,
    borderWidth: 0.5,
    borderColor: feedColors.cardHairline,
    overflow: 'hidden',
    backgroundColor: '#181615',
  },
  topRight: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  year: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  platforms: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  glyphBox: {
    width: 14.4,
    height: 14.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    width: 13.6,
    height: 13.6,
  },
  // Frame 264: 12pt from the left, its 38pt block ends 21pt above the bottom edge.
  bottom: {
    position: 'absolute',
    left: 12,
    right: 8,
    bottom: 21,
    gap: 4,
  },
  title: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: -0.15,
    color: feedColors.name,
  },
  metaRow: {
    height: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  genres: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  genreChip: {
    height: 16,
    paddingHorizontal: 6,
    borderRadius: 100,
    borderWidth: 0.5,
    borderColor: feedColors.genreChipBorder,
    backgroundColor: feedColors.genreChipBg,
    justifyContent: 'center',
  },
  genreText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
    color: feedColors.body,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.13,
    color: feedColors.name,
    opacity: 0.45,
  },
  // Fluent star_filled sits in a 16pt frame with a 1pt inset. Ionicons' star at 14 matches it.
  star: {
    width: 16,
    textAlign: 'center',
  },
});
