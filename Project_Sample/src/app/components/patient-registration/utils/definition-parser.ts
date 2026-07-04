import { FormFieldControl } from '../models/index';

const ALLOWED_TYPES = new Set([
  'text', 'email', 'tel', 'date', 'number', 'select',
  'checkbox', 'radio', 'textarea', 'checkgroup'
]);

/**
 * Parse form definition from backend @JsonRawValue string.
 * Handles single and double-encoded JSON strings.
 * Throws if invalid.
 */
export function parseDefinition(raw: string | FormFieldControl[]): FormFieldControl[] {
  // Defensive: future backend could send array directly
  if (Array.isArray(raw)) {
    return raw;
  }

  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error('EMPTY_DEFINITION');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`MALFORMED_DEFINITION_JSON: ${(e as Error).message}`);
  }

  // Unwrap double-encoding if backend sends "\"[...]\"" (string containing JSON)
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch (e) {
      throw new Error(`DOUBLE_ENCODED_DEFINITION_INVALID: ${(e as Error).message}`);
    }
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`DEFINITION_NOT_ARRAY: got ${typeof parsed}`);
  }

  return parsed as FormFieldControl[];
}

/**
 * Validate parsed fields for consistency and required properties.
 * Throws if validation fails.
 */
export function validateFields(fields: FormFieldControl[], formKeyname: string): void {
  if (fields.length === 0) {
    throw new Error(`NO_FIELDS_IN_DEFINITION: ${formKeyname}`);
  }

  const names = new Set<string>();

  for (const f of fields) {
    // Required properties
    if (!f.name || typeof f.name !== 'string' || f.name.trim() === '') {
      throw new Error(`FIELD_MISSING_NAME: ${formKeyname}`);
    }
    if (!f.type || typeof f.type !== 'string') {
      throw new Error(`FIELD_MISSING_TYPE: field="${f.name}" in ${formKeyname}`);
    }

    // Type validation
    if (!ALLOWED_TYPES.has(f.type)) {
      throw new Error(`UNKNOWN_FIELD_TYPE: field="${f.name}" type="${f.type}"`);
    }

    // Duplicate check
    if (names.has(f.name)) {
      throw new Error(`DUPLICATE_FIELD_NAME: "${f.name}" in ${formKeyname}`);
    }
    names.add(f.name);

    // Types that require options
    if (['select', 'radio', 'checkgroup'].includes(f.type)) {
      if (!f.options || !Array.isArray(f.options) || f.options.length === 0) {
        throw new Error(`FIELD_MISSING_OPTIONS: field="${f.name}" (type=${f.type}) in ${formKeyname}`);
      }
    }
  }
}

/**
 * Parse and validate definition in one step.
 * Returns validated fields or throws error.
 */
export function parseAndValidateDefinition(
  raw: string | FormFieldControl[],
  formKeyname: string
): FormFieldControl[] {
  const fields = parseDefinition(raw);
  validateFields(fields, formKeyname);
  return fields;
}
