// St Cuth's Boat Club
/* jshint -W097 */
/* jshint esversion: 6 */

let VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'attribute vec4 a_Normal;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_NormalMatrix;\n' +
  'uniform mat4 u_ViewMatrix;\n' +
  'uniform mat4 u_ProjMatrix;\n' +
  'uniform vec3 u_LightColor;\n' +
  'uniform vec3 u_LightDirection;\n' + // Light direction normalized in world coordinate
  'uniform vec3 u_AmbientLight;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;\n' +

  '  vec3 normal = normalize((u_NormalMatrix * a_Normal).xyz);\n' +
  '  float nDotL = max(dot(normal, u_LightDirection), 0.0);\n' + // cos theta
     // diffuse reflection colour
  '  vec3 diffuse = u_LightColor * a_Color.rgb * nDotL;\n' +
  '  vec3 ambient = u_AmbientLight * a_Color.rgb;\n' +
  '  v_Color = vec4(diffuse + ambient, a_Color.a);\n' +
  '}\n';

let FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

// model, view, proj, and normal matrices
let modelMatrix = new Matrix4();
let viewMatrix = new Matrix4();
let projMatrix = new Matrix4();
let g_normalMatrix = new Matrix4();  // coordinate transformation matrix for normals

// keys for moving camera physically around
// moving around in x and z axes
let keyW = false;
let keyA = false;
let keyS = false;
let keyD = false;

// move up and down (y axix)
let keyShiftLeft = false;
let keySpace = false;

// keys for looking around
let key_Up = false;
let key_Down = false;
let keyRight = false;
let keyLeft = false;

// keys for moving models
let keyF = false; // opens/closes gate
let keyG = false; // opens/closes main door

// angles for moving models
let gateAngle = 0;
let mainDoorAngle = 0;

// when camera pointing between axes
let xAngle = 1;
let zAngle = 1;

// coordinates for changing camera angles
let xCoordinate = -40;
let yCoordinate = 10;
let zCoordinate = 40;
let vLook = 9.75;

// movement speed and camera rotation
let lookSpeed = 0.01; // default 0.01
let leftRightSpeed = 0.15;  // default 0.15
let forwardBackwardSpeed = 0.15;   // default 0.15
let upDownSpeed = 0.15; // default 0.15

// camera angle in radians for calculations
let angle = 1.5 * Math.PI;

function main(){
  let canvas = document.getElementById('webgl');

  let gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  gl.clearColor(-1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // get uniform attributes' storage locations
  let u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  let u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  let u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  let u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  let u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  let u_LightDirection = gl.getUniformLocation(gl.program, 'u_LightDirection');
  let u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');

  if (!u_ModelMatrix || !u_ViewMatrix || !u_NormalMatrix || !u_ProjMatrix ||
     !u_LightColor || !u_LightDirection || !u_AmbientLight) {
    console.log('Failed to get the storage locations of one or more of the uniform variables');
    return;
  }

  // set directional light colour and direction in world coords
  gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);
  let lightDirection = new Vector3([0.5, 3.0, 4.0]);
  lightDirection.normalize();
  gl.uniform3fv(u_LightDirection, lightDirection.elements);

  // set ambient light
  gl.uniform3f(u_AmbientLight, 0.5, 0.5, 0.5);

  // calculate proj matrix
  projMatrix.setPerspective(30, canvas.width/canvas.height, 1, 100);

  // pass view and proj matrix to uniform matrix respectively
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);

  let generateScene = function(){
    document.onkeydown = function (ev) {
      keyDown(ev);
    };
    document.onkeyup = function (ev) {
      keyUp(ev);
    };
    moveFence();
    moveDoors();
    draw(gl, u_ModelMatrix, u_NormalMatrix, u_ViewMatrix);
    requestAnimationFrame(generateScene);
  };
  generateScene();
}

function keyDown(ev){

  // start moving/looking
  switch (ev.code) {
    // moving
    case 'KeyW':
        keyW = true;
        break;
    case 'KeyA':
        keyA = true;
        break;
    case 'KeyS':
        keyS = true;
        break;
    case 'KeyD':
        keyD = true;
        break;

    case 'ShiftLeft':
        keyShiftLeft = true;
        break;
    case 'Space':
        keySpace = true;
        break;

    // looking
    case 'ArrowUp':
        key_Up = true;
        break;
    case 'ArrowDown':
        key_Down = true;
        break;
    case 'ArrowRight':
        keyRight = true;
        break;
    case 'ArrowLeft':
        keyLeft = true;
        break;

    // moving objects
    case 'KeyF':
      if (keyF) {
          keyF = false;
      }
      else {
          keyF = true;
      }
      break;
    case 'KeyG':
      if (keyG) {
          keyG = false;
      }
      else {
          keyG = true;
      }
      break;
  }
}

function keyUp(ev){

  // stop moving/looking
  switch (ev.code){
    case 'KeyW':
        keyW = false;
        break;
    case 'KeyA':
        keyA = false;
        break;
    case 'KeyS':
        keyS = false;
        break;
    case 'KeyD':
        keyD = false;
        break;

    case 'ArrowUp':
        key_Up = false;
        break;
    case 'ArrowLeft':
        keyLeft = false;
        break;
    case 'ArrowDown':
        key_Down = false;
        break;
    case 'ArrowRight':
        keyRight = false;
        break;

    case 'ShiftLeft':
        keyShiftLeft = false;
        break;
    case 'Space':
        keySpace = false;
        break;
  }
}

