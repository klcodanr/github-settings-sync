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

/**
 * Fetches all labels for a given repository.
 *
 * @param {import('@octokit/rest').Octokit} octokit - Initialized Octokit instance
 * @param {string} org - The GitHub organization name
 * @param {string} repo - The repository name
 * @returns {Promise<Array<string>>} Array of label names
 */
export async function getRepositoryLabels(octokit, org, repo) {
  try {
    const { data } = await octokit.issues.listLabelsForRepo({
      owner: org,
      repo,
    });
    return data.map((label) => label.name);
  } catch (error) {
    console.warn(`⚠️ Could not fetch labels for ${repo}: ${error.message}`);
    return [];
  }
}

/**
 * Determines if a repository should be processed based on the provided filters.
 * If no filters are specified, all repositories are processed.
 * When multiple filters are specified, repositories must match ALL filters.
 *
 * @param {import('@octokit/rest').Octokit} octokit - Initialized Octokit instance
 * @param {import('@octokit/rest').RestEndpointMethodTypes['repos']['get']['response']['data']} repo - The repository object from GitHub API
 * @param {Object} filters - The filter criteria
 * @param {string} [filters.namePattern] - Regular expression pattern to match repository names
 * @param {string} [filters.label] - Label that must be present on the repository
 * @param {string} [filters.language] - Primary language of the repository
 * @returns {Promise<boolean>} True if the repository should be processed, false otherwise
 */
export async function shouldProcessRepository(octokit, repo, filters) {
  // If no filters are specified, process all repositories
  if (!filters.namePattern && !filters.label && !filters.language) {
    return true;
  }

  // Skip archived repositories
  if (repo.archived) {
    console.log(`⏭️ Skipping ${repo.name} - repository is archived`);
    return false;
  }

  // Check name pattern
  if (filters.namePattern && !new RegExp(filters.namePattern).test(repo.name)) {
    console.log(`⏭️ Skipping ${repo.name} - does not match name pattern ${filters.namePattern}`);
    return false;
  }

  // Check language
  if (
    filters.language &&
    (!repo.language || repo.language.toLowerCase() !== filters.language.toLowerCase())
  ) {
    console.log(`⏭️ Skipping ${repo.name} - does not match language ${filters.language}`);
    return false;
  }

  // Check labels
  if (filters.label) {
    const labels = await getRepositoryLabels(octokit, repo.owner.login, repo.name);
    if (!labels.includes(filters.label)) {
      console.log(`⏭️ Skipping ${repo.name} - does not have label ${filters.label}`);
      return false;
    }
  }

  return true;
}
