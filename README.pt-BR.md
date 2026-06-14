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
- Uma sessão `claude` / `codex` numa máquina remota que cai toda vez que o Wi-Fi espirra
- Um post-it com senhas *(relaxa, a gente não conta)*

**KKTerm é uma única janela pra tudo isso.** Nativo no Windows — *de propósito, enquanto o resto do mundo de ferramentas pra dev lança primeiro pro mac e trata o seu SO como uma nota de rodapé* — num único instalador que se recusa a telefonar pra casa.

Mais umas coisas que você não sabia que queria:

- Um **Dashboard** onde você fala pra uma IA *«monta um widget que dá ping no meu roteador a cada 30 segundos»* e ele aparece, na própria sandbox, na sua grade.
- **Painéis SSH que se reconectam à sua sessão remota `claude` / `codex`** depois de cada chilique do Wi-Fi, pra um trabalho de seis horas sobreviver a uma queda.
- Um **medidor de uso de IA** pra você parar de bater de surpresa no muro do limite de uso às 3 da manhã.
- Um **Installer Helper** que acha, instala, atualiza e abre as ferramentas pra dev do Windows que você normalmente caça por dez abas do navegador.
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

<p align="center"><sub><em>(O GIF de demonstração vai aqui. Uma imagem vale mais que mil bullet points, e nossos bullet points acabaram.)</em></sub></p>

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
| Acompanhar a CPU do host | Uma barra de status ao vivo e um painel que você mesmo monta |

O mesmo app. A mesma janela. Os mesmos atalhos. O mesmo tema, que tomara não faça seus olhos sangrarem.

---

## Por que as pessoas deixam aberto o dia inteiro

### Windows primeiro, de propósito

Olhe o cenário das ferramentas pra dev. Claude Code: mac/linux primeiro, Windows é «usa WSL». Codex CLI: a mesma coisa. Metade das ferramentas novas e brilhantes sai primeiro pro mac e deixa pros usuários de Windows um comentário `# contributions welcome` e um script de autocompletar que não roda.

Enquanto isso, quem de fato mantém as empresas no ar — TI corporativa, MSPs, qualquer um administrando um controlador de domínio mais velho que alguns estagiários — está sentado em máquinas Windows se perguntando por que toda ferramenta nova trata o SO deles como um incômodo.

**O KKTerm faz o trato oposto.** Construímos nativo pro Windows primeiro, então o que importa pra quem está no Windows simplesmente funciona: a *verdadeira* Área de Trabalho Remota da Microsoft (a mesma do `mstsc.exe`, não um clone), shells reais de PowerShell / cmd / WSL, segredos guardados no Gerenciador de Credenciais do Windows, um ícone de bandeja de verdade, menus e diálogos nativos. As builds de macOS e Linux estão no roadmap e vão receber o mesmo cuidado. Mas se você estava esperando alguém construir a *boa* ferramenta de administração do Windows primeiro em vez de por último — esse é o trato.

### Local primeiro significa de verdade local

Suas conexões salvas vivem num arquivo na sua máquina. As senhas vivem no Gerenciador de Credenciais do Windows, não num arquivo de texto ao lado do app. O KKTerm não envia analytics, não telefona pra casa ao iniciar e não precisa de conta na nuvem pra abrir. Não tem «faça login pra sincronizar» porque não tem sincronização.

Se o seu cabo de rede pegar fogo, o KKTerm abre do mesmo jeito.

### Terminais que não piram

- Painéis divididos dentro de uma Tab.
- Renderização rápida e fluida, com scrollback pesquisável.
- Reconectar significa de verdade *reconectar* — sua sessão remota retoma de onde parou, não «começar do zero e fingir que a última hora não aconteceu».
- Trocar de Tab **não** mata a Session. Fechar a Tab, sim. Essa distinção foi uma guerra religiosa interna; a gente ganhou.

### Um assistente de IA que constrói suas ferramentas

A maioria das demos de «IA no seu terminal» para no chat. O assistente do KKTerm também consegue construir pequenos widgets de painel duráveis, no formato de como você realmente trabalha — e mantém o perigoso atrás de um interruptor:

- **Decida o que ele pode tocar** — ligue ou desligue famílias inteiras de ferramentas (Dashboard / Connections / Live Sessions).
- **Decida como ele pergunta** — `Prompt` (padrão, pergunta toda vez) ou `Allow All` (você é adulto, assinou o termo).

