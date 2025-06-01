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

import { readFile } from 'fs/promises';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getFileContent, updateFileContent, syncFileContent } from '../../src/services/file-sync';

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readFile: vi.fn(),
  };
});

describe('File Sync Service', () => {
  let mockOctokit;
  const org = 'test-org';
  const repo = 'test-repo';
  const filePath = 'path/to/file.txt';

  beforeEach(() => {
    mockOctokit = {
      repos: {
        getContent: vi.fn(),
        createOrUpdateFileContents: vi.fn(),
      },
    };
    vi.clearAllMocks();
  });

  describe('getFileContent', () => {
    it('should fetch file content from repository', async () => {
      const mockContent = {
        content: Buffer.from('test content').toString('base64'),
        sha: 'abc123',
        type: 'file',
      };

      mockOctokit.repos.getContent.mockResolvedValueOnce({ data: mockContent });

      const result = await getFileContent(mockOctokit, org, repo, filePath);

      expect(result).toEqual({
        content: 'test content',
        sha: 'abc123',
      });
      expect(mockOctokit.repos.getContent).toHaveBeenCalledWith({
        owner: org,
        repo,
        path: filePath,
      });
    });

    it('should return null for non-existent files', async () => {
      mockOctokit.repos.getContent.mockRejectedValueOnce({ status: 404 });

      const result = await getFileContent(mockOctokit, org, repo, filePath);

      expect(result).toBeNull();
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockOctokit.repos.getContent.mockRejectedValueOnce(error);

      await expect(getFileContent(mockOctokit, org, repo, filePath)).rejects.toThrow('API Error');
    });
  });

  describe('updateFileContent', () => {
    it('should create or update file content', async () => {
      const content = 'new content';
      const sha = 'abc123';

      const consoleSpy = vi.spyOn(console, 'log');
      const errorSpy = vi.spyOn(console, 'error');

      await updateFileContent(mockOctokit, org, repo, filePath, content, sha);

      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner: org,
        repo,
        path: filePath,
        message: `Update ${filePath}`,
        content: Buffer.from(content).toString('base64'),
        sha,
      });
      expect(consoleSpy).toHaveBeenCalledWith(`✅ Successfully updated ${filePath} in ${repo}`);
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockOctokit.repos.createOrUpdateFileContents.mockRejectedValueOnce(error);

      const consoleSpy = vi.spyOn(console, 'log');
      const errorSpy = vi.spyOn(console, 'error');

      await updateFileContent(mockOctokit, org, repo, filePath, 'content');

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(`❌ Failed to update ${filePath} in ${repo}:`, error);
    });

    it('should log changes in dry run mode', async () => {
      const content = 'new content';
      const sha = 'abc123';

      const consoleSpy = vi.spyOn(console, 'log');
      const errorSpy = vi.spyOn(console, 'error');

      await updateFileContent(mockOctokit, org, repo, filePath, content, sha, true);

      expect(mockOctokit.repos.createOrUpdateFileContents).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(`🔍 Would update file ${filePath} in ${repo}`);
      expect(consoleSpy).toHaveBeenCalledWith(`🔍 Content length: ${content.length} characters`);
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('syncFileContent', () => {
    const config = {
      path: filePath,
      localPath: 'local/path/to/file.txt',
    };

    it('should sync file content when content differs', async () => {
      const localContent = 'local content';
      const remoteContent = 'remote content';
      const sha = 'abc123';

      readFile.mockResolvedValueOnce(localContent);
      mockOctokit.repos.getContent.mockResolvedValueOnce({
        data: {
          content: Buffer.from(remoteContent).toString('base64'),
          sha,
          type: 'file',
        },
      });

      const consoleSpy = vi.spyOn(console, 'log');
      const errorSpy = vi.spyOn(console, 'error');

      await syncFileContent(mockOctokit, org, repo, config);

      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner: org,
        repo,
        path: filePath,
        message: `Update ${filePath}`,
        content: Buffer.from(localContent).toString('base64'),
        sha,
      });
      expect(consoleSpy).toHaveBeenCalledWith(`✅ Successfully updated ${filePath} in ${repo}`);
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should skip sync when content matches', async () => {
      const content = 'same content';
      const sha = 'abc123';

      readFile.mockResolvedValueOnce(content);
      mockOctokit.repos.getContent.mockResolvedValueOnce({
        data: {
          content: Buffer.from(content).toString('base64'),
          sha,
          type: 'file',
        },
      });

      const consoleSpy = vi.spyOn(console, 'log');
      const errorSpy = vi.spyOn(console, 'error');

      await syncFileContent(mockOctokit, org, repo, config);

      expect(mockOctokit.repos.createOrUpdateFileContents).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        `⏭️ Skipping ${filePath} in ${repo} - content matches`
      );
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should create file if it does not exist', async () => {
      const content = 'new content';

      readFile.mockResolvedValueOnce(content);
      mockOctokit.repos.getContent.mockRejectedValueOnce({ status: 404 });

      const consoleSpy = vi.spyOn(console, 'log');
      const errorSpy = vi.spyOn(console, 'error');

      await syncFileContent(mockOctokit, org, repo, config);

      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner: org,
        repo,
        path: filePath,
        message: `Add ${filePath}`,
        content: Buffer.from(content).toString('base64'),
      });
      expect(consoleSpy).toHaveBeenCalledWith(`✅ Successfully created ${filePath} in ${repo}`);
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should handle file read errors', async () => {
      const error = new Error('File read error');
      readFile.mockRejectedValueOnce(error);

      const consoleSpy = vi.spyOn(console, 'log');
      const errorSpy = vi.spyOn(console, 'error');

      await syncFileContent(mockOctokit, org, repo, config);

      expect(mockOctokit.repos.createOrUpdateFileContents).not.toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        `❌ Failed to sync file ${filePath} in ${repo}:`,
        error
      );
    });

    it('should log changes in dry run mode', async () => {
      const localContent = 'local content';
      const remoteContent = 'remote content';
      const sha = 'abc123';

      readFile.mockResolvedValueOnce(localContent);
      mockOctokit.repos.getContent.mockResolvedValueOnce({
        data: {
          content: Buffer.from(remoteContent).toString('base64'),
          sha,
          type: 'file',
        },
      });

      const consoleSpy = vi.spyOn(console, 'log');
      const errorSpy = vi.spyOn(console, 'error');

      await syncFileContent(mockOctokit, org, repo, config, true);

      expect(mockOctokit.repos.createOrUpdateFileContents).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(`🔍 Would update file ${filePath} in ${repo}`);
      expect(consoleSpy).toHaveBeenCalledWith(
        `🔍 Content length: ${localContent.length} characters`
      );
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
