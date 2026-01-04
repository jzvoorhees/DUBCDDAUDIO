# DubSync Studio Pro (Local Engine)

Uma ferramenta profissional para sincronização de dublagem (PT-BR) com áudio original (EN-US) utilizando análise RMS e processamento multicanal local.

**ESTE PROJETO É 100% OFFLINE. NÃO REQUER API KEY (GEMINI/OPENAI).**

## Arquitetura
- **Frontend:** React (Interface de Controle)
- **Backend:** Python + FastAPI (Processamento de Áudio)
- **Engine:** FFmpeg (Manipulação de Áudio Multicanal)

## Pré-requisitos
1. **Node.js** (Para rodar a interface)
2. **Python 3.8+** (Para rodar o motor de áudio)
3. **FFmpeg** instalado e adicionado às variáveis de ambiente (PATH) do sistema.

## Instalação

### 1. Backend (Python)
Abra um terminal na pasta do projeto e instale as dependências:
```bash
pip install fastapi uvicorn
```

### 2. Frontend (React)
No mesmo terminal, instale as dependências do Node:
```bash
npm install
```

## Como Usar

1. **Inicie o Backend:**
   ```bash
   python backend.py
   ```
   *Mantenha essa janela do terminal aberta.*

2. **Inicie o Frontend:**
   Abra um **novo** terminal e rode:
   ```bash
   npm run dev
   ```

3. **Acesse:**
   Abra `http://localhost:5173` (ou a porta indicada) no seu navegador.

4. **Operação:**
   - Selecione o arquivo Master (EN-US).
   - Selecione o arquivo Dublado (PT-BR).
   - Clique em "Initialize Sync".
   - O Python irá processar o áudio localmente usando FFmpeg.
