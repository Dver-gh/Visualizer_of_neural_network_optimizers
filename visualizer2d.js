function run2DVisualizer(config) {
  let pos, m, v, t, path, state, algo;
  let {
    func, grad, xRange, yRange, start, levels, alpha, canvasSize, is1D, graph
  } = config;
  let beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8, beta = 0.9;
  let rmspropBeta = 0.9;

  window.setup = function() {
    createCanvas(canvasSize[0], canvasSize[1]);
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
    frameRate(60);
  };

  window.draw = function() {
    background(255);

    if (is1D) {
      stroke(200);
      noFill();
      beginShape();
      for (let x = xRange[0]; x <= xRange[1]; x += 0.01) {
        let sx = map(x, xRange[0], xRange[1], 50, width - 50);
        let sy = map(func(x, 0), yRange[0], yRange[1], height - 50, 50);
        vertex(sx, sy);
      }
      endShape();
    } else {
      noFill();
      stroke(200);
      for (let l of levels) {
        beginShape();
        for (let a = 0; a < TWO_PI; a += 0.01) {
          let x = cos(a) * (xRange[1] - xRange[0]) / 2;
          let y = sin(a) * (yRange[1] - yRange[0]) / 2;
          let v = func(x, y);
          if (abs(v - l) < 2) {
            let sx = map(x, xRange[0], xRange[1], 50, width - 50);
            let sy = map(y, yRange[0], yRange[1], height - 50, 50);
            vertex(sx, sy);
          }
        }
        endShape();
      }
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
      let sx = map(p.x, xRange[0], xRange[1], 50, width - 50);
      let sy = is1D
        ? map(func(p.x, 0), yRange[0], yRange[1], height - 50, 50)
        : map(p.y, yRange[0], yRange[1], height - 50, 50);
      vertex(sx, sy);
    }
    endShape();

    fill(255, 0, 0);
    noStroke();
    let sx = map(state.pos.x, xRange[0], xRange[1], 50, width - 50);
    let sy = is1D
      ? map(func(state.pos.x, 0), yRange[0], yRange[1], height - 50, 50)
      : map(state.pos.y, yRange[0], yRange[1], height - 50, 50);
    ellipse(sx, sy, 10, 10);
  };

  function getAlgo() {
    const params = new URLSearchParams(window.location.search);
    return params.get('algo');
  }
}