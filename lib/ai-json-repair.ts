function stripCodeFence(input: string) {
  return input
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function firstCompleteJsonObject(input: string) {
  let depth = 0;
  let inString = false;
  let escaping = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (inString) {
      if (escaping) escaping = false;
      else if (character === "\\") escaping = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return input.slice(0, index + 1);
    }
  }
  return null;
}

function autoCloseJsonStructures(input: string): string | null {
  const start = input.indexOf("{");
  if (start < 0) return null;

  const source = input.slice(start);
  const stack: string[] = [];
  let output = "";
  let inString = false;
  let escaping = false;

  for (const character of source) {
    output += character;
    if (inString) {
      if (escaping) escaping = false;
      else if (character === "\\") escaping = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{") stack.push("}");
    else if (character === "[") stack.push("]");
    else if (character === "}" || character === "]") {
      if (stack.pop() !== character) return null;
    }
  }

  if (inString) {
    if (escaping && output.endsWith("\\")) output = output.slice(0, -1);
    output += '"';
  }

  output = output.trimEnd().replace(/,\s*$/u, "");
  if (/:\s*$/u.test(output)) output += "null";
  while (stack.length) output += stack.pop();
  return output.replace(/,\s*([}\]])/gu, "$1");
}

export function parseAiJsonObject(raw: string): {
  value: Record<string, unknown>;
  repaired: boolean;
} {
  const cleaned = stripCodeFence(raw);
  const start = cleaned.indexOf("{");
  if (start < 0) throw new SyntaxError("AI response does not contain a JSON object.");

  const source = cleaned.slice(start);
  try {
    const completeObject = firstCompleteJsonObject(source);
    return {
      value: JSON.parse(completeObject || source) as Record<string, unknown>,
      repaired: false,
    };
  } catch (strictError) {
    const repaired = autoCloseJsonStructures(source);
    if (!repaired) throw strictError;
    return { value: JSON.parse(repaired) as Record<string, unknown>, repaired: true };
  }
}
