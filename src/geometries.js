export function hoopGeometry(u, v, target) {
  const uMod = u - 0.5;
  const vMod = v + 0.5;
  const piOver2 = Math.PI / 2;
  const x = Math.cos(uMod * 2 * Math.PI + piOver2);
  const y = -vMod;
  const z = Math.sin(uMod * 2 * Math.PI + piOver2);
  target.set(x, y, z);
}

export function clothGeometry(width, height) {
  return function (u, v, target) {
    const x = (u - 0.5) * width;
    const y = (v + 0.5) * height;
    const z = 0;
    target.set(x, y, z);
  };
}
