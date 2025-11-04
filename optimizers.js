function adamStep(state, grad, params) {
    state.m.x = params.beta1 * state.m.x + (1 - params.beta1) * grad.x;
    state.m.y = params.beta1 * state.m.y + (1 - params.beta1) * grad.y;
    state.v.x = params.beta2 * state.v.x + (1 - params.beta2) * grad.x * grad.x;
    state.v.y = params.beta2 * state.v.y + (1 - params.beta2) * grad.y * grad.y;
    let mHat = createVector(state.m.x / (1 - params.beta1 ** state.t), state.m.y / (1 - params.beta1 ** state.t));
    let vHat = createVector(state.v.x / (1 - params.beta2 ** state.t), state.v.y / (1 - params.beta2 ** state.t));
    state.pos.x -= params.alpha * mHat.x / (sqrt(vHat.x) + params.epsilon);
    state.pos.y -= params.alpha * mHat.y / (sqrt(vHat.y) + params.epsilon);
    state.t++;
}

function _getParam(params, keys, def) {
  for (let k of keys) {
    if (params && params[k] !== undefined) return params[k];
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
  if (!state.t) state.t = 1;
}

function sgdStep(state, grad, params) {
  _ensureStateVectors(state);
  const alpha = _getParam(params, ['alpha','learning_rate'], 0.01);
  state.pos.x -= alpha * grad.x;
  state.pos.y -= alpha * grad.y;
  state.t++;
}

function momentumStep(state, grad, params) {
  _ensureStateVectors(state);
  const alpha = _getParam(params, ['alpha','learning_rate'], 0.01);
  const rho = _getParam(params, ['rho','beta','momentum'], 0.9);

  state.m.x = rho * state.m.x - alpha * grad.x;
  state.m.y = rho * state.m.y - alpha * grad.y;

  state.pos.x += state.m.x;
  state.pos.y += state.m.y;

  state.t++;
}

function nesterovStep(state, gradFuncOrVec, params) {
  _ensureStateVectors(state);
  const alpha = _getParam(params, ['alpha','learning_rate'], 0.01);
  const rho = _getParam(params, ['rho','beta','momentum'], 0.9);

  if (typeof gradFuncOrVec === 'function') {
    const lookx = state.pos.x + rho * state.m.x;
    const looky = state.pos.y + rho * state.m.y;
    const g = gradFuncOrVec(lookx, looky);

    state.m.x = rho * state.m.x - alpha * g.x;
    state.m.y = rho * state.m.y - alpha * g.y;

    state.pos.x += state.m.x;
    state.pos.y += state.m.y;
  } else {
    state.m.x = rho * state.m.x - alpha * gradFuncOrVec.x;
    state.m.y = rho * state.m.y - alpha * gradFuncOrVec.y;
    state.pos.x += state.m.x;
    state.pos.y += state.m.y;
  }

  state.t++;
}

function adagradStep(state, grad, params) {
  _ensureStateVectors(state);
  const alpha = _getParam(params, ['alpha','learning_rate'], 0.1);
  const epsilon = _getParam(params, ['epsilon','eps'], 1e-8);
  state.v.x += grad.x * grad.x;
  state.v.y += grad.y * grad.y;
  state.pos.x -= alpha * grad.x / (Math.sqrt(state.v.x) + epsilon);
  state.pos.y -= alpha * grad.y / (Math.sqrt(state.v.y) + epsilon);
  state.t++;
}

function rmspropStep(state, grad, params) {
  _ensureStateVectors(state);
  const alpha = _getParam(params, ['alpha','learning_rate'], 0.01);
  const rho = _getParam(params, ['rho','beta','momentum'], 0.9);
  const epsilon = _getParam(params, ['epsilon','eps'], 1e-8);

  state.v.x = rho * state.v.x + (1 - rho) * (grad.x * grad.x);
  state.v.y = rho * state.v.y + (1 - rho) * (grad.y * grad.y);

  state.pos.x -= alpha * grad.x / (Math.sqrt(state.v.x) + epsilon);
  state.pos.y -= alpha * grad.y / (Math.sqrt(state.v.y) + epsilon);
  state.t++;
}