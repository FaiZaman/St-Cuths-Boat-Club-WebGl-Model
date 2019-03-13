// St Cuth's Boat Club

var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'attribute vec4 a_Normal;\n' +        // Normal
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_NormalMatrix;\n' +
  'uniform mat4 u_ViewMatrix;\n' +
  'uniform mat4 u_ProjMatrix;\n' +
  'uniform vec3 u_LightColor;\n' +     // Light color
  'uniform vec3 u_LightDirection;\n' + // Light direction (in the world coordinate, normalized)
  'varying vec4 v_Color;\n' +
  'uniform bool u_isLighting;\n' +
  'void main() {\n' +
  '  gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;\n' +
  '  if(u_isLighting)\n' +
  '  {\n' +
  '     vec3 normal = normalize((u_NormalMatrix * a_Normal).xyz);\n' +
  '     float nDotL = max(dot(normal, u_LightDirection), 0.0);\n' +
        // Calculate the color due to diffuse reflection
  '     vec3 diffuse = u_LightColor * a_Color.rgb * nDotL;\n' +
  '     v_Color = vec4(diffuse, a_Color.a);\n' +  '  }\n' +
  '  else\n' +
  '  {\n' +
  '     v_Color = a_Color;\n' +
  '  }\n' +
  '}\n';

var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

var modelMatrix = new Matrix4();
var viewMatrix = new Matrix4();
var projMatrix = new Matrix4();
var g_normalMatrix = new Matrix4();  // coordinate transformation matrix for normals

// movement speed and camera rotation
var lookSpeed = 0.01;
var sidesSpeed = 0.1;
var hSpeed = 0.1;
var vSpeed = 0.1;

// keys for looking around
var key_Up = false;
var key_Down = false;
var keyRight = false;
var keyLeft = false;

// keys for moving camera physically around
var keyW = false;
var keyA = false;
var keyS = false;
var keyD = false;
var keyQ = false;
var keyE = false;

// when camera pointing between axes
var xAngle = 1;
var zAngle = 1;

// coordinates for changing camera angles
var xCoordinate = 30;
var yCoordinate = 10;
var zCoordinate = 30;
var vLook = 9.75;

var firstTime = true;
var angle = Math.PI; // radians for calculations

function main() {
  var canvas = document.getElementById('webgl');

  var gl = getWebGLContext(canvas);
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
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  var u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  var u_LightDirection = gl.getUniformLocation(gl.program, 'u_LightDirection');

  // lighting or none
  var u_isLighting = gl.getUniformLocation(gl.program, 'u_isLighting');

  if (!u_ModelMatrix || !u_ViewMatrix || !u_NormalMatrix ||
      !u_ProjMatrix || !u_LightColor || !u_LightDirection ||
      !u_isLighting ) {
    console.log('Failed to Get the storage locations of u_ModelMatrix, u_ViewMatrix, and/or u_ProjMatrix');
    return;
  }

  // set light colour and direction in world coords
  gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);
  var lightDirection = new Vector3([0.5, 3.0, 4.0]);
  lightDirection.normalize();
  gl.uniform3fv(u_LightDirection, lightDirection.elements);

  // calculate proj matrix
  projMatrix.setPerspective(30, canvas.width/canvas.height, 1, 100);

  // pass view and proj matrix to uniform matrix respectively
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);

  var generateScene = function() {
    document.onkeydown = function (ev) {
      keyDown(ev);
    };
    document.onkeyup = function (ev) {
      keyUp(ev);
    };
    draw(gl, u_ModelMatrix, u_NormalMatrix, u_ViewMatrix, u_isLighting);
    requestAnimationFrame(generateScene);
  };
  generateScene();
}

function keyDown(ev) {
  switch (ev.code) {
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
    case 'KeyQ':
        keyQ = true;
        break;
    case 'KeyE':
        keyE = true;
        break;
  }
}

function keyUp(ev) {
  switch (ev.code) {
    case 'ArrowUp':
        key_Up = false;
        break;
    case 'ArrowDown':
        key_Down = false;
        break;
    case 'ArrowRight':
        keyRight = false;
        break;
    case 'ArrowLeft':
        keyLeft = false;
        break;
    case 'KeyW':
        keyW = false;
        break;
    case 'KeyD':
        keyD = false;
        break;
    case 'KeyS':
        keyS = false;
        break;
    case 'KeyA':
        keyA = false;
        break;
    case 'KeyQ':
        keyQ = false;
        break;
    case 'KeyE':
        keyE = false;
        break;
  }
}