function moveFence(){
  if (keyF){
    gateAngle -= 0.02;
    if (gateAngle < -1.5){
      gateAngle = -1.5;
    }
  }
  else{
    gateAngle += 0.02;
    if (gateAngle > 0){
      gateAngle = 0;
    }
  }
}

function moveDoors(){
  if (keyG){
    mainDoorAngle -= 0.02;
    if (mainDoorAngle < -1.5){
      mainDoorAngle = -1.5;
    }
  }
  else{
    mainDoorAngle += 0.02;
    if (mainDoorAngle > 0){
      mainDoorAngle = 0;
    }
  }
}

function initCubeVertexBuffers(gl, color) {
  // create a cube
  //    v6----- v5
  //   /|      /|
  //  v1------v0|
  //  | |     | |
  //  | |v7---|-|v4
  //  |/      |/
  //  v2------v3
  let vertices = new Float32Array([   // coordinates
     0.5, 0.5, 0.5,  -0.5, 0.5, 0.5,  -0.5,-0.5, 0.5,   0.5,-0.5, 0.5, // v0-v1-v2-v3 front
     0.5, 0.5, 0.5,   0.5,-0.5, 0.5,   0.5,-0.5,-0.5,   0.5, 0.5,-0.5, // v0-v3-v4-v5 right
     0.5, 0.5, 0.5,   0.5, 0.5,-0.5,  -0.5, 0.5,-0.5,  -0.5, 0.5, 0.5, // v0-v5-v6-v1 up
    -0.5, 0.5, 0.5,  -0.5, 0.5,-0.5,  -0.5,-0.5,-0.5,  -0.5,-0.5, 0.5, // v1-v6-v7-v2 left
    -0.5,-0.5,-0.5,   0.5,-0.5,-0.5,   0.5,-0.5, 0.5,  -0.5,-0.5, 0.5, // v7-v4-v3-v2 down
     0.5,-0.5,-0.5,  -0.5,-0.5,-0.5,  -0.5, 0.5,-0.5,   0.5, 0.5,-0.5  // v4-v7-v6-v5 back
  ]);

  let colors = "";
  if (color == "red"){
    colors = new Float32Array([    // colors
      1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v0-v1-v2-v3 front
      1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v0-v3-v4-v5 right
      1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v0-v5-v6-v1 up
      1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v1-v6-v7-v2 left
      1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v7-v4-v3-v2 down
      1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0　    // v4-v7-v6-v5 back
   ]);
  }
  else if (color == "lightGreen"){
    colors = new Float32Array([    // colors lightGreen
      124/255,252/255,0,   124/255,252/255,0,   124/255,252/255,0,  124/255,252/255,0,
      124/255,252/255,0,   124/255,252/255,0,   124/255,252/255,0,  124/255,252/255,0,     // v0-v3-v4-v5 right
      124/255,252/255,0,   124/255,252/255,0,   124/255,252/255,0,  124/255,252/255,0,     // v0-v5-v6-v1 up
      124/255,252/255,0,   124/255,252/255,0,   124/255,252/255,0,  124/255,252/255,0,     // v1-v6-v7-v2 left
      124/255,252/255,0,   124/255,252/255,0,   124/255,252/255,0,  124/255,252/255,0,     // v7-v4-v3-v2 down
      124/255,252/255,0,   124/255,252/255,0,   124/255,252/255,0,  124/255,252/255,0,　    // v4-v7-v6-v5 back
   ]);
  }
  else if (color == "darkGreen"){
    colors = new Float32Array([    // colors dark green
      0,100/255,0,   0,100/255,0,   0,100/255,0,  0,100/255,0,
      0,100/255,0,   0,100/255,0,   0,100/255,0,  0,100/255,0,
      0,100/255,0,   0,100/255,0,   0,100/255,0,  0,100/255,0,
      0,100/255,0,   0,100/255,0,   0,100/255,0,  0,100/255,0,
      0,100/255,0,   0,100/255,0,   0,100/255,0,  0,100/255,0,
      0,100/255,0,   0,100/255,0,   0,100/255,0,  0,100/255,0,
   ]);
  }
  else if (color == "grey"){
    colors = new Float32Array([ // colours grey
      128/255, 128/255, 128/255,    128/255, 128/255, 128/255,    128/255, 128/255, 128/255,   128/255, 128/255, 128/255,
      128/255, 128/255, 128/255,    128/255, 128/255, 128/255,    128/255, 128/255, 128/255,   128/255, 128/255, 128/255,
      128/255, 128/255, 128/255,    128/255, 128/255, 128/255,    128/255, 128/255, 128/255,   128/255, 128/255, 128/255,
      128/255, 128/255, 128/255,    128/255, 128/255, 128/255,    128/255, 128/255, 128/255,   128/255, 128/255, 128/255,
      128/255, 128/255, 128/255,    128/255, 128/255, 128/255,    128/255, 128/255, 128/255,   128/255, 128/255, 128/255,
    ]);
  }
  else if (color == "lightBlack"){
    colors = new Float32Array([ // colours light black
      50/255,40/255,40/255,    50/255,40/255,40/255,    50/255,40/255,40/255,   50/255,40/255,40/255,
      50/255,40/255,40/255,    50/255,40/255,40/255,    50/255,40/255,40/255,   50/255,40/255,40/255,
      50/255,40/255,40/255,    50/255,40/255,40/255,    50/255,40/255,40/255,   50/255,40/255,40/255,
      50/255,40/255,40/255,    50/255,40/255,40/255,    50/255,40/255,40/255,   50/255,40/255,40/255,
      50/255,40/255,40/255,    50/255,40/255,40/255,    50/255,40/255,40/255,   50/255,40/255,40/255,
    ]);
  }
  else if (color == "black"){
    colors = new Float32Array([ // colours light black
      25/255,25/255,25/255,    25/255,25/255,25/255,    25/255,25/255,25/255,   25/255,25/255,25/255,
      25/255,25/255,25/255,    25/255,25/255,25/255,    25/255,25/255,25/255,   25/255,25/255,25/255,
      25/255,25/255,25/255,    25/255,25/255,25/255,    25/255,25/255,25/255,   25/255,25/255,25/255,
      25/255,25/255,25/255,    25/255,25/255,25/255,    25/255,25/255,25/255,   25/255,25/255,25/255,
      25/255,25/255,25/255,    25/255,25/255,25/255,    25/255,25/255,25/255,   25/255,25/255,25/255,
    ]);
  }
  else if (color == "brown"){
    colors = new Float32Array([ // colours light black
      210/255,105/255,30/255,    210/255,105/255,30/255,    210/255,105/255,30/255,   210/255,105/255,30/255,
      210/255,105/255,30/255,    210/255,105/255,30/255,    210/255,105/255,30/255,   210/255,105/255,30/255,
      210/255,105/255,30/255,    210/255,105/255,30/255,    210/255,105/255,30/255,   210/255,105/255,30/255,
      210/255,105/255,30/255,    210/255,105/255,30/255,    210/255,105/255,30/255,   210/255,105/255,30/255,
      210/255,105/255,30/255,    210/255,105/255,30/255,    210/255,105/255,30/255,   210/255,105/255,30/255,
    ]);
  }
  else if (color == "lightWhite"){
    colors = new Float32Array([ // colours white
      180/255,180/255,180/255,    180/255,180/255,180/255,    180/255,180/255,180/255,   180/255,180/255,180/255,
      180/255,180/255,180/255,    180/255,180/255,180/255,    180/255,180/255,180/255,   180/255,180/255,180/255,
      180/255,180/255,180/255,    180/255,180/255,180/255,    180/255,180/255,180/255,   180/255,180/255,180/255,
      180/255,180/255,180/255,    180/255,180/255,180/255,    180/255,180/255,180/255,   180/255,180/255,180/255,
      180/255,180/255,180/255,    180/255,180/255,180/255,    180/255,180/255,180/255,   180/255,180/255,180/255,
    ]);
  }
  else if (color == "white"){
    colors = new Float32Array([ // colours white
      240/255,240/255,240/255,    240/255,240/255,240/255,    240/255,240/255,240/255,   240/255,240/255,240/255,
      240/255,240/255,240/255,    240/255,240/255,240/255,    240/255,240/255,240/255,   240/255,240/255,240/255,
      240/255,240/255,240/255,    240/255,240/255,240/255,    240/255,240/255,240/255,   240/255,240/255,240/255,
      240/255,240/255,240/255,    240/255,240/255,240/255,    240/255,240/255,240/255,   240/255,240/255,240/255,
      240/255,240/255,240/255,    240/255,240/255,240/255,    240/255,240/255,240/255,   240/255,240/255,240/255,
    ]);
  }

  let normals = new Float32Array([    // normal
    0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,  // v0-v1-v2-v3 front
    1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  // v0-v3-v4-v5 right
    0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  // v0-v5-v6-v1 up
   -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  // v1-v6-v7-v2 left
    0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,  // v7-v4-v3-v2 down
    0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0   // v4-v7-v6-v5 back
  ]);

  // vertex indices
  let indices = new Uint8Array([
     0, 1, 2,   0, 2, 3,    // front
     4, 5, 6,   4, 6, 7,    // right
     8, 9,10,   8,10,11,    // up
    12,13,14,  12,14,15,    // left
    16,17,18,  16,18,19,    // down
    20,21,22,  20,22,23     // back
 ]);

  // add the vertex properties (coordinates, colors and normals) to buffers
  if (!initArrayBuffer(gl, 'a_Position', vertices, 3, gl.FLOAT)) return -1;
  if (!initArrayBuffer(gl, 'a_Color', colors, 3, gl.FLOAT)) return -1;
  if (!initArrayBuffer(gl, 'a_Normal', normals, 3, gl.FLOAT)) return -1;

  // add indices to the buffer object
  let indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
    console.log('Failed to create the buffer object');
    return false;
  }

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return indices.length;
}

function initPrismVertexBuffers(gl, color){

  // create a prism
  let vertices = new Float32Array([ // coordinates
    -0.5,-0.5, 0.5,   0.0, 0.5, 0.5,   0.5,-0.5, 0.5,                   // front
     0.0, 0.5, 0.5,   0.5,-0.5, 0.5,   0.5,-0.5,-0.5,   0.0, 0.5,-0.5,  // right side
    -0.5,-0.5, 0.5,   0.0, 0.5, 0.5,   0.0, 0.5,-0.5,  -0.5,-0.5,-0.5,  // left side
    -0.5,-0.5, 0.5,   0.5,-0.5, 0.5,   0.5,-0.5,-0.5,  -0.5,-0.5,-0.5,  // bottom side
    -0.5,-0.5,-0.5,   0.0, 0.5,-0.5,   0.5,-0.5,-0.5                    // back
  ]);

  let colors = "";
  if (color == "red"){
    colors = new Float32Array([ // colours, grey - 169, 169, 169
         1.00,    0.00,    0.00,       1.00,    0.00,    0.00,       1.00,    0.00,    0.00,
      169/255, 169/255, 169/255,    169/255, 169/255, 169/255,    169/255, 169/255, 169/255,   169/255, 169/255, 169/255,
      169/255, 169/255, 169/255,    169/255, 169/255, 169/255,    169/255, 169/255, 169/255,   169/255, 169/255, 169/255,
      169/255, 169/255, 169/255,    169/255, 169/255, 169/255,    169/255, 169/255, 169/255,   169/255, 169/255, 169/255,
         1.00,    0.00,    0.00,       1.00,    0.00,    0.00,       1.00,    0.00,    0.00
    ]);
  }
  else if (color == "darkGreen"){
    colors = new Float32Array([ // colours, grey - 169, 169, 169
      0,100/255,0,   0,100/255,0,   0,100/255,0,
      0,100/255,0,   0,100/255,0,   0,100/255,0,  0,100/255,0,
      0,100/255,0,   0,100/255,0,   0,100/255,0,  0,100/255,0,
      0,100/255,0,   0,100/255,0,   0,100/255,0,  0,100/255,0,
      0,100/255,0,   0,100/255,0,   0,100/255,0,
    ]);
  }

  let normals = new Float32Array([    // normal
    0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,                   // front
    1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  // right
   -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  // left
    0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,  // down
    0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0                    // back
  ]);

  let indices = new Uint8Array([
    0, 1, 2,
    3, 4, 5,   3, 5, 6,
    7, 8, 9,   7, 9,10,
    11,12,13,  11,13,14,
    15,16,17
  ]);

  // add the vertex properties (coordinates, colors and normals) to buffers
  if (!initArrayBuffer(gl, 'a_Position', vertices, 3, gl.FLOAT)) return -1;
  if (!initArrayBuffer(gl, 'a_Color', colors, 3, gl.FLOAT)) return -1;
  if (!initArrayBuffer(gl, 'a_Normal', normals, 3, gl.FLOAT)) return -1;

  // add indices to the buffer object
  let indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
    console.log('Failed to create the buffer object');
    return false;
  }

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return indices.length;
}

