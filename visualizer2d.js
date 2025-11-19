(function () {
  'use strict';

  function safeParseFloat(v, fallback) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }

  const PARAM_MAP = {
    learning_rate: 'alpha',
    learningrate: 'alpha',
    alpha: 'alpha',
    momentum: 'rho',
    rho: 'rho',
    beta: 'rho',
    beta1: 'beta1',
    beta2: 'beta2',
    epsilon: 'epsilon',
    eps: 'epsilon'
  };

  function normalizeParamKey(name) {
    if (!name) return null;
    const k = name.toString().toLowerCase().replace(/^param-/, '').replace(/\s+/g, '_');
    return PARAM_MAP[k] || k;
  }

  function readParamsFromDOM() {
    const container = document.getElementById('parameters');
    if (!container) return {};
    const inputs = container.querySelectorAll('input, select');
    const out = {};
    inputs.forEach(inp => {
      const rawName = inp.name || inp.id || inp.dataset.param || inp.dataset.mapped;
      const key = normalizeParamKey(rawName);
      if (!key) return;
      const raw = inp.value;
      if (raw === '') return;
      const val = safeParseFloat(raw, NaN);
      if (Number.isNaN(val)) return;
      out[key] = val;
    });
    return out;
  }

  function loadOptimizerParameters() {
    if (window.__optimizer_params_all) return Promise.resolve(window.__optimizer_params_all);
    return fetch('../optimizersParameters.json')
      .then(r => r.ok ? r.json() : {})
      .then(json => {
        window.__optimizer_params_all = json || {};
        return window.__optimizer_params_all;
      })
      .catch(() => {
        window.__optimizer_params_all = {};
        return window.__optimizer_params_all;
      });
  }

  function mapAlgoKey(algoName) {
    if (!algoName) return null;
    const map = {
      adam: 'Adam',
      sgd: 'SGD',
      momentum: 'SGDMomentum',
      nesterov: 'NesterovMomentum',
      adagrad: 'Adagrad',
      rmsprop: 'RMSprop'
    };
    return map[(algoName || '').toLowerCase()] || null;
  }

  function extractDefaultsForAlgo(allParams, algoKey) {
    if (!allParams || !algoKey || !allParams[algoKey]) return {};
    const p = allParams[algoKey];
    const out = {};
    for (const k of Object.keys(p)) {
      const item = p[k];
      if (item && (item.default_value !== undefined)) out[normalizeParamKey(k)] = item.default_value;
      else if (item && (item.step !== undefined)) out[normalizeParamKey(k)] = item.step;
    }
    return out;
  }

  function createStateObjects(start) {
    return {
      pos: (typeof createVector === 'function') ? createVector(start[0], start[1]) : { x: start[0], y: start[1] },
      m: (typeof createVector === 'function') ? createVector(0, 0) : { x: 0, y: 0 },
      v: (typeof createVector === 'function') ? createVector(0, 0) : { x: 0, y: 0 },
      t: 1
    };
  }

  window.run2DVisualizer = function (config) {
    let local = Object.assign({}, config);
    let paramsLocal = {
      alpha: local.alpha !== undefined ? local.alpha : 0.01,
      rho: local.rho !== undefined ? local.rho : 0.9,
      beta1: local.beta1 !== undefined ? local.beta1 : 0.9,
      beta2: local.beta2 !== undefined ? local.beta2 : 0.999,
      epsilon: local.epsilon !== undefined ? local.epsilon : 1e-8,
      rmspropBeta: local.rmspropBeta !== undefined ? local.rmspropBeta : 0.9
    };

    let stateObj = null;
    let path = [];
    let algo = null;

    function applyParamsToLocal(p) {
      if (!p) return;
      if (p.alpha !== undefined) paramsLocal.alpha = p.alpha;
      if (p.rho !== undefined) paramsLocal.rho = p.rho;
      if (p.beta !== undefined) paramsLocal.rho = p.beta;
      if (p.beta1 !== undefined) paramsLocal.beta1 = p.beta1;
      if (p.beta2 !== undefined) paramsLocal.beta2 = p.beta2;
      if (p.epsilon !== undefined) paramsLocal.epsilon = p.epsilon;
      if (p.rmspropBeta !== undefined) paramsLocal.rmspropBeta = p.rmspropBeta;
    }

    function initState() {
      stateObj = createStateObjects(local.start || [0, 0]);
      path = [ (typeof stateObj.pos.copy === 'function') ? stateObj.pos.copy() : { x: stateObj.pos.x, y: stateObj.pos.y } ];
      window.state = stateObj;
      window.path = path;
    }

    function setupParamsFromSources() {
      const urlAlgo = (new URLSearchParams(window.location.search)).get('algo');
      algo = (typeof urlAlgo === 'string') ? urlAlgo.toLowerCase() : 'adam';
      return loadOptimizerParameters()
        .then(all => {
          const algoKey = mapAlgoKey(algo);
          const defaults = extractDefaultsForAlgo(all, algoKey);
          applyParamsToLocal(defaults);
          const domParams = readParamsFromDOM();
          applyParamsToLocal(domParams);
          window.__viz_effective_params = Object.assign({}, paramsLocal, defaults, domParams);
        });
    }

    window.setup = function () {
      const cnv = createCanvas(local.canvasSize[0], local.canvasSize[1]);
      const canvasElt = cnv.elt;
      const container = document.getElementById('visualizerContainer');
      if (container && canvasElt && canvasElt.parentElement !== container) {
        container.appendChild(canvasElt);
        canvasElt.style.display = 'block';
      }

      initState();

      if (document.getElementById('header')) {
        document.getElementById('header').innerText = `Wizualizacja funkcji optymalizacji ${algo} na wykresie ${local.graph || ''}`;
      }

      frameRate(60);
      window.grad = local.grad;
      window.algo = algo;

      attachRecalcButton();
    };

    window.draw = function () {
      if (!stateObj || !stateObj.pos) return;
      background(255);

      if (local.is1D) {
        stroke(200);
        noFill();
        beginShape();
        for (let x = local.xRange[0]; x <= local.xRange[1]; x += 0.01) {
          let sx = map(x, local.xRange[0], local.xRange[1], 50, width - 50);
          let sy = map(local.func(x, 0), local.yRange[0], local.yRange[1], height - 50, 50);
          vertex(sx, sy);
        }
        endShape();
      } else {
        noFill();
        stroke(200);
        for (let l of local.levels) {
          beginShape();
          for (let a = 0; a < TWO_PI; a += 0.01) {
            let x = cos(a) * (local.xRange[1] - local.xRange[0]) / 2;
            let y = sin(a) * (local.yRange[1] - local.yRange[0]) / 2;
            let v = local.func(x, y);
            if (abs(v - l) < 2) {
              let sx = map(x, local.xRange[0], local.xRange[1], 50, width - 50);
              let sy = map(y, local.yRange[0], local.yRange[1], height - 50, 50);
              vertex(sx, sy);
            }
          }
          endShape();
        }
      }

      const gradVal = local.grad(stateObj.pos.x, stateObj.pos.y);

      if (algo === 'adam') {
        adamStep(stateObj, gradVal, { alpha: paramsLocal.alpha, beta1: paramsLocal.beta1, beta2: paramsLocal.beta2, epsilon: paramsLocal.epsilon });
      } else if (algo === 'sgd') {
        sgdStep(stateObj, gradVal, { alpha: paramsLocal.alpha });
      } else if (algo === 'sgdmomentum') {
        momentumStep(stateObj, gradVal, { alpha: paramsLocal.alpha, rho: paramsLocal.rho });
      } else if (algo === 'nesterovmomentum') {
        nesterovStep(stateObj, local.grad, { alpha: paramsLocal.alpha, rho: paramsLocal.rho });
      } else if (algo === 'adagrad') {
        adagradStep(stateObj, gradVal, { alpha: paramsLocal.alpha, epsilon: paramsLocal.epsilon });
      } else if (algo === 'rmsprop') {
        rmspropStep(stateObj, gradVal, { alpha: paramsLocal.alpha, rho: paramsLocal.rmspropBeta, epsilon: paramsLocal.epsilon });
      }

      path.push( (typeof stateObj.pos.copy === 'function') ? stateObj.pos.copy() : { x: stateObj.pos.x, y: stateObj.pos.y } );
      stateObj.t++;

      stroke(43, 108, 255);
      noFill();
      beginShape();
      for (let p of path) {
        let sx = map(p.x, local.xRange[0], local.xRange[1], 50, width - 50);
        let sy = local.is1D
          ? map(local.func(p.x, 0), local.yRange[0], local.yRange[1], height - 50, 50)
          : map(p.y, local.yRange[0], local.yRange[1], height - 50, 50);
        vertex(sx, sy);
      }
      endShape();

      fill(255, 77, 77);
      noStroke();
      let sx = map(stateObj.pos.x, local.xRange[0], local.xRange[1], 50, width - 50);
      let sy = local.is1D
        ? map(local.func(stateObj.pos.x, 0), local.yRange[0], local.yRange[1], height - 50, 50)
        : map(stateObj.pos.y, local.yRange[0], local.yRange[1], height - 50, 50);
      ellipse(sx, sy, 10, 10);
    };

    function attachRecalcButton() {
      const btn = document.getElementById('recalcBtn');
      if (!btn) return;
      window.__viz_recalc = function() {
        const dom = readParamsFromDOM();
        applyParamsToLocal(dom);
        if (stateObj) {
          stateObj.pos.x = local.start[0];
          stateObj.pos.y = local.start[1];
          stateObj.m.x = 0; stateObj.m.y = 0;
          stateObj.v.x = 0; stateObj.v.y = 0;
          stateObj.t = 1;
          path.length = 0;
          path.push((typeof stateObj.pos.copy === 'function') ? stateObj.pos.copy() : { x: stateObj.pos.x, y: stateObj.pos.y });
          window.__viz_effective_params = Object.assign({}, paramsLocal, dom);
        } else {
          if (typeof window.__viz_config !== 'undefined' && typeof window.initVisualizer2D === 'function') {
            window.__viz_started = false;
            window.initVisualizer2D(window.__viz_config);
          }
        }
      };

      if (!btn.__viz_attached) {
        btn.addEventListener('click', () => {
          if (typeof window.__viz_recalc === 'function') window.__viz_recalc();
        });
        btn.__viz_attached = true;
      }
    }

    return setupParamsFromSources();
  };

  window.initVisualizer2D = function (config) {
    if (!config) return;
    window.__viz_config = config;
    if (!window.__viz_started) {
      window.__viz_started = true;
      window.run2DVisualizer(config).catch ? window.run2DVisualizer(config) : null;
    }
    const mover = setInterval(() => {
      const container = document.getElementById('visualizerContainer');
      const canvas = document.querySelector('canvas');
      if (container && canvas && canvas.parentElement !== container) {
        container.appendChild(canvas);
        canvas.style.display = 'block';
      }
      if (canvas) clearInterval(mover);
    }, 50);
  };

  if (typeof window !== 'undefined') {
    window.__viz_recalc = window.__viz_recalc || function __viz_recalc_stub() {
      console.warn('.__viz_recalc stub called — p5 jeszcze nie wystartował. Wykonuję fallback init.');
      if (typeof window.__viz_config !== 'undefined' && typeof window.initVisualizer2D === 'function') {
        window.__viz_started = false;
        window.initVisualizer2D(window.__viz_config);
      }
    };

    window.resetVisualizer = window.resetVisualizer || function resetVisualizer_stub() {
      console.warn('resetVisualizer stub called — p5 może jeszcze nie wystartował. Wykonuję fallback init.');
      if (typeof window.__viz_config !== 'undefined' && typeof window.initVisualizer2D === 'function') {
        window.__viz_started = false;
        window.initVisualizer2D(window.__viz_config);
      }
    };
  }
})();