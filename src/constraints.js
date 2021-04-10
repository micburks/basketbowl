import * as THREE from 'three';

const diff = new THREE.Vector3();
export function satisfyConstraint(p1, p2, distance) {
  if (typeof p1 === 'undefined') {
    debugger;
  }
  if (typeof p2 === 'undefined') {
    debugger;
  }
  diff.subVectors(p2.position, p1.position);
  const currentDist = diff.length();
  if (currentDist === 0) return; // prevents division by 0
  const correction = diff.multiplyScalar(1 - distance / currentDist);
  const correctionHalf = correction.multiplyScalar(0.5);
  p1.position.add(correctionHalf);
  p2.position.sub(correctionHalf);
}

export function sphereConstraint(spheres) {
  return (obj) => {
    for (const sphere of spheres) {
      const spherePosition = sphere.physics.position;
      for (const particle of obj.particles) {
        diff.subVectors(particle.position, spherePosition);
        if (diff.length() < sphere.radius) {
          // collided
          diff.normalize().multiplyScalar(sphere.radius);
          particle.position.copy(spherePosition).add(diff);
        }
      }
    }
  };
}

export function floorConstraint(y) {
  return (obj) => {
    for (const particle of obj.particles) {
      const pos = particle.position;
      if (pos.y < y) {
        pos.y = y;
      }
    }
  };
}
