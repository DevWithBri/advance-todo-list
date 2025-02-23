class TodoApp {
    constructor() {
        this.todos = JSON.parse(localStorage.getItem('todos')) || [];
        this.subtasks = [];
        this.sortOrder = 'asc';
        
        this.initializeElements();
        this.addEventListeners();
        this.renderTodos();
    }

    initializeElements() {
        this.form = document.getElementById('todoForm');
        this.todoInput = document.getElementById('todoInput');
        this.todoList = document.getElementById('todoList');
        this.searchInput = document.getElementById('search');
        this.filterStatus = document.getElementById('filterStatus');
        this.sortBySelect = document.getElementById('sortBy');
        this.sortOrderBtn = document.getElementById('sortOrder');
        this.subtaskInput = document.getElementById('subtaskInput');
        this.addSubtaskBtn = document.getElementById('addSubtask');
        this.subtaskList = document.getElementById('subtaskList');
    }

    addEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.searchInput.addEventListener('input', () => this.renderTodos());
        this.filterStatus.addEventListener('change', () => this.renderTodos());
        this.sortBySelect.addEventListener('change', () => this.renderTodos());
        this.sortOrderBtn.addEventListener('click', () => this.toggleSortOrder());
        this.addSubtaskBtn.addEventListener('click', () => this.addSubtask());
    }

    handleSubmit(e) {
        e.preventDefault();
        
        const todo = {
            id: Date.now(),
            text: this.todoInput.value,
            completed: false,
            createdAt: new Date().toISOString(),
            priority: document.getElementById('priority').value,
            category: document.getElementById('category').value,
            dueDate: document.getElementById('dueDate').value,
            reminder: document.getElementById('reminder').value,
            tags: document.getElementById('tags').value.split(',').map(tag => tag.trim()).filter(Boolean),
            subtasks: [...this.subtasks],
            notes: document.getElementById('notes').value,
            archived: false
        };

        this.todos.push(todo);
        this.saveTodos();
        this.resetForm();
        this.renderTodos();
    }

    resetForm() {
        this.form.reset();
        this.subtasks = [];
        this.subtaskList.innerHTML = '';
    }

    addSubtask() {
        const text = this.subtaskInput.value.trim();
        if (!text) return;

        const subtask = {
            id: Date.now(),
            text,
            completed: false
        };

        this.subtasks.push(subtask);
        this.subtaskInput.value = '';
        this.renderSubtasks();
    }

    renderSubtasks() {
        this.subtaskList.innerHTML = this.subtasks.map(subtask => `
            <div class="subtask">
                • ${subtask.text}
            </div>
        `).join('');
    }

    toggleTodo(id) {
        this.todos = this.todos.map(todo =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
        );
        this.saveTodos();
        this.renderTodos();
    }

    deleteTodo(id) {
        this.todos = this.todos.filter(todo => todo.id !== id);
        this.saveTodos();
        this.renderTodos();
    }

    toggleSortOrder() {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        this.sortOrderBtn.textContent = this.sortOrder === 'asc' ? '↑' : '↓';
        this.renderTodos();
    }

    sortTodos(todos) {
        const sortBy = this.sortBySelect.value;
        return todos.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'dueDate':
                    comparison = new Date(a.dueDate || '') - new Date(b.dueDate || '');
                    break;
                case 'priority':
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
                    break;
                case 'created':
                    comparison = new Date(a.createdAt) - new Date(b.createdAt);
                    break;
            }
            return this.sortOrder === 'asc' ? comparison : -comparison;
        });
    }

    filterTodos() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const status = this.filterStatus.value;

        return this.todos.filter(todo => {
            const matchesSearch = todo.text.toLowerCase().includes(searchTerm);
            const matchesStatus = status === 'all' ||
                (status === 'active' && !todo.completed) ||
                (status === 'completed' && todo.completed) ||
                (status === 'archived' && todo.archived) ||
                (status === 'overdue' && new Date(todo.dueDate) < new Date());

            return matchesSearch && matchesStatus;
        });
    }

    renderTodos() {
        const filteredTodos = this.filterTodos();
        const sortedTodos = this.sortTodos(filteredTodos);

        this.todoList.innerHTML = sortedTodos.map(todo => `
            <div class="todo-item ${todo.completed ? 'completed' : ''}">
                <input type="checkbox" ${todo.completed ? 'checked' : ''} 
                       onclick="app.toggleTodo(${todo.id})">
                <div class="todo-content">
                    <div class="todo-text">${todo.text}</div>
                    <div class="metadata">
                        ${todo.category ? `<span class="tag">${todo.category}</span>` : ''}
                        ${todo.priority ? `<span class="tag">${todo.priority}</span>` : ''}
                        ${todo.dueDate ? `<span>Due: ${new Date(todo.dueDate).toLocaleDateString()}</span>` : ''}
                    </div>
                    ${todo.tags.length ? `
                        <div class="metadata">
                            ${todo.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                    ${todo.subtasks.length ? `
                        <div class="subtasks">
                            ${todo.subtasks.map(subtask => `
                                <div class="subtask">• ${subtask.text}</div>
                            `).join('')}
                        </div>
                    ` : ''}
                    ${todo.notes ? `<div class="metadata">${todo.notes}</div>` : ''}
                </div>
                <button class="btn-secondary" onclick="app.deleteTodo(${todo.id})">🗑️</button>
            </div>
        `).join('');
    }

    saveTodos() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
    }
}

const app = new TodoApp();