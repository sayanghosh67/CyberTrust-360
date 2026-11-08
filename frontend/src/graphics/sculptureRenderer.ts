/** Small, dependency-free WebGL renderer for the site's decorative sculptures. */
type Vec3 = [number, number, number];
type Geometry = { positions: number[]; normals: number[] };
type Mesh = { position: WebGLBuffer; normal: WebGLBuffer; count: number; lines: boolean };
export type SceneVariant = 'hero' | 'helix' | 'network' | 'vault' | 'signal';

const normalize = (v: Vec3): Vec3 => {
  const length = Math.hypot(...v) || 1;
  return v.map(n => n / length) as Vec3;
};
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const modelMatrix = (x: number, y: number, z: number, rx: number, ry: number, rz: number, s: number) => {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  const a = new Float32Array([cy * cz, cy * sz, -sy, 0, sx * sy * cz - cx * sz, sx * sy * sz + cx * cz, sx * cy, 0, cx * sy * cz + sx * sz, cx * sy * sz - sx * cz, cx * cy, 0, x, y, z, 1]);
  for (let i = 0; i < 12; i++) a[i] *= s;
  return a;
};

function surface(fn: (u: number, v: number) => Vec3, nu = 100, nv = 20): Geometry {
  const positions: number[] = [], normals: number[] = [];
  const vertex = (u: number, v: number) => {
    const p = fn(u, v);
    const n = normalize(cross(sub(fn(u + .0001, v), fn(u - .0001, v)), sub(fn(u, v + .0001), fn(u, v - .0001))));
    positions.push(...p); normals.push(...n);
  };
  for (let u = 0; u < nu; u++) for (let v = 0; v < nv; v++) {
    const a = u / nu, b = v / nv, c = (u + 1) / nu, d = (v + 1) / nv;
    vertex(a, b); vertex(c, b); vertex(a, d);
    vertex(a, d); vertex(c, b); vertex(c, d);
  }
  return { positions, normals };
}
function wireSurface(fn: (u: number, v: number) => Vec3, nu = 48, nv = 16): Geometry {
  const positions: number[] = [], normals: number[] = [];
  const edge = (a: Vec3, b: Vec3) => { positions.push(...a, ...b); normals.push(...normalize(a), ...normalize(b)); };
  for (let u = 0; u < nu; u++) for (let v = 0; v < nv; v++) {
    edge(fn(u / nu, v / nv), fn((u + 1) / nu, v / nv));
    edge(fn(u / nu, v / nv), fn(u / nu, (v + 1) / nv));
  }
  return { positions, normals };
}
const torus = (radius: number, tube: number) => (u: number, v: number): Vec3 => {
  const a = u * Math.PI * 2, b = v * Math.PI * 2;
  return [(radius + tube * Math.cos(b)) * Math.cos(a), (radius + tube * Math.cos(b)) * Math.sin(a), tube * Math.sin(b)];
};
const knot = (u: number, v: number): Vec3 => {
  const center = (a: number): Vec3 => [Math.sin(a) + 2 * Math.sin(2 * a), Math.cos(a) - 2 * Math.cos(2 * a), -Math.sin(3 * a)];
  const a = u * Math.PI * 2, b = v * Math.PI * 2;
  const p = center(a), tangent = normalize(sub(center(a + .001), center(a - .001)));
  const n = normalize(cross(tangent, [0, 0, 1])), bitangent = cross(tangent, n);
  return p.map((x, i) => x * .53 + .29 * (n[i] * Math.cos(b) + bitangent[i] * Math.sin(b))) as Vec3;
};
const sphere = (u: number, v: number): Vec3 => [Math.cos(u * Math.PI * 2) * Math.sin(v * Math.PI), Math.cos(v * Math.PI), Math.sin(u * Math.PI * 2) * Math.sin(v * Math.PI)];
function polyhedron(cube = false): Geometry {
  const positions: number[] = [], normals: number[] = [];
  const vertices: Vec3[] = cube ? [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]] : [[1,0,0],[-1,0,0],[0,1.35,0],[0,-1.35,0],[0,0,1],[0,0,-1]];
  const faces = cube ? [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[3,7,6],[3,6,2],[0,4,7],[0,7,3],[1,2,6],[1,6,5]] : [[0,2,4],[4,2,1],[1,2,5],[5,2,0],[0,4,3],[4,1,3],[1,5,3],[5,0,3]];
  for (const [a,b,c] of faces) {
    const n = normalize(cross(sub(vertices[b], vertices[a]), sub(vertices[c], vertices[a])));
    for (const i of [a,b,c]) { positions.push(...vertices[i]); normals.push(...n); }
  }
  return { positions, normals };
}

