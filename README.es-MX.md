<p align="center">
  <img src="src-tauri/icons/logo.png" alt="KKTerm" width="128" />
</p>

<h1 align="center">KKTerm</h1>

<p align="center">
  <strong>Una sola ventana nativa de Windows para terminales, SSH, SFTP, RDP/VNC y un panel — más una IA que te arma tus propias herramientas cuando se lo pides.</strong>
</p>

<p align="center">
  <em>Porque tu barra de tareas no debería verse como una máquina tragamonedas de Las Vegas.</em>
</p>

<p align="center">
  <sub>Se llama así por <strong>乖乖 (Kuāi Kuāi)</strong>, la botana verde de coco que los administradores de sistemas taiwaneses ponen sobre los servidores para que se porten bien. Ojalá esta app se gane su lugar en el rack.</sub>
</p>

<p align="center">
  <strong><a href="https://github.com/ryantsai/KKTerm/releases/latest">Descargar el instalador más reciente de Windows (.exe)</a></strong>
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
  <img src="https://img.shields.io/badge/Windows%E2%80%91first-by%20design-0078D6?style=flat-square&logo=windows" alt="Windows-first by design" />
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
    <strong>Español (MX)</strong> ·
    <a href="README.it.md">Italiano</a> ·
    <a href="README.pt-BR.md">Português (BR)</a> ·
    <a href="README.th.md">ไทย</a> ·
    <a href="README.id.md">Bahasa Indonesia</a> ·
    <a href="README.vi.md">Tiếng Việt</a>
  </sub>
</p>

---

## El argumento en 45 segundos

Eres administrador de sistemas / DevOps / fan del homelab / vibe-coder. Ahorita tienes:

- Un emulador de terminal
- Un cliente SSH aparte (con una lista de perfiles que te llevó un fin de semana armar)
- Un cliente SFTP de 2007 que, quién sabe cómo, sigue existiendo
- El Escritorio remoto en una ventana que siempre pierdes en el monitor equivocado
- Un visor VNC nada más por esa única máquina Linux
- Una pestaña del navegador para la interfaz de administración del router
- Una sesión `claude` / `codex` en una máquina remota que se cae cada que el wifi estornuda
- Un papelito con contraseñas *(tranqui, no decimos nada)*

**KKTerm es una sola ventana para todo eso.** Nativo en Windows — *a propósito, mientras el resto del mundo de las herramientas para devs saca primero la versión de mac y trata tu SO como una nota al pie* — en un solo instalador que se niega a llamar a casa.

Y unas cuantas cosas que no sabías que querías:

- Un **Dashboard** donde le dices a una IA *«créame un widget que le haga ping a mi router cada 30 segundos»* y aparece, en su propio espacio aislado, sobre tu cuadrícula.
- **Paneles SSH que se vuelven a conectar a tu sesión remota `claude` / `codex`** después de cada berrinche del wifi, para que un trabajo de seis horas sobreviva a una caída.
- Un **medidor de uso de IA** para que dejes de estrellarte por sorpresa contra el muro del límite de uso a las 3 de la mañana.
- Un **Installer Helper** que encuentra, instala, actualiza y abre las herramientas para devs de Windows que normalmente andas persiguiendo por diez pestañas del navegador.
- **Veinticinco fondos animados** para el panel (sí, incluido `matrix`), porque no nos da pena.

Y lo mejor: el asistente de IA puede convertir una sola frase en una pequeña herramienta de panel que de verdad terminas usando.

> ⭐ **Si esto suena a la app que llevas seis años queriendo construir — dale una estrella al repo para que sepamos que alguien está al pendiente. De verdad ayuda.**

