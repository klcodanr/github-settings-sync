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

/**
 * Gets the content of a file in a repository.
 *
 * @param {import('@octokit/rest').Octokit} octokit - Initialized Octokit instance
 * @param {string} org - The GitHub organization name
 * @param {string} repo - The repository name
 * @param {string} path - Path to the file in the repository
 * @returns {Promise<{content: string, sha: string} | null>} File content and SHA if exists, null otherwise
 */
export async function getFileContent(octokit, org, repo, path) {
  try {
    const { data } = await octokit.repos.getContent({
      owner: org,
      repo,
      path,
    });

    if (data.type === 'file') {
      return {
        content: Buffer.from(data.content, 'base64').toString(),
        sha: data.sha,
      };
    }
    return null;
  } catch (error) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Updates or creates a file in a repository.
 *
 * @param {import('@octokit/rest').Octokit} octokit - Initialized Octokit instance
 * @param {string} org - The GitHub organization name
 * @param {string} repo - The repository name
 * @param {string} path - Path to the file in the repository
 * @param {string} content - Content to write to the file
 * @param {string} [sha] - SHA of the existing file (required for updates)
 * @param {boolean} [dryRun] - If true, only show what would be changed without making changes
 * @returns {Promise<void>}
 */
export async function updateFileContent(octokit, org, repo, path, content, sha, dryRun = false) {
  try {
    const message = sha ? `Update ${path}` : `Add ${path}`;
    if (dryRun) {
      console.log(`🔍 Would ${sha ? 'update' : 'create'} file ${path} in ${repo}`);
      console.log(`🔍 Content length: ${content.length} characters`);
    } else {
      await octokit.repos.createOrUpdateFileContents({
        owner: org,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        sha,
      });
      console.log(`✅ Successfully ${sha ? 'updated' : 'created'} ${path} in ${repo}`);
    }
  } catch (error) {
    console.error(`❌ Failed to update ${path} in ${repo}:`, error);
  }
}

/**
 * Synchronizes file contents from local files to a repository.
 *
 * @param {import('@octokit/rest').Octokit} octokit - Initialized Octokit instance
 * @param {string} org - The GitHub organization name
 * @param {string} repo - The repository name
 * @param {Object} fileSync - File synchronization configuration
 * @param {string} fileSync.path - Path in the repository where the file should be
 * @param {string} fileSync.localPath - Path to the local file
 * @param {boolean} [dryRun] - If true, only show what would be changed without making changes
 * @returns {Promise<void>}
 */
export async function syncFileContent(octokit, org, repo, fileSync, dryRun = false) {
  try {
    const { path, localPath } = fileSync;

    // Read local file content
    const localContent = await readFile(localPath, 'utf-8');

    // Get current file content in repository
    const currentFile = await getFileContent(octokit, org, repo, path);

    // Update if file doesn't exist or content is different
    if (!currentFile || currentFile.content !== localContent) {
      await updateFileContent(octokit, org, repo, path, localContent, currentFile?.sha, dryRun);
    } else {
      console.log(`⏭️ Skipping ${path} in ${repo} - content matches`);
    }
  } catch (error) {
    console.error(`❌ Failed to sync file ${fileSync.path} in ${repo}:`, error);
  }
}