const vertexShader = `
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uModel;
uniform mat4 uProjection;
varying vec3 vPosition;
varying vec3 vNormal;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vPosition = world.xyz;
  vNormal = normalize(mat3(uModel) * aNormal);
  gl_Position = uProjection * vec4(world.xyz - vec3(0.0, 0.0, 8.5), 1.0);
}`;
const fragmentShader = `
precision highp float;
varying vec3 vPosition;
varying vec3 vNormal;
uniform vec3 uColor;
uniform float uMetal;
uniform float uEmission;
uniform float uOpacity;
void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vec3(0.0, 0.0, 8.5) - vPosition);
  if (!gl_FrontFacing) N = -N;
  vec3 R = reflect(-V, N);
  float fresnel = pow(1.0 - max(dot(N,V), 0.0), 3.0);
  // Large studio softboxes reflected in the metal, plus a cool rim light.
  float strip = pow(max(0.0, dot(R, normalize(vec3(-1.0, 1.6, 1.5)))), 24.0);
  float softbox = pow(max(0.0, dot(R, normalize(vec3(1.0, 0.6, 1.0)))), 60.0);
  float rim = pow(max(0.0, dot(R, normalize(vec3(0.4, -1.0, 0.2)))), 13.0);
  float light = max(0.0, dot(N, normalize(vec3(-1.5, 2.5, 3.0))));
  vec3 environment = vec3(.008,.015,.012) + vec3(.56,.68,.61) * strip * 2.5 + vec3(.85,.95,.8) * softbox * 3.5 + vec3(.23,.48,.51) * rim;
  vec3 color = mix(uColor * (.14 + light * .62), environment * (.4 + uColor * .8), uMetal);
  color += fresnel * vec3(.28,.4,.29) * .7;
  color += uColor * uEmission;
  color = color / (color + vec3(.7));
  color = pow(color, vec3(.4545));
  gl_FragColor = vec4(color, uOpacity);
}`;