function move() { // moves around the scene

  xAngle = Math.cos(angle) - Math.sin(angle);
  zAngle = Math.cos(angle) + Math.sin(angle);

  if (keyLeft) { // look left
      angle = (angle - Math.PI/180) % (2 * Math.PI);
  }
  if (keyRight) { // look right
      angle = (angle + Math.PI/180) % (2 * Math.PI);
  }

  if (key_Up) { // look up
      vLook += lookSpeed;
  }
  if (key_Down) { // look down
      vLook -= lookSpeed;
  }

  if (keyW) { // move forwards
      zCoordinate += zAngle * hSpeed;
      xCoordinate += xAngle * hSpeed;
  }
  if (keyA) { // move left
      zCoordinate -= xAngle * sidesSpeed;
      xCoordinate += zAngle * sidesSpeed;
  }
  if (keyS) { // move back
      zCoordinate -= zAngle * hSpeed;
      xCoordinate -= xAngle * hSpeed;
  }
  if (keyD) { // move right
      zCoordinate += xAngle * sidesSpeed;
      xCoordinate -= zAngle * sidesSpeed;
  }
  if (keyQ) { // move up
      yCoordinate += vSpeed;
      vLook += vSpeed;
  }
  if (keyE) { // move down
      yCoordinate -= vSpeed;
      vLook -= vSpeed;
  }
}

function initCubeVertexBuffers(gl) {
  // create a cube
  //    v6----- v5
  //   /|      /|
  //  v1------v0|
  //  | |     | |
  //  | |v7---|-|v4
  //  |/      |/
  //  v2------v3
  var vertices = new Float32Array([   // coordinates
     0.5, 0.5, 0.5,  -0.5, 0.5, 0.5,  -0.5,-0.5, 0.5,   0.5,-0.5, 0.5, // v0-v1-v2-v3 front
     0.5, 0.5, 0.5,   0.5,-0.5, 0.5,   0.5,-0.5,-0.5,   0.5, 0.5,-0.5, // v0-v3-v4-v5 right
     0.5, 0.5, 0.5,   0.5, 0.5,-0.5,  -0.5, 0.5,-0.5,  -0.5, 0.5, 0.5, // v0-v5-v6-v1 up
    -0.5, 0.5, 0.5,  -0.5, 0.5,-0.5,  -0.5,-0.5,-0.5,  -0.5,-0.5, 0.5, // v1-v6-v7-v2 left
    -0.5,-0.5,-0.5,   0.5,-0.5,-0.5,   0.5,-0.5, 0.5,  -0.5,-0.5, 0.5, // v7-v4-v3-v2 down
     0.5,-0.5,-0.5,  -0.5,-0.5,-0.5,  -0.5, 0.5,-0.5,   0.5, 0.5,-0.5  // v4-v7-v6-v5 back
  ]);


  var colors = new Float32Array([    // colors
    1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v0-v1-v2-v3 front
    1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v0-v3-v4-v5 right
    1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v0-v5-v6-v1 up
    1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v1-v6-v7-v2 left
    1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v7-v4-v3-v2 down
    1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0　    // v4-v7-v6-v5 back
 ]);


  var normals = new Float32Array([    // normal
    0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,  // v0-v1-v2-v3 front
    1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  // v0-v3-v4-v5 right
    0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  // v0-v5-v6-v1 up
   -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  // v1-v6-v7-v2 left
    0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,  // v7-v4-v3-v2 down
    0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0   // v4-v7-v6-v5 back
  ]);


  // Indices of the vertices
  var indices = new Uint8Array([
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
  var indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
    console.log('Failed to create the buffer object');
    return false;
  }

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return indices.length;
}

function initPrismVertexBuffers(gl){

  // create a prism
  var vertices = new Float32Array([ // coordinates
    -0.5,-0.5, 0.5,   0.0, 0.5, 0.5,   0.5,-0.5, 0.5,                   // front
     0.0, 0.5, 0.5,   0.5,-0.5, 0.5,   0.5,-0.5,-0.5,   0.0, 0.5,-0.5,  // right side
    -0.5,-0.5, 0.5,   0.0, 0.5, 0.5,   0.0, 0.5,-0.5,  -0.5,-0.5,-0.5,  // left side
    -0.5,-0.5, 0.5,   0.5,-0.5, 0.5,   0.5,-0.5,-0.5,  -0.5,-0.5,-0.5,  // bottom side
    -0.5,-0.5,-0.5,   0.0, 0.5,-0.5,   0.5,-0.5,-0.5                    // back
  ]);

  var colors = new Float32Array([ // colours, grey - 169, 169, 169
       1.00,    0.00,    0.00,       1.00,    0.00,    0.00,       1.00,    0.00,    0.00,
    169/255, 169/255, 169/255,    169/255, 169/255, 169/255,    169/255, 169/255, 169/255,   169/255, 169/255, 169/255,
    169/255, 169/255, 169/255,    169/255, 169/255, 169/255,    169/255, 169/255, 169/255,   169/255, 169/255, 169/255,
    169/255, 169/255, 169/255,    169/255, 169/255, 169/255,    169/255, 169/255, 169/255,   169/255, 169/255, 169/255,
       1.00,    0.00,    0.00,       1.00,    0.00,    0.00,       1.00,    0.00,    0.00
  ]);

  var normals = new Float32Array([    // normal
    0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,                   // front
    1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  // right
   -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  // left
    0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,  // down
    0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0                    // back
  ]);

  var indices = new Uint8Array([
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
  var indexBuffer = gl.createBuffer();
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
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return false;
  }

  // bind buffer to target add date to buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  // assign buffer to attribute variable
  var a_attribute = gl.getAttribLocation(gl.program, attribute);
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

  var verticesColors = new Float32Array([
    // Vertex coordinates and color (for axes)
    -20.0,  0.0,   0.0,  1.0,  1.0,  1.0,  // (x,y,z), (r,g,b)
     20.0,  0.0,   0.0,  1.0,  1.0,  1.0,
     0.0,  20.0,   0.0,  1.0,  1.0,  1.0,
     0.0, -20.0,   0.0,  1.0,  1.0,  1.0,
     0.0,   0.0, -20.0,  1.0,  1.0,  1.0,
     0.0,   0.0,  20.0,  1.0,  1.0,  1.0
  ]);
  var n = 6;

  // create buffer
  var vertexColorBuffer = gl.createBuffer();
  if (!vertexColorBuffer) {
    console.log('Failed to create the buffer object');
    return false;
  }

  // bind buffer to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesColors, gl.STATIC_DRAW);

  var FSIZE = verticesColors.BYTES_PER_ELEMENT;

  // get storage location of a_Position
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }

  // assign and enable buffer
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 6, 0);
  gl.enableVertexAttribArray(a_Position);

  // same as above but for a_Colour, and unbind at the end
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 6, FSIZE * 3);
  gl.enableVertexAttribArray(a_Color);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return n;
}

