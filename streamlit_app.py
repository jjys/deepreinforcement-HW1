import streamlit as st
import numpy as np
import random
import time

st.set_page_config(page_title="HW1 網格地圖 RL 策略評估", layout="wide")

st.title("強化學習 HW1: 網格地圖與策略評估 (Streamlit 版)")

# Initialize session state
if 'n' not in st.session_state:
    st.session_state.n = 5
if 'start' not in st.session_state:
    st.session_state.start = None
if 'target' not in st.session_state:
    st.session_state.target = None
if 'obstacles' not in st.session_state:
    st.session_state.obstacles = []
if 'click_state' not in st.session_state:
    st.session_state.click_state = 0 # 0: start, 1: target, 2+: obstacles

def reset_grid():
    st.session_state.start = None
    st.session_state.target = None
    st.session_state.obstacles = []
    st.session_state.click_state = 0

n = st.sidebar.slider("網格地圖大小 (n)", min_value=5, max_value=9, value=st.session_state.n)
if n != st.session_state.n:
    st.session_state.n = n
    reset_grid()

st.sidebar.button("重新設定", on_click=reset_grid)

num_obstacles_allowed = st.session_state.n - 2

# Status message area
if st.session_state.click_state == 0:
    st.info("步驟 1: 點擊單元格設定 **起始點** (綠色)。")
elif st.session_state.click_state == 1:
    st.info("步驟 2: 點擊單元格設定 **結束點/目標** (紅色)。")
elif st.session_state.click_state < 2 + num_obstacles_allowed:
    rem = num_obstacles_allowed - (st.session_state.click_state - 2)
    st.info(f"步驟 3: 點擊設定 **障礙物** (灰色)。還需設定 **{rem}** 個。")
else:
    st.success("設定完成！請點擊下方的 **評估隨機策略**。")

# Handle cell clicks for grid setup
def handle_cell_click(r, c):
    pos = (r, c)
    if pos == st.session_state.start or pos == st.session_state.target or pos in st.session_state.obstacles:
        return
    
    if st.session_state.click_state == 0:
        st.session_state.start = pos
        st.session_state.click_state += 1
    elif st.session_state.click_state == 1:
        st.session_state.target = pos
        st.session_state.click_state += 1
    elif st.session_state.click_state >= 2 and st.session_state.click_state < 2 + num_obstacles_allowed:
        st.session_state.obstacles.append(pos)
        st.session_state.click_state += 1

# Display grid using columns for interactive setup
st.write("### 互動網格地圖")

# Use CSS to make buttons square
st.markdown("""
<style>
div.stButton > button {
    width: 60px;
    height: 60px;
    padding: 0px;
    font-size: 16px;
    font-weight: bold;
}
</style>
""", unsafe_allow_html=True)

# Create layout columns for the grid
for r in range(st.session_state.n):
    cols = st.columns(st.session_state.n)
    for c in range(st.session_state.n):
        pos = (r, c)
        
        # Determine button label based on type
        label = ""
        if pos == st.session_state.start:
            label = f"🟢 始 \n({r},{c})"
        elif pos == st.session_state.target:
            label = f"🔴 終 \n({r},{c})"
        elif pos in st.session_state.obstacles:
            label = f"⬛ \n({r},{c})"
        else:
            label = f"⬜ \n({r},{c})"
            
        with cols[c]:
            st.button(label, key=f"cell_{r}_{c}", on_click=handle_cell_click, args=(r, c))

st.markdown("---")

