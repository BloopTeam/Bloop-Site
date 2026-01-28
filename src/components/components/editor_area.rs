use leptos::*;
use crate::types::ToastType;

#[component]
pub fn EditorArea(on_show_toast: impl Fn(ToastType, String) + 'static) -> impl IntoView {
    view! {
        <div style="flex: 1; display: flex; flex-direction: column; background: #1e1e1e; overflow: hidden;">
            <div style="display: flex; background: #2d2d2d; border-bottom: 1px solid #3e3e3e;">
                <div
                    style="padding: 8px 16px; background: #1e1e1e; border-right: 1px solid #3e3e3e; color: #cccccc; font-size: 12px; cursor: pointer;"
                >
                    App.tsx
                </div>
            </div>
            <div style="flex: 1; overflow: auto; padding: 16px; color: #cccccc; font-family: 'Fira Code', monospace; font-size: 14px; line-height: 1.6;">
                <pre style="margin: 0; white-space: pre-wrap;">
                    <span style="color: #569cd6;">import</span> <span style="color: #4ec9b0;">React</span> <span style="color: #569cd6;">from</span> <span style="color: #ce9178;">'react'</span>
                    <br/>
                    <br/>
                    <span style="color: #569cd6;">export default function</span> <span style="color: #dcdcaa;">App</span>() <span style="color: #569cd6;">{</span>
                    <br/>
                    <span style="color: #808080;">  </span><span style="color: #569cd6;">return</span> <span style="color: #569cd6;">&lt;</span><span style="color: #4ec9b0;">div</span><span style="color: #569cd6;">&gt;</span>
                    <br/>
                    <span style="color: #808080;">    </span><span style="color: #ce9178;">Hello, Bloop!</span>
                    <br/>
                    <span style="color: #808080;">  </span><span style="color: #569cd6;">&lt;/</span><span style="color: #4ec9b0;">div</span><span style="color: #569cd6;">&gt;</span>
                    <br/>
                    <span style="color: #569cd6;">}</span>
                </pre>
            </div>
        </div>
    }
}
