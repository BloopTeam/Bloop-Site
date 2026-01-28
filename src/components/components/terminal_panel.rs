use leptos::*;

#[component]
pub fn TerminalPanel(
    on_close: impl Fn() + 'static,
    height: u32,
    on_resize: impl Fn(i32) + 'static,
) -> impl IntoView {
    view! {
        <div
            style=format!(
                "height: {}px; background: #1e1e1e; border-top: 1px solid #3e3e3e; display: flex; flex-direction: column;",
                height
            )
        >
            <div style="padding: 4px 8px; background: #2d2d2d; border-bottom: 1px solid #3e3e3e; display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 11px; color: #cccccc; text-transform: uppercase;">Terminal</span>
                <button
                    on:click=move |_| on_close()
                    style="background: transparent; border: none; color: #cccccc; cursor: pointer; padding: 2px 4px;"
                >
                    "×"
                </button>
            </div>
            <div style="flex: 1; overflow-y: auto; padding: 8px; color: #cccccc; font-family: 'Fira Code', monospace; font-size: 12px;">
                <div style="color: #4ec9b0;">$</div>
                <div style="margin-top: 4px;">Ready for input...</div>
            </div>
        </div>
    }
}
