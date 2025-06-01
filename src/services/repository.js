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
 * Fetches all repositories for a given GitHub organization.
 * Handles pagination automatically to get all repositories.
 *
 * @param {import('@octokit/rest').Octokit} octokit - Initialized Octokit instance
 * @param {string} org - The GitHub organization name
 * @returns {Promise<Array<Object>>} Array of repository objects
 * @throws {Error} If the GitHub API request fails
 */
export async function getRepositories(octokit, org) {
  const repos = [];
  let page = 1;

  while (true) {
    const { data } = await octokit.repos.listForOrg({
      org,
      per_page: 100,
      page,
    });

    if (data.length === 0) {
      break;
    }

    repos.push(...data);
    page++;
  }

  return repos;
}

/**
 * Gets the current settings for a repository.
 *
 * @param {import('@octokit/rest').Octokit} octokit - Initialized Octokit instance
 * @param {string} org - The GitHub organization name
 * @param {string} repo - The repository name
 * @returns {Promise<Object>} Current repository settings
 */
async function getRepositorySettings(octokit, org, repo) {
  try {
    const { data } = await octokit.repos.get({
      owner: org,
      repo,
    });
    return data;
  } catch (error) {
    console.error(`❌ Failed to fetch settings for ${repo}:`, error);
    return null;
  }
}

/**
 * Compares two objects and returns an object containing only the properties that differ.
 *
 * @param {Object} current - Current settings
 * @param {Object} desired - Desired settings
 * @returns {Object} Object containing only the properties that need to be updated
 */
function getSettingsDiff(current, desired) {
  const diff = {};
  for (const [key, value] of Object.entries(desired)) {
    if (JSON.stringify(current[key]) !== JSON.stringify(value)) {
      diff[key] = value;
    }
  }
  return diff;
}

/**
 * Updates the settings for a specific repository.
 * Only updates settings that differ from the current configuration.
 *
 * @param {import('@octokit/rest').Octokit} octokit - Initialized Octokit instance
 * @param {string} org - The GitHub organization name
 * @param {string} repo - The repository name
 * @param {Object} settings - The settings to apply to the repository
 * @param {Object} [settings.repository] - Repository settings
 * @param {boolean} [dryRun] - If true, only show what would be changed without making changes
 * @returns {Promise<void>}
 */
export async function updateRepositorySettings(octokit, org, repo, settings, dryRun = false) {
  try {
    const { repository } = settings;

    if (repository) {
      // Get current repository settings
      const currentSettings = await getRepositorySettings(octokit, org, repo);
      if (!currentSettings) {
        return;
      }

      // Compare current settings with desired settings
      const settingsDiff = getSettingsDiff(currentSettings, repository);

      if (Object.keys(settingsDiff).length === 0) {
        console.log(`⏭️ Skipping ${repo} - settings match`);
        return;
      }

      if (dryRun) {
        console.log(`🔍 Would update repository settings for ${repo}:`, settingsDiff);
      } else {
        await octokit.repos.update({
          owner: org,
          repo,
          ...settingsDiff,
        });
        console.log(`✅ Successfully updated settings for ${repo}`);
      }
    }
  } catch (error) {
    console.error(`❌ Failed to update settings for ${repo}:`, error);
  }
}
