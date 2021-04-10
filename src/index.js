import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import CANNON from 'cannon';
import { World, WorldObject } from './world.js';
import { Sphere } from './sphere.js';
import { Cloth } from './cloth.js';
import { vec, clamp } from './math.js';
import { floorConstraint, sphereConstraint } from './constraints.js';
import { hoopGeometry } from './geometries.js';

const renderer = new THREE.WebGLRenderer();
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
const controls = new OrbitControls(camera, renderer.domElement);

window.addEventListener('resize', setWindowSize);
document.body.appendChild(renderer.domElement);

setWindowSize();
camera.position.set(0, 0, 5);
controls.update();

const world = new World();

// eslint-disable-next-line no-unused-vars
const rimGroup = world.addGroup(getRim());

const maxBalls = 30;
const ball = new Sphere(0.475, vec(0, -2, 5));
const balls = [ball];
world.add(ball);

const cloth = new Cloth(hoopGeometry, 10, 4, 10);
cloth.loadTexture('public/circuit_pattern.png');
cloth.addConstraint(sphereConstraint(balls));
world.add(cloth);

(function animate(time) {
  requestAnimationFrame(animate);
  renderer.render(world.scene, camera);
  for (const ball of balls) {
    if (ball.shouldReset()) {
      ball.reset(ball);
    }
    spawnIfNeeded(world, balls, time);
  }
  world.update(time);
})();

function setWindowSize() {
  const width = clamp(window.innerWidth, { min: 700 });
  const height = clamp(window.innerHeight, { min: 500 });
  const aspect = width / height;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function getRim() {
  const objs = [];
  const xAxis = new THREE.Vector3(1, 0, 0);

  // Torus
  {
    const geometry = new THREE.TorusGeometry(1, 0.05, 16, 100);
    const material = new THREE.MeshNormalMaterial();
    const torus = new THREE.Mesh(geometry, material);
    torus.position.set(0, -0.45, 0);

    const torusPhysics = new CANNON.Body({
      mass: 0,
      shape: CANNON.Trimesh.createTorus(1, 0.05, 16, 100),
      position: torus.position.clone(),
    });

    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(xAxis, Math.PI / 2);
    torus.quaternion.copy(quaternion);
    torusPhysics.quaternion.copy(quaternion);

    objs.push(new WorldObject(torus, torusPhysics));
  }

  // Backboard
  {
    const width = 7.2;
    const height = 4.8;
    const depth = 0.125;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshNormalMaterial(),
    );
    const x = 0;
    const y = 1.2;
    const z = -1.5;
    mesh.position.set(x, y, z);

    const physics = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(width, height, depth)),
      position: mesh.position.clone(),
    });

    objs.push(new WorldObject(mesh, physics));
  }
  return objs;
}

let timeLastAdded = 0;
function spawnIfNeeded(world, balls, now) {
  if (balls.length > maxBalls) {
    return;
  }
  let shouldCreate = false;
  if (balls.length > 10) {
    if (now - timeLastAdded > 300) {
      shouldCreate = true;
    }
  }
  if (balls.length > 3) {
    if (now - timeLastAdded > 600) {
      shouldCreate = true;
    }
  }
  if (now - timeLastAdded > 1000) {
    shouldCreate = true;
  }
  if (shouldCreate) {
    const ball = new Sphere(0.475, vec(0, -2, 5));
    balls.push(ball);
    world.add(ball);
    timeLastAdded = now;
  }
}
