import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const packageJsonPath = fileURLToPath(new URL('../package.json', import.meta.url));
const { version } = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as { version: string };

export const MCP_SERVER_VERSION = version;

// The MCP server identifier, not the npm package name (package.json's `name`
// is `product-backend-e2e-openapi-mcp-server`) — this is the id .mcp.json's
// key registers it under, a protocol-level concern kept separate from the
// package's own name on purpose.
export const MCP_SERVER_NAME = 'befirst-openapi-schema-reader';

// Not a fallback default on purpose — an unset OPENAPI_URL should fail loudly
// at startup rather than silently point somewhere unexpected. Set via
// .mcp.json's own `env` (see repo root) rather than a .env file: it isn't a
// secret, and .mcp.json is already the config surface this server's caller
// (Claude Code) reads.
function requireOpenApiUrl(): string {
  const url = process.env.OPENAPI_URL;

  if (!url) {
    throw new Error('OPENAPI_URL is not set — configure it in .mcp.json under this server\'s "env"');
  }

  return url;
}

export const OPENAPI_URL = requireOpenApiUrl();
