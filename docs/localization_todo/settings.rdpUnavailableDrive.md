# settings.rdpUnavailableDrive

- **English value**: `{{drive}} — Not currently available`
- **Namespace**: `settings`
- **File/component**: `src/modules/workspace/connections/remote-desktop/RdpLocalResourceSelector.tsx`
- **UI role**: `status`
- **User flow**: Preserves a saved Windows drive choice when that drive is temporarily absent.
- **Tone**: `concise/neutral`
- **Placeholders**: `{{drive}}`; it must survive unchanged in every locale.
- **Context/meaning**: The saved drive root cannot currently be enumerated but remains selected.
- **Domain notes**: Drive is a Windows drive root such as D:.
