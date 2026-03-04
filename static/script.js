document.addEventListener('DOMContentLoaded', () => {
    const gridSizeInput = document.getElementById('grid-size');
    const nValSpan = document.getElementById('n-val');
    const gridContainer = document.getElementById('grid-container');
    const statusText = document.getElementById('status-text');
    const btnReset = document.getElementById('btn-reset');
    const btnEval = document.getElementById('btn-eval');

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
                animateEvaluation(data.v_history, data.policy);
                btnEval.textContent = "重新評估隨機策略";
                btnEval.disabled = false;
            })
            .catch(err => {
                console.error(err);
                btnEval.textContent = "評估失敗，請重試";
                btnEval.disabled = false;
            });
    });

    function renderResults(values, policy) {
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
    }

    function animateEvaluation(v_history, policy) {
        if (animationId) clearInterval(animationId);

        // Initial render to set up the grid layout
        renderResults(v_history[0], policy);

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
