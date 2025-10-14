function run3DVisualizer(config) {
  let pos, m, v, t, path, state, algo;
  let {
    func, grad, xRange, yRange, start, levels, alpha, canvasSize, graph
  } = config;
  let beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8, beta = 0.9;
  let rmspropBeta = 0.9;

  window.setup = function() {
    createCanvas(canvasSize[0], canvasSize[1], WEBGL);
    pos = createVector(start[0], start[1]);
    m = createVector(0, 0);
    v = createVector(0, 0);
    t = 1;
    path = [];
    path.push(pos.copy());
    algo = getAlgo();

    if (document.getElementById("header")) {
      document.getElementById("header").innerText =
        `Wizualizacja funkcji optymalizacji ${algo} na wykresie ${graph}`;
    }

    state = { pos, m, v, t };
    frameRate(120);
  };

  window.draw = function() {
    background(255);
    orbitControl();
    rotateX(PI / 3.5);

    if(graph != "Himmelblau 3D") {
        scale(60);
    }
    else {
        scale(20);
    }
    let minX = xRange[0], maxX = xRange[1];
    let minY = yRange[0], maxY = yRange[1];
    translate(- (maxX + minX)/2, - (maxY + minY)/2, 0);

    stroke(200);
    fill(240);
    for (let x = minX; x < maxX; x += 0.1) {
      beginShape(TRIANGLE_STRIP);
      for (let y = minY; y <= maxY; y += 0.1) {
        let z1 = func(x, y) * 0.02;
        let z2 = func(x + 0.1, y) * 0.02;
        vertex(x, y, z1);
        vertex(x + 0.1, y, z2);
      }
      endShape();
    }

    let gradVal = grad(state.pos.x, state.pos.y);

    if (algo === "adam") {
      adamStep(state, gradVal, {alpha, beta1, beta2, epsilon});
    } else if (algo === "sgd") {
      sgdStep(state, gradVal, {alpha});
    } else if (algo === "momentum") {
      momentumStep(state, gradVal, {alpha, beta});
    } else if (algo === "nesterov") {
      nesterovStep(state, grad, {alpha, beta});
    } else if (algo === "adagrad") {
      adagradStep(state, gradVal, {alpha: 0.1, epsilon});
    } else if (algo === "rmsprop") {
      rmspropStep(state, gradVal, {alpha: 0.01, beta: rmspropBeta, epsilon});
    }

    path.push(state.pos.copy());
    state.t++;

    stroke(0, 0, 255);
    noFill();
    beginShape();
    for (let p of path) {
      let z = func(p.x, p.y) * 0.02 + 0.01;
      vertex(p.x, p.y, z);
    }
    endShape();

    fill(255, 0, 0);
    noStroke();
    let zNow = func(state.pos.x, state.pos.y) * 0.02;
    push();
    translate(state.pos.x, state.pos.y, zNow);
    sphere(0.1);
    pop();
  };

  function getAlgo() {
    const params = new URLSearchParams(window.location.search);
    return params.get('algo');
  }
}