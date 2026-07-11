# itops.tasks.aiInstructionPlaceholder

- **English value**: `e.g. Continue only when the service is active; otherwise fail.`
- **Namespace**: `itops`
- **File/component**: `src/modules/itops/TaskLibrary.tsx`
- **UI role**: `AI Playbook node copy`
- **User flow**: Shown while configuring an AI decision node in a reusable Playbook.
- **Tone**: concise, deterministic, and security-aware
- **Placeholders**: none
- **Context/meaning**: AI decision means a closed structured routing result over the previous node output, not an open-ended assistant action.
- **Domain notes**: Host is an IT Ops Host. The allowed decisions are continue, success, and fail; AI nodes cannot call tools or create executable actions.
