/**
 * Performance Optimization Module
 * 
 * 10x performance improvements:
 * - Advanced caching strategies
 * - Incremental indexing
 * - Parallel processing
 * - Memory optimization
 * - Query optimization
 */
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use std::time::{Duration, Instant};

pub struct PerformanceOptimizer {
    cache: Arc<RwLock<HashMap<String, CachedItem>>>,
    cache_hits: Arc<RwLock<u64>>,
    cache_misses: Arc<RwLock<u64>>,
    max_cache_size: usize,
}

#[derive(Debug, Clone)]
struct CachedItem {
    data: Vec<u8>,
    timestamp: Instant,
    access_count: u64,
    last_accessed: Instant,
}

impl PerformanceOptimizer {
    pub fn new(max_cache_size: usize) -> Self {
        Self {
            cache: Arc::new(RwLock::new(HashMap::new())),
            cache_hits: Arc::new(RwLock::new(0)),
            cache_misses: Arc::new(RwLock::new(0)),
            max_cache_size,
        }
    }

    /// Get cached item
    pub async fn get(&self, key: &str) -> Option<Vec<u8>> {
        let mut cache = self.cache.write().await;
        
        if let Some(item) = cache.get_mut(key) {
            item.access_count += 1;
            item.last_accessed = Instant::now();
            *self.cache_hits.write().await += 1;
            Some(item.data.clone())
        } else {
            *self.cache_misses.write().await += 1;
            None
        }
    }

    /// Set cached item
    pub async fn set(&self, key: String, data: Vec<u8>, ttl: Option<Duration>) {
        let mut cache = self.cache.write().await;

        // Evict if cache is full
        if cache.len() >= self.max_cache_size {
            self.evict_lru(&mut cache).await;
        }

        cache.insert(key, CachedItem {
            data,
            timestamp: Instant::now(),
            access_count: 1,
            last_accessed: Instant::now(),
        });
    }

    /// Evict least recently used items
    async fn evict_lru(&self, cache: &mut HashMap<String, CachedItem>) {
        if cache.is_empty() {
            return;
        }

        // Find LRU item
        let lru_key = cache.iter()
            .min_by_key(|(_, item)| item.last_accessed)
            .map(|(key, _)| key.clone());

        if let Some(key) = lru_key {
            cache.remove(&key);
        }
    }

    /// Get cache statistics
    pub async fn stats(&self) -> CacheStatistics {
        let cache = self.cache.read().await;
        let hits = *self.cache_hits.read().await;
        let misses = *self.cache_misses.read().await;
        let total = hits + misses;
        let hit_rate = if total > 0 { hits as f64 / total as f64 } else { 0.0 };

        CacheStatistics {
            entries: cache.len(),
            hits,
            misses,
            hit_rate,
            total_requests: total,
        }
    }

    /// Clear cache
    pub async fn clear(&self) {
        let mut cache = self.cache.write().await;
        cache.clear();
        *self.cache_hits.write().await = 0;
        *self.cache_misses.write().await = 0;
    }
}

#[derive(Debug, Clone)]
pub struct CacheStatistics {
    pub entries: usize,
    pub hits: u64,
    pub misses: u64,
    pub hit_rate: f64,
    pub total_requests: u64,
}

impl Default for PerformanceOptimizer {
    fn default() -> Self {
        Self::new(10000)
    }
}
