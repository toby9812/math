// netlify/functions/chat.js
// 101 數學家教系統 (GSAT Math Tutor) - Gemini API 整合端點

const SYSTEM_INSTRUCTION = `
你是一套專為台灣高中以下（特別針對學測 GSAT）設計的「101 AI 數學家教系統」。
你必須結合以下三大角色規範，以及一條至高無上的格式法則：

=======================================================
【至高格式法則：嚴禁使用 LaTeX】
在所有回覆、算式與步驟中，一律使用純文字與常見 Unicode 數學符號：
- 例如：√、²、³、×、÷、±、π、≤、≥、≠、△、∠、1/2、x² + 2x - 3 = 0
- 絕對禁止使用任何 LaTeX 標籤或語法（例如 $...$、$$...$$、\\frac{}{}、\\sqrt{}、\\times、\\cdot、\\theta 等）。
- 必須保證在任何純文字介面中皆能直接閱讀，無排版錯誤。
=======================================================

【三大角色協調流程】

1. 前台協調者 (tutor_coordinator) - 題意轉錄確認：
   - 當學生剛提出一道新的數學題目（上傳圖片或輸入文字）時：
     * 若為圖片：辨識圖中文字與圖表，用純文字與 Unicode 符號重述題目，並親切回覆：「我看到的題目是：___，數字和符號都正確嗎？」
     * 若為文字：將題目拆解為「已知條件」與「求解目標」，條列給學生看，並回覆：「我理解的條件是：___，求：___，這樣對嗎？」
     * ⚠️ 關鍵規則：在學生未確認題意之前，絕對不可以開始解題或給出計算步驟！

2. 嚴格解題引擎 (math_solver) - 雙軌程式碼驗證：
   - 當學生確認題目無誤後，你必須先在心中（或使用 Python 程式碼執行功能）進行嚴格驗證：
     * 檢查題目條件完整性與邏輯一致性。
     * 進行雙軌驗證（路徑 A：直接推導/公式解 vs. 路徑 B：代數檢驗/窮舉模擬/SymPy 符號計算）。
     * 確定兩軌結果完全一致後，求出精確答案與每一步驟的中間數值。
     * 記錄 2–3 個學生容易掉入的陷阱或常見錯誤點。

3. 鷹架引導家教 (shape_tutor) - 碎步微鷹架導引：
   - 題目驗證完成後，無縫轉換為有溫度的台灣高中家教：
     * 語氣：親切、正向、支持、富同理心。
     * 碎步鷹架（Micro-Scaffolding）：每次只推下一步！回覆控制在 3 句話以內，結尾必須附帶一個具啟發性的引導提問。
     * 絕不直接給出最終答案，也不一口氣貼出整串解法。引導學生自己一步步推導出來。
     * 學生答對時：給予真誠讚賞，簡述概念。
     * 學生答錯或卡住時：精確指出第幾步出錯，用白話比喻說明卡點，並提供提問導航：
       【What 觀念】、【How 步驟】、【Why 方法】
     * 學生嘗試逃避思考或要求直接給答案時：溫和守住底線，引導他從最簡單的第一步觀察起。
`;

exports.handler = async function (event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-gemini-api-key, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { messages = [], image = null, model = 'gemini-3.8-flash' } = payload;

    // 優先順序：自訂 header > request body > Netlify 環境變數
    const apiKey =
      event.headers['x-gemini-api-key'] ||
      event.headers['X-Gemini-Api-Key'] ||
      payload.apiKey ||
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: '尚未設定 Gemini API Key。請點擊右上角「⚙️ API Key 設定」填入金鑰，或於 Netlify 環境變數中新增 GEMINI_API_KEY。'
        })
      };
    }

    // 組裝 Gemini 訊息格式
    const contents = [];

    // 歷史對話
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const role = msg.role === 'user' ? 'user' : 'model';
      const parts = [];

      // 若該則訊息包含圖片（通常是使用者上傳的題目截圖）
      if (msg.image && msg.image.data && msg.image.mimeType) {
        parts.push({
          inlineData: {
            mimeType: msg.image.mimeType,
            data: msg.image.data
          }
        });
      }

      if (msg.content) {
        parts.push({ text: msg.content });
      }

      if (parts.length > 0) {
        contents.push({ role, parts });
      }
    }

    // 若最後一則剛好有另外傳入的即時圖片
    if (image && image.data && image.mimeType) {
      if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
        contents[contents.length - 1].parts.unshift({
          inlineData: {
            mimeType: image.mimeType,
            data: image.data
          }
        });
      }
    }

    if (contents.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '訊息內容不可為空' })
      };
    }

    // 呼叫 Google Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${apiKey}`;

    const geminiRequestBody = {
      contents,
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }]
      },
      tools: [
        {
          codeExecution: {}
        }
      ],
      generationConfig: {
        temperature: 0.3,
        topP: 0.95
      }
    };

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(geminiRequestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = `Gemini API 回傳錯誤 (${response.status})`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error && errJson.error.message) {
          errMsg = errJson.error.message;
        }
      } catch (e) {
        errMsg = errText;
      }
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: errMsg })
      };
    }

    const data = await response.json();
    const candidate = data.candidates && data.candidates[0];

    if (!candidate || !candidate.content || !candidate.content.parts) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: '模型未回傳有效內容，請稍後重試。' })
      };
    }

    let replyText = '';
    const codeExecutions = [];

    // 解析包含代碼執行與文字的回應
    for (const part of candidate.content.parts) {
      if (part.text) {
        replyText += part.text;
      }
      if (part.executableCode) {
        codeExecutions.push({
          type: 'executableCode',
          language: part.executableCode.language,
          code: part.executableCode.code
        });
      }
      if (part.codeExecutionResult) {
        codeExecutions.push({
          type: 'codeExecutionResult',
          outcome: part.codeExecutionResult.outcome,
          output: part.codeExecutionResult.output
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply: replyText.trim(),
        codeExecutions,
        model
      })
    };
  } catch (error) {
    console.error('Error in chat function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || '伺服器內部錯誤' })
    };
  }
};
