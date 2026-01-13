/**
 * Tests for ClassificationBadges component.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ClassificationBadges } from '../components/molecules/ClassificationBadges';
import type { Audience, Intensity, Mood } from '../types';

jest.mock('@/themes', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#8B4557',
        foreground: '#F5F0E8',
        foregroundMuted: '#A9A29A',
        surfaceAlt: '#2A2520',
        success: '#4ADE80',
        warning: '#FACC15',
        danger: '#EF4444',
      },
      fonts: {
        body: 'System',
      },
      radii: {
        sm: 4,
        md: 8,
      },
    },
    themeName: 'scholar',
  }),
}));

jest.mock('@hugeicons/core-free-icons', () => ({
  UserGroupIcon: 'UserGroupIcon',
  ChildIcon: 'ChildIcon',
  GraduateIcon: 'GraduateIcon',
  User02Icon: 'User02Icon',
  AnalysisTextLinkIcon: 'AnalysisTextLinkIcon',
}));

jest.mock('@/components/atoms', () => ({
  Button: ({ children, onPress }: any) => {
    const { TouchableOpacity } = require('react-native');
    return <TouchableOpacity onPress={onPress} testID="analyze-button">{children}</TouchableOpacity>;
  },
  Text: ({ children, style }: any) => {
    const { Text } = require('react-native');
    return <Text style={style}>{children}</Text>;
  },
  Icon: ({ icon }: any) => {
    const { Text } = require('react-native');
    return <Text testID="icon">{icon}</Text>;
  },
}));

jest.mock('../components/molecules/Chip', () => ({
  Chip: ({ label }: any) => {
    const { Text } = require('react-native');
    return <Text testID="mood-chip">{label}</Text>;
  },
}));

describe('ClassificationBadges', () => {
  describe('Unclassified state', () => {
    it('returns null when not classified and no onAnalyzePress', () => {
      const { toJSON } = render(
        <ClassificationBadges
          isClassified={false}
          isAnalyzing={false}
        />
      );

      expect(toJSON()).toBeNull();
    });

    it('shows Analyze button when not classified and onAnalyzePress provided', () => {
      const onAnalyzePress = jest.fn();

      render(
        <ClassificationBadges
          isClassified={false}
          isAnalyzing={false}
          onAnalyzePress={onAnalyzePress}
        />
      );

      expect(screen.getByText('Analyze Content')).toBeTruthy();
    });

    it('calls onAnalyzePress when button is pressed', () => {
      const onAnalyzePress = jest.fn();

      render(
        <ClassificationBadges
          isClassified={false}
          isAnalyzing={false}
          onAnalyzePress={onAnalyzePress}
        />
      );

      fireEvent.press(screen.getByTestId('analyze-button'));
      expect(onAnalyzePress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Analyzing state', () => {
    it('shows loading indicator when analyzing', () => {
      render(
        <ClassificationBadges
          isClassified={false}
          isAnalyzing={true}
        />
      );

      expect(screen.getByText('Analyzing content...')).toBeTruthy();
    });

    it('does not show Analyze button when analyzing', () => {
      const onAnalyzePress = jest.fn();

      render(
        <ClassificationBadges
          isClassified={false}
          isAnalyzing={true}
          onAnalyzePress={onAnalyzePress}
        />
      );

      expect(screen.queryByTestId('analyze-button')).toBeNull();
    });
  });

  describe('Classified state', () => {
    it('displays audience badge', () => {
      render(
        <ClassificationBadges
          audience="adult"
          audienceLabel="Adult"
          isClassified={true}
        />
      );

      expect(screen.getByText('Adult')).toBeTruthy();
    });

    it('displays audience value when label not provided', () => {
      render(
        <ClassificationBadges
          audience="young_adult"
          isClassified={true}
        />
      );

      expect(screen.getByText('young_adult')).toBeTruthy();
    });

    it('displays intensity badge', () => {
      render(
        <ClassificationBadges
          intensity="moderate"
          intensityLabel="Moderate"
          isClassified={true}
        />
      );

      expect(screen.getByText('Moderate')).toBeTruthy();
    });

    it('displays intensity value when label not provided', () => {
      render(
        <ClassificationBadges
          intensity="dark"
          isClassified={true}
        />
      );

      expect(screen.getByText('dark')).toBeTruthy();
    });

    it('displays mood chips', () => {
      const moods: Mood[] = ['adventurous', 'cozy', 'romantic'];

      render(
        <ClassificationBadges
          moods={moods}
          isClassified={true}
        />
      );

      const chips = screen.getAllByTestId('mood-chip');
      expect(chips).toHaveLength(3);
      expect(screen.getByText('Adventurous')).toBeTruthy();
      expect(screen.getByText('Cozy')).toBeTruthy();
      expect(screen.getByText('Romantic')).toBeTruthy();
    });

    it('limits mood chips to 3', () => {
      const moods: Mood[] = ['adventurous', 'cozy', 'romantic', 'mysterious', 'tense'];

      render(
        <ClassificationBadges
          moods={moods}
          isClassified={true}
        />
      );

      const chips = screen.getAllByTestId('mood-chip');
      expect(chips).toHaveLength(3);
    });

    it('displays all classification data together', () => {
      render(
        <ClassificationBadges
          audience="adult"
          audienceLabel="Adult"
          intensity="moderate"
          intensityLabel="Moderate"
          moods={['adventurous', 'tense']}
          isClassified={true}
        />
      );

      expect(screen.getByText('Adult')).toBeTruthy();
      expect(screen.getByText('Moderate')).toBeTruthy();
      expect(screen.getByText('Adventurous')).toBeTruthy();
      expect(screen.getByText('Tense')).toBeTruthy();
    });

    it('handles null moods array', () => {
      render(
        <ClassificationBadges
          audience="adult"
          audienceLabel="Adult"
          moods={null}
          isClassified={true}
        />
      );

      expect(screen.getByText('Adult')).toBeTruthy();
      expect(screen.queryAllByTestId('mood-chip')).toHaveLength(0);
    });

    it('handles empty moods array', () => {
      render(
        <ClassificationBadges
          audience="adult"
          audienceLabel="Adult"
          moods={[]}
          isClassified={true}
        />
      );

      expect(screen.getByText('Adult')).toBeTruthy();
      expect(screen.queryAllByTestId('mood-chip')).toHaveLength(0);
    });
  });

  describe('Compact mode', () => {
    it('applies compact styling when compact prop is true', () => {
      const { toJSON } = render(
        <ClassificationBadges
          audience="adult"
          audienceLabel="Adult"
          isClassified={true}
          compact={true}
        />
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Mood label mapping', () => {
    const moodLabels: Record<Mood, string> = {
      adventurous: 'Adventurous',
      romantic: 'Romantic',
      suspenseful: 'Suspenseful',
      humorous: 'Humorous',
      melancholic: 'Melancholic',
      inspirational: 'Inspirational',
      mysterious: 'Mysterious',
      cozy: 'Cozy',
      tense: 'Tense',
      thought_provoking: 'Thought-Provoking',
    };

    Object.entries(moodLabels).forEach(([mood, label]) => {
      it(`maps ${mood} to ${label}`, () => {
        render(
          <ClassificationBadges
            moods={[mood as Mood]}
            isClassified={true}
          />
        );

        expect(screen.getByText(label)).toBeTruthy();
      });
    });
  });

  describe('Audience icon mapping', () => {
    const audiences: Audience[] = ['adult', 'young_adult', 'middle_grade', 'children'];

    audiences.forEach((audience) => {
      it(`renders icon for ${audience} audience`, () => {
        render(
          <ClassificationBadges
            audience={audience}
            isClassified={true}
          />
        );

        expect(screen.getByTestId('icon')).toBeTruthy();
      });
    });
  });
});
