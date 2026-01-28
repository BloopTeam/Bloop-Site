use leptos::*;

#[component]
pub fn BeginnerGuide() -> impl IntoView {
    let (dismissed, set_dismissed) = create_signal(false);

    view! {
        <Show when=move || !dismissed.get()>
            <div
                style="position: fixed; bottom: 24px; right: 24px; background: #2d2d2d; border: 1px solid #3e3e3e; border-radius: 8px; padding: 16px; max-width: 300px; z-index: 100; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);"
            >
                <div style="font-weight: 600; color: #ffffff; margin-bottom: 8px;">
                    "Welcome to Bloop"
                </div>
                <div style="color: #cccccc; font-size: 12px; margin-bottom: 12px;">
                    "Press Ctrl+K to open the command palette"
                </div>
                <button
                    on:click=move |_| set_dismissed.set(true)
                    style="background: #007acc; border: none; color: #ffffff; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;"
                >
                    "Got it"
                </button>
            </div>
        </Show>
    }
}
