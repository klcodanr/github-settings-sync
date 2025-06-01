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
 * Updates branch protection rules for a repository.
 *
 * @param {import('@octokit/rest').Octokit} octokit - Initialized Octokit instance
 * @param {string} org - The GitHub organization name
 * @param {string} repo - The repository name
 * @param {string} branch - Branch name to protect (e.g., 'main')
 * @param {Object} settings - Branch protection settings
 * @param {boolean} [settings.enforce_admins] - Enforce restrictions for administrators
 * @param {boolean} [settings.required_status_checks] - Require status checks to pass before merging
 * @param {Array<string>} [settings.required_status_checks.contexts] - Required status check contexts
 * @param {boolean} [settings.strict] - Require branches to be up to date before merging
 * @param {boolean} [settings.required_pull_request_reviews] - Require pull request reviews before merging
 * @param {number} [settings.required_approving_review_count] - Number of required approving reviews
 * @param {boolean} [settings.dismiss_stale_reviews] - Dismiss stale pull request approvals
 * @param {boolean} [settings.require_code_owner_reviews] - Require review from Code Owners
 * @param {boolean} [settings.allow_force_pushes] - Allow force pushes to the branch
 * @param {boolean} [settings.allow_deletions] - Allow deletion of the branch
 * @param {boolean} [dryRun] - If true, only show what would be changed without making changes
 * @returns {Promise<void>}
 */
export async function updateBranchProtection(octokit, org, repo, branch, settings, dryRun = false) {
  try {
    if (dryRun) {
      console.log(`🔍 Would update branch protection for ${branch} in ${repo}:`, settings);
    } else {
      await octokit.repos.updateBranchProtection({
        owner: org,
        repo,
        branch,
        ...settings,
      });
      console.log(`✅ Successfully updated branch protection for ${branch} in ${repo}`);
    }
  } catch (error) {
    console.error(`❌ Failed to update branch protection for ${repo}:`, error);
  }
}
