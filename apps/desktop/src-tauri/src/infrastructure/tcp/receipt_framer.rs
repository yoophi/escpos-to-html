#[derive(Default)]
pub(super) struct ReceiptFramer {
    bytes: Vec<u8>,
}

impl ReceiptFramer {
    pub(super) fn append(&mut self, chunk: &[u8]) {
        self.bytes.extend_from_slice(chunk);
    }

    pub(super) fn drain_cut_frames(&mut self) -> Vec<Vec<u8>> {
        let mut frames = Vec::new();

        while let Some(end) = find_cut_command_end(&self.bytes) {
            frames.push(self.bytes.drain(..end).collect());
        }

        frames
    }

    pub(super) fn take_pending(&mut self) -> Option<Vec<u8>> {
        (!self.bytes.is_empty()).then(|| std::mem::take(&mut self.bytes))
    }
}

enum Command {
    Complete(usize),
    Cut(usize),
    Incomplete,
}

fn find_cut_command_end(bytes: &[u8]) -> Option<usize> {
    let mut index = 0;

    while index < bytes.len() {
        match command_at(bytes, index) {
            Command::Complete(length) => index += length,
            Command::Cut(length) => return Some(index + length),
            Command::Incomplete => return None,
        }
    }

    None
}

fn command_at(bytes: &[u8], index: usize) -> Command {
    match bytes[index] {
        0x1b => esc_command_at(bytes, index),
        0x1d => gs_command_at(bytes, index),
        0x1c => fs_command_at(bytes, index),
        _ => Command::Complete(1),
    }
}

fn esc_command_at(bytes: &[u8], index: usize) -> Command {
    let Some(&command) = bytes.get(index + 1) else {
        return Command::Incomplete;
    };

    match command {
        0x2a => {
            let Some(&mode) = bytes.get(index + 2) else {
                return Command::Incomplete;
            };
            let Some(&n_l) = bytes.get(index + 3) else {
                return Command::Incomplete;
            };
            let Some(&n_h) = bytes.get(index + 4) else {
                return Command::Incomplete;
            };
            let width = usize::from(n_l) + usize::from(n_h) * 256;
            let bands = if mode & 0x20 == 0 { 1 } else { 3 };
            complete_or_incomplete(bytes, index, 5 + width * bands)
        }
        0x21 | 0x45 | 0x2d | 0x61 | 0x4d | 0x64 => complete_or_incomplete(bytes, index, 3),
        0x70 => complete_or_incomplete(bytes, index, 5),
        _ => Command::Complete(2),
    }
}

fn gs_command_at(bytes: &[u8], index: usize) -> Command {
    let Some(&command) = bytes.get(index + 1) else {
        return Command::Incomplete;
    };

    match command {
        0x56 => {
            let Some(&mode) = bytes.get(index + 2) else {
                return Command::Incomplete;
            };
            let length = if mode == 0x41 || mode == 0x42 { 4 } else { 3 };
            match complete_or_incomplete(bytes, index, length) {
                Command::Complete(length) => Command::Cut(length),
                command => command,
            }
        }
        0x76 if bytes.get(index + 2) == Some(&0x30) => {
            let Some(&x_l) = bytes.get(index + 4) else {
                return Command::Incomplete;
            };
            let Some(&x_h) = bytes.get(index + 5) else {
                return Command::Incomplete;
            };
            let Some(&y_l) = bytes.get(index + 6) else {
                return Command::Incomplete;
            };
            let Some(&y_h) = bytes.get(index + 7) else {
                return Command::Incomplete;
            };
            let width_bytes = usize::from(x_l) + usize::from(x_h) * 256;
            let height_dots = usize::from(y_l) + usize::from(y_h) * 256;
            complete_or_incomplete(bytes, index, 8 + width_bytes * height_dots)
        }
        0x28 if matches!(bytes.get(index + 2), Some(0x4c | 0x6b)) => {
            let Some(&p_l) = bytes.get(index + 3) else {
                return Command::Incomplete;
            };
            let Some(&p_h) = bytes.get(index + 4) else {
                return Command::Incomplete;
            };
            let parameter_length = usize::from(p_l) + usize::from(p_h) * 256;
            complete_or_incomplete(bytes, index, 5 + parameter_length)
        }
        0x6b => gs_k_command_at(bytes, index),
        0x21 | 0x42 | 0x48 | 0x66 | 0x68 | 0x77 => complete_or_incomplete(bytes, index, 3),
        _ => Command::Complete(2),
    }
}

fn gs_k_command_at(bytes: &[u8], index: usize) -> Command {
    let Some(&symbology) = bytes.get(index + 2) else {
        return Command::Incomplete;
    };

    if symbology <= 6 {
        let data_start = index + 3;
        return bytes[data_start..]
            .iter()
            .position(|byte| *byte == 0x00)
            .map(|offset| Command::Complete(4 + offset))
            .unwrap_or(Command::Incomplete);
    }

    if symbology >= 65 {
        let Some(&data_length) = bytes.get(index + 3) else {
            return Command::Incomplete;
        };
        return complete_or_incomplete(bytes, index, 4 + usize::from(data_length));
    }

    Command::Complete(3)
}

fn fs_command_at(bytes: &[u8], index: usize) -> Command {
    let Some(&command) = bytes.get(index + 1) else {
        return Command::Incomplete;
    };

    match command {
        0x21 | 0x43 | 0x2d => complete_or_incomplete(bytes, index, 3),
        _ => Command::Complete(2),
    }
}

fn complete_or_incomplete(bytes: &[u8], index: usize, length: usize) -> Command {
    if bytes.len().saturating_sub(index) < length {
        Command::Incomplete
    } else {
        Command::Complete(length)
    }
}

#[cfg(test)]
mod tests {
    use super::ReceiptFramer;

    #[test]
    fn ignores_cut_bytes_inside_a_raster_image_payload() {
        let mut framer = ReceiptFramer::default();
        framer.append(&[
            0x1d, 0x76, 0x30, 0x00, 0x03, 0x00, 0x01, 0x00, 0x1d, 0x56, 0x00, 0x1d, 0x56, 0x00,
        ]);

        assert_eq!(
            framer.drain_cut_frames(),
            vec![vec![
                0x1d, 0x76, 0x30, 0x00, 0x03, 0x00, 0x01, 0x00, 0x1d, 0x56, 0x00, 0x1d, 0x56, 0x00,
            ]]
        );
    }

    #[test]
    fn waits_for_an_incomplete_raster_payload_before_scanning_again() {
        let mut framer = ReceiptFramer::default();
        framer.append(&[0x1d, 0x76, 0x30, 0x00, 0x03, 0x00, 0x01, 0x00, 0x1d, 0x56]);

        assert!(framer.drain_cut_frames().is_empty());
        framer.append(&[0x00, 0x1d, 0x56, 0x00]);

        assert_eq!(framer.drain_cut_frames().len(), 1);
        assert!(framer.take_pending().is_none());
    }

    #[test]
    fn ignores_cut_bytes_inside_a_qr_payload() {
        let mut framer = ReceiptFramer::default();
        framer.append(&[
            0x1d, 0x28, 0x6b, 0x06, 0x00, 49, 80, 48, 0x1d, 0x56, 0x00, 0x1d, 0x56, 0x00,
        ]);

        assert_eq!(framer.drain_cut_frames().len(), 1);
    }

    #[test]
    fn keeps_pending_bytes_for_idle_or_connection_completion() {
        let mut framer = ReceiptFramer::default();
        framer.append(b"receipt");

        assert_eq!(framer.take_pending(), Some(b"receipt".to_vec()));
        assert!(framer.take_pending().is_none());
    }
}