Qualquer coisa parecida com `rm -rf` é marcada como perigosa e espera um sim humano explícito. A IA não consegue rodar escondido um comando destrutivo só porque alguém deu uma de esperto com um prompt injection numa man page.

Ele conversa com OpenAI, Anthropic, OpenRouter, DeepSeek, Grok, Azure OpenAI, LiteLLM, GitHub Copilot, Ollama, NVIDIA ou qualquer endpoint compatível com OpenAI. Suas chaves de API vão pro chaveiro do SO.

### Um painel que não finge ser o Grafana

O Dashboard é uma grade de widgets que você arrasta e redimensiona. Não é pra observabilidade em escala de petabytes — é pra «quero um botão que abra meus cinco apps favoritos e um painel mostrando o uptime do meu host SSH, *do lado* do meu chat».

#### Widgets criados pela IA — descreva, e pronto

Essa é a parte que a gente fica genuinamente animado. Você não escolhe de um marketplace nem escreve JavaScript. Você **diz ao assistente de IA o que quer**, e ele constrói o widget ali mesmo, no seu painel:

> *«Adiciona um widget mostrando os últimos 5 commits do meu repo principal em lista.»*
> *«Faz um widget de post-it pra minha cola de plantão.»*
> *«Constrói um widget que dá ping no meu roteador de casa a cada 30 segundos e mostra verde/vermelho.»*
> *«Preciso de um cronômetro. Me surpreende no estilo.»*

Alguns são simples painéis de exibição (markdown, listas de tarefas, um número grandão); outros rodam código ao vivo numa sandbox isolada que você aprova. Cada widget que você guarda é seu — fica salvo com a própria cor, ícone e título, e você pode ter várias cópias de tamanhos diferentes. Apague um com o botão direito quando a mágica passar.

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

### Mantenha vivos os seus agentes de IA remotos

Essa é a segunda função pela qual as pessoas se apaixonam. Os terminais SSH do KKTerm podem te jogar direto numa **sessão tmux nomeada** no host remoto que sobrevive à reconexão:

- Abra uma conexão SSH com tmux ativado e inicie `claude`, `codex`, `gemini-cli`, `cursor-agent` ou o agente de longa duração que você preferir.
- Feche o notebook. Abra de novo. O painel se reconecta em silêncio — o agente ainda está rodando, mantém seu scrollback, no meio do que estava fazendo.
- Uma piscada na rede? O KKTerm reconecta discretamente à mesma sessão sem te incomodar.
- Quer a ajuda do assistente? «Adicionar o buffer do terminal ao contexto» puxa a sessão remota inteira pra conversa, pra sua IA local raciocinar sobre o que o seu agente remoto está fazendo.

Se você já perdeu uma sessão `claude` ou `codex` de seis horas pro Wi-Fi instável de um hotel, essa função sozinha já paga o app. (O app é grátis. A função vale a pena mesmo assim.)

### Saber quanta IA ainda te resta

Os agentes de programação cobram por janela do plano, não por mês, e devoram alegremente a sua cota enquanto você está numa reunião. O **medidor de uso de IA** mantém isso à vista:

- Um widget de painel mostrando **Claude Code** e **Codex** lado a lado: conta conectada, plano, consumo da janela atual e desta semana, hora do próximo reset.
- Um **indicador compacto na barra de status** que espelha os mesmos números, pra que mesmo com o painel fechado você veja num relance se tem folga antes da próxima grande refatoração.
- Ele te avisa com antecedência se você precisa logar de novo — *antes* de uma tarefa longa, não no meio dela.

### Deixe outras IAs pilotarem o KKTerm

O KKTerm traz o próprio servidor MCP, pra que agentes de programação externos (Claude Code, Codex, Copilot, Antigravity, OpenCode) usem o seu espaço de trabalho como você usa — listar conexões, abrir uma, ler um buffer de terminal, posicionar widgets no painel. De IA pra IA, na sua máquina, sem relay na nuvem. As ações que modificam, as mais arriscadas, ficam atrás de um único interruptor de segurança **desligado** por padrão.

Configurações → AI Assistant → **Built-in MCP Server** tem um diálogo «Mostrar configuração» de um clique, já preenchido, além de comandos `claude mcp add` / `codex mcp add` pra copiar.

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
- [Roadmap](docs/ROADMAP.md)
- [Arquitetura do Dashboard](docs/DASHBOARD.md)
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
