function _getParam(params, keyOrKeys, def) {
  if (!params) return def;
  const synonymsMap = {
    learning_rate: ['learning_rate', 'alpha', 'eta'],
    momentum: ['momentum', 'mu'],
    rho: ['rho', 'decay'],
    beta1: ['beta1', 'beta'],
    beta2: ['beta2'],
    epsilon: ['epsilon', 'eps']
  };

  const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];

  for (let k of keys) {
    const candidates = synonymsMap[k] || [k];
    for (let cand of candidates) {
      if (params[cand] !== undefined) return params[cand];
    }
    if (params[k] !== undefined) return params[k];
  }
  return def;
}

function _ensureStateVectors(state) {
  if (!state.m) {
    state.m = (typeof createVector === 'function') ? createVector(0,0) : {x:0,y:0};
  }
  if (!state.v) {
    state.v = (typeof createVector === 'function') ? createVector(0,0) : {x:0,y:0};
  }
  if (state.pos && typeof state.pos.x === 'undefined') {
    state.pos = (typeof createVector === 'function') ? createVector(state.pos[0]||0, state.pos[1]||0) : {x:(state.pos[0]||0), y:(state.pos[1]||0)};
  }
  if (typeof state.t !== 'number') state.t = 0;
}


function sgdStep(state, grad, params) {
  _ensureStateVectors(state);
  const alpha = _getParam(params, 'learning_rate', 0.01);
  state.pos.x -= alpha * grad.x;
  state.pos.y -= alpha * grad.y;
  state.t++;
}

function momentumStep(state, grad, params) {
  _ensureStateVectors(state);
  const alpha = _getParam(params, 'learning_rate', 0.01);
  const mu = _getParam(params, 'momentum', 0.9);

  state.m.x = mu * state.m.x - alpha * grad.x;
  state.m.y = mu * state.m.y - alpha * grad.y;

  state.pos.x += state.m.x;
  state.pos.y += state.m.y;

  state.t++;
}

function nesterovStep(state, gradFuncOrVec, params) {
  _ensureStateVectors(state);
  const alpha = _getParam(params, 'learning_rate', 0.01);
  const mu = _getParam(params, 'momentum', 0.9);

  if (typeof gradFuncOrVec === 'function') {
    const lookx = state.pos.x + mu * state.m.x;
    const looky = state.pos.y + mu * state.m.y;
    const g = gradFuncOrVec(lookx, looky);

    state.m.x = mu * state.m.x - alpha * g.x;
    state.m.y = mu * state.m.y - alpha * g.y;

    state.pos.x += state.m.x;
    state.pos.y += state.m.y;
  } else {
    state.m.x = mu * state.m.x - alpha * gradFuncOrVec.x;
    state.m.y = mu * state.m.y - alpha * gradFuncOrVec.y;
    state.pos.x += state.m.x;
    state.pos.y += state.m.y;
  }

  state.t++;
}

function adagradStep(state, grad, params) {
  _ensureStateVectors(state);
  const alpha = _getParam(params, 'learning_rate', 0.1);
  const epsilon = _getParam(params, 'epsilon', 1e-8);
  state.v.x += grad.x * grad.x;
  state.v.y += grad.y * grad.y;
  state.pos.x -= alpha * grad.x / (Math.sqrt(state.v.x + epsilon));
  state.pos.y -= alpha * grad.y / (Math.sqrt(state.v.y + epsilon));
  state.t++;
}

function rmspropStep(state, grad, params) {
  _ensureStateVectors(state);
  const alpha = _getParam(params, 'learning_rate', 0.01);
  const rho = _getParam(params, 'rho', 0.9);
  const epsilon = _getParam(params, 'epsilon', 1e-8);

  state.v.x = rho * state.v.x + (1 - rho) * (grad.x * grad.x);
  state.v.y = rho * state.v.y + (1 - rho) * (grad.y * grad.y);

  state.pos.x -= alpha * grad.x / (Math.sqrt(state.v.x + epsilon));
  state.pos.y -= alpha * grad.y / (Math.sqrt(state.v.y + epsilon));
  state.t++;
}

function adamStep(state, grad, params) {
  _ensureStateVectors(state);
  const alpha = _getParam(params, 'learning_rate', 0.001);
  const beta1 = _getParam(params, 'beta1', 0.9);
  const beta2 = _getParam(params, 'beta2', 0.999);
  const epsilon = _getParam(params, 'epsilon', 1e-8);

  state.t = (typeof state.t === 'number') ? state.t + 1 : 1;

  state.m.x = beta1 * state.m.x + (1 - beta1) * grad.x;
  state.m.y = beta1 * state.m.y + (1 - beta1) * grad.y;

  state.v.x = beta2 * state.v.x + (1 - beta2) * grad.x * grad.x;
  state.v.y = beta2 * state.v.y + (1 - beta2) * grad.y * grad.y;

  const mHatX = state.m.x / (1 - Math.pow(beta1, state.t));
  const mHatY = state.m.y / (1 - Math.pow(beta1, state.t));
  const vHatX = state.v.x / (1 - Math.pow(beta2, state.t));
  const vHatY = state.v.y / (1 - Math.pow(beta2, state.t));

  const denomX = Math.sqrt(vHatX) + epsilon;
  const denomY = Math.sqrt(vHatY) + epsilon;

  if (!Number.isFinite(mHatX) || !Number.isFinite(mHatY) || !Number.isFinite(denomX) || !Number.isFinite(denomY)) {
    console.warn('adamStep: non-finite values detected, skipping update', {mHatX,mHatY,denomX,denomY,grad, t: state.t});
  } else {
    state.pos.x -= alpha * (mHatX / denomX);
    state.pos.y -= alpha * (mHatY / denomY);
  }
}