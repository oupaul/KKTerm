<p align="center">
  <img src="src-tauri/icons/logo.png" alt="KKTerm" width="128" />
</p>

<h1 align="center">KKTerm</h1>

<p align="center">
  <strong>Una sola ventana nativa de Windows para terminales, SSH, SFTP, RDP/VNC y un panel — además de una IA que te construye tus propias herramientas a petición.</strong>
</p>

<p align="center">
  <em>Porque tu barra de tareas no debería parecer una máquina tragaperras de Las Vegas.</em>
</p>

<p align="center">
  <sub>Llamado así por <strong>乖乖 (Kuāi Kuāi)</strong>, el aperitivo verde de coco que los administradores de sistemas taiwaneses colocan sobre los servidores para que se porten bien. Esperamos que esta app se gane su sitio en el rack.</sub>
</p>

<p align="center">
  <strong><a href="https://github.com/ryantsai/KKTerm/releases/latest">Descargar la última versión de KKTerm</a></strong>
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
    <strong>Español</strong> ·
    <a href="README.es-MX.md">Español (MX)</a> ·
    <a href="README.it.md">Italiano</a> ·
    <a href="README.pt-BR.md">Português (BR)</a> ·
    <a href="README.th.md">ไทย</a> ·
    <a href="README.id.md">Bahasa Indonesia</a> ·
    <a href="README.vi.md">Tiếng Việt</a>
  </sub>
</p>

---

## El argumento en 45 segundos

Eres administrador de sistemas / DevOps / aficionado al homelab / vibe-coder. Ahora mismo tienes:

- Un emulador de terminal
- Un cliente SSH aparte (con una lista de perfiles que te llevó un fin de semana montar)
- Un cliente SFTP de 2007 que, no se sabe cómo, sigue existiendo
- El Escritorio remoto en una ventana que siempre pierdes en el monitor equivocado
- Un visor VNC para esa única máquina Linux
- Una pestaña del navegador para la interfaz de administración del router
- Un gestor de archivos para curiosear el disco local, y un editor de texto para ese único log que siempre tienes en `tail`
- Una sesión `claude` / `codex` en una máquina remota que se cae cada vez que el wifi estornuda
- Un pósit con contraseñas *(tranqui, no diremos nada)*

**KKTerm es una sola ventana para todo eso.** Nativo en Windows — *a propósito, mientras el resto del mundo de las herramientas para devs sale primero para mac y trata tu SO como una nota a pie de página* — en un único instalador que se niega a llamar a casa.

Y unas cuantas cosas que no sabías que querías:

- Un **Dashboard** donde le dices a una IA *«créame un widget que haga ping a mi router cada 30 segundos»* y aparece, en su propio espacio aislado, sobre tu cuadrícula.
- **Paneles SSH que se vuelven a enganchar a tu sesión remota `claude` / `codex`** tras cada rabieta del wifi, para que un trabajo de seis horas sobreviva a una caída.
- **Espacios de trabajo (Workspaces)** que mantienen tu homelab, el trabajo y los servidores de ese cliente en contenedores separados e intercambiables.
- Un **Install Helper** que encuentra, instala, actualiza y lanza las herramientas para devs de Windows que normalmente persigues por diez pestañas del navegador.
- **Veintiséis fondos animados** para el panel *y tus terminales* (sí, incluido `matrix`), porque no estamos por encima de eso.

Y lo mejor: el asistente de IA puede convertir una sola frase en una pequeña herramienta de panel que de verdad acabas usando.

> ⭐ **Si esto suena a la app que llevas seis años queriendo construir — dale una estrella al repo para que sepamos que alguien está mirando. Ayuda de verdad.**

