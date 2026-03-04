from flask import Flask, render_template, request, jsonify
import numpy as np
import random

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/evaluate', methods=['POST'])
def evaluate():
    data = request.json
    n = data.get('n', 5)
    start = data.get('start', [0, 0])
    target = data.get('target', [0, 1])
    obstacles = data.get('obstacles', [])

    # The grid is n x n. State space: (0..n-1, 0..n-1).
    # Actions: 0: Up, 1: Right, 2: Down, 3: Left
    actions_mapping = {0: [-1, 0], 1: [0, 1], 2: [1, 0], 3: [0, -1]}
    action_symbols = {0: '↑', 1: '→', 2: '↓', 3: '←'}

    target_tuple = tuple(target) if target else None
    obstacle_tuples = [tuple(o) for o in obstacles]

    # Generate a random deterministic policy for each cell
    policy = np.zeros((n, n), dtype=int)
    for r in range(n):
        for c in range(n):
            policy[r][c] = random.choice([0, 1, 2, 3])

    # Policy evaluation
    # V(s) = R(s, a) + gamma * V(s')
    V = np.zeros((n, n))
    gamma = 0.9
    theta = 1e-5
    
    max_iter = 10000
    v_history = []
    for _ in range(max_iter):
        delta = 0
        new_V = np.copy(V)
        for r in range(n):
            for c in range(n):
                state = (r, c)
                if state == target_tuple or state in obstacle_tuples:
                    continue
                
                a = policy[r][c]
                dr, dc = actions_mapping[a]
                nr, nc = r + dr, c + dc
                
                # Boundary check or obstacle collision
                if nr < 0 or nr >= n or nc < 0 or nc >= n or (nr, nc) in obstacle_tuples:
                    nr, nc = r, c
                
                v_next = V[nr][nc]
                if target_tuple and (nr, nc) == target_tuple:
                    # Episode terminates upon entering the target state
                    v_next = 0
                
                reward = -1 # Cost of 1 per step
                new_val = reward + gamma * v_next
                
                delta = max(delta, abs(new_val - V[r][c]))
                new_V[r][c] = new_val
        
        V = new_V
        v_history.append(V.tolist())
        if delta < theta:
            break
            
    # Format the return data
    v_list = V.tolist()
    p_str = np.empty((n, n), dtype=object)
    
    for r in range(n):
        for c in range(n):
            if target_tuple and (r, c) == target_tuple:
                p_str[r][c] = 'T'
            elif (r, c) in obstacle_tuples:
                p_str[r][c] = 'X'
            else:
                p_str[r][c] = action_symbols[policy[r][c]]

    return jsonify({
        'values': v_list,
        'policy': p_str.tolist(),
        'v_history': v_history
    })

@app.route('/optimize', methods=['POST'])
def optimize():
    data = request.json
    n = data.get('n', 5)
    start = data.get('start', [0, 0])
    target = data.get('target', [0, 1])
    obstacles = data.get('obstacles', [])
    
    actions_mapping = {0: [-1, 0], 1: [0, 1], 2: [1, 0], 3: [0, -1]}
    action_symbols = {0: '↑', 1: '→', 2: '↓', 3: '←'}
    
    target_tuple = tuple(target) if target else None
    obstacle_tuples = [tuple(o) for o in obstacles]
    
    V = np.zeros((n, n))
    gamma = 0.9
    theta = 1e-5
    
    max_iter = 10000
    v_history = []
    
    for _ in range(max_iter):
        delta = 0
        new_V = np.copy(V)
        for r in range(n):
            for c in range(n):
                state = (r, c)
                if state == target_tuple or state in obstacle_tuples:
                    continue
                
                max_val = -float('inf')
                for a in range(4):
                    dr, dc = actions_mapping[a]
                    nr, nc = r + dr, c + dc
                    
                    if nr < 0 or nr >= n or nc < 0 or nc >= n or (nr, nc) in obstacle_tuples:
                        nr, nc = r, c
                        
                    v_next = V[nr][nc]
                    if target_tuple and (nr, nc) == target_tuple:
                        v_next = 0
                        
                    val = -1 + gamma * v_next
                    if val > max_val:
                        max_val = val
                        
                delta = max(delta, abs(max_val - V[r][c]))
                new_V[r][c] = max_val
                
        V = new_V
        v_history.append(V.tolist())
        if delta < theta:
            break
            
    # Extract optimal policy
    policy = np.zeros((n, n), dtype=int)
    for r in range(n):
        for c in range(n):
            if (r, c) == target_tuple or (r, c) in obstacle_tuples:
                continue
                
            max_val = -float('inf')
            best_a = 0
            for a in range(4):
                dr, dc = actions_mapping[a]
                nr, nc = r + dr, c + dc
                
                if nr < 0 or nr >= n or nc < 0 or nc >= n or (nr, nc) in obstacle_tuples:
                    nr, nc = r, c
                    
                v_next = V[nr][nc]
                if target_tuple and (nr, nc) == target_tuple:
                    v_next = 0
                    
                val = -1 + gamma * v_next
                if val > max_val:
                    max_val = val
                    best_a = a
            policy[r][c] = best_a
            
    v_list = V.tolist()
    p_str = np.empty((n, n), dtype=object)
    
    for r in range(n):
        for c in range(n):
            if target_tuple and (r, c) == target_tuple:
                p_str[r][c] = 'T'
            elif (r, c) in obstacle_tuples:
                p_str[r][c] = 'X'
            else:
                p_str[r][c] = action_symbols[policy[r][c]]

    return jsonify({
        'values': v_list,
        'policy': p_str.tolist(),
        'v_history': v_history,
        'optimal_actions': policy.tolist() # raw numbers to rebuild path
    })

if __name__ == '__main__':
    app.run(debug=True)
