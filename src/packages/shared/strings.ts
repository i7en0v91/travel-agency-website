export function clampTextLine (text: string, maxLength: number): string {
  maxLength = Math.max(1, maxLength);
  if (maxLength < 4) {
    return text.substring(0, maxLength);
  }
  if ((text?.length ?? 0) <= maxLength) {
    return text;
  }

  const partLength = Math.ceil(maxLength / 2);
  const startStr = `${text.substring(0, partLength)}`;
  const endStr = `${text.substring(text.length - partLength, text.length)}`;
  return `${startStr}...${endStr}`;
}

export function strToBool (value: string): boolean {
  const regex = /^\s*(true|1|on)\s*$/i;
  return regex.test(value);
}