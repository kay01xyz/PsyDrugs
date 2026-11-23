// 此檔只含 Firebase 公開網頁 SDK 設定（設計上可放在前端）。
// 切勿把服務帳戶金鑰、Admin SDK、或 OPENAI / GEMINI 密鑰寫進此檔或任何會公開上載的檔案。
// 後端（Firestore、Storage、Cloud Functions、Auth）尚未在雲端建立／部署完成前，
// 本頁會改用 data/drugs.json，並清楚標示，不會假裝已經完成遷移。

export const firebaseConfig = {
  apiKey: "AIzaSyBoAC14gpltXMTNtH586QZcl-ean6qLQAk",
  authDomain: "psy-drugs-reference-7c29.firebaseapp.com",
  projectId: "psy-drugs-reference-7c29",
  storageBucket: "psy-drugs-reference-7c29.firebasestorage.app",
  messagingSenderId: "904099402655",
  appId: "1:904099402655:web:cb2663137a80fa353823aa"
};

// 建議與 Firestore / Storage 一併設在 asia-southeast1（須待地區確認後才建立）。
export const FUNCTIONS_REGION = "asia-southeast1";
