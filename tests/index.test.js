/**
 * MIT License
 *
 * Copyright (c) 2024 Dan Klco
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { syncSettings } from '../src/index.js';

// Mock all the imported services
vi.mock('../src/services/branch-protection.js', () => ({
  updateBranchProtection: vi.fn(),
}));

vi.mock('../src/services/collaborators.js', () => ({
  updateRepositoryCollaborators: vi.fn(),
}));

vi.mock('../src/services/file-sync.js', () => ({
  syncFileContent: vi.fn(),
}));

vi.mock('../src/services/repository.js', () => ({
  getRepositories: vi.fn(),
  updateRepositorySettings: vi.fn(),
}));

vi.mock('../src/utils/filters.js', () => ({
  shouldProcessRepository: vi.fn(),
}));

describe('syncSettings', () => {
  const mockOctokit = {};
  const mockOrg = 'test-org';
  const mockSettings = {
    collaborators: {
      user1: 'admin',
      user2: 'write',
    },
    branch_protection: {
      main: {
        required_status_checks: { strict: true },
        enforce_admins: true,
      },
    },
    files: [
      {
        path: '.github/workflows/ci.yml',
        content: 'test content',
      },
    ],
  };
  const mockFilters = {
    namePattern: 'test-.*',
    label: 'test-label',
    language: 'JavaScript',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods to prevent test output pollution
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should process repositories that match filters', async () => {
    // Mock repository data
    const mockRepos = [{ name: 'test-repo-1' }, { name: 'test-repo-2' }];

    // Setup mocks
    const { getRepositories } = await import('../src/services/repository.js');
    const { shouldProcessRepository } = await import('../src/utils/filters.js');
    const { updateRepositorySettings } = await import('../src/services/repository.js');
    const { updateRepositoryCollaborators } = await import('../src/services/collaborators.js');
    const { updateBranchProtection } = await import('../src/services/branch-protection.js');
    const { syncFileContent } = await import('../src/services/file-sync.js');

    getRepositories.mockResolvedValue(mockRepos);
    shouldProcessRepository.mockResolvedValue(true);
    updateRepositorySettings.mockResolvedValue();
    updateRepositoryCollaborators.mockResolvedValue();
    updateBranchProtection.mockResolvedValue();
    syncFileContent.mockResolvedValue();

    await syncSettings(mockOctokit, mockOrg, mockSettings, mockFilters);

    // Verify all service functions were called correctly
    expect(getRepositories).toHaveBeenCalledWith(mockOctokit, mockOrg);
    expect(shouldProcessRepository).toHaveBeenCalledTimes(2);
    expect(updateRepositorySettings).toHaveBeenCalledTimes(2);
    expect(updateRepositoryCollaborators).toHaveBeenCalledTimes(2);
    expect(updateBranchProtection).toHaveBeenCalledTimes(2);
    expect(syncFileContent).toHaveBeenCalledTimes(2);
  });

  it('should skip repositories that do not match filters', async () => {
    const mockRepos = [{ name: 'test-repo-1' }, { name: 'test-repo-2' }];

    const { getRepositories } = await import('../src/services/repository.js');
    const { shouldProcessRepository } = await import('../src/utils/filters.js');
    const { updateRepositorySettings } = await import('../src/services/repository.js');

    getRepositories.mockResolvedValue(mockRepos);
    shouldProcessRepository.mockResolvedValue(false);
    updateRepositorySettings.mockResolvedValue();

    await syncSettings(mockOctokit, mockOrg, mockSettings, mockFilters);

    expect(getRepositories).toHaveBeenCalledWith(mockOctokit, mockOrg);
    expect(shouldProcessRepository).toHaveBeenCalledTimes(2);
    expect(updateRepositorySettings).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const mockError = new Error('Test error');

    const { getRepositories } = await import('../src/services/repository.js');
    getRepositories.mockRejectedValue(mockError);

    const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});

    await syncSettings(mockOctokit, mockOrg, mockSettings, mockFilters);

    expect(console.error).toHaveBeenCalledWith('❌ Error during sync:', mockError);
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('should run in dry-run mode without making changes', async () => {
    const mockRepos = [{ name: 'test-repo-1' }];

    const { getRepositories } = await import('../src/services/repository.js');
    const { shouldProcessRepository } = await import('../src/utils/filters.js');
    const { updateRepositorySettings } = await import('../src/services/repository.js');
    const { updateRepositoryCollaborators } = await import('../src/services/collaborators.js');
    const { updateBranchProtection } = await import('../src/services/branch-protection.js');
    const { syncFileContent } = await import('../src/services/file-sync.js');

    getRepositories.mockResolvedValue(mockRepos);
    shouldProcessRepository.mockResolvedValue(true);
    updateRepositorySettings.mockResolvedValue();
    updateRepositoryCollaborators.mockResolvedValue();
    updateBranchProtection.mockResolvedValue();
    syncFileContent.mockResolvedValue();

    await syncSettings(mockOctokit, mockOrg, mockSettings, mockFilters, true);

    expect(console.log).toHaveBeenCalledWith(
      '🔍 Running in dry-run mode - no changes will be made'
    );
    expect(updateRepositorySettings).toHaveBeenCalledWith(
      mockOctokit,
      mockOrg,
      'test-repo-1',
      mockSettings,
      true
    );
  });
});
