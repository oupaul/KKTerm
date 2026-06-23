# connections.serialLinePlaceholder

- **English value**: `e.g. COM3 or /dev/cu.usbserial-1410`
- **Namespace**: `connections`
- **File/component**: `src/modules/workspace/connections/connection-dialog/SerialConnectionFields.tsx`
- **UI role**: `placeholder`
- **User flow**: Shown in the empty Serial connection "Line" field of the add/edit connection dialog, hinting at the device-path format the user may type or pick from the detected-port dropdown.
- **Tone**: concise/neutral
- **Placeholders**: none
- **Context/meaning**: Example of a serial device identifier. Was previously the Windows-only literal `COM1`, which misled macOS/Linux users (issue #429); now gives a cross-platform example. The `e.g.` is an abbreviation for "for example" and the device strings are technical examples — translate the `e.g.` lead-in but keep `COM3` and `/dev/cu.usbserial-1410` verbatim as literal device names.
- **Domain notes**: `COM3` (Windows) and `/dev/cu.usbserial-1410` (macOS) are literal OS serial-port path examples and must stay unchanged in every locale.

<!--
Filename: connections.serialLinePlaceholder.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
