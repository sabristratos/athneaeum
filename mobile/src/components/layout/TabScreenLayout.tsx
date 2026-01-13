import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { useFloatingNavBarHeight } from '@/components/FloatingNavBar';

interface TabScreenLayoutProps {
  children: React.ReactNode;
  style?: ViewStyle;
  includeBottomPadding?: boolean;
}

export function TabScreenLayout({
  children,
  style,
  includeBottomPadding = true,
}: TabScreenLayoutProps) {
  const navBarHeight = useFloatingNavBarHeight();

  return (
    <View
      style={[
        styles.container,
        includeBottomPadding && { paddingBottom: navBarHeight },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function useTabScreenPadding() {
  const navBarHeight = useFloatingNavBarHeight();
  return { bottom: navBarHeight };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
