# Projeto: tiktok-shop-video-ai

Projeto ativo: `tiktok-affiliate-copilot/` — app estático (HTML/CSS/JS puro, sem framework, sem build) para cadastro pessoal de produtos candidatos de afiliação no TikTok Shop. Sem IA generativa embutida, sem integração com APIs externas, sem backend — persistência via localStorage.

## Estado

- Fase 1 concluída: cadastro de produtos (criar, editar, excluir, listar), ver `tiktok-affiliate-copilot/index.html`, `style.css`, `app.js`.
- Nota histórica: uma tentativa anterior de pipeline de geração de vídeo via IA (Higgsfield/Creatify/Remotion) foi construída e depois descontinuada sem nunca ter sido validada contra API real (Fase 21 — reset completo; histórico preservado em `git log`).

## Máquina (verificado em sessão anterior — não inventar números diferentes; reverificar se muito tempo tiver passado)

- Windows 11 Home x64
- CPU Intel Core i5-13420H | RAM ~7.7 GB | GPU NVIDIA RTX 2050 4 GB VRAM
- Node.js 24.20.0 | npm/npx 11.19.0 | Bun 1.4.2
- Python 3.13.15
- Git 2.55.0 | Git LFS 3.7.1
- FFmpeg/FFprobe 9.0.2 (Gyan.FFmpeg, via winget)
