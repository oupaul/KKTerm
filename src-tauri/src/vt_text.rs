//! Minimal VT/ANSI interpreter that renders a terminal output stream to plain
//! text for terminal recordings.
//!
//! ConPTY (and remote shells) interleave text with cursor motion, erase, and
//! mode sequences; appending the raw stream to a `.txt` file produces
//! unreadable escape-sequence noise, especially for local Windows terminals
//! where ConPTY repaints the viewport aggressively. This renderer replays the
//! stream against a small screen model and emits readable lines. A line is
//! flushed once it scrolls out of the viewport (mirroring immutable terminal
//! scrollback); the remaining viewport is flushed when the recording stops.
//!
//! Scope is text layout only: colors (SGR), window titles (OSC), and terminal
//! modes are dropped. The alternate screen (vim, htop, ...) is modeled so its
//! transient content never lands in the recording.

const MAX_ROWS: usize = 1_024;
const MAX_COLS: usize = 4_096;
/// Continuation cell behind a double-width character; skipped when rendering.
const WIDE_CONTINUATION: char = '\0';

enum ParserState {
    Ground,
    Escape,
    EscapeIntermediate,
    Csi,
    Osc,
    OscEscape,
    /// DCS/SOS/PM/APC payload, consumed until ST.
    ConsumeSt,
    ConsumeStEscape,
}

pub struct VtTextRenderer {
    rows: usize,
    cols: usize,
    screen: Vec<Vec<char>>,
    row: usize,
    col: usize,
    saved_cursor: Option<(usize, usize)>,
    /// Saved main screen and cursor while the alternate screen is active.
    main_screen: Option<(Vec<Vec<char>>, usize, usize)>,
    state: ParserState,
    csi_params: String,
    csi_has_intermediate: bool,
    pending: String,
}

impl VtTextRenderer {
    pub fn new(rows: u16, cols: u16) -> Self {
        let rows = (rows as usize).clamp(1, MAX_ROWS);
        let cols = (cols as usize).clamp(1, MAX_COLS);
        Self {
            rows,
            cols,
            screen: vec![blank_row(cols); rows],
            row: 0,
            col: 0,
            saved_cursor: None,
            main_screen: None,
            state: ParserState::Ground,
            csi_params: String::new(),
            csi_has_intermediate: false,
            pending: String::new(),
        }
    }

    /// Feeds a chunk of terminal output (escape sequences may split across
    /// chunks) and returns text that became final since the last call.
    pub fn feed(&mut self, data: &str) -> String {
        for ch in data.chars() {
            self.step(ch);
        }
        std::mem::take(&mut self.pending)
    }

    /// Flushes the remaining viewport content. Call when recording stops.
    pub fn finish(&mut self) -> String {
        if let Some((main, row, col)) = self.main_screen.take() {
            self.screen = main;
            self.row = row.min(self.rows - 1);
            self.col = col.min(self.cols - 1);
            self.normalize_screen();
        }
        self.flush_screen();
        self.row = 0;
        self.col = 0;
        std::mem::take(&mut self.pending)
    }

    pub fn resize(&mut self, rows: u16, cols: u16) {
        let rows = (rows as usize).clamp(1, MAX_ROWS);
        let cols = (cols as usize).clamp(1, MAX_COLS);
        if rows == self.rows && cols == self.cols {
            return;
        }
        for row in &mut self.screen {
            row.resize(cols, ' ');
        }
        self.cols = cols;
        while self.screen.len() > rows {
            if self.row > 0 {
                let top = self.screen.remove(0);
                if self.main_screen.is_none() {
                    self.pending.push_str(&render_row(&top));
                    self.pending.push('\n');
                }
                self.row -= 1;
            } else {
                self.screen.pop();
            }
        }
        while self.screen.len() < rows {
            self.screen.push(blank_row(cols));
        }
        self.rows = rows;
        self.row = self.row.min(rows - 1);
        self.col = self.col.min(cols - 1);
    }

