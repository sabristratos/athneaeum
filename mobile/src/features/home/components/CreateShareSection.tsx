import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Share01Icon } from '@hugeicons/core-free-icons';
import { Text, Icon } from '@/components';
import { TierListPreviewCard } from '@/features/tierList';
import { useTheme } from '@/themes';

export function CreateShareSection() {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  return (
    <View>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon
            icon={Share01Icon}
            size={18}
            color={theme.colors.primary}
          />
          <Text
            variant="label"
            style={[
              { marginLeft: 6, color: theme.colors.foregroundMuted },
              isScholar && { textTransform: 'uppercase', letterSpacing: 1 },
            ]}
          >
            Create & Share
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
      >
        <TierListPreviewCard />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  carouselContent: {
    gap: 12,
  },
});
