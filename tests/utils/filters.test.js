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

import { getRepositoryLabels, shouldProcessRepository } from '../../src/utils/filters';

describe('Filters Utility', () => {
  let mockOctokit;
  const org = 'test-org';
  const repo = {
    name: 'test-repo',
    language: 'JavaScript',
    owner: {
      login: org,
    },
  };

  beforeEach(() => {
    mockOctokit = {
      issues: {
        listLabelsForRepo: vi.fn(),
      },
    };
    vi.clearAllMocks();
  });

  describe('getRepositoryLabels', () => {
    it('should fetch all labels for a repository', async () => {
      const mockLabels = [{ name: 'bug' }, { name: 'enhancement' }];

      mockOctokit.issues.listLabelsForRepo.mockResolvedValueOnce({ data: mockLabels });

      const labels = await getRepositoryLabels(mockOctokit, org, repo.name);

      expect(labels).toEqual(['bug', 'enhancement']);
      expect(mockOctokit.issues.listLabelsForRepo).toHaveBeenCalledWith({
        owner: org,
        repo: repo.name,
      });
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockOctokit.issues.listLabelsForRepo.mockRejectedValueOnce(error);

      const consoleSpy = vi.spyOn(console, 'warn');
      const labels = await getRepositoryLabels(mockOctokit, org, repo.name);

      expect(labels).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        `⚠️ Could not fetch labels for ${repo.name}: ${error.message}`
      );
    });
  });

  describe('shouldProcessRepository', () => {
    it('should process repository when no filters are provided', async () => {
      const result = await shouldProcessRepository(mockOctokit, repo, {});

      expect(result).toBe(true);
      expect(mockOctokit.issues.listLabelsForRepo).not.toHaveBeenCalled();
    });

    it('should filter by name pattern', async () => {
      const filters = {
        namePattern: 'test-*',
      };

      const result = await shouldProcessRepository(mockOctokit, repo, filters);

      expect(result).toBe(true);
      expect(mockOctokit.issues.listLabelsForRepo).not.toHaveBeenCalled();
    });

    it('should filter out repository when name does not match pattern', async () => {
      const filters = {
        namePattern: 'prod-*',
      };

      const consoleSpy = vi.spyOn(console, 'log');
      const result = await shouldProcessRepository(mockOctokit, repo, filters);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        `⏭️ Skipping ${repo.name} - does not match name pattern ${filters.namePattern}`
      );
    });

    it('should filter by language', async () => {
      const filters = {
        language: 'JavaScript',
      };

      const result = await shouldProcessRepository(mockOctokit, repo, filters);

      expect(result).toBe(true);
      expect(mockOctokit.issues.listLabelsForRepo).not.toHaveBeenCalled();
    });

    it('should filter out repository when language does not match', async () => {
      const filters = {
        language: 'Python',
      };

      const consoleSpy = vi.spyOn(console, 'log');
      const result = await shouldProcessRepository(mockOctokit, repo, filters);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        `⏭️ Skipping ${repo.name} - does not match language ${filters.language}`
      );
    });

    it('should filter by label', async () => {
      const filters = {
        label: 'active',
      };

      const mockLabels = [{ name: 'active' }, { name: 'bug' }];

      mockOctokit.issues.listLabelsForRepo.mockResolvedValueOnce({ data: mockLabels });

      const result = await shouldProcessRepository(mockOctokit, repo, filters);

      expect(result).toBe(true);
      expect(mockOctokit.issues.listLabelsForRepo).toHaveBeenCalledWith({
        owner: org,
        repo: repo.name,
      });
    });

    it('should filter out repository when label does not match', async () => {
      const filters = {
        label: 'active',
      };

      const mockLabels = [{ name: 'bug' }, { name: 'enhancement' }];

      mockOctokit.issues.listLabelsForRepo.mockResolvedValueOnce({ data: mockLabels });

      const consoleSpy = vi.spyOn(console, 'log');
      const result = await shouldProcessRepository(mockOctokit, repo, filters);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        `⏭️ Skipping ${repo.name} - does not have label ${filters.label}`
      );
    });

    it('should handle label fetch errors gracefully', async () => {
      const filters = {
        label: 'active',
      };

      const error = new Error('API Error');
      mockOctokit.issues.listLabelsForRepo.mockRejectedValueOnce(error);

      const consoleSpy = vi.spyOn(console, 'warn');
      const result = await shouldProcessRepository(mockOctokit, repo, filters);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        `⚠️ Could not fetch labels for ${repo.name}: ${error.message}`
      );
    });

    it('should apply multiple filters', async () => {
      const filters = {
        namePattern: 'test-*',
        language: 'JavaScript',
        label: 'active',
      };

      const mockLabels = [{ name: 'active' }, { name: 'bug' }];

      mockOctokit.issues.listLabelsForRepo.mockResolvedValueOnce({ data: mockLabels });

      const result = await shouldProcessRepository(mockOctokit, repo, filters);

      expect(result).toBe(true);
      expect(mockOctokit.issues.listLabelsForRepo).toHaveBeenCalledWith({
        owner: org,
        repo: repo.name,
      });
    });
  });
});
