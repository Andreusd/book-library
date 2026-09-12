# 📚 Estante Digital - Book Library WebApp

Aplicação web moderna, rápida e responsiva para visualização e leitura da sua biblioteca de livros em PDF localizada em `C:\Users\andre\OneDrive\Andreusd\Livros`.

## 🚀 Como Executar

Basta dar **duplo clique** no arquivo:
```cmd
run.bat
```
Ou pelo terminal:
```bash
python -m uvicorn server.main:app --host 127.0.0.1 --port 8000
```
O app estará acessível em: **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

### 📦 Configuração Inicial (apenas se clonar em novo ambiente)
```bash
# 1. Instalar dependências Python
pip install -r server/requirements.txt

# 2. Instalar dependências e gerar o build do frontend
cd client
npm install
npm run build
cd ..
```

---

## ✨ Recursos Implementados

* **Estrutura por Estantes**: Cada pasta da sua biblioteca é mapeada diretamente como uma estante (ex: *Algoritmos e Estruturas*, *Arquitetura de Software*, *Computação*, *IA*, *Matemática*, etc.).
* **Capas Idênticas ao Windows Explorer**: Renderização de alta fidelidade da primeira página de cada PDF usando o motor Google PDFium (`pypdfium2`).
* **Segurança Total para o OneDrive**: A pasta do OneDrive permanece **100% em modo somente-leitura**. O cache de capas e o progresso de leitura são salvos localmente na pasta `.cache/` do projeto, sem poluir seus arquivos na nuvem.
* **Clique Direto para Leitura**: Clicar em qualquer capa abre instantaneamente o leitor em tela cheia no navegador.
* **Memória de Página (Progresso)**: O app salva automaticamente a página exata em que você parou e a porcentagem lida.
* **Sessão "Continuar Lendo"**: Na tela inicial, os livros lidos recentemente aparecem no topo para retomada imediata com 1 clique.
* **Leitor PDF Integrado**:
  * Navegação rápida por páginas (setas, teclado, input numérico).
  * Zoom ajustável (+, -, ajustar à largura).
  * Modo leitura noturna (inversão de cores para PDFs claros).
  * Botão de atalho para abrir no leitor padrão do Windows (Firefox, Acrobat, Sumatra).
* **Busca Global Instantânea**: Pesquise títulos instantaneamente digitando ou pressionando `/`.
* **Filtros e Ordenação**: Ordene por nome (A-Z ou Z-A), tamanho do arquivo ou livros lidos recentemente.

---

## ⌨️ Atalhos do Teclado

| Tecla | Ação |
| :--- | :--- |
| `/` | Focar na barra de busca |
| `Seta Direita` / `Espaço` / `Page Down` | Próxima página (no leitor) |
| `Seta Esquerda` / `Page Up` | Página anterior (no leitor) |
| `+` / `-` | Aumentar / diminuir zoom |
| `Esc` | Sair do leitor e voltar à estante |

---

## 🛠️ Tecnologias

* **Backend**: Python 3.14, FastAPI, Uvicorn, PyPDFium2, Pillow.
* **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React, PDF.js.
