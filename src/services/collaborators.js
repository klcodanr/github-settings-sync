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
 * Fetches all collaborators for a given repository.
 *
 * @param {import('@octokit/rest').Octokit} octokit - Initialized Octokit instance
 * @param {string} org - The GitHub organization name
 * @param {string} repo - The repository name
 * @returns {Promise<Array<Object>>} Array of collaborator objects with their roles
 */
export async function getRepositoryCollaborators(octokit, org, repo) {
  try {
    const { data } = await octokit.repos.listCollaborators({
      owner: org,
      repo,
    });
    return data.map((collab) => ({
      username: collab.login,
      role: collab.role_name,
    }));
  } catch (error) {
    console.warn(`⚠️ Could not fetch collaborators for ${repo}: ${error.message}`);
    return [];
  }
}

/**
 * Updates the collaborators for a repository to match the desired configuration.
 * Only adds new collaborators and updates roles for existing ones.
 * Does not remove existing collaborators.
 *
 * @param {import('@octokit/rest').Octokit} octokit - Initialized Octokit instance
 * @param {string} org - The GitHub organization name
 * @param {string} repo - The repository name
 * @param {Array<Object>} desiredCollaborators - Array of desired collaborator configurations
 * @param {string} desiredCollaborators[].username - GitHub username
 * @param {string} desiredCollaborators[].role - Desired role (admin, maintain, write, triage, read)
 * @param {boolean} [dryRun] - If true, only show what would be changed without making changes
 * @returns {Promise<void>}
 */
export async function updateRepositoryCollaborators(
  octokit,
  org,
  repo,
  desiredCollaborators,
  dryRun = false
) {
  const currentCollaborators = await getRepositoryCollaborators(octokit, org, repo);
  const currentUsernames = new Set(currentCollaborators.map((c) => c.username));

  // Add new collaborators and update existing ones
  for (const collaborator of desiredCollaborators) {
    if (!currentUsernames.has(collaborator.username)) {
      if (dryRun) {
        console.log(
          `🔍 Would add collaborator ${collaborator.username} with role ${collaborator.role} to ${repo}`
        );
      } else {
        try {
          await octokit.repos.addCollaborator({
            owner: org,
            repo,
            username: collaborator.username,
            permission: collaborator.role,
          });
          console.log(
            `✅ Added collaborator ${collaborator.username} with role ${collaborator.role} to ${repo}`
          );
        } catch (error) {
          console.error(
            `❌ Failed to add collaborator ${collaborator.username} to ${repo}: ${error.message}`
          );
        }
      }
    } else {
      // Update role if needed
      const currentCollab = currentCollaborators.find((c) => c.username === collaborator.username);
      if (currentCollab && currentCollab.role !== collaborator.role) {
        if (dryRun) {
          console.log(
            `🔍 Would update role for ${collaborator.username} from ${currentCollab.role} to ${collaborator.role} in ${repo}`
          );
        } else {
          try {
            await octokit.repos.addCollaborator({
              owner: org,
              repo,
              username: collaborator.username,
              permission: collaborator.role,
            });
            console.log(
              `✅ Updated role for ${collaborator.username} to ${collaborator.role} in ${repo}`
            );
          } catch (error) {
            console.error(
              `❌ Failed to update role for ${collaborator.username} in ${repo}: ${error.message}`
            );
          }
        }
      }
    }
  }
}