# Policy evaluation & Optimization
if st.session_state.click_state == 2 + num_obstacles_allowed:
    col_btn1, col_btn2 = st.columns(2)
    with col_btn1:
        eval_clicked = st.button("🚀 評估隨機策略", type="primary", use_container_width=True)
    with col_btn2:
        opt_clicked = st.button("✨ 執行價值迭代算法(最佳政策)", type="primary", use_container_width=True)
        
    if eval_clicked or opt_clicked:
        is_optimize = opt_clicked
        msg = "推導最佳政策中..." if is_optimize else "評估中..."
        with st.spinner(msg):
            n = st.session_state.n
            start = st.session_state.start
            target = st.session_state.target
            obstacles = st.session_state.obstacles
            
            actions_mapping = {0: [-1, 0], 1: [0, 1], 2: [1, 0], 3: [0, -1]}
            action_symbols = {0: '↑', 1: '→', 2: '↓', 3: '←'}
            
            # Generate a random initial policy
            policy = np.zeros((n, n), dtype=int)
            for r in range(n):
                for c in range(n):
                    policy[r][c] = random.choice([0, 1, 2, 3])
                    
            # Policy evaluation
            V = np.zeros((n, n))
            gamma = 0.9
            theta = 1e-5
            max_iter = 10000
            
            v_history = []
            
            if is_optimize:
                # Value Iteration for optimal policy
                for _ in range(max_iter):
                    delta = 0
                    new_V = np.copy(V)
                    for r in range(n):
                        for c in range(n):
                            state = (r, c)
                            if state == target or state in obstacles:
                                continue
                            
                            max_val = -float('inf')
                            for a in range(4):
                                dr, dc = actions_mapping[a]
                                nr, nc = r + dr, c + dc
                                
                                if nr < 0 or nr >= n or nc < 0 or nc >= n or (nr, nc) in obstacles:
                                    nr, nc = r, c
                                
                                v_next = V[nr][nc]
                                if target and (nr, nc) == target:
                                    v_next = 0
                                
                                val = -1 + gamma * v_next
                                if val > max_val:
                                    max_val = val
                                    
                            delta = max(delta, abs(max_val - V[r][c]))
                            new_V[r][c] = max_val
                    
                    V = new_V
                    v_history.append(np.copy(V))
                    if delta < theta:
                        break
                        
                # Extract optimal policy
                optimal_actions_array = np.zeros((n, n), dtype=int)
                for r in range(n):
                    for c in range(n):
                        if (r, c) == target or (r, c) in obstacles:
                            continue
                            
                        max_val = -float('inf')
                        best_a = 0
                        for a in range(4):
                            dr, dc = actions_mapping[a]
                            nr, nc = r + dr, c + dc
                            
                            if nr < 0 or nr >= n or nc < 0 or nc >= n or (nr, nc) in obstacles:
                                nr, nc = r, c
                                
                            v_next = V[nr][nc]
                            if target and (nr, nc) == target:
                                v_next = 0
                                
                            val = -1 + gamma * v_next
                            if val > max_val:
                                max_val = val
                                best_a = a
                        optimal_actions_array[r][c] = best_a
                policy = optimal_actions_array
                optimal_actions = optimal_actions_array.tolist()
            else:
                optimal_actions = None
                # Policy evaluation for random policy
                for _ in range(max_iter):
                    delta = 0
                    new_V = np.copy(V)
                    for r in range(n):
                        for c in range(n):
                            state = (r, c)
                            if state == target or state in obstacles:
                                continue
                            
                            a = policy[r][c]
                            dr, dc = actions_mapping[a]
                            nr, nc = r + dr, c + dc
                            
                            if nr < 0 or nr >= n or nc < 0 or nc >= n or (nr, nc) in obstacles:
                                nr, nc = r, c
                            
                            v_next = V[nr][nc]
                            if target and (nr, nc) == target:
                                v_next = 0
                            
                            reward = -1
                            new_val = reward + gamma * v_next
                            
                            delta = max(delta, abs(new_val - V[r][c]))
                            new_V[r][c] = new_val
                    
                    V = new_V
                    v_history.append(np.copy(V))
                    if delta < theta:
                        break
        
        # Display Results
        st.write("## 策略顯示與價值評估結果")
        
        
        # Format the Policy HTML table
        def generate_html_grid(n, values=None, policy=None, is_policy=False, highlight_path=False):
            html = f'<div style="display: grid; grid-template-columns: repeat({n}, 60px); gap: 4px; margin: 10px 0;">'
            
            # Find optimal path set
            path_set = set()
            if highlight_path and optimal_actions is not None and start and target:
                cr, cc = start
                safe_limit = n * n
                while (cr, cc) != target and safe_limit > 0:
                    path_set.add((cr, cc))
                    a = optimal_actions[cr][cc]
                    dr, dc = actions_mapping[a]
                    nr, nc = cr + dr, cc + dc
                    if nr < 0 or nr >= n or nc < 0 or nc >= n or (nr, nc) in obstacles:
                        break
                    cr, cc = nr, nc
                    safe_limit -= 1
                if (cr, cc) == target:
                    path_set.add((cr, cc))

            for r in range(n):
                for c in range(n):
                    pos = (r, c)
                    bg_color = "#ffffff"
                    color = "#2c3e50"
                    border = "1px solid #bdc3c7"
                    text = ""
                    
                    if pos == start:
                        bg_color = "#2ecc71"
                        color = "#ffffff"
                    elif pos == target:
                        bg_color = "#e74c3c"
                        color = "#ffffff"
                        text = "End" if is_policy else "0.00"
                    elif pos in obstacles:
                        bg_color = "#95a5a6"
                        text = "X"
                    
                    if pos != target and pos not in obstacles:
                        if is_policy:
                            text = action_symbols[policy[r][c]]
                        else:
                            text = f"{values[r][c]:.2f}"
                            
                    if pos in path_set:
                        bg_color = "#f1c40f"
                        color = "#2c3e50"
                        border = "2px solid #f39c12"
                            
                    html += f'<div style="background-color: {bg_color}; color: {color}; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: {border}; border-radius: 4px; font-size: 14px;">{text}</div>'
            html += '</div>'
            return html

        col1, col2 = st.columns(2)
        
        with col1:
            st.write("### 策略 Matrix π(s)")
            st.markdown(generate_html_grid(n, None, policy, is_policy=True, highlight_path=is_optimize), unsafe_allow_html=True)
            
        with col2:
            st.write("### 價值 Matrix V(s)")
            placeholder = st.empty()
            
            # Simple animation simulating the Flask frontend behavior
            for i, v_matrix in enumerate(v_history):
                # Skip frames to speed up visualization
                if i % max(1, len(v_history)//40) == 0 or i == len(v_history) - 1:
                    placeholder.markdown(generate_html_grid(n, v_matrix, None, is_policy=False, highlight_path=is_optimize), unsafe_allow_html=True)
                    time.sleep(0.05)
