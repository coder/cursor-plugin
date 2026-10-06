#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const errors = [];
const warnings = [];

const pluginNamePattern = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const marketplaceNamePattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDirectory(targetPath, context) {
  try {
    const stat = await fs.stat(targetPath);
    if (!stat.isDirectory()) {
      addError(`${context} exists but is not a directory: ${targetPath}`);
      return false;
    }
    return true;
  } catch {
    addError(`${context} directory is missing: ${targetPath}`);
    return false;
  }
}

async function readJsonFile(filePath, context) {
  let raw;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    addError(`${context} is missing: ${filePath}`);
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    addError(`${context} contains invalid JSON (${filePath}): ${error.message}`);
    return null;
  }
}

function normalizeNewlines(content) {
  return content.replace(/\r\n/g, "\n");
}

function parseFrontmatter(content) {
  const normalized = normalizeNewlines(content);
  if (!normalized.startsWith("---\n")) {
    return null;
  }

  const closingIndex = normalized.indexOf("\n---\n", 4);
  if (closingIndex === -1) {
    return null;
  }

  const frontmatterBlock = normalized.slice(4, closingIndex);
  const fields = {};

  for (const line of frontmatterBlock.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    fields[key] = value;
  }

  return fields;
}

async function walkFiles(dirPath) {
  const files = [];
  const stack = [dirPath];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  }

  return files;
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return true;
  }
  if (path.isAbsolute(value)) {
    return false;
  }
  const normalized = path.posix.normalize(value.replace(/\\/g, "/"));
  return !normalized.startsWith("../") && normalized !== "..";
}

function extractPathValues(value) {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractPathValues(entry));
  }

  if (value && typeof value === "object") {
    const candidates = [];
    if (typeof value.path === "string") {
      candidates.push(value.path);
    }
    if (typeof value.file === "string") {
      candidates.push(value.file);
    }
    return candidates;
  }

  return [];
}

async function validateReferencedPath(pluginDir, fieldName, pathValue, pluginName) {
  if (pathValue.startsWith("http://") || pathValue.startsWith("https://")) {
    return;
  }

  if (!isSafeRelativePath(pathValue)) {
    addError(
      `${pluginName}: field "${fieldName}" has invalid path "${pathValue}". Use a relative path without ".." or absolute prefixes.`
    );
    return;
  }

  const resolved = path.resolve(pluginDir, pathValue);
  const exists = await pathExists(resolved);
  if (!exists) {
    addError(`${pluginName}: field "${fieldName}" references missing path "${pathValue}".`);
  }
}

async function validateFrontmatterFile(filePath, componentName, requiredKeys, pluginName) {
  const content = await fs.readFile(filePath, "utf8");
  const parsed = parseFrontmatter(content);
  const relativeFile = path.relative(repoRoot, filePath);

  if (!parsed) {
    addError(`${pluginName}: ${componentName} file missing YAML frontmatter: ${relativeFile}`);
    return;
  }

  for (const key of requiredKeys) {
    if (!parsed[key] || parsed[key].length === 0) {
      addError(`${pluginName}: ${componentName} file missing "${key}" in frontmatter: ${relativeFile}`);
    }
  }
}

async function validateComponentFrontmatter(pluginDir, pluginName) {
  const rulesDir = path.join(pluginDir, "rules");
  if (await pathExists(rulesDir)) {
    const files = await walkFiles(rulesDir);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext === ".md" || ext === ".mdc" || ext === ".markdown") {
        await validateFrontmatterFile(file, "rule", ["description"], pluginName);
      }
    }
  }

  const skillsDir = path.join(pluginDir, "skills");
  if (await pathExists(skillsDir)) {
    const files = await walkFiles(skillsDir);
    for (const file of files) {
      if (path.basename(file) === "SKILL.md") {
        await validateFrontmatterFile(file, "skill", ["name", "description"], pluginName);
      }
    }
  }

  const agentsDir = path.join(pluginDir, "agents");
  if (await pathExists(agentsDir)) {
    const files = await walkFiles(agentsDir);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext === ".md" || ext === ".mdc" || ext === ".markdown") {
        await validateFrontmatterFile(file, "agent", ["name", "description"], pluginName);
      }
    }
  }

  const commandsDir = path.join(pluginDir, "commands");
  if (await pathExists(commandsDir)) {
    const files = await walkFiles(commandsDir);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext === ".md" || ext === ".mdc" || ext === ".markdown" || ext === ".txt") {
        await validateFrontmatterFile(file, "command", ["name", "description"], pluginName);
      }
    }
  }
}

