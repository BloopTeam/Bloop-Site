use leptos::*;
use crate::types::{Toast, ToastType};

#[component]
pub fn ToastComponent(
    toasts: ReadSignal<Vec<Toast>>,
    on_remove: impl Fn(String) + 'static,
    do_not_disturb: bool,
    on_toggle_dnd: impl Fn() + 'static,
    sound_enabled: bool,
    on_toggle_sound: impl Fn() + 'static,
) -> impl IntoView {
    view! {
        <div
            style="position: fixed; top: 16px; right: 16px; z-index: 1000; display: flex; flex-direction: column; gap: 8px; pointer-events: none;"
        >
            <For
                each=move || toasts.get()
                key=|toast| toast.id.clone()
                children=move |toast: Toast| {
                    let toast_type = toast.toast_type.clone();
                    let id = toast.id.clone();
                    let bg_color = match toast_type {
                        ToastType::Success => "#4caf50",
                        ToastType::Error => "#f44336",
                        ToastType::Warning => "#ff9800",
                        ToastType::Info => "#2196f3",
                    };
                    
                    view! {
                        <div
                            style=format!(
                                "background: {}; color: #ffffff; padding: 12px 16px; border-radius: 4px; min-width: 300px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); pointer-events: auto; display: flex; align-items: center; justify-content: space-between;",
                                bg_color
                            )
                        >
                            <span style="font-size: 13px;">{toast.message.clone()}</span>
                            <button
                                on:click=move |_| on_remove(id.clone())
                                style="background: transparent; border: none; color: #ffffff; cursor: pointer; padding: 2px 4px; margin-left: 8px;"
                            >
                                "×"
                            </button>
                        </div>
                    }
                }
            />
        </div>
    }
}
