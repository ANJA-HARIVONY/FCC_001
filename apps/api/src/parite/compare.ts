/** Comparaison de listes Flask / Node. Même ordre et mêmes identifiants, sinon écart. */

export interface OrderedDiff {
  same: boolean;
  missing: string[];
  extra: string[];
}

export function diffOrdered(flask: readonly string[], node: readonly string[]): OrderedDiff {
  const flaskSet = new Set(flask);
  const nodeSet = new Set(node);
  return {
    same: flask.length === node.length && flask.every((value, index) => value === node[index]),
    missing: flask.filter((value) => !nodeSet.has(value)),
    extra: node.filter((value) => !flaskSet.has(value)),
  };
}
