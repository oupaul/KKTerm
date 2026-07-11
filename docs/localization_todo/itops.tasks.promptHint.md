# itops.tasks.promptHint

- **English value**: `KKTerm sets this sudo prompt and waits for it before sending the secret.`
- **Namespace**: `itops`
- **File/component**: `src/modules/itops/TaskLibrary.tsx`
- **UI role**: `workflow editor copy`
- **User flow**: Shown while creating or editing a reusable Playbook in the Task Library.
- **Tone**: concise, operational, and security-aware
- **Placeholders**: none
- **Context/meaning**: This copy belongs to the ordered Playbook node editor; sudo means remote privilege elevation, not running KKTerm itself as administrator.
- **Domain notes**: Task and Playbook are IT Ops durable definitions. Credential values stay in the configured secret vault; only references are persisted.
