/*
  services/differ.ts — Shape extractor and differ utility.

  Two responsibilities:
  1. extractShape()  — takes any JSON object and returns its structure (keys + types)
  2. diffShapes()    — compares two shapes and returns what changed

  This is the core logic of the drift detection system.
  The poller calls these functions on every poll cycle.
*/

// Represents a shape — keys mapped to either a type string or a nested shape
export type Shape = { [key: string]: string | Shape }

// Represents the diff result between two shapes
export type ShapeDiff = {
  added: string[]             // fields present in new shape but not old (for DRIFT)
  removed: string[]           // fields present in old shape but not new (for DRIFT)
  typeChanged: string[]       // fields present in both but with different types
  missingFromApi?: string[]   // declared in interface, missing from API (for CONTRACT_VIOLATION)
  unexpectedInApi?: string[]  // in API but not declared in interface (for CONTRACT_VIOLATION)
  typeMismatch?: string[]     // present in both but types don't match (for CONTRACT_VIOLATION)
}

/*
  extractShape — recursively walks a JSON object and replaces every value
  with its type name. Arrays are represented as the type of their first element.

  Example:
    { name: "Anusha", age: 30, address: { city: "Chennai" } }
    → { name: "string", age: "number", address: { city: "string" } }
*/
export function extractShape(obj: unknown, prefix = ''): Shape {
  // If the top-level response is an array, use the first element as a representative sample
  if (Array.isArray(obj)) {
    if (obj.length === 0) return {}
    return extractShape(obj[0], prefix)
  }

  if (typeof obj !== 'object' || obj === null) {
    return {}
  }

  const shape: Shape = {}

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (value === null) {
      shape[fullKey] = 'null'
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        shape[fullKey] = 'array'
      } else if (typeof value[0] === 'object' && value[0] !== null) {
        // Array of objects — extract shape of first element
        const nested = extractShape(value[0], fullKey)
        Object.assign(shape, nested)
      } else {
        shape[fullKey] = `array<${typeof value[0]}>`
      }
    } else if (typeof value === 'object') {
      // Nested object — recurse
      const nested = extractShape(value, fullKey)
      Object.assign(shape, nested)
    } else {
      shape[fullKey] = typeof value
    }
  }

  return shape
}

/*
  diffShapes — compares two flat shapes and returns what changed.
  Uses dot-notation keys so nested fields are compared correctly.

  Example:
    old: { name: "string", age: "number" }
    new: { name: "string", age: "string", email: "string" }
    → { added: ["email"], removed: [], typeChanged: ["age"] }
*/
export function diffShapes(oldShape: Shape, newShape: Shape): ShapeDiff {
  const oldKeys = new Set(Object.keys(oldShape))
  const newKeys = new Set(Object.keys(newShape))

  const added = [...newKeys].filter(k => !oldKeys.has(k))
  const removed = [...oldKeys].filter(k => !newKeys.has(k))
  const typeChanged = [...oldKeys].filter(k =>
    newKeys.has(k) &&
    JSON.stringify(oldShape[k]) !== JSON.stringify(newShape[k])
  )

  return { added, removed, typeChanged }
}

/*
  hasDrift — convenience helper that returns true if any drift diff was detected
*/
export function hasDrift(diff: ShapeDiff): boolean {
  return diff.added.length > 0 || diff.removed.length > 0 || diff.typeChanged.length > 0
}

/*
  diffContract — compares a parsed TS interface shape against the live API shape.
  Uses descriptive keys that make the violation immediately understandable.

  Example:
    interface: { id: "number", name: "string", ghost: "string" }
    api:       { id: "number", name: "string", email: "string" }
    → { missingFromApi: ["ghost"], unexpectedInApi: ["email"], typeMismatch: [] }
*/
export function diffContract(interfaceShape: Shape, apiShape: Shape): ShapeDiff {
  const interfaceKeys = new Set(Object.keys(interfaceShape))
  const apiKeys = new Set(Object.keys(apiShape))

  const missingFromApi = [...interfaceKeys].filter(k => !apiKeys.has(k))
  const unexpectedInApi = [...apiKeys].filter(k => !interfaceKeys.has(k))
  const typeMismatch = [...interfaceKeys].filter(k =>
    apiKeys.has(k) &&
    JSON.stringify(interfaceShape[k]) !== JSON.stringify(apiShape[k])
  )

  return {
    added: [],
    removed: [],
    typeChanged: [],
    missingFromApi,
    unexpectedInApi,
    typeMismatch
  }
}

/*
  hasContractViolation — returns true if any contract violation was detected
*/
export function hasContractViolation(diff: ShapeDiff): boolean {
  return (diff.missingFromApi?.length ?? 0) > 0 ||
    (diff.unexpectedInApi?.length ?? 0) > 0 ||
    (diff.typeMismatch?.length ?? 0) > 0
}
