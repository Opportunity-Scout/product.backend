import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { APIResponse, expect } from '@playwright/test';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';

// Ajv core has no built-in `format` keyword support (e.g. `uuid`,
// `date-time`) by design, to keep its bundle small — `ajv-formats` is the
// official companion package for it.
const ajv = addFormats(new Ajv());

function formatSchemaErrors(errors: ErrorObject[] | null | undefined, url: string): string {
  if (!errors || errors.length === 0) {
    return `Response body from ${url} did not match the expected schema`;
  }

  const details = errors.map((error) => `  - ${error.instancePath || '(root)'} ${error.message}`).join('\n');

  return `Response body from ${url} did not match the expected schema:\n${details}`;
}

export class ResponseContract {
  // The return type is inferred straight from `schema` — no hand-written
  // interface, no `as` cast at the call site. There is no way to obtain the
  // typed body without going through this validation — deliberate, so a
  // test can't accidentally read a field the contract never checked.
  // `T = FromSchema<S>` as a second, defaulted generic (rather than writing
  // `FromSchema<S>` directly in the return position) follows
  // json-schema-to-ts's own documented `Validator` pattern — writing it
  // inline hits TS's "type instantiation is excessively deep" limit once
  // `S` is an open generic instead of a concrete literal.
  async validate<S extends JSONSchema, T = FromSchema<S>>(
    response: APIResponse,
    status: number,
    schema: S,
  ): Promise<T> {
    const rawBody = await response.text();

    expect(
      response.status(),
      `Expected HTTP ${status} from ${response.url()}, got ${response.status()}: ${rawBody}`,
    ).toBe(status);

    const body: unknown = JSON.parse(rawBody);
    const validateAgainstSchema = ajv.compile(schema);
    const isValid = validateAgainstSchema(body);

    expect(isValid, formatSchemaErrors(validateAgainstSchema.errors, response.url())).toBe(true);

    return body as T;
  }
}

export const responseContract = new ResponseContract();
