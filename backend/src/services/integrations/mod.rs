/**
 * External Integrations
 * 
 * Real WebSocket and API integrations for OpenClaw and Moltbook
 */
pub mod openclaw_ws;
pub mod moltbook_api;

pub use openclaw_ws::OpenClawWebSocketClient;
pub use moltbook_api::MoltbookApiClient;
