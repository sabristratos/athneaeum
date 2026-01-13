import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerHaptic } from '@/hooks/useHaptic';
import {
  Cancel01Icon,
  Camera01Icon,
  Edit02Icon,
  CheckmarkCircle02Icon,
  Tick02Icon,
  Delete02Icon,
} from '@hugeicons/core-free-icons';
import { Text, Button, Icon, IconButton } from '@/components/atoms';
import { Input, MoodSelector } from '@/components/molecules';
import { ConfirmModal, type ModalStatus } from './ConfirmModal';
import { useTheme } from '@/themes';
import { formatShortDateWithYear } from '@/utils/dateUtils';
import type { QuoteMood, Quote } from '@/types/quote';

interface AlertModalState {
  visible: boolean;
  title: string;
  message: string;
  status: ModalStatus;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface OCRLine {
  text: string;
}

interface OCRBlock {
  text?: string;
  lines?: OCRLine[];
}


interface CameraModule {
  CameraView: React.ComponentType<{
    ref?: React.RefObject<CameraViewRef | null>;
    style?: object;
    facing?: 'front' | 'back';
    children?: React.ReactNode;
  }>;
  useCameraPermissions: () => [
    { granted: boolean } | null,
    () => Promise<{ granted: boolean }>
  ];
}

interface CameraViewRef {
  takePictureAsync: (options?: {
    quality?: number;
    base64?: boolean;
  }) => Promise<{ uri: string }>;
}

interface MlKitOcrResult {
  text: string;
  blocks: OCRBlock[];
}

interface MlKitOcrModule {
  recognizeText: (uri: string) => Promise<MlKitOcrResult>;
}

// Camera and OCR are optional - will use manual entry if not available
let CameraView: CameraModule['CameraView'] | null = null;
let useCameraPermissions: CameraModule['useCameraPermissions'] | null = null;
let MlKitOcr: MlKitOcrModule | null = null;

try {
  const cameraModule = require('expo-camera');
  CameraView = cameraModule.CameraView;
  useCameraPermissions = cameraModule.useCameraPermissions;
} catch {
  // Camera not available
}

try {
  MlKitOcr = require('rn-mlkit-ocr').default;
} catch {
  // OCR not available
}

type ModalMode = 'camera' | 'select' | 'edit';

interface TextBlock {
  text: string;
  id: string;
}

// Character limits
const QUOTE_MAX_LENGTH = 2000;
const NOTE_MAX_LENGTH = 500;

interface QuoteCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    text: string;
    pageNumber?: number;
    note?: string;
    mood?: QuoteMood;
  }) => void;
  onDelete?: (id: string) => void;
  editingQuote?: Quote;
  totalPages?: number;
}

