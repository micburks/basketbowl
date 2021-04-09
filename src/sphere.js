import * as THREE from 'three';
import CANNON from 'cannon';
import { WorldObject } from './world.js';

export class Sphere extends WorldObject {
  constructor(radius, pos) {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshNormalMaterial(),
    );
    sphere.position.set(pos.x, pos.y, pos.z);
    const spherePhysics = new CANNON.Body({
      mass: 1,
      shape: new CANNON.Sphere(radius),
      velocity: randomFrom(new CANNON.Vec3(-1.5, 7, -10)),
    });
    spherePhysics.position.copy(sphere.position);
    super(sphere, spherePhysics);
    this.radius = radius;
  }
  shouldReset() {
    return this.physics.position.y < -20;
  }
  reset() {
    this.physics.position = new CANNON.Vec3(0, 0, 5);
    this.physics.velocity = randomFrom(new CANNON.Vec3(-1.5, 7, -10));
  }
}

function randomFrom(v) {
  let xRand = Math.random() * 3;
  let yRand = Math.random() * 3;
  let zRand = Math.random() * 3;
  v.x += xRand;
  v.y += yRand;
  v.z += zRand;
  return v;
}
