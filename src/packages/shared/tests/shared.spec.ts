import { expect, describe, test, type TestOptions } from 'vitest';
import { extractSurroundingText } from '../strings';

const TestTimeout = 300000;
const TestRunOptions: TestOptions = {
  timeout: TestTimeout,
  retry: 0,
  concurrent: false,
  sequential: true
};


describe('unit:shared', async () => {
  test(`extracting surrounding text`, TestRunOptions, async () => {
    let surrounding = extractSurroundingText('aBc DeF gHi', 'dEf', 4);
    expect(surrounding?.text).toEqual(' DeF');

    surrounding = extractSurroundingText('aBc DeF gHi', 'dEf', 7);
    expect(surrounding?.text).toEqual('c DeF g');

    surrounding = extractSurroundingText('aBc DeF', 'd', 10);
    expect(surrounding?.text).toEqual('aBc DeF');

    surrounding = extractSurroundingText('aBc DeF', 'aBc DeF', 10);
    expect(surrounding?.text).toEqual('aBc DeF');

    surrounding = extractSurroundingText('aBc DeF', 'a', 10);
    expect(surrounding?.text).toEqual('aBc DeF');

    surrounding = extractSurroundingText('aBc DeF', 'A', 4);
    expect(surrounding?.text).toEqual('aBc ');

    surrounding = extractSurroundingText('aBc DeF', 'e', 4);
    expect(surrounding?.text).toEqual(' DeF');

    surrounding = extractSurroundingText('aBc DeF', 'F', 5);
    expect(surrounding?.text).toEqual('c DeF');

    surrounding = extractSurroundingText('aBc DeF', 'aBc DeF', 7);
    expect(surrounding?.text).toEqual('aBc DeF');

    surrounding = extractSurroundingText('aBc DeF', 'aBc DeF', 6);
    expect(surrounding?.text).toBeUndefined();
  });  
});