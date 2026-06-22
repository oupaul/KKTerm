<p align="center">
  <img src="src-tauri/icons/logo.png" alt="KKTerm" width="128" />
</p>

<h1 align="center">KKTerm</h1>

<p align="center">
  <strong>Uma única janela nativa do Windows para terminais, SSH, SFTP, RDP/VNC e um painel — mais uma IA que constrói as suas próprias ferramentinhas sob demanda.</strong>
</p>

<p align="center">
  <em>Porque a sua barra de tarefas não devia parecer um caça-níquel de Las Vegas.</em>
</p>

<p align="center">
  <sub>Batizado em homenagem ao <strong>乖乖 (Kuāi Kuāi)</strong>, o salgadinho verde de coco que os sysadmins taiwaneses colocam sobre os servidores para que se comportem. Esperamos que este app conquiste seu lugar no rack.</sub>
</p>

<p align="center">
  <strong><a href="https://github.com/ryantsai/KKTerm/releases/latest">Baixar o instalador mais recente do Windows (.exe)</a></strong>
</p>

<p align="center">
  <a href="https://github.com/ryantsai/KKTerm/stargazers">
    <img src="https://img.shields.io/github/stars/ryantsai/KKTerm?style=for-the-badge&logo=github&color=ffd33d" alt="GitHub stars" />
  </a>
  <a href="https://github.com/ryantsai/KKTerm/network/members">
    <img src="https://img.shields.io/github/forks/ryantsai/KKTerm?style=for-the-badge&logo=github&color=8a63d2" alt="GitHub forks" />
  </a>
  <a href="https://github.com/ryantsai/KKTerm/releases">
    <img src="https://img.shields.io/github/downloads/ryantsai/KKTerm/total?style=for-the-badge&logo=github&color=0969da" alt="GitHub downloads" />
  </a>
  <a href="https://github.com/ryantsai/KKTerm/issues">
    <img src="https://img.shields.io/github/issues/ryantsai/KKTerm?style=for-the-badge&logo=github&color=2ea043" alt="Open issues" />
  </a>
  <a href="https://github.com/ryantsai/KKTerm/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/ryantsai/KKTerm?style=for-the-badge&color=blue" alt="MIT License" />
  </a>
  <br />
  <img src="https://img.shields.io/badge/cross%E2%80%91platform-desktop-0078D6?style=flat-square" alt="Cross-platform desktop" />
  <img src="https://img.shields.io/badge/local--first-no%20telemetry-success?style=flat-square" alt="Local-first" />
  <br />
  <sub>
    <a href="README.md">English</a> ·
    <a href="README.zh-TW.md">繁體中文</a> ·
    <a href="README.zh-CN.md">简体中文</a> ·
    <a href="README.ja.md">日本語</a> ·
    <a href="README.ko.md">한국어</a> ·
    <a href="README.fr.md">Français</a> ·
    <a href="README.de.md">Deutsch</a> ·
    <a href="README.es.md">Español</a> ·
    <a href="README.es-MX.md">Español (MX)</a> ·
    <a href="README.it.md">Italiano</a> ·
    <strong>Português (BR)</strong> ·
    <a href="README.th.md">ไทย</a> ·
    <a href="README.id.md">Bahasa Indonesia</a> ·
    <a href="README.vi.md">Tiếng Việt</a>
  </sub>
</p>

---

## O pitch em 45 segundos

Você é sysadmin / DevOps / entusiasta de homelab / vibe-coder. Agora mesmo você tem:

- Um emulador de terminal
- Um cliente SSH à parte (com uma lista de perfis que levou um fim de semana inteiro pra montar)
- Um cliente SFTP de 2007 que, sabe-se lá como, ainda existe
- A Área de Trabalho Remota numa janela que você sempre perde no monitor errado
- Um visualizador VNC só por causa daquela máquina Linux
- Uma aba do navegador pra interface de administração do roteador
- Um gerenciador de arquivos pra fuçar no disco local, e um editor de texto só por causa daquele log que você vive deixando em `tail`
- Uma sessão `claude` / `codex` numa máquina remota que cai toda vez que o Wi-Fi espirra
- Um post-it com senhas *(relaxa, a gente não conta)*

**KKTerm é uma única janela pra tudo isso.** Nativo no Windows — *de propósito, enquanto o resto do mundo de ferramentas pra dev lança primeiro pro mac e trata o seu SO como uma nota de rodapé* — num único instalador que se recusa a telefonar pra casa.

Mais umas coisas que você não sabia que queria:

- Um **Dashboard** onde você fala pra uma IA *«monta um widget que dá ping no meu roteador a cada 30 segundos»* e ele aparece, na própria sandbox, na sua grade.
- **Painéis SSH que se reconectam à sua sessão remota `claude` / `codex`** depois de cada chilique do Wi-Fi, pra um trabalho de seis horas sobreviver a uma queda.
- **Workspaces** que mantêm o seu homelab, o trabalho e os servidores daquele cliente em contêineres separados e alternáveis.
- Um **medidor de uso de IA** pra você parar de bater de surpresa no muro do limite de uso às 3 da manhã.
- Um **Install Helper** que acha, instala, atualiza e abre as ferramentas pra dev do Windows que você normalmente caça por dez abas do navegador.
- **Vinte e cinco fundos animados** pro painel (sim, incluindo `matrix`), porque a gente não tem vergonha.

E a melhor parte: o assistente de IA consegue transformar uma única frase numa pequena ferramenta de painel que você realmente continua usando.

> ⭐ **Se isso parece o app que você vinha querendo construir nos últimos seis anos — dá uma estrela no repo pra gente saber que tem alguém de olho. Ajuda de verdade.**

