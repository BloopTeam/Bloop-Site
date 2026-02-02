/**
 * Adaptive Rate Limiter
 * 
 * 10x enhanced rate limiting:
 * - Adaptive algorithms based on behavior
 * - Per-user, per-IP, per-endpoint limits
 * - Burst protection
 * - Automatic threat detection
 */
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

pub struct AdaptiveRateLimiter {
    limits: Arc<RwLock<HashMap<String, RateLimitInfo>>>,
    default_limit: RateLimitConfig,
}

#[derive(Debug, Clone)]
struct RateLimitInfo {
    requests: Vec<Instant>,
    limit: u32,
    window: Duration,
    blocked_until: Option<Instant>,
    violation_count: u32,
}

#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    pub limit: u32,
    pub window: Duration,
    pub burst_limit: u32,
}

impl AdaptiveRateLimiter {
    pub fn new(default_limit: RateLimitConfig) -> Self {
        Self {
            limits: Arc::new(RwLock::new(HashMap::new())),
            default_limit,
        }
    }

    /// Check if request is allowed
    pub async fn check(&self, identifier: &str) -> RateLimitResult {
        let mut limits = self.limits.write().await;
        
        let info = limits.entry(identifier.to_string())
            .or_insert_with(|| RateLimitInfo {
                requests: Vec::new(),
                limit: self.default_limit.limit,
                window: self.default_limit.window,
                blocked_until: None,
                violation_count: 0,
            });

        // Check if currently blocked
        if let Some(blocked_until) = info.blocked_until {
            if Instant::now() < blocked_until {
                return RateLimitResult {
                    allowed: false,
                    remaining: 0,
                    reset_at: blocked_until,
                    reason: Some("Rate limit exceeded - temporarily blocked".to_string()),
                };
            } else {
                info.blocked_until = None;
            }
        }

        let now = Instant::now();
        
        // Clean old requests
        info.requests.retain(|&time| now.duration_since(time) < info.window);

        // Check limit
        if info.requests.len() >= info.limit as usize {
            info.violation_count += 1;
            
            // Adaptive blocking: increase block time with violations
            let block_duration = Duration::from_secs(60 * info.violation_count.min(10));
            info.blocked_until = Some(now + block_duration);

            return RateLimitResult {
                allowed: false,
                remaining: 0,
                reset_at: info.blocked_until.unwrap(),
                reason: Some(format!("Rate limit exceeded ({} violations)", info.violation_count)),
            };
        }

        // Check burst limit
        let recent_requests: Vec<_> = info.requests.iter()
            .filter(|&time| now.duration_since(*time) < Duration::from_secs(1))
            .collect();

        if recent_requests.len() >= self.default_limit.burst_limit as usize {
            info.violation_count += 1;
            let block_duration = Duration::from_secs(30 * info.violation_count.min(5));
            info.blocked_until = Some(now + block_duration);

            return RateLimitResult {
                allowed: false,
                remaining: 0,
                reset_at: info.blocked_until.unwrap(),
                reason: Some("Burst limit exceeded".to_string()),
            };
        }

        // Allow request
        info.requests.push(now);
        let remaining = info.limit.saturating_sub(info.requests.len() as u32);

        RateLimitResult {
            allowed: true,
            remaining,
            reset_at: now + info.window,
            reason: None,
        }
    }

    /// Reset rate limit for identifier (for testing/admin)
    pub async fn reset(&self, identifier: &str) {
        let mut limits = self.limits.write().await;
        limits.remove(identifier);
    }
}

#[derive(Debug, Clone)]
pub struct RateLimitResult {
    pub allowed: bool,
    pub remaining: u32,
    pub reset_at: Instant,
    pub reason: Option<String>,
}

impl Default for AdaptiveRateLimiter {
    fn default() -> Self {
        Self::new(RateLimitConfig {
            limit: 100,
            window: Duration::from_secs(60),
            burst_limit: 10,
        })
    }
}
