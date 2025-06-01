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

import { updateBranchProtection } from './services/branch-protection.js';
import { updateRepositoryCollaborators } from './services/collaborators.js';
import { syncFileContent } from './services/file-sync.js';
import { getRepositories, updateRepositorySettings } from './services/repository.js';
import { shouldProcessRepository } from './utils/filters.js';

/**
 * Synchronizes settings across all repositories in an organization that match the specified filters.
 *
 * @param {import('@octokit/rest').Octokit} octokit - Initialized Octokit instance
 * @param {string} org - The GitHub organization name
 * @param {Object} settings - The settings to apply to matching repositories
 * @param {Object[]} [settings.collaborators] - The collaborators to add to the repository
 * @param {Record<string, Object>} [settings.branch_protection] - The branch protection rules to apply to the repository
 * @param {Object[]} [settings.files] - The files to sync to the repository
 * @param {Object} filters - The filter criteria for selecting repositories
 * @param {string} [filters.namePattern] - Regular expression pattern to match repository names
 * @param {string} [filters.label] - Label that must be present on the repository
 * @param {string} [filters.language] - Primary language of the repository
 * @param {boolean} [dryRun] - If true, only show what would be changed without making changes
 * @returns {Promise<void>}
 * @throws {Error} If there's a critical error during the sync process
 */
export async function syncSettings(octokit, org, settings, filters, dryRun = false) {
  try {
    console.log(`🔄 Starting settings sync for organization: ${org}`);
    if (dryRun) {
      console.log('🔍 Running in dry-run mode - no changes will be made');
    }

    const repos = await getRepositories(octokit, org);
    console.log(`📦 Found ${repos.length} repositories`);

    let processedCount = 0;
    let skippedCount = 0;

    for (const repo of repos) {
      if (await shouldProcessRepository(octokit, repo, filters)) {
        await updateRepositorySettings(octokit, org, repo.name, settings, dryRun);

        // Update collaborators if specified
        if (settings.collaborators) {
          await updateRepositoryCollaborators(
            octokit,
            org,
            repo.name,
            settings.collaborators,
            dryRun
          );
          console.log(
            `✅ ${dryRun ? 'Would update' : 'Successfully updated'} collaborators for ${repo.name}`
          );
        }

        // Update branch protection rules if specified
        if (settings.branch_protection && typeof settings.branch_protection === 'object') {
          for (const [branch, protection] of Object.entries(settings.branch_protection)) {
            await updateBranchProtection(octokit, org, repo.name, branch, protection, dryRun);
          }
          console.log(
            `✅ ${dryRun ? 'Would update' : 'Successfully updated'} branch protection for ${repo.name}`
          );
        }

        // Sync files if specified
        if (settings.files && Array.isArray(settings.files)) {
          for (const fileSync of settings.files) {
            await syncFileContent(octokit, org, repo.name, fileSync, dryRun);
          }
          console.log(
            `✅ ${dryRun ? 'Would sync' : 'Successfully synced'} file content for ${repo.name}`
          );
        }

        processedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log('✨ Settings sync completed!');
    console.log(`📊 Summary:
    - Total repositories: ${repos.length}
    - Processed: ${processedCount}
    - Skipped: ${skippedCount}
    - Mode: ${dryRun ? 'Dry Run' : 'Live'}`);
  } catch (error) {
    console.error('❌ Error during sync:', error);
    process.exit(1);
  }
}
