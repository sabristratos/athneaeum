import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  Home01Icon,
  Search01Icon,
  Book02Icon,
  Analytics01Icon,
} from '@hugeicons/core-free-icons';
import { Text, ThemeToggle, SharedElementOverlay } from '@/components';
import { AnimatedTabIcon } from '@/animations';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/themes';
import { sharedSpacing } from '@/themes/shared';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchScreen } from '@/features/search/SearchScreen';
import { LibraryScreen } from '@/features/library/LibraryScreen';
import { BookDetailScreen } from '@/features/library/BookDetailScreen';
import { ReadingStatsScreen } from '@/features/reading';
import type { UserBook } from '@/types';

export type MainTabParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  LibraryTab: undefined;
  StatsTab: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  BookDetail: { userBook: UserBook };
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

function HomeScreen() {
  const { theme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.canvas }}
      edges={['top']}
    >
      <View
        style={{
          flex: 1,
          padding: theme.spacing.lg,
          gap: theme.spacing.lg,
        }}
      >
        <Text variant="h1">Welcome, {user?.name}</Text>
        <Text variant="body" muted>
          Your digital reading sanctuary awaits.
        </Text>

        <View style={{ marginTop: theme.spacing.xl }}>
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            Choose Your Theme
          </Text>
          <ThemeToggle />
        </View>

        <View style={{ marginTop: 'auto' }}>
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            Quick Start
          </Text>
          <Text variant="body" muted>
            Use the Search tab to find books and add them to your library. Track your reading progress in the Library tab.
          </Text>
        </View>

        <View>
          <Text
            variant="body"
            color="primary"
            style={{ textAlign: 'center' }}
            onPress={logout}
          >
            Sign Out
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function MainTabs() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingTop: sharedSpacing.sm,
          paddingBottom: sharedSpacing.sm + insets.bottom,
          height: sharedSpacing.sm + sharedSpacing.sm + 44 + insets.bottom,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.foregroundMuted,
        tabBarLabelStyle: {
          fontFamily: theme.fonts.body,
          fontSize: 12,
          marginTop: sharedSpacing.xs,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon icon={Home01Icon} color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon icon={Search01Icon} color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="LibraryTab"
        component={LibraryScreen}
        options={{
          tabBarLabel: 'Library',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon icon={Book02Icon} color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="StatsTab"
        component={ReadingStatsScreen}
        options={{
          tabBarLabel: 'Stats',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon icon={Analytics01Icon} color={color} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function MainNavigator() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="BookDetail"
          component={BookDetailScreen}
          options={{
            animation: 'fade',
            animationDuration: 300,
          }}
        />
      </Stack.Navigator>
      <SharedElementOverlay />
    </View>
  );
}
