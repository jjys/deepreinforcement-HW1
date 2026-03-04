document.addEventListener('DOMContentLoaded', () => {
    const gridSizeInput = document.getElementById('grid-size');
    const nValSpan = document.getElementById('n-val');
    const gridContainer = document.getElementById('grid-container');
    const statusText = document.getElementById('status-text');
    const btnReset = document.getElementById('btn-reset');
    const btnEval = document.getElementById('btn-eval');
    const btnOptimize = document.getElementById('btn-optimize');

    // Evaluation results section
    const resultsSection = document.getElementById('results-section');
    const valueMatrixDiv = document.getElementById('value-matrix');
    const policyMatrixDiv = document.getElementById('policy-matrix');

    let animationId = null;
    let n = 5;
    let clickState = 0; // 0: start, 1: target, >=2: obstacles
    let startPos = null;
    let targetPos = null;
    let obstacles = [];
    let numObstaclesAllowed = 0;

    function initGrid() {
        n = parseInt(gridSizeInput.value);
        nValSpan.textContent = n;
        numObstaclesAllowed = n - 2;

        clickState = 0;
        startPos = null;
        targetPos = null;
        obstacles = [];

        btnEval.disabled = true;
        btnOptimize.disabled = true;
        resultsSection.classList.add('hidden');
        updateStatus();

        gridContainer.style.gridTemplateColumns = `repeat(${n}, 60px)`;
        gridContainer.style.gridTemplateRows = `repeat(${n}, 60px)`;
        gridContainer.innerHTML = '';

        let cellId = 1;
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell numbered';
                cell.dataset.r = r;
                cell.dataset.c = c;
                cell.dataset.id = cellId++;
                cell.addEventListener('click', handleCellClick);
                gridContainer.appendChild(cell);
            }
        }
    }

    function handleCellClick(e) {
        const cell = e.target;
        const r = parseInt(cell.dataset.r);
        const c = parseInt(cell.dataset.c);

        // Prevent clicking already colored cells
        if (cell.classList.contains('start') || cell.classList.contains('target') || cell.classList.contains('obstacle')) {
            return;
        }

        if (clickState === 0) {
            cell.classList.add('start');
            startPos = [r, c];
            clickState++;
            updateStatus();
        } else if (clickState === 1) {
            cell.classList.add('target');
            targetPos = [r, c];
            clickState++;
            updateStatus();
        } else if (clickState >= 2 && clickState < 2 + numObstaclesAllowed) {
            cell.classList.add('obstacle');
            obstacles.push([r, c]);
            clickState++;
            updateStatus();
        }

        if (clickState === 2 + numObstaclesAllowed) {
            btnEval.disabled = false;
            btnOptimize.disabled = false;
        }
    }

    function updateStatus() {
        if (clickState === 0) {
            statusText.innerHTML = "步驟 1: 點擊單元格設定 <strong>起始點</strong> (顯示為綠色)。";
        } else if (clickState === 1) {
            statusText.innerHTML = "步驟 2: 點擊單元格設定 <strong>結束點/目標</strong> (顯示為紅色)。";
        } else if (clickState < 2 + numObstaclesAllowed) {
            const rem = numObstaclesAllowed - (clickState - 2);
            statusText.innerHTML = `步驟 3: 點擊設定 <strong>障礙物</strong> (顯示為灰色)。還需設定 <strong>${rem}</strong> 個。`;
        } else {
            statusText.innerHTML = "設定完成！請點擊 <strong>評估隨機策略</strong>。";
        }
    }

    gridSizeInput.addEventListener('input', initGrid);
    btnReset.addEventListener('click', initGrid);

    btnEval.addEventListener('click', () => {
        btnEval.disabled = true;
        btnEval.textContent = "評估中...";

        fetch('/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ n: n, start: startPos, target: targetPos, obstacles: obstacles })
        })
            .then(res => res.json())
            .then(data => {
                resultsSection.classList.remove('hidden');
                animateEvaluation(data.v_history, data.policy, null);
                btnEval.textContent = "重新評估隨機策略";
                btnEval.disabled = false;
                btnOptimize.disabled = false;
            })
            .catch(err => {
                console.error(err);
                btnEval.textContent = "評估失敗，請重試";
                btnEval.disabled = false;
                btnOptimize.disabled = false;
            });
    });

    btnOptimize.addEventListener('click', () => {
        btnEval.disabled = true;
        btnOptimize.disabled = true;
        btnOptimize.textContent = "推導最佳政策中...";

        fetch('/optimize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ n: n, start: startPos, target: targetPos, obstacles: obstacles })
        })
            .then(res => res.json())
            .then(data => {
                resultsSection.classList.remove('hidden');
                animateEvaluation(data.v_history, data.policy, data.optimal_actions);
                btnOptimize.textContent = "重新執行價值迭代 algorithm";
                btnOptimize.disabled = false;
                btnEval.disabled = false;
            })
            .catch(err => {
                console.error(err);
                btnOptimize.textContent = "評估失敗，請重試";
                btnOptimize.disabled = false;
                btnEval.disabled = false;
            });
    });

    function renderResults(values, policy, optimal_actions) {
        valueMatrixDiv.style.gridTemplateColumns = `repeat(${n}, 55px)`;
        valueMatrixDiv.style.gridTemplateRows = `repeat(${n}, 55px)`;
        policyMatrixDiv.style.gridTemplateColumns = `repeat(${n}, 55px)`;
        policyMatrixDiv.style.gridTemplateRows = `repeat(${n}, 55px)`;

        valueMatrixDiv.innerHTML = '';
        policyMatrixDiv.innerHTML = '';

        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const isStart = (startPos && r === startPos[0] && c === startPos[1]);
                const isTarget = (targetPos && r === targetPos[0] && c === targetPos[1]);
                const isObs = obstacles.some(o => o[0] === r && o[1] === c);

                // Value cell
                const vCell = document.createElement('div');
                vCell.className = 'cell';
                if (isStart) vCell.classList.add('start');
                else if (isTarget) vCell.classList.add('target');
                else if (isObs) vCell.classList.add('obstacle');

                if (!isObs && !isTarget) {
                    vCell.textContent = values[r][c].toFixed(2);
                } else if (isTarget) {
                    vCell.textContent = "0.00";
                }
                valueMatrixDiv.appendChild(vCell);

                // Policy cell
                const pCell = document.createElement('div');
                pCell.className = 'cell';
                if (isStart) pCell.classList.add('start');
                else if (isTarget) pCell.classList.add('target');
                else if (isObs) pCell.classList.add('obstacle');

                if (!isObs && !isTarget) {
                    pCell.textContent = policy[r][c];
                    pCell.classList.add('arrow');
                } else if (isTarget) {
                    pCell.textContent = "End";
                }
                policyMatrixDiv.appendChild(pCell);
            }
        }

        // Highlight optimal path if optimal_actions is provided
        if (optimal_actions && startPos && targetPos) {
            let r = startPos[0];
            let c = startPos[1];
            let actions_mapping = { 0: [-1, 0], 1: [0, 1], 2: [1, 0], 3: [0, -1] };
            let visited = new Set();
            let safe_limit = n * n; // prevent infinite loops

            while ((r !== targetPos[0] || c !== targetPos[1]) && safe_limit > 0) {
                let cellId = r * n + c;
                if (visited.has(cellId)) break; // loop detected
                visited.add(cellId);

                // apply optimal-path style to both grids
                valueMatrixDiv.children[cellId].classList.add('optimal-path');
                policyMatrixDiv.children[cellId].classList.add('optimal-path');

                let a = optimal_actions[r][c];
                let dr = actions_mapping[a][0];
                let dc = actions_mapping[a][1];
                let nr = r + dr;
                let nc = c + dc;

                // bounds/obstacles check
                if (nr < 0 || nr >= n || nc < 0 || nc >= n || obstacles.some(o => o[0] === nr && o[1] === nc)) {
                    break; // stuck
                }
                r = nr;
                c = nc;
                safe_limit--;
            }

            // Highlight target cell too if reached
            if (r === targetPos[0] && c === targetPos[1]) {
                let cellId = r * n + c;
                valueMatrixDiv.children[cellId].classList.add('optimal-path');
                policyMatrixDiv.children[cellId].classList.add('optimal-path');
            }
        }
    }

    function animateEvaluation(v_history, policy, optimal_actions) {
        if (animationId) clearInterval(animationId);

        // Initial render to set up the grid layout
        renderResults(v_history[0], policy, optimal_actions);

        let iter = 0;
        const totalIters = v_history.length;

        animationId = setInterval(() => {
            iter += Math.max(1, Math.floor(totalIters / 100)); // skip frames if too long
            if (iter >= totalIters - 1) {
                iter = totalIters - 1;
                clearInterval(animationId);
            }
            updateValueMatrix(v_history[iter]);
        }, 30);
    }

    function updateValueMatrix(values) {
        const valueCells = valueMatrixDiv.children;
        let i = 0;
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const isTarget = (targetPos && r === targetPos[0] && c === targetPos[1]);
                const isObs = obstacles.some(o => o[0] === r && o[1] === c);

                if (!isObs && !isTarget) {
                    valueCells[i].textContent = values[r][c].toFixed(2);
                }
                i++;
            }
        }
    }

    initGrid();
});
