// Subagent Command Center - Enhanced with API
class CommandCenter {
    constructor() {
        console.log('Command Center: Initializing...');
        this.token = localStorage.getItem('cc_token');
        this.username = localStorage.getItem('cc_user');

        if (!this.token) {
            window.location.href = '/login.html';
        }

        // Static agents for now
        this.agents = [
            { id: 'chuck', name: 'Chuck', role: 'CEO', status: 'online', avatar: 'img/chuck.jpeg' },
            { id: 'sam', name: 'Sam', role: 'Chief of Staff', status: 'active', avatar: 'img/samantha.png' },
            { id: 'jeff', name: 'Jeff', role: 'Market Intelligence', status: 'standby', avatar: 'img/jeff-avatar.png' },
            { id: 'barbara', name: 'Barbara', role: 'Writing Specialist', status: 'standby', avatar: 'img/barbara-avatar.png' }
        ];

        this.tasks = [];
        this.activityLog = [];

        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadData();
        console.log('Command Center: Ready');
    }

    setupEventListeners() {
        // Modal logic
        window.onclick = (event) => {
            if (event.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        };

        const taskForm = document.getElementById('task-form');
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createTask(new FormData(taskForm));
            });
        }

        const editTaskForm = document.getElementById('edit-task-form');
        if (editTaskForm) {
            editTaskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateTask(new FormData(editTaskForm));
            });
        }

        const activityForm = document.getElementById('activity-form');
        if (activityForm) {
            activityForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createActivity(new FormData(activityForm));
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('cc_token');
                localStorage.removeItem('cc_user');
                window.location.href = '/login.html';
            });
        }

        // Drag and Drop
        const columns = document.querySelectorAll('.kanban-column');
        columns.forEach(col => {
            col.addEventListener('dragover', e => {
                e.preventDefault();
                col.style.background = '#1f1f35';
            });

            col.addEventListener('dragleave', e => {
                col.style.background = '';
            });

            col.addEventListener('drop', e => {
                e.preventDefault();
                col.style.background = '';
                const taskId = e.dataTransfer.getData('text/plain');
                const newStatus = col.id.replace('col-', '');
                this.updateTaskStatus(taskId, newStatus);
            });
        });
    }

    // --- API Interactions ---

    async apiCall(endpoint, method = 'GET', body = null) {
        const headers = {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };

        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);

        try {
            const res = await fetch(`/api${endpoint}`, options);
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('cc_token');
                window.location.href = '/login.html';
                return null;
            }
            if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
            return method !== 'DELETE' ? await res.json() : true;
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    async loadData() {
        this.tasks = await this.apiCall('/tasks') || [];
        this.activityLog = await this.apiCall('/activity') || [];
        this.renderAll();
    }

    // --- Rendering ---

    renderAll() {
        this.renderAgents();
        this.renderTasks();
        this.renderActivityLog();
        this.populateDropdowns();
    }

    renderAgents() {
        const container = document.getElementById('agents-list');
        if (!container) return;

        container.innerHTML = this.agents.map(agent => `
            <div class="agent-card">
                <img src="${agent.avatar}" class="agent-avatar" alt="${agent.name}">
                <div class="agent-info">
                    <h4>${agent.name}</h4>
                    <p>${agent.role}</p>
                    <span class="agent-status ${agent.status.toLowerCase()}">${agent.status}</span>
                </div>
            </div>
        `).join('');
    }

    renderTasks() {
        ['backlog', 'assigned', 'active', 'complete'].forEach(status => {
            const list = document.getElementById(`list-${status}`);
            const count = document.querySelector(`#col-${status} .count`);
            if (list) list.innerHTML = '';
            if (count) count.innerText = '0';
        });

        this.tasks.forEach(task => {
            const list = document.getElementById(`list-${task.status}`);
            if (list) {
                const card = this.createTaskCard(task);
                list.appendChild(card);
            }
        });

        ['backlog', 'assigned', 'active', 'complete'].forEach(status => {
            const count = document.querySelector(`#col-${status} .count`);
            const num = this.tasks.filter(t => t.status === status).length;
            if (count) count.innerText = num;
        });
    }

    createTaskCard(task) {
        const el = document.createElement('div');
        el.className = 'task-card';
        el.draggable = true;

        const priorityColor = (task.priority === 'urgent' || task.priority === 'high') ? 'priority-high' :
            task.priority === 'medium' ? 'priority-medium' : 'priority-low';

        const agent = this.getAgent(task.assignee);
        const avatarUrl = agent ? agent.avatar : '';
        const agentName = agent ? agent.name : task.assignee;

        // Handle date string cleanup
        let dateDisplay = 'No Date';
        if (task.due_date) {
            const date = new Date(task.due_date);
            dateDisplay = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        } else if (task.dueDate) {
            // Fallback for legacy local data if mixed
            const [y, m, d] = task.dueDate.split('-');
            dateDisplay = new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        }

        el.innerHTML = `
            <div class="task-title">
                <span class="task-priority ${priorityColor}"></span>
                ${task.title}
            </div>
            <div class="task-desc">${task.description}</div>
            <div class="task-meta">
                <div class="task-assignee">
                    ${avatarUrl ? `<img src="${avatarUrl}" class="task-avatar" alt="${agentName}">` : ''}
                    <span>${agentName}</span>
                </div>
                <span>Due: ${dateDisplay}</span>
            </div>
        `;

        el.addEventListener('dragstart', (e) => {
            el.classList.add('dragging');
            e.dataTransfer.setData('text/plain', task.id);
            e.dataTransfer.effectAllowed = 'move';
        });

        el.addEventListener('dragend', () => {
            el.classList.remove('dragging');
        });

        el.onclick = () => {
            this.openEditTaskModal(task);
        };

        return el;
    }

    renderActivityLog() {
        const log = document.getElementById('activity-log');
        if (!log) return;

        const recent = this.activityLog;
        log.innerHTML = recent.map(activity => {
            const date = new Date(activity.timestamp);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `
            <div class="activity-item">
                <div class="activity-time">${timeStr}</div>
                <div class="activity-content">
                    <strong>${this.getAgentName(activity.agent_id || activity.agent)}:</strong> ${activity.action}
                    ${activity.details ? `<br><span style="color: #888;">${activity.details}</span>` : ''}
                </div>
            </div>
            `;
        }).join('');
    }

    populateDropdowns() {
        const selects = document.querySelectorAll('select[name="assignee"], select[name="agent"]');
        selects.forEach(select => {
            const first = select.firstElementChild;
            select.innerHTML = '';
            select.appendChild(first);

            this.agents.forEach(agent => {
                const opt = document.createElement('option');
                opt.value = agent.id;
                opt.textContent = agent.name;
                select.appendChild(opt);
            });
        });
    }

    // --- Actions ---

    async createTask(formData) {
        const taskData = {
            title: formData.get('title'),
            description: formData.get('description'),
            assignee: formData.get('assignee'),
            priority: formData.get('priority'),
            due_date: formData.get('dueDate'),
            status: 'backlog'
        };

        await this.apiCall('/tasks', 'POST', taskData);
        await this.loadData(); // Reload to get ID and consistent state
        this.closeAllModals();
    }

    async createActivity(formData) {
        const activityData = {
            agent_id: formData.get('agent'),
            action: 'Report',
            details: formData.get('description')
        };

        await this.apiCall('/activity', 'POST', activityData);
        await this.loadData();
        this.closeAllModals();
    }

    async updateTask(formData) {
        const taskId = formData.get('taskId');
        const taskData = {
            title: formData.get('title'),
            description: formData.get('description'),
            assignee: formData.get('assignee'),
            priority: formData.get('priority'),
            due_date: formData.get('dueDate'),
            status: 'backlog' // Default, status update is separate usually, but let's keep it safe
        };

        // Find existing status to preserve it
        const existing = this.tasks.find(t => t.id == taskId);
        if (existing) taskData.status = existing.status;

        await this.apiCall(`/tasks/${taskId}`, 'PUT', taskData);
        await this.loadData();
        this.closeAllModals();
    }

    deleteTask() {
        const deleteModal = document.getElementById('delete-confirmation-modal');
        if (deleteModal) {
            deleteModal.style.display = 'flex';
        }
    }

    async confirmTaskDeletion() {
        const form = document.getElementById('edit-task-form');
        const taskId = form.taskId.value;

        if (taskId) {
            const existing = this.tasks.find(t => t.id == taskId);
            // Log deletion before deleting if needed, or backend handles it? 
            // We'll log manually via API for now
            if (existing) {
                await this.apiCall('/activity', 'POST', {
                    agent_id: this.username || 'user',
                    action: 'Terminated Mission',
                    details: existing.title
                });
            }

            await this.apiCall(`/tasks/${taskId}`, 'DELETE');
            await this.loadData();
            this.closeAllModals();
        }
    }

    async updateTaskStatus(taskId, newStatus) {
        const task = this.tasks.find(t => t.id == taskId);
        if (task && task.status !== newStatus) {
            task.status = newStatus; // Optimistic update
            await this.apiCall(`/tasks/${taskId}`, 'PUT', { ...task, due_date: task.due_date });

            // Log move
            await this.apiCall('/activity', 'POST', {
                agent_id: this.username || 'user',
                action: `Moved mission to ${newStatus}`,
                details: task.title
            });

            await this.loadData();
        }
    }

    getAgent(id) {
        return this.agents.find(a => a.id === id);
    }

    getAgentName(id) {
        const agent = this.getAgent(id);
        return agent ? agent.name : id;
    }

    togglePin(elementId) {
        const el = document.getElementById(elementId);
        if (el) el.classList.toggle('pinned');
    }

    openTaskModal() {
        document.getElementById('task-modal').style.display = 'flex';
    }

    openEditTaskModal(task) {
        const modal = document.getElementById('edit-task-modal');
        const form = document.getElementById('edit-task-form');

        form.taskId.value = task.id;
        form.title.value = task.title;
        form.description.value = task.description;
        form.assignee.value = task.assignee;
        form.priority.value = task.priority;

        // Date formatting for input
        if (task.due_date) {
            form.dueDate.value = new Date(task.due_date).toISOString().split('T')[0];
        } else {
            form.dueDate.value = task.dueDate || '';
        }

        modal.style.display = 'flex';
    }

    openActivityModal() {
        document.getElementById('activity-modal').style.display = 'flex';
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        document.querySelectorAll('form').forEach(f => f.reset());
    }
}

window.commandCenter = null;
document.addEventListener('DOMContentLoaded', () => {
    window.commandCenter = new CommandCenter();
});