use leptos::*;

#[component]
pub fn ResizeHandle(
    on_resize: impl Fn(i32) + 'static,
    direction: &'static str,
) -> impl IntoView {
    let (is_dragging, set_is_dragging) = create_signal(false);
    let (start_pos, set_start_pos) = create_signal(0);

    let handle_mouse_down = move |e: web_sys::MouseEvent| {
        set_is_dragging.set(true);
        set_start_pos.set(if direction == "horizontal" {
            e.client_x()
        } else {
            e.client_y()
        });
    };

    let window = web_sys::window().unwrap();
    let closure_move = wasm_bindgen::closure::Closure::wrap(Box::new(move |e: web_sys::MouseEvent| {
        if is_dragging.get() {
            let current_pos = if direction == "horizontal" {
                e.client_x()
            } else {
                e.client_y()
            };
            let delta = current_pos - start_pos.get();
            on_resize(delta);
            set_start_pos.set(current_pos);
        }
    }) as Box<dyn FnMut(_)>);
    window.add_event_listener_with_callback("mousemove", closure_move.as_ref().unchecked_ref()).unwrap();
    closure_move.forget();

    let closure_up = wasm_bindgen::closure::Closure::wrap(Box::new(move |_e: web_sys::MouseEvent| {
        set_is_dragging.set(false);
    }) as Box<dyn FnMut(_)>);
    window.add_event_listener_with_callback("mouseup", closure_up.as_ref().unchecked_ref()).unwrap();
    closure_up.forget();

    view! {
        <div
            on:mousedown=handle_mouse_down
            style=move || format!(
                "background: {}; cursor: {}; {}",
                if is_dragging.get() { "#007acc" } else { "transparent" },
                if direction == "horizontal" { "col-resize" } else { "row-resize" },
                if direction == "horizontal" {
                    "width: 4px;"
                } else {
                    "height: 4px;"
                }
            )
        />
    }
}
