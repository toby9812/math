// public/js/app.js - 101 數學家教前端交互邏輯

document.addEventListener('DOMContentLoaded', () => {
  // 狀態變數
  let messages = [];
  let currentImage = null; // { data: base64String, mimeType: string, fileName: string }
  let isLoading = false;

  // DOM 元素
  const messagesContainer = document.getElementById('messagesContainer');
  const chatInput = document.getElementById('chatInput');
  const btnSend = document.getElementById('btnSend');
  const fileInput = document.getElementById('fileInput');
  const btnUploadImage = document.getElementById('btnUploadImage');
  const imagePreviewBar = document.getElementById('imagePreviewBar');
  const previewImage = document.getElementById('previewImage');
  const previewFileName = document.getElementById('previewFileName');
  const btnRemoveImage = document.getElementById('btnRemoveImage');
  const welcomeCard = document.getElementById('welcomeCard');
  const btnClearChat = document.getElementById('btnClearChat');
  const mathSymbolBar = document.getElementById('mathSymbolBar');

  // 設定與指南彈窗元素
  const btnOpenSettings = document.getElementById('btnOpenSettings');
  const btnCloseSettings = document.getElementById('btnCloseSettings');
  const btnCancelSettings = document.getElementById('btnCancelSettings');
  const btnSaveSettings = document.getElementById('btnSaveSettings');
  const settingsModal = document.getElementById('settingsModal');
  const inputApiKey = document.getElementById('inputApiKey');
  const selectModel = document.getElementById('selectModel');
  const inputCustomModel = document.getElementById('inputCustomModel');

  const btnOpenGuide = document.getElementById('btnOpenGuide');
  const btnCloseGuide = document.getElementById('btnCloseGuide');
  const btnUnderstandGuide = document.getElementById('btnUnderstandGuide');
  const guideModal = document.getElementById('guideModal');
  const systemStatusBadge = document.getElementById('systemStatusBadge');
  const statusText = document.getElementById('statusText');

  // 模型切換監聽
  selectModel.addEventListener('change', () => {
    if (selectModel.value === 'custom') {
      inputCustomModel.style.display = 'block';
      inputCustomModel.focus();
    } else {
      inputCustomModel.style.display = 'none';
    }
  });

  // 初始化設定讀取
  function initConfig() {
    const savedApiKey = localStorage.getItem('gemini_api_key') || '';
    let savedModel = localStorage.getItem('gemini_model') || 'gemini-3.8-flash';

    // 若瀏覽器先前記住了已停止向新用戶開放的舊版模型，自動升級為最新的 3.8
    if (savedModel === 'gemini-2.5-flash' || savedModel === 'gemini-1.5-pro') {
      savedModel = 'gemini-3.8-flash';
      localStorage.setItem('gemini_model', 'gemini-3.8-flash');
    }

    inputApiKey.value = savedApiKey;
    
    const standardOptions = Array.from(selectModel.options).map(o => o.value);
    if (standardOptions.includes(savedModel)) {
      selectModel.value = savedModel;
      inputCustomModel.style.display = 'none';
    } else {
      selectModel.value = 'custom';
      inputCustomModel.style.display = 'block';
      inputCustomModel.value = savedModel;
    }
    updateStatusBadge();
  }

  function updateStatusBadge() {
    const savedApiKey = localStorage.getItem('gemini_api_key');
    const savedModel = localStorage.getItem('gemini_model') || 'gemini-3.8-flash';

    if (savedApiKey) {
      statusText.textContent = `自訂金鑰就緒 (${savedModel})`;
      systemStatusBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    } else {
      statusText.textContent = `雲端託管模式 (${savedModel})`;
      systemStatusBadge.style.borderColor = 'rgba(99, 102, 241, 0.3)';
    }
  }

  // 快捷數學符號點擊插入
  if (mathSymbolBar) {
    mathSymbolBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.symbol-btn');
      if (!btn) return;
      const symbol = btn.getAttribute('data-symbol');
      if (!symbol) return;

      insertTextAtCursor(chatInput, symbol);
      chatInput.focus();
      autoResizeInput();
    });
  }

  function insertTextAtCursor(textarea, text) {
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const value = textarea.value;

    textarea.value = value.substring(0, startPos) + text + value.substring(endPos, value.length);
    textarea.selectionStart = textarea.selectionEnd = startPos + text.length;
  }

  // 輸入框高度自適應
  chatInput.addEventListener('input', autoResizeInput);
  function autoResizeInput() {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + 'px';
  }

  // 鍵盤送出 (Enter 送出, Shift+Enter 換行)
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  });

  btnSend.addEventListener('click', handleSubmit);

  // 圖片上傳處理
  btnUploadImage.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelected(file);
    }
  });

  // 支援全域貼上圖片 (Ctrl+V 截圖貼上)
  document.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (const item of items) {
      if (item.type.indexOf('image') === 0) {
        const file = item.getAsFile();
        handleFileSelected(file);
        break;
      }
    }
  });

  function handleFileSelected(file) {
    if (!file.type.startsWith('image/')) {
      alert('請選擇圖片檔案（jpg, png, webp 等）');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result.split(',')[1];
      currentImage = {
        data: base64Data,
        mimeType: file.type,
        fileName: file.name || '貼上的截圖.png',
        dataUrl: event.target.result
      };

      previewImage.src = currentImage.dataUrl;
      previewFileName.textContent = currentImage.fileName;
      imagePreviewBar.style.display = 'flex';
      chatInput.focus();
    };
    reader.readAsDataURL(file);
  }

  btnRemoveImage.addEventListener('click', () => {
    clearCurrentImage();
  });

  function clearCurrentImage() {
    currentImage = null;
    fileInput.value = '';
    imagePreviewBar.style.display = 'none';
    previewImage.src = '';
  }

  // 送出訊息
  async function handleSubmit() {
    if (isLoading) return;

    const text = chatInput.value.trim();
    if (!text && !currentImage) return;

    // 移除初始歡迎卡片
    if (welcomeCard && welcomeCard.parentNode) {
      welcomeCard.remove();
    }

    const userMessage = {
      role: 'user',
      content: text,
      image: currentImage ? { ...currentImage } : null
    };

    messages.push(userMessage);
    appendMessageUI(userMessage);

    // 清空輸入框與圖片
    chatInput.value = '';
    chatInput.style.height = 'auto';
    const sentImage = currentImage;
    clearCurrentImage();

    // 顯示 Loading
    isLoading = true;
    btnSend.disabled = true;
    const loadingElem = showLoadingUI();

    try {
      const apiKey = localStorage.getItem('gemini_api_key') || '';
      const model = localStorage.getItem('gemini_model') || 'gemini-3.8-flash';

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-gemini-api-key': apiKey } : {})
        },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            image: m.image ? { data: m.image.data, mimeType: m.image.mimeType } : undefined
          })),
          model
        })
      });

      loadingElem.remove();

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `連線失敗 (HTTP ${response.status})`);
      }

      const resData = await response.json();
      const modelMessage = {
        role: 'model',
        content: resData.reply,
        codeExecutions: resData.codeExecutions
      };

      messages.push(modelMessage);
      appendMessageUI(modelMessage);
    } catch (err) {
      if (loadingElem && loadingElem.parentNode) loadingElem.remove();
      appendErrorMessageUI(err.message);
    } finally {
      isLoading = false;
      btnSend.disabled = false;
      chatInput.focus();
    }
  }

  // 渲染訊息至畫面
  function appendMessageUI(msg) {
    const isUser = msg.role === 'user';
    const row = document.createElement('div');
    row.className = `message-row ${isUser ? 'user' : 'model'}`;

    const avatar = document.createElement('div');
    avatar.className = `avatar ${isUser ? 'user-avatar' : 'tutor-avatar'}`;
    avatar.textContent = isUser ? '👤' : '📐';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    // 若有附加圖片
    if (msg.image && (msg.image.dataUrl || msg.image.data)) {
      const imgWrap = document.createElement('div');
      imgWrap.className = 'message-image-wrap';
      const img = document.createElement('img');
      img.src = msg.image.dataUrl || `data:${msg.image.mimeType};base64,${msg.image.data}`;
      img.alt = '題目截圖';
      imgWrap.appendChild(img);
      bubble.appendChild(imgWrap);
    }

    // 文字內容處理（格式化段落與重點）
    const textElem = document.createElement('div');
    textElem.className = 'message-text';
    textElem.innerHTML = formatText(msg.content);
    bubble.appendChild(textElem);

    // 若有 Python 程式碼驗證紀錄
    if (msg.codeExecutions && msg.codeExecutions.length > 0) {
      const accordion = document.createElement('div');
      accordion.className = 'code-execution-accordion';

      const header = document.createElement('div');
      header.className = 'code-accordion-header';
      header.innerHTML = `<span>🐍 Python 雙軌程式驗證紀錄 (已通過)</span> <span>▾</span>`;

      const body = document.createElement('div');
      body.className = 'code-accordion-body';
      body.style.display = 'none';

      let codeDetails = '';
      msg.codeExecutions.forEach((exec) => {
        if (exec.type === 'executableCode') {
          codeDetails += `// 執行語言: ${exec.language}\n${exec.code}\n\n`;
        } else if (exec.type === 'codeExecutionResult') {
          codeDetails += `// 程式輸出結果 [${exec.outcome}]:\n${exec.output}\n`;
        }
      });

      const pre = document.createElement('pre');
      pre.textContent = codeDetails.trim();
      body.appendChild(pre);

      header.addEventListener('click', () => {
        const isShown = body.style.display !== 'none';
        body.style.display = isShown ? 'none' : 'block';
        header.querySelector('span:last-child').textContent = isShown ? '▾' : '▴';
      });

      accordion.appendChild(header);
      accordion.appendChild(body);
      bubble.appendChild(accordion);
    }

    row.appendChild(avatar);
    row.appendChild(bubble);

    messagesContainer.appendChild(row);
    scrollToBottom();
  }

  // 錯誤提示訊息
  function appendErrorMessageUI(errorText) {
    const row = document.createElement('div');
    row.className = 'message-row model';

    const avatar = document.createElement('div');
    avatar.className = 'avatar tutor-avatar';
    avatar.textContent = '⚠️';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    bubble.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';

    const text = document.createElement('div');
    text.className = 'message-text';
    text.innerHTML = `<strong>抱歉，連線發生錯誤：</strong><br>${escapeHtml(errorText)}<br><br><small>提示：請檢查右上角「⚙️ 設定」中的 Gemini API Key 是否正確。</small>`;
    bubble.appendChild(text);

    row.appendChild(avatar);
    row.appendChild(bubble);
    messagesContainer.appendChild(row);
    scrollToBottom();
  }

  // 載入中動畫 UI
  function showLoadingUI() {
    const row = document.createElement('div');
    row.className = 'message-row model';
    row.id = 'loadingMessageRow';

    const avatar = document.createElement('div');
    avatar.className = 'avatar tutor-avatar';
    avatar.textContent = '📐';

    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <span class="typing-text">AI 家教正在運算雙軌驗證中...</span>
    `;

    row.appendChild(avatar);
    row.appendChild(indicator);
    messagesContainer.appendChild(row);
    scrollToBottom();
    return row;
  }

  function scrollToBottom() {
    const chatMain = document.getElementById('chatMain');
    chatMain.scrollTop = chatMain.scrollHeight;
  }

  // 簡單安全文字轉 HTML（保留純文字與粗體，嚴禁 LaTeX）
  function formatText(raw) {
    if (!raw) return '';
    let escaped = escapeHtml(raw);

    // 粗體 **文字** 轉成 <strong>
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 條列項目 - 或 *
    escaped = escaped.replace(/^\s*[-*]\s+(.*)$/gm, '• $1');

    return escaped;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 清空對話
  btnClearChat.addEventListener('click', () => {
    if (confirm('確定要清空目前的對話紀錄並重新開始嗎？')) {
      messages = [];
      clearCurrentImage();
      messagesContainer.innerHTML = '';

      // 重新建立歡迎卡片
      const card = document.createElement('div');
      card.className = 'welcome-card';
      card.id = 'welcomeCard';
      card.innerHTML = `
        <div class="welcome-badge">🎓 台灣高中學測 / 國中數學專屬</div>
        <h2>歡迎來到 101 數學家教系統</h2>
        <p class="welcome-desc">
          已為您清空對話！請隨時在下方輸入新題目，或拍照/截圖上傳。
        </p>
      `;
      messagesContainer.appendChild(card);
    }
  });

  // 設定彈窗控制
  btnOpenSettings.addEventListener('click', () => {
    settingsModal.style.display = 'flex';
  });

  btnCloseSettings.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });

  btnCancelSettings.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });

  btnSaveSettings.addEventListener('click', () => {
    const key = inputApiKey.value.trim();
    let model = selectModel.value;

    if (model === 'custom') {
      const customVal = inputCustomModel.value.trim();
      if (!customVal) {
        alert('請輸入自訂模型代碼（例如 gemini-3.8-flash 或 gemini-4-argon）');
        inputCustomModel.focus();
        return;
      }
      model = customVal;
    }

    localStorage.setItem('gemini_api_key', key);
    localStorage.setItem('gemini_model', model);

    updateStatusBadge();
    settingsModal.style.display = 'none';
    alert(`設定已儲存！目前使用模型：${model}`);
  });

  // 使用指南彈窗控制
  btnOpenGuide.addEventListener('click', () => {
    guideModal.style.display = 'flex';
  });

  btnCloseGuide.addEventListener('click', () => {
    guideModal.style.display = 'none';
  });

  btnUnderstandGuide.addEventListener('click', () => {
    guideModal.style.display = 'none';
  });

  // 點擊背景關閉 Modal
  [settingsModal, guideModal].forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });

  // 初始化執行
  initConfig();
});
