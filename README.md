# GitHub Settings Sync

[![npm version](https://img.shields.io/npm/v/github-settings-sync.svg)](https://www.npmjs.com/package/github-settings-sync)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Release](https://github.com/klcodanr/github-settings-sync/actions/workflows/release.yml/badge.svg)](https://github.com/klcodanr/github-settings-sync/actions/workflows/release.yml)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

A command-line tool to synchronize repository settings across a GitHub organization.

## Features

- Synchronize repository settings across all repositories in an organization
- Manage repository collaborators and their roles
- Configure branch protection rules
- Synchronize file contents from local files to repositories
- Customizable settings via JSON file
- Filter repositories by name pattern, labels, or language
- Supports pagination for organizations with many repositories
- Detailed logging of operations
- Support for GitHub Enterprise via custom base URL

## Prerequisites

- Node.js 18 or higher
- GitHub Personal Access Token with `repo` and `admin:org` scopes


## Global Installation

npm install -g github-settings-sync

## Local Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Install the package globally (optional):
   ```bash
   npm install -g .
   ```

## Usage

Run the tool using the global command:

```bash
github-settings-sync --org my-org --settings settings.json [options]
```

### Command Line Arguments

Required Arguments:

- `-o, --org <organization>`: GitHub organization name
- `-s, --settings <path>`: Path to JSON file with repository settings

Authentication Options:

- `-t, --token <token>`: GitHub Personal Access Token (overrides GITHUB_TOKEN env var)
- `-u, --base-url <url>`: GitHub API base URL (for GitHub Enterprise)

Filter Options:

- `-n, --name-pattern <pattern>`: Regular expression pattern to match repository names to include
- `-l, --label <label>`: Only process repositories that have this label
- `-lang, --language <language>`: Only process repositories with this primary language

Examples:

```bash
# Basic usage with environment variables
github-settings-sync --org my-org --settings settings.json

# Using CLI token instead of environment variable
github-settings-sync --org my-org --settings settings.json --token ghp_xxxxxxxxxxxx

# Using GitHub Enterprise
github-settings-sync --org my-org --settings settings.json --base-url https://github.enterprise.com/api/v3

# Only process repositories with names containing 'api' or 'service'
github-settings-sync --org my-org --settings settings.json --name-pattern "api|service"

# Only process repositories with the 'active' label
github-settings-sync --org my-org --settings settings.json --label active

# Only process Python repositories
github-settings-sync --org my-org --settings settings.json --language python

# Combine multiple filters (repositories must match ALL specified filters)
github-settings-sync --org my-org --settings settings.json --name-pattern "api" --language python
```

Note: If no filters are specified, all repositories will be processed. When multiple filters are specified, repositories must match ALL specified filters to be processed.

### Settings File

Create a JSON file with your desired repository settings. Here's an example of the configuration format:

```json
{
  "repository": {
    "has_issues": true,
    "has_wiki": false,
    "has_projects": true,
    "allow_squash_merge": true,
    "allow_merge_commit": false,
    "allow_rebase_merge": true,
    "delete_branch_on_merge": true,
    "allow_auto_merge": true,
    "allow_update_branch": true
  },
  "collaborators": [
    {
      "username": "user1",
      "role": "admin"
    },
    {
      "username": "user2",
      "role": "write"
    },
    {
      "username": "user3",
      "role": "read"
    }
  ],
  "branch_protection": {
    "main": {
      "enforce_admins": true,
      "required_status_checks": {
        "strict": true,
        "contexts": ["ci/build", "ci/test"]
      },
      "required_pull_request_reviews": {
        "required_approving_review_count": 2,
        "dismiss_stale_reviews": true,
        "require_code_owner_reviews": true
      },
      "allow_force_pushes": false,
      "allow_deletions": false
    },
    "develop": {
      "enforce_admins": false,
      "required_status_checks": {
        "strict": true,
        "contexts": ["ci/build"]
      },
      "required_pull_request_reviews": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews": true
      },
      "allow_force_pushes": false,
      "allow_deletions": false
    }
  },
  "files": [
    {
      "path": ".gitignore",
      "localPath": "./templates/.gitignore"
    },
    {
      "path": "CONTRIBUTING.md",
      "localPath": "./templates/CONTRIBUTING.md"
    }
  ]
}
```

#### Repository Settings

The `repository` object contains all repository-level settings:

- `has_issues`: Enable/disable issues
- `has_wiki`: Enable/disable wiki
- `has_projects`: Enable/disable projects
- `allow_squash_merge`: Enable/disable squash merges
- `allow_merge_commit`: Enable/disable merge commits
- `allow_rebase_merge`: Enable/disable rebase merges
- `delete_branch_on_merge`: Enable/disable automatic branch deletion
- `allow_auto_merge`: Enable/disable auto-merge
- `allow_update_branch`: Enable/disable branch updates

#### Collaborator Management

The `collaborators` array can specify users and their roles. Available roles are:

- `admin`: Full repository access
- `maintain`: Repository maintenance access
- `write`: Push access
- `triage`: Issue and PR triage access
- `read`: Read-only access

The script will:

- Add new collaborators with specified roles
- Update roles for existing collaborators if they've changed
- Preserve existing collaborators not in the list

Note: The script will not remove any existing collaborators. It only adds new ones and updates roles for existing ones.

#### Branch Protection Rules

The `branch_protection` object maps branch names to their protection rules. Each branch can have the following settings:

- `enforce_admins`: Whether to enforce restrictions for administrators
- `required_status_checks`: Status check requirements
  - `strict`: Require branches to be up to date before merging
  - `contexts`: Array of required status check contexts
- `required_pull_request_reviews`: Pull request review requirements
  - `required_approving_review_count`: Number of required approving reviews
  - `dismiss_stale_reviews`: Dismiss stale pull request approvals
  - `require_code_owner_reviews`: Require review from Code Owners
- `allow_force_pushes`: Allow force pushes to the branch
- `allow_deletions`: Allow deletion of the branch

Example:

```json
{
  "branch_protection": {
    "main": {
      "enforce_admins": true,
      "required_status_checks": {
        "strict": true,
        "contexts": ["ci/build"]
      },
      "required_pull_request_reviews": {
        "required_approving_review_count": 2,
        "dismiss_stale_reviews": true
      },
      "allow_force_pushes": false
    }
  }
}
```

The script will:

- Apply protection rules to each specified branch
- Update existing protection rules if they differ from the configuration
- Log success or failure for each branch protection update

#### File Synchronization

The `files` array specifies files to be synchronized from local paths to repositories. Each file configuration requires:

- `path`: Path in the repository where the file should be (e.g., `.gitignore`, `CONTRIBUTING.md`)
- `localPath`: Path to the local file that contains the desired content

Example:

```json
{
  "files": [
    {
      "path": ".gitignore",
      "localPath": "./templates/.gitignore"
    },
    {
      "path": "docs/CONTRIBUTING.md",
      "localPath": "./templates/CONTRIBUTING.md"
    }
  ]
}
```

The script will:

- Read the content of each local file
- Check if the file exists in the repository
- Create the file if it doesn't exist
- Update the file if its content differs from the local file
- Skip the file if its content matches the local file
- Log success or failure for each file operation

This is useful for maintaining consistent files across repositories, such as:

- `.gitignore` files
- `CONTRIBUTING.md` guidelines
- `README.md` templates
- Configuration files
- License files

## Error Handling

The script will:

- Log errors for individual repository updates but continue processing other repositories
- Exit with an error code if there are critical failures (e.g., authentication issues, missing settings)
- Provide detailed error messages for troubleshooting
- Show a summary of processed and skipped repositories

## License

MIT
