# itops.tasks.addAi

- **English value**: `AI decision`
- **Namespace**: `itops`
- **File/component**: `src/modules/itops/TaskLibrary.tsx`
- **UI role**: `AI Playbook node copy`
- **User flow**: Shown while configuring an AI decision node in a reusable Playbook.
- **Tone**: concise, deterministic, and security-aware
- **Placeholders**: none
- **Context/meaning**: AI decision means a closed structured routing result over the previous node output, not an open-ended assistant action.
- **Domain notes**: Host is an IT Ops Host. The allowed decisions are continue, success, and fail; AI nodes cannot call tools or create executable actions.
