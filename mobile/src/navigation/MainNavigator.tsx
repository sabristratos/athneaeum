import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SharedElementOverlay, FloatingNavBar } from '@/components';
import { useTheme } from '@/themes';
import { HomeScreen } from '@/features/home';
import { LibraryScreen } from '@/features/library/LibraryScreen';
import { BookDetailScreen } from '@/features/library/BookDetailScreen';
import { SeriesDetailScreen } from '@/features/library/SeriesDetailScreen';
import { ReaderDNAScreen } from '@/features/stats';
import { ProfileScreen, EditionGalleryScreen, EditProfileScreen, ChangePasswordScreen, ReadingGoalsScreen } from '@/features/profile';
import { TagManagementScreen, OPDSSettingsScreen, PreferencesScreen } from '@/features/settings';
import { TierListScreen } from '@/features/tierList';
import { AuthorIndexScreen } from '@/features/authors';
import { DiscoveryScreen, CatalogBookDetailScreen } from '@/features/discovery';
import type { UserBook } from '@/types';
import type { CatalogBook } from '@/types/discovery';

export type MainTabParamList = {
  HomeTab: undefined;
  DiscoveryTab: undefined;
  LibraryTab: { genreSlug?: string } | undefined;
  ProfileTab: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  BookDetail: { userBook: UserBook };
  SeriesDetail: { seriesId: number; seriesTitle: string };
  CatalogBookDetail: { catalogBook: CatalogBook };
  TagManagement: undefined;
  OPDSSettings: undefined;
  Preferences: undefined;
  AuthorIndex: undefined;
  EditionGallery: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  ReadingGoals: undefined;
  ReadingStats: undefined;
  TierList: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingNavBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="DiscoveryTab" component={DiscoveryScreen} />
      <Tab.Screen name="LibraryTab" component={LibraryScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function MainNavigator() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          freezeOnBlur: true,
          animation: 'slide_from_right',
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
        <Stack.Screen
          name="SeriesDetail"
          component={SeriesDetailScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="CatalogBookDetail"
          component={CatalogBookDetailScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="TagManagement"
          component={TagManagementScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="OPDSSettings"
          component={OPDSSettingsScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="Preferences"
          component={PreferencesScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="AuthorIndex"
          component={AuthorIndexScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="EditionGallery"
          component={EditionGalleryScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="EditProfile"
          component={EditProfileScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="ChangePassword"
          component={ChangePasswordScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="ReadingGoals"
          component={ReadingGoalsScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="ReadingStats"
          component={ReaderDNAScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="TierList"
          component={TierListScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
      </Stack.Navigator>
      <SharedElementOverlay />
    </View>
  );
}
