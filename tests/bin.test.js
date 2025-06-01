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

// Remove unused import of Command
// import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { syncSettings } from '../src/index.js';

// Mock dependencies
vi.mock('fs/promises');
vi.mock('../src/index.js');

// Robust Commander mock for proper chaining and callback handling
let commanderOptions = {};
let commanderAction = null;

vi.mock('commander', () => {
  class MockCommand {
    name() {
      return this;
    }
    description() {
      return this;
    }
    requiredOption() {
      return this;
    }
    option() {
      return this;
    }
    action(cb) {
      commanderAction = cb;
      return this;
    }
    parse() {
      if (commanderAction) commanderAction(commanderOptions);
    }
  }
  return { Command: MockCommand };
});

describe('github-settings-sync CLI', () => {
  const mockSettings = {
    collaborators: {
      user1: 'admin',
      user2: 'write',
    },
    branch_protection: {
      main: {
        required_status_checks: true,
      },
    },
  };

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Default CLI options
    commanderOptions = {
      org: 'test-org',
      settings: 'test-settings.json',
      token: 'test-token',
      dryRun: false,
    };

    // Mock fs.readFile
    fs.readFile.mockResolvedValue(JSON.stringify(mockSettings));

    // Mock syncSettings
    syncSettings.mockResolvedValue(undefined);

    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock process.exit
    vi.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should successfully process settings with valid input', async () => {
    // Import the bin file to trigger the command setup
    await import('../src/bin.js');

    expect(fs.readFile).toHaveBeenCalledWith('test-settings.json', 'utf-8');
    expect(syncSettings).toHaveBeenCalledWith(
      expect.any(Object),
      'test-org',
      mockSettings,
      expect.any(Object),
      false
    );
  });

  it('should handle missing organization name', async () => {
    commanderOptions = {
      settings: 'test-settings.json',
      token: 'test-token',
    };
    await vi.resetModules();
    await import('../src/bin.js');
    expect(console.error).toHaveBeenCalledWith(
      '❌ Organization name is required. Use --org or set GITHUB_ORG environment variable'
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle missing GitHub token', async () => {
    commanderOptions = {
      org: 'test-org',
      settings: 'test-settings.json',
    };
    await vi.resetModules();
    await import('../src/bin.js');
    expect(console.error).toHaveBeenCalledWith(
      '❌ GitHub token is required. Use --token or set GITHUB_TOKEN environment variable'
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle empty settings file', async () => {
    fs.readFile.mockResolvedValue('{}');
    commanderOptions = {
      org: 'test-org',
      settings: 'test-settings.json',
      token: 'test-token',
    };
    await vi.resetModules();
    await import('../src/bin.js');
    expect(console.error).toHaveBeenCalledWith('❌ Settings file is empty');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle file read errors', async () => {
    const testError = new Error('File not found');
    fs.readFile.mockRejectedValue(testError);
    commanderOptions = {
      org: 'test-org',
      settings: 'test-settings.json',
      token: 'test-token',
    };
    await vi.resetModules();
    await import('../src/bin.js');
    expect(console.error).toHaveBeenCalledWith('❌ Error reading settings file:', testError);
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should pass filters to syncSettings when provided', async () => {
    commanderOptions = {
      org: 'test-org',
      settings: 'test-settings.json',
      token: 'test-token',
      namePattern: 'test-.*',
      label: 'test-label',
      language: 'javascript',
    };
    await vi.resetModules();
    await import('../src/bin.js');
    expect(syncSettings).toHaveBeenCalledWith(
      expect.any(Object),
      'test-org',
      mockSettings,
      {
        namePattern: 'test-.*',
        label: 'test-label',
        language: 'javascript',
      },
      undefined
    );
  });

  it('should handle dry run mode', async () => {
    commanderOptions = {
      org: 'test-org',
      settings: 'test-settings.json',
      token: 'test-token',
      dryRun: true,
    };
    await vi.resetModules();
    await import('../src/bin.js');
    expect(syncSettings).toHaveBeenCalledWith(
      expect.any(Object),
      'test-org',
      mockSettings,
      expect.any(Object),
      true
    );
  });
});