    fn step(&mut self, ch: char) {
        match self.state {
            ParserState::Ground => self.step_ground(ch),
            ParserState::Escape => self.step_escape(ch),
            ParserState::EscapeIntermediate => {
                if ch as u32 >= 0x30 {
                    self.state = ParserState::Ground;
                }
            }
            ParserState::Csi => self.step_csi(ch),
            ParserState::Osc => match ch {
                '\x07' => self.state = ParserState::Ground,
                '\x1b' => self.state = ParserState::OscEscape,
                _ => {}
            },
            ParserState::OscEscape => {
                if ch == '\\' {
                    self.state = ParserState::Ground;
                } else {
                    self.state = ParserState::Escape;
                    self.step(ch);
                }
            }
            ParserState::ConsumeSt => match ch {
                '\x07' => self.state = ParserState::Ground,
                '\x1b' => self.state = ParserState::ConsumeStEscape,
                _ => {}
            },
            ParserState::ConsumeStEscape => {
                if ch == '\\' {
                    self.state = ParserState::Ground;
                } else {
                    self.state = ParserState::Escape;
                    self.step(ch);
                }
            }
        }
    }

    fn step_ground(&mut self, ch: char) {
        match ch {
            '\x1b' => self.state = ParserState::Escape,
            '\r' => self.col = 0,
            '\n' | '\x0b' | '\x0c' => self.line_feed(),
            '\x08' => self.col = self.col.saturating_sub(1),
            '\t' => self.col = (((self.col / 8) + 1) * 8).min(self.cols - 1),
            c if (c as u32) < 0x20 || c == '\x7f' => {}
            c => self.print(c),
        }
    }

    fn step_escape(&mut self, ch: char) {
        self.state = ParserState::Ground;
        match ch {
            '[' => {
                self.csi_params.clear();
                self.csi_has_intermediate = false;
                self.state = ParserState::Csi;
            }
            ']' => self.state = ParserState::Osc,
            'P' | 'X' | '^' | '_' => self.state = ParserState::ConsumeSt,
            '7' => self.saved_cursor = Some((self.row, self.col)),
            '8' => self.restore_cursor(),
            'D' => self.line_feed(),
            'E' => {
                self.col = 0;
                self.line_feed();
            }
            'M' => self.reverse_line_feed(),
            'c' => {
                self.flush_screen();
                self.row = 0;
                self.col = 0;
                self.saved_cursor = None;
            }
            c if (0x20..=0x2f).contains(&(c as u32)) => {
                self.state = ParserState::EscapeIntermediate;
            }
            _ => {}
        }
    }

    fn step_csi(&mut self, ch: char) {
        match ch as u32 {
            0x30..=0x3f => {
                if self.csi_params.len() < 64 {
                    self.csi_params.push(ch);
                }
            }
            0x20..=0x2f => self.csi_has_intermediate = true,
            0x40..=0x7e => {
                self.state = ParserState::Ground;
                if !self.csi_has_intermediate {
                    self.csi_dispatch(ch);
                }
            }
            0x1b => self.state = ParserState::Escape,
            0x00..=0x1a | 0x1c..=0x1f => {
                // C0 controls execute without aborting the sequence.
                self.step_ground(ch);
            }
            _ => self.state = ParserState::Ground,
        }
    }

    fn csi_dispatch(&mut self, final_byte: char) {
        let private = self
            .csi_params
            .starts_with(|c| matches!(c, '<' | '=' | '>' | '?'));
        let params: Vec<usize> = self
            .csi_params
            .trim_start_matches(|c| matches!(c, '<' | '=' | '>' | '?'))
            .split(';')
            .map(|part| {
                part.split(':')
                    .next()
                    .unwrap_or("")
                    .parse::<usize>()
                    .unwrap_or(0)
                    .min(u16::MAX as usize)
            })
            .collect();
        let param = |index: usize, default: usize| {
            params
                .get(index)
                .copied()
                .filter(|value| *value != 0)
                .unwrap_or(default)
        };
        match final_byte {
            'A' => self.row = self.row.saturating_sub(param(0, 1)),
            'B' => self.row = (self.row + param(0, 1)).min(self.rows - 1),
            'C' => self.col = (self.col + param(0, 1)).min(self.cols - 1),
            'D' => self.col = self.col.saturating_sub(param(0, 1)),
            'E' => {
                self.col = 0;
                self.row = (self.row + param(0, 1)).min(self.rows - 1);
            }
            'F' => {
                self.col = 0;
                self.row = self.row.saturating_sub(param(0, 1));
            }
            'G' | '`' => self.col = (param(0, 1) - 1).min(self.cols - 1),
            'H' | 'f' => {
                self.row = (param(0, 1) - 1).min(self.rows - 1);
                self.col = (param(1, 1) - 1).min(self.cols - 1);
            }
            'd' => self.row = (param(0, 1) - 1).min(self.rows - 1),
            'J' => self.erase_display(params.first().copied().unwrap_or(0)),
            'K' => self.erase_line(params.first().copied().unwrap_or(0)),
            '@' => self.insert_chars(param(0, 1)),
            'P' => self.delete_chars(param(0, 1)),
            'X' => self.erase_chars(param(0, 1)),
            'L' => self.insert_lines(param(0, 1)),
            'M' => self.delete_lines(param(0, 1)),
            'S' => self.scroll_up(param(0, 1).min(self.rows)),
            'T' => self.scroll_down(param(0, 1).min(self.rows)),
            'h' if private => self.set_private_modes(&params, true),
            'l' if private => self.set_private_modes(&params, false),
            's' if !private => self.saved_cursor = Some((self.row, self.col)),
            'u' if !private => self.restore_cursor(),
            't' => {
                // XTWINOPS 8: resize report re-synthesized by ConPTY.
                if params.len() == 3 && params[0] == 8 && params[1] > 0 && params[2] > 0 {
                    self.resize(params[1] as u16, params[2] as u16);
                }
            }
            _ => {}
        }
    }

