use leptos::*;

#[component]
pub fn CommandPalette(on_close: impl Fn() + 'static) -> impl IntoView {
    view! {
        <div
            style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;"
            on:click=move |_| on_close()
        >
            <div
                style="background: #2d2d2d; border: 1px solid #3e3e3e; border-radius: 4px; width: 600px; max-height: 400px; overflow: hidden;"
                on:click=|e| e.stop_propagation()
            >
                <input
                    type="text"
                    placeholder="Type a command..."
                    style="width: 100%; background: #1e1e1e; border: none; padding: 12px; color: #cccccc; font-size: 14px;"
                    autofocus=true
                />
                <div style="padding: 8px; color: #858585; font-size: 11px;">
                    "Commands will appear here"
                </div>
            </div>
        </div>
    }
}
