import React, { Component, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { Alert02Icon } from '@hugeicons/core-free-icons';
import { Text, Icon, Button } from '@/components/atoms';
import { Card } from '@/components/organisms';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInner extends Component<
  ErrorBoundaryProps & { resetErrorBoundary: () => void },
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps & { resetErrorBoundary: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.resetErrorBoundary();
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Card variant="outlined" padding="lg">
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <Icon icon={Alert02Icon} size={32} color="#8b2e2e" />
              </View>
              <Text variant="h3" style={styles.title}>
                Something went wrong
              </Text>
              <Text variant="body" muted style={styles.message}>
                {this.state.error?.message || 'An unexpected error occurred'}
              </Text>
              <View style={styles.buttonContainer}>
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={this.handleReset}
                >
                  Try Again
                </Button>
              </View>
            </View>
          </Card>
        </View>
      );
    }

    return this.props.children;
  }
}

export function QueryErrorBoundary({ children, fallback, onReset }: ErrorBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundaryInner
          fallback={fallback}
          onReset={onReset}
          resetErrorBoundary={reset}
        >
          {children}
        </ErrorBoundaryInner>
      )}
    </QueryErrorResetBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 8,
  },
});
