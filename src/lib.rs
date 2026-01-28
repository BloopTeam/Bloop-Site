use leptos::*;
use wasm_bindgen::prelude::*;

mod app;
mod components;
mod hooks;
mod utils;
mod types;

use app::App;

#[wasm_bindgen]
pub fn main() {
    console_error_panic_hook::set_once();
    
    leptos::mount_to_body(|| {
        view! {
            <App />
        }
    });
}
