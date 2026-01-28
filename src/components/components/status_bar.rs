use leptos::*;

#[component]
pub fn StatusBar(
    terminal_visible: bool,
    on_toggle_terminal: impl Fn() + 'static,
) -> impl IntoView {
    view! {
        <div
            style="height: 22px; background: #007acc; color: #ffffff; display: flex; align-items: center; padding: 0 8px; font-size: 11px;"
        >
            <div style="margin-right: 16px;">"Ready"</div>
            <div style="margin-right: 16px;">"Ln 1, Col 1"</div>
            <div style="margin-right: 16px;">"Spaces: 2"</div>
            <div style="flex: 1;" />
            <button
                on:click=move |_| on_toggle_terminal()
                style="background: transparent; border: none; color: #ffffff; cursor: pointer; padding: 2px 4px;"
            >
                {if terminal_visible { "Hide Terminal" } else { "Show Terminal" }}
            </button>
        </div>
    }
}
