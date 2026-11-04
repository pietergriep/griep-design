import { DialRoot } from "dialkit"
import "dialkit/styles.css"
import TasksToday from "../components/islands/TasksToday"

// Dev-only page (/tune/tasks, see astro.config.mjs): "Tasks today" with its DialKit panel.
// Tuned values stay in this browser; "Copy values" copies them as new defaults to paste
// into TasksToday.tsx (or send them to Claude).
export default function TasksTune() {
    return (
        <>
            <div className="card card-image card-tasks">
                <div className="island-root">
                    <div className="tasks-today" style={{ width: "var(--tasks-w)", maxWidth: "100%", flex: "none" }}>
                        <TasksToday />
                    </div>
                </div>
            </div>
            <DialRoot position="top-right" />
        </>
    )
}