export function QuoteCaptureModal({
  visible,
  onClose,
  onSave,
  onDelete,
  editingQuote,
  totalPages,
}: QuoteCaptureModalProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraViewRef>(null);

  const [mode, setMode] = useState<ModalMode>(editingQuote ? 'edit' : 'camera');
  const [quoteText, setQuoteText] = useState(editingQuote?.text ?? '');
  const [pageNumber, setPageNumber] = useState(
    editingQuote?.pageNumber?.toString() ?? ''
  );
  const [note, setNote] = useState(editingQuote?.note ?? '');
  const [mood, setMood] = useState<QuoteMood | undefined>(editingQuote?.mood);
  const [processing, setProcessing] = useState(false);
  const [recognizedBlocks, setRecognizedBlocks] = useState<TextBlock[]>([]);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [alertModal, setAlertModal] = useState<AlertModalState>({
    visible: false,
    title: '',
    message: '',
    status: 'warning',
  });
  const [pageError, setPageError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Computed values
  const canSave = useMemo(() => {
    return quoteText.trim().length > 0 && !pageError;
  }, [quoteText, pageError]);

  // Format creation date
  const formattedCreatedAt = useMemo(() => {
    if (!editingQuote?.createdAt) return null;
    return formatShortDateWithYear(editingQuote.createdAt);
  }, [editingQuote?.createdAt]);

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions?.() ?? [
    null,
    () => Promise.resolve({ granted: false }),
  ];

  const hasCamera = CameraView !== null && permission?.granted;
  const hasOCR = MlKitOcr !== null;

  useEffect(() => {
    if (visible) {
      if (editingQuote) {
        setMode('edit');
        setQuoteText(editingQuote.text);
        setPageNumber(editingQuote.pageNumber?.toString() ?? '');
        setNote(editingQuote.note ?? '');
        setMood(editingQuote.mood);
        setRecognizedBlocks([]);
        setSelectedBlockIds(new Set());
        setPageError(null);
        setShowDeleteConfirm(false);
      } else {
        setMode(hasCamera && hasOCR ? 'camera' : 'edit');
        setQuoteText('');
        setPageNumber('');
        setNote('');
        setMood(undefined);
        setRecognizedBlocks([]);
        setSelectedBlockIds(new Set());
        setPageError(null);
        setShowDeleteConfirm(false);
      }
    }
  }, [visible, editingQuote, hasCamera, hasOCR]);

  // Validate page number when it changes
  const handlePageNumberChange = (value: string) => {
    setPageNumber(value);

    if (!value.trim()) {
      setPageError(null);
      return;
    }

    const page = parseInt(value, 10);
    if (isNaN(page) || page < 1) {
      setPageError('Page must be a positive number');
    } else if (totalPages && page > totalPages) {
      setPageError(`Page cannot exceed ${totalPages}`);
    } else {
      setPageError(null);
    }
  };

  // Handle delete with confirmation
  const handleDelete = () => {
    if (editingQuote && onDelete) {
      onDelete(editingQuote.id);
      onClose();
    }
  };

  // Handle scan button press with proper checks and feedback
  const handleScanPress = async () => {
    // Check if camera module loaded
    if (!CameraView) {
      setAlertModal({
        visible: true,
        title: 'Camera Unavailable',
        message: 'The camera module could not be loaded. Please restart the app or use manual entry.',
        status: 'warning',
      });
      return;
    }

    // Check/request camera permission
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setAlertModal({
          visible: true,
          title: 'Camera Permission Required',
          message: 'Please grant camera access in your device settings to scan book pages.',
          status: 'warning',
        });
        return;
      }
    }

    // Check if OCR module loaded
    if (!MlKitOcr) {
      setAlertModal({
        visible: true,
        title: 'Text Recognition Unavailable',
        message: 'The text recognition module could not be loaded. Please use manual entry.',
        status: 'warning',
      });
      return;
    }

    // All good - open camera
    setMode('camera');
  };

  const handleCapture = async () => {
    if (!cameraRef.current || !MlKitOcr) return;

    setProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      // rn-mlkit-ocr returns { text, blocks }
      const result = await MlKitOcr.recognizeText(photo.uri);

      // Extract text blocks from ML Kit result
      // ML Kit returns blocks (paragraphs) which contain lines
      const blocks: TextBlock[] = [];
      if (result.blocks && result.blocks.length > 0) {
        result.blocks.forEach((block: OCRBlock, blockIndex: number) => {
          // Each block can have multiple lines - we can show lines for finer selection
          if (block.lines && block.lines.length > 0) {
            block.lines.forEach((line: OCRLine, lineIndex: number) => {
              if (line.text && line.text.trim()) {
                blocks.push({
                  id: `${blockIndex}-${lineIndex}`,
                  text: line.text.trim(),
                });
              }
            });
          } else if (block.text && block.text.trim()) {
            // Fallback to block text if no lines
            blocks.push({
              id: `${blockIndex}`,
              text: block.text.trim(),
            });
          }
        });
      }

      if (blocks.length > 0) {
        setRecognizedBlocks(blocks);
        // Auto-select all blocks initially
        setSelectedBlockIds(new Set(blocks.map(b => b.id)));
        setMode('select');
        triggerHaptic('success');
      } else {
        setAlertModal({
          visible: true,
          title: 'No Text Found',
          message: 'Could not detect any text. Try again or enter manually.',
          status: 'warning',
          confirmLabel: 'Enter Manually',
          cancelLabel: 'Try Again',
          onConfirm: () => setMode('edit'),
        });
      }
    } catch {
      setAlertModal({
        visible: true,
        title: 'Error',
        message: 'Failed to process image. Please try again.',
        status: 'error',
      });
    } finally {
      setProcessing(false);
    }
  };

  // Toggle block selection
  const toggleBlockSelection = (blockId: string) => {
    setSelectedBlockIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(blockId)) {
        newSet.delete(blockId);
        triggerHaptic('light');
      } else {
        newSet.add(blockId);
        triggerHaptic('medium');
      }
      return newSet;
    });
  };

  // Select all blocks
  const selectAllBlocks = () => {
    setSelectedBlockIds(new Set(recognizedBlocks.map(b => b.id)));
    triggerHaptic('medium');
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedBlockIds(new Set());
    triggerHaptic('light');
  };

  // Use selected blocks and go to edit mode
  const useSelectedBlocks = () => {
    const selectedText = recognizedBlocks
      .filter(block => selectedBlockIds.has(block.id))
      .map(block => block.text)
      .join(' ');

    if (!selectedText.trim()) {
      setAlertModal({
        visible: true,
        title: 'No Selection',
        message: 'Please select at least one text block.',
        status: 'warning',
      });
      return;
    }

    setQuoteText(selectedText.trim());
    setMode('edit');
    triggerHaptic('success');
  };

  const handleSave = () => {
    // Validate quote text (should be caught by disabled button, but double-check)
    if (!quoteText.trim()) {
      return;
    }

    // Validate page number if provided
    if (pageNumber.trim()) {
      const page = parseInt(pageNumber, 10);
      if (isNaN(page) || page < 1) {
        setPageError('Page must be a positive number');
        return;
      }
      if (totalPages && page > totalPages) {
        setPageError(`Page cannot exceed ${totalPages}`);
        return;
      }
    }

    onSave({
      text: quoteText.trim(),
      pageNumber: pageNumber ? parseInt(pageNumber, 10) : undefined,
      note: note.trim() || undefined,
      mood,
    });
    onClose();
  };

  const renderCameraMode = () => {
    if (!hasCamera || !CameraView) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing.xl,
          }}
        >
          <Text
            variant="body"
            style={{
              textAlign: 'center',
              color: theme.colors.foregroundMuted,
              marginBottom: theme.spacing.lg,
            }}
          >
            Camera access is required for OCR scanning.
          </Text>
          {permission === null ? (
            <Button onPress={requestPermission}>Grant Camera Access</Button>
          ) : (
            <Button onPress={() => setMode('edit')}>Enter Manually</Button>
          )}
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="back"
        />
        {/* Camera overlay - positioned absolutely on top */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingBottom: theme.spacing.xl + insets.bottom,
          }}
        >
          {/* Capture area indicator */}
          <View
            style={{
              position: 'absolute',
              top: '20%',
              left: '10%',
              right: '10%',
              bottom: '30%',
              borderWidth: 2,
              borderColor: theme.colors.overlayLight,
              borderRadius: theme.radii.lg,
              borderStyle: 'dashed',
            }}
          />

          {/* Controls */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.xl,
            }}
          >
            <TouchableOpacity
              onPress={() => setMode('edit')}
              style={{
                padding: theme.spacing.md,
                backgroundColor: theme.colors.overlay,
                borderRadius: theme.radii.full,
              }}
            >
              <Icon icon={Edit02Icon} size={24} color={theme.colors.onPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCapture}
              disabled={processing}
              style={{
                padding: theme.spacing.lg,
                backgroundColor: '#ffffff',
                borderRadius: theme.radii.full,
                opacity: processing ? 0.5 : 1,
              }}
            >
              <Icon icon={Camera01Icon} size={32} color={theme.colors.shadow} />
            </TouchableOpacity>

            <View style={{ width: 56 }} />
          </View>
        </View>
      </View>
    );
  };

  const renderSelectMode = () => {
    const selectedCount = selectedBlockIds.size;
    const totalCount = recognizedBlocks.length;

    return (
      <View style={{ flex: 1 }}>
        {/* Instructions & selection controls */}
        <View
          style={{
            padding: theme.spacing.md,
            backgroundColor: theme.colors.canvas,
            borderBottomWidth: theme.borders.thin,
            borderBottomColor: theme.colors.border,
          }}
        >
          <Text
            variant="body"
            style={{
              color: theme.colors.foregroundMuted,
              marginBottom: theme.spacing.sm,
              textAlign: 'center',
            }}
          >
            Tap lines to select or deselect
          </Text>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: theme.spacing.md,
            }}
          >
            <TouchableOpacity onPress={selectAllBlocks}>
              <Text
                variant="label"
                style={{
                  color: theme.colors.primary,
                }}
              >
                Select All
              </Text>
            </TouchableOpacity>
            <Text
              variant="caption"
              style={{ color: theme.colors.foregroundMuted }}
            >
              |
            </Text>
            <TouchableOpacity onPress={clearAllSelections}>
              <Text
                variant="label"
                style={{
                  color: theme.colors.primary,
                }}
              >
                Clear All
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Text blocks */}
        <ScrollView
          contentContainerStyle={{
            padding: theme.spacing.md,
            gap: theme.spacing.xs,
          }}
        >
          {recognizedBlocks.map((block) => {
            const isSelected = selectedBlockIds.has(block.id);
            return (
              <TouchableOpacity
                key={block.id}
                onPress={() => toggleBlockSelection(block.id)}
                activeOpacity={0.7}
                style={{
                  padding: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                  backgroundColor: isSelected
                    ? theme.colors.surfaceHover
                    : theme.colors.surface,
                  borderWidth: isSelected ? 2 : theme.borders.thin,
                  borderColor: isSelected
                    ? theme.colors.primary
                    : theme.colors.border,
                  borderRadius: isScholar ? theme.radii.sm : theme.radii.md,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: theme.spacing.sm,
                }}
              >
                {/* Selection indicator */}
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: theme.radii.sm,
                    borderWidth: isSelected ? 0 : theme.borders.thin,
                    borderColor: theme.colors.border,
                    backgroundColor: isSelected
                      ? theme.colors.primary
                      : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: 2,
                  }}
                >
                  {isSelected && (
                    <Icon icon={Tick02Icon} size={14} color={theme.colors.onPrimary} />
                  )}
                </View>

                {/* Text content */}
                <Text
                  variant="body"
                  style={{
                    flex: 1,
                    color: isSelected
                      ? theme.colors.foreground
                      : theme.colors.foregroundMuted,
                    fontFamily: theme.fonts.body,
                    lineHeight: 22,
                  }}
                >
                  {block.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Bottom actions */}
        <View
          style={{
            padding: theme.spacing.md,
            paddingBottom: theme.spacing.lg + insets.bottom,
            borderTopWidth: theme.borders.thin,
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            gap: theme.spacing.sm,
          }}
        >
          <Text
            variant="caption"
            style={{
              color: theme.colors.foregroundMuted,
              textAlign: 'center',
            }}
          >
            {selectedCount} of {totalCount} lines selected
          </Text>
          <View
            style={{
              flexDirection: 'row',
              gap: theme.spacing.md,
            }}
          >
            <View style={{ flex: 1 }}>
              <Button
                variant="secondary"
                onPress={() => setMode('camera')}
                fullWidth
              >
                Retake
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button
                variant="primary"
                onPress={useSelectedBlocks}
                fullWidth
                disabled={selectedCount === 0}
              >
                Use Selection
              </Button>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderEditMode = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.lg + insets.bottom,
          gap: theme.spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Creation date for editing */}
        {editingQuote && formattedCreatedAt && (
          <Text
            variant="caption"
            style={{
              color: theme.colors.foregroundMuted,
              textAlign: 'center',
              marginBottom: -theme.spacing.sm,
            }}
          >
            Added {formattedCreatedAt}
          </Text>
        )}

        {/* Quote text */}
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text
              variant="label"
              style={{ color: theme.colors.foregroundMuted }}
            >
              Quote
            </Text>
            <Text
              variant="caption"
              style={{
                color: quoteText.length > QUOTE_MAX_LENGTH * 0.9
                  ? theme.colors.danger
                  : theme.colors.foregroundMuted,
              }}
            >
              {quoteText.length}/{QUOTE_MAX_LENGTH}
            </Text>
          </View>
          <TextInput
            value={quoteText}
            onChangeText={(text) => setQuoteText(text.slice(0, QUOTE_MAX_LENGTH))}
            placeholder="Enter or paste quote text..."
            placeholderTextColor={theme.colors.foregroundMuted}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={QUOTE_MAX_LENGTH}
            style={{
              backgroundColor: theme.colors.canvas,
              borderWidth: theme.borders.thin,
              borderColor: theme.colors.border,
              borderRadius: isScholar ? theme.radii.md : theme.radii.lg,
              padding: theme.spacing.md,
              minHeight: 150,
              fontFamily: theme.fonts.body,
              fontSize: 16,
              color: theme.colors.foreground,
              fontStyle: 'italic',
            }}
          />
          {!quoteText.trim() && (
            <Text
              variant="caption"
              style={{ color: theme.colors.foregroundMuted }}
            >
              Quote text is required
            </Text>
          )}
        </View>

        {/* Page number */}
        <View style={{ gap: theme.spacing.sm }}>
          <Text
            variant="label"
            style={{ color: theme.colors.foregroundMuted }}
          >
            Page Number (optional){totalPages ? ` Â· max ${totalPages}` : ''}
          </Text>
          <TextInput
            value={pageNumber}
            onChangeText={handlePageNumberChange}
            placeholder="e.g. 42"
            placeholderTextColor={theme.colors.foregroundMuted}
            keyboardType="number-pad"
            style={{
              backgroundColor: theme.colors.canvas,
              borderWidth: theme.borders.thin,
              borderColor: pageError ? theme.colors.danger : theme.colors.border,
              borderRadius: isScholar ? theme.radii.md : theme.radii.lg,
              padding: theme.spacing.md,
              fontFamily: theme.fonts.body,
              fontSize: 16,
              color: theme.colors.foreground,
            }}
          />
          {pageError && (
            <Text
              variant="caption"
              style={{ color: theme.colors.danger }}
            >
              {pageError}
            </Text>
          )}
        </View>

        {/* Note */}
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text
              variant="label"
              style={{ color: theme.colors.foregroundMuted }}
            >
              Your Thoughts (optional)
            </Text>
            <Text
              variant="caption"
              style={{
                color: note.length > NOTE_MAX_LENGTH * 0.9
                  ? theme.colors.danger
                  : theme.colors.foregroundMuted,
              }}
            >
              {note.length}/{NOTE_MAX_LENGTH}
            </Text>
          </View>
          <TextInput
            value={note}
            onChangeText={(text) => setNote(text.slice(0, NOTE_MAX_LENGTH))}
            placeholder="What does this quote mean to you?"
            placeholderTextColor={theme.colors.foregroundMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={NOTE_MAX_LENGTH}
            style={{
              backgroundColor: theme.colors.canvas,
              borderWidth: theme.borders.thin,
              borderColor: theme.colors.border,
              borderRadius: isScholar ? theme.radii.md : theme.radii.lg,
              padding: theme.spacing.md,
              minHeight: 80,
              fontFamily: theme.fonts.body,
              fontSize: 16,
              color: theme.colors.foreground,
            }}
          />
        </View>

        {/* Mood selector */}
        <View style={{ gap: theme.spacing.sm }}>
          <Text
            variant="label"
            style={{ color: theme.colors.foregroundMuted }}
          >
            How did it make you feel?
          </Text>
          <MoodSelector value={mood} onChange={setMood} />
        </View>

        {/* Action buttons */}
        <View
          style={{
            gap: theme.spacing.md,
            marginTop: theme.spacing.md,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              gap: theme.spacing.md,
            }}
          >
            {!editingQuote && (
              <View style={{ flex: 1 }}>
                <Button
                  variant="secondary"
                  onPress={handleScanPress}
                  fullWidth
                >
                  Scan Page
                </Button>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Button
                variant="primary"
                onPress={handleSave}
                fullWidth
                disabled={!canSave}
              >
                Save Quote
              </Button>
            </View>
          </View>

          {/* Delete button for editing */}
          {editingQuote && onDelete && (
            <Button
              variant="ghost"
              onPress={() => setShowDeleteConfirm(true)}
              fullWidth
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Icon icon={Delete02Icon} size={18} color={theme.colors.danger} />
                <Text variant="body" style={{ color: theme.colors.danger }}>
                  Delete Quote
                </Text>
              </View>
            </Button>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.surface,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: theme.spacing.md + insets.top,
            paddingBottom: theme.spacing.md,
            paddingHorizontal: theme.spacing.md,
            borderBottomWidth: theme.borders.thin,
            borderBottomColor: theme.colors.border,
          }}
        >
          <Text variant="h3" style={{ color: theme.colors.foreground }}>
            {editingQuote
              ? 'Edit Quote'
              : mode === 'camera'
              ? 'Scan Quote'
              : mode === 'select'
              ? 'Select Text'
              : 'Add Quote'}
          </Text>
          <IconButton
            icon={Cancel01Icon}
            onPress={onClose}
            variant="ghost"
            size="sm"
            accessibilityLabel="Close"
          />
        </View>

        {/* Content */}
        {mode === 'camera' && renderCameraMode()}
        {mode === 'select' && renderSelectMode()}
        {mode === 'edit' && renderEditMode()}

        {/* Alert Modal */}
        <ConfirmModal
          visible={alertModal.visible}
          onClose={() => setAlertModal((prev) => ({ ...prev, visible: false }))}
          title={alertModal.title}
          message={alertModal.message}
          status={alertModal.status}
          confirmLabel={alertModal.confirmLabel}
          cancelLabel={alertModal.cancelLabel}
          onConfirm={alertModal.onConfirm}
          onCancel={alertModal.onCancel}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          visible={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title="Delete Quote"
          message="Are you sure you want to delete this quote? This action cannot be undone."
          status="danger"
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleDelete}
          confirmDestructive
        />
      </View>
    </Modal>
  );
}

