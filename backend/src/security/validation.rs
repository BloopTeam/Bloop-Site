/**
 * Advanced Input Validation
 * 
 * 10x enhanced validation with:
 * - Deep code injection detection
 * - Advanced XSS prevention
 * - SQL injection pattern matching
 * - Command injection detection
 * - Path traversal prevention
 * - Malicious pattern detection
 */
use std::collections::HashSet;
use regex::Regex;

fn create_regex(pattern: &str) -> Regex {
    Regex::new(pattern).unwrap_or_else(|_| Regex::new("").unwrap())
}

pub struct AdvancedValidator {
    sql_injection_patterns: Vec<Regex>,
    xss_patterns: Vec<Regex>,
    command_injection_patterns: Vec<Regex>,
    malicious_patterns: Vec<Regex>,
    dangerous_functions: HashSet<String>,
}

impl AdvancedValidator {
    pub fn new() -> Self {
        let mut validator = Self {
            sql_injection_patterns: Vec::new(),
            xss_patterns: Vec::new(),
            command_injection_patterns: Vec::new(),
            malicious_patterns: Vec::new(),
            dangerous_functions: HashSet::new(),
        };
        
        validator.init_patterns();
        validator
    }

    fn init_patterns(&mut self) {
        // SQL Injection patterns
        self.sql_injection_patterns.push(create_regex(r"(?i)(union|select|insert|update|delete|drop|create|alter|exec|execute).*from"));
        self.sql_injection_patterns.push(create_regex(r"(?i)(or|and).*\d+\s*=\s*\d+"));
        self.sql_injection_patterns.push(create_regex(r"(?i)(;|--|\#|\/\*|\*\/)"));
        
        // XSS patterns
        self.xss_patterns.push(create_regex(r"(?i)<script[^>]*>"));
        self.xss_patterns.push(create_regex(r"(?i)javascript:"));
        self.xss_patterns.push(create_regex(r"(?i)on\w+\s*="));
        self.xss_patterns.push(create_regex(r"(?i)<iframe[^>]*>"));
        
        // Command injection patterns
        self.command_injection_patterns.push(create_regex(r"[;&|`$(){}]"));
        self.command_injection_patterns.push(create_regex(r"(?i)(exec|system|shell_exec|passthru|proc_open)"));
        
        // Malicious patterns
        self.malicious_patterns.push(create_regex(r"(?i)(eval|assert|preg_replace.*\/e)"));
        self.malicious_patterns.push(create_regex(r"(?i)(base64_decode|gzinflate|str_rot13)"));
        self.malicious_patterns.push(create_regex(r"(?i)(file_get_contents|file_put_contents|fopen|fwrite).*http"));
        
        // Dangerous functions
        self.dangerous_functions.insert("eval".to_string());
        self.dangerous_functions.insert("exec".to_string());
        self.dangerous_functions.insert("system".to_string());
        self.dangerous_functions.insert("shell_exec".to_string());
        self.dangerous_functions.insert("passthru".to_string());
        self.dangerous_functions.insert("proc_open".to_string());
        self.dangerous_functions.insert("popen".to_string());
    }

