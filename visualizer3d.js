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
      momentum: 'SGD_z_Momentum',
      sgdmomentum: 'SGDMomentum',
      nesterov: 'Nesterov_Momentum',
      nesterovmomentum: 'NesterovMomentum',
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

  window.run3DVisualizer = function (config) {
    const local = Object.assign({}, config);
    const paramsLocal = {
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

    function initStateImmediate() {
      stateObj = createStateObjects(local.start || [0, 0]);
      path = [ (typeof stateObj.pos.copy === 'function') ? stateObj.pos.copy() : { x: stateObj.pos.x, y: stateObj.pos.y } ];
      window.state = stateObj;
      window.path = path;
    }

    function setupParamsFromSources() {
      const urlAlgo = (new URLSearchParams(window.location.search)).get('algo') || 'adam';
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
      const cnv = createCanvas(local.canvasSize[0], local.canvasSize[1], WEBGL);
      const canvasElt = cnv.elt;
      const container = document.getElementById('visualizerContainer');
      if (container && canvasElt && canvasElt.parentElement !== container) {
        container.appendChild(canvasElt);
        canvasElt.style.display = 'block';
      }

      initStateImmediate();

      setupParamsFromSources().catch(() => {});

      if (document.getElementById('header')) {
        document.getElementById('header').innerText = `Wizualizacja funkcji optymalizacji ${algo || ''} na wykresie ${local.graph || ''}`;
      }

      frameRate(60);
      window.grad = local.grad;
      window.algo = algo;

      attachRecalcButton();
    };

    window.draw = function () {
      if (!stateObj || !stateObj.pos) return;

      background(255);
      orbitControl();
      rotateX(PI / 3.5);

      if (local.graph !== "Himmelblau 3D") scale(60);
      let minX = local.xRange[0], maxX = local.xRange[1];
      let minY = local.yRange[0], maxY = local.yRange[1];
      translate(- (maxX + minX)/2, - (maxY + minY)/2, 0);

      stroke(200);
      fill(240);
      for (let x = minX; x < maxX; x += 0.1) {
        beginShape(TRIANGLE_STRIP);
        for (let y = minY; y <= maxY; y += 0.1) {
          let z1 = local.func(x, y) * 0.02;
          let z2 = local.func(x + 0.1, y) * 0.02;
          vertex(x, y, z1);
          vertex(x + 0.1, y, z2);
        }
        endShape();
      }

      const gradVal = typeof local.grad === 'function' ? local.grad(stateObj.pos.x, stateObj.pos.y) : gradVal;

      if (algo === 'adam') {
        adamStep(stateObj, gradVal, { alpha: paramsLocal.alpha, beta1: paramsLocal.beta1, beta2: paramsLocal.beta2, epsilon: paramsLocal.epsilon });
      } else if (algo === 'sgd') {
        sgdStep(stateObj, gradVal, { alpha: paramsLocal.alpha });
      } else if (algo === 'momentum' || algo === 'sgdmomentum') {
        momentumStep(stateObj, gradVal, { alpha: paramsLocal.alpha, rho: paramsLocal.rho });
      } else if (algo === 'nesterov' || algo === 'nesterovmomentum') {
        nesterovStep(stateObj, local.grad, { alpha: paramsLocal.alpha, rho: paramsLocal.rho });
      } else if (algo === 'adagrad') {
        adagradStep(stateObj, gradVal, { alpha: paramsLocal.alpha, epsilon: paramsLocal.epsilon });
      } else if (algo === 'rmsprop') {
        rmspropStep(stateObj, gradVal, { alpha: paramsLocal.alpha, rho: paramsLocal.rmspropBeta, epsilon: paramsLocal.epsilon });
      }

      path.push((typeof stateObj.pos.copy === 'function') ? stateObj.pos.copy() : { x: stateObj.pos.x, y: stateObj.pos.y });
      stateObj.t++;

      stroke(43, 108, 255);
      noFill();
      beginShape();
      for (let p of path) {
        let z = local.func(p.x, p.y) * 0.02 + 0.01;
        vertex(p.x, p.y, z);
      }
      endShape();

      fill(255, 77, 77);
      noStroke();
      let zNow = local.func(stateObj.pos.x, stateObj.pos.y) * 0.02;
      push();
      translate(stateObj.pos.x, stateObj.pos.y, zNow);
      sphere(0.1);
      pop();
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
          if (typeof window.__viz3d_config !== 'undefined' && typeof window.initVisualizer3D === 'function') {
            window.__viz3d_started = false;
            window.initVisualizer3D(window.__viz3d_config);
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

  window.initVisualizer3D = function (config) {
    if (!config) return;
    window.__viz3d_config = config;
    if (!window.__viz3d_started) {
      window.__viz3d_started = true;
      window.run3DVisualizer(config);
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
    window.__viz_recalc = window.__viz_recalc || function __viz3d_recalc_safe() {
      console.warn('__viz_recalc (safe stub) called');
      if (typeof window.__viz_recalc === 'function' && window.__viz_recalc !== __viz3d_recalc_safe) {
        try { window.__viz_recalc(); return; } catch (e) {}
      }
      if (typeof window.__viz3d_config !== 'undefined' && typeof window.initVisualizer3D === 'function') {
        window.__viz3d_started = false;
        window.initVisualizer3D(window.__viz3d_config);
      } else {
        console.warn('Brak configu do inicjalizacji 3D visualizera.');
      }
    };

    window.resetVisualizer3D = window.resetVisualizer3D || function resetVisualizer3D_safe() {
      try {
        if (window.state && window.state.pos) {
          const cfg = window.__viz3d_config || {};
          const start = (cfg.start && Array.isArray(cfg.start)) ? cfg.start : [0, 0];
          if (typeof window.state.pos.set === 'function') window.state.pos.set(start[0], start[1]);
          else { window.state.pos.x = start[0]; window.state.pos.y = start[1]; }
          if (window.state.m) {
            if (typeof window.state.m.set === 'function') window.state.m.set(0, 0);
            else { window.state.m.x = 0; window.state.m.y = 0; }
          }
          if (window.state.v) {
            if (typeof window.state.v.set === 'function') window.state.v.set(0, 0);
            else { window.state.v.x = 0; window.state.v.y = 0; }
          }
          window.state.t = 1;
          if (!window.path) window.path = [];
          window.path.length = 0;
          if (typeof window.state.pos.copy === 'function') window.path.push(window.state.pos.copy());
          else window.path.push({ x: window.state.pos.x, y: window.state.pos.y });
          window.__viz_effective_params = window.__viz_effective_params || {};
          console.info('resetVisualizer3D: zresetowano stan visualizera 3D.');
          return;
        }
      } catch (err) {
        console.warn('resetVisualizer3D: błąd podczas resetu stanu:', err);
      }

      if (typeof window.__viz3d_config !== 'undefined' && typeof window.initVisualizer3D === 'function') {
        window.__viz3d_started = false;
        window.initVisualizer3D(window.__viz3d_config);
        console.info('resetVisualizer3D: zainicjowano visualizer 3D z config.');
        return;
      }

      console.warn('resetVisualizer3D: brak aktywnego stanu i brak configu do inicjalizacji.');
    };
  }
})();