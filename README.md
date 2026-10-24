# 101 數學家教系統 (GSAT Math Tutor) - 公開分享版

這是一套專門輔導台灣高中以下（特別針對學測 GSAT）的 **AI 數學家教 Agent 系統**。本系統採用多角色分工與程式碼嚴格雙軌驗證架構，解決傳統 LLM 解數學題容易「幻覺、算錯、直接爆雷答案」的缺點。

---

## 核心架構與三大角色

1. **`tutor_coordinator`（前台掛號與題意確認）**
   - 負責在對話一開始與學生確認題目條件（支援文字輸入與照片識別）。
   - 嚴格要求學生確認題意後才派工，避免因抄錯題而做白工。
2. **`math_solver`（程式碼雙軌嚴格解題引擎）**
   - 執行 5 階段 MathQ-Verify 驗證題目合法性與完備性。
   - 撰寫 Python 腳本，透過兩種獨立的方法（如符號運算 vs. 窮舉/代入檢驗）進行雙軌驗證。
   - 只有兩軌結果一致才產出內部解題報告；嚴禁心算臆測。
3. **`shape_tutor`（SHAPE 碎步鷹架教學家教）**
   - 站在第一線與學生對話，語氣溫暖親切。
   - 嚴格依照 `math_solver` 的分步報告進行引導，一次只推一步（3 句話以內 + 引導問句）。
   - 絕不直接給答案，引導學生自行思考解出。
4. **輸出格式規範（`AGENTS.md`）**
   - 全程使用純文字與常見 Unicode 數學符號（如 √, ², ×, ÷, 1/2），**絕對避免使用 LaTeX**，確保任何環境皆能清晰閱讀。

---

## 快速開始（推薦：Antigravity IDE）

本套件原生適配 **Google Antigravity IDE**，開箱即用。

> [!TIP]
> 💡 **給非技術背景朋友的貼心提示（零終端機經驗也OK！）**：  
> 如果你**不知道什麼是「終端機 (Terminal)」**、或者**看不懂安裝指令**，完全不用擔心！  
> 你只要用 Antigravity IDE 開啟這個資料夾，在右側聊天對話框直接跟 AI 說：  
> 👉 **「請幫我檢查並安裝這套家教系統需要的 Python 與 sympy 套件」**  
> AI 就會自己幫你執行指令並設定好環境，你什麼指令都不用手動敲！  
> 後續如果遇到任何看不懂的提示，也都可以直接在對話框請 AI 幫你處理。

### 步驟 1：安裝 Python 依賴套件
解題引擎需要用到 Python 符號運算套件 `sympy`。
- **懶人方法（推薦）**：直接在 Antigravity 對話框輸入：「請幫我安裝 `sympy`」，讓 AI 幫你跑。
- **手動方法**：如果你熟悉指令，可以在終端機執行：
  ```bash
  pip install sympy
  ```

### 步驟 2：開啟專案
使用 Antigravity IDE 直接開啟此資料夾（確保根目錄能看到 `AGENTS.md` 與 `.agents` 資料夾）。

> ⚠️ **注意隱藏資料夾**：
> `.agents` 開頭有一個點（`.`），在 Windows 或 macOS 檔案總管預設可能會被隱藏。請確保複製或解壓縮時包含該資料夾。

### 步驟 3：開始對話
1. 選擇具備程式碼執行與視覺多模態能力的模型（例如 Gemini 2.0 / 3 系列、Claude 3.5 Sonnet 等）。
2. 在對話框中直接貼上數學題目文字，或直接上傳題目圖片。
3. 系統將自動進入 `tutor_coordinator` 流程，開始題意確認與解題導引！

---

## 在其他平台使用（如 Claude Code / Cursor / Windsurf）

若你或你的使用者希望在其他 Agent CLI 或 IDE 上運行，核心理念相同，只需微調檔案放置位置與規則名稱：

### 1. Claude Code
- **規則檔**：將 `AGENTS.md` 的內容貼入或命名為 `CLAUDE.md`（Claude Code 預設讀取的專案提示詞檔案）。
- **技能/指令**：可將 `.agents/skills/` 各目錄下的 `SKILL.md` 內容整併至 `CLAUDE.md`，或設定為自訂 Prompts / Slash Commands。
- **工具權限**：確保 Claude Code 擁有執行 Bash/Python 腳本的權限。

### 2. Cursor / Windsurf
- **規則檔**：將 `AGENTS.md` 與各角色的核心指示貼入 `.cursorrules` 或 `.windsurfrules`。
- **執行環境**：確保開啟 Agent 模式並允許執行 Terminal 指令。

---

## 目錄結構一覽

```text
.
├── README.md                              # 本說明文件
├── AGENTS.md                              # 系統全域行為規範 (格式限制與協調路由)
└── .agents/
    └── skills/
        ├── tutor_coordinator/
        │   └── SKILL.md                   # 前台掛號與題意確認
        ├── math_solver/
        │   └── SKILL.md                   # 程式碼雙軌嚴格解題引擎
        └── shape_tutor/
            └── SKILL.md                   # SHAPE 碎步鷹架引導家教
```
