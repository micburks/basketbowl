import * as THREE from 'three';
import CANNON from 'cannon';

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
    if (object.mesh) {
      this.scene.add(object.mesh);
    }
    if (object.physics) {
      this.world.addBody(object.physics);
    }
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
      this.objects.forEach((obj) => obj.update(time));
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
