import React from 'react';
import { View } from 'react-native';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Progress } from '@/components/Progress';
import { useTheme } from '@/themes';

interface ReadingProgressCardProps {
  currentPage: number;
  totalPages: number;
  onLogPress: () => void;
}

export function ReadingProgressCard({
  currentPage,
  totalPages,
  onLogPress,
}: ReadingProgressCardProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const percentage = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;
  const pagesRemaining = totalPages - currentPage;

  // Theme-specific encouragement copy
  const getEncouragementText = () => {
    if (percentage >= 90) {
      return isScholar ? 'The final chapter awaits...' : 'Almost there! You got this!';
    }
    if (percentage >= 50) {
      return isScholar ? 'Steadily progressing through the tome.' : 'Halfway through! Keep going!';
    }
    if (percentage >= 25) {
      return isScholar ? 'A journey of a thousand pages begins.' : 'Great start! Keep reading!';
    }
    return isScholar ? 'Begin your literary expedition.' : 'Every page counts!';
  };

  return (
    <Card variant="elevated" padding="lg">
      <View style={{ gap: theme.spacing.md }}>
        {/* Progress Section */}
        <View style={{ gap: theme.spacing.sm }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <Text variant="h3">
              {isScholar ? 'Reading Progress' : 'Your Progress'}
            </Text>
            <Text variant="caption" muted>
              {percentage}%
            </Text>
          </View>

          <Progress value={currentPage} max={totalPages} size="lg" showPercentage={false} />

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text variant="body">
              Page {currentPage} of {totalPages}
            </Text>
            <Text variant="caption" muted>
              {pagesRemaining} remaining
            </Text>
          </View>

          <Text
            variant="caption"
            muted
            style={{
              fontStyle: isScholar ? 'italic' : 'normal',
              textAlign: 'center',
              marginTop: theme.spacing.xs,
            }}
          >
            {getEncouragementText()}
          </Text>
        </View>

        {/* Log Session Button */}
        <Button variant="primary" fullWidth onPress={onLogPress}>
          {isScholar ? 'Log Reading Session' : 'Log Reading'}
        </Button>
      </View>
    </Card>
  );
}
