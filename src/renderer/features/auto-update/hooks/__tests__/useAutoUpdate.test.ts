import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoUpdate } from '../useAutoUpdate';
import { overrideElectronAPI } from '../../../../test/utils';
import type { UpdateStatus } from '../../../../../shared/types';

describe('useAutoUpdate', () => {
  let unsubscribeFn: (() => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    unsubscribeFn = undefined;
  });

  afterEach(() => {
    if (unsubscribeFn) {
      unsubscribeFn();
    }
  });

  it('should initialize with null state', () => {
    overrideElectronAPI({
      onUpdateStatus: vi.fn(() => () => {}),
      checkForUpdates: vi.fn().mockResolvedValue({ success: true }),
      downloadUpdate: vi.fn().mockResolvedValue({ success: true }),
      installUpdate: vi.fn(),
    });

    const { result } = renderHook(() => useAutoUpdate());

    expect(result.current.updateStatus).toBeNull();
    expect(result.current.isChecking).toBe(false);
    expect(result.current.isDownloading).toBe(false);
    expect(result.current.isUpdateAvailable).toBe(false);
    expect(result.current.isUpdateDownloaded).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should subscribe to update status on mount', () => {
    const mockOnUpdateStatus = vi.fn(() => () => {});
    overrideElectronAPI({
      onUpdateStatus: mockOnUpdateStatus,
      checkForUpdates: vi.fn().mockResolvedValue({ success: true }),
      downloadUpdate: vi.fn().mockResolvedValue({ success: true }),
      installUpdate: vi.fn(),
    });

    renderHook(() => useAutoUpdate());

    expect(mockOnUpdateStatus).toHaveBeenCalledTimes(1);
    expect(mockOnUpdateStatus).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should update state when receiving update status', () => {
    let statusCallback: ((status: UpdateStatus) => void) | undefined;
    const mockOnUpdateStatus = vi.fn((callback) => {
      statusCallback = callback;
      return () => {};
    });

    overrideElectronAPI({
      onUpdateStatus: mockOnUpdateStatus,
      checkForUpdates: vi.fn().mockResolvedValue({ success: true }),
      downloadUpdate: vi.fn().mockResolvedValue({ success: true }),
      installUpdate: vi.fn(),
    });

    const { result } = renderHook(() => useAutoUpdate());

    const updateStatus: UpdateStatus = {
      status: 'available',
      info: {
        version: '1.2.0',
        releaseDate: '2025-12-08',
      },
    };

    act(() => {
      statusCallback?.(updateStatus);
    });

    expect(result.current.updateStatus).toEqual(updateStatus);
    expect(result.current.isUpdateAvailable).toBe(true);
  });

  it('should set error state when status is error', () => {
    let statusCallback: ((status: UpdateStatus) => void) | undefined;
    const mockOnUpdateStatus = vi.fn((callback) => {
      statusCallback = callback;
      return () => {};
    });

    overrideElectronAPI({
      onUpdateStatus: mockOnUpdateStatus,
      checkForUpdates: vi.fn().mockResolvedValue({ success: true }),
      downloadUpdate: vi.fn().mockResolvedValue({ success: true }),
      installUpdate: vi.fn(),
    });

    const { result } = renderHook(() => useAutoUpdate());

    const errorStatus: UpdateStatus = {
      status: 'error',
      error: 'Download failed',
    };

    act(() => {
      statusCallback?.(errorStatus);
    });

    expect(result.current.error).toBe('Download failed');
    expect(result.current.updateStatus).toEqual(errorStatus);
  });

  it('should clear error when status is not error', () => {
    let statusCallback: ((status: UpdateStatus) => void) | undefined;
    const mockOnUpdateStatus = vi.fn((callback) => {
      statusCallback = callback;
      return () => {};
    });

    overrideElectronAPI({
      onUpdateStatus: mockOnUpdateStatus,
      checkForUpdates: vi.fn().mockResolvedValue({ success: true }),
      downloadUpdate: vi.fn().mockResolvedValue({ success: true }),
      installUpdate: vi.fn(),
    });

    const { result } = renderHook(() => useAutoUpdate());

    act(() => {
      statusCallback?.({ status: 'error', error: 'Download failed' });
    });

    expect(result.current.error).toBe('Download failed');

    act(() => {
      statusCallback?.({
        status: 'available',
        info: { version: '1.2.0', releaseDate: '2025-12-08' },
      });
    });

    expect(result.current.error).toBeNull();
  });

  it('should call checkForUpdates and handle success', async () => {
    const mockCheckForUpdates = vi.fn().mockResolvedValue({ success: true });
    overrideElectronAPI({
      onUpdateStatus: vi.fn(() => () => {}),
      checkForUpdates: mockCheckForUpdates,
      downloadUpdate: vi.fn().mockResolvedValue({ success: true }),
      installUpdate: vi.fn(),
    });

    const { result } = renderHook(() => useAutoUpdate());

    await act(async () => {
      await result.current.checkForUpdates();
    });

    expect(mockCheckForUpdates).toHaveBeenCalledTimes(1);
  });

  it('should set isChecking to true while checking for updates', async () => {
    const mockCheckForUpdates = vi
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

    overrideElectronAPI({
      onUpdateStatus: vi.fn(() => () => {}),
      checkForUpdates: mockCheckForUpdates,
      downloadUpdate: vi.fn().mockResolvedValue({ success: true }),
      installUpdate: vi.fn(),
    });

    const { result } = renderHook(() => useAutoUpdate());

    let checkPromise: Promise<void>;
    act(() => {
      checkPromise = result.current.checkForUpdates();
    });

    expect(result.current.isChecking).toBe(true);

    await act(async () => {
      await checkPromise;
    });
  });

  it('should handle checkForUpdates error', async () => {
    const mockCheckForUpdates = vi
      .fn()
      .mockResolvedValue({ success: false, error: 'Network error' });

    overrideElectronAPI({
      onUpdateStatus: vi.fn(() => () => {}),
      checkForUpdates: mockCheckForUpdates,
      downloadUpdate: vi.fn().mockResolvedValue({ success: true }),
      installUpdate: vi.fn(),
    });

    const { result } = renderHook(() => useAutoUpdate());

    await act(async () => {
      await result.current.checkForUpdates();
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.isChecking).toBe(false);
  });

  it('should call downloadUpdate and handle success', async () => {
    const mockDownloadUpdate = vi.fn().mockResolvedValue({ success: true });
    overrideElectronAPI({
      onUpdateStatus: vi.fn(() => () => {}),
      checkForUpdates: vi.fn().mockResolvedValue({ success: true }),
      downloadUpdate: mockDownloadUpdate,
      installUpdate: vi.fn(),
    });

    const { result } = renderHook(() => useAutoUpdate());

    await act(async () => {
      await result.current.downloadUpdate();
    });

    expect(mockDownloadUpdate).toHaveBeenCalledTimes(1);
  });

  it('should handle downloadUpdate error', async () => {
    const mockDownloadUpdate = vi
      .fn()
      .mockResolvedValue({ success: false, error: 'Download failed' });

    overrideElectronAPI({
      onUpdateStatus: vi.fn(() => () => {}),
      checkForUpdates: vi.fn().mockResolvedValue({ success: true }),
      downloadUpdate: mockDownloadUpdate,
      installUpdate: vi.fn(),
    });

    const { result } = renderHook(() => useAutoUpdate());

    await act(async () => {
      await result.current.downloadUpdate();
    });

    expect(result.current.error).toBe('Download failed');
  });

  it('should call installUpdate', () => {
    const mockInstallUpdate = vi.fn();
    overrideElectronAPI({
      onUpdateStatus: vi.fn(() => () => {}),
      checkForUpdates: vi.fn().mockResolvedValue({ success: true }),
      downloadUpdate: vi.fn().mockResolvedValue({ success: true }),
      installUpdate: mockInstallUpdate,
    });

    const { result } = renderHook(() => useAutoUpdate());

    act(() => {
      result.current.installUpdate();
    });

    expect(mockInstallUpdate).toHaveBeenCalledTimes(1);
  });

  it('should dismiss update and clear state', () => {
    let statusCallback: ((status: UpdateStatus) => void) | undefined;
    const mockOnUpdateStatus = vi.fn((callback) => {
      statusCallback = callback;
      return () => {};
    });

    overrideElectronAPI({
      onUpdateStatus: mockOnUpdateStatus,
      checkForUpdates: vi.fn().mockResolvedValue({ success: true }),
      downloadUpdate: vi.fn().mockResolvedValue({ success: true }),
      installUpdate: vi.fn(),
    });

    const { result } = renderHook(() => useAutoUpdate());

    act(() => {
      statusCallback?.({
        status: 'available',
        info: { version: '1.2.0', releaseDate: '2025-12-08' },
      });
    });

    expect(result.current.updateStatus).not.toBeNull();

    act(() => {
      result.current.dismissUpdate();
    });

    expect(result.current.updateStatus).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should compute isDownloading correctly', () => {
    let statusCallback: ((status: UpdateStatus) => void) | undefined;
    const mockOnUpdateStatus = vi.fn((callback) => {
      statusCallback = callback;
      return () => {};
    });

    overrideElectronAPI({
      onUpdateStatus: mockOnUpdateStatus,
      checkForUpdates: vi.fn().mockResolvedValue({ success: true }),
      downloadUpdate: vi.fn().mockResolvedValue({ success: true }),
      installUpdate: vi.fn(),
    });

    const { result } = renderHook(() => useAutoUpdate());

    act(() => {
      statusCallback?.({
        status: 'downloading',
        progress: { percent: 50, transferred: 5000, total: 10000, bytesPerSecond: 1000 },
      });
    });

    expect(result.current.isDownloading).toBe(true);
  });

  it('should compute isUpdateDownloaded correctly', () => {
    let statusCallback: ((status: UpdateStatus) => void) | undefined;
    const mockOnUpdateStatus = vi.fn((callback) => {
      statusCallback = callback;
      return () => {};
    });

    overrideElectronAPI({
      onUpdateStatus: mockOnUpdateStatus,
      checkForUpdates: vi.fn().mockResolvedValue({ success: true }),
      downloadUpdate: vi.fn().mockResolvedValue({ success: true }),
      installUpdate: vi.fn(),
    });

    const { result } = renderHook(() => useAutoUpdate());

    act(() => {
      statusCallback?.({
        status: 'downloaded',
        info: { version: '1.2.0', releaseDate: '2025-12-08' },
      });
    });

    expect(result.current.isUpdateDownloaded).toBe(true);
  });

  it('should unsubscribe on unmount', () => {
    const mockUnsubscribe = vi.fn();
    const mockOnUpdateStatus = vi.fn(() => mockUnsubscribe);

    overrideElectronAPI({
      onUpdateStatus: mockOnUpdateStatus,
      checkForUpdates: vi.fn().mockResolvedValue({ success: true }),
      downloadUpdate: vi.fn().mockResolvedValue({ success: true }),
      installUpdate: vi.fn(),
    });

    const { unmount } = renderHook(() => useAutoUpdate());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
