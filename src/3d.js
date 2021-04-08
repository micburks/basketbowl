import * as THREE from "three";
import CANNON from "cannon";

export class World {
  constructor() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x444444);
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0); // m/s²

    this.scene = scene;
    this.world = world;
    this.objects = [];

    this.lastTime;
    this.fixedTimeStep = 1.0 / 60.0; // s
    this.maxSubSteps = 3;
  }
  add(object) {
    this.objects.push(object);
    this.scene.add(object.mesh);
    this.world.addBody(object.physics);
  }
  addGroup(objects) {
    const group = new THREE.Group();
    for (const object of objects) {
      this.objects.push(object);
      group.add(object.mesh);
      this.world.addBody(object.physics);
    }
    this.scene.add(group);
    return group;
  }
  update(time) {
    if (this.lastTime !== undefined) {
      let delta = (time - this.lastTime) / 1000;
      this.world.step(this.fixedTimeStep, delta, this.maxSubSteps);
      this.objects.forEach((obj) => obj.update());
    }
    this.lastTime = time;
  }
}

export class WorldObject {
  constructor(mesh, physics) {
    this.mesh = mesh;
    this.physics = physics;
  }
  update() {
    this.mesh.position.copy(this.physics.position);
    this.mesh.quaternion.copy(this.physics.quaternion);
  }
}

export class Sphere extends WorldObject {
  constructor(radius, pos) {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshNormalMaterial()
    );
    sphere.position.set(pos.x, pos.y, pos.z);
    const spherePhysics = new CANNON.Body({
      mass: 1,
      shape: new CANNON.Sphere(radius),
      velocity: new CANNON.Vec3(0, 7, -10),
    });
    spherePhysics.position.copy(sphere.position);
    super(sphere, spherePhysics);
  }
  shouldReset() {
    return this.physics.position.y < -20;
  }
  reset() {
    let xRand = Math.random() * 3;
    let yRand = Math.random() * 3;
    let zRand = Math.random() * 3;
    this.physics.position = new CANNON.Vec3(0, 0, 5);
    this.physics.velocity = new CANNON.Vec3(
      -1.5 + xRand,
      7 + yRand,
      -10 + zRand
    );
  }
}