¿Tienes una opinión sobre lo que debería venir después? Métete al hilo público de comentarios:
**[¿Qué debería priorizar KKTerm para los flujos de administración Windows-first?](https://github.com/ryantsai/KKTerm/discussions/141)**

---

## ¿Por qué «KKTerm»?

Métete a cualquier centro de datos taiwanés y mira la parte de arriba de los racks. Más allá de las fábricas de TSMC, las salas de control del metro de Taipéi, las salas de servidores del banco Cathay, los equipos de conmutación de Chunghwa Telecom — vas a ver una bolsita verde de 乖乖 (Kuāi Kuāi), una botana de maíz con sabor a coco de los años 60.

El nombre significa literalmente **«pórtate bien»**, **«compórtate»**. La tradición en TI es sencilla y completamente en serio:

- **Debe ser verde (coco).** El amarillo (curry) significa *hoy quédate en casa*; el rojo (picante) hace enojar al servidor. Nada más verde.
- **No debe estar caducado.** Un Kuai Kuai pasado juega en tu contra. Los ingenieros los cambian con diligencia.
- **Debe estar a la vista.** El servidor tiene que saber que está ahí.
- **No te lo comas.** Esa bolsita está de servicio.

Algunos de los sistemas más grandes, más aburridos y más obsesionados con el uptime de Asia funcionan con una bolsita de frituras de maíz pegada al chasis. Funciona porque la gente que los mantiene cree que funciona, lo cual es una descripción notablemente honesta de casi toda la cultura de TI.

**KKTerm** es **Kuai Kuai Term** — un espacio de administración que aspira al mismo trabajo que la botana: sentarse en silencio junto a tus máquinas importantes y ayudarlas a portarse bien. Local primero. Sin telemetría. IA con aprobación. Ese tipo de software aburrido y confiable.

Todavía no hemos podido incluir una bolsa de verdad de Kuai Kuai con el instalador. Eso queda para la v2.

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

<p align="center"><sub><em>(Aquí va el GIF de demostración. Una imagen vale más que mil viñetas, y ya se nos acabaron las viñetas.)</em></sub></p>

---

## Una ventana, cada conexión

| Querías… | KKTerm lo hace |
| --- | --- |
| Abrir un shell local PowerShell / cmd / WSL | Terminales locales, lado a lado |
| SSH a un servidor | SSH con llaves, agente, contraseñas, hosts de salto y reenvío de puertos |
| Explorar los archivos de ese servidor | SFTP desde la conexión SSH — doble panel, arrastra para transferir |
| FTP a un NAS de 2012 | FTP / FTPS en el mismo explorador de archivos |
| Telnet a equipos prehistóricos | Sí, Telnet también está ahí |
| Hablar con un puerto serial | Conexiones seriales — elige un puerto COM y un baudaje |
| Entrar por remoto a una máquina Windows | El auténtico Escritorio remoto de Microsoft, integrado |
| VNC a una Pi | VNC, renderizado directo en el espacio de trabajo |
| Abrir la interfaz web del router | Una pestaña de navegador integrada con inicios de sesión guardados |
| Vigilar la CPU del host | Una barra de estado en vivo y un panel que armas tú mismo |

La misma app. La misma ventana. Los mismos atajos. El mismo tema, que ojalá no te haga sangrar los ojos.

---

## Por qué la gente lo deja abierto todo el día

### Windows primero, a propósito

Mira el panorama de las herramientas para devs. Claude Code: mac/linux primero, Windows es «usa WSL». Codex CLI: lo mismo. La mitad de las herramientas nuevas y llamativas salen primero para mac y le dejan a los usuarios de Windows un comentario `# contributions welcome` y un script de autocompletado que ni jala.

Mientras tanto, la gente que de verdad mantiene a las empresas en línea — la TI corporativa, los MSP, cualquiera que administre un controlador de dominio más viejo que algunos becarios — está sentada frente a máquinas Windows preguntándose por qué cada herramienta nueva trata su SO como una molestia.

**KKTerm hace el trato contrario.** Construimos nativo para Windows primero, así que lo que le importa a la gente de Windows simplemente jala: el *auténtico* Escritorio remoto de Microsoft (el mismo que `mstsc.exe`, no un clon), shells reales de PowerShell / cmd / WSL, secretos guardados en el Administrador de credenciales de Windows, un ícono de bandeja como debe ser, menús y diálogos nativos. Las versiones de macOS y Linux están en la hoja de ruta y van a recibir el mismo cuidado. Pero si estabas esperando a que alguien construyera la *buena* herramienta de administración de Windows primero en vez de al último — ese es el trato.

### Local primero significa de verdad local

Tus conexiones guardadas viven en un archivo en tu máquina. Las contraseñas viven en el Administrador de credenciales de Windows, no en un archivo de texto junto a la app. KKTerm no manda analíticas, no llama a casa al arrancar y no necesita una cuenta en la nube para abrirse. No hay «inicia sesión para sincronizar» porque no hay sincronización.

Si tu cable de red se prende en llamas, KKTerm se abre de todos modos.

### Terminales que no pierden la cabeza

- Paneles divididos dentro de una Tab.
- Renderizado rápido y fluido, con scrollback que se puede buscar.
- Reconectar significa de verdad *reconectar* — tu sesión remota retoma donde estaba, no «empezar de cero y hacer como que la última hora no pasó».
- Cambiar de Tab **no** mata la Session. Cerrar la Tab sí. Esta distinción fue una guerra de religión interna; ganamos.

### Un asistente de IA que construye tus herramientas

La mayoría de los demos de «IA en tu terminal» se quedan en el chat. El asistente de KKTerm también puede construir pequeños widgets de panel duraderos, a la medida de cómo trabajas de verdad — y mantiene lo peligroso detrás de un interruptor:

- **Decide qué puede tocar** — prende o apaga familias enteras de herramientas (Dashboard / Connections / Live Sessions).
- **Decide cómo pregunta** — `Prompt` (por defecto, pregunta cada vez) o `Allow All` (eres adulto, firmaste el deslinde).

Cualquier cosa que se parezca a un `rm -rf` se marca como peligrosa y espera un sí humano explícito. La IA no puede ejecutar a escondidas un comando destructivo nada más porque alguien se pasó de listo con una inyección de prompt en una página de man.

Habla con OpenAI, Anthropic, OpenRouter, DeepSeek, Grok, Azure OpenAI, LiteLLM, GitHub Copilot, Ollama, NVIDIA o cualquier endpoint compatible con OpenAI. Tus llaves de API van al llavero del SO.

### Un panel que no finge ser Grafana

El Dashboard es una cuadrícula de widgets que arrastras y redimensionas. No es para observabilidad a escala de petabytes — es para «quiero un botón que abra mis cinco apps favoritas y un panel que muestre el uptime de mi host SSH, *al lado* de mi chat».

#### Widgets creados por la IA — descríbelo, lo tienes

Esta es la parte que de verdad nos emociona. No eliges de un marketplace ni escribes JavaScript. Le **dices al asistente de IA lo que quieres**, y construye el widget ahí mismo, en tu panel:

> *«Agrega un widget que muestre los últimos 5 commits de mi repo principal en una lista.»*
> *«Hazme un widget de nota adhesiva para mi acordeón de guardia.»*
> *«Construye un widget que le haga ping a mi router de casa cada 30 segundos y muestre verde/rojo.»*
> *«Necesito un cronómetro. Sorpréndeme con el estilo.»*

Algunos son simples paneles de visualización (markdown, listas de pendientes, una cifra grande); otros corren código en vivo en un espacio aislado que tú apruebas. Cada widget que conservas es tuyo — se queda con su propio color, ícono y título, y puedes tener varias copias de distintos tamaños. Borra uno con clic derecho cuando se acabe la magia.

#### Fondos animados del panel (porque se nos antojó)

Elige un ambiente por vista del panel entre **veinticinco** fondos animados sobre canvas:

| Ambiente | Fondos |
| --- | --- |
| Calma | `aurora`, `clouds`, `ocean`, `raindrops`, `rainywindow`, `frostedWindow`, `snow`, `sakura`, `fireflies`, `bubbles`, `aquarium`, `ricefield`, `lanterns` |
| Espacial | `starfield`, `nebula` |
| Cálido | `embers`, `lava` |
| Friki | `matrix`, `topo`, `synthwave` |
| Inquieto | `cyberpunk`, `taipei101`, `thunderstorm`, `confetti`, `particleCursor` |

Se pausan cuando estás en otra parte, así que casi no cuestan nada. Combina `matrix` con tu asistente de IA para un ambiente que dice «soy extremadamente productivo y posiblemente estoy en una película de las Wachowski». O elige `ocean` y aparenta ser una persona seria. No juzgamos ninguna de las dos opciones.

### Mantén vivos a tus agentes de IA remotos

Esta es la segunda función de la que la gente se enamora. Los terminales SSH de KKTerm pueden dejarte directo en una **sesión tmux con nombre** en el host remoto que sobrevive a la reconexión:

- Abre una conexión SSH con tmux activado y arranca `claude`, `codex`, `gemini-cli`, `cursor-agent` o el agente de larga duración que prefieras.
- Cierra la laptop. Vuélvela a abrir. El panel se reconecta en silencio — el agente sigue corriendo, conserva su scrollback, a media tarea de lo que estuviera haciendo.
- ¿Un parpadeo de la red? KKTerm se reconecta discreto a la misma sesión sin molestarte.
- ¿Quieres que ayude el asistente? «Agregar el búfer del terminal al contexto» mete toda la sesión remota en la conversación, para que tu IA local pueda razonar sobre lo que hace tu agente remoto.

Si alguna vez perdiste una sesión `claude` o `codex` de seis horas por el wifi inestable de un hotel, esta sola función ya pagó la app. (La app es gratis. La función vale la pena de todos modos.)

### Saber cuánta IA te queda

Los agentes de programación cobran por ventana de plan, no por mes, y se comen felices tu cuota mientras estás en una junta. El **medidor de uso de IA** lo mantiene a la vista:

- Un widget de panel que muestra **Claude Code** y **Codex** lado a lado: cuenta conectada, plan, consumo de la ventana actual y de esta semana, hora del próximo reinicio.
- Un **indicador compacto en la barra de estado** que refleja las mismas cifras, para que incluso con el panel cerrado veas de un vistazo si te queda margen antes del próximo gran refactor.
- Te avisa con anticipación si necesitas volver a iniciar sesión — *antes* de una tarea larga, no a media tarea.

### Deja que otras IA manejen KKTerm

KKTerm trae su propio servidor MCP, para que agentes de programación externos (Claude Code, Codex, Copilot, Antigravity, OpenCode) usen tu espacio de trabajo como lo haces tú — listar conexiones, abrir una, leer un búfer de terminal, colocar widgets en el panel. De IA a IA, en tu máquina, sin relevo en la nube. Las acciones que modifican, las más riesgosas, se quedan detrás de un único interruptor de seguridad que está **apagado** por defecto.

Configuración → AI Assistant → **Built-in MCP Server** tiene un diálogo «Mostrar configuración» de un clic, ya rellenado, además de comandos `claude mcp add` / `codex mcp add` para copiar.

---

## Lo que KKTerm no es

Una lista corta, porque la honestidad se gana la confianza:

- **No es un producto en la nube.** Sin sincronización, sin cuentas de equipo, sin plan SaaS. Si alguna vez ves un diálogo «Inicia sesión en KKTerm», algo salió catastróficamente mal.
- **No finge ser multiplataforma.** Somos Windows-first a propósito; macOS y Linux están en la hoja de ruta. Si hoy necesitas una herramienta mac-first, tienes cientos de opciones. Estamos construyendo esa que los administradores de Windows llevan esperando en silencio.
- **No es un agente de IA autónomo.** El asistente propone; el humano dispone. `Allow All` es una decisión que tomas tú, no un valor por defecto.
- **No es un sustituto de Grafana / Datadog.** El Dashboard es para superficies de control personales, no para observabilidad de 10,000 hosts.
- **No es un IDE de Kubernetes.** Es un espacio de administración centrado en el terminal. Por favor, no le pidas que renderice un chart de Helm.

Si alguno de esos puntos *era* un factor decisivo — está bien, nos vemos en la v2.

---

## Consigue KKTerm

**[Descarga el instalador más reciente de Windows (.exe)](https://github.com/ryantsai/KKTerm/releases/latest)** y córrelo. El instalador por ahora está **sin firmar** — la firma de versiones está en la hoja de ruta, así que hasta entonces tu antivirus puede mirarte feo. Es normal.

¿Quieres compilar desde el código fuente o contribuir? Todo lo que necesitas está en [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Hoja de ruta (versión corta)

- Versiones macOS + Linux
- Instalador firmado + actualización automática
- Más potencia en transferencia de archivos (reanudar, sincronización de carpetas, archivar/extraer)
- Portapapeles y compartición de dispositivos más rica en el Escritorio remoto
- Más widgets de panel integrados

Versión completa y actualizada seguido: [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## Contribuir

Nos encantaría una mano. De verdad. Hasta las cosas chiquitas cuentan:

- **Prueba la build de desarrollo** y abre una issue cuando algo te haga ruido. «Me dio mala espina» es un reporte de error legítimo; lo investigamos contigo.
- **Traduce un idioma.** El inglés es la fuente de la verdad; otros trece idiomas viven al lado.
- **Agrega un widget de panel.** Agarra una idea pequeña, publícala, aprende el patrón.
- **Mejora el manual.** Si usaste una función y la documentación no ayudó, una PR que lo arregle vale oro.

La configuración completa, la estructura del proyecto y la lista de verificación de PR están en [`CONTRIBUTING.md`](CONTRIBUTING.md). ¿Buscas un punto de entrada? Filtra las issues abiertas por [`good first issue`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) o [`help wanted`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22).

---

## Documentos del proyecto

- [Contexto de producto](CONTEXT.md) — el lenguaje de dominio que debes respetar
- [Arquitectura](docs/ARCHITECTURE.md) — mapa de módulos, dónde poner el código nuevo
- [Hoja de ruta](docs/ROADMAP.md)
- [Arquitectura del Dashboard](docs/DASHBOARD.md)
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

Si llegaste hasta aquí y todavía no le das una estrella — ¿qué esperas, una invitación personal? Considera esto la invitación personal.

⭐ **[Dale una estrella a KKTerm en GitHub](https://github.com/ryantsai/KKTerm)** — cuesta un clic y le alegra la semana entera al mantenedor. Piénsalo como un 乖乖 digital en el rack.

---

## Licencia

MIT. Ver [LICENSE](LICENSE). Úsalo, fórkalo, publícalo, mételo en un homelab que nadie más encuentre — ese es el trato.
