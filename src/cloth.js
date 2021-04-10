import * as THREE from 'three';
import { vec } from './math.js';
import { satisfyConstraint } from './constraints.js';

const DAMPING = 0.03;
const DRAG = 1 - DAMPING;
const restDistance = 0.5;
const GRAVITY = 9.82;
const TIMESTEP = 18 / 1000;
const TIMESTEP_SQ = TIMESTEP * TIMESTEP;

const tmpForce = new THREE.Vector3();
const windForce = new THREE.Vector3(0, 0, 0);

const params = {
  enableWind: false,
  showBall: false,
};

export class Cloth {
  constructor(fn, width, height, mass) {
    this.w = width;
    this.h = height;
    this.fn = fn;
    this.mass = mass;
    this.particles = [];
    this.constraints = [];
    this.gravity = new THREE.Vector3(0, -GRAVITY, 0).multiplyScalar(this.mass);
    this.pins = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    // Create particles (one extra column and one extra row)
    for (let v = 0; v < this.h; v++) {
      for (let u = 0; u < this.w; u++) {
        this.particles.push(
          new ClothParticle(this, vec(u / (this.w - 1), v / this.h, 0)),
        );
      }
    }

    // Structural
    // Connect particles to adjacent right and down particles
    for (let v = 0; v < this.h; v++) {
      for (let u = 0; u < this.w; u++) {
        const isLastCol = u + 1 === this.w;
        const isLastRow = v + 1 === this.h;
        if (!isLastRow) {
          this.addConstraint((cloth) => {
            satisfyConstraint(
              cloth.particles[index(u, v, cloth.w)],
              cloth.particles[index(u, v + 1, cloth.w)],
              taper(restDistance, v),
            );
          });
        }
        this.addConstraint((cloth) => {
          satisfyConstraint(
            cloth.particles[index(u, v, cloth.w)],
            cloth.particles[index((u + 1) % cloth.w, v, cloth.w)],
            isLastCol ? 0 : taper(restDistance, v),
          );
        });
      }
    }

    this.addConstraint((cloth) => {
      // Pin Constraints
      for (const pinXY of cloth.pins) {
        const p = cloth.particles[pinXY];
        p.position.copy(p.original);
        p.previous.copy(p.original);
      }
    });

    this.mesh = null;
    this.phsics = null;
  }
  loadTexture(path) {
    /*
    const loader = new THREE.TextureLoader();
    const clothTexture = loader.load(path);
    */
    // clothTexture.anisotropy = 16;
    const clothMaterial = new THREE.MeshNormalMaterial({
      // map: clothTexture,
      side: THREE.DoubleSide,
      alphaTest: 0.5,
    });
    // cloth geometry
    this.geometry = new THREE.ParametricGeometry(this.fn, this.w - 1, this.h - 1);
    // cloth mesh
    this.mesh = new THREE.Mesh(this.geometry, clothMaterial);
    // this.mesh.castShadow = true;
    /*
    this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map: clothTexture,
      alphaTest: 0.5,
    });
    */
  }
  setPosition({ x, y, z }) {
    this.mesh.position.set(x, y, z);
  }
  update(now) {
    const windStrength = Math.cos(now / 7000) * 20 + 40;
    windForce.set(
      Math.sin(now / 2000),
      Math.cos(now / 3000),
      Math.sin(now / 1000),
    );
    windForce.normalize();
    windForce.multiplyScalar(windStrength);

    // Aerodynamics forces
    if (params.enableWind) {
      let indx;
      const normal = new THREE.Vector3();
      const indices = this.geometry.index;
      const normals = this.geometry.attributes.normal;

      for (let i = 0, il = indices.count; i < il; i += 3) {
        for (let j = 0; j < 3; j++) {
          indx = indices.getX(i + j);
          normal.fromBufferAttribute(normals, indx);
          tmpForce
            .copy(normal)
            .normalize()
            .multiplyScalar(normal.dot(windForce));
          this.particles[indx].addForce(tmpForce);
        }
      }
    }

    for (const particle of this.particles) {
      particle.addForce(this.gravity);
      particle.integrate(TIMESTEP_SQ);
    }

    // Start Constraints
    for (const constraint of this.constraints) {
      constraint(this);
    }

    // Render
    for (let i = 0; i < this.particles.length; i++) {
      const v = this.particles[i].position;
      this.geometry.attributes.position.setXYZ(i, v.x, v.y, v.z);
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
  addConstraint(fn) {
    this.constraints.push(fn);
  }
}

class ClothParticle {
  constructor(cloth, pos) {
    // pos = % of width/height of cloth plane
    this.a = new THREE.Vector3(0, 0, 0); // acceleration
    this.invMass = 1 / cloth.mass;
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();

    this.position = new THREE.Vector3();
    this.previous = new THREE.Vector3();
    this.original = new THREE.Vector3();

    // clothFunction creates position from pos so that pos is on a face
    cloth.fn(pos.x, pos.y, this.position);
    this.previous.copy(this.position);
    this.original.copy(this.position);
  }
  addForce(force) {
    // Force -> Acceleration
    this.a.add(this.tmp2.copy(force).multiplyScalar(this.invMass));
  }
  integrate(timesq) {
    // Performs Verlet integration
    const newPos = this.tmp.subVectors(this.position, this.previous);
    newPos.multiplyScalar(DRAG).add(this.position);
    newPos.add(this.a.multiplyScalar(timesq));
    this.tmp = this.previous;
    this.previous = this.position;
    this.position = newPos;
    this.a.set(0, 0, 0);
  }
}

function index(u, v, w) {
  return u + v * w;
}

function taper(val, quantity) {
  return val / (quantity / 8 + 1);
}