// Agent Plugins 1.0.0 (https://github.com/agentplugins/agent-plugins-spec).
// The checks below mirror the closed schemas in spec/1.0.0.md so CI needs no
// network access or schema validator dependency.
const AGENT_PLUGIN_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
const AGENT_MCP_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";
const agentPluginNamePattern = /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const agentSkillNamePattern = /^(?!.*--)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const agentManifestFields = [
  "$schema",
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "extensions",
];
// Metadata that must be identical in plugin.json and .cursor-plugin/plugin.json.
const sharedManifestFields = [
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
];

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isDeepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function validateAgentManifest(manifest, pluginName) {
  const label = `${pluginName}: plugin.json`;

  for (const key of Object.keys(manifest)) {
    if (!agentManifestFields.includes(key)) {
      addError(
        `${label} has unknown top-level field "${key}". Move client-specific data under "extensions" or keep it in .cursor-plugin/plugin.json.`
      );
    }
  }

  if (manifest.$schema !== AGENT_PLUGIN_SCHEMA) {
    addError(`${label} "$schema" must be "${AGENT_PLUGIN_SCHEMA}".`);
  }

  if (
    typeof manifest.name !== "string" ||
    manifest.name.length === 0 ||
    manifest.name.length > 64 ||
    !agentPluginNamePattern.test(manifest.name)
  ) {
    addError(
      `${label} "name" must be 1-64 lowercase alphanumerics, hyphens, or periods, start and end alphanumeric, with no "--" or "..".`
    );
  }

  for (const key of ["version", "description", "homepage", "repository", "license"]) {
    if (manifest[key] !== undefined && typeof manifest[key] !== "string") {
      addError(`${label} "${key}" must be a string.`);
    }
  }

  if (manifest.author !== undefined) {
    if (!isPlainObject(manifest.author)) {
      addError(`${label} "author" must be an object.`);
    } else {
      for (const [key, value] of Object.entries(manifest.author)) {
        if (!["name", "email", "url"].includes(key) || typeof value !== "string") {
          addError(`${label} "author" may only contain string "name", "email", and "url" fields.`);
          break;
        }
      }
    }
  }

  if (
    manifest.keywords !== undefined &&
    (!Array.isArray(manifest.keywords) || manifest.keywords.some((k) => typeof k !== "string"))
  ) {
    addError(`${label} "keywords" must be an array of strings.`);
  }

  if (manifest.extensions !== undefined) {
    if (!isPlainObject(manifest.extensions)) {
      addError(`${label} "extensions" must be an object.`);
    } else if (Object.values(manifest.extensions).some((value) => !isPlainObject(value))) {
      addError(`${label} every "extensions" namespace value must be an object.`);
    }
  }
}

function validateAgentMcpServer(server, serverName, pluginName) {
  const label = `${pluginName}: mcp.json server "${serverName}"`;
  if (!isPlainObject(server)) {
    addError(`${label} must be an object.`);
    return;
  }

  const variants = {
    stdio: { required: ["type", "command"], allowed: ["type", "command", "args", "env", "cwd"] },
    "streamable-http": { required: ["type", "url"], allowed: ["type", "url", "headers"] },
    sse: { required: ["type", "url"], allowed: ["type", "url", "headers"] },
  };
  const variant = variants[server.type];
  if (!variant) {
    addError(`${label} "type" must be one of: ${Object.keys(variants).join(", ")}.`);
    return;
  }

  for (const key of variant.required) {
    if (typeof server[key] !== "string" || server[key].length === 0) {
      addError(`${label} requires a non-empty string "${key}".`);
    }
  }
  for (const key of Object.keys(server)) {
    if (!variant.allowed.includes(key)) {
      addError(`${label} has field "${key}" that is not valid for type "${server.type}".`);
    }
  }

  if (server.type === "stdio") {
    if (server.args !== undefined && (!Array.isArray(server.args) || server.args.some((a) => typeof a !== "string"))) {
      addError(`${label} "args" must be an array of strings.`);
    }
    if (server.env !== undefined) {
      if (!isPlainObject(server.env) || Object.values(server.env).some((v) => typeof v !== "string")) {
        addError(`${label} "env" must be an object of strings.`);
      } else if ("PLUGIN_ROOT" in server.env || "PLUGIN_DATA" in server.env) {
        addError(`${label} "env" must not set PLUGIN_ROOT or PLUGIN_DATA.`);
      }
    }
    if (server.cwd !== undefined && !/^(?:\.\/|\$\{PLUGIN_ROOT\}(?:\/|$)|\$\{PLUGIN_DATA\}(?:\/|$))/.test(server.cwd)) {
      addError(`${label} "cwd" must start with "./", "\${PLUGIN_ROOT}", or "\${PLUGIN_DATA}".`);
    }
  } else {
    if (server.headers !== undefined) {
      if (!isPlainObject(server.headers) || Object.values(server.headers).some((v) => typeof v !== "string")) {
        addError(`${label} "headers" must be an object of strings.`);
      }
    }
    // The spec forbids placeholder expansion in "url", so a client that
    // follows it skips this server. Cursor expands plugin variables itself.
    if (typeof server.url === "string" && server.url.includes("${")) {
      addWarning(
        `${pluginName}: mcp.json server "${serverName}" url contains a placeholder. Agent Plugins forbids expansion in "url", so only Cursor will connect to it.`
      );
    }
  }
}

