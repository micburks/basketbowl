export function clamp(x, { min = -Infinity, max = Infinity }) {
  if (x <= min) {
    return min;
  } else if (x >= max) {
    return max;
  } else {
    return x;
  }
}

export function vec(x, y, z) {
  return { x, y, z };
}
