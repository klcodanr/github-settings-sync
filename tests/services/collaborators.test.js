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

import {
  getRepositoryCollaborators,
  updateRepositoryCollaborators,
} from '../../src/services/collaborators';

describe('Collaborators Service', () => {
  let mockOctokit;
  const org = 'test-org';
  const repo = 'test-repo';

  beforeEach(() => {
    mockOctokit = {
      repos: {
        listCollaborators: vi.fn(),
        addCollaborator: vi.fn(),
      },
    };
    vi.clearAllMocks();
  });

  describe('getRepositoryCollaborators', () => {
    it('should fetch all collaborators for a repository', async () => {
      const mockCollaborators = [
        { login: 'user1', role_name: 'admin' },
        { login: 'user2', role_name: 'write' },
      ];

      mockOctokit.repos.listCollaborators.mockResolvedValueOnce({ data: mockCollaborators });

      const collaborators = await getRepositoryCollaborators(mockOctokit, org, repo);

      expect(collaborators).toEqual([
        { username: 'user1', role: 'admin' },
        { username: 'user2', role: 'write' },
      ]);
      expect(mockOctokit.repos.listCollaborators).toHaveBeenCalledWith({
        owner: org,
        repo,
      });
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockOctokit.repos.listCollaborators.mockRejectedValueOnce(error);

      const consoleSpy = vi.spyOn(console, 'warn');
      const collaborators = await getRepositoryCollaborators(mockOctokit, org, repo);

      expect(collaborators).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        `⚠️ Could not fetch collaborators for ${repo}: ${error.message}`
      );
    });
  });

  describe('updateRepositoryCollaborators', () => {
    const desiredCollaborators = [
      { username: 'user1', role: 'admin' },
      { username: 'user2', role: 'write' },
      { username: 'user3', role: 'read' },
    ];

    it('should add new collaborators and update existing ones', async () => {
      const currentCollaborators = [
        { login: 'user1', role_name: 'write' },
        { login: 'user2', role_name: 'write' },
      ];

      mockOctokit.repos.listCollaborators.mockResolvedValueOnce({ data: currentCollaborators });
      mockOctokit.repos.addCollaborator.mockResolvedValue({ data: {} });

      const consoleSpy = vi.spyOn(console, 'log');
      const errorSpy = vi.spyOn(console, 'error');

      await updateRepositoryCollaborators(mockOctokit, org, repo, desiredCollaborators);

      expect(mockOctokit.repos.addCollaborator).toHaveBeenCalledTimes(2);
      expect(mockOctokit.repos.addCollaborator).toHaveBeenCalledWith({
        owner: org,
        repo,
        username: 'user1',
        permission: 'admin',
      });
      expect(mockOctokit.repos.addCollaborator).toHaveBeenCalledWith({
        owner: org,
        repo,
        username: 'user3',
        permission: 'read',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        `✅ Added collaborator user3 with role read to ${repo}`
      );
      expect(consoleSpy).toHaveBeenCalledWith(`✅ Updated role for user1 to admin in ${repo}`);
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should log changes in dry run mode without making API calls', async () => {
      const currentCollaborators = [
        { login: 'user1', role_name: 'write' },
        { login: 'user2', role_name: 'write' },
      ];

      mockOctokit.repos.listCollaborators.mockResolvedValueOnce({ data: currentCollaborators });

      const consoleSpy = vi.spyOn(console, 'log');
      const errorSpy = vi.spyOn(console, 'error');

      await updateRepositoryCollaborators(mockOctokit, org, repo, desiredCollaborators, true);

      expect(mockOctokit.repos.addCollaborator).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        `🔍 Would add collaborator user3 with role read to ${repo}`
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        `🔍 Would update role for user1 from write to admin in ${repo}`
      );
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should handle empty collaborator list', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const errorSpy = vi.spyOn(console, 'error');

      await updateRepositoryCollaborators(mockOctokit, org, repo, []);

      expect(mockOctokit.repos.listCollaborators).toHaveBeenCalled();
      expect(mockOctokit.repos.addCollaborator).not.toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
