class TodoApp {
  constructor() {
    this.todos = JSON.parse(localStorage.getItem("todos")) || [];
    this.subtasks = [];
    this.sortOrder = "asc";

    this.notificationSound = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
    );
    this.lastCheckTime = new Date();
    this.reminderCheckInterval = null;
    this.activeAlarms = new Map();
    this.snoozeTime = 5;

    this.initializeElements();
    this.addEventListeners();
    this.renderTodos();
  }

  initializeElements() {
    this.form = document.getElementById("todoForm");
    this.todoInput = document.getElementById("todoInput");
    this.todoList = document.getElementById("todoList");
    this.searchInput = document.getElementById("search");
    this.filterStatus = document.getElementById("filterStatus");
    this.sortBySelect = document.getElementById("sortBy");
    this.sortOrderBtn = document.getElementById("sortOrder");
    this.subtaskInput = document.getElementById("subtaskInput");
    this.addSubtaskBtn = document.getElementById("addSubtask");
    this.subtaskList = document.getElementById("subtaskList");
    this.checkOverdueTasks();
    this.initializeNotifications();
  }

  addEventListeners() {
    this.form.addEventListener("submit", (e) => this.handleSubmit(e));
    this.searchInput.addEventListener("input", () => this.renderTodos());
    this.filterStatus.addEventListener("change", () => this.renderTodos());
    this.sortBySelect.addEventListener("change", () => this.renderTodos());
    this.sortOrderBtn.addEventListener("click", () => this.toggleSortOrder());
    this.addSubtaskBtn.addEventListener("click", () => this.addSubtask());
  }

  handleSubmit(e) {
    e.preventDefault();

    const todoData = {
      text: this.todoInput.value,
      completed: false,
      createdAt: new Date().toISOString(),
      priority: document.getElementById("priority").value,
      category: document.getElementById("category").value,
      dueDate: document.getElementById("dueDate").value,
      reminder: document.getElementById("reminder").value,
      tags: document
        .getElementById("tags")
        .value.split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      subtasks: [...this.subtasks],
      notes: document.getElementById("notes").value,
      archived: false,
      reminderShown: false,
      overdueNotified: false,
    };

    if (this.editingTodoId) {
      this.todos = this.todos.map((todo) =>
        todo.id === this.editingTodoId ? { ...todo, ...todoData } : todo
      );
      this.editingTodoId = null;

      const submitBtn = this.form.querySelector("button[type='submit']");
      submitBtn.textContent = "Add Task";
    } else {
      const newTodo = {
        id: Date.now(),
        ...todoData,
      };
      this.todos.push(newTodo);
    }

    this.saveTodos();
    this.resetForm();
    this.renderTodos();
    this.checkReminders(new Date());
  }

  resetForm() {
    this.form.reset();
    this.subtasks = [];
    this.subtaskList.innerHTML = "";
  }

  addSubtask() {
    const text = this.subtaskInput.value.trim();
    if (!text) return;

    const subtask = {
      id: Date.now(),
      text,
      completed: false,
    };

    this.subtasks.push(subtask);
    this.subtaskInput.value = "";
    this.renderSubtasks();
  }

  renderSubtasks() {
    this.subtaskList.innerHTML = this.subtasks
      .map(
        (subtask) => `
            <div class="subtask">
                • ${subtask.text}
            </div>
        `
      )
      .join("");
  }

  toggleTodo(id) {
    this.todos = this.todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    this.saveTodos();
    this.renderTodos();
  }

  deleteTodo(id) {
    this.todos = this.todos.filter((todo) => todo.id !== id);
    this.saveTodos();
    this.renderTodos();
  }

  toggleSortOrder() {
    this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc";
    this.sortOrderBtn.textContent = this.sortOrder === "asc" ? "↑" : "↓";
    this.renderTodos();
  }

  sortTodos(todos) {
    const sortBy = this.sortBySelect.value;
    return todos.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "dueDate":
          comparison = new Date(a.dueDate || "") - new Date(b.dueDate || "");
          break;
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
          break;
        case "created":
          comparison = new Date(a.createdAt) - new Date(b.createdAt);
          break;
      }
      return this.sortOrder === "asc" ? comparison : -comparison;
    });
  }

  filterTodos() {
    const searchTerm = this.searchInput.value.toLowerCase();
    const status = this.filterStatus.value;

    return this.todos.filter((todo) => {
      const matchesSearch = todo.text.toLowerCase().includes(searchTerm);
      const matchesStatus =
        status === "all" ||
        (status === "active" && !todo.completed) ||
        (status === "completed" && todo.completed) ||
        (status === "archived" && todo.archived) ||
        (status === "overdue" && new Date(todo.dueDate) < new Date());

      return matchesSearch && matchesStatus;
    });
  }

  renderTodos() {
    const filteredTodos = this.filterTodos();
    const sortedTodos = this.sortTodos(filteredTodos);

    this.todoList.innerHTML = sortedTodos
      .map(
        (todo) => `
            <div class="todo-item ${
              todo.completed ? "completed" : ""
            }" data-id="${todo.id}">
                <input 
                    type="checkbox" 
                    ${todo.completed ? "checked" : ""} 
                    onclick="app.toggleTodo(${todo.id})"
                    class="todo-checkbox"
                >
                <div class="todo-content">
                    <div class="todo-header">
                        <div class="todo-text">${todo.text}</div>
                        <span class="tag priority-${todo.priority}">${
          todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)
        } Priority</span>
                    </div>
                    <div class="metadata">
                        ${
                          todo.category
                            ? `
                            <span class="tag category-${todo.category.toLowerCase()}">${
                                todo.category
                              }</span>
                        `
                            : ""
                        }
                        ${
                          todo.dueDate
                            ? `
                            <span class="due-date ${
                              this.isOverdue(todo.dueDate) ? "overdue" : ""
                            }">
                                ${
                                  this.isOverdue(todo.dueDate) ? "⚠️" : "📅"
                                } ${this.formatDate(todo.dueDate)}
                            </span>
                        `
                            : ""
                        }
                        ${
                          todo.reminder
                            ? `
                            <span class="tag reminder-tag ${
                              new Date(todo.reminder) <= new Date()
                                ? "reminder-passed"
                                : ""
                            }">
                                🔔 ${this.formatReminderTime(todo.reminder)}
                            </span>
                        `
                            : ""
                        }
                    </div>
                    ${
                      todo.tags.length
                        ? `
                        <div class="tags">
                            ${todo.tags
                              .map((tag) => `<span class="tag">#${tag}</span>`)
                              .join("")}
                        </div>
                    `
                        : ""
                    }
                    ${
                      todo.subtasks.length
                        ? `
                        <div class="subtasks">
                            ${todo.subtasks
                              .map(
                                (subtask) => `
                                <div class="subtask">
                                    <span class="subtask-bullet">•</span>
                                    <span class="subtask-text">${subtask.text}</span>
                                </div>
                            `
                              )
                              .join("")}
                        </div>
                    `
                        : ""
                    }
                    ${
                      todo.notes
                        ? `
                        <div class="notes">
                            <p>${todo.notes}</p>
                        </div>
                    `
                        : ""
                    }
                </div>
                <div class="todo-actions">
                    <button class="btn-secondary edit-btn" onclick="app.editTodo(${
                      todo.id
                    })">
                        ✏️
                    </button>
                    <button class="btn-secondary delete-btn" onclick="app.deleteTodo(${
                      todo.id
                    })">
                        🗑️
                    </button>
                </div>
            </div>
        `
      )
      .join("");
  }

  saveTodos() {
    localStorage.setItem("todos", JSON.stringify(this.todos));
  }

  isOverdue(dueDate) {
    return new Date(dueDate) < new Date();
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Due Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Due Tomorrow";
    }
    return `Due: ${date.toLocaleDateString()}`;
  }

  initializeNotifications() {
    if (
      Notification.permission !== "granted" &&
      Notification.permission !== "denied"
    ) {
      Notification.requestPermission();
    }

    if (this.reminderCheckInterval) {
      clearInterval(this.reminderCheckInterval);
    }

    this.reminderCheckInterval = setInterval(() => {
      const now = new Date();
      this.checkReminders(now);
      this.lastCheckTime = now;
    }, 30000);

    this.checkReminders(new Date());
  }

  checkOverdueTasks() {
    const overdueTasks = this.todos.filter(
      (todo) => !todo.completed && todo.dueDate && this.isOverdue(todo.dueDate)
    );

    if (overdueTasks.length > 0) {
      this.showNotification(
        "Overdue Tasks",
        `You have ${overdueTasks.length} overdue task(s)`,
        true
      );
    }
  }

  checkReminders(now) {
    this.todos.forEach((todo) => {
      if (todo.reminder && !todo.completed && !todo.reminderShown) {
        const reminderTime = new Date(todo.reminder);

        if (reminderTime >= this.lastCheckTime && reminderTime <= now) {
          this.showNotification(
            "Task Reminder",
            `Time to do: ${todo.text}`,
            true,
            todo.id
          );

          todo.reminderShown = true;
          this.saveTodos();
        }
      }
    });
  }

  showNotification(title, body, isUrgent = false, todoId = null) {
    if (Notification.permission === "granted") {
      const notification = new Notification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        vibrate: isUrgent ? [200, 100, 200] : [],
        tag: `todo-notification-${todoId || "general"}`,
        actions: todoId
          ? [
              { action: "snooze", title: "Snooze 5m" },
              { action: "complete", title: "Mark Complete" },
            ]
          : [],
      });

      notification.addEventListener("click", () => {
        window.focus();
        if (todoId) {
          document.querySelector(`[data-id="${todoId}"]`)?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      });

      if (isUrgent && todoId) {
        this.startAlarm(todoId);
      }
    } else {
      const toast = document.createElement("div");
      toast.className = `toast ${isUrgent ? "toast-urgent" : ""}`;
      toast.innerHTML = `
        <div class="toast-header">
            <strong>${title}</strong>
            <div class="toast-actions">
                ${
                  todoId
                    ? `
                    <button onclick="app.snoozeAlarm(${todoId})">Snooze 5m</button>
                    <button onclick="app.toggleTodo(${todoId}); this.parentElement.parentElement.parentElement.remove();">Complete</button>
                `
                    : ""
                }
                <button onclick="app.stopAlarm(${todoId}); this.parentElement.parentElement.parentElement.remove();">×</button>
            </div>
        </div>
        <p>${body}</p>
      `;
      document.body.appendChild(toast);

      if (isUrgent && todoId) {
        this.startAlarm(todoId);
      }

      setTimeout(() => {
        toast.remove();
        this.stopAlarm(todoId);
      }, 5 * 60 * 1000);
    }
  }

  formatReminderTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === now.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  editTodo(id) {
    const todo = this.todos.find((todo) => todo.id === id);
    if (!todo) return;

    this.todoInput.value = todo.text;
    document.getElementById("priority").value = todo.priority;
    document.getElementById("category").value = todo.category;
    document.getElementById("dueDate").value = todo.dueDate;
    document.getElementById("reminder").value = todo.reminder;
    document.getElementById("tags").value = todo.tags.join(", ");
    document.getElementById("notes").value = todo.notes;

    this.subtasks = [...todo.subtasks];
    this.renderSubtasks();

    const submitBtn = this.form.querySelector("button[type='submit']");
    submitBtn.textContent = "Update Task";

    this.editingTodoId = id;

    this.form.scrollIntoView({ behavior: "smooth" });
  }

  startAlarm(todoId) {
    if (this.activeAlarms.has(todoId)) return;

    const alarmInterval = setInterval(() => {
      this.notificationSound
        .play()
        .catch((err) => console.log("Audio playback failed:", err));
    }, 3000);

    const timeoutId = setTimeout(() => {
      this.stopAlarm(todoId);
    }, 5 * 60 * 1000);

    this.activeAlarms.set(todoId, {
      interval: alarmInterval,
      timeout: timeoutId,
    });
  }

  stopAlarm(todoId) {
    const alarm = this.activeAlarms.get(todoId);
    if (alarm) {
      clearInterval(alarm.interval);
      clearTimeout(alarm.timeout);
      this.activeAlarms.delete(todoId);
    }
  }

  snoozeAlarm(todoId) {
    this.stopAlarm(todoId);

    this.todos = this.todos.map((todo) => {
      if (todo.id === todoId) {
        const newReminder = new Date(Date.now() + this.snoozeTime * 60000);
        return {
          ...todo,
          reminder: newReminder.toISOString(),
          reminderShown: false,
        };
      }
      return todo;
    });

    this.saveTodos();
    this.renderTodos();

    this.showNotification(
      "Reminder Snoozed",
      `Reminder snoozed for ${this.snoozeTime} minutes`,
      false
    );
  }
}

const app = new TodoApp();
