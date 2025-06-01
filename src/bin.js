#!/usr/bin/env node

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

import fs from 'fs/promises';

import { Octokit } from '@octokit/rest';
import { Command } from 'commander';

import { syncSettings } from './index.js';

const program = new Command();

program
  .name('github-settings-sync')
  .description('Synchronize repository settings across a GitHub organization')
  .requiredOption('-o, --org <organization>', 'GitHub organization name')
  .requiredOption('-s, --settings <path>', 'Path to JSON file with repository settings')
  .option(
    '-n, --name-pattern <pattern>',
    'Regular expression pattern to match repository names to include'
  )
  .option('-l, --label <label>', 'Only process repositories that have this label')
  .option('--language <language>', 'Only process repositories with this primary language')
  .option('-t, --token <token>', 'GitHub Personal Access Token (overrides GITHUB_TOKEN env var)')
  .option('-u, --base-url <url>', 'GitHub API base URL (for GitHub Enterprise)')
  .option('-d, --dry-run', 'Show what would be changed without making changes')
  .action(async (options) => {
    const org = options.org || process.env.GITHUB_ORG;

    if (!org) {
      console.error(
        '❌ Organization name is required. Use --org or set GITHUB_ORG environment variable'
      );
      process.exit(1);
    }

    if (!options.token && !process.env.GITHUB_TOKEN) {
      console.error(
        '❌ GitHub token is required. Use --token or set GITHUB_TOKEN environment variable'
      );
      process.exit(1);
    }

    // Initialize Octokit with provided options
    const octokit = new Octokit({
      auth: options.token || process.env.GITHUB_TOKEN,
      baseUrl: options.baseUrl,
    });

    try {
      const settingsFile = await fs.readFile(options.settings, 'utf-8');
      const settings = JSON.parse(settingsFile);

      if (Object.keys(settings).length === 0) {
        console.error('❌ Settings file is empty');
        process.exit(1);
      }

      const filters = {
        namePattern: options.namePattern,
        label: options.label,
        language: options.language,
      };

      await syncSettings(octokit, org, settings, filters, options.dryRun);
    } catch (error) {
      console.error('❌ Error reading settings file:', error);
      process.exit(1);
    }
  });

program.parse();
