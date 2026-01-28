use leptos::*;
use crate::types::ToastType;

#[component]
pub fn MenuBar(
    on_toggle_terminal: impl Fn() + 'static,
    on_show_toast: impl Fn(ToastType, String) + 'static,
) -> impl IntoView {
    let menu_items = vec!["File", "Edit", "View", "Go", "Run", "Terminal", "Help"];
    let (hovered_item, set_hovered_item) = create_signal(None::<String>);
    let (active_menu, set_active_menu) = create_signal(None::<String>);

    view! {
        <div
            style="display: flex; align-items: center; height: 30px; background: #2d2d2d; border-bottom: 1px solid #3e3e3e; padding: 0 8px; user-select: none;"
        >
            <div style="display: flex; align-items: center; gap: 4px; margin-right: 16px;">
                <img src="/blooplogo.png" alt="Bloop" style="width: 16px; height: 16px;" />
                <span style="font-weight: 600; color: #ffffff;">Bloop</span>
            </div>

            {menu_items.into_iter().map(|item| {
                let item_str = item.to_string();
                let is_hovered = move || hovered_item.get().as_ref() == Some(&item_str);
                let is_active = move || active_menu.get().as_ref() == Some(&item_str);
                
                view! {
                    <div
                        on:mouseenter=move |_| set_hovered_item.set(Some(item_str.clone()))
                        on:mouseleave=move |_| set_hovered_item.set(None)
                        on:click=move |_| {
                            if is_active() {
                                set_active_menu.set(None);
                            } else {
                                set_active_menu.set(Some(item_str.clone()));
                            }
                        }
                        style=move || format!(
                            "padding: 4px 12px; cursor: pointer; border-radius: 4px; {}",
                            if is_hovered() || is_active() {
                                "background: #3e3e3e;"
                            } else {
                                ""
                            }
                        )
                    >
                        {item}
                    </div>
                }
            }).collect::<Vec<_>>()}

            <div style="flex: 1;" />

            <div style="display: flex; align-items: center; gap: 8px;">
                <input
                    type="text"
                    placeholder="Search..."
                    style="background: #1e1e1e; border: 1px solid #3e3e3e; border-radius: 4px; padding: 4px 8px; color: #cccccc; font-size: 12px; width: 200px;"
                />
                <button
                    on:click=move |_| on_show_toast(ToastType::Info, "Notifications".to_string())
                    style="background: transparent; border: none; color: #cccccc; cursor: pointer; padding: 4px;"
                >
                    "🔔"
                </button>
                <button
                    on:click=move |_| on_show_toast(ToastType::Info, "Settings".to_string())
                    style="background: transparent; border: none; color: #cccccc; cursor: pointer; padding: 4px;"
                >
                    "⚙️"
                </button>
            </div>
        </div>
    }
}