    fn set_private_modes(&mut self, params: &[usize], enable: bool) {
        for &mode in params {
            match mode {
                47 | 1047 | 1049 => {
                    if enable && self.main_screen.is_none() {
                        let main = std::mem::replace(
                            &mut self.screen,
                            vec![blank_row(self.cols); self.rows],
                        );
                        self.main_screen = Some((main, self.row, self.col));
                        self.row = 0;
                        self.col = 0;
                    } else if !enable
                        && let Some((main, row, col)) = self.main_screen.take()
                    {
                        self.screen = main;
                        self.row = row;
                        self.col = col;
                        self.normalize_screen();
                    }
                }
                1048 => {
                    if enable {
                        self.saved_cursor = Some((self.row, self.col));
                    } else {
                        self.restore_cursor();
                    }
                }
                _ => {}
            }
        }
    }

    fn print(&mut self, ch: char) {
        let width = char_display_width(ch);
        if width == 0 {
            return;
        }
        let width = width.min(self.cols);
        if self.col + width > self.cols {
            self.col = 0;
            self.line_feed();
        }
        self.clear_wide_cell(self.row, self.col);
        if width == 2 {
            self.clear_wide_cell(self.row, self.col + 1);
            self.screen[self.row][self.col] = ch;
            self.screen[self.row][self.col + 1] = WIDE_CONTINUATION;
        } else {
            self.screen[self.row][self.col] = ch;
        }
        self.col += width;
    }

    /// Overwriting half of a double-width character orphans the other half;
    /// replace the orphan with a space so columns stay aligned.
    fn clear_wide_cell(&mut self, row: usize, col: usize) {
        if self.screen[row][col] == WIDE_CONTINUATION {
            if col > 0 {
                self.screen[row][col - 1] = ' ';
            }
            self.screen[row][col] = ' ';
        } else if col + 1 < self.cols && self.screen[row][col + 1] == WIDE_CONTINUATION {
            self.screen[row][col + 1] = ' ';
        }
    }

    fn restore_cursor(&mut self) {
        if let Some((row, col)) = self.saved_cursor {
            self.row = row.min(self.rows - 1);
            self.col = col.min(self.cols - 1);
        }
    }

    fn line_feed(&mut self) {
        if self.row + 1 < self.rows {
            self.row += 1;
        } else {
            self.scroll_up(1);
        }
    }

    fn reverse_line_feed(&mut self) {
        if self.row > 0 {
            self.row -= 1;
        } else {
            self.scroll_down(1);
        }
    }

    fn scroll_up(&mut self, count: usize) {
        for _ in 0..count {
            let top = self.screen.remove(0);
            if self.main_screen.is_none() {
                self.pending.push_str(&render_row(&top));
                self.pending.push('\n');
            }
            self.screen.push(blank_row(self.cols));
        }
    }

    fn scroll_down(&mut self, count: usize) {
        for _ in 0..count {
            self.screen.pop();
            self.screen.insert(0, blank_row(self.cols));
        }
    }

    fn erase_display(&mut self, mode: usize) {
        match mode {
            0 => {
                self.erase_line(0);
                for row in self.row + 1..self.rows {
                    self.screen[row].fill(' ');
                }
            }
            1 => {
                self.erase_line(1);
                for row in 0..self.row {
                    self.screen[row].fill(' ');
                }
            }
            // Erasing the whole screen would drop everything shown since the
            // last scroll from the recording (e.g. `cls`), so flush it first.
            2 | 3 => self.flush_screen(),
            _ => {}
        }
    }

