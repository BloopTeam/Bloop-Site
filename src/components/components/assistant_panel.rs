use leptos::*;

#[component]
pub fn AssistantPanel(
    on_collapse: impl Fn() + 'static,
    width: u32,
) -> impl IntoView {
    view! {
        <div
            style=move || format!(
                "width: {}px; background: #252526; border-left: 1px solid #3e3e3e; display: flex; flex-direction: column; overflow: hidden;",
                width
            )
        >
            <div style="padding: 8px; border-bottom: 1px solid #3e3e3e;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span style="font-weight: 600; color: #ffffff; font-size: 11px; text-transform: uppercase;">
                        Assistant
                    </span>
                    <button
                        on:click=move |_| on_collapse()
                        style="background: transparent; border: none; color: #cccccc; cursor: pointer; padding: 2px 4px;"
                    >
                        "×"
                    </button>
                </div>
            </div>
            <div style="flex: 1; overflow-y: auto; padding: 16px; color: #cccccc;">
                <div style="margin-bottom: 16px;">
                    <div style="color: #858585; font-size: 11px; margin-bottom: 8px;">AI Assistant</div>
                    <div style="background: #2d2d2d; padding: 12px; border-radius: 4px; font-size: 12px;">
                        "How can I help you today?"
                    </div>
                </div>
            </div>
            <div style="padding: 8px; border-top: 1px solid #3e3e3e;">
                <input
                    type="text"
                    placeholder="Ask anything..."
                    style="width: 100%; background: #1e1e1e; border: 1px solid #3e3e3e; border-radius: 4px; padding: 8px; color: #cccccc; font-size: 12px;"
                />
            </div>
        </div>
    }
}
