/**
 * Advanced Security Module
 * 
 * 10x security enhancements:
 * - Advanced input validation and sanitization
 * - Encryption at rest and in transit
 * - Vulnerability scanning
 * - Security audit logging
 * - Threat detection
 * - Rate limiting with adaptive algorithms
 */
pub mod validation;
pub mod encryption;
pub mod vulnerability_scanner;
pub mod audit_logger;
pub mod threat_detection;
pub mod rate_limiter;

pub use validation::{AdvancedValidator, ValidationResult, Threat, ThreatType, Severity};
pub use encryption::EncryptionService;
pub use vulnerability_scanner::{VulnerabilityScanner, Vulnerability};
pub use audit_logger::{AuditLogger, AuditLog, AuditEventType, AuditResult, ThreatLevel};
pub use threat_detection::{ThreatDetector, ThreatAnalysis, ThreatEvent, ThreatType as ThreatEventType, ThreatSeverity};
pub use rate_limiter::{AdaptiveRateLimiter, RateLimitResult, RateLimitConfig};
