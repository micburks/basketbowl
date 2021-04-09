import * as THREE from 'three';
import { vec } from './math.js';

const DAMPING = 0.03;
const DRAG = 1 - DAMPING;
const restDistance = 0.5;
const GRAVITY = 9.82; // 981 * 1.4;
const TIMESTEP = 18 / 1000;
const TIMESTEP_SQ = TIMESTEP * TIMESTEP;

const diff = new THREE.Vector3();
const tmpForce = new THREE.Vector3();
const windForce = new THREE.Vector3(0, 0, 0);

const params = {
  enableWind: false,
  showBall: false,
};

export class Cloth {
  constructor(segments, mass, pos, size) {
    this.w = segments.x;
    this.h = segments.y;
    this.clothFunction = hoop(this.w, this.h);
    // this.clothFunction = hoop(restDistance * this.w, restDistance * this.h);
    this.mass = mass;
    this.particles = [];
    this.constraints = [];
    this.gravity = new THREE.Vector3(0, -GRAVITY, 0).multiplyScalar(this.mass);
    this.pins = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // Create particles (one extra column and one extra row)
    for (let v = 0; v <= this.h; v++) {
      for (let u = 0; u < this.w; u++) {
        this.particles.push(
          new ClothParticle(this, vec(u / (this.w - 1), v / this.h, 0)),
        );
      }
    }

    // Structural
    // Connect regular particles to adjacent right and down particles
    for (let v = 0; v < this.h; v++) {
      for (let u = 0; u < this.w; u++) {
        this.addConstraint((cloth) => {
          satisfyConstraint(
            cloth.particles[index(u, v, cloth.w)],
            cloth.particles[index(u, v + 1, cloth.w)],
            taper(restDistance, v),
          );
        });
        this.addConstraint((cloth) => {
          const isLast = u + 1 === cloth.w;
          satisfyConstraint(
            cloth.particles[index(u, v, cloth.w)],
            cloth.particles[index((u + 1) % cloth.w, v, cloth.w)],
            isLast ? 0.01 : taper(restDistance, v),
          );
        });
      }
    }
    // Connect extra column straight down
    /*
    for (let u = this.w, v = 0; v < this.h; v++) {
      this.addConstraint((cloth) => {
        satisfyConstraint(
          cloth.particles[index(u, v, cloth.w)],
          cloth.particles[index(u, v + 1, cloth.w)],
          taper(restDistance, v),
        );
      });
      // Experiment with connecting hoop
      this.addConstraint((cloth) => {
        satisfyConstraint(
          cloth.particles[index(u, v, cloth.w)],
          cloth.particles[index(0, v, cloth.w)],
          taper(restDistance, v),
        );
      });
    }
    */
    // Connect extra row straight across
    for (let v = this.h, u = 0; u < this.w; u++) {
      this.addConstraint((cloth) => {
        const isLast = u + 1 === cloth.w;
        satisfyConstraint(
          cloth.particles[index(u, v, cloth.w)],
          cloth.particles[index((u + 1) % cloth.w, v, cloth.w)],
          isLast ? 0.01 : taper(restDistance, v),
        );
      });
    }

    this.addConstraint((cloth) => {
      // Floor Constraints
      for (const particle of cloth.particles) {
        const pos = particle.position;
        if (pos.y < -250) {
          pos.y = -250;
        }
      }
    });

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
    this.geometry = new THREE.ParametricBufferGeometry(
      this.clothFunction,
      this.w - 1,
      this.h,
    );
    // cloth mesh
    this.mesh = new THREE.Mesh(this.geometry, clothMaterial);
    this.mesh.castShadow = true;
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

export function sphereConstraint(spheres) {
  return (cloth) => {
    // Ball Constraints
    for (const sphere of spheres) {
      const spherePosition = sphere.physics.position;
      for (const particle of cloth.particles) {
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
    cloth.clothFunction(pos.x, pos.y, this.position);
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

function hoop(width, height) {
  return function (u, v, target) {
    /*
    const x = (u - 0.5) * width;
    const y = (v + 0.5) * height;
    const z = 0;
    target.set(x, y, z);
    */
    const uMod = u - 0.5;
    const vMod = v + 0.5;
    target.set(
      Math.cos(uMod * 2 * Math.PI + (Math.PI / 2)),
      -vMod,
      Math.sin(uMod * 2 * Math.PI + (Math.PI / 2)),
    );
  };
}

function index(u, v, w) {
  // return u + v * (w + 1);
  return u + v * w;
}

function taper(val, quantity) {
  return val / (quantity / 8 + 1);
}

function satisfyConstraint(p1, p2, distance) {
  if (typeof p1 === 'undefined') {
    debugger;
  }
  if (typeof p2 === 'undefined') {
    debugger;
  }
  if (distance === 0) {
    p2.position.copy(p1.position);
    return;
  }
  diff.subVectors(p2.position, p1.position);
  const currentDist = diff.length();
  if (currentDist === 0) return; // prevents division by 0
  const correction = diff.multiplyScalar(1 - distance / currentDist);
  const correctionHalf = correction.multiplyScalar(0.5);
  p1.position.add(correctionHalf);
  p2.position.sub(correctionHalf);
}
