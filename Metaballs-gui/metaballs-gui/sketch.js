let metaballShader;
let smoothing = 8;
let sizeScale = 1.2;
let distanceScale = 4;

let blob1 = { pos: null, vel: null, size: 50 };
let blob2 = { pos: null, vel: null, size: 50 };

let bridge;
let sensor1Value = 0;
let sensor2Value = 0;

let buffer1 = [];
let buffer2 = [];

function preload() {
  metaballShader = loadShader("metaball.vert", "metaball.frag");
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  noStroke();
  bridge = new SerialBridge();
  bridge.onData("arduino_1", (data) => {
    let values = data.split(",");
    sensor1Value = parseInt(values[0]);
    sensor2Value = parseInt(values[1]);
  });

  blob1.pos = createVector(random(width), random(height));
  blob2.pos = createVector(random(width), random(height));
  blob1.vel = p5.Vector.random2D().mult(2);
  blob2.vel = p5.Vector.random2D().mult(2);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(0);
  metaballShader.setUniform("u_resolution", [width, height]);

  buffer1.push(sensor1Value);
  buffer2.push(sensor2Value);
  if (buffer1.length > smoothing) buffer1.shift();
  if (buffer2.length > smoothing) buffer2.shift();
  let p1Val = average(buffer1);
  let p2Val = average(buffer2);
  let p1Norm = map(p1Val, 0, 1023, 0.0, 1.0, true);
  let p2Norm = map(p2Val, 0, 1023, 0.0, 1.0, true);
  blob1.size = lerp(blob1.size, 40 + p1Norm * 200 * sizeScale, 0.2);
  blob2.size = lerp(blob2.size, 40 + p2Norm * 200 * sizeScale, 0.2);


  let diff = abs(p1Norm - p2Norm);
  let desiredDist = lerp(60, 400, diff * distanceScale * 0.1);
  let dir = p5.Vector.sub(blob2.pos, blob1.pos);
  let currentDist = dir.mag();
  let force = (currentDist - desiredDist) * 0.008;

  if (currentDist > 0.1) dir.normalize().mult(force);
  blob1.vel.add(dir);
  blob2.vel.sub(dir);
  blob1.vel.add(p5.Vector.random2D().mult(0.15));
  blob2.vel.add(p5.Vector.random2D().mult(0.15));
  blob1.vel.mult(0.96);
  blob2.vel.mult(0.96);
  blob1.pos.add(blob1.vel);
  blob2.pos.add(blob2.vel);

  wrapAround(blob1);
  wrapAround(blob2);
  metaballShader.setUniform("u_ball1", [blob1.pos.x, blob1.pos.y, blob1.size]);
  metaballShader.setUniform("u_ball2", [blob2.pos.x, blob2.pos.y, blob2.size]);

  shader(metaballShader);
  beginShape();
  vertex(-1, -1, 0, 0, 0);
  vertex(1, -1, 0, 1, 0);
  vertex(1, 1, 0, 1, 1);
  vertex(-1, 1, 0, 0, 1);
  endShape();
}

function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function wrapAround(b) {
  if (b.pos.x < 0) b.pos.x = width;
  if (b.pos.x > width) b.pos.x = 0;
  if (b.pos.y < 0) b.pos.y = height;
  if (b.pos.y > height) b.pos.y = 0;
}

// let metaballShader;
// let readings = [];
// let currentIndex = 0;

// let smoothing = 5;
// let sizeScale = 120;
// let distanceScale = 2000;

// let blob1 = { pos: null, vel: null, size: 50 };
// let blob2 = { pos: null, vel: null, size: 50 };

// function preload() {
//   metaballShader = loadShader("metaball.vert", "metaball.frag");
//   readings = loadJSON("assets/mock_myowear.json");
// }

// function setup() {
//   createCanvas(windowWidth, windowHeight, WEBGL);
//   noStroke();

//   // Initialize positions and velocities
//   blob1.pos = createVector(random(width), random(height));
//   blob2.pos = createVector(random(width), random(height));
//   blob1.vel = p5.Vector.random2D().mult(2);
//   blob2.vel = p5.Vector.random2D().mult(2);
// }

// function windowResized() {
//   resizeCanvas(windowWidth, windowHeight);
// }

// function draw() {
//   background(0);
//   metaballShader.setUniform("u_resolution", [width, height]);

//   let t = millis() / 1000;
//   let data = readings.data;
//   let idx = Math.floor(t * readings.meta.samplingRate);
//   if (idx >= data.length) idx = data.length - 1;

//   // Moving average smoothing
//   let p1Sum = 0, p2Sum = 0, count = 0;
//   for (let i = max(0, idx - smoothing + 1); i <= idx; i++) {
//     p1Sum += data[i].p1;
//     p2Sum += data[i].p2;
//     count++;
//   }
//   let p1Val = p1Sum / count;
//   let p2Val = p2Sum / count;

//   // Update blob sizes
//   blob1.size = p1Val * sizeScale;
//   blob2.size = p2Val * sizeScale;

//   // Desired distance based on synchrony
//   let diff = Math.abs(p1Val - p2Val);
//   let desiredDist = diff * distanceScale;

//   // --- Simple attraction/repulsion for orbiting dynamics ---
//   let dir = p5.Vector.sub(blob2.pos, blob1.pos);
//   let currentDist = dir.mag();
//   let force = (currentDist - desiredDist) * 0.01; // spring-like

//   if (currentDist > 0.1) dir.normalize().mult(force);
//   blob1.vel.add(dir);
//   blob2.vel.sub(dir);

//   // Add small random wandering
//   blob1.vel.add(p5.Vector.random2D().mult(0.2));
//   blob2.vel.add(p5.Vector.random2D().mult(0.2));

//   // Apply damping
//   blob1.vel.mult(0.95);
//   blob2.vel.mult(0.95);

//   // Update positions
//   blob1.pos.add(blob1.vel);
//   blob2.pos.add(blob2.vel);

//   // Keep blobs within canvas
//   for (let b of [blob1, blob2]) {
//     if (b.pos.x < 0 || b.pos.x > width) b.vel.x *= -1;
//     if (b.pos.y < 0 || b.pos.y > height) b.vel.y *= -1;
//   }

//   // Set shader uniforms
//   metaballShader.setUniform("u_ball1", [blob1.pos.x, blob1.pos.y, blob1.size]);
//   metaballShader.setUniform("u_ball2", [blob2.pos.x, blob2.pos.y, blob2.size]);

//   shader(metaballShader);

//   // Draw full-screen quad
//   beginShape();
//   vertex(-1, -1, 0, 0, 0);
//   vertex(1, -1, 0, 1, 0);
//   vertex(1, 1, 0, 1, 1);
//   vertex(-1, 1, 0, 0, 1);
//   endShape();
// }