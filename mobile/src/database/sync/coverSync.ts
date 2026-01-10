import * as FileSystem from 'expo-file-system/legacy';
import { Paths, Directory, File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/database/index';
import { getToken } from '@/api/client';
import type { UserBook } from '@/database/models/UserBook';
import type { Book } from '@/database/models/Book';

const COVERS_DIR = Paths.document.uri + 'covers/';
const API_URL = __DEV__
  ? 'http://192.168.1.102:8000/api'
  : 'https://api.athenaeum.app/api';

export async function ensureCoverDirectory(): Promise<void> {
  const info = await FileSystem.getInfoAsync(COVERS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(COVERS_DIR, { intermediates: true });
  }
}

export async function pickAndSaveCover(
  userBookId: string
): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [2, 3],
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  await ensureCoverDirectory();

  const fileName = `${userBookId}_${Date.now()}.jpg`;
  const localPath = COVERS_DIR + fileName;

  await FileSystem.copyAsync({
    from: result.assets[0].uri,
    to: localPath,
  });

  // Update Book with local cover path and mark UserBook for upload
  await database.write(async () => {
    const userBook = await database.get<UserBook>('user_books').find(userBookId);
    const book = await database.get<Book>('books').find(userBook.bookId);

    await book.update((record) => {
      record.localCoverPath = localPath;
    });

    await userBook.update((record) => {
      record.pendingCoverUpload = true;
      record.isPendingSync = true;
    });
  });

  return localPath;
}

export async function uploadPendingCovers(): Promise<void> {
  const userBooks = await database
    .get<UserBook>('user_books')
    .query(Q.where('pending_cover_upload', true))
    .fetch();

  for (const userBook of userBooks) {
    // Skip if no server ID (book not synced yet)
    if (!userBook.serverId) {
      continue;
    }

    const book = await database.get<Book>('books').find(userBook.bookId);
    if (!book.localCoverPath) {
      continue;
    }

    // Verify file exists
    const fileInfo = await FileSystem.getInfoAsync(book.localCoverPath);
    if (!fileInfo.exists) {
      // Clear pending flag if file doesn't exist
      await database.write(async () => {
        await userBook.update((record) => {
          record.pendingCoverUpload = false;
        });
      });
      continue;
    }

    try {
      const token = await getToken();
      if (!token) {
        console.warn('[CoverSync] No auth token, skipping upload');
        continue;
      }

      const uploadResult = await FileSystem.uploadAsync(
        `${API_URL}/sync/upload-cover`,
        book.localCoverPath,
        {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'cover',
          parameters: {
            user_book_id: String(userBook.serverId),
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (uploadResult.status !== 200) {
        console.error('[CoverSync] Upload failed:', uploadResult.body);
        continue;
      }

      const response = JSON.parse(uploadResult.body);

      await database.write(async () => {
        // Update book with CDN URL
        await book.update((record) => {
          record.coverUrl = response.cover_url;
        });

        // Update userBook with custom cover URL and clear pending flag
        await userBook.update((record) => {
          record.customCoverUrl = response.cover_url;
          record.pendingCoverUpload = false;
        });
      });

      // Optionally delete local file after successful upload
      // await FileSystem.deleteAsync(book.localCoverPath, { idempotent: true });
    } catch (error) {
      console.error('[CoverSync] Upload error:', error);
    }
  }
}

export async function deleteCover(userBookId: string): Promise<void> {
  await database.write(async () => {
    const userBook = await database.get<UserBook>('user_books').find(userBookId);
    const book = await database.get<Book>('books').find(userBook.bookId);

    // Delete local file if exists
    if (book.localCoverPath) {
      await FileSystem.deleteAsync(book.localCoverPath, { idempotent: true });
    }

    await book.update((record) => {
      record.localCoverPath = null;
    });

    await userBook.update((record) => {
      record.customCoverUrl = null;
      record.pendingCoverUpload = false;
      record.isPendingSync = true;
    });
  });
}