function readSkillFrontmatter(content) {
  const match = normalizeNewlines(content).match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    return {};
  }
  const lines = match[1].split("\n");
  const fields = {};
  for (let i = 0; i < lines.length; i += 1) {
    const field = lines[i].match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!field) {
      continue;
    }
    let value = field[2].trim();
    // Folded (>) and literal (|) block scalars continue on indented lines.
    if (/^[>|][+-]?$/.test(value)) {
      const parts = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) {
        parts.push(lines[i + 1].trim());
        i += 1;
      }
      value = parts.join(" ");
    }
    fields[field[1]] = value.replace(/^(["'])(.*)\1$/, "$2");
  }
  return fields;
}

async function validateAgentSkills(pluginDir, pluginName) {
  const skillsDir = path.join(pluginDir, "skills");
  if (!(await pathExists(skillsDir))) {
    return;
  }
  const entries = await fs.readdir(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const skillFile = path.join(skillsDir, entry.name, "SKILL.md");
    if (!(await pathExists(skillFile))) {
      continue;
    }
    const label = `${pluginName}: skills/${entry.name}/SKILL.md`;
    const fields = readSkillFrontmatter(await fs.readFile(skillFile, "utf8"));
    if (fields.name !== entry.name) {
      addError(
        `${label} "name" (${JSON.stringify(fields.name)}) must match its directory name "${entry.name}". Fix it in coder/skills and re-vendor.`
      );
    }
    if (
      typeof fields.name === "string" &&
      (fields.name.length > 64 || !agentSkillNamePattern.test(fields.name))
    ) {
      addError(`${label} "name" must be 1-64 lowercase alphanumerics and single hyphens, not starting or ending with a hyphen.`);
    }
    if (typeof fields.description !== "string" || fields.description.length === 0 || fields.description.length > 1024) {
      addError(`${label} "description" must be 1-1024 characters.`);
    }
  }
}

async function validateAgentPlugin(pluginDir, pluginName, cursorManifest) {
  const manifestPath = path.join(pluginDir, "plugin.json");
  const manifest = await readJsonFile(manifestPath, `${pluginName} Agent Plugins manifest`);
  if (manifest) {
    if (!isPlainObject(manifest)) {
      addError(`${pluginName}: plugin.json must contain a JSON object.`);
    } else {
      validateAgentManifest(manifest, pluginName);
      for (const field of sharedManifestFields) {
        if (!isDeepEqual(manifest[field], cursorManifest[field])) {
          addError(
            `${pluginName}: "${field}" differs between plugin.json and .cursor-plugin/plugin.json. Keep them identical.`
          );
        }
      }
    }
  }

  const mcpPath = path.join(pluginDir, "mcp.json");
  if (await pathExists(mcpPath)) {
    const mcp = await readJsonFile(mcpPath, `${pluginName} MCP configuration`);
    if (mcp) {
      if (!isPlainObject(mcp)) {
        addError(`${pluginName}: mcp.json must contain a JSON object.`);
      } else {
        for (const key of Object.keys(mcp)) {
          if (key !== "$schema" && key !== "mcpServers") {
            addError(`${pluginName}: mcp.json has unknown top-level field "${key}".`);
          }
        }
        if (mcp.$schema !== AGENT_MCP_SCHEMA) {
          addError(`${pluginName}: mcp.json "$schema" must be "${AGENT_MCP_SCHEMA}".`);
        }
        if (!isPlainObject(mcp.mcpServers)) {
          addError(`${pluginName}: mcp.json "mcpServers" must be an object.`);
        } else {
          for (const [serverName, server] of Object.entries(mcp.mcpServers)) {
            validateAgentMcpServer(server, serverName, pluginName);
          }
        }
      }
    }
  }

  await validateAgentSkills(pluginDir, pluginName);
}

function resolveMarketplaceSource(source, pluginRoot) {
  if (typeof source !== "string" || source.length === 0) {
    return null;
  }
  if (!pluginRoot) {
    return source;
  }
  const normalizedRoot = pluginRoot.replace(/\\/g, "/").replace(/\/+$/, "");
  const normalizedSource = source.replace(/\\/g, "/");
  if (normalizedSource === normalizedRoot || normalizedSource.startsWith(`${normalizedRoot}/`)) {
    return normalizedSource;
  }
  return `${normalizedRoot}/${normalizedSource}`;
}

async function main() {
  const marketplacePath = path.join(repoRoot, ".cursor-plugin", "marketplace.json");
  const marketplace = await readJsonFile(marketplacePath, "Marketplace manifest");
  if (!marketplace) {
    summarizeAndExit();
    return;
  }

  if (typeof marketplace.name !== "string" || !marketplaceNamePattern.test(marketplace.name)) {
    addError(
      'Marketplace "name" must be lowercase kebab-case and start/end with an alphanumeric character.'
    );
  }

  if (!marketplace.owner || typeof marketplace.owner.name !== "string" || marketplace.owner.name.length === 0) {
    addError('Marketplace "owner.name" is required.');
  }

  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    addError('Marketplace "plugins" must be a non-empty array.');
    summarizeAndExit();
    return;
  }

  const pluginRoot = marketplace.metadata?.pluginRoot;
  if (pluginRoot !== undefined) {
    if (typeof pluginRoot !== "string" || !isSafeRelativePath(pluginRoot)) {
      addError('Marketplace "metadata.pluginRoot" must be a safe relative path.');
    } else {
      const pluginRootAbs = path.join(repoRoot, pluginRoot);
      await ensureDirectory(pluginRootAbs, 'Marketplace "metadata.pluginRoot"');
    }
  }

  const seenNames = new Set();
  for (const [index, entry] of marketplace.plugins.entries()) {
    const label = `plugins[${index}]`;

    if (!entry || typeof entry !== "object") {
      addError(`${label} must be an object.`);
      continue;
    }

    if (typeof entry.name !== "string" || !pluginNamePattern.test(entry.name)) {
      addError(`${label}.name must be lowercase and use only alphanumerics, hyphens, and periods.`);
      continue;
    }

    if (seenNames.has(entry.name)) {
      addError(`Duplicate plugin name in marketplace manifest: "${entry.name}"`);
    }
    seenNames.add(entry.name);

    const sourcePath = resolveMarketplaceSource(entry.source, pluginRoot ?? "");
    if (!sourcePath) {
      addError(`${label}.source must be a string path.`);
      continue;
    }
    if (!isSafeRelativePath(sourcePath)) {
      addError(`${label}.source is not a safe relative path: "${sourcePath}"`);
      continue;
    }

    const pluginDir = path.join(repoRoot, sourcePath);
    const pluginDirExists = await ensureDirectory(pluginDir, `${label}.source`);
    if (!pluginDirExists) {
      continue;
    }

    const manifestPath = path.join(pluginDir, ".cursor-plugin", "plugin.json");
    const pluginManifest = await readJsonFile(manifestPath, `${entry.name} plugin manifest`);
    if (!pluginManifest) {
      continue;
    }

    if (typeof pluginManifest.name !== "string" || !pluginNamePattern.test(pluginManifest.name)) {
      addError(
        `${entry.name}: "name" in plugin.json must be lowercase and use only alphanumerics, hyphens, and periods.`
      );
    }

    if (pluginManifest.name && pluginManifest.name !== entry.name) {
      addError(
        `${entry.name}: marketplace entry name does not match plugin.json name ("${pluginManifest.name}").`
      );
    }

    const manifestFields = ["logo", "rules", "skills", "agents", "commands", "hooks", "mcpServers"];
    for (const field of manifestFields) {
      const values = extractPathValues(pluginManifest[field]);
      for (const value of values) {
        await validateReferencedPath(pluginDir, field, value, entry.name);
      }
    }

    await validateComponentFrontmatter(pluginDir, entry.name);
    await validateAgentPlugin(pluginDir, entry.name, pluginManifest);

    const hooksPath = path.join(pluginDir, "hooks", "hooks.json");
    if (!(await pathExists(hooksPath))) {
      addWarning(`${entry.name}: no hooks/hooks.json file found (only needed when using hooks).`);
    }

    const mcpPath = path.join(pluginDir, "mcp.json");
    if (!pluginManifest.mcpServers && !(await pathExists(mcpPath))) {
      addWarning(`${entry.name}: no mcp.json file found (only needed when using MCP servers).`);
    }
  }

  summarizeAndExit();
}

function summarizeAndExit() {
  if (warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
    console.log("");
  }

  if (errors.length > 0) {
    console.error("Validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Validation passed.");
}

await main();
