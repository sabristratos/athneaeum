import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Card, AvatarPicker } from '@/components';
import { ReaderDNA } from './ReaderDNA';
import { useTheme } from '@/themes';
import { useUser, useAuthActions } from '@/stores/authStore';
import { useAvatarUri, usePreferencesActions } from '@/stores/preferencesStore';
import { authApi } from '@/api/auth';
import { normalizeAvatarUrl } from '@/utils';

interface IdentityCardProps {
  booksRead?: number;
  totalPages?: number;
  favoriteGenre?: string;
}

export function IdentityCard({
  booksRead = 0,
  totalPages = 0,
  favoriteGenre,
}: IdentityCardProps) {
  const { theme } = useTheme();
  const user = useUser();
  const { setUser } = useAuthActions();
  const avatarUri = useAvatarUri();
  const { setAvatarUri } = usePreferencesActions();
  const [uploading, setUploading] = useState(false);

  const handleImageSelected = useCallback(async (uri: string | null) => {
    if (!uri) {
      try {
        await authApi.removeAvatar();
        setAvatarUri(null);
        if (user) {
          setUser({ ...user, avatar_url: null });
        }
      } catch {
        Alert.alert('Error', 'Failed to remove avatar');
      }
      return;
    }

    setUploading(true);
    try {
      const response = await authApi.uploadAvatar(uri);
      setAvatarUri(response.avatar_url);
      if (user) {
        setUser({ ...user, avatar_url: response.avatar_url });
      }
    } catch {
      Alert.alert('Upload Failed', 'Unable to upload avatar. Please try again.');
      setAvatarUri(uri);
      if (user) {
        setUser({ ...user, avatar_url: uri });
      }
    } finally {
      setUploading(false);
    }
  }, [setAvatarUri, setUser, user]);

  const displayUri = normalizeAvatarUrl(user?.avatar_url || avatarUri);

  const initials = user?.name
    ?.split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .slice(0, 2) || '?';

  const accessibilityLabel = `${user?.name || 'Reader'} profile. ${booksRead} books read, ${totalPages.toLocaleString()} total pages${favoriteGenre ? `. Favorite genre: ${favoriteGenre}` : ''}`;

  return (
    <Card
      variant="elevated"
      padding="lg"
      accessible={true}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.container}>
        <AvatarPicker
          imageUri={displayUri}
          initials={initials}
          size={100}
          onImageSelected={handleImageSelected}
          editable={!uploading}
        />

        <View style={[styles.info, { marginTop: theme.spacing.md }]}>
          <Text variant="h2" style={{ textAlign: 'center' }}>
            {user?.name || 'Reader'}
          </Text>
          <Text variant="body" muted style={{ textAlign: 'center' }}>
            {user?.email}
          </Text>
        </View>

        <View style={{ marginTop: theme.spacing.sm }}>
          <ReaderDNA
            booksRead={booksRead}
            totalPages={totalPages}
            favoriteGenre={favoriteGenre}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  info: {
    alignItems: 'center',
  },
});