    fn erase_line(&mut self, mode: usize) {
        let (start, end) = match mode {
            0 => (self.col, self.cols),
            1 => (0, (self.col + 1).min(self.cols)),
            2 => (0, self.cols),
            _ => return,
        };
        for col in start..end {
            self.clear_wide_cell(self.row, col);
            self.screen[self.row][col] = ' ';
        }
    }

    fn insert_chars(&mut self, count: usize) {
        let count = count.min(self.cols - self.col);
        self.clear_wide_cell(self.row, self.col);
        let row = &mut self.screen[self.row];
        row.truncate(self.cols - count);
        for _ in 0..count {
            row.insert(self.col, ' ');
        }
    }

    fn delete_chars(&mut self, count: usize) {
        let count = count.min(self.cols - self.col);
        self.clear_wide_cell(self.row, self.col);
        let row = &mut self.screen[self.row];
        row.drain(self.col..self.col + count);
        row.resize(self.cols, ' ');
        // Deleting up to the middle of a wide pair leaves an orphan
        // continuation at the seam.
        if row[self.col] == WIDE_CONTINUATION {
            row[self.col] = ' ';
        }
    }

    fn erase_chars(&mut self, count: usize) {
        let end = (self.col + count).min(self.cols);
        for col in self.col..end {
            self.clear_wide_cell(self.row, col);
            self.screen[self.row][col] = ' ';
        }
    }

    fn insert_lines(&mut self, count: usize) {
        let count = count.min(self.rows - self.row);
        for _ in 0..count {
            self.screen.pop();
            self.screen.insert(self.row, blank_row(self.cols));
        }
    }

    fn delete_lines(&mut self, count: usize) {
        let count = count.min(self.rows - self.row);
        for _ in 0..count {
            self.screen.remove(self.row);
            self.screen.push(blank_row(self.cols));
        }
    }

    /// Flushes every viewport line up to the last non-blank one, leaving a
    /// blank screen. Alternate-screen content is discarded instead.
    fn flush_screen(&mut self) {
        if self.main_screen.is_some() {
            for row in &mut self.screen {
                row.fill(' ');
            }
            return;
        }
        let last = self
            .screen
            .iter()
            .rposition(|row| row.iter().any(|c| *c != ' ' && *c != WIDE_CONTINUATION));
        if let Some(last) = last {
            for index in 0..=last {
                self.pending.push_str(&render_row(&self.screen[index]));
                self.pending.push('\n');
                self.screen[index].fill(' ');
            }
        }
    }

    /// Re-fits the screen buffer to the current dimensions after restoring
    /// the main screen (the terminal may have resized while alt was active).
    fn normalize_screen(&mut self) {
        for row in &mut self.screen {
            row.resize(self.cols, ' ');
        }
        while self.screen.len() > self.rows {
            if self.row > 0 {
                let top = self.screen.remove(0);
                self.pending.push_str(&render_row(&top));
                self.pending.push('\n');
                self.row -= 1;
            } else {
                self.screen.pop();
            }
        }
        while self.screen.len() < self.rows {
            self.screen.push(blank_row(self.cols));
        }
        self.row = self.row.min(self.rows - 1);
        self.col = self.col.min(self.cols - 1);
    }
}

fn blank_row(cols: usize) -> Vec<char> {
    vec![' '; cols]
}

fn render_row(row: &[char]) -> String {
    let text: String = row
        .iter()
        .filter(|c| **c != WIDE_CONTINUATION)
        .collect::<String>();
    text.trim_end().to_string()
}