function initArrayBuffer(gl, attribute, data, num, type) {

  // create buffer
  let buffer = gl.createBuffer();
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return false;
  }

  // bind buffer to target add date to buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  // assign buffer to attribute variable
  let a_attribute = gl.getAttribLocation(gl.program, attribute);
  if (a_attribute < 0) {
    console.log('Failed to get the storage location of ' + attribute);
    return false;
  }
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);

  // Enable assignment of buffer to attribute and unbind it when done
  gl.enableVertexAttribArray(a_attribute);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return true;
}

function initAxesVertexBuffers(gl) {

  let verticesColors = new Float32Array([
    // Vertex coordinates and color (for axes)
    -20.0,  0.0,   0.0,  1.0,  1.0,  1.0,  // (x,y,z), (r,g,b)
     20.0,  0.0,   0.0,  1.0,  1.0,  1.0,
     0.0,  20.0,   0.0,  1.0,  1.0,  1.0,
     0.0, -20.0,   0.0,  1.0,  1.0,  1.0,
     0.0,   0.0, -20.0,  1.0,  1.0,  1.0,
     0.0,   0.0,  20.0,  1.0,  1.0,  1.0
  ]);
  let n = 6;

  // create buffer
  let vertexColorBuffer = gl.createBuffer();
  if (!vertexColorBuffer) {
    console.log('Failed to create the buffer object');
    return false;
  }

  // bind buffer to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesColors, gl.STATIC_DRAW);

  let FSIZE = verticesColors.BYTES_PER_ELEMENT;

  // get storage location of a_Position
  let a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }

  // assign and enable buffer
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 6, 0);
  gl.enableVertexAttribArray(a_Position);

  // same as above but for a_Colour, and unbind at the end
  let a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 6, FSIZE * 3);
  gl.enableVertexAttribArray(a_Color);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return n;
}

