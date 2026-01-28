use leptos::*;
use crate::types::ToastType;

#[component]
pub fn LeftSidebar(
    on_collapse: impl Fn() + 'static,
    width: u32,
    on_show_toast: impl Fn(ToastType, String) + 'static,
) -> impl IntoView {
    view! {
        <div
            style=move || format!(
                "width: {}px; background: #252526; border-right: 1px solid #3e3e3e; display: flex; flex-direction: column; overflow: hidden;",
                width
            )
        >
            <div style="padding: 8px; border-bottom: 1px solid #3e3e3e;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span style="font-weight: 600; color: #ffffff; font-size: 11px; text-transform: uppercase;">
                        Explorer
                    </span>
                    <button
                        on:click=move |_| on_collapse()
                        style="background: transparent; border: none; color: #cccccc; cursor: pointer; padding: 2px 4px;"
                    >
                        "×"
                    </button>
                </div>
            </div>
            <div style="flex: 1; overflow-y: auto; padding: 8px;">
                <div style="color: #858585; font-size: 11px; margin-bottom: 8px;">OPEN EDITORS</div>
                <div style="color: #858585; font-size: 11px; margin-top: 16px; margin-bottom: 8px;">EXPLORER</div>
                <div style="color: #cccccc; font-size: 12px; padding: 2px 0;">📁 src</div>
                <div style="color: #cccccc; font-size: 12px; padding: 2px 0; margin-left: 16px;">📄 App.tsx</div>
                <div style="color: #cccccc; font-size: 12px; padding: 2px 0; margin-left: 16px;">📄 main.tsx</div>
            </div>
        </div>
    }
}
