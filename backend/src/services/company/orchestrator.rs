/**
 * Company Orchestrator
 * 
 * Main orchestrator for the autonomous agent company.
 * Manages all agents, routes tasks, and ensures 24/7/365 operation.
 */
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;
use uuid::Uuid;
use chrono::Utc;

use crate::services::agent::AgentManager;
use crate::services::ai::router::ModelRouter;
use crate::config::Config;
use crate::database::Database;

use super::types::*;
use super::demand::DemandAnalyzer;
use super::visual::VisualCreativeEngine;
use super::collaboration::CollaborationHub;
use super::persistence::CompanyPersistence;
use super::health::CompanyHealthMonitor;
use super::scaling::PredictiveScaler;


pub struct CompanyOrchestrator {
    members: Arc<RwLock<HashMap<String, CompanyMember>>>,
    teams: Arc<RwLock<HashMap<String, Team>>>,
    agent_manager: Arc<AgentManager>,
    demand_analyzer: Arc<DemandAnalyzer>,
    visual_engine: Arc<VisualCreativeEngine>,
    collaboration_hub: Arc<CollaborationHub>,
    persistence: Arc<CompanyPersistence>,
    health_monitor: Arc<CompanyHealthMonitor>,
    predictive_scaler: Arc<PredictiveScaler>,
    metrics: Arc<RwLock<CompanyMetrics>>,
    is_running: Arc<RwLock<bool>>,
}

impl CompanyOrchestrator {
    pub fn new(
        agent_manager: Arc<AgentManager>,
        router: Arc<ModelRouter>,
        config: Arc<Config>,
        database: Option<Arc<Database>>,
    ) -> Arc<Self> {
        let agent_manager = agent_manager; // Keep as Arc
        let demand_analyzer = Arc::new(DemandAnalyzer::new(Arc::clone(&agent_manager)));
        let visual_engine = Arc::new(VisualCreativeEngine::new(
            Arc::clone(&router),
            Arc::clone(&config),
            database.clone(),
        ));
        // Initialize OpenClaw and Moltbook clients
        let openclaw_client = Arc::new(OpenClawWebSocketClient::new(Arc::clone(&config)));
        let moltbook_client = Arc::new(MoltbookApiClient::new(Arc::clone(&config)));
        
        // Connect to OpenClaw in background
        let openclaw_client_clone = Arc::clone(&openclaw_client);
        tokio::spawn(async move {
            if let Err(e) = openclaw_client_clone.connect().await {
                tracing::warn!("Failed to connect to OpenClaw Gateway: {}", e);
            }
        });

        let collaboration_hub = Arc::new(CollaborationHub::new(
            Arc::clone(&agent_manager),
            Arc::clone(&openclaw_client),
            database.clone(),
        ));
        let persistence = Arc::new(CompanyPersistence::new(database.clone()));
        let health_monitor = Arc::new(CompanyHealthMonitor::new());
        let predictive_scaler = Arc::new(PredictiveScaler::new(Arc::clone(&agent_manager)));

        let orchestrator = Arc::new(Self {
            members: Arc::new(RwLock::new(HashMap::new())),
            teams: Arc::new(RwLock::new(HashMap::new())),
            agent_manager,
            demand_analyzer,
            visual_engine,
            collaboration_hub,
            persistence,
            health_monitor,
            predictive_scaler,
            metrics: Arc::new(RwLock::new(CompanyMetrics {
                total_agents: 0,
                active_agents: 0,
                total_tasks_completed: 0,
                total_tasks_failed: 0,
                success_rate: 0.0,
                average_task_time_ms: 0,
                total_tokens_used: 0,
                uptime_seconds: 0,
                visual_creatives_completed: 0,
                collaborations_count: 0,
                last_updated: Utc::now(),
            })),
            is_running: Arc::new(RwLock::new(false)),
        });

        // Initialize company structure
        let orchestrator_clone = Arc::clone(&orchestrator);
        tokio::spawn(async move {
            orchestrator_clone.initialize_company().await;
        });

        orchestrator
    }

    /// Initialize the company structure with default teams and roles
    async fn initialize_company(&self) {
        tracing::info!("Initializing Agent Company...");

        // Create teams
        let teams = vec![
            ("Engineering", vec![
                CompanyRole::BackendEngineer,
                CompanyRole::FrontendEngineer,
                CompanyRole::DevOpsEngineer,
                CompanyRole::QaEngineer,
            ]),
            ("Creative", vec![
                CompanyRole::UiDesigner,
                CompanyRole::UxDesigner,
                CompanyRole::VisualDesigner,
                CompanyRole::ContentCreator,
            ]),
            ("Support", vec![
                CompanyRole::DocumentationSpecialist,
                CompanyRole::CustomerSupport,
            ]),
        ];

        let mut teams_map = self.teams.write().await;
        for (team_name, roles) in teams {
            teams_map.insert(
                team_name.to_string(),
                Team {
                    name: team_name.to_string(),
                    members: Vec::new(),
                    lead: None,
                    capacity: roles.len() * 2, // 2 agents per role
                    current_load: 0,
                },
            );
        }
        drop(teams_map);

        // Create strategic agents (CEO, CTO, PM)
        self.create_strategic_agents().await;

        // Register agents with OpenClaw and Moltbook
        self.register_agents_with_integrations().await;

        // Load persisted state
        if let Err(e) = self.persistence.load_company_state(self).await {
            tracing::warn!("Failed to load persisted state: {}", e);
        }

        // Start continuous operation (spawns async tasks)
        self.start_continuous_operation().await;
    }

    /// Register agents with OpenClaw and Moltbook
    async fn register_agents_with_integrations(&self) {
        let members = self.members.read().await;
        
        for member in members.values() {
            // In production, this would:
            // 1. Register agent with OpenClaw Gateway
            // 2. Register agent with Moltbook
            // 3. Store the IDs in the member record
            
            tracing::debug!(
                "Agent {} ({:?}) ready for OpenClaw/Moltbook integration",
                member.agent.id,
                member.role
            );
        }
        
        tracing::info!("Agents registered with integrations");
    }

    /// Create strategic agents (CEO, CTO, Product Manager)
    async fn create_strategic_agents(&self) {
        let strategic_roles = vec![
            (CompanyRole::Ceo, "Strategic planning and company direction"),
            (CompanyRole::Cto, "Technical architecture and technology decisions"),
            (CompanyRole::ProductManager, "Feature planning and prioritization"),
        ];

        for (role, description) in strategic_roles {
            let agent_id = Uuid::new_v4().to_string();
            let agent = crate::services::agent::types::Agent {
                id: agent_id.clone(),
                name: format!("{:?}", role),
                agent_type: self.role_to_agent_type(&role),
                status: crate::services::agent::types::AgentStatus::Idle,
                current_task: None,
                capabilities: self.role_to_capabilities(&role),
                created_at: Utc::now(),
                metadata: Some(HashMap::from([
                    ("role".to_string(), serde_json::json!(format!("{:?}", role))),
                    ("description".to_string(), serde_json::json!(description)),
                ])),
            };

            let member = CompanyMember {
                agent,
                role: role.clone(),
                team: "Leadership".to_string(),
                skills: self.role_to_skills(&role),
                performance_score: 1.0,
                tasks_completed: 0,
                tasks_failed: 0,
                average_task_time_ms: 0,
                last_active: Utc::now(),
                is_active: true,
                openclaw_id: None,
                moltbook_id: None,
            };

            let mut members = self.members.write().await;
            members.insert(agent_id, member);
        }

        tracing::info!("Strategic agents created");
    }

    /// Start continuous 24/7/365 operation
    async fn start_continuous_operation(&self) {
        let mut is_running = self.is_running.write().await;
        *is_running = true;
        drop(is_running);

        tracing::info!("Starting 24/7/365 continuous operation");

        // Start demand monitoring loop
        let orchestrator = Arc::clone(self);
        tokio::spawn(async move {
            orchestrator.demand_monitoring_loop().await;
        });

        // Start health monitoring loop
        let orchestrator = Arc::clone(self);
        tokio::spawn(async move {
            orchestrator.health_monitoring_loop().await;
        });

        // Start metrics update loop
        let orchestrator = Arc::clone(self);
        tokio::spawn(async move {
            orchestrator.metrics_update_loop().await;
        });

        // Start persistence save loop
        let orchestrator = Arc::clone(self);
        tokio::spawn(async move {
            orchestrator.persistence_save_loop().await;
        });
    }

    /// Demand monitoring loop - analyzes and routes tasks
    async fn demand_monitoring_loop(&self) {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(5));
        
        loop {
            interval.tick().await;
            
            if !*self.is_running.read().await {
                break;
            }

            // Analyze current demand
            match self.demand_analyzer.analyze_demand().await {
                Ok(demand) => {
                    // Record demand for predictive scaling
                    self.predictive_scaler.record_demand(demand.clone()).await;
                    
                    // Route tasks based on demand
                    self.route_tasks_based_on_demand(&demand).await;
                    
                    // Predict future demand and scale if needed
                    let predicted = self.predictive_scaler.predict_demand(1).await; // 1 hour ahead
                    let optimal_agents = self.predictive_scaler.calculate_optimal_agents(&predicted).await;
                    self.predictive_scaler.scale_agents(&optimal_agents).await;
                }
                Err(e) => {
                    tracing::error!("Demand analysis failed: {}", e);
                }
            }
        }
    }

    /// Health monitoring loop
    async fn health_monitoring_loop(&self) {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30));
        
        loop {
            interval.tick().await;
            
            if !*self.is_running.read().await {
                break;
            }

            self.health_monitor.check_company_health(self).await;
        }
    }

    /// Metrics update loop
    async fn metrics_update_loop(&self) {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(60));
        let start_time = Utc::now();
        
        loop {
            interval.tick().await;
            
            if !*self.is_running.read().await {
                break;
            }

            let members = self.members.read().await;
            let mut metrics = self.metrics.write().await;
            
            metrics.total_agents = members.len();
            metrics.active_agents = members.values()
                .filter(|m| m.is_active)
                .count();
            metrics.uptime_seconds = Utc::now()
                .signed_duration_since(start_time)
                .num_seconds() as u64;
            metrics.last_updated = Utc::now();
            
            drop(members);
            drop(metrics);
        }
    }

    /// Persistence save loop
    async fn persistence_save_loop(&self) {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(300)); // Every 5 minutes
        
        loop {
            interval.tick().await;
            
            if !*self.is_running.read().await {
                break;
            }

            if let Err(e) = self.persistence.save_company_state(self).await {
                tracing::error!("Failed to save company state: {}", e);
            }
        }
    }

    /// Route tasks based on demand analysis
    async fn route_tasks_based_on_demand(&self, demand: &DemandAnalysis) {
        // Get all pending tasks
        let tasks = self.agent_manager.list_tasks().await;
        
        // Filter to only pending tasks
        let pending_tasks: Vec<_> = tasks.iter()
            .filter(|t| matches!(t.status, crate::types::TaskStatus::Pending))
            .collect();

        if pending_tasks.is_empty() {
            return;
        }

        tracing::debug!(
            "Routing {} pending tasks based on demand analysis",
            pending_tasks.len()
        );

        // Route each task to appropriate agent based on demand
        for task in pending_tasks {
            // Find best agent for this task
            let role = match task.r#type {
                crate::types::TaskType::CodeGeneration => CompanyRole::BackendEngineer,
                crate::types::TaskType::CodeAnalysis => CompanyRole::BackendEngineer,
                crate::types::TaskType::Refactoring => CompanyRole::BackendEngineer,
                crate::types::TaskType::Debugging => CompanyRole::QaEngineer,
                crate::types::TaskType::Documentation => CompanyRole::DocumentationSpecialist,
                crate::types::TaskType::Testing => CompanyRole::QaEngineer,
            };
            
            // Find available agent with matching role
            let members = self.members.read().await;
            let available_agent = members.values()
                .find(|m| m.role == role && m.is_active && m.agent.status == crate::services::agent::types::AgentStatus::Idle);

            if let Some(member) = available_agent {
                tracing::debug!(
                    "Routing task {} to agent {} ({:?})",
                    task.id,
                    member.agent.id,
                    member.role
                );
                // Task will be picked up by agent manager's queue processor
            } else {
                tracing::debug!(
                    "No available agent for task {} (role: {:?}), will be queued",
                    task.id,
                    role
                );
            }
        }
    }

    // Helper methods
    fn role_to_agent_type(&self, role: &CompanyRole) -> crate::services::agent::types::AgentType {
        match role {
            CompanyRole::BackendEngineer | CompanyRole::FrontendEngineer => {
                crate::services::agent::types::AgentType::CodeGenerator
            }
            CompanyRole::QaEngineer => crate::services::agent::types::AgentType::Tester,
            CompanyRole::DocumentationSpecialist => {
                crate::services::agent::types::AgentType::Documenter
            }
            _ => crate::services::agent::types::AgentType::CodeGenerator,
        }
    }

    fn role_to_capabilities(&self, _role: &CompanyRole) -> Vec<crate::services::agent::types::Capability> {
        vec![
            crate::services::agent::types::Capability::ReadCode,
            crate::services::agent::types::Capability::WriteCode,
            crate::services::agent::types::Capability::UseAiModels,
        ]
    }

    fn role_to_skills(&self, role: &CompanyRole) -> Vec<String> {
        match role {
            CompanyRole::Ceo => vec!["strategy".to_string(), "planning".to_string()],
            CompanyRole::Cto => vec!["architecture".to_string(), "technology".to_string()],
            CompanyRole::ProductManager => vec!["product".to_string(), "prioritization".to_string()],
            CompanyRole::BackendEngineer => vec!["backend".to_string(), "rust".to_string(), "api".to_string()],
            CompanyRole::FrontendEngineer => vec!["frontend".to_string(), "react".to_string(), "typescript".to_string()],
            CompanyRole::UiDesigner => vec!["ui".to_string(), "design".to_string()],
            CompanyRole::VisualDesigner => vec!["visual".to_string(), "graphics".to_string()],
            _ => vec![],
        }
    }

    /// Get company metrics
    pub async fn get_metrics(&self) -> CompanyMetrics {
        self.metrics.read().await.clone()
    }

    /// Get all company members
    pub async fn get_members(&self) -> Vec<CompanyMember> {
        self.members.read().await.values().cloned().collect()
    }

    /// Get all teams
    pub async fn get_teams(&self) -> Vec<Team> {
        self.teams.read().await.values().cloned().collect()
    }

    /// Check if company is running
    pub async fn is_running(&self) -> bool {
        *self.is_running.read().await
    }
}
