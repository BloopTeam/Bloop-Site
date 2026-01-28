use leptos::*;
use crate::components::*;
use crate::hooks::use_local_storage;
use crate::types::Toast;

#[component]
pub fn App() -> impl IntoView {
    let (show_command_palette, set_show_command_palette) = create_signal(false);
    let (sidebar_collapsed, set_sidebar_collapsed) = create_signal(false);
    let (assistant_collapsed, set_assistant_collapsed) = create_signal(false);
    let (terminal_visible, set_terminal_visible) = create_signal(false);
    let (toasts, set_toasts) = create_signal(Vec::<Toast>::new());
    let (do_not_disturb, set_do_not_disturb) = create_signal(false);
    let (sound_enabled, set_sound_enabled) = create_signal(true);

    let (sidebar_width, set_sidebar_width) = use_local_storage("bloop-sidebar-width", 320);
    let (assistant_width, set_assistant_width) = use_local_storage("bloop-assistant-width", 480);
    let (terminal_height, set_terminal_height) = use_local_storage("bloop-terminal-height", 200);

    let add_toast = move |toast_type: crate::types::ToastType, message: String| {
        let id = format!("{}", js_sys::Date::now() as u64);
        let toast = Toast {
            id,
            toast_type,
            message,
            duration: None,
        };
        set_toasts.update(|toasts| toasts.push(toast));
    };

    let remove_toast = move |id: String| {
        set_toasts.update(|toasts| toasts.retain(|t| t.id != id));
    };

    let handle_sidebar_resize = move |delta: i32| {
        set_sidebar_width.update(|w| {
            *w = (*w as i32 + delta).max(200).min(600) as u32;
        });
    };

    let handle_assistant_resize = move |delta: i32| {
        set_assistant_width.update(|w| {
            *w = (*w as i32 - delta).max(300).min(800) as u32;
        });
    };

    let handle_terminal_resize = move |delta: i32| {
        set_terminal_height.update(|h| {
            *h = (*h as i32 + delta).max(100).min(500) as u32;
        });
    };

    let document = web_sys::window().unwrap().document().unwrap();
    let closure = wasm_bindgen::closure::Closure::wrap(Box::new(move |e: web_sys::KeyboardEvent| {
        if (e.ctrl_key() || e.meta_key()) && e.key() == "k" {
            e.prevent_default();
            set_show_command_palette.set(true);
        }
        if (e.ctrl_key() || e.meta_key()) && e.key() == "b" {
            e.prevent_default();
            set_sidebar_collapsed.update(|c| *c = !*c);
        }
        if (e.ctrl_key() || e.meta_key()) && e.key() == "`" {
            e.prevent_default();
            set_terminal_visible.update(|v| *v = !*v);
        }
        if (e.ctrl_key() || e.meta_key()) && e.key() == "s" {
            e.prevent_default();
            add_toast(crate::types::ToastType::Success, "File saved successfully".to_string());
        }
    }) as Box<dyn FnMut(_)>);
    document.add_event_listener_with_callback("keydown", closure.as_ref().unchecked_ref()).unwrap();
    closure.forget();

    view! {
        <div
            style="width: 100vw; height: 100vh; background: #1e1e1e; color: #cccccc; display: flex; flex-direction: column; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px;"
        >
            <MenuBar
                on_toggle_terminal=move || set_terminal_visible.update(|v| *v = !*v)
                on_show_toast=add_toast
            />

            <div style="display: flex; flex: 1; overflow: hidden; flex-direction: column;">
                <div style="display: flex; flex: 1; overflow: hidden;">
                    <Show when=move || !sidebar_collapsed.get()>
                        <LeftSidebar
                            on_collapse=move || set_sidebar_collapsed.set(true)
                            width=sidebar_width.get()
                            on_show_toast=add_toast
                        />
                        <ResizeHandle on_resize=handle_sidebar_resize direction="horizontal" />
                    </Show>

                    <EditorArea on_show_toast=add_toast />

                    <Show when=move || !assistant_collapsed.get()>
                        <ResizeHandle on_resize=handle_assistant_resize direction="horizontal" />
                        <AssistantPanel
                            on_collapse=move || set_assistant_collapsed.set(true)
                            width=assistant_width.get()
                        />
                    </Show>
                </div>

                <Show when=move || terminal_visible.get()>
                    <TerminalPanel
                        on_close=move || set_terminal_visible.set(false)
                        height=terminal_height.get()
                        on_resize=handle_terminal_resize
                    />
                </Show>
            </div>

            <StatusBar
                terminal_visible=terminal_visible.get()
                on_toggle_terminal=move || set_terminal_visible.update(|v| *v = !*v)
            />

            <Show when=move || show_command_palette.get()>
                <CommandPalette on_close=move || set_show_command_palette.set(false) />
            </Show>

            <BeginnerGuide />

            <ToastComponent
                toasts=toasts
                on_remove=remove_toast
                do_not_disturb=do_not_disturb.get()
                on_toggle_dnd=move || set_do_not_disturb.update(|d| *d = !*d)
                sound_enabled=sound_enabled.get()
                on_toggle_sound=move || set_sound_enabled.update(|s| *s = !*s)
            />
        </div>
    }
}
