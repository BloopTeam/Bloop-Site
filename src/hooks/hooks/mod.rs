use gloo_storage::{LocalStorage, Storage};
use leptos::*;
use serde::{Deserialize, Serialize};

pub fn use_local_storage<T>(key: &str, initial: T) -> (ReadSignal<T>, WriteSignal<T>)
where
    T: Clone + Serialize + for<'de> Deserialize<'de> + 'static,
{
    let initial_value = LocalStorage::get(key).unwrap_or(initial);
    let (value, set_value) = create_signal(initial_value.clone());

    create_effect(move |_| {
        let current = value.get();
        if let Err(e) = LocalStorage::set(key, &current) {
            web_sys::console::warn_1(&format!("Error saving to localStorage: {:?}", e).into());
        }
    });

    (value, set_value)
}
