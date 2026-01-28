/**
 * Logging utilities using tracing
 */
use tracing::{info, warn, error, debug};

pub fn init_logger() {
    tracing_subscriber::fmt()
        .with_target(false)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .init();
}

pub use tracing::{info, warn, error, debug};
