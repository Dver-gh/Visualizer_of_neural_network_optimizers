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

function sgdStep(state, grad, params) {
    state.pos.x -= params.alpha * grad.x;
    state.pos.y -= params.alpha * grad.y;
    state.t++;
}

function momentumStep(state, grad, params) {
    state.m.x = params.beta * state.m.x + params.alpha * grad.x;
    state.m.y = params.beta * state.m.y + params.alpha * grad.y;
    state.pos.x -= state.m.x;
    state.pos.y -= state.m.y;
    state.t++;
}

function nesterovStep(state, gradFunc, params) {
    let lookahead = createVector(
        state.pos.x - params.beta * state.m.x,
        state.pos.y - params.beta * state.m.y
    );
    let grad = gradFunc(lookahead.x, lookahead.y);
    state.m.x = params.beta * state.m.x + params.alpha * grad.x;
    state.m.y = params.beta * state.m.y + params.alpha * grad.y;
    state.pos.x -= state.m.x;
    state.pos.y -= state.m.y;
    state.t++;
}

function adagradStep(state, grad, params) {
    state.v.x += grad.x * grad.x;
    state.v.y += grad.y * grad.y;
    state.pos.x -= params.alpha * grad.x / (Math.sqrt(state.v.x) + params.epsilon);
    state.pos.y -= params.alpha * grad.y / (Math.sqrt(state.v.y) + params.epsilon);
    state.t++;
}

function rmspropStep(state, grad, params) {
    state.v.x = params.beta * state.v.x + (1 - params.beta) * grad.x * grad.x;
    state.v.y = params.beta * state.v.y + (1 - params.beta) * grad.y * grad.y;
    state.pos.x -= params.alpha * grad.x / (Math.sqrt(state.v.x) + params.epsilon);
    state.pos.y -= params.alpha * grad.y / (Math.sqrt(state.v.y) + params.epsilon);
    state.t++;
}