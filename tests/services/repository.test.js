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

import { getRepositories, updateRepositorySettings } from '../../src/services/repository';

describe('Repository Service', () => {
  let mockOctokit;
  const org = 'test-org';

  beforeEach(() => {
    mockOctokit = {
      repos: {
        listForOrg: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
      },
    };
    vi.clearAllMocks();
  });

  describe('getRepositories', () => {
    it('should fetch all repositories with pagination', async () => {
      const mockRepos = [
        { name: 'repo1', full_name: 'test-org/repo1' },
        { name: 'repo2', full_name: 'test-org/repo2' },
      ];

      mockOctokit.repos.listForOrg
        .mockResolvedValueOnce({ data: mockRepos.slice(0, 1) })
        .mockResolvedValueOnce({ data: mockRepos.slice(1) })
        .mockResolvedValueOnce({ data: [] });

      const repos = await getRepositories(mockOctokit, org);

      expect(repos).toHaveLength(2);
      expect(mockOctokit.repos.listForOrg).toHaveBeenCalledTimes(3);
      expect(mockOctokit.repos.listForOrg).toHaveBeenCalledWith({
        org,
        per_page: 100,
        page: 1,
      });
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockOctokit.repos.listForOrg.mockRejectedValueOnce(error);

      await expect(getRepositories(mockOctokit, org)).rejects.toThrow('API Error');
    });
  });

  describe('updateRepositorySettings', () => {
    const repo = 'test-repo';
    const settings = {
      repository: {
        has_issues: true,
        has_wiki: false,
        has_projects: true,
        allow_merge_commit: true,
        allow_squash_merge: false,
        allow_rebase_merge: false,
        delete_branch_on_merge: true,
      },
    };

    it('should update repository settings in live mode', async () => {
      const currentSettings = {
        has_issues: false,
        has_wiki: true,
        has_projects: false,
        allow_merge_commit: false,
        allow_squash_merge: true,
        allow_rebase_merge: true,
        delete_branch_on_merge: false,
      };

      mockOctokit.repos.get.mockResolvedValueOnce({ data: currentSettings });
      mockOctokit.repos.update.mockResolvedValueOnce({ data: {} });

      const consoleSpy = vi.spyOn(console, 'log');
      const errorSpy = vi.spyOn(console, 'error');

      await updateRepositorySettings(mockOctokit, org, repo, settings);

      expect(mockOctokit.repos.get).toHaveBeenCalledWith({
        owner: org,
        repo,
      });
      expect(mockOctokit.repos.update).toHaveBeenCalledWith({
        owner: org,
        repo,
        ...settings.repository,
      });
      expect(consoleSpy).toHaveBeenCalledWith(`✅ Successfully updated settings for ${repo}`);
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should log changes in dry run mode without making API calls', async () => {
      const currentSettings = {
        has_issues: false,
        has_wiki: true,
        has_projects: false,
        allow_merge_commit: false,
        allow_squash_merge: true,
        allow_rebase_merge: true,
        delete_branch_on_merge: false,
      };

      mockOctokit.repos.get.mockResolvedValueOnce({ data: currentSettings });

      const consoleSpy = vi.spyOn(console, 'log');
      const errorSpy = vi.spyOn(console, 'error');

      await updateRepositorySettings(mockOctokit, org, repo, settings, true);

      expect(mockOctokit.repos.get).toHaveBeenCalledWith({
        owner: org,
        repo,
      });
      expect(mockOctokit.repos.update).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        `🔍 Would update repository settings for ${repo}:`,
        settings.repository
      );
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockOctokit.repos.get.mockRejectedValueOnce(error);

      const consoleSpy = vi.spyOn(console, 'log');
      const errorSpy = vi.spyOn(console, 'error');

      await updateRepositorySettings(mockOctokit, org, repo, settings);

      expect(mockOctokit.repos.get).toHaveBeenCalledWith({
        owner: org,
        repo,
      });
      expect(mockOctokit.repos.update).not.toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(`❌ Failed to fetch settings for ${repo}:`, error);
    });

    it('should skip update if no repository settings provided', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const errorSpy = vi.spyOn(console, 'error');

      await updateRepositorySettings(mockOctokit, org, repo, {});

      expect(mockOctokit.repos.get).not.toHaveBeenCalled();
      expect(mockOctokit.repos.update).not.toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should skip update if settings match', async () => {
      mockOctokit.repos.get.mockResolvedValueOnce({ data: settings.repository });

      const consoleSpy = vi.spyOn(console, 'log');
      const errorSpy = vi.spyOn(console, 'error');

      await updateRepositorySettings(mockOctokit, org, repo, settings);

      expect(mockOctokit.repos.get).toHaveBeenCalledWith({
        owner: org,
        repo,
      });
      expect(mockOctokit.repos.update).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(`⏭️ Skipping ${repo} - settings match`);
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
