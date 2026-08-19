import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION, OPENAPI_URL } from './config.js';

let cachedSpec: Record<string, unknown> | undefined;

async function loadSpec(): Promise<Record<string, unknown>> {
  if (!cachedSpec) {
    const response = await fetch(OPENAPI_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAPI spec from ${OPENAPI_URL}: ${response.status} ${response.statusText}`);
    }

    cachedSpec = (await response.json()) as Record<string, unknown>;
  }

  return cachedSpec;
}

// Resolves "#/a/b/c"-style $ref pointers against the full spec document.
// seen guards against a $ref cycle by leaving the pointer unresolved instead
// of recursing forever — none of our current DTOs are self-referential, but a
// future one might be.
function resolveRefs(node: unknown, spec: Record<string, unknown>, seen: ReadonlySet<string> = new Set()): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => resolveRefs(item, spec, seen));
  }

  if (node && typeof node === 'object') {
    const ref = (node as Record<string, unknown>).$ref;

    if (typeof ref === 'string') {
      if (seen.has(ref)) {
        return { $ref: ref };
      }

      const target = ref
        .replace(/^#\//, '')
        .split('/')
        .reduce<unknown>((current, segment) => (current as Record<string, unknown> | undefined)?.[segment], spec);

      if (target === undefined) {
        throw new Error(`Could not resolve $ref ${ref}`);
      }

      return resolveRefs(target, spec, new Set(seen).add(ref));
    }

    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      resolved[key] = resolveRefs(value, spec, seen);
    }

    return resolved;
  }

  return node;
}

// Converts OpenAPI 3's `nullable: true` into standard JSON Schema
// (`type: [X, 'null']`) and drops the `nullable` keyword — Ajv doesn't
// understand `nullable`, it just silently ignores it, so a nullable field
// (e.g. User.telegramUsername) would otherwise fail validation the moment
// a real `null` value showed up.
function convertOpenApiNullable(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => convertOpenApiNullable(item));
  }

  if (node && typeof node === 'object') {
    const original = node as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(original)) {
      if (key === 'nullable') {
        continue;
      }

      result[key] = convertOpenApiNullable(value);
    }

    if (original.nullable === true) {
      // Flat `type: string` is the common case (a plain object/string/number
      // schema) — fold `null` straight into it. Anything without a flat
      // `type` (oneOf/allOf/a $ref resolved into something composite) can't
      // be folded that way, so wrap the whole (already-converted) schema in
      // `anyOf` with a `{ type: 'null' }` branch instead — still standard
      // JSON Schema, still lets Ajv accept a real `null`.
      if (typeof result.type === 'string') {
        result.type = [result.type, 'null'];
      } else {
        return { anyOf: [result, { type: 'null' }] };
      }
    }

    return result;
  }

  return node;
}

// Recursively sets `additionalProperties: false` on every object schema node
// (any node declaring `properties`) that doesn't already specify it, so a
// schema pulled through this tool fails a test the moment the live response
// gains a field the schema doesn't know about — a deliberate tightening
// beyond what NestJS Swagger emits by default, applied once here rather than
// by hand in every schemas/*.ts file.
function withStrictObjects(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => withStrictObjects(item));
  }

  if (node && typeof node === 'object') {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      result[key] = withStrictObjects(value);
    }

    if ('properties' in result && !('additionalProperties' in result)) {
      result.additionalProperties = false;
    }

    return result;
  }

  return node;
}

const server = new McpServer({ name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION });

server.registerTool(
  'list_operations',
  {
    title: 'List OpenAPI operations',
    description: 'Lists every path + HTTP method + operationId + summary in the live BeFirst OpenAPI spec.',
    inputSchema: {},
  },
  async () => {
    const spec = await loadSpec();
    const paths = (spec.paths ?? {}) as Record<string, Record<string, Record<string, unknown>>>;
    const operations: Array<{ method: string; path: string; operationId?: unknown; summary?: unknown }> = [];

    for (const [path, methods] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        operations.push({
          method: method.toUpperCase(),
          path,
          operationId: operation.operationId,
          summary: operation.summary,
        });
      }
    }

    return { content: [{ type: 'text', text: JSON.stringify(operations, null, 2) }] };
  },
);

server.registerTool(
  'get_response_schema',
  {
    title: 'Get a dereferenced response schema',
    description:
      'Returns the fully dereferenced JSON Schema for one response of one operation in the live BeFirst OpenAPI spec, identified by path + method + status code.',
    inputSchema: {
      path: z.string().describe('The OpenAPI path, e.g. /auth/telegram'),
      method: z.string().describe('The HTTP method, e.g. post'),
      status: z.string().describe('The response status code as it appears in the spec, e.g. "200"'),
    },
  },
  async ({ path, method, status }) => {
    const spec = await loadSpec();
    const paths = (spec.paths ?? {}) as Record<string, Record<string, Record<string, unknown>>>;
    const operation = paths[path]?.[method.toLowerCase()];

    if (!operation) {
      throw new Error(`No operation found for ${method.toUpperCase()} ${path}`);
    }

    const responses = operation.responses as Record<string, Record<string, unknown>> | undefined;
    const response = responses?.[status];

    if (!response) {
      throw new Error(`No response ${status} documented for ${method.toUpperCase()} ${path}`);
    }

    const content = response.content as Record<string, Record<string, unknown>> | undefined;
    const schema = content?.['application/json']?.schema;

    if (!schema) {
      throw new Error(`Response ${status} for ${method.toUpperCase()} ${path} has no application/json schema`);
    }

    const resolved = withStrictObjects(convertOpenApiNullable(resolveRefs(schema, spec)));

    return { content: [{ type: 'text', text: JSON.stringify(resolved, null, 2) }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