/// Approximate terminal display width: 0 for combining marks, 2 for East
/// Asian wide/fullwidth ranges and common emoji, 1 otherwise.
fn char_display_width(ch: char) -> usize {
    let c = ch as u32;
    if matches!(
        c,
        0x0300..=0x036f | 0x1ab0..=0x1aff | 0x20d0..=0x20ff | 0x200b..=0x200f | 0xfe00..=0xfe0f
    ) {
        return 0;
    }
    if matches!(
        c,
        0x1100..=0x115f      // Hangul jamo
        | 0x2e80..=0x303e    // CJK radicals, Kangxi, CJK punctuation
        | 0x3041..=0x33ff    // Hiragana .. CJK compatibility
        | 0x3400..=0x4dbf    // CJK extension A
        | 0x4e00..=0x9fff    // CJK unified
        | 0xa000..=0xa4cf    // Yi
        | 0xa960..=0xa97f    // Hangul jamo extended
        | 0xac00..=0xd7a3    // Hangul syllables
        | 0xf900..=0xfaff    // CJK compatibility ideographs
        | 0xfe30..=0xfe4f    // CJK compatibility forms
        | 0xff00..=0xff60    // Fullwidth forms
        | 0xffe0..=0xffe6
        | 0x1f300..=0x1f9ff  // Emoji (approximate)
        | 0x20000..=0x3fffd  // CJK extensions B..
    ) {
        return 2;
    }
    1
}

#[cfg(test)]
mod tests {
    use super::VtTextRenderer;

    fn render_all(rows: u16, cols: u16, data: &str) -> String {
        let mut renderer = VtTextRenderer::new(rows, cols);
        let mut text = renderer.feed(data);
        text.push_str(&renderer.finish());
        text
    }

    #[test]
    fn renders_plain_crlf_lines() {
        assert_eq!(render_all(24, 80, "hello\r\nworld\r\n"), "hello\nworld\n");
    }

    #[test]
    fn strips_sgr_colors_and_osc_titles() {
        assert_eq!(
            render_all(
                24,
                80,
                "\x1b]0;C:\\WINDOWS\\System32\\cmd.exe\x07\x1b[32mgreen\x1b[0m text\r\n"
            ),
            "green text\n"
        );
    }

    #[test]
    fn conpty_repaint_does_not_duplicate_lines() {
        let stream = "Windows PowerShell\r\nCopyright (C) Microsoft\r\n\
            \x1b[H\x1b[?25l\x1b[KWindows PowerShell\r\n\x1b[KCopyright (C) Microsoft\r\n\x1b[K\x1b[?25h";
        assert_eq!(
            render_all(24, 80, stream),
            "Windows PowerShell\nCopyright (C) Microsoft\n"
        );
    }

    #[test]
    fn clear_screen_preserves_earlier_content() {
        assert_eq!(
            render_all(24, 80, "first\r\n\x1b[2J\x1b[Hsecond"),
            "first\nsecond\n"
        );
    }

    #[test]
    fn scrolled_lines_flush_incrementally() {
        let mut renderer = VtTextRenderer::new(3, 80);
        assert_eq!(renderer.feed("a\r\nb\r\nc\r\nd"), "a\n");
        assert_eq!(renderer.finish(), "b\nc\nd\n");
    }

    #[test]
    fn alternate_screen_content_is_discarded() {
        assert_eq!(
            render_all(
                24,
                80,
                "before\r\n\x1b[?1049hfull screen app content\x1b[?1049lafter"
            ),
            "before\nafter\n"
        );
    }

    #[test]
    fn carriage_return_overwrites_line_in_place() {
        assert_eq!(render_all(24, 80, "12345\rab"), "ab345\n");
    }

    #[test]
    fn wide_characters_occupy_two_columns() {
        assert_eq!(render_all(24, 80, "大家好\x1b[1;7HX"), "大家好X\n");
    }

    #[test]
    fn erase_to_end_of_line_trims_overwritten_tail() {
        assert_eq!(render_all(24, 80, "1234567890\r\x1b[4Cnew\x1b[K"), "1234new\n");
    }

    #[test]
    fn conpty_resize_report_updates_dimensions() {
        // 5 rows: a..e fill the screen, f scrolls "a" out.
        let mut renderer = VtTextRenderer::new(24, 80);
        assert_eq!(
            renderer.feed("\x1b[8;5;40ta\r\nb\r\nc\r\nd\r\ne\r\nf"),
            "a\n"
        );
        assert_eq!(renderer.finish(), "b\nc\nd\ne\nf\n");
    }

    #[test]
    fn escape_sequence_split_across_chunks_is_parsed() {
        let mut renderer = VtTextRenderer::new(24, 80);
        renderer.feed("plain \x1b[3");
        renderer.feed("2mcolored\x1b[0m\r\n");
        assert_eq!(renderer.finish(), "plain colored\n");
    }

    #[test]
    fn win32_input_and_focus_modes_are_ignored() {
        assert_eq!(
            render_all(24, 80, "\x1b[?9001h\x1b[?1004hPS C:\\>"),
            "PS C:\\>\n"
        );
    }
}
