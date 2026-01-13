import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera02Icon } from '@hugeicons/core-free-icons';
import { Icon, Text, Button } from '@/components/atoms';
import { BottomSheet } from '@/components/organisms/modals';
import { useTheme } from '@/themes';

interface AvatarPickerProps {
  imageUri?: string | null;
  initials: string;
  size?: number;
  onImageSelected: (uri: string | null) => void;
  editable?: boolean;
}

export function AvatarPicker({
  imageUri,
  initials,
  size = 80,
  onImageSelected,
  editable = true,
}: AvatarPickerProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const [showOptions, setShowOptions] = useState(false);

  const borderRadius = isScholar ? theme.radii.md : size / 2;

  const pickImage = useCallback(async () => {
    setShowOptions(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onImageSelected(result.assets[0].uri);
    }
  }, [onImageSelected]);

  const takePhoto = useCallback(async () => {
    setShowOptions(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your camera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onImageSelected(result.assets[0].uri);
    }
  }, [onImageSelected]);

  const removeImage = useCallback(() => {
    setShowOptions(false);
    onImageSelected(null);
  }, [onImageSelected]);

  const handlePress = useCallback(() => {
    if (!editable) return;
    setShowOptions(true);
  }, [editable]);

  const containerStyle = {
    width: size,
    height: size,
    borderRadius,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.border,
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  const editBadgeSize = Math.min(32, size * 0.35);

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        disabled={!editable}
        activeOpacity={0.7}
        style={{ position: 'relative' }}
        accessibilityRole="button"
        accessibilityLabel={imageUri ? 'Profile photo. Tap to change' : `Profile initials ${initials}. Tap to add photo`}
        accessibilityHint={editable ? 'Opens options to change your profile photo' : undefined}
        accessibilityState={{ disabled: !editable }}
      >
        <View style={containerStyle}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <Text
              style={{
                fontSize: size * 0.4,
                fontWeight: '600',
                color: theme.colors.foregroundMuted,
                fontFamily: theme.fonts.heading,
              }}
            >
              {initials.toUpperCase()}
            </Text>
          )}
        </View>

        {editable && (
          <View
            style={[
              styles.editBadge,
              {
                width: editBadgeSize,
                height: editBadgeSize,
                borderRadius: editBadgeSize / 2,
                backgroundColor: theme.colors.primary,
                borderWidth: 2,
                borderColor: theme.colors.canvas,
              },
            ]}
          >
            <Icon
              icon={Camera02Icon}
              size={editBadgeSize * 0.5}
              color={theme.colors.onPrimary}
            />
          </View>
        )}
      </TouchableOpacity>

      <BottomSheet
        visible={showOptions}
        onClose={() => setShowOptions(false)}
        showHandle
      >
        <View style={{ gap: theme.spacing.sm }}>
          <Button variant="outline" fullWidth onPress={takePhoto}>
            Take Photo
          </Button>
          <Button variant="outline" fullWidth onPress={pickImage}>
            Choose from Library
          </Button>
          {imageUri && (
            <Button variant="danger" fullWidth onPress={removeImage}>
              Remove Photo
            </Button>
          )}
          <Button variant="ghost" fullWidth onPress={() => setShowOptions(false)}>
            Cancel
          </Button>
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
