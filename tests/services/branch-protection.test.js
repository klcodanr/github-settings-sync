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

import { updateBranchProtection } from '../../src/services/branch-protection';

describe('Branch Protection Service', () => {
  let mockOctokit;
  const org = 'test-org';
  const repo = 'test-repo';
  const branch = 'main';

  beforeEach(() => {
    // Reset mocks before each test
    mockOctokit = {
      repos: {
        updateBranchProtection: vi.fn(),
      },
    };
  });

  describe('updateBranchProtection', () => {
    it('should update branch protection settings in live mode', async () => {
      const settings = {
        enforce_admins: true,
        required_status_checks: {
          strict: true,
          contexts: ['ci/build'],
        },
        required_pull_request_reviews: {
          required_approving_review_count: 2,
          dismiss_stale_reviews: true,
          require_code_owner_reviews: true,
        },
        restrictions: {
          users: ['user1'],
          teams: ['team1'],
        },
        allow_force_pushes: false,
        allow_deletions: false,
      };

      const consoleSpy = vi.spyOn(console, 'log');
      const errorSpy = vi.spyOn(console, 'error');

      await updateBranchProtection(mockOctokit, org, repo, branch, settings);

      expect(mockOctokit.repos.updateBranchProtection).toHaveBeenCalledWith({
        owner: org,
        repo,
        branch,
        ...settings,
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        `✅ Successfully updated branch protection for ${branch} in ${repo}`
      );
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should log changes in dry run mode without making API calls', async () => {
      const settings = {
        enforce_admins: true,
        required_status_checks: {
          strict: true,
          contexts: ['ci/build'],
        },
      };

      const consoleSpy = vi.spyOn(console, 'log');
      const errorSpy = vi.spyOn(console, 'error');

      await updateBranchProtection(mockOctokit, org, repo, branch, settings, true);

      expect(mockOctokit.repos.updateBranchProtection).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        `🔍 Would update branch protection for ${branch} in ${repo}:`,
        settings
      );
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      const settings = {
        enforce_admins: true,
      };

      const error = new Error('API Error');
      mockOctokit.repos.updateBranchProtection.mockRejectedValueOnce(error);

      const consoleSpy = vi.spyOn(console, 'log');
      const errorSpy = vi.spyOn(console, 'error');

      await updateBranchProtection(mockOctokit, org, repo, branch, settings);

      expect(mockOctokit.repos.updateBranchProtection).toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        `❌ Failed to update branch protection for ${repo}:`,
        error
      );
    });

    it('should handle minimal settings', async () => {
      const settings = {
        enforce_admins: true,
      };

      const consoleSpy = vi.spyOn(console, 'log');
      const errorSpy = vi.spyOn(console, 'error');

      await updateBranchProtection(mockOctokit, org, repo, branch, settings);

      expect(mockOctokit.repos.updateBranchProtection).toHaveBeenCalledWith({
        owner: org,
        repo,
        branch,
        ...settings,
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        `✅ Successfully updated branch protection for ${branch} in ${repo}`
      );
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
