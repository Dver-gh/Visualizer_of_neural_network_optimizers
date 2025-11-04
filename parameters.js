function getParameterFromURL(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

async function generateParametersUI(selectedAlgo) {
    const paramsContainer = document.getElementById('parameters');

    if (!paramsContainer) {
        console.error('Nie znaleziono kontenera <aside id="parameters">');
        return;
    }

    if (!selectedAlgo) {
        paramsContainer.textContent = 'Nie wybrano algorytmu (parametry domyślne mogą być pobrane po resecie).';
        return;
    }

    try {
        const response = await fetch('../optimizersParameters.json');
        if (!response.ok) {
            throw new Error(`Nie udało się wczytać pliku JSON: ${response.statusText}`);
        }
        const allOptimizersParams = await response.json();

        const params = allOptimizersParams[selectedAlgo];
        if (!params) {
            throw new Error(`Nie znaleziono parametrów dla algorytmu: ${selectedAlgo}`);
        }

        const ul = document.createElement('ul');
        ul.className = 'parameters-list';

        Object.keys(params).forEach(paramName => {
            const details = params[paramName];
            const li = document.createElement('li');

            const span = document.createElement('span');
            span.className = 'parameters-word';
            span.textContent = `${paramName}: `;

            const input = document.createElement('input');
            input.type = 'number';
            input.id = `param-${paramName}`;
            input.name = paramName;

            input.value = details.default_value;
            input.dataset.default = details.default_value;

            if (details.lower_limit !== undefined) input.min = details.lower_limit;
            if (details.upper_limit !== undefined) input.max = details.upper_limit;

            input.step = details.step || 'any';

            li.appendChild(span);
            li.appendChild(input);
            ul.appendChild(li);
        });

        paramsContainer.innerHTML = '';

        const heading = document.createElement('h3');
        heading.textContent = 'Parametry';

        paramsContainer.appendChild(heading);
        paramsContainer.appendChild(ul);

        const button = document.createElement('button');
        button.className = 'small-btn';
        button.id = 'recalcBtn';
        button.textContent = 'Przelicz';
        paramsContainer.appendChild(button);

        button.addEventListener('click', () => {
            const tryCall = (attemptsLeft) => {
                if (typeof window.__viz_recalc === 'function') {
                    window.__viz_recalc();
                    return;
                }
                if (attemptsLeft <= 0) {
                    if (typeof window.resetVisualizer3D === 'function') {
                        window.resetVisualizer3D();
                    } else if (typeof window.resetVisualizer === 'function') {
                        window.resetVisualizer();
                    } else if (typeof window.initVisualizer2D === 'function' && typeof window.__viz_config !== 'undefined') {
                        window.__viz_started = false;
                        window.initVisualizer2D(window.__viz_config);
                    } else if (typeof window.initVisualizer3D === 'function' && typeof window.__viz3d_config !== 'undefined') {
                        window.__viz3d_started = false;
                        window.initVisualizer3D(window.__viz3d_config);
                    } else {
                        console.warn('Brak handlera do przeliczenia parametrów (ostatnia próba).');
                    }
                    return;
                }
                setTimeout(() => tryCall(attemptsLeft - 1), 150);
            };
            tryCall(10);
        });

    } catch (error) {
        console.error('Błąd podczas generowania parametrów:', error);
        paramsContainer.textContent = `Błąd: ${error.message}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {

    const algo = getParameterFromURL('algo');
    generateParametersUI(algo);

    if (window.initVisualizer2D && typeof config !== 'undefined') {
        console.log("Uruchamiam funkcję initVisualizer2D")
        window.initVisualizer2D(config);
    }

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            console.log('Przycisk reset został wciśnięty');

            const paramsContainer = document.getElementById('parameters');
            if (paramsContainer) {
                const inputs = paramsContainer.querySelectorAll('input[type="number"]');
                let anyDefaultRestored = false;
                inputs.forEach(inp => {
                    if (inp.dataset && inp.dataset.default !== undefined) {
                        inp.value = inp.dataset.default;
                        anyDefaultRestored = true;
                    }
                });

                if (anyDefaultRestored) {
                    if (typeof window.__viz_recalc === 'function') {
                        window.__viz_recalc();
                        return;
                    }
                }
            }

            if (typeof window.resetVisualizer3D === 'function') {
                window.resetVisualizer3D();
                generateParametersUI(algo);
                return;
            }
            if (typeof window.resetVisualizer === 'function') {
                window.resetVisualizer();
                generateParametersUI(algo);
                return;
            }
            if (typeof window.__viz_recalc === 'function') {
                window.__viz_recalc();
                generateParametersUI(algo);
                return;
            }

            if (typeof window.initVisualizer3D === 'function' && typeof window.__viz3d_config !== 'undefined') {
                window.__viz3d_started = false;
                window.initVisualizer3D(window.__viz3d_config);
                generateParametersUI(algo);
                return;
            }
            if (typeof window.initVisualizer2D === 'function' && typeof window.__viz_config !== 'undefined') {
                window.__viz_started = false;
                window.initVisualizer2D(window.__viz_config);
                generateParametersUI(algo);
                return;
            }

            console.warn('Brak funkcji resetujących.');
        });
    } else {
        console.warn('Nie znaleziono przycisku #resetBtn');
    }

    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            console.log('Przycisk back został wciśnięty')
            window.location.href = '../index.html';
        });
    } else {
        console.warn('Nie znaleziono przycisku #backBtn');
    }
});