import React, { memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Delete02Icon, ArrowDown01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import {
  Text,
  Icon,
  Chip,
  Divider,
  CollapsibleSection,
  AnimatedBookHero,
  SessionCard,
  ControlDeckCard,
  ExLibrisSection,
  MarginaliaSection,
  QuickActionsRow,
  BottomSheet,
  DNFModal,
  QuoteCaptureModal,
  ReadingProgressCard,
  ReadingSessionModal,
  EditSessionModal,
  ConfirmModal,
  StickyHeader,
  FloatingActionButton,
  TextureBackground,
} from '@/components';
import { useTheme } from '@/themes';
import { useBookDetailController } from '@/features/library/hooks/useBookDetailController';

export const BookDetailScreen = memo(function BookDetailScreen() {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const {
    userBook,
    book,
    showQuoteModal,
    showSessionModal,
    showEditSessionModal,
    editingSession,
    showMenu,
    showDnfModal,
    showStatusPicker,
    editingQuote,
    modal,
    sessions,
    quotes,
    setShowQuoteModal,
    setShowSessionModal,
    setShowEditSessionModal,
    setEditingSession,
    setShowMenu,
    setShowDnfModal,
    setShowStatusPicker,
    setEditingQuote,
    closeModal,
    handleStatusChange,
    handleRatingChange,
    handleLogSession,
    handleShare,
    handleDnf,
    handleRemove,
    handleSaveQuote,
    handleQuotePress,
    handleAddQuote,
    handleSessionPress,
    handleUpdateSession,
    handleDeleteSession,
    handleFabPress,
    handleHeroHeightMeasured,
    goBack,
    handleOpenStatusPicker,
    handleCloseStatusPicker,
    handleOpenSessionModal,
    handleCloseSessionModal,
    handleOpenDnfModal,
    handleCloseDnfModal,
    handleOpenMenu,
    handleCloseMenu,
    handleCloseQuoteModal,
    handleCloseEditSessionModal,
    handleMenuRemove,
    handleStatusSelect,
    statusOptions,
    fabConfig,
    showProgress,
    showDnfAction,
    stageHeight,
    scrollY,
    scrollHandler,
    fabVisible,
    insets,
  } = useBookDetailController();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.canvas }]}>
      <TextureBackground>
                <StickyHeader
          title={book.title}
          scrollY={scrollY}
          titleFadeStart={150}
          titleFadeEnd={250}
          onBackPress={goBack}
          onMenuPress={handleOpenMenu}
        />

                <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={{
            paddingTop: insets.top + 56,
            paddingBottom: 120,
          }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={scrollHandler}
        >
                    <View style={{ paddingHorizontal: theme.spacing.lg }}>
            <AnimatedBookHero
              book={book}
              userBook={userBook}
              showRating={false}
              showStatus={false}
              scrollY={scrollY}
              stageHeight={stageHeight}
              enableParallax
              onHeightMeasured={handleHeroHeightMeasured}
            />
          </View>

                    <View
            style={{
              marginTop: theme.spacing.md,
              paddingHorizontal: theme.spacing.lg,
              alignItems: 'center',
            }}
          >
            <TouchableOpacity
              onPress={handleOpenStatusPicker}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.lg,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radii.full,
                borderWidth: theme.borders.thin,
                borderColor: theme.colors.border,
              }}
            >
              <Text variant="body" style={{ color: theme.colors.foreground }}>
                {userBook.status_label}
              </Text>
              <View style={{ marginLeft: theme.spacing.sm }}>
                <Icon
                  icon={ArrowDown01Icon}
                  size={16}
                  color={theme.colors.foregroundMuted}
                />
              </View>
            </TouchableOpacity>
          </View>

                    <View style={{ paddingHorizontal: theme.spacing.lg }}>
            <QuickActionsRow
              onLogPress={handleOpenSessionModal}
              onSharePress={handleShare}
              onDnfPress={handleOpenDnfModal}
              showDnf={showDnfAction}
            />
          </View>

                    {showProgress && (
            <>
              <Divider variant="ornate" spacing="lg" />
              <View style={{ paddingHorizontal: theme.spacing.lg }}>
                <ControlDeckCard
                  currentPage={userBook.current_page}
                  totalPages={book.page_count!}
                  rating={userBook.rating}
                  onRatingChange={handleRatingChange}
                  overlapHero
                />
              </View>
            </>
          )}

                    {!showProgress && (
            <>
              <Divider variant="ornate" spacing="lg" />
              <View style={{ paddingHorizontal: theme.spacing.lg }}>
                <ControlDeckCard
                  currentPage={0}
                  totalPages={book.page_count ?? 100}
                  rating={userBook.rating}
                  onRatingChange={handleRatingChange}
                  overlapHero
                />
              </View>
            </>
          )}

                    <Divider variant="ornate" spacing="lg" />
          <View style={{ paddingHorizontal: theme.spacing.lg }}>
            <ExLibrisSection book={book} userBook={userBook} />
          </View>

                    <Divider variant="ornate" spacing="lg" />
          <MarginaliaSection
            quotes={quotes}
            onAddQuote={handleAddQuote}
            onQuotePress={handleQuotePress}
          />

                    {(book.description ||
            (Array.isArray(book.genres) && book.genres.length > 0)) && (
            <>
              <Divider variant="ornate" spacing="lg" />
              <View style={{ paddingHorizontal: theme.spacing.lg }}>
                <CollapsibleSection title="About This Book" defaultExpanded={true}>
                  <View style={{ gap: theme.spacing.md }}>
                    {book.description && (
                      <Text variant="body" muted style={styles.descriptionText}>
                        {book.description}
                      </Text>
                    )}

                    {Array.isArray(book.genres) && book.genres.length > 0 && (
                      <View style={{ gap: theme.spacing.sm }}>
                        <Text variant="label" muted>
                          Genres
                        </Text>
                        <View
                          style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: theme.spacing.xs,
                          }}
                        >
                          {book.genres.map((genre, i) => (
                            <Chip key={i} label={genre} size="sm" variant="muted" />
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                </CollapsibleSection>
              </View>
            </>
          )}

                    {Array.isArray(sessions) && sessions.length > 0 && (
            <>
              <Divider variant="ornate" spacing="lg" />
              <View style={{ paddingHorizontal: theme.spacing.lg }}>
                <CollapsibleSection
                  title="Reading History"
                  count={sessions.length}
                  defaultExpanded={false}
                >
                  <View style={{ gap: theme.spacing.sm }}>
                    {sessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        onPress={handleSessionPress}
                      />
                    ))}
                  </View>
                </CollapsibleSection>
              </View>
            </>
          )}

                    {showProgress && (
            <>
              <Divider variant="ornate" spacing="lg" />
              <View style={{ paddingHorizontal: theme.spacing.lg }}>
                <ReadingProgressCard
                  currentPage={userBook.current_page}
                  totalPages={book.page_count!}
                  onLogPress={handleOpenSessionModal}
                />
              </View>
            </>
          )}
        </Animated.ScrollView>

                <FloatingActionButton
          label={fabConfig.label}
          icon={fabConfig.icon}
          onPress={handleFabPress}
          visible={fabVisible}
        />
      </TextureBackground>

            {/* Lazy-loaded modals - only mount when visible for scroll performance */}
      {showDnfModal && (
        <DNFModal
          visible={showDnfModal}
          onClose={handleCloseDnfModal}
          onConfirm={handleDnf}
        />
      )}

      {showStatusPicker && (
        <BottomSheet
          visible={showStatusPicker}
          onClose={handleCloseStatusPicker}
        >
        <Text
          variant="label"
          style={{
            color: theme.colors.foregroundMuted,
            marginBottom: theme.spacing.md,
            textAlign: 'center',
          }}
        >
          Reading Status
        </Text>
        {statusOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            onPress={() => {
              handleStatusChange(option.key);
              setShowStatusPicker(false);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: theme.spacing.md,
              borderRadius: isScholar ? theme.radii.md : theme.radii.xl,
              backgroundColor:
                userBook.status === option.key
                  ? theme.colors.canvas
                  : 'transparent',
              marginBottom: theme.spacing.xs,
            }}
          >
            <Text
              variant="body"
              style={{
                color:
                  userBook.status === option.key
                    ? theme.colors.primary
                    : theme.colors.foreground,
              }}
            >
              {option.label}
            </Text>
            {userBook.status === option.key && (
              <Icon icon={Tick02Icon} size={20} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
        ))}
        </BottomSheet>
      )}

      {showQuoteModal && (
        <QuoteCaptureModal
          visible={showQuoteModal}
          onClose={handleCloseQuoteModal}
          onSave={handleSaveQuote}
          onDelete={handleCloseQuoteModal}
          editingQuote={editingQuote}
          totalPages={book.page_count ?? undefined}
        />
      )}

      {showSessionModal && (
        <ReadingSessionModal
          visible={showSessionModal}
          onClose={handleCloseSessionModal}
          onSave={handleLogSession}
          currentPage={userBook.current_page}
          totalPages={book.page_count ?? 100}
          bookTitle={book.title}
          bookCover={book.cover_url}
        />
      )}

      {showEditSessionModal && (
        <EditSessionModal
          visible={showEditSessionModal}
          onClose={handleCloseEditSessionModal}
          session={editingSession}
          onSave={handleUpdateSession}
          onDelete={handleDeleteSession}
        />
      )}

      {modal.visible && (
        <ConfirmModal
          visible={modal.visible}
          onClose={closeModal}
          title={modal.title}
          message={modal.message}
          status={modal.status}
          confirmLabel={modal.confirmLabel}
          cancelLabel={modal.cancelLabel}
          onConfirm={modal.onConfirm}
          confirmDestructive={modal.confirmDestructive}
        />
      )}

      {showMenu && (
        <BottomSheet visible={showMenu} onClose={handleCloseMenu}>
          <TouchableOpacity
            onPress={handleMenuRemove}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: theme.spacing.md,
              borderRadius: isScholar ? theme.radii.md : theme.radii.xl,
              backgroundColor: theme.colors.canvas,
            }}
          >
            <Icon icon={Delete02Icon} size={20} color={theme.colors.danger} />
            <Text
              variant="body"
              style={{
                marginLeft: theme.spacing.md,
                color: theme.colors.danger,
              }}
            >
              Remove from Library
            </Text>
          </TouchableOpacity>
        </BottomSheet>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  descriptionText: {
    lineHeight: 24,
  },
});
