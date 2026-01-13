import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { triggerHaptic } from '@/hooks/useHaptic';
import { Cancel01Icon, Camera01Icon } from '@hugeicons/core-free-icons';
import { Text, Button, Icon, Pressable } from '@/components/atoms';
import { useTheme } from '@/themes';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (isbn: string) => void;
}

export function BarcodeScannerModal({
  visible,
  onClose,
  onScan,
}: BarcodeScannerModalProps) {
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);
  const lastScannedRef = useRef<string | null>(null);

  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (hasScanned) return;

      const { data, type } = result;

      if (data === lastScannedRef.current) return;
      lastScannedRef.current = data;

      const isIsbn =
        (type === 'ean13' || type === 'ean8') &&
        (data.startsWith('978') || data.startsWith('979') || data.length === 10);

      if (isIsbn || type === 'ean13') {
        setHasScanned(true);
        triggerHaptic('success');
        onScan(data);
        onClose();
      }
    },
    [hasScanned, onScan, onClose]
  );

  const handleClose = useCallback(() => {
    setHasScanned(false);
    lastScannedRef.current = null;
    onClose();
  }, [onClose]);

  const renderContent = () => {
    if (!permission) {
      return (
        <View style={styles.centeredContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="body" muted style={{ marginTop: theme.spacing.md }}>
            Checking camera permission...
          </Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={[styles.centeredContent, { padding: theme.spacing.xl }]}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: `${theme.colors.primary}20` },
            ]}
          >
            <Icon icon={Camera01Icon} size={32} color={theme.colors.primary} />
          </View>
          <Text
            variant="h3"
            style={{ marginTop: theme.spacing.lg, textAlign: 'center' }}
          >
            Camera Access Needed
          </Text>
          <Text
            variant="body"
            muted
            style={{ marginTop: theme.spacing.sm, textAlign: 'center' }}
          >
            To scan book barcodes, we need access to your camera.
          </Text>
          <View style={{ marginTop: theme.spacing.xl, width: '100%', gap: theme.spacing.sm }}>
            <Button variant="primary" onPress={requestPermission} fullWidth>
              Grant Permission
            </Button>
            <Button variant="secondary" onPress={handleClose} fullWidth>
              Cancel
            </Button>
          </View>
        </View>
      );
    }

    return (
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
        }}
        onBarcodeScanned={handleBarcodeScanned}
      >
        <View style={styles.overlay}>
          <Pressable
            onPress={handleClose}
            style={[
              styles.closeButton,
              { backgroundColor: theme.colors.overlay },
            ]}
          >
            <Icon icon={Cancel01Icon} size={24} color="#ffffff" />
          </Pressable>

          <View style={styles.scanArea}>
            <View
              style={[
                styles.scanFrame,
                { borderColor: theme.colors.primary },
              ]}
            />
          </View>

          <View
            style={[
              styles.instructions,
              { backgroundColor: theme.colors.overlay },
            ]}
          >
            <Text variant="body" style={{ color: '#ffffff', textAlign: 'center' }}>
              Position the barcode within the frame
            </Text>
            <Text
              variant="caption"
              style={{ color: '#ffffffcc', textAlign: 'center', marginTop: theme.spacing.xs }}
            >
              ISBN barcodes start with 978 or 979
            </Text>
          </View>
        </View>
      </CameraView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.canvas },
        ]}
      >
        {renderContent()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 280,
    height: 160,
    borderWidth: 3,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  instructions: {
    paddingVertical: 24,
    paddingHorizontal: 32,
    marginBottom: 40,
    marginHorizontal: 20,
    borderRadius: 16,
  },
});

