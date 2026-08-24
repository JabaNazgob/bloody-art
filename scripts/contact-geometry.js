export function tokenCenter(token) {
  if (Number.isFinite(token?.center?.x) && Number.isFinite(token?.center?.y)) return { x: token.center.x, y: token.center.y };
  const gridSize = globalThis.canvas?.grid?.size ?? 100;
  const document = token?.document ?? {};
  return {
    x: Number(document.x ?? 0) + (Number(document.width ?? 1) * gridSize / 2),
    y: Number(document.y ?? 0) + (Number(document.height ?? 1) * gridSize / 2)
  };
}

export function tokenSize(token) {
  const gridSize = globalThis.canvas?.grid?.size ?? 100;
  return {
    width: Number(token?.w ?? ((token?.document?.width ?? 1) * gridSize)),
    height: Number(token?.h ?? ((token?.document?.height ?? 1) * gridSize))
  };
}

export function pointTowardAttacker(attacker, target, fraction) {
  const source = tokenCenter(attacker);
  const destination = tokenCenter(target);
  return {
    x: destination.x + ((source.x - destination.x) * fraction),
    y: destination.y + ((source.y - destination.y) * fraction)
  };
}

export function objectSurfacePoint(attacker, target) {
  const source = tokenCenter(attacker);
  const center = tokenCenter(target);
  const size = tokenSize(target);
  const dx = source.x - center.x;
  const dy = source.y - center.y;
  const scaleX = Math.abs(dx) > 0 ? (size.width / 2) / Math.abs(dx) : Infinity;
  const scaleY = Math.abs(dy) > 0 ? (size.height / 2) / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);
  if (!Number.isFinite(scale)) return center;
  return { x: center.x + (dx * scale), y: center.y + (dy * scale) };
}

export function legacyPerpendicularOffset(attacker, target, side = 1, gridFraction = 0.3) {
  const source = tokenCenter(attacker);
  const destination = tokenCenter(target);
  const gridSize = globalThis.canvas?.grid?.size ?? 100;
  const a = source.x - destination.x;
  const b = source.y - destination.y;
  const denominator = Math.abs(a) + Math.abs(b);
  if (!denominator) return { x: 0, y: gridSize * gridFraction * side };
  const coefficient = side / denominator;
  return {
    x: b * coefficient * gridFraction * gridSize,
    y: a * coefficient * -gridFraction * gridSize
  };
}

export function cleanMissDestination(attacker, target, side = 1) {
  const source = tokenCenter(attacker);
  const center = tokenCenter(target);
  const size = tokenSize(target);
  const dx = center.x - source.x;
  const dy = center.y - source.y;
  const length = Math.hypot(dx, dy) || 1;
  const radius = Math.max(size.width, size.height);
  return {
    x: center.x + ((dx / length) * radius * 0.35) + ((-dy / length) * radius * 0.65 * side),
    y: center.y + ((dy / length) * radius * 0.35) + ((dx / length) * radius * 0.65 * side)
  };
}