¿Tienes una opinión sobre lo que debería venir después? Únete al hilo público de feedback:
**[¿Qué debería priorizar KKTerm para los flujos de administración multiplataforma?](https://github.com/ryantsai/KKTerm/discussions/141)**

---

## ¿Por qué «KKTerm»?

Entra en cualquier centro de datos taiwanés y mira la parte de arriba de los racks. Más allá de las fábricas de TSMC, las salas de control del metro de Taipéi, las salas de servidores del banco Cathay, los equipos de conmutación de Chunghwa Telecom — verás una pequeña bolsita verde de 乖乖 (Kuāi Kuāi), un aperitivo de maíz con sabor a coco de los años 60.

El nombre significa literalmente **«pórtate bien»**, **«compórtate»**. La tradición en TI es sencilla y absolutamente seria:

- **Debe ser verde (coco).** El amarillo (curry) significa *quédate hoy en casa*; el rojo (picante) cabrea al servidor. Solo verde.
- **No debe estar caducado.** Un Kuai Kuai pasado juega en tu contra. Los ingenieros los cambian con diligencia.
- **Debe estar visible.** El servidor tiene que saber que está ahí.
- **No te lo comas.** Esa bolsita está de servicio.

Algunos de los sistemas más grandes, más aburridos y más obsesionados con el uptime de Asia funcionan con una bolsita de ganchitos de maíz pegada al chasis. Funciona porque la gente que los mantiene cree que funciona, lo cual es una descripción notablemente honesta de la mayor parte de la cultura TI.

**KKTerm** es **Kuai Kuai Term** — un espacio de administración que aspira al mismo trabajo que el aperitivo: sentarse en silencio junto a tus máquinas importantes y ayudarlas a portarse bien. Local primero. Sin telemetría. IA con aprobación. Ese tipo de software aburrido y fiable.

Aún no hemos podido incluir una bolsa real de Kuai Kuai con el instalador. Eso es cosa de la v2.

---

## Verlo en movimiento

<p align="center">
  <a href="https://github.com/ryantsai/KKTerm">
    <img
      src="docs/assets/demo.gif"
      alt="KKTerm demo"
      width="720"
    />
  </a>
</p>

<p align="center"><sub><em>(El GIF de demostración. Una imagen vale más que mil viñetas, y se nos han acabado las viñetas.)</em></sub></p>



---

## Una ventana, cada conexión

| Querías… | KKTerm lo hace |
| --- | --- |
| Abrir un shell local PowerShell / cmd / WSL | Terminales locales, lado a lado |
| SSH a un servidor | SSH con claves, agente, contraseñas, hosts de salto y reenvío de puertos |
| Explorar los archivos de ese servidor | SFTP desde la conexión SSH — doble panel, arrastra para transferir |
| FTP a un NAS de 2012 | FTP / FTPS en el mismo explorador de archivos |
| Telnet a equipos prehistóricos | Sí, Telnet también está ahí |
| Hablar con un puerto serie | Conexiones serie — elige un puerto COM y un baudaje |
| Entrar por remoto a una máquina Windows | El auténtico Escritorio remoto de Microsoft, integrado |
| VNC a una Pi | VNC, renderizado directamente en el espacio de trabajo |
| Abrir la interfaz web del router | Una pestaña de navegador integrada con inicios de sesión guardados |
| Explorar tu propio disco | Un panel de File Explorer local, el mismo doble panel que SFTP |
| Abrir un log, CSV, imagen o PDF | Un visor Document integrado con un verdadero modo de log en seguimiento (tail) |
| Vigilar la CPU del host | Una barra de estado en vivo y un panel que montas tú mismo |

La misma app. La misma ventana. Los mismos atajos. El mismo tema, que ojalá no te sangren los ojos.

<p align="center">
  <img src="docs/assets/screenshots/connections-grid.png" alt="Una sola Tab con SSH, SFTP y una interfaz web integrada lado a lado" width="720" />
</p>


---

## Por qué la gente lo deja abierto todo el día

### Descarga pequeña, arranque relámpago

KKTerm está pensado para sentirse como una utilidad, no como una plataforma. Las versiones de escritorio actuales pesan menos de 20 MB, se instalan rápido y arrancan lo bastante deprisa como para que abrir tu espacio de administración no se sienta como iniciar un segundo sistema operativo.

Ese tamaño pequeño importa en jump boxes, portátiles viejos y VM donde cada servicio en segundo plano extra es una cosa más de la que desconfiar. KKTerm se abre, restaura tu espacio de trabajo y se quita de en medio.

### Cuadrículas multipanel, mezcladas como trabajas

Una Tab puede contener una cuadrícula de Panes, y esos Panes no tienen que ser del mismo tipo. Pon SSH junto a SFTP, un PowerShell local debajo de una RDP Session, VNC junto a la interfaz web del router, o un explorador de archivos junto al terminal que está moviendo los archivos.

Es un solo espacio de trabajo para la forma real y desordenada del trabajo de administración: mezcla tipos de Connection, redimensiona la cuadrícula, mantén vivas las live Sessions y deja de hacer Alt-Tab entre un montón de ventanas.

<p align="center">
  <img src="docs/assets/screenshots/multi-pane.png" alt="Una Tab dividida en cuatro paneles de distintos tipos de conexión" width="720" />
</p>


### Un asistente de IA que comanda tus terminales por ti

La mayoría de las demos de «IA en tu terminal» se quedan en el chat. El asistente de KKTerm trabaja *dentro* de tu sesión: le pasas contexto a partir de lo que ya está en pantalla, y actúa sobre las máquinas a las que estás conectado — con un humano en el bucle de aprobación.

**Pásale el contexto, directo.** Sin relevo de copiar y pegar:

- **Agregar el búfer del terminal al contexto** mete el scrollback de una sesión local o remota en curso directamente en la conversación, para que «¿por qué falló este build?» sea algo que de verdad pueda leer.
- El **menú de captura** toma una región o un Pane entero y suelta la imagen en el chat, para que «¿por qué se ve mal este diálogo?» sea una pregunta que pueda responder.
- **Adjunta archivos** y el **contexto de página de Dashboard / IT Ops** actual, para que razone sobre lo que realmente estás mirando y no sobre una descripción vaga.

**Déjalo actuar — tras aprobación.** El asistente puede ejecutar comandos en tus terminales, abrir Connections y colocar widgets en el panel, pero lo arriesgado sigue bajo llave:

- **Decide qué puede tocar** — activa o desactiva familias enteras de herramientas (Dashboard / Connections / Live Sessions).
- **Decide cómo pregunta** — `Prompt` (por defecto, pregunta cada vez) o `Allow All` (eres adulto, firmaste el descargo).
- Cualquier cosa que parezca un `rm -rf` se marca como peligrosa — con el motivo mostrado en la tarjeta de aprobación — y espera un sí humano explícito. La IA no puede ejecutar a escondidas un comando destructivo porque alguien se haya pasado de listo con una inyección de prompt en una página de man.

**Trae tu propio cerebro.** Habla con OpenAI, Anthropic, OpenRouter, DeepSeek, Grok, Azure OpenAI, LiteLLM, GitHub Copilot, Ollama, NVIDIA o cualquier endpoint compatible con OpenAI — y puede correr sobre la **CLI de Claude Code** o la **CLI de Codex** como backend, usando tu login y suscripción `claude` / `codex` existentes en lugar de una clave de API aparte. Tus claves de API van al llavero del SO.

<p align="center">
  <img src="docs/assets/screenshots/ai-assistant.png" alt="El panel del asistente de IA con los interruptores de acceso a herramientas y modo de aprobación" width="720" />
</p>


### Un panel que no finge ser Grafana

El Dashboard es una cuadrícula de widgets que arrastras y redimensionas. No es para observabilidad a escala de petabytes — es para «quiero un botón que lance mis cinco apps favoritas y un panel que muestre el uptime de mi host SSH, *al lado* de mi chat».

#### Widgets creados por la IA — descríbelo, lo tienes

Esta es la parte que de verdad nos emociona. No eliges de un marketplace ni escribes JavaScript. Le **dices al asistente de IA lo que quieres**, y construye el widget ahí mismo, en tu panel:

> *«Añade un widget que muestre los últimos 5 commits de mi repo principal en una lista.»*
> *«Hazme un widget de nota adhesiva para mi chuleta de guardia.»*
> *«Construye un widget que haga ping a mi router de casa cada 30 segundos y muestre verde/rojo.»*
> *«Necesito un cronómetro. Sorpréndeme con el estilo.»*

Algunos son simples paneles de visualización (markdown, listas de tareas, una cifra grande); otros ejecutan código en vivo en un espacio aislado que tú apruebas. Cada widget que conservas es tuyo — persiste con su propio color, icono y título, y puedes tener varias copias de distintos tamaños. Borra uno con clic derecho cuando se pase la magia.

<p align="center">
  <img src="docs/assets/screenshots/ai-widgets.png" alt="Una cuadrícula de panel llena de widgets creados por la IA" width="720" />
</p>


#### Fondos animados del panel/terminal (porque nos apetecía)

Elige un ambiente — por vista del panel, *o detrás de cualquier terminal* — entre **veintiséis** fondos animados sobre canvas:

| Ambiente | Fondos |
| --- | --- |
| Calma | `aurora`, `clouds`, `ocean`, `raindrops`, `rainywindow`, `frostedWindow`, `snow`, `sakura`, `fireflies`, `bubbles`, `aquarium`, `ricefield`, `lanterns` |
| Espacial | `starfield`, `nebula` |
| Cálido | `embers`, `lava` |
| Friki | `matrix`, `topo`, `synthwave` |
| Inquieto | `cyberpunk`, `taipei101`, `thunderstorm`, `confetti`, `particleCursor` |

El mismo selector también respalda tus paneles de terminal, así que puedes poner `matrix` detrás de una sesión SSH activa. Se pausan cuando estás en otra parte, así que casi no cuestan nada. Combina `matrix` con tu asistente de IA para un ambiente que dice «soy extremadamente productivo y posiblemente estoy en una película de las Wachowski». O elige `ocean` y aparenta ser una persona seria. No juzgamos ninguna de las dos opciones.

<p align="center">
  <img src="docs/assets/screenshots/backgrounds.png" alt="Algunos de los fondos animados lado a lado" width="720" />
</p>


### Mantén vivos a tus agentes de IA

Esta es la segunda función de la que la gente se enamora. Los terminales SSH de KKTerm pueden dejarte directamente en una **sesión tmux con nombre** en el host remoto que sobrevive a la reconexión:

- Abre una conexión SSH con tmux activado y arranca `claude`, `codex`, `gemini-cli`, `cursor-agent` o el agente de larga duración que prefieras.
- Cierra el portátil. Vuélvelo a abrir. El panel se reengancha en silencio — el agente sigue corriendo, conserva su scrollback, en mitad de lo que estuviera haciendo.
- ¿Un parpadeo de la red? KKTerm se reconecta discretamente a la misma sesión sin molestarte.
- ¿Quieres que ayude el asistente? «Añadir el búfer del terminal al contexto» mete toda la sesión remota en la conversación, para que tu IA local pueda razonar sobre lo que hace tu agente remoto.

Si alguna vez perdiste una sesión `claude` o `codex` de seis horas por el inestable wifi de un hotel, esta sola función amortiza la app. (La app es gratis. La función vale la pena igualmente.)

Las shells locales tienen el mismo truco en Windows: los paneles de PowerShell pueden correr dentro de **psmux**, el clon nativo de tmux, para que tus tareas locales de larga duración sobrevivan a un Pane cerrado igual que las remotas.

<p align="center">
  <img src="docs/assets/screenshots/tmux-reattach.png" alt="Un panel SSH reenganchándose a una sesión tmux con nombre tras una reconexión" width="720" />
</p>


### Separa tus mundos con los espacios de trabajo

El homelab, el trabajo y los servidores de ese cliente no pertenecen a la misma lista. Los **espacios de trabajo (Workspaces)** son contenedores de Connections con nombre y aislados entre los que cambias desde el Activity Rail. Cambiar solo reajusta el árbol de conexiones — tus Sessions abiertas, el Dashboard y los ajustes se quedan donde están — así que cambiar de contexto cuesta un clic, no un reinicio.

<p align="center">
  <img src="docs/assets/screenshots/workspaces.png" alt="El selector de espacio de trabajo en el activity rail" width="720" />
</p>


### Vístelo a tu gusto: temas de color

Los fondos son la parte divertida; los **temas de color** son lo que de verdad miras todo el día. KKTerm trae **veintiséis** esquemas de color que reestilizan todo el chrome de la app — Activity Rail, árbol de conexiones, pestañas, diálogos — con una minivista previa en vivo de cada uno en Ajustes ▸ Apariencia:

| Ambiente | Esquemas |
| --- | --- |
| Neutro | `Default`, `Dark`, `Light`, `Match OS` (sigue el claro/oscuro del sistema), `Mac` |
| Colorido | `Orange`, `Purple`, `Pink`, `Confetti`, `Bubble Tea` |
| Sabor local | `Green Kuai Kuai` (sí, el snack), `Blue See`, `Blue, Green and White`, `Semiconductor` |

El terminal conserva su propia paleta oscura sin importar el esquema que elijas, para que tus shells sigan siendo legibles mientras el resto de la app se ajusta a tu ánimo.

<p align="center">
  <img src="docs/assets/screenshots/color-themes.png" alt="La cuadrícula de esquemas de color en Ajustes con vistas previas en vivo" width="720" />
</p>


### Install Helper (solo Windows)

Preparar una máquina Windows nueva para desarrollar suele ser diez pestañas del navegador y mucho «siguiente, siguiente, finalizar». El **Install Helper** es un catálogo integrado que encuentra, instala, actualiza y desinstala las herramientas que de otro modo perseguirías a mano — sin salir de KKTerm:

- **Essentials** — winget, Node (vía nvm-windows), Python (vía uv), Git.
- **AI Agents** — Claude Code, Codex, Antigravity, OpenCode y otras CLI y apps de escritorio de agentes de programación.
- **AI Platforms** — stacks locales / autoalojados como Ollama, n8n, Open WebUI, Flowise y Langflow, lanzados y gestionados por ti.
- **Development** — editores, contenedores, herramientas de API, WSL y sus distribuciones, Rustup.
- **Windows Power User** — PowerToys, PowerShell 7, psmux, Sysinternals, Everything, Ditto.
- **Remote Access** — Tailscale, RustDesk.
- **Utilities** — Notepad++, ripgrep, jq, fzf, 7-Zip, Oh My Posh, FFmpeg y más.

Detecta lo que ya está instalado, marca lo que tiene actualización, y **Actualizar todo** recorre la cola por ti. Los avisos de UAC siguen siendo explícitos, nada se instala en silencio, y todo el catálogo va dentro de la app — sin cuenta extra, sin telemetría en segundo plano.

> macOS y Linux ya tienen gestores de paquetes que adoras, así que el Install Helper es una comodidad exclusiva de Windows y no forma parte de esas builds.

<p align="center">
  <img src="docs/assets/screenshots/install-helper.png" alt="El catálogo Install Helper con herramientas instaladas y disponibles" width="720" />
</p>


---

## Lo que KKTerm no es

Una lista corta, porque la honestidad se gana la confianza:

- **No es un producto en la nube.** Sin sincronización, sin cuentas de equipo, sin plan SaaS. Si alguna vez ves un diálogo «Inicia sesión en KKTerm», algo ha salido catastróficamente mal.
- **No finge que todos los sistemas operativos son idénticos.** KKTerm publica builds para Windows, macOS y Linux, pero las funciones específicas de cada plataforma se mantienen claras y honestas.
- **No es un agente de IA autónomo.** El asistente propone; el humano dispone. `Allow All` es una elección que haces tú, no un valor por defecto.
- **No es un sustituto de Grafana / Datadog.** El Dashboard es para superficies de control personales, no para observabilidad de 10.000 hosts.
- **No es un IDE de Kubernetes.** Es un espacio de administración centrado en el terminal. Por favor, no le pidas que renderice un chart de Helm.

Si alguno de esos puntos *era* un factor decisivo — justo, nos vemos en la v2.

---

## Consigue KKTerm

**[Descarga la última versión de KKTerm](https://github.com/ryantsai/KKTerm/releases/latest)**, elige el paquete para tu plataforma y ábrelo. Los instaladores de Windows están por ahora **sin firmar** — la firma de versiones está en la hoja de ruta, así que hasta entonces tu antivirus puede mirarte con cara seria. Es normal.

¿Quieres compilar desde el código fuente o contribuir? Todo lo que necesitas está en [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Hoja de ruta (versión corta)

- Pulido de versiones multiplataforma
- Pulido de la firma de versiones
- Más potencia en transferencia de archivos (reanudar, sincronización de carpetas, archivar/extraer)
- Portapapeles y compartición de dispositivos más rica en el Escritorio remoto
- Más widgets de panel integrados
- Más funcionalidad de automatización de IT Ops

Versión completa y actualizada con frecuencia: [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## Contribuir

Nos encantaría una mano. De verdad. Hasta las cosas pequeñas importan:

- **Prueba la build de desarrollo** y abre una issue cuando algo te chirríe. «Me dio mala espina» es un informe de error legítimo; lo investigamos contigo.
- **Traduce un idioma.** El inglés es la fuente de la verdad; otros trece idiomas viven al lado.
- **Añade un widget de panel.** Coge una idea pequeña, publícala, aprende el patrón.
- **Mejora el manual.** Si usaste una función y la documentación no ayudó, una PR que lo arregle vale oro.

La configuración completa, la estructura del proyecto y la lista de comprobación de PR están en [`CONTRIBUTING.md`](CONTRIBUTING.md). ¿Buscas un punto de entrada? Filtra las issues abiertas por [`good first issue`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) o [`help wanted`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22).

---

## Documentos del proyecto

- [Contexto de producto](CONTEXT.md) — el lenguaje de dominio que debes respetar
- [Arquitectura](docs/ARCHITECTURE.md) — mapa de módulos, dónde poner el código nuevo
- [Manual de usuario](docs/manual/INDEX.md) — un recorrido función por función
- [Hoja de ruta](docs/ROADMAP.md)
- [Arquitectura del Dashboard](docs/DASHBOARD.md)
- [Servidor MCP integrado](docs/MCP.md)
- [Guía de proveedores de IA](docs/AI_PROVIDERS.md)

---

## Historial de estrellas

<a href="https://www.star-history.com/#ryantsai/KKTerm&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date" />
  </picture>
</a>

Si has llegado hasta aquí y aún no le has dado una estrella — ¿a qué esperas, a una invitación personal? Considera esto la invitación personal.

⭐ **[Dale una estrella a KKTerm en GitHub](https://github.com/ryantsai/KKTerm)** — cuesta un clic y le alegra la semana entera al mantenedor. Piénsalo como un 乖乖 digital en el rack.

---

## Licencia

MIT. Ver [LICENSE](LICENSE). Úsalo, fórkalo, publícalo, mételo en un homelab que nadie más encuentre — ese es el trato.
