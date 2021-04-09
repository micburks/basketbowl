import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Cloth } from '../cloth.js';

const segments = {
  x: 10,
  y: 10,
};
const ballPosition = new THREE.Vector3(0, -45, 0);
const ballSize = 60; //40
const MASS = 0.1;
const cloth = new Cloth(segments, MASS);

let container;
let camera, scene, renderer;
let sphere;

(function init() {
  container = document.createElement('div');
  document.body.appendChild(container);
  // scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcce0ff);
  scene.fog = new THREE.Fog(0xcce0ff, 500, 10000);
  // camera
  camera = new THREE.PerspectiveCamera(
    30,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.set(1000, 50, 1500);
  // lights
  scene.add(new THREE.AmbientLight(0x666666));
  const light = new THREE.DirectionalLight(0xdfebff, 1);
  light.position.set(50, 200, 100);
  light.position.multiplyScalar(1.3);
  light.castShadow = true;
  light.shadow.mapSize.width = 1024;
  light.shadow.mapSize.height = 1024;
  const d = 300;
  light.shadow.camera.left = -d;
  light.shadow.camera.right = d;
  light.shadow.camera.top = d;
  light.shadow.camera.bottom = -d;
  light.shadow.camera.far = 1000;
  scene.add(light);

  // cloth material
  cloth.loadTexture('public/circuit_pattern.png');
  scene.add(cloth.mesh);

  // sphere
  const ballGeo = new THREE.SphereGeometry(ballSize, 32, 16);
  const ballMaterial = new THREE.MeshLambertMaterial();
  sphere = new THREE.Mesh(ballGeo, ballMaterial);
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  sphere.visible = false;
  scene.add(sphere);

  // ground
  const loader = new THREE.TextureLoader();
  const groundTexture = loader.load('public/grasslight-big.jpg');
  groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(25, 25);
  groundTexture.anisotropy = 16;
  groundTexture.encoding = THREE.sRGBEncoding;
  const groundMaterial = new THREE.MeshLambertMaterial({ map: groundTexture });
  let mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(20000, 20000),
    groundMaterial
  );
  mesh.position.y = -250;
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // poles
  const poleGeo = new THREE.BoxGeometry(5, 375, 5);
  const poleMat = new THREE.MeshLambertMaterial();
  mesh = new THREE.Mesh(poleGeo, poleMat);
  mesh.position.x = -125;
  mesh.position.y = -62;
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  scene.add(mesh);

  mesh = new THREE.Mesh(poleGeo, poleMat);
  mesh.position.x = 125;
  mesh.position.y = -62;
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  scene.add(mesh);

  mesh = new THREE.Mesh(new THREE.BoxGeometry(255, 5, 5), poleMat);
  mesh.position.y = -250 + 750 / 2;
  mesh.position.x = 0;
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  scene.add(mesh);

  const gg = new THREE.BoxGeometry(10, 10, 10);
  mesh = new THREE.Mesh(gg, poleMat);
  mesh.position.y = -250;
  mesh.position.x = 125;
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  scene.add(mesh);

  mesh = new THREE.Mesh(gg, poleMat);
  mesh.position.y = -250;
  mesh.position.x = -125;
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  scene.add(mesh);

  // renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;

  // controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.5;
  controls.minDistance = 1000;
  controls.maxDistance = 5000;
})();

(function animate(now) {
  requestAnimationFrame(animate);
  cloth.update(now);
  sphere.position.copy(ballPosition);
  renderer.render(scene, camera);
})(0);
