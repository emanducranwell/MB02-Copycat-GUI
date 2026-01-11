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

let saveButton;
let dataLog = [];

let totalSamples = 0;
let mergedSamples = 0;

let mergeThreshold = 0.95;

let logEveryNFrames = 1;



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

  saveButton = createButton("Save Data");
  saveButton.position(windowWidth-150, windowHeight-100);
  saveButton.style("padding", "10px 14px",);
  saveButton.style("border-radius", "999px"); 
  saveButton.style("border", "none"); 
  saveButton.mousePressed(saveDataAsJSON);
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

  let d = p5.Vector.dist(blob1.pos, blob2.pos);
  let r1 = blob1.size * 0.5;
  let r2 = blob2.size * 0.5;
  let isMerged = d < (r1 + r2) * mergeThreshold;

  if (frameCount % logEveryNFrames === 0) {
    totalSamples++;
    if (isMerged) mergedSamples++;

    dataLog.push({
        t_ms: millis(),
        frame: frameCount,

        sensor1_raw: sensor1Value,
        sensor2_raw: sensor2Value,
        sensor1_avg: p1Val,
        sensor2_avg: p2Val,
        p1Norm,
        p2Norm,
        blob1: { x: blob1.pos.x, y: blob1.pos.y, size: blob1.size },
        blob2: { x: blob2.pos.x, y: blob2.pos.y, size: blob2.size },

        distance: d,
      
        merged: isMerged
  });
  

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

function saveDataAsJSON() {
   
    let chameleonIndex = totalSamples > 0 ? mergedSamples / totalSamples : 0;
  
    let exportObj = {
      context: {
        createdISO: new Date().toISOString(),
        smoothing,
        sizeScale,
        distanceScale,
        mergeThreshold,
        logEveryNFrames
      },
      summary: {
        totalSamples,
        mergedSamples,
        chameleonIndex // proportion of time merged (0..1)
      },
      samples: dataLog
    };
  
    saveJSON(exportObj, "metaballs_chameleon_data.json");
  }
