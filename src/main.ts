import * as DAT from 'dat.gui';
import { vec3, vec4 } from 'gl-matrix';
import Camera from './Camera';
import Icosphere from './geometry/Icosphere';
import { setGL } from './globals';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import ShaderProgram, { Shader } from './rendering/gl/ShaderProgram';
const Stats = require('stats-js');
var CameraControls = require('3d-view-controls');

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  tesselations: 5,
  shaderProgram: "fireball",
  color1: [50, 50, 50],
  color2: [164, 44, 44],
  'Reset scene': resetScene, // A function pointer, essentially
};

// Add controls to the gui
const gui = new DAT.GUI();
gui.width = 320;
gui.add(controls, 'tesselations', 0, 8).step(1);
const shaderCtrl = gui.add(controls, "shaderProgram", ["fireball", "lambert"]);
const col1Ctrl = gui.addColor(controls, "color1");
const col2Ctrl = gui.addColor(controls, "color2");
gui.add(controls, 'Reset scene');

let icosphere: Icosphere;
let prevTesselations: number = 5;

const initPosition = vec3.fromValues(3, 1, 8);
const initTarget = vec3.fromValues(0, 1.4, 0);
const camera = new Camera(initPosition, initTarget);

function resetScene() {
  shaderCtrl.setValue("fireball");
  camera.controls = CameraControls(document.getElementById('canvas'), {
    eye: initPosition,
    center: initTarget,
  });
  col1Ctrl.setValue([50, 50, 50]);
  col2Ctrl.setValue([164, 44, 44]);
}

function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Load icosphere
  icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, controls.tesselations);
  icosphere.create();

  const renderer = new OpenGLRenderer(canvas);
  gl.enable(gl.DEPTH_TEST);

  const lambert = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require("./shaders/lambert.vert.glsl")),
    new Shader(gl.FRAGMENT_SHADER, require("./shaders/lambert.frag.glsl")),
  ]);
  const fireball = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require("./shaders/fireball.vert.glsl")),
    new Shader(gl.FRAGMENT_SHADER, require("./shaders/fireball.frag.glsl")),
  ]);

  let time = 0;

  // This function will be called every frame
  function tick() {
    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);

    const col2 = controls.color2;
    renderer.setClearColor(col2[0] / 255 / 2, col2[1] / 255 / 2, col2[2] / 255 / 2, 1);
    renderer.clear();

    if(controls.tesselations != prevTesselations)
    {
      prevTesselations = controls.tesselations;
      icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, prevTesselations);
      icosphere.create();
    }

    let shaderProgram = fireball;
    if (controls.shaderProgram === "lambert") {
      shaderProgram = lambert;
      shaderProgram.setColor1(vec4.fromValues(1, 0, 0, 1));
    } else {
      shaderProgram.setTime(time);

      const dir = vec3.create();
      vec3.subtract(dir, camera.controls.eye, camera.controls.center);
      vec3.normalize(dir, dir);
      shaderProgram.setDirection(vec4.fromValues(dir["0"], dir["1"], dir["2"], 0));

      const col1 = controls.color1;
      shaderProgram.setColor1(vec4.fromValues(col1[0] / 255, col1[1] / 255, col1[2] / 255, 1));

      const col2 = controls.color2;
      shaderProgram.setColor2(vec4.fromValues(col2[0] / 255, col2[1] / 255, col2[2] / 255, 1));
    }

    renderer.render(camera, shaderProgram, [icosphere]);

    stats.end();
    time += 1;

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}

main();