var g_matrixStack = []; // Array for storing a matrix
function pushMatrix(m) { // Store the specified matrix to the array
  var m2 = new Matrix4(m);
  g_matrixStack.push(m2);
}

function popMatrix() { // Retrieve the matrix from the array
  return g_matrixStack.pop();
}

function draw(gl, u_ModelMatrix, u_NormalMatrix, u_ViewMatrix, u_isLighting) {

  // move if keys are pressed
  move();

  // set the view matrix and pass it into uniform variable
  viewMatrix.setLookAt(xCoordinate, yCoordinate, zCoordinate, xCoordinate + xAngle, vLook, zCoordinate + zAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.uniform1i(u_isLighting, false); // no lighting

  // draw x and y axes; set and pass model matrix to uniform variable
  var n = initAxesVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  modelMatrix.setTranslate(0, 0, 0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.LINES, 0, n);

  gl.uniform1i(u_isLighting, true); // apply lighting

  // set vertex coords and colour for cube
  n = initCubeVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // model the ground
  pushMatrix(modelMatrix);
    modelMatrix.translate(0.0, -2.0, 0.0);
    modelMatrix.scale(50.0, 0.0, 50.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // model the main building
  pushMatrix(modelMatrix);
    modelMatrix.translate(-1.5, 0.0, 0.0);
    modelMatrix.scale(11.6, 4.0, 4.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // model the side (tall) building
  pushMatrix(modelMatrix);
    modelMatrix.translate(6.3, 1.25, 0.0);
    modelMatrix.scale(4.0, 6.5, 4.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // set vertex coords and colour for prism (roof)
  n = initPrismVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // model the main roof
  pushMatrix(modelMatrix);
    modelMatrix.translate(-1.5, 3.5, 0.0);
    modelMatrix.rotate(90, 0, 1, 0);
    modelMatrix.scale(4.5, 3.0, 11.6);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // model the side roof
  pushMatrix(modelMatrix);
    modelMatrix.translate(6.3, 5.7, 0.0);
    modelMatrix.scale(4.5, 2.5, 4.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // model the front-small roof
  pushMatrix(modelMatrix);
    modelMatrix.translate(-3.0, 3.0, 1.8);
    modelMatrix.scale(3.2, 2.0, 1.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();
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
