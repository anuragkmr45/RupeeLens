function parseVersionPart(part: string | undefined): number {
  if (!part) {
    return 0;
  }

  const match = part.match(/^(\d+)/);

  if (!match) {
    return 0;
  }

  return Number(match[1]);
}

export function compareVersionStrings(left: string, right: string): number {
  const leftParts = left.split('.');
  const rightParts = right.split('.');
  const totalParts = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < totalParts; index += 1) {
    const leftValue = parseVersionPart(leftParts[index]);
    const rightValue = parseVersionPart(rightParts[index]);

    if (leftValue > rightValue) {
      return 1;
    }

    if (leftValue < rightValue) {
      return -1;
    }
  }

  return 0;
}

export function isVersionAtLeast(candidate: string, minimum: string): boolean {
  return compareVersionStrings(candidate, minimum) >= 0;
}
