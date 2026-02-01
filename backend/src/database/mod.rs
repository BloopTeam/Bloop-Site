/**
 * Database module
 * Connection pooling and transaction management
 */
use sqlx::{PgPool, Postgres, Transaction};
use anyhow::Result;
use std::sync::Arc;

pub mod models;

/// Database connection pool wrapper
#[derive(Clone)]
pub struct Database {
    pool: Arc<PgPool>,
}

impl Database {
    /// Create a new database instance from connection string
    pub async fn new(database_url: &str) -> Result<Self> {
        let pool = PgPool::connect(database_url).await?;
        
        // Run migrations
        sqlx::migrate!("./migrations").run(&pool).await?;
        
        Ok(Self {
            pool: Arc::new(pool),
        })
    }

    /// Get a connection from the pool
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    /// Begin a transaction
    pub async fn begin(&self) -> Result<Transaction<'_, Postgres>> {
        Ok(self.pool.begin().await?)
    }

    /// Health check
    pub async fn health_check(&self) -> Result<()> {
        sqlx::query("SELECT 1").execute(&*self.pool).await?;
        Ok(())
    }
}

/// Database models for OpenClaw and Moltbook
pub use models::*;
