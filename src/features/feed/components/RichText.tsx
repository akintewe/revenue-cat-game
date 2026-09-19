import React from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { feedColors } from '../theme';

/** Handles follow the profiles_handle_check rule: 3–20 of a-z, 0-9, _. */
const TOKEN = /(@[a-z0-9_]{3,20}|#[A-Za-z0-9_]+)/gi;

type Props = {
  text: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  onMentionPress?: (handle: string) => void;
};

/** Post body: @mentions in yellow and tappable, #hashtags in red. */
export function RichText({ text, style, numberOfLines, onMentionPress }: Props) {
  const parts = text.split(TOKEN);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, i) => {
        // split() with a capture group puts every match at an odd index.
        if (i % 2 === 0) return part;
        if (part.startsWith('@')) {
          const handle = part.slice(1).toLowerCase();
          return (
            <Text
              key={i}
              style={{ color: feedColors.mention }}
              onPress={onMentionPress ? () => onMentionPress(handle) : undefined}
              suppressHighlighting
            >
              {part}
            </Text>
          );
        }
        return (
          <Text key={i} style={{ color: feedColors.hashtag }}>
            {part}
          </Text>
        );
      })}
    </Text>
  );
}
