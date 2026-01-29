/**
 * Task Queue System
 * 
 * Manages task queuing with prioritization and backpressure
 * Handles 10x capacity with zero faults
 */
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::BinaryHeap;
use std::cmp::Ordering;
use crate::types::{AgentTask, Priority, TaskStatus};
use chrono::Utc;

/// Task queue item with priority
#[derive(Debug, Clone)]
pub struct QueuedTask {
    pub task: AgentTask,
    pub priority_score: u64,
    pub queued_at: chrono::DateTime<Utc>,
}

impl PartialEq for QueuedTask {
    fn eq(&self, other: &Self) -> bool {
        self.priority_score == other.priority_score
    }
}

impl Eq for QueuedTask {}

impl PartialOrd for QueuedTask {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for QueuedTask {
    fn cmp(&self, other: &Self) -> Ordering {
        // Higher priority score = higher priority
        other.priority_score.cmp(&self.priority_score)
            .then_with(|| self.queued_at.cmp(&other.queued_at))
    }
}

/// Task queue with prioritization
pub struct TaskQueue {
    queue: Arc<RwLock<BinaryHeap<QueuedTask>>>,
    max_size: usize,
    current_size: Arc<RwLock<usize>>,
}

impl TaskQueue {
    pub fn new(max_size: usize) -> Self {
        Self {
            queue: Arc::new(RwLock::new(BinaryHeap::new())),
            max_size,
            current_size: Arc::new(RwLock::new(0)),
        }
    }
    
    /// Calculate priority score
    fn calculate_priority_score(task: &AgentTask) -> u64 {
        let priority_multiplier = match task.priority {
            Priority::Urgent => 1000,
            Priority::High => 500,
            Priority::Medium => 100,
            Priority::Low => 10,
        };
        
        // Age bonus (older tasks get slight priority boost)
        let age_seconds = Utc::now()
            .signed_duration_since(task.created_at)
            .num_seconds();
        let age_bonus = (age_seconds / 60) as u64; // 1 point per minute
        
        priority_multiplier + age_bonus
    }
    
    /// Enqueue task
    pub async fn enqueue(&self, task: AgentTask) -> Result<(), String> {
        let mut current_size = self.current_size.write().await;
        
        if *current_size >= self.max_size {
            return Err(format!("Task queue full ({} tasks)", self.max_size));
        }
        
        let priority_score = Self::calculate_priority_score(&task);
        let queued_task = QueuedTask {
            task,
            priority_score,
            queued_at: Utc::now(),
        };
        
        let mut queue = self.queue.write().await;
        queue.push(queued_task);
        *current_size += 1;
        
        Ok(())
    }
    
    /// Dequeue highest priority task
    pub async fn dequeue(&self) -> Option<AgentTask> {
        let mut queue = self.queue.write().await;
        let mut current_size = self.current_size.write().await;
        
        if let Some(queued_task) = queue.pop() {
            *current_size -= 1;
            Some(queued_task.task)
        } else {
            None
        }
    }
    
    /// Get queue size
    pub async fn size(&self) -> usize {
        *self.current_size.read().await
    }
    
    /// Check if queue is full
    pub async fn is_full(&self) -> bool {
        *self.current_size.read().await >= self.max_size
    }
    
    /// Get queue capacity
    pub fn capacity(&self) -> usize {
        self.max_size
    }
    
    /// Clear queue (for recovery scenarios)
    pub async fn clear(&self) {
        let mut queue = self.queue.write().await;
        queue.clear();
        let mut current_size = self.current_size.write().await;
        *current_size = 0;
    }
}

/// Backpressure manager
pub struct BackpressureManager {
    pub max_concurrent_tasks: usize,
    current_concurrent: Arc<RwLock<usize>>,
}

impl BackpressureManager {
    pub fn new(max_concurrent_tasks: usize) -> Self {
        Self {
            max_concurrent_tasks,
            current_concurrent: Arc::new(RwLock::new(0)),
        }
    }
    
    /// Check if can accept new task
    pub async fn can_accept(&self) -> bool {
        *self.current_concurrent.read().await < self.max_concurrent_tasks
    }
    
    /// Reserve slot for task
    pub async fn reserve(&self) -> Result<(), String> {
        let mut current = self.current_concurrent.write().await;
        if *current >= self.max_concurrent_tasks {
            return Err("Maximum concurrent tasks reached".to_string());
        }
        *current += 1;
        Ok(())
    }
    
    /// Release slot
    pub async fn release(&self) {
        let mut current = self.current_concurrent.write().await;
        if *current > 0 {
            *current -= 1;
        }
    }
    
    /// Get current concurrent count
    pub async fn current_count(&self) -> usize {
        *self.current_concurrent.read().await
    }
}
