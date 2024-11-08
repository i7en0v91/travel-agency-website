import toLower from 'lodash-es/toLower';
import replace from 'lodash-es/replace';

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

export function testHeaderValue (header: string, testValue: string) : boolean {
  const normalizeValue = (v: string) => toLower(replace(v, /\s/g, ''));
  return normalizeValue(header) === normalizeValue(testValue);
}

export function extractSurroundingText(fullText: string, phrase: string, maxLength: number): { text: string, phraseIdx: number } | undefined {
  if(!fullText.trim().length || !phrase.trim().length || maxLength <= 3) {
    return;
  }

  const resultTextSize = Math.min(maxLength, fullText.length);
  if(resultTextSize < phrase.length) {
    return;
  }

  // TODO: optimize & avoid frequent lowercasing
  const phraseIdx = fullText.toLowerCase().indexOf(phrase.toLowerCase());
  if(phraseIdx < 0) {
    return;
  }

  if(fullText.length <= resultTextSize) {
    return { text: fullText, phraseIdx };
  }

  const surroundingSize = Math.ceil((resultTextSize - phrase.length) / 2);
  let fromIdx = Math.max(phraseIdx - surroundingSize, 0);
  let toIdx = fromIdx + resultTextSize;
  if(toIdx > fullText.length) {
    toIdx = fullText.length;
    fromIdx = toIdx - resultTextSize;
  }

  const resultText = fullText.substring(fromIdx, toIdx);

  return { text: resultText, phraseIdx: phraseIdx - fromIdx };
}