/**
 * Sorts an array of objects by a string property using natural sort order.
 * Natural sort handles numbers within strings correctly (e.g., "10" comes after "2").
 *
 * @param array The array to sort
 * @param key The property name to sort by
 * @returns The sorted array
 */
export function naturalSort<T>(array: T[], key: keyof T): T[] {
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base'
  });

  return [...array].sort((a, b) => {
    const valA = String(a[key]);
    const valB = String(b[key]);
    return collator.compare(valA, valB);
  });
}
