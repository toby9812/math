# 101 數學家教系統 (GSAT Math Tutor) - Netlify 部署指南

本專案已完全封裝成可直接部署至 **Netlify** 的 Web 應用程式。整合了 **Google Gemini API** 的多模態識圖（支援拍照/截圖）與雲端 **Python 程式碼執行（Code Execution）雙軌驗證**，並嚴格遵循 SHAPE 碎步鷹架導引與純文字/Unicode 符號規範。

---

## 快速目錄
- [事前準備：取得 Google Gemini API Key](#事前準備取得-google-gemini-api-key)
- [部署方法一：透過 GitHub 自動關聯部署 (最推薦)](#部署方法一透過-github-自動關聯部署-最推薦)
- [部署方法二：使用 Netlify CLI 指令部署](#部署方法二使用-netlify-cli-指令部署)
- [設定 Netlify 環境變數 (保護 API 金鑰)](#設定-netlify-環境變數-保護-api-金鑰)
- [本機預覽與測試 (Local Test)](#本機預覽與測試-local-test)

---

## 事前準備：取得 Google Gemini API Key

1. 前往 [Google AI Studio](https://aistudio.google.com/app/apikey)。
2. 使用你的 Google 帳號登入，點擊 **「Create API key」**（免費版每分鐘有高額請求額度）。
3. 複製產生的金鑰（格式如 `AIzaSy...`），妥善保存。

---

## 部署方法一：透過 GitHub 自動關聯部署 (最推薦)

這是最穩定、最推薦的方式，未來只要在專案更新並 Push，Netlify 就會自動更新網站。

### 步驟 1：建立 Git 儲存庫並推送到 GitHub
在專案根目錄開啟終端機（Terminal）：
```bash
# 1. 初始化 git 儲存庫
git init
git add .
git commit -m "feat: 建立 101 數學家教 Netlify 網頁版"

# 2. 建立 main 分支並推送到你的 GitHub 儲存庫
git branch -M main
git remote add origin https://github.com/你的使用者名稱/你的儲存庫名稱.git
git push -u origin main
```

### 步驟 2：在 Netlify 匯入專案
1. 登入 [Netlify](https://app.netlify.com/)。
2. 點擊右上角 **「Add new site」** ➔ 選擇 **「Import an existing project」**。
3. 選擇 **GitHub**，並選取你剛剛推送的儲存庫。
4. Netlify 會自動讀取專案內的 `netlify.toml`，設定值如下（已自動配置完成，無需手動修改）：
   - **Base directory**: 留空（根目錄）
   - **Publish directory**: `public`
   - **Functions directory**: `netlify/functions`
5. 點擊 **「Deploy site」** 開始部署。

---

## 設定 Netlify 環境變數 (保護 API 金鑰)

為了不讓訪問網站的學生或使用者看到你的 API Key，強烈建議在 Netlify 後台設定環境變數：

1. 在 Netlify 網站控制台中，進入 **Site configuration** ➔ **Environment variables**。
2. 點擊 **「Add a variable」**。
3. 欄位設定：
   - **Key**: `GEMINI_API_KEY`
   - **Value**: 貼上你的 Google Gemini API Key（`AIzaSy...`）
4. 點擊 **Save**。
5. 前往 **Deploys** 分頁，點擊 **「Trigger deploy」➔「Clear cache and deploy site」** 重新發布一次。
6. 完成！現在任何人在網址開啟你的網頁，都可以直接享有 AI 家教解題導引服務。

> 💡 **備用機制**：使用者也可以點擊網頁右上角的 **「⚙️ 設定」**，直接在瀏覽器輸入自己的 Gemini API Key（儲存於個人瀏覽器 LocalStorage，適合不想在後台綁定全域金鑰的情境）。

---

## 部署方法二：使用 Netlify CLI 指令部署

如果你不想透過 GitHub，也可以使用 Netlify 官方指令直接從電腦上傳：

```bash
# 1. 安裝 Netlify CLI
npm install -g netlify-cli

# 2. 登入 Netlify
ntl login

# 3. 初始化並部署
ntl init

# 4. 直接發布至生產環境
ntl deploy --prod
```

---

## 本機預覽與測試 (Local Test)

在上傳至 Netlify 之前，你可以在電腦上先行測試：

1. 開啟終端機執行：
   ```bash
   node local_server.js
   ```
   或者：
   ```bash
   npm start
   ```
2. 打開瀏覽器訪問：
   👉 **http://localhost:3000**
3. 點擊右上角 **「⚙️ 設定」** 填入你的 Gemini API Key，即可立即測試文字解題、考卷截圖識別與雙軌驗證！

---

## 專案目錄結構

```text
.
├── netlify.toml                # Netlify 部署與路由轉發設定
├── NETLIFY_DEPLOY.md           # 本部署指南
├── package.json                # 專案資訊與本機啟動指令
├── local_server.js             # 本機零依賴極簡測試伺服器
├── netlify/
│   └── functions/
│       └── chat.js             # Netlify Serverless Function (串接 Gemini API + Code Execution)
└── public/
    ├── index.html              # 前端主頁面 (支援 RWD、相機/截圖上傳、快速符號工具列)
    ├── css/
    │   └── style.css           # 現代深色質感情境樣式
    └── js/
        └── app.js              # 前端交互、對話管理與 Python 驗證紀錄展示
```
