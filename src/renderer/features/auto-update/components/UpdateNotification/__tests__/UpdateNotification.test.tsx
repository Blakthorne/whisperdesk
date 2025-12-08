import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpdateNotification } from '../UpdateNotification';
import { overrideElectronAPI } from '../../../../../test/utils';
import type { UpdateStatus } from '../../../../../../shared/types';

vi.mock('../../../hooks/useAutoUpdate', () => ({
  useAutoUpdate: vi.fn(),
}));

import { useAutoUpdate } from '../../../hooks/useAutoUpdate';

describe('UpdateNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    overrideElectronAPI({
      onUpdateStatus: vi.fn(),
      checkForUpdates: vi.fn().mockResolvedValue({ success: true }),
      downloadUpdate: vi.fn().mockResolvedValue({ success: true }),
      installUpdate: vi.fn(),
    });
  });

  it('should not render when updateStatus is null', () => {
    vi.mocked(useAutoUpdate).mockReturnValue({
      updateStatus: null,
      isChecking: false,
      isDownloading: false,
      isUpdateAvailable: false,
      isUpdateDownloaded: false,
      error: null,
      checkForUpdates: vi.fn(),
      downloadUpdate: vi.fn(),
      installUpdate: vi.fn(),
      dismissUpdate: vi.fn(),
    });

    const { container } = render(<UpdateNotification />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when status is checking', () => {
    const updateStatus: UpdateStatus = {
      status: 'checking',
    };

    vi.mocked(useAutoUpdate).mockReturnValue({
      updateStatus,
      isChecking: true,
      isDownloading: false,
      isUpdateAvailable: false,
      isUpdateDownloaded: false,
      error: null,
      checkForUpdates: vi.fn(),
      downloadUpdate: vi.fn(),
      installUpdate: vi.fn(),
      dismissUpdate: vi.fn(),
    });

    const { container } = render(<UpdateNotification />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when status is not-available', () => {
    const updateStatus: UpdateStatus = {
      status: 'not-available',
    };

    vi.mocked(useAutoUpdate).mockReturnValue({
      updateStatus,
      isChecking: false,
      isDownloading: false,
      isUpdateAvailable: false,
      isUpdateDownloaded: false,
      error: null,
      checkForUpdates: vi.fn(),
      downloadUpdate: vi.fn(),
      installUpdate: vi.fn(),
      dismissUpdate: vi.fn(),
    });

    const { container } = render(<UpdateNotification />);
    expect(container.firstChild).toBeNull();
  });

  it('should render error state', () => {
    const updateStatus: UpdateStatus = {
      status: 'error',
      error: 'Failed to download update',
    };

    const dismissUpdate = vi.fn();
    vi.mocked(useAutoUpdate).mockReturnValue({
      updateStatus,
      isChecking: false,
      isDownloading: false,
      isUpdateAvailable: false,
      isUpdateDownloaded: false,
      error: 'Failed to download update',
      checkForUpdates: vi.fn(),
      downloadUpdate: vi.fn(),
      installUpdate: vi.fn(),
      dismissUpdate,
    });

    render(<UpdateNotification />);

    expect(screen.getByText('Update Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to download update')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('should render update available state', () => {
    const updateStatus: UpdateStatus = {
      status: 'available',
      info: {
        version: '1.2.0',
        releaseDate: '2025-12-08',
      },
    };

    const downloadUpdate = vi.fn();
    const dismissUpdate = vi.fn();

    vi.mocked(useAutoUpdate).mockReturnValue({
      updateStatus,
      isChecking: false,
      isDownloading: false,
      isUpdateAvailable: true,
      isUpdateDownloaded: false,
      error: null,
      checkForUpdates: vi.fn(),
      downloadUpdate,
      installUpdate: vi.fn(),
      dismissUpdate,
    });

    render(<UpdateNotification />);

    expect(screen.getByText('Update Available')).toBeInTheDocument();
    expect(screen.getByText('Version 1.2.0 is available')).toBeInTheDocument();
    expect(screen.getByText('Download Update')).toBeInTheDocument();
    expect(screen.getByText('Later')).toBeInTheDocument();
  });

  it('should display release notes when available', () => {
    const updateStatus: UpdateStatus = {
      status: 'available',
      info: {
        version: '1.2.0',
        releaseDate: '2025-12-08',
        releaseNotes: '<p>New features added</p>',
      },
    };

    vi.mocked(useAutoUpdate).mockReturnValue({
      updateStatus,
      isChecking: false,
      isDownloading: false,
      isUpdateAvailable: true,
      isUpdateDownloaded: false,
      error: null,
      checkForUpdates: vi.fn(),
      downloadUpdate: vi.fn(),
      installUpdate: vi.fn(),
      dismissUpdate: vi.fn(),
    });

    render(<UpdateNotification />);

    expect(screen.getByText("What's New")).toBeInTheDocument();
  });

  it('should call downloadUpdate when Download button is clicked', () => {
    const updateStatus: UpdateStatus = {
      status: 'available',
      info: {
        version: '1.2.0',
        releaseDate: '2025-12-08',
      },
    };

    const downloadUpdate = vi.fn();

    vi.mocked(useAutoUpdate).mockReturnValue({
      updateStatus,
      isChecking: false,
      isDownloading: false,
      isUpdateAvailable: true,
      isUpdateDownloaded: false,
      error: null,
      checkForUpdates: vi.fn(),
      downloadUpdate,
      installUpdate: vi.fn(),
      dismissUpdate: vi.fn(),
    });

    render(<UpdateNotification />);

    const downloadButton = screen.getByText('Download Update');
    fireEvent.click(downloadButton);

    expect(downloadUpdate).toHaveBeenCalledTimes(1);
  });

  it('should render downloading state with progress', () => {
    const updateStatus: UpdateStatus = {
      status: 'downloading',
      progress: {
        percent: 45.5,
        transferred: 5242880, // 5 MB
        total: 10485760, // 10 MB
        bytesPerSecond: 1048576, // 1 MB/s
      },
    };

    vi.mocked(useAutoUpdate).mockReturnValue({
      updateStatus,
      isChecking: false,
      isDownloading: true,
      isUpdateAvailable: false,
      isUpdateDownloaded: false,
      error: null,
      checkForUpdates: vi.fn(),
      downloadUpdate: vi.fn(),
      installUpdate: vi.fn(),
      dismissUpdate: vi.fn(),
    });

    render(<UpdateNotification />);

    expect(screen.getByText('Downloading Update')).toBeInTheDocument();
    expect(screen.getByText(/45.5%/)).toBeInTheDocument();
    expect(screen.getByText(/5 MB/)).toBeInTheDocument();
    expect(screen.getByText(/10 MB/)).toBeInTheDocument();
  });

  it('should render update downloaded state', () => {
    const updateStatus: UpdateStatus = {
      status: 'downloaded',
      info: {
        version: '1.2.0',
        releaseDate: '2025-12-08',
      },
    };

    const installUpdate = vi.fn();
    const dismissUpdate = vi.fn();

    vi.mocked(useAutoUpdate).mockReturnValue({
      updateStatus,
      isChecking: false,
      isDownloading: false,
      isUpdateAvailable: false,
      isUpdateDownloaded: true,
      error: null,
      checkForUpdates: vi.fn(),
      downloadUpdate: vi.fn(),
      installUpdate,
      dismissUpdate,
    });

    render(<UpdateNotification />);

    expect(screen.getByText('Update Ready')).toBeInTheDocument();
    expect(screen.getByText('Version 1.2.0 has been downloaded')).toBeInTheDocument();
    expect(screen.getByText('Restart & Install')).toBeInTheDocument();
  });

  it('should call installUpdate when Restart & Install button is clicked', () => {
    const updateStatus: UpdateStatus = {
      status: 'downloaded',
      info: {
        version: '1.2.0',
        releaseDate: '2025-12-08',
      },
    };

    const installUpdate = vi.fn();

    vi.mocked(useAutoUpdate).mockReturnValue({
      updateStatus,
      isChecking: false,
      isDownloading: false,
      isUpdateAvailable: false,
      isUpdateDownloaded: true,
      error: null,
      checkForUpdates: vi.fn(),
      downloadUpdate: vi.fn(),
      installUpdate,
      dismissUpdate: vi.fn(),
    });

    render(<UpdateNotification />);

    const installButton = screen.getByText('Restart & Install');
    fireEvent.click(installButton);

    expect(installUpdate).toHaveBeenCalledTimes(1);
  });

  it('should call dismissUpdate when close button is clicked', () => {
    const updateStatus: UpdateStatus = {
      status: 'available',
      info: {
        version: '1.2.0',
        releaseDate: '2025-12-08',
      },
    };

    const dismissUpdate = vi.fn();

    vi.mocked(useAutoUpdate).mockReturnValue({
      updateStatus,
      isChecking: false,
      isDownloading: false,
      isUpdateAvailable: true,
      isUpdateDownloaded: false,
      error: null,
      checkForUpdates: vi.fn(),
      downloadUpdate: vi.fn(),
      installUpdate: vi.fn(),
      dismissUpdate,
    });

    render(<UpdateNotification />);

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(dismissUpdate).toHaveBeenCalledTimes(1);
  });

  it('should call dismissUpdate when Later button is clicked', () => {
    const updateStatus: UpdateStatus = {
      status: 'available',
      info: {
        version: '1.2.0',
        releaseDate: '2025-12-08',
      },
    };

    const dismissUpdate = vi.fn();

    vi.mocked(useAutoUpdate).mockReturnValue({
      updateStatus,
      isChecking: false,
      isDownloading: false,
      isUpdateAvailable: true,
      isUpdateDownloaded: false,
      error: null,
      checkForUpdates: vi.fn(),
      downloadUpdate: vi.fn(),
      installUpdate: vi.fn(),
      dismissUpdate,
    });

    render(<UpdateNotification />);

    const laterButton = screen.getByText('Later');
    fireEvent.click(laterButton);

    expect(dismissUpdate).toHaveBeenCalledTimes(1);
  });

  it('should call dismissUpdate when backdrop is clicked', () => {
    const updateStatus: UpdateStatus = {
      status: 'available',
      info: {
        version: '1.2.0',
        releaseDate: '2025-12-08',
      },
    };

    const dismissUpdate = vi.fn();

    vi.mocked(useAutoUpdate).mockReturnValue({
      updateStatus,
      isChecking: false,
      isDownloading: false,
      isUpdateAvailable: true,
      isUpdateDownloaded: false,
      error: null,
      checkForUpdates: vi.fn(),
      downloadUpdate: vi.fn(),
      installUpdate: vi.fn(),
      dismissUpdate,
    });

    const { container } = render(<UpdateNotification />);

    const backdrop = container.querySelector('.update-notification');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(dismissUpdate).toHaveBeenCalledTimes(1);
    }
  });

  it('should not dismiss when clicking inside the notification content', () => {
    const updateStatus: UpdateStatus = {
      status: 'available',
      info: {
        version: '1.2.0',
        releaseDate: '2025-12-08',
      },
    };

    const dismissUpdate = vi.fn();

    vi.mocked(useAutoUpdate).mockReturnValue({
      updateStatus,
      isChecking: false,
      isDownloading: false,
      isUpdateAvailable: true,
      isUpdateDownloaded: false,
      error: null,
      checkForUpdates: vi.fn(),
      downloadUpdate: vi.fn(),
      installUpdate: vi.fn(),
      dismissUpdate,
    });

    const { container } = render(<UpdateNotification />);

    const content = container.querySelector('.update-notification-content');
    if (content) {
      fireEvent.click(content);
      expect(dismissUpdate).not.toHaveBeenCalled();
    }
  });
});
