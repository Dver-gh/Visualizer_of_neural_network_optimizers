function run2DVisualizer(config) {
  let pos, m, v, t, path, state, algo;
  let {
    func, grad, xRange, yRange, start, levels, alpha, canvasSize, is1D, graph
  } = config;
  let beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8, beta = 0.9;
  let rmspropBeta = 0.9;

  window.setup = function() {
    const cnv = createCanvas(canvasSize[0], canvasSize[1]);
    const canvasElt = cnv.elt;
    const container = document.getElementById('visualizerContainer');
    if (container && canvasElt && canvasElt.parentElement !== container) {
      container.appendChild(canvasElt);
      canvasElt.style.display = 'block';
    }

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

    window.state = state;
    window.path = path;
    window.grad = grad;
    window.algo = algo;
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
    return params.get('algo') || 'adam';
  }
}

function initVisualizer2D(config) {
  if (!config) return;
  window.__viz_config = config;

  function clearCanvas() {
    const old = document.querySelector('#visualizerContainer canvas');
    if (old && old.parentElement) old.parentElement.removeChild(old);
  }

  function startOnce() {
    if (!window.__viz_started) {
      run2DVisualizer(config);
      window.__viz_started = true;
    }
  }

  function moveCanvasToContainer() {
    const container = document.getElementById('visualizerContainer');
    const canvas = document.querySelector('canvas');
    if (container && canvas && canvas.parentElement !== container) {
      container.appendChild(canvas);
      canvas.style.display = 'block';
    }
  }

  window.resetVisualizer = function() {
    if (window.state && window.path) {
      const s = window.__viz_config.start;
      window.state.pos.set(s[0], s[1]);
      window.state.m.set(0, 0);
      window.state.v.set(0, 0);
      window.state.t = 1;
      window.path.length = 0;
      window.path.push(window.state.pos.copy());
    } else {
      clearCanvas();
      window.__viz_started = false;
      startOnce();
    }
  };

  startOnce();

  const moveInterval = setInterval(() => {
    moveCanvasToContainer();
    const canvas = document.querySelector('canvas');
    if (canvas) {
      clearInterval(moveInterval);
    }
  }, 50);
}

if (typeof window !== 'undefined') {
  window.moveCanvasToContainer = function() {
    const container = document.getElementById('visualizerContainer');
    const canvas = document.querySelector('canvas');
    if (container && canvas && canvas.parentElement !== container) {
      container.appendChild(canvas);
      canvas.style.display = 'block';
    }
  };
}