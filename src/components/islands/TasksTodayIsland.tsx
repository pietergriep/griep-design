import TasksToday from "./TasksToday"

// The "Tasks today" planner widget, in the card that used to hold its picture. Its width
// is --tasks-w (global.css: the size the widget had in the picture); tune it with DialKit
// on the dev server at localhost:4322/tune/tasks.
export default function TasksTodayIsland() {
    return (
        <div className="island-root">
            <div className="tasks-today" style={{ width: "var(--tasks-w)", maxWidth: "100%", flex: "none" }}>
                <TasksToday />
            </div>
        </div>
    )
}