Tem uma opinião sobre o que deveria vir a seguir? Entra na thread pública de feedback:
**[O que o KKTerm deveria priorizar para fluxos de administração multiplataforma?](https://github.com/ryantsai/KKTerm/discussions/141)**

---

## Por que «KKTerm»?

Entre em qualquer data center taiwanês e olhe o topo dos racks. Passando pelas fábricas da TSMC, salas de controle do metrô de Taipei, salas de servidores do banco Cathay, equipamentos de comutação da Chunghwa Telecom — você vai avistar um saquinho verde de 乖乖 (Kuāi Kuāi), um salgadinho de milho com sabor de coco dos anos 1960.

O nome significa literalmente **«seja bonzinho»**, **«comporte-se»**. A tradição de TI é simples e totalmente séria:

- **Tem que ser verde (coco).** Amarelo (curry) significa *fique em casa hoje*; vermelho (apimentado) deixa o servidor com raiva. Só verde.
- **Não pode estar vencido.** Um Kuai Kuai passado joga contra você. Os engenheiros trocam com diligência.
- **Tem que estar visível.** O servidor precisa saber que ele está ali.
- **Não coma.** Aquele saquinho está de plantão.

Alguns dos sistemas maiores, mais entediantes e mais obcecados por uptime da Ásia rodam com um saquinho de salgadinho de milho colado no chassi. Funciona porque quem os mantém acredita que funciona, o que é uma descrição notavelmente honesta de grande parte da cultura de TI.

**KKTerm** é **Kuai Kuai Term** — um espaço de administração que aspira ao mesmo trabalho do salgadinho: sentar quietinho ao lado das suas máquinas importantes e ajudá-las a se comportar. Local primeiro. Sem telemetria. IA com aprovação. Aquele tipo de software entediante e confiável.

Ainda não conseguimos enviar um saquinho de Kuai Kuai de verdade junto com o instalador. Isso é item pra v2.

---

## Ver em movimento

<p align="center">
  <a href="https://github.com/ryantsai/KKTerm">
    <img
      src="docs/assets/demo.gif"
      alt="KKTerm demo"
      width="720"
    />
  </a>
</p>

<p align="center"><sub><em>(O GIF de demonstração. Uma imagem vale mais que mil bullet points, e nossos bullet points acabaram.)</em></sub></p>

<p align="center">
  <img src="docs/assets/screenshots/hero.png" alt="A janela completa do KKTerm: árvore de conexões, uma grade de Panes ao vivo e o assistente de IA" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Espaço para screenshot</strong> — o workspace inteiro num relance: árvore de conexões à esquerda, uma grade de Panes ao vivo no centro, assistente de IA à direita.</em></sub></p>

---

## Uma janela, cada conexão

| Você queria… | O KKTerm faz |
| --- | --- |
| Abrir um shell local PowerShell / cmd / WSL | Terminais locais, lado a lado |
| SSH num servidor | SSH com chaves, agent, senhas, jump hosts e encaminhamento de portas |
| Navegar pelos arquivos desse servidor | SFTP a partir da conexão SSH — painel duplo, arraste para transferir |
| FTP num NAS de 2012 | FTP / FTPS no mesmo navegador de arquivos |
| Telnet num equipamento pré-histórico | Sim, Telnet também está aí |
| Falar com uma porta serial | Conexões seriais — escolha porta COM e baud |
| Acessar remotamente uma máquina Windows | A verdadeira Área de Trabalho Remota da Microsoft, embutida |
| VNC num Pi | VNC, renderizado direto no espaço de trabalho |
| Abrir a interface web do roteador | Uma aba de navegador embutida com logins salvos |
| Navegar pelo seu próprio disco | Um painel File Explorer local, o mesmo painel duplo do SFTP |
| Abrir um log, CSV, imagem ou PDF | Um visualizador Document embutido com um verdadeiro modo de log em acompanhamento (tail) |
| Acompanhar a CPU do host | Uma barra de status ao vivo e um painel que você mesmo monta |

O mesmo app. A mesma janela. Os mesmos atalhos. O mesmo tema, que tomara não faça seus olhos sangrarem.

<p align="center">
  <img src="docs/assets/screenshots/connections-grid.png" alt="Uma única Tab com SSH, SFTP e uma UI web embutida lado a lado" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Espaço para screenshot</strong> — uma única Tab, vários tipos de Connection convivendo: SSH ao lado de SFTP ao lado de uma UI web embutida.</em></sub></p>

---

## Por que as pessoas deixam aberto o dia inteiro

### Download pequeno, abertura relâmpago

O KKTerm foi feito para parecer uma utilidade, não uma plataforma. As builds desktop atuais ficam por volta de 10-13 MB, instalam rápido e abrem tão depressa que abrir seu workspace de administração não parece iniciar um segundo sistema operacional.

Esse tamanho pequeno importa em jump boxes, notebooks antigos e VMs, onde cada serviço em segundo plano a mais é mais uma coisa para desconfiar. O KKTerm abre, restaura seu workspace e sai do caminho.

### Grades multipainel, misturadas do seu jeito

Uma Tab pode ter uma grade de Panes, e esses Panes não precisam ser do mesmo tipo. Coloque SSH ao lado de SFTP, uma PowerShell local abaixo de uma RDP Session, VNC ao lado da interface web do roteador, ou um navegador de arquivos perto do terminal que está movendo os arquivos.

É um único workspace para o formato real e bagunçado do trabalho de administração: misture tipos de Connection, redimensione a grade, mantenha as live Sessions vivas e pare de usar Alt-Tab entre uma pilha de janelas.

<p align="center">
  <img src="docs/assets/screenshots/multi-pane.png" alt="Uma Tab dividida em quatro painéis de tipos de conexão diferentes" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Espaço para screenshot</strong> — uma grade de quatro: PowerShell, uma sessão SSH, um navegador SFTP e uma superfície VNC, tudo numa única Tab.</em></sub></p>

### Um assistente de IA que constrói suas ferramentas

A maioria das demos de «IA no seu terminal» para no chat. O assistente do KKTerm também consegue construir pequenos widgets de painel duráveis, no formato de como você realmente trabalha — e mantém o perigoso atrás de um interruptor:

- **Decida o que ele pode tocar** — ligue ou desligue famílias inteiras de ferramentas (Dashboard / Connections / Live Sessions).
- **Decida como ele pergunta** — `Prompt` (padrão, pergunta toda vez) ou `Allow All` (você é adulto, assinou o termo).

Qualquer coisa parecida com `rm -rf` é marcada como perigosa e espera um sim humano explícito. A IA não consegue rodar escondido um comando destrutivo só porque alguém deu uma de esperto com um prompt injection numa man page.

Ele conversa com OpenAI, Anthropic, OpenRouter, DeepSeek, Grok, Azure OpenAI, LiteLLM, GitHub Copilot, Ollama, NVIDIA ou qualquer endpoint compatível com OpenAI. Suas chaves de API vão pro chaveiro do SO.

Ele também consegue ver o que você vê: capture uma região ou um Pane inteiro com o **menu de screenshot** e mande direto pra conversa, pra que «por que esse diálogo está com cara estranha?» vire uma pergunta que o assistente realmente consegue responder.

<p align="center">
  <img src="docs/assets/screenshots/ai-assistant.png" alt="O painel do assistente de IA com os interruptores de acesso a ferramentas e modo de aprovação" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Espaço para screenshot</strong> — o painel do assistente de IA: interruptores por família de ferramentas, o botão Prompt / Allow All, e um comando perigoso esperando um sim humano.</em></sub></p>

### Um painel que não finge ser o Grafana

O Dashboard é uma grade de widgets que você arrasta e redimensiona. Não é pra observabilidade em escala de petabytes — é pra «quero um botão que abra meus cinco apps favoritos e um painel mostrando o uptime do meu host SSH, *do lado* do meu chat».

#### Widgets criados pela IA — descreva, e pronto

Essa é a parte que a gente fica genuinamente animado. Você não escolhe de um marketplace nem escreve JavaScript. Você **diz ao assistente de IA o que quer**, e ele constrói o widget ali mesmo, no seu painel:

> *«Adiciona um widget mostrando os últimos 5 commits do meu repo principal em lista.»*
> *«Faz um widget de post-it pra minha cola de plantão.»*
> *«Constrói um widget que dá ping no meu roteador de casa a cada 30 segundos e mostra verde/vermelho.»*
> *«Preciso de um cronômetro. Me surpreende no estilo.»*

Alguns são simples painéis de exibição (markdown, listas de tarefas, um número grandão); outros rodam código ao vivo numa sandbox isolada que você aprova. Cada widget que você guarda é seu — fica salvo com a própria cor, ícone e título, e você pode ter várias cópias de tamanhos diferentes. Apague um com o botão direito quando a mágica passar.

<p align="center">
  <img src="docs/assets/screenshots/ai-widgets.png" alt="Uma grade de painel cheia de widgets criados pela IA" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Espaço para screenshot</strong> — uma visão de painel cheia de widgets feitos pela IA: um monitor de ping, um post-it, uma estatística ao vivo e um brinquedinho que não tem o menor direito de ser tão divertido.</em></sub></p>

#### Fundos animados do painel (porque a gente quis)

Escolha um clima por visão do painel entre **vinte e cinco** fundos animados em canvas:

| Clima | Fundos |
| --- | --- |
| Calmo | `aurora`, `clouds`, `ocean`, `raindrops`, `rainywindow`, `frostedWindow`, `snow`, `sakura`, `fireflies`, `bubbles`, `aquarium`, `ricefield`, `lanterns` |
| Espacial | `starfield`, `nebula` |
| Quente | `embers`, `lava` |
| Geek | `matrix`, `topo`, `synthwave` |
| Agitado | `cyberpunk`, `taipei101`, `thunderstorm`, `confetti`, `particleCursor` |

Eles pausam quando você está em outro lugar, então custam quase nada. Combine `matrix` com o seu assistente de IA pra um clima que diz «sou extremamente produtivo e provavelmente estou dentro de um filme das Wachowski». Ou escolha `ocean` e pareça uma pessoa séria. Não julgamos nenhuma das duas escolhas.

<p align="center">
  <img src="docs/assets/screenshots/backgrounds.png" alt="Alguns dos fundos animados lado a lado" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Espaço para screenshot</strong> — uma cartela de climas: `matrix`, `aurora`, `synthwave` e `taipei101`.</em></sub></p>

### Mantenha vivos os seus agentes de IA remotos

Essa é a segunda função pela qual as pessoas se apaixonam. Os terminais SSH do KKTerm podem te jogar direto numa **sessão tmux nomeada** no host remoto que sobrevive à reconexão:

- Abra uma conexão SSH com tmux ativado e inicie `claude`, `codex`, `gemini-cli`, `cursor-agent` ou o agente de longa duração que você preferir.
- Feche o notebook. Abra de novo. O painel se reconecta em silêncio — o agente ainda está rodando, mantém seu scrollback, no meio do que estava fazendo.
- Uma piscada na rede? O KKTerm reconecta discretamente à mesma sessão sem te incomodar.
- Quer a ajuda do assistente? «Adicionar o buffer do terminal ao contexto» puxa a sessão remota inteira pra conversa, pra sua IA local raciocinar sobre o que o seu agente remoto está fazendo.

Se você já perdeu uma sessão `claude` ou `codex` de seis horas pro Wi-Fi instável de um hotel, essa função sozinha já paga o app. (O app é grátis. A função vale a pena mesmo assim.)

Os shells locais ganham o mesmo truque no Windows: os painéis PowerShell podem rodar dentro do **psmux**, o clone nativo do tmux, pra que seus processos locais de longa duração sobrevivam a um Pane fechado igual aos remotos.

<p align="center">
  <img src="docs/assets/screenshots/tmux-reattach.png" alt="Um painel SSH se reconectando a uma sessão tmux nomeada após uma reconexão" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Espaço para screenshot</strong> — a lista de sessões tmux/psmux na barra de ferramentas do Pane, com um agente `claude` remoto ainda rodando após uma reconexão.</em></sub></p>

### Saber quanta IA ainda te resta

Os agentes de programação cobram por janela do plano, não por mês, e devoram alegremente a sua cota enquanto você está numa reunião. O **medidor de uso de IA** mantém isso à vista:

- Um widget de painel mostrando **Claude Code** e **Codex** lado a lado: conta conectada, plano, consumo da janela atual e desta semana, hora do próximo reset.
- Um **indicador compacto na barra de status** que espelha os mesmos números, pra que mesmo com o painel fechado você veja num relance se tem folga antes da próxima grande refatoração.
- Ele te avisa com antecedência se você precisa logar de novo — *antes* de uma tarefa longa, não no meio dela.

<p align="center">
  <img src="docs/assets/screenshots/usage-meter.png" alt="O widget do medidor de uso de IA e o indicador na barra de status" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Espaço para screenshot</strong> — o widget de uso mostrando Claude Code e Codex lado a lado, mais o espelho compacto na barra de status.</em></sub></p>

### Mantenha seus mundos separados com Workspaces

O homelab, o trabalho e os servidores daquele cliente não pertencem à mesma lista. **Workspaces** são contêineres de Connections nomeados e isolados entre os quais você alterna pela Activity Rail. Alternar reescopa só a árvore de conexões — suas Sessions abertas, o Dashboard e as configurações ficam onde estão — então mudar de contexto custa um clique, não um reinício.

<p align="center">
  <img src="docs/assets/screenshots/workspaces.png" alt="O seletor de workspace na activity rail" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Espaço para screenshot</strong> — o seletor de workspace no topo da Activity Rail, no meio da troca entre «Home Lab» e «Day Job».</em></sub></p>

### Arquivos e logs, na mesma janela

Nem tudo é um host remoto. O KKTerm navega pelo seu **disco local** num Pane File Explorer (o mesmo painel duplo do SFTP), e abre um único arquivo num **visualizador Document** que escolhe o modo certo pra cada caso: texto/código com um editor leve e salvamento seguro, Markdown, tabelas CSV/TSV, JSON, imagens, PDF, e um **modo Log** dedicado com coloração por nível, filtro, ANSI e acompanhamento (tail). Chega de recorrer a um editor separado só pra ler o log do lado do qual você já está.

<p align="center">
  <img src="docs/assets/screenshots/file-viewer.png" alt="O visualizador Document em modo log-tail ao lado de um painel file explorer" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Espaço para screenshot</strong> — o visualizador Document acompanhando um log ao vivo (cores por nível + filtro) ao lado de um Pane File Explorer local.</em></sub></p>

### Deixe outras IAs pilotarem o KKTerm

O KKTerm traz o próprio servidor MCP, pra que agentes de programação externos (Claude Code, Codex, Copilot, Antigravity, OpenCode) usem o seu espaço de trabalho como você usa — listar conexões, abrir uma, ler um buffer de terminal, posicionar widgets no painel. De IA pra IA, na sua máquina, sem relay na nuvem. As ações que modificam, as mais arriscadas, ficam atrás de um único interruptor de segurança **desligado** por padrão.

Configurações → AI Assistant → **Built-in MCP Server** tem um diálogo «Mostrar configuração» de um clique, já preenchido, além de comandos `claude mcp add` / `codex mcp add` pra copiar.

<p align="center">
  <img src="docs/assets/screenshots/mcp-server.png" alt="As configurações do servidor MCP embutido com o diálogo de mostrar configuração" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Espaço para screenshot</strong> — o painel Built-in MCP Server com o diálogo «Mostrar configuração» e o interruptor de segurança (desligado por padrão).</em></sub></p>

---

## O que o KKTerm não é

Uma lista curta, porque honestidade conquista confiança:

- **Não é um produto de nuvem.** Sem sincronização, sem contas de equipe, sem plano SaaS. Se você um dia vir um diálogo «Entrar no KKTerm», algo deu catastroficamente errado.
- **Não finge que todos os sistemas operacionais são idênticos.** O KKTerm publica builds para Windows, macOS e Linux, mas mantém claras as funções específicas de cada plataforma.
- **Não é um agente de IA autônomo.** O assistente propõe; o humano decide. `Allow All` é uma escolha que você faz, não um padrão.
- **Não é um substituto pro Grafana / Datadog.** O Dashboard é pra superfícies de controle pessoais, não pra observabilidade de 10 mil hosts.
- **Não é uma IDE de Kubernetes.** É um espaço de administração centrado no terminal. Por favor, não peça pra ele renderizar um chart do Helm.

Se algum desses pontos *era* um motivo de desistência — justo, a gente se vê na v2.

---

## Pegue o KKTerm

**[Baixe o instalador mais recente do Windows (.exe)](https://github.com/ryantsai/KKTerm/releases/latest)** e execute. O instalador no momento está **sem assinatura** — a assinatura de release está no roadmap, então até lá o seu antivírus pode te olhar torto. É normal.

Quer compilar do código-fonte ou contribuir? Tudo que você precisa está em [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Roadmap (versão curta)

- Builds macOS + Linux
- Instalador assinado + atualização automática
- Mais poder na transferência de arquivos (retomar, sync de pastas, arquivar/extrair)
- Compartilhamento de área de transferência e dispositivos mais rico na Área de Trabalho Remota
- Mais widgets de painel embutidos

Versão completa e atualizada com frequência: [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## Contribuir

A gente adoraria uma mão. De verdade. Até coisas pequenas importam:

- **Teste a build de desenvolvimento** e abra uma issue quando algo parecer errado. «Pareceu estranho» é um relatório de bug legítimo; a gente investiga junto.
- **Traduza um idioma.** O inglês é a fonte da verdade; outros treze idiomas vivem ao lado.
- **Adicione um widget de painel.** Pegue uma ideia pequena, lance, aprenda o padrão.
- **Melhore o manual.** Se você usou uma função e a documentação não ajudou, uma PR que conserta isso vale ouro.

Setup completo, estrutura do projeto e checklist de PR estão em [`CONTRIBUTING.md`](CONTRIBUTING.md). Procurando um ponto de entrada? Filtre as issues abertas por [`good first issue`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) ou [`help wanted`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22).

---

## Documentos do projeto

- [Contexto de produto](CONTEXT.md) — a linguagem de domínio que você deve respeitar
- [Arquitetura](docs/ARCHITECTURE.md) — mapa de módulos, onde colocar código novo
- [Manual do usuário](docs/manual/INDEX.md) — um passeio recurso por recurso
- [Roadmap](docs/ROADMAP.md)
- [Arquitetura do Dashboard](docs/DASHBOARD.md)
- [Servidor MCP embutido](docs/MCP.md)
- [Guia de provedores de IA](docs/AI_PROVIDERS.md)

---

## Histórico de estrelas

<a href="https://www.star-history.com/#ryantsai/KKTerm&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date" />
  </picture>
</a>

Se você chegou até aqui e ainda não deu uma estrela — o que está esperando, um convite pessoal? Considere este o convite pessoal.

⭐ **[Dê uma estrela ao KKTerm no GitHub](https://github.com/ryantsai/KKTerm)** — custa um clique e alegra a semana inteira do mantenedor. Pense nisso como um 乖乖 digital no rack.

---

## Licença

MIT. Veja [LICENSE](LICENSE). Use, faça fork, publique, coloque num homelab que ninguém mais vai achar — esse é o trato.