    /// Validate and sanitize input with 10x security
    pub fn validate_input(&self, input: &str, input_type: InputType) -> ValidationResult {
        let mut threats = Vec::new();
        let mut sanitized = input.to_string();

        // Check SQL injection
        for pattern in &self.sql_injection_patterns {
            if pattern.is_match(input) {
                threats.push(Threat {
                    threat_type: ThreatType::SqlInjection,
                    severity: Severity::High,
                    description: "Potential SQL injection detected".to_string(),
                    location: pattern.find(input).map(|m| m.start()).unwrap_or(0),
                });
            }
        }

        // Check XSS
        for pattern in &self.xss_patterns {
            if pattern.is_match(input) {
                threats.push(Threat {
                    threat_type: ThreatType::Xss,
                    severity: Severity::High,
                    description: "Potential XSS attack detected".to_string(),
                    location: pattern.find(input).map(|m| m.start()).unwrap_or(0),
                });
                // Sanitize XSS
                sanitized = pattern.replace_all(&sanitized, "").to_string();
            }
        }

        // Check command injection
        for pattern in &self.command_injection_patterns {
            if pattern.is_match(input) {
                threats.push(Threat {
                    threat_type: ThreatType::CommandInjection,
                    severity: Severity::Critical,
                    description: "Potential command injection detected".to_string(),
                    location: pattern.find(input).map(|m| m.start()).unwrap_or(0),
                });
            }
        }

        // Check malicious patterns
        for pattern in &self.malicious_patterns {
            if pattern.is_match(input) {
                threats.push(Threat {
                    threat_type: ThreatType::MaliciousCode,
                    severity: Severity::Critical,
                    description: "Malicious code pattern detected".to_string(),
                    location: pattern.find(input).map(|m| m.start()).unwrap_or(0),
                });
            }
        }

        // Check dangerous functions in code
        if input_type == InputType::Code {
            for func in &self.dangerous_functions {
                if input.contains(func) {
                    threats.push(Threat {
                        threat_type: ThreatType::DangerousFunction,
                        severity: Severity::High,
                        description: format!("Dangerous function '{}' detected", func),
                        location: input.find(func).unwrap_or(0),
                    });
                }
            }
        }

        // Path traversal check
        if input.contains("..") || input.contains("~/") || input.starts_with('/') {
            threats.push(Threat {
                threat_type: ThreatType::PathTraversal,
                severity: Severity::High,
                description: "Potential path traversal detected".to_string(),
                location: 0,
            });
        }

        // Additional sanitization
        sanitized = sanitized.replace("..", "");
        sanitized = sanitized.replace("~/", "");
        sanitized = sanitized.trim().to_string();

        ValidationResult {
            is_valid: threats.is_empty(),
            sanitized,
            threats,
        }
    }

    /// Validate file path
    pub fn validate_file_path(&self, path: &str) -> bool {
        // Check for path traversal
        if path.contains("..") || path.contains("~/") {
            return false;
        }

        // Check for absolute paths (if not allowed)
        if path.starts_with('/') || path.contains(':') {
            return false;
        }

        // Check for null bytes
        if path.contains('\0') {
            return false;
        }

        true
    }

    /// Validate code for security issues
    pub fn validate_code(&self, code: &str, language: &str) -> ValidationResult {
        let mut threats = Vec::new();

        // Language-specific validation
        match language.to_lowercase().as_str() {
            "javascript" | "typescript" => {
                // Check for dangerous eval usage
                if code.contains("eval(") || code.contains("Function(") {
                    threats.push(Threat {
                        threat_type: ThreatType::DangerousFunction,
                        severity: Severity::High,
                        description: "Use of eval() or Function() constructor detected".to_string(),
                        location: code.find("eval").unwrap_or(0),
                    });
                }
            }
            "python" => {
                // Check for dangerous exec/compile
                if code.contains("exec(") || code.contains("compile(") || code.contains("__import__") {
                    threats.push(Threat {
                        threat_type: ThreatType::DangerousFunction,
                        severity: Severity::High,
                        description: "Dangerous Python function detected".to_string(),
                        location: code.find("exec").unwrap_or(0),
                    });
                }
            }
            "rust" => {
                // Check for unsafe blocks (warn, not block)
                if code.contains("unsafe") {
                    threats.push(Threat {
                        threat_type: ThreatType::UnsafeCode,
                        severity: Severity::Medium,
                        description: "Unsafe Rust code detected".to_string(),
                        location: code.find("unsafe").unwrap_or(0),
                    });
                }
            }
            _ => {}
        }

        // General code validation
        let general_result = self.validate_input(code, InputType::Code);
        
        ValidationResult {
            is_valid: threats.is_empty() && general_result.is_valid,
            sanitized: general_result.sanitized,
            threats: {
                let mut all_threats = threats;
                all_threats.extend(general_result.threats);
                all_threats
            },
        }
    }
}

#[derive(Debug, Clone)]
pub enum InputType {
    Text,
    Code,
    Path,
    Url,
    Json,
}

#[derive(Debug, Clone)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub sanitized: String,
    pub threats: Vec<Threat>,
}

#[derive(Debug, Clone)]
pub struct Threat {
    pub threat_type: ThreatType,
    pub severity: Severity,
    pub description: String,
    pub location: usize,
}

#[derive(Debug, Clone)]
pub enum ThreatType {
    SqlInjection,
    Xss,
    CommandInjection,
    PathTraversal,
    MaliciousCode,
    DangerousFunction,
    UnsafeCode,
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub enum Severity {
    Low,
    Medium,
    High,
    Critical,
}

impl Default for AdvancedValidator {
    fn default() -> Self {
        Self::new()
    }
}
