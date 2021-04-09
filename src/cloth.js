import * as THREE from 'three';
import { vec } from './math.js';

const DAMPING = 0.03;
const DRAG = 1 - DAMPING;
const restDistance = 25;

const MASS = 0.1;
const windForce = new THREE.Vector3(0, 0, 0);
const tmpForce = new THREE.Vector3();
const GRAVITY = 981 * 1.4;
const gravity = new THREE.Vector3(0, -GRAVITY, 0).multiplyScalar(MASS);
const TIMESTEP = 18 / 1000;
const TIMESTEP_SQ = TIMESTEP * TIMESTEP;
const diff = new THREE.Vector3();

const params = {
  enableWind: true,
  showBall: false,
};

export class Cloth {
  constructor(segments, mass) {
    this.w = segments.x || 10;
    this.h = segments.y || 10;
    this.clothFunction = plane(restDistance * this.w, restDistance * this.h);
    this.mass = mass;
    this.particles = [];
    this.constraints = [];

    // Create particles
    for (let v = 0; v <= this.h; v++) {
      for (let u = 0; u <= this.w; u++) {
        this.particles.push(
          new ClothParticle(this, vec(u / this.w, v / this.h, 0))
        );
      }
    }

    // Structural
    for (let v = 0; v < this.h; v++) {
      for (let u = 0; u < this.w; u++) {
        this.constraints.push([
          this.particles[index(u, v, this.w)],
          this.particles[index(u, v + 1, this.w)],
          restDistance,
        ]);
        this.constraints.push([
          this.particles[index(u, v, this.w)],
          this.particles[index(u + 1, v, this.w)],
          restDistance,
        ]);
      }
    }
    for (let u = this.w, v = 0; v < this.h; v++) {
      this.constraints.push([
        this.particles[index(u, v, this.w)],
        this.particles[index(u, v + 1, this.w)],
        restDistance,
      ]);
    }
    for (let v = this.h, u = 0; u < this.w; u++) {
      this.constraints.push([
        this.particles[index(u, v, this.w)],
        this.particles[index(u + 1, v, this.w)],
        restDistance,
      ]);
    }

    this.pinsFormation = [
      [6],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      [0],
      [], // cut the rope
      [0, this.w], // classic 2 pins
    ];
    this.pins = this.pinsFormation[1];

    this.mesh = null;
    this.phsics = null;
  }
  togglePins() {
    this.pins = this.pinsFormation[
      ~~(Math.random() * this.pinsFormation.length)
    ];
  }
  loadTexture(path) {
    const loader = new THREE.TextureLoader();
    const clothTexture = loader.load(path);
    clothTexture.anisotropy = 16;
    const clothMaterial = new THREE.MeshLambertMaterial({
      map: clothTexture,
      side: THREE.DoubleSide,
      alphaTest: 0.5,
    });
    // cloth geometry
    this.geometry = new THREE.ParametricBufferGeometry(
      this.clothFunction,
      this.w,
      this.h
    );
    // cloth mesh
    this.mesh = new THREE.Mesh(this.geometry, clothMaterial);
    this.mesh.position.set(0, 0, 0);
    this.mesh.castShadow = true;
    this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map: clothTexture,
      alphaTest: 0.5,
    });
  }
  update(now) {
    const windStrength = Math.cos(now / 7000) * 20 + 40;
    windForce.set(
      Math.sin(now / 2000),
      Math.cos(now / 3000),
      Math.sin(now / 1000)
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
      particle.addForce(gravity);
      particle.integrate(TIMESTEP_SQ);
    }

    // Start Constraints
    for (const constraint of this.constraints) {
      satisfyConstraints(constraint[0], constraint[1], constraint[2]);
    }

    // Ball Constraints
    /*
    ballPosition.z = -Math.sin(now / 600) * 90; //+ 40;
    ballPosition.x = Math.cos(now / 400) * 70;
    if (params.showBall) {
      sphere.visible = true;
      for (let i = 0, il = particles.length; i < il; i++) {
        const particle = particles[i];
        const pos = particle.position;
        diff.subVectors(pos, ballPosition);
        if (diff.length() < ballSize) {
          // collided
          diff.normalize().multiplyScalar(ballSize);
          pos.copy(ballPosition).add(diff);
        }
      }
    } else {
      sphere.visible = false;
    }
    */

    // Floor Constraints
    for (const particle of this.particles) {
      const pos = particle.position;
      if (pos.y < -250) {
        pos.y = -250;
      }
    }

    // Pin Constraints
    for (const pinXY of this.pins) {
      const p = this.particles[pinXY];
      p.position.copy(p.original);
      p.previous.copy(p.original);
    }

    // render
    for (let i = 0; i < this.particles.length; i++) {
      const v = this.particles[i].position;
      this.geometry.attributes.position.setXYZ(i, v.x, v.y, v.z);
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}

class ClothParticle {
  constructor(cloth, pos) {
    this.position = new THREE.Vector3();
    this.previous = new THREE.Vector3();
    this.original = new THREE.Vector3();
    this.a = new THREE.Vector3(0, 0, 0); // acceleration
    this.invMass = 1 / cloth.mass;
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();

    cloth.clothFunction(pos.x, pos.y, this.position);
    cloth.clothFunction(pos.x, pos.y, this.previous);
    cloth.clothFunction(pos.x, pos.y, this.original);
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

function plane(width, height) {
  return function (u, v, target) {
    const x = (u - 0.5) * width;
    const y = (v + 0.5) * height;
    const z = 0;
    target.set(x, y, z);
  };
}

function index(u, v, w) {
  return u + v * (w + 1);
}

function satisfyConstraints(p1, p2, distance) {
  diff.subVectors(p2.position, p1.position);
  const currentDist = diff.length();
  if (currentDist === 0) return; // prevents division by 0
  const correction = diff.multiplyScalar(1 - distance / currentDist);
  const correctionHalf = correction.multiplyScalar(0.5);
  p1.position.add(correctionHalf);
  p2.position.sub(correctionHalf);
}
