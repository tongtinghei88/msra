# MSRA — 處理 MSRA

## 對話開始時請先讀
進度與最近更動都在 Obsidian：`secondbrain/Projects/MSRA/工作筆記.md`

## 工作模式
- **加新功能**：對 Claude 說需求 → Claude 會在專案內實作
- **結束工作**：對 Claude 說「**收工**」→ 自動 commit + push + 更新 Obsidian 工作筆記
- **接續工作**：對 Claude 說「讀工作筆記、告訴我上次做到哪」

## 工作桌 + 三個家
- 📋 GDrive 工作桌：`G:\我的雲端硬碟\Codex-Work\MSRA\`（自動跨電腦同步）
- 🐙 GitHub repo：`tongtinghei88/msra`（公開）
- 📘 Obsidian 駕駛艙：`secondbrain/Projects/MSRA/工作筆記.md`（想法的家）
- 🔥 Firebase 專案：`ai-agent48`（資料的家）

## 技術棧
- 前端：HTML/CSS/JS
- 後端：Firebase（Hosting / Firestore / Auth / Functions）

## 工作注意事項
- commit 訊息要寫清楚做了什麼 + 為什麼
- 收工前說「收工」讓 Claude 同步三方
- `AGENTS.md` 是 Codex + OpenCode 共享藍圖
