/*
  utils/tsInterfaceParser.ts — Parses a TypeScript interface string into a flat shape map.

  Takes a raw TS interface pasted by the user and converts it into the same
  shape format that extractShape() produces — so we can compare them directly.

  Uses regex-based parsing. Handles primitive types (string, number, boolean).
  Does not handle generics, unions, or deeply nested interfaces — v1 simplification.

  Example input:
    interface User {
      id: number
      name: string
      email: string
      active: boolean
    }

  Example output:
    { id: "number", name: "string", email: "string", active: "boolean" }
*/

import { Shape } from '../services/differ'

export function parseTsInterface(raw: string): Shape {
  const shape: Shape = {}

  // Remove the interface name and outer braces
  const bodyMatch = raw.match(/\{([^}]*)\}/s)
  if (!bodyMatch) return shape

  const body = bodyMatch[1]

  // Match each field: fieldName: type (with optional ? for optional fields)
  const fieldRegex = /(\w+)\??:\s*([\w\[\]<>|]+)/g
  let match

  while ((match = fieldRegex.exec(body)) !== null) {
    const [, fieldName, fieldType] = match

    // Normalise array types — string[] or Array<string> → array<string>
    if (fieldType.endsWith('[]')) {
      const baseType = fieldType.slice(0, -2)
      shape[fieldName] = `array<${baseType}>`
    } else if (fieldType.startsWith('Array<')) {
      const baseType = fieldType.slice(6, -1)
      shape[fieldName] = `array<${baseType}>`
    } else {
      shape[fieldName] = fieldType
    }
  }

  return shape
}
