// Helper functions for path-based DOM node tracking
export function getNodePath(root: Node, target: Node): number[] | null {
  if (root === target) return [];
  for (let i = 0; i < root.childNodes.length; i++) {
    const path = getNodePath(root.childNodes[i], target);
    if (path) return [i, ...path];
  }
  return null;
}

export function getNodeByPath(root: Node, path: number[]): Node | null {
  let curr = root;
  for (const idx of path) {
    if (!curr.childNodes || idx >= curr.childNodes.length) return null;
    curr = curr.childNodes[idx];
  }
  return curr;
}