export function createSculptureRenderer(canvas: HTMLCanvasElement, variant: SceneVariant) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const shader = (type: number, source: string) => {
    const result = gl.createShader(type)!; gl.shaderSource(result, source); gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) { gl.deleteShader(result); throw new Error('Sculpture shader could not compile.'); }
    return result;
  };
  const vs = shader(gl.VERTEX_SHADER, vertexShader), fs = shader(gl.FRAGMENT_SHADER, fragmentShader);
  const program = gl.createProgram()!; gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteShader(vs); gl.deleteShader(fs); gl.deleteProgram(program); return null; }
  gl.useProgram(program);
  const attributes = { position: gl.getAttribLocation(program, 'aPosition'), normal: gl.getAttribLocation(program, 'aNormal') };
  const uniforms = Object.fromEntries(['Model','Projection','Color','Metal','Emission','Opacity'].map(name => [name, gl.getUniformLocation(program, `u${name}`)]));
  const meshes: Mesh[] = [];
  const mesh = (geometry: Geometry, lines = false): Mesh => {
    const buffer = (data: number[]) => { const b = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); return b; };
    const m = { position: buffer(geometry.positions), normal: buffer(geometry.normals), count: geometry.positions.length / 3, lines };
    meshes.push(m); return m;
  };
  const ring = mesh(surface(torus(1.65, .13), 100, 16));
  const thinRing = mesh(surface(torus(1.9, .018), 100, 8));
  const gem = mesh(polyhedron());
  const box = mesh(polyhedron(true));
  const ball = mesh(surface(sphere, 32, 20));
  const wire = mesh(wireSurface(sphere, 40, 20), true);
  const trefoil = variant === 'hero' || variant === 'signal' ? mesh(surface(knot, 180, 24)) : null;
  const rod = variant === 'helix' ? mesh(surface((u,v) => [Math.cos(v*Math.PI*2)*.038,(u-.5)*2,Math.sin(v*Math.PI*2)*.038],2,12)) : null;
  const helix = variant === 'helix' ? mesh(surface((u,v) => {
    const a = u * Math.PI * 5, b = v * Math.PI * 2;
    const center: Vec3 = [Math.cos(a)*.78,(u-.5)*4.4,Math.sin(a)*.78];
    const tangent = normalize([-Math.sin(a)*.78*Math.PI*5,4.4,Math.cos(a)*.78*Math.PI*5]);
    const normal: Vec3 = [Math.cos(a),0,Math.sin(a)];
    const binormal = cross(tangent,normal);
    return center.map((x,i)=>x+.075*(normal[i]*Math.cos(b)+binormal[i]*Math.sin(b))) as Vec3;
  }, 130, 12)) : null;
  gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const chrome: Vec3 = [.48,.58,.5], lime: Vec3 = [.61,.95,.25], teal: Vec3 = [.18,.65,.66];
  const render = (time: number, px: number, py: number) => {
    gl.viewport(0,0,canvas.width,canvas.height); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const aspect = canvas.width / Math.max(canvas.height, 1), f = 1 / Math.tan(.54 / 2);
    gl.uniformMatrix4fv(uniforms.Projection, false, new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,-1.002,-1, 0,0,-.2002,0]));
    const t = time * .00018;
    const draw = (m: Mesh, p: Vec3, r: Vec3, s: number, color = chrome, metal = .92, emission = 0, opacity = 1) => {
      gl.bindBuffer(gl.ARRAY_BUFFER,m.position); gl.enableVertexAttribArray(attributes.position); gl.vertexAttribPointer(attributes.position,3,gl.FLOAT,false,0,0);
      gl.bindBuffer(gl.ARRAY_BUFFER,m.normal); gl.enableVertexAttribArray(attributes.normal); gl.vertexAttribPointer(attributes.normal,3,gl.FLOAT,false,0,0);
      gl.uniformMatrix4fv(uniforms.Model,false,modelMatrix(...p,...r,s)); gl.uniform3fv(uniforms.Color,color);
      gl.uniform1f(uniforms.Metal,metal); gl.uniform1f(uniforms.Emission,emission); gl.uniform1f(uniforms.Opacity,opacity);
      gl.drawArrays(m.lines ? gl.LINES : gl.TRIANGLES,0,m.count);
    };
    const drift = Math.sin(t * 1.2) * .12;
    if (variant === 'hero' || variant === 'signal') {
      draw(trefoil!,[0,drift,0],[t * .38 + py * .3,-.4 + t * .45 + px * .35,-.3],1.05);
      draw(gem,[0,drift,.05],[t,-t,.2],.57,lime,.62,.15);
      draw(thinRing,[0,drift,0],[.9, .3 + t * .25,.2],1.25,lime,.25,.8);
      draw(thinRing,[0,drift,0],[-.5, 1.1 + t * .15,-.4],1.17,teal,.55,.25);
      draw(wire,[0,drift,0],[.1,t * .1,.3],1.95,teal,.1,.04,.16);
      draw(gem,[-2.03,1.35 + Math.sin(t+1)*.15,-.3],[.4,t,.7],.27,lime,.8,.05);
      draw(box,[1.95,-1.4 + Math.sin(t+2)*.13,-.3],[t,.5,.4],.22);
      draw(ball,[2.05,1.2 + drift,-.9],[0,0,0],.11,lime,.1,1);
      draw(ball,[-1.85,-1.37 + drift,0],[0,0,0],.07,teal,.1,1);
    } else if (variant === 'helix') {
      const purple: Vec3 = [.48,.34,.85];
      draw(helix!,[0,0,0],[0,t,0],.85,chrome);
      draw(helix!,[0,0,0],[0,t + Math.PI,0],.85,purple,.7,.08);
      for (let i = 0; i < 11; i++) {
        const a = (i-5)*.33/(4.4*.85)*Math.PI*5 + Math.PI*2.5 - t;
        draw(rod!,[0,(i-5)*.33,0],[Math.PI/2,Math.PI/2-a,0],.65,chrome,.8);
        draw(ball,[Math.cos(a)*.65,(i-5)*.33,Math.sin(a)*.65],[0,0,0],.12,lime,.65,.1);
        draw(ball,[-Math.cos(a)*.65,(i-5)*.33,-Math.sin(a)*.65],[0,0,0],.12,purple,.65,.1);
      }
      draw(thinRing,[0,0,-.4],[1.2,t*.2,-.3],1.16,purple,.3,.15);
    } else if (variant === 'network') {
      draw(wire,[0,0,0],[.3,t*.4,.3],1.68,teal,.1,.1,.55);
      draw(gem,[0,drift,0],[t*.3,t*.4,.3],.55,teal,.8,.1);
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2 + t * .24;
        draw(ball,[Math.cos(a)*1.65,Math.sin(a)*1.4,Math.sin(a*2)*.65],[0,0,0],.12,i%3 ? lime : teal,.7,.12);
      }
      draw(thinRing,[0,0,0],[1.3,.3,t*.15],1.15,teal,.3,.25);
    } else {
      draw(box,[0,drift,0],[.5 + py*.25,t*.45 + px*.3,.2],.81,chrome);
      draw(box,[0,drift,0],[.5 + py*.25,t*.45 + px*.3,.2],.83,lime,.3,.1,.1);
      draw(ring,[0,drift,0],[1.2,t*.3,-.3],1.08);
      draw(thinRing,[0,drift,0],[.4,-t*.25,.3],1.25,lime,.3,.7);
      draw(gem,[1.8,1.3,-.5],[t,t,.2],.2,lime,.7,.1);
      draw(gem,[-1.8,-1.3,-.5],[-t,t,.2],.25,teal);
    }
  };
  return {
    render,
    dispose() {
      meshes.forEach(m => { gl.deleteBuffer(m.position); gl.deleteBuffer(m.normal); });
      gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs);
    },
  };
}
