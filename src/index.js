import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import CANNON from 'cannon';
import { World, WorldObject, Sphere } from './3d.js';
import { vec, clamp } from './math.js';

const renderer = new THREE.WebGLRenderer();
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
const controls = new OrbitControls(camera, renderer.domElement);

window.addEventListener('resize', setWindowSize);
document.body.appendChild(renderer.domElement);

setWindowSize();
camera.position.set(10, 0, 0);
controls.update();

const world = new World();
const rimGroup = world.addGroup(getRim());
const ball = new Sphere(0.475, vec(0, 0, 5));
world.add(ball);

var clothMass = 1; // 1 kg in total
var clothSize = 1; // 1 meter
var Nx = 12;
var Ny = 12;
var mass = (clothMass / Nx) * Ny;
var restDistance = clothSize / Nx;
var ballSize = 0.1;
var clothFunction = plane(restDistance * Nx, restDistance * Ny);
function plane(width, height) {
  return function (u, v, target) {
    var x = (u - 0.5) * width;
    var y = (v + 0.5) * height;
    var z = 0;
    target.set(x, y, z);
  };
}

var clothMaterial = new CANNON.Material();
var sphereMaterial = new CANNON.Material();
var clothSphereContactMaterial = new CANNON.ContactMaterial(
  clothMaterial,
  sphereMaterial,
  0.0, // friction coefficient
  0.0 // restitution
);
// Adjust constraint equation parameters for ground/ground contact
clothSphereContactMaterial.contactEquationStiffness = 1e9;
clothSphereContactMaterial.contactEquationRelaxation = 3;
// Add contact material to the world
world.world.addContactMaterial(clothSphereContactMaterial);

const loader = new THREE.TextureLoader();
const clothTexture = loader.load('public/sunflower.jpg');
// clothTexture.wrapS = clothTexture.wrapT = THREE.RepeatWrapping;
clothTexture.anisotropy = 16;
var clothMaterial = new THREE.MeshPhongMaterial({
  alphaTest: 0.5,
  color: 0xffffff,
  specular: 0x333333,
  emissive: 0x222222,
  //shininess: 5,
  map: clothTexture,
  side: THREE.DoubleSide,
});
// cloth geometry
clothGeometry = new THREE.ParametricBufferGeometry(clothFunction, Nx, Ny);
// clothGeometry = new THREE.ParametricGeometry( clothFunction, Nx, Ny, true );
clothGeometry.dynamic = true;
clothGeometry.computeFaceNormals();
// cloth mesh
object = new THREE.Mesh(clothGeometry, clothMaterial);
object.position.set(0, 0, 0);
object.castShadow = true;
//object.receiveShadow = true;
world.scene.add(object);
object.customDepthMaterial = new THREE.MeshDepthMaterial({
  depthPacking: THREE.RGBADepthPacking,
  map: clothTexture,
  alphaTest: 0.5,
});

(function animate(time) {
  requestAnimationFrame(animate);

  clothGeometry.computeFaceNormals();
  clothGeometry.computeVertexNormals();
  clothGeometry.normalsNeedUpdate = true;
  clothGeometry.verticesNeedUpdate = true;

  renderer.render(world.scene, camera);
  if (ball.shouldReset()) {
    ball.reset(ball);
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
  const yAxis = new THREE.Vector3(0, 1, 0);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const width = 0.05;
    const height = 1.5;
    const depth = Math.sqrt(2); // .toPrecision(4);
    const step = i / n;
    const angle = 2 * Math.PI * step;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshNormalMaterial()
    );
    const x = Math.cos(angle) * 1.2;
    const y = -height / 2;
    const z = Math.sin(angle) * -1.2;
    mesh.position.set(x, y, z);

    const physics = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2)),
      position: mesh.position.clone(),
    });

    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(yAxis, angle);
    mesh.quaternion.copy(quaternion);
    physics.quaternion.copy(quaternion);

    objs.push(new WorldObject(mesh, physics));
  }

  {
    const angle = (3 * Math.PI) / 2;
    const width = 7.2;
    const height = 4.8;
    const depth = 0.125;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshNormalMaterial()
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
