# 強化學習 HW1: 網格地圖與策略評估

(Reinforcement Learning HW1: Gridworld and Policy Evaluation)

這是一個基於 Python 開發的互動式網格地圖應用程式，用於實作並視覺化強化學習 (Reinforcement Learning) 中的隨機策略評估與最佳價值迭代算法。

## 🌐 線上展示 (Live Demos)

你可以點擊以下連結，直接在瀏覽器中操作這個網頁應用程式：

- **Streamlit 版本 (推薦，速度與反應最快)**:
  👉 [https://deepreinforcement-hw1.streamlit.app](https://deepreinforcement-hw1.streamlit.app)
- **Render 版本 (Flask 版 + 原生前端動畫)**:
  👉 [https://deepreinforcement-hw1.onrender.com](https://deepreinforcement-hw1.onrender.com)
  *(註: Render 免費方案的伺服器如果一段時間無人訪問會休眠，首次載入可能需要等待大約 50 秒「喚醒」伺服器。)*

## ✨ 實作功能 (Features)

### HW1-1: 網格地圖開發

- **自訂網格尺寸**: 使用者可動態調整 $N \times N$ 地圖大小 (範圍 $N=5 \sim 9$)。
- **互動式地圖設定**: 提供清晰的提示文字，引導使用者點擊網格來依序設定：
  - 🟢 **起始單元格** (1 個，綠色)
  - 🔴 **結束 / 目標單元格** (1 個，紅色)
  - ⬛ **障礙物** ($N-2$ 個，灰色)

### HW1-2: 策略顯示與價值評估

- **隨機策略生成**: 為地圖上的每個空白單元格，隨機指派一個移動方向（上下左右箭頭）。
- **策略評估 (Policy Evaluation)**: 根據隨機產生的策略 $\pi(s)$，推導出每個狀態的具體價值 $V(s)$。
- **即時視覺化動畫**: 點擊「評估隨機策略」後，網頁會即時動態展示出每一個格子的價值，從 0 一步步收斂到最終正確數字的過程。

### HW1-3: 使用價值迭代算法推導最佳政策

- **價值迭代 (Value Iteration)**: 實作價值迭代演算法，精確計算出每個狀態在「最佳政策」下的 $V(s)$ 與期望回報 (Expected return)。
- **最佳路徑可視化**: 點擊「執行價值迭代算法」後，程式不僅會呈現最佳的策略矩陣，還會用**金色高亮 (Highlight)** 標示出從「起點」一路走向「終點」的完美路徑。

---

## 🛠 本地環境建置與執行指南 (Local Setup)

如果你想在自己的電腦上運行這個專案：

### 1. 安裝環境與套件

在終端機中執行以下指令建立並進入虛擬環境，接著安裝必要的套件：

```bash
# 建立虛擬環境
python -m venv .venv

# 啟動虛擬環境 (Mac/Linux 用戶)
source .venv/bin/activate
# Windows 用戶請改用: .venv\Scripts\activate

# 安裝依賴套件
pip install -r requirements.txt
```

### 2. 啟動應用程式

你可以選擇以下任何一種方式來啟動本地的伺服器。

**啟動方式 A：運行 Flask 版本**

```bash
python app.py
```

> 開啟瀏覽器並前往 `http://127.0.0.1:5000`

**啟動方式 B：運行 Streamlit 版本**

```bash
streamlit run streamlit_app.py
```

> 開啟瀏覽器並前往終端機提示的 URL (通常是 `http://localhost:8501`)

---

## 🗂 檔案結構

- `app.py`: Flask 版的後端伺服器程式碼、隨機策略評價與價值迭代演算法之實作中心。
- `streamlit_app.py`: Streamlit 版的獨立 Python 網頁實作。
- `templates/` & `static/`: Flask 版前端所需的 HTML, CSS, JavaScript 等網頁與互動動畫設計。
- `requirements.txt`: 專案所需的 Python 依賴套件清單。