function drawGround(gl, u_ModelMatrix, u_NormalMatrix){

  // changing the colour of the cube for the ground
  let color = "lightGreen";
  n = initCubeVertexBuffers(gl, color);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // model the main grass
  pushMatrix(modelMatrix);
    modelMatrix.translate(2.5, -2.0, -2.0);
    modelMatrix.scale(50.0, 0.5, 28.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // model the edge grass
  pushMatrix(modelMatrix);
    modelMatrix.translate(2.5, -2.0, 20.0);
    modelMatrix.scale(50.0, 0.5, 4.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  color = "grey";
  n = initCubeVertexBuffers(gl, color);
  if (n < 0){
    console.log('Failed to set the vertex information');
    return;
  }

  // model the  main road
  pushMatrix(modelMatrix);
    modelMatrix.translate(2.5, -2.0, 15.0);
    modelMatrix.scale(50.0, 0.5, 6.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // model the side road
  pushMatrix(modelMatrix);
    modelMatrix.translate(20.4, -1.75, 0.0);
    modelMatrix.scale(14.2, 0.01, 5.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();
}

function drawMainBuilding(gl, u_ModelMatrix, u_NormalMatrix){
  // set vertex coords and colour for cube
  color = "red";
  n = initCubeVertexBuffers(gl, color);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // model the main building
  pushMatrix(modelMatrix);
    modelMatrix.translate(6.3, 0.0, 0.0);
    modelMatrix.scale(14.0, 4.0, 5.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // model the side (tall) building
  pushMatrix(modelMatrix);
    modelMatrix.translate(-3.0, 1.26, 0.0);
    modelMatrix.scale(5.0, 7.0, 5.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // model the back sticking out building
  pushMatrix(modelMatrix);
    modelMatrix.translate(-3.0, 0.5, -3.0);
    modelMatrix.scale(2.5, 6.0, 1.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // model the chimmeny
  pushMatrix(modelMatrix);
  modelMatrix.setTranslate(-6.0, 2.0, 0.0);

  pushMatrix(modelMatrix);  // main chimmeny
    modelMatrix.scale(1.0, 9.0, 1.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
  pushMatrix(modelMatrix);  // bigger pipe
    modelMatrix.translate(0.0, 4.7, 0.25);
    modelMatrix.scale(0.4, 0.5, 0.4);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
  pushMatrix(modelMatrix);  // smaller pipe
    modelMatrix.translate(0.0, 4.6, -0.25);
    modelMatrix.scale(0.4, 0.3, 0.4);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
  modelMatrix = popMatrix();

  // model the black tops of chimmeny
  color = "black";
  n = initCubeVertexBuffers(gl, color);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  pushMatrix(modelMatrix);
  modelMatrix.setTranslate(-6.0, 2.0, 0.0);

  pushMatrix(modelMatrix);  // bigger pipe top
    modelMatrix.translate(0.0, 4.95, 0.25);
    modelMatrix.scale(0.2, 0.01, 0.2);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);  // smaller pipe top
    modelMatrix.translate(0.0, 4.75, -0.25);
    modelMatrix.scale(0.2, 0.01, 0.2);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  // model the black entrance
  pushMatrix(modelMatrix);
  modelMatrix.translate(19.3, -2.5, 0.0);
  modelMatrix.rotate(90, 0, 0, 1);
  modelMatrix.scale(2.5, 0.01, 2.0);
  drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  modelMatrix = popMatrix();
}

function drawRoofs(gl, u_ModelMatrix, u_NormalMatrix){
  // set vertex coords and colour for prism (roof)
  n = initPrismVertexBuffers(gl, "red");
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // model the main roof
  pushMatrix(modelMatrix);
    modelMatrix.translate(6.3, 3.5, 0.0);
    modelMatrix.rotate(90, 0, 1, 0);
    modelMatrix.scale(5.0, 3.0, 14.5);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // model the side roof
  pushMatrix(modelMatrix);
    modelMatrix.translate(-3.0, 5.7, 0.0);
    modelMatrix.scale(6.0, 2.5, 5.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // model the front-small roof
  pushMatrix(modelMatrix);
    modelMatrix.translate(10.0, 3.0, 0.0);
    modelMatrix.scale(3.2, 2.0, 5.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();
}

function drawRoofEdges(gl, u_ModelMatrix, u_NormalMatrix){

  // model the edges
  color = "darkGreen";
  n = initCubeVertexBuffers(gl, color);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // main roof edge model
  pushMatrix(modelMatrix);
    modelMatrix.translate(13.6, 3.4, 1.2);
    modelMatrix.rotate(90, 0, 1, 0);
    modelMatrix.rotate(50, 0, 0, 1);
    modelMatrix.scale(3.75, 0.2, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();
  pushMatrix(modelMatrix);
    modelMatrix.translate(13.6, 3.4, -1.2);
    modelMatrix.rotate(90, 0, 1, 0);
    modelMatrix.rotate(-50, 0, 0, 1);
    modelMatrix.scale(3.9, 0.2, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  n = initPrismVertexBuffers(gl, "darkGreen");
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  pushMatrix(modelMatrix);
  modelMatrix.setTranslate(13.5, 4.0, 0.0);

  pushMatrix(modelMatrix);
    modelMatrix.rotate(90, 0, 1, 0);
    modelMatrix.scale(3.0, 2.0, 0.5);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  n = initCubeVertexBuffers(gl, "darkGreen");
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  pushMatrix(modelMatrix);
    modelMatrix.translate(0.15, 0.0, 0.0);
    modelMatrix.scale(0.15, 2.5, 0.2);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(0.15, 1.3, 0.0);
    modelMatrix.scale(0.05, 0.4, 0.05);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
  modelMatrix = popMatrix();

  // side roof front edge model
  pushMatrix(modelMatrix);
    modelMatrix.translate(-4.5, 5.6, 2.5);
    modelMatrix.rotate(40, 0, 0, 1);
    modelMatrix.scale(3.75, 0.2, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();
  pushMatrix(modelMatrix);
    modelMatrix.translate(-1.6, 5.7, 2.5);
    modelMatrix.rotate(-40, 0, 0, 1);
    modelMatrix.scale(3.78, 0.2, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // side roof back edge model
  pushMatrix(modelMatrix);
    modelMatrix.translate(-4.5, 5.6, -2.5);
    modelMatrix.rotate(40, 0, 0, 1);
    modelMatrix.scale(3.75, 0.2, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();
  pushMatrix(modelMatrix);
    modelMatrix.translate(-1.6, 5.7, -2.5);
    modelMatrix.rotate(-40, 0, 0, 1);
    modelMatrix.scale(3.78, 0.2, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // small front roof model
  pushMatrix(modelMatrix);
    modelMatrix.translate(10.7, 3.0, 2.5);
    modelMatrix.rotate(-52, 0, 0, 1);
    modelMatrix.scale(2.5, 0.2, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();
  pushMatrix(modelMatrix);
    modelMatrix.translate(9.3, 3.0, 2.5);
    modelMatrix.rotate(52, 0, 0, 1);
    modelMatrix.scale(2.5, 0.2, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // small back roof model
  pushMatrix(modelMatrix);
    modelMatrix.translate(10.7, 3.0, -2.5);
    modelMatrix.rotate(-52, 0, 0, 1);
    modelMatrix.scale(2.5, 0.2, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();
  pushMatrix(modelMatrix);
    modelMatrix.translate(9.3, 3.0, -2.5);
    modelMatrix.rotate(52, 0, 0, 1);
    modelMatrix.scale(2.5, 0.2, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();
}

function drawDoors(gl, u_ModelMatrix, u_NormalMatrix, mainDoorAngle){

  // model the double sliding doors
  color = "darkGreen";
  n = initCubeVertexBuffers(gl, color);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  pushMatrix();
  modelMatrix.setTranslate(13.4, -1.0, 0.0);
  modelMatrix.translate(0.0, 0.0, -1.0);
  modelMatrix.translate(0.0, 0.0, Math.sin(mainDoorAngle) * 0.05);
  let angle = mainDoorAngle*360/(2 * Math.PI);
  modelMatrix.rotate(angle, 0, 1, 0);
  modelMatrix.translate(0.0, 0.0, 1.0);

  pushMatrix();
    modelMatrix.translate(0.0, 0.0, -0.76);
    modelMatrix.scale(0.2, 3.0, 1.5);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
  modelMatrix = popMatrix();

  pushMatrix();
  modelMatrix.setTranslate(13.4, -1.0, 0.0);
  modelMatrix.translate(0.0, 0.0, -1.0);
  modelMatrix.translate(0.0, 0.0, Math.sin(mainDoorAngle) * 0.05);
  angle = mainDoorAngle*360/(2 * Math.PI);
  modelMatrix.rotate(angle, 0, 1, 0);
  modelMatrix.translate(0.0, 0.0, 1.0);

  pushMatrix();
    modelMatrix.translate(0.0, 0.0, 0.76);
    modelMatrix.scale(0.2, 3.0, 1.5);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
  modelMatrix = popMatrix();

  pushMatrix();
  modelMatrix.setTranslate(13.4, -1.0, 0.0);

  pushMatrix();
    modelMatrix.translate(0.0, 1.7, 0.0);
    modelMatrix.rotate(90, 1, 0, 0);
    modelMatrix.scale(0.2, 4.0, 0.4);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
  modelMatrix = popMatrix();

  pushMatrix();
    modelMatrix.translate(-5.5, -0.7, -1.5);
    modelMatrix.scale(0.2, 2.0, 1.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();
}

function drawWindow(gl, u_ModelMatrix, u_NormalMatrix, translateX, translateY, translateZ, rotateAngle, rotateX, rotateY, rotateZ){

  color = "lightWhite";
  n = initCubeVertexBuffers(gl, color);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  pushMatrix(modelMatrix);
  modelMatrix.setTranslate(translateX, translateY, translateZ);
  modelMatrix.rotate(rotateAngle, rotateX, rotateY, rotateZ);

  // model the full pane
  pushMatrix(modelMatrix);
    modelMatrix.scale(2.0, 2.0, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  color = "white";
  n = initCubeVertexBuffers(gl, color);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // model the bars
  pushMatrix(modelMatrix);
    modelMatrix.translate(-1.0, 0.0, 0.05);
    modelMatrix.scale(0.1, 2.0, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(-0.35, 0.0, 0.05);
    modelMatrix.scale(0.1, 2.0, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(0.35, 0.0, 0.05);
    modelMatrix.scale(0.1, 2.0, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(1.0, 0.0, 0.05);
    modelMatrix.scale(0.1, 2.0, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(0.0, 0.0, 0.05);
    modelMatrix.rotate(90, 0, 0, 1);
    modelMatrix.scale(0.1, 2.0, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(0.0, 1.0, 0.05);
    modelMatrix.rotate(90, 0, 0, 1);
    modelMatrix.scale(0.1, 2.0, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(0.0, -1.0, 0.05);
    modelMatrix.rotate(90, 0, 0, 1);
    modelMatrix.scale(0.1, 2.0, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  modelMatrix = popMatrix();
}

function drawWindows(gl, u_ModelMatrix, u_NormalMatrix){

  drawWindow(gl, u_ModelMatrix, u_NormalMatrix, 10.0, 0.5, 2.5, 0, 0, 1, 0);
  drawWindow(gl, u_ModelMatrix, u_NormalMatrix, 3.5, 0.5, 2.5, 0, 0, 1, 0);
  drawWindow(gl, u_ModelMatrix, u_NormalMatrix, -2.75, 0.5, 2.5, 0, 0, 1, 0);
  drawWindow(gl, u_ModelMatrix, u_NormalMatrix, -2.75, 3.5, 2.5, 0, 0, 1, 0);
  drawWindow(gl, u_ModelMatrix, u_NormalMatrix, 10.0, 0.5, -2.5, 180, 0, 1, 0);
  drawWindow(gl, u_ModelMatrix, u_NormalMatrix, 3.5, 0.5, -2.5, 180, 0, 1, 0);
  drawWindow(gl, u_ModelMatrix, u_NormalMatrix, -2.75, -0.5, -3.5, 180, 0, 1, 0);
  drawWindow(gl, u_ModelMatrix, u_NormalMatrix, -2.75, 2.0, -3.5, 180, 0, 1, 0);
}

function drawBin(gl, u_ModelMatrix, u_NormalMatrix){

  // model place for bin
  color = "grey";
  n = initCubeVertexBuffers(gl, color);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  pushMatrix();
  modelMatrix.setTranslate(-3.0, -1.99, 10.5);

  pushMatrix(modelMatrix);
    modelMatrix.translate(0.0, 0.0, 0.0);
    modelMatrix.scale(3.0, 0.5, 3.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // model actual bin
  color = "lightBlack";
  n = initCubeVertexBuffers(gl, color);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  pushMatrix(modelMatrix);
    modelMatrix.translate(0.0, 1.5, 0.0);
    modelMatrix.scale(1.0, 2.0, 1.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  // model bin hole
  color = "black";
  n = initCubeVertexBuffers(gl, color);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  pushMatrix(modelMatrix);
    modelMatrix.translate(0.0, 2.0, 0.51);
    modelMatrix.scale(0.5, 0.5, 0.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  modelMatrix = popMatrix();
}

function drawBenches(gl, u_ModelMatrix, u_NormalMatrix){

  // set local coordiantes
  pushMatrix(modelMatrix);
  modelMatrix.setTranslate(6.0, -0.75, 6.0);

  // model place for bin
  color = "grey";
  n = initCubeVertexBuffers(gl, color);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  pushMatrix(modelMatrix);
    modelMatrix.translate(0.0, -1.0, 0.0);
    modelMatrix.scale(4.0, 0.1, 4.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // model table, seats, and supports
  color = "brown";
  n = initCubeVertexBuffers(gl, color);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // model the table
  pushMatrix(modelMatrix);
    modelMatrix.scale(3.0, 0.2, 2.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  // model the chairs
  pushMatrix(modelMatrix);
    modelMatrix.translate(0.0, -0.5, 1.8);
    modelMatrix.scale(3.0, 0.2, 1.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
  pushMatrix(modelMatrix);
    modelMatrix.translate(0.0, -0.5, -1.8);
    modelMatrix.scale(3.0, 0.2, 1.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  // model the supports
  pushMatrix(modelMatrix);
    modelMatrix.translate(0.8, -0.7, 0.0);
    modelMatrix.scale(0.1, 0.2, 4.5);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(-0.8, -0.7, 0.0);
    modelMatrix.scale(0.1, 0.2, 4.5);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(-0.7, -0.65, 1.2);
    modelMatrix.rotate(40, 1, 0, 0);
    modelMatrix.scale(0.1, 0.2, 2.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(0.7, -0.65, 1.2);
    modelMatrix.rotate(40, 1, 0, 0);
    modelMatrix.scale(0.1, 0.2, 2.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(-0.7, -0.65, -1.2);
    modelMatrix.rotate(-40, 1, 0, 0);
    modelMatrix.scale(0.1, 0.2, 2.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(0.7, -0.65, -1.2);
    modelMatrix.rotate(-40, 1, 0, 0);
    modelMatrix.scale(0.1, 0.2, 2.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  modelMatrix = popMatrix();
}

function drawLampPost(gl, u_ModelMatrix, u_NormalMatrix){

  // model the post
  color = "lightWhite";
  n = initCubeVertexBuffers(gl, color);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  pushMatrix(modelMatrix);
  modelMatrix.setTranslate(-1.0, 2.5, 4.0);

  pushMatrix(modelMatrix);
    modelMatrix.scale(0.2, 9.5, 0.2);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  // model the lamp
  pushMatrix(modelMatrix);
    modelMatrix.translate(0.0, 4.8, 0.0);
    modelMatrix.scale(0.3, 0.2, 0.4);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();
}

function drawFence(gl, u_ModelMatrix, u_NormalMatrix, translateX, translateY, translateZ, rotateAngle, rotateX, rotateY, rotateZ){

  // model the beams
  color = "brown";
  n = initCubeVertexBuffers(gl, color);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  pushMatrix(modelMatrix);
  modelMatrix.setTranslate(translateX, translateY, translateZ);
  modelMatrix.rotate(rotateAngle, rotateX, rotateY, rotateZ);

  pushMatrix(modelMatrix);
    modelMatrix.translate(-0.75, 0.0, 0.0);
    modelMatrix.scale(13.5, 0.2, 0.2);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(-0.7, -0.75, 0.0);
    modelMatrix.scale(13.5, 0.2, 0.2);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(-0.7, -1.5, 0.0);
    modelMatrix.scale(13.5, 0.2, 0.2);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(5.0, -0.7, 0.0);
    modelMatrix.scale(0.2, 2.1, 0.2);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(2.5, -0.7, 0.0);
    modelMatrix.scale(0.2, 2.1, 0.2);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(-0.0, -0.7, 0.0);
    modelMatrix.scale(0.2, 2.1, 0.2);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(-2.5, -0.7, 0.0);
    modelMatrix.scale(0.2, 2.1, 0.2);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(-5.0, -0.7, 0.0);
    modelMatrix.scale(0.2, 2.1, 0.2);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(-7.4, -0.7, 0.0);
    modelMatrix.scale(0.2, 2.1, 0.2);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  modelMatrix = popMatrix();
}

function drawFences(gl, u_ModelMatrix, u_NormalMatrix){

  drawFence(gl, u_ModelMatrix, u_NormalMatrix, -15.0, 0.0, 2.4, 0, 0, 1, 0);
  drawFence(gl, u_ModelMatrix, u_NormalMatrix, 13.2, 0.0, -10.0, 90, 0, 1, 0);
}

function drawGate(gl, u_ModelMatrix, u_NormalMatrix, gateAngle){

  // model the gate that moves
  color = "brown";
  n = initCubeVertexBuffers(gl, color);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  pushMatrix(modelMatrix);
  modelMatrix.setTranslate(-9.0, -0.7, 2.4);
  modelMatrix.translate(0, 0, -Math.sin(gateAngle) * -0.05);
  let angle = gateAngle*360/(2 * Math.PI);
  modelMatrix.rotate(angle, 0, 1, 0);

  pushMatrix(modelMatrix);
    modelMatrix.scale(0.2, 2.1, 0.2);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(3.4, 0.0, 0.0);
    modelMatrix.scale(0.2, 2.1, 0.2);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(1.7, 0.7, 0.0);
    modelMatrix.rotate(90, 0, 0, 1);
    modelMatrix.scale(0.2, 3.2, 0.2);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(1.7, -0.7, 0.0);
    modelMatrix.rotate(90, 0, 0, 1);
    modelMatrix.scale(0.2, 3.2, 0.2);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(1.7, 0.0, 0.0);
    modelMatrix.rotate(90, 0, 0, 1);
    modelMatrix.rotate(20, 0, 0, 1);
    modelMatrix.scale(0.2, 3.5, 0.2);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

  pushMatrix(modelMatrix);
    modelMatrix.translate(1.7, 0.0, 0.0);
    modelMatrix.rotate(-90, 0, 0, 1);
    modelMatrix.rotate(-20, 0, 0, 1);
    modelMatrix.scale(0.2, 3.5, 0.2);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
}

let g_matrixStack = []; // array for storing a matrix
function pushMatrix(m) { // Store the specified matrix to the array
  let m2 = new Matrix4(m);
  g_matrixStack.push(m2);
}

function popMatrix() { // Retrieve the matrix from the array
  return g_matrixStack.pop();
}

function draw(gl, u_ModelMatrix, u_NormalMatrix, u_ViewMatrix) {

  // angles for looking and moving
  xAngle = Math.cos(angle) - Math.sin(angle);
  zAngle = Math.cos(angle) + Math.sin(angle);

  // move forwards, left, backwards, and right respectively
  if (keyW) {
      zCoordinate += zAngle * forwardBackwardSpeed;
      xCoordinate += xAngle * forwardBackwardSpeed;
  }
  if (keyA) {
      zCoordinate -= xAngle * leftRightSpeed;
      xCoordinate += zAngle * leftRightSpeed;
  }
  if (keyS) {
      zCoordinate -= zAngle * forwardBackwardSpeed;
      xCoordinate -= xAngle * forwardBackwardSpeed;
  }
  if (keyD) {
      zCoordinate += xAngle * leftRightSpeed;
      xCoordinate -= zAngle * leftRightSpeed;
  }

  // move down and up respectively
  if (keyShiftLeft) {
      yCoordinate -= upDownSpeed;
      vLook -= upDownSpeed;
  }
  if (keySpace) {
      yCoordinate += upDownSpeed;
      vLook += upDownSpeed;
  }

  // look up, down, left, right, respectively
  if (key_Up) {
      vLook += lookSpeed;
  }
  if (key_Down) {
      vLook -= lookSpeed;
  }
  if (keyLeft) {
      angle = (angle - Math.PI/180) % (2 * Math.PI);
  }
  if (keyRight) {
      angle = (angle + Math.PI/180) % (2 * Math.PI);
  }

  // set the view matrix and pass it into uniform variable
  viewMatrix.setLookAt(xCoordinate, yCoordinate, zCoordinate, xCoordinate + xAngle, vLook, zCoordinate + zAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  modelMatrix.setTranslate(0, 0, 0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  drawGround(gl, u_ModelMatrix, u_NormalMatrix);  // draws grass and roads
  drawMainBuilding(gl, u_ModelMatrix, u_NormalMatrix);  // draws the main building
  drawRoofs(gl, u_ModelMatrix, u_NormalMatrix); // draws the roofs of the building
  drawRoofEdges(gl, u_ModelMatrix, u_NormalMatrix); // draws the roof edges
  drawDoors(gl, u_ModelMatrix, u_NormalMatrix, mainDoorAngle); // draws the main door
  drawWindows(gl, u_ModelMatrix, u_NormalMatrix); // draws the windows
  drawBin(gl, u_ModelMatrix, u_NormalMatrix); // draws the bin
  drawBenches(gl, u_ModelMatrix, u_NormalMatrix); // draws the benches
  drawLampPost(gl, u_ModelMatrix, u_NormalMatrix); // draws the lamp post
  drawFences(gl, u_ModelMatrix, u_NormalMatrix); // draws the fence
  drawGate(gl, u_ModelMatrix, u_NormalMatrix, gateAngle); // draws the gate
}

function drawBox(gl, u_ModelMatrix, u_NormalMatrix, n) {
  pushMatrix(modelMatrix);

    // pass model matrix to uniform variable
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    // Calculate the normal transformation matrix and pass it to u_NormalMatrix
    g_normalMatrix.setInverseOf(modelMatrix);
    g_normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, g_normalMatrix.elements);

    // draw cubes
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

  modelMatrix = popMatrix();
}
