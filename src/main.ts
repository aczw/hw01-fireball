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
  'Reset scene': resetScene, // A function pointer, essentially
};

// Add controls to the gui
const gui = new DAT.GUI();
gui.width = 320;
gui.add(controls, 'tesselations', 0, 8).step(1);
const shaderController = gui.add(controls, "shaderProgram", ["fireball", "lambert"]);
gui.add(controls, 'Reset scene');

let icosphere: Icosphere;
let prevTesselations: number = 5;

const initPosition = vec3.fromValues(3, 1, 8);
const initTarget = vec3.fromValues(0, 1.4, 0);
const camera = new Camera(initPosition, initTarget);

function resetScene() {
  shaderController.setValue("fireball");
  camera.controls = CameraControls(document.getElementById('canvas'), {
    eye: initPosition,
    center: initTarget,
  });
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
  renderer.setClearColor(0.2, 0.2, 0.2, 1);
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
      shaderProgram.setGeometryColor(vec4.fromValues(1, 0, 0, 1));
    } else {
      shaderProgram.setGeometryColor(vec4.fromValues(0, 1, 0, 1));
      shaderProgram.setTime(time);
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
