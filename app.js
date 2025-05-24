// Variáveis globais
let timer;
let absoluteStartTime; // Guarda o timestamp do início absoluto da tarefa atual
let referenceTime; // Guarda o timestamp de referência para cálculo (início ou último resume)
let pausedTime = 0; // Tempo acumulado enquanto pausado (em ms)
let isRunning = false;
let isPaused = false;
let tasks = []; // Array para armazenar tarefas concluídas

// Chave para localStorage
const TIMER_STATE_KEY = "timerState";

// Elementos DOM
const timerDisplay = document.getElementById("timer");
const startTimeDisplay = document.getElementById("start-time");
const endTimeDisplay = document.getElementById("end-time");
const currentTaskName = document.getElementById("current-task-name");
const predefinedTasksSelect = document.getElementById("predefined-tasks");
const customTaskInput = document.getElementById("custom-task");
const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const resumeBtn = document.getElementById("resume-btn");
const stopBtn = document.getElementById("stop-btn");
const timerContainer = document.querySelector(".timer-display");

// Modal elements
const renameTaskModalEl = document.getElementById("rename-task-modal");
const renameTaskModal = new bootstrap.Modal(renameTaskModalEl);
const finalTaskNameInput = document.getElementById("final-task-name");
const modalStartTime = document.getElementById("modal-start-time");
const modalEndTime = document.getElementById("modal-end-time");
const modalDuration = document.getElementById("modal-duration");
const saveTaskBtn = document.getElementById("save-task-btn");

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM fully loaded and parsed");
    loadTasks(); // Carregar tarefas concluídas
    restoreTimerState(); // Restaurar estado do cronômetro, se houver

    try {
        document.getElementById("filter-date").valueAsDate = new Date();
    } catch (e) {
        console.error("Error setting initial filter date:", e);
        document.getElementById("filter-date").value = new Date().toISOString().split("T")[0];
    }

    setupEventListeners();
});

// Configuração de eventos
function setupEventListeners() {
    console.log("Setting up event listeners");
    startBtn.addEventListener("click", startTimer);
    pauseBtn.addEventListener("click", pauseTimer);
    resumeBtn.addEventListener("click", resumeTimer);
    stopBtn.addEventListener("click", stopTimer);
    predefinedTasksSelect.addEventListener("change", updateTaskName);
    customTaskInput.addEventListener("input", updateTaskName);
    // saveTaskBtn listener is now set dynamically in stopTimer

    if (!renameTaskModal) {
        console.warn("Modal instance was not created, attempting again.");
        try {
            renameTaskModal = new bootstrap.Modal(renameTaskModalEl);
        } catch (e) {
            console.error("Failed to create modal instance:", e);
        }
    }

    document.getElementById("apply-filter-btn").addEventListener("click", applyHistoryFilter);
    document.getElementById("generate-report-btn").addEventListener("click", generateReport);
    document.getElementById("export-pdf-btn").addEventListener("click", exportToPDF);
    document.getElementById("report-period").addEventListener("change", function () {
        const customDateRange = document.querySelector(".custom-date-range");
        customDateRange.style.display = this.value === "custom" ? "flex" : "none";
    });

    // Salva o estado ANTES da página descarregar
    window.addEventListener("beforeunload", saveCurrentTimerState);

    console.log("Event listeners setup complete");
}

// --- Funções de Persistência CORRIGIDAS --- 

// Salva o estado atual (chamado em beforeunload)
function saveCurrentTimerState() {
    if (!isRunning) {
        // Se não está rodando, não salva (ou já foi limpo por stopTimer)
        return;
    }

    // Calcula o tempo acumulado até o momento atual
    let currentTotalPausedTime = pausedTime;
    if (!isPaused) {
        // Se estava rodando, adiciona o tempo desde a última referência
        currentTotalPausedTime += (Date.now() - referenceTime);
    }

    const state = {
        absoluteStartTime: absoluteStartTime, // Timestamp do início real
        referenceTime: Date.now(), // Timestamp de quando o estado foi salvo
        pausedTime: currentTotalPausedTime, // Tempo total acumulado (incluindo o último trecho rodando)
        isRunning: isRunning,
        isPaused: isPaused, // Salva o estado real (rodando ou pausado)
        taskName: currentTaskName.textContent
    };

    try {
        localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));
        console.log("Timer state saved on beforeunload:", state);
    } catch (e) {
        console.error("Error saving timer state to localStorage:", e);
    }
}

// Salva o estado (chamado em start, pause, resume)
function saveTimerState() {
    if (!isRunning) {
        return; // Não salva se não estiver rodando
    }
    const state = {
        absoluteStartTime: absoluteStartTime,
        referenceTime: referenceTime, // Timestamp da última ação (start, resume, pause)
        pausedTime: pausedTime, // Tempo acumulado *enquanto* pausado
        isRunning: isRunning,
        isPaused: isPaused,
        taskName: currentTaskName.textContent
    };
    try {
        localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));
        console.log("Timer state saved:", state);
    } catch (e) {
        console.error("Error saving timer state to localStorage:", e);
    }
}

// Restaura o estado ao carregar a página
function restoreTimerState() {
    console.log("Attempting to restore timer state...");
    let state;
    try {
        const storedState = localStorage.getItem(TIMER_STATE_KEY);
        if (!storedState) {
            console.log("No saved timer state found.");
            return;
        }
        state = JSON.parse(storedState);
        console.log("Saved state found:", state);

        // Validação básica do estado carregado
        if (typeof state.absoluteStartTime !== 'number' || 
            typeof state.pausedTime !== 'number' || 
            typeof state.isRunning !== 'boolean' ||
            typeof state.isPaused !== 'boolean' ||
            typeof state.referenceTime !== 'number') {
            console.error("Invalid timer state found in localStorage. Clearing.", state);
            clearTimerState();
            return;
        }

    } catch (e) {
        console.error("Error reading or parsing timer state from localStorage:", e);
        clearTimerState(); // Limpa estado inválido
        return;
    }

    if (state.isRunning) {
        // Restaura variáveis globais
        absoluteStartTime = state.absoluteStartTime;
        pausedTime = state.pausedTime; // Tempo acumulado até o save
        isRunning = state.isRunning; // true
        isPaused = state.isPaused; // Estado real (true ou false)
        
        // Restaura UI básica
        currentTaskName.textContent = state.taskName;
        startTimeDisplay.textContent = formatTime(new Date(absoluteStartTime));
        endTimeDisplay.textContent = "--:--:--";
        syncTaskSelectionUI(state.taskName);

        // Ajusta o tempo e o estado com base no tempo offline
        const timeElapsedSinceSave = Date.now() - state.referenceTime;
        console.log(`Time elapsed since save: ${timeElapsedSinceSave} ms`);

        if (isPaused) {
            // Se estava PAUSADO quando salvou, o tempo acumulado é o que foi salvo.
            // Não precisa adicionar timeElapsedSinceSave.
            referenceTime = state.referenceTime; // Mantém a referência de quando pausou/salvou
            timerDisplay.textContent = formatDuration(pausedTime);
            // Configura botões para estado pausado
            pauseBtn.disabled = true;
            resumeBtn.disabled = false;
            stopBtn.disabled = false;
            startBtn.disabled = true;
            timerContainer.classList.add("timer-paused");
            timerContainer.classList.remove("timer-running");
            console.log("Timer restored to PAUSED state.");

        } else {
            // Se estava RODANDO quando salvou, adiciona o tempo offline ao tempo acumulado.
            pausedTime += timeElapsedSinceSave; 
            referenceTime = Date.now(); // Define a nova referência como agora
            timerDisplay.textContent = formatDuration(pausedTime);
            // Configura botões para estado rodando
            pauseBtn.disabled = false;
            resumeBtn.disabled = true;
            stopBtn.disabled = false;
            startBtn.disabled = true;
            timerContainer.classList.add("timer-running");
            timerContainer.classList.remove("timer-paused");

            // Reinicia o intervalo do timer
            if (timer) clearInterval(timer);
            timer = setInterval(updateTimerDisplay, 1000);
            console.log("Timer restored to RUNNING state. Interval restarted.");
        }
    } else {
        // Se o estado salvo indicava que não estava rodando, limpa.
        console.log("Saved state indicates timer was not running. Clearing state.");
        clearTimerState();
    }
}

function clearTimerState() {
    try {
        localStorage.removeItem(TIMER_STATE_KEY);
        console.log("Timer state cleared from localStorage.");
    } catch (e) {
        console.error("Error clearing timer state from localStorage:", e);
    }
}

// --- Funções do Cronômetro Modificadas ---

function startTimer() {
    console.log("startTimer called");
    if (isRunning) return;

    const taskName = getSelectedTaskName();
    if (!taskName) {
        alert("Por favor, selecione ou digite o nome da tarefa antes de iniciar o cronômetro.");
        return;
    }

    const now = Date.now();
    absoluteStartTime = now;
    referenceTime = now;
    pausedTime = 0;
    isRunning = true;
    isPaused = false;
    console.log("Timer started. Absolute Start:", new Date(absoluteStartTime));

    updateTimerDisplay();
    startTimeDisplay.textContent = formatTime(new Date(absoluteStartTime));
    endTimeDisplay.textContent = "--:--:--";
    currentTaskName.textContent = taskName;

    startBtn.disabled = true;
    pauseBtn.disabled = false;
    resumeBtn.disabled = true;
    stopBtn.disabled = false;
    timerContainer.classList.add("timer-running");
    timerContainer.classList.remove("timer-paused");

    if (timer) clearInterval(timer);
    timer = setInterval(updateTimerDisplay, 1000);
    console.log("Timer interval set");

    saveTimerState();
}

function pauseTimer() {
    console.log("pauseTimer called");
    if (!isRunning || isPaused) return;

    clearInterval(timer);
    const now = Date.now();
    pausedTime += (now - referenceTime); // Acumula tempo desde a última referência (start ou resume)
    isPaused = true;
    referenceTime = now; // Atualiza referência para o momento da pausa
    console.log("Timer paused. Accumulated pausedTime (ms):", pausedTime);

    pauseBtn.disabled = true;
    resumeBtn.disabled = false;
    timerContainer.classList.remove("timer-running");
    timerContainer.classList.add("timer-paused");

    saveTimerState(); // Salva o estado pausado
}

function resumeTimer() {
    console.log("resumeTimer called");
    if (!isRunning || !isPaused) return;

    isPaused = false;
    referenceTime = Date.now(); // Define nova referência para o reinício
    console.log("Timer resumed. New referenceTime:", new Date(referenceTime));

    pauseBtn.disabled = false;
    resumeBtn.disabled = true;
    timerContainer.classList.add("timer-running");
    timerContainer.classList.remove("timer-paused");

    if (timer) clearInterval(timer);
    timer = setInterval(updateTimerDisplay, 1000);
    console.log("Timer interval restarted after resume");

    saveTimerState(); // Salva o estado de retomada
}

// stopTimer CORRIGIDO para garantir que absoluteStartTime seja válido
function stopTimer() {
    console.log("stopTimer called");
    if (!isRunning) {
        console.warn("stopTimer called while not running");
        return;
    }

    // Garante que temos um absoluteStartTime válido (deveria ter sido restaurado ou definido em startTimer)
    if (typeof absoluteStartTime !== 'number' || isNaN(absoluteStartTime)) {
        console.error("stopTimer critical error: absoluteStartTime is invalid!", absoluteStartTime);
        alert("Erro crítico: O horário de início da tarefa é inválido. Não é possível parar ou salvar.");
        // Tenta resetar para evitar mais problemas
        resetUIAndState(); 
        return;
    }

    clearInterval(timer);
    const now = Date.now(); // Timestamp final
    let totalTimeMs;

    if (isPaused) {
        totalTimeMs = pausedTime; // Tempo acumulado até a pausa
    } else {
        // Tempo acumulado + tempo desde a última referência (start/resume)
        totalTimeMs = pausedTime + (now - referenceTime);
    }
    console.log("Timer stopped. Absolute Start:", new Date(absoluteStartTime), "End:", new Date(now), "Total elapsed time (ms):", totalTimeMs);

    // Atualiza UI
    endTimeDisplay.textContent = formatTime(new Date(now));

    // Prepara dados para o modal
    const taskName = currentTaskName.textContent;
    finalTaskNameInput.value = taskName;
    modalStartTime.textContent = formatTime(new Date(absoluteStartTime));
    modalEndTime.textContent = formatTime(new Date(now));
    modalDuration.textContent = formatDuration(totalTimeMs);
    console.log("Modal data prepared:", { taskName, startTime: modalStartTime.textContent, endTime: modalEndTime.textContent, duration: modalDuration.textContent });

    // Limpa estado persistido ANTES de mostrar o modal
    clearTimerState();

    // Resetar estado lógico (isRunning, isPaused) ANTES do modal
    const savedAbsoluteStartTime = absoluteStartTime; // Salva antes de resetar
    isRunning = false;
    isPaused = false;
    pausedTime = 0;
    referenceTime = undefined;
    absoluteStartTime = undefined; // Limpa aqui, mas passamos o valor salvo para saveTask

    // Atualiza botões para estado parado
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    stopBtn.disabled = true;
    timerContainer.classList.remove("timer-running", "timer-paused");

    // Mostrar modal
    if (renameTaskModal) {
        // Remove listener antigo para evitar duplicação
        saveTaskBtn.onclick = null; 
        renameTaskModalEl.removeEventListener('hidden.bs.modal', handleModalClose);

        // Passa os dados necessários (timestamps numéricos) para saveTask
        saveTaskBtn.onclick = () => saveTask(taskName, savedAbsoluteStartTime, now, totalTimeMs);
        // Limpa estado se o modal for fechado sem salvar
        renameTaskModalEl.addEventListener('hidden.bs.modal', handleModalClose, { once: true });
        renameTaskModal.show();
        console.log("Rename task modal shown");
    } else {
        console.error("Cannot show modal, instance is not available.");
        alert("Erro ao abrir a janela para salvar a tarefa.");
        resetUIAndState(); // Reseta a UI se o modal falhar
    }
}

// Chamado quando o modal é fechado (sem clicar em salvar)
function handleModalClose(event) {
    // O event.target no 'hidden.bs.modal' é o próprio modal, não o botão clicado.
    // A lógica de só resetar se não foi 'salvar' é feita pelo fato de que
    // saveTaskBtn.onclick chama saveTask, que por sua vez chama resetUIAndState.
    // Se chegou aqui, significa que saveTask não foi chamado.
    console.log("Modal closed without saving. Resetting UI.");
    resetUIAndState();
}

function updateTimerDisplay() {
    let elapsedTime;
    if (!isRunning) {
        elapsedTime = 0;
    } else if (isPaused) {
        elapsedTime = pausedTime;
    } else {
        // Rodando: tempo acumulado + tempo desde a última referência
        elapsedTime = pausedTime + (Date.now() - referenceTime);
    }
    timerDisplay.textContent = formatDuration(elapsedTime);
}

// --- Funções Auxiliares Modificadas ---

function resetUIAndState() {
    console.log("Resetting UI and state");
    // Limpa inputs e displays
    predefinedTasksSelect.value = "";
    customTaskInput.value = "";
    currentTaskName.textContent = "Nenhuma tarefa selecionada";
    timerDisplay.textContent = "00:00:00";
    startTimeDisplay.textContent = "--:--:--";
    endTimeDisplay.textContent = "--:--:--";

    // Resetar variáveis de estado
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    absoluteStartTime = undefined;
    referenceTime = undefined;
    pausedTime = 0;
    isRunning = false;
    isPaused = false;

    // Resetar botões
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    stopBtn.disabled = true;
    timerContainer.classList.remove("timer-running", "timer-paused");

    // Limpa estado do localStorage (segurança extra)
    clearTimerState();
    console.log("UI and state reset complete");
}

function syncTaskSelectionUI(taskName) {
    if (!taskName) return;
    const predefinedOption = Array.from(predefinedTasksSelect.options).find(opt => opt.value === taskName);
    if (predefinedOption) {
        predefinedTasksSelect.value = taskName;
        customTaskInput.value = "";
    } else {
        customTaskInput.value = taskName;
        predefinedTasksSelect.value = "";
    }
}

// --- Funções de Armazenamento de Tarefas Concluídas (Modificadas) ---

// saveTask CORRIGIDO para validar timestamps recebidos
function saveTask(originalTaskName, taskStartTimeStamp, taskEndTimeStamp, taskDurationMs) {
    console.log("saveTask called with:", { originalTaskName, taskStartTimeStamp, taskEndTimeStamp, taskDurationMs });
    const finalTaskName = finalTaskNameInput.value.trim();
    if (!finalTaskName) {
        alert("Por favor, insira um nome para a tarefa.");
        console.warn("saveTask aborted: No final task name provided.");
        return; // Permite corrigir no modal
    }

    // Validação crucial dos timestamps recebidos de stopTimer
    if (typeof taskStartTimeStamp !== 'number' || isNaN(taskStartTimeStamp) || 
        typeof taskEndTimeStamp !== 'number' || isNaN(taskEndTimeStamp)) {
        console.error("saveTask critical error: Invalid start or end timestamp provided.", { taskStartTimeStamp, taskEndTimeStamp });
        alert("Erro crítico: Horário de início ou fim inválido ao tentar salvar. Não foi possível salvar.");
        renameTaskModal.hide(); // Esconde o modal em caso de erro grave
        // resetUIAndState() será chamado pelo hidden.bs.modal listener
        return;
    }

    const taskStartTimeDate = new Date(taskStartTimeStamp);
    const taskEndTimeDate = new Date(taskEndTimeStamp);

    console.log("Creating task object with validated dates:", { 
        name: finalTaskName, 
        startTime: taskStartTimeDate, 
        endTime: taskEndTimeDate, 
        duration: formatDuration(taskDurationMs), 
        date: formatDate(taskStartTimeDate) 
    });

    const task = {
        id: Date.now(),
        name: finalTaskName,
        startTime: taskStartTimeDate.toISOString(), // Salva como ISO string
        endTime: taskEndTimeDate.toISOString(), // Salva como ISO string
        duration: formatDuration(taskDurationMs),
        date: formatDate(taskStartTimeDate)
    };
    console.log("Task object created:", task);

    try {
        tasks.push(task);
        saveTasksToLocalStorage();
        console.log("Task saved to list and localStorage.");
    } catch (error) {
        console.error("Error saving task list:", error);
        alert("Erro ao salvar a lista de tarefas.");
        renameTaskModal.hide();
        // resetUIAndState() será chamado pelo hidden.bs.modal listener
        return;
    }

    try {
        updateHistoryTable();
        console.log("History table updated.");
    } catch (error) {
        console.error("Error updating history table:", error);
        // Não impede o fluxo principal, mas informa o usuário
        alert("Erro ao atualizar a tabela de histórico, mas a tarefa foi salva.");
    }

    renameTaskModal.hide();
    // resetUIAndState() será chamado pelo hidden.bs.modal listener
    console.log("saveTask finished successfully.");
}

function saveTasksToLocalStorage() {
    try {
        localStorage.setItem("tasks", JSON.stringify(tasks));
        console.log("Completed tasks saved to localStorage");
    } catch (e) {
        console.error("Error saving completed tasks to localStorage:", e);
        alert("Não foi possível salvar o histórico de tarefas. O armazenamento local pode estar cheio ou indisponível.");
    }
}

function loadTasks() {
    console.log("loadTasks started");
    const storedTasks = localStorage.getItem("tasks");
    if (storedTasks) {
        try {
            const parsedTasks = JSON.parse(storedTasks);
            tasks = parsedTasks.map(task => {
                const startTime = task.startTime ? new Date(task.startTime) : null;
                const endTime = task.endTime ? new Date(task.endTime) : null;
                if (!startTime || isNaN(startTime) || !endTime || isNaN(endTime)) {
                    console.warn("Invalid date found in stored task, skipping task:", task);
                    return null;
                }
                // Retorna a tarefa com datas ISO string como no localStorage
                return { ...task, startTime: task.startTime, endTime: task.endTime };
            }).filter(task => task !== null);

            console.log("Tasks loaded and validated from localStorage:", tasks);
            updateHistoryTable();
        } catch (e) {
            console.error("Error parsing tasks from localStorage:", e);
            tasks = [];
            localStorage.removeItem("tasks");
        }
    } else {
        console.log("No completed tasks found in localStorage.");
        tasks = [];
    }
}

// --- Funções de Histórico e Relatório (sem modificações relevantes) ---

function updateHistoryTable(filteredTasks = tasks) {
    console.log("Updating history table with tasks:", filteredTasks);
    const tableBody = document.getElementById("history-table-body");
    if (!tableBody) {
        console.error("History table body not found!");
        return;
    }
    tableBody.innerHTML = "";

    if (filteredTasks.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma tarefa encontrada.</td></tr>';
        return;
    }

    filteredTasks.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    filteredTasks.forEach(task => {
        const row = tableBody.insertRow();
        const startTimeDate = new Date(task.startTime);
        const endTimeDate = new Date(task.endTime);

        row.innerHTML = `
            <td>${escapeHTML(task.name)}</td>
            <td>${formatTime(startTimeDate)}</td>
            <td>${formatTime(endTimeDate)}</td>
            <td>${task.duration}</td>
            <td>${task.date}</td>
        `;
    });
    console.log("History table updated successfully.");
}

function applyHistoryFilter() {
    console.log("Applying history filter...");
    const filterType = document.getElementById("filter-type").value;
    const filterDateValue = document.getElementById("filter-date").value;
    if (!filterDateValue) {
        alert("Por favor, selecione uma data para filtrar.");
        return;
    }
    const filterDate = new Date(filterDateValue + "T00:00:00");

    console.log(`Filtering by type: ${filterType}, date: ${filterDate.toDateString()}`);

    const filteredTasks = tasks.filter(task => {
        const taskStartDate = new Date(task.startTime);
        taskStartDate.setHours(0, 0, 0, 0);

        if (filterType === "day") {
            return taskStartDate.getTime() === filterDate.getTime();
        } else if (filterType === "week") {
            const weekStart = new Date(filterDate);
            weekStart.setDate(filterDate.getDate() - filterDate.getDay());
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            return taskStartDate >= weekStart && taskStartDate <= weekEnd;
        } else if (filterType === "month") {
            return taskStartDate.getFullYear() === filterDate.getFullYear() &&
                   taskStartDate.getMonth() === filterDate.getMonth();
        }
        return false;
    });

    console.log("Filtered tasks:", filteredTasks);
    updateHistoryTable(filteredTasks);
}

// --- Funções Utilitárias --- 

function formatTime(date) {
    if (!date || !(date instanceof Date) || isNaN(date)) {
        return "--:--:--";
    }
    try {
        return date.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
        console.error("Error formatting time:", e, "Date:", date);
        return "Erro";
    }
}

function formatDuration(ms) {
    if (typeof ms !== "number" || ms < 0 || isNaN(ms)) {
        ms = 0;
    }
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [
        hours.toString().padStart(2, "0"),
        minutes.toString().padStart(2, "0"),
        seconds.toString().padStart(2, "0"),
    ].join(":");
}

function formatDate(date) {
    if (!date || !(date instanceof Date) || isNaN(date)) {
        return "Data inválida";
    }
    try {
        return date.toLocaleDateString("pt-BR");
    } catch (e) {
        console.error("Error formatting date:", e, "Date:", date);
        return "Erro";
    }
}

function getSelectedTaskName() {
    const predefinedTask = predefinedTasksSelect.value;
    const customTask = customTaskInput.value.trim();
    return customTask || predefinedTask;
}

function updateTaskName() {
    if (isRunning) return;
    const taskName = getSelectedTaskName();
    currentTaskName.textContent = taskName || "Nenhuma tarefa selecionada";
    if (this === predefinedTasksSelect && this.value) {
        customTaskInput.value = "";
    } else if (this === customTaskInput && this.value) {
        predefinedTasksSelect.value = "";
    }
}

function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>"]/g, function (s) { // Removed ' and / for simplicity, less critical here
        const entityMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;'
        };
        return entityMap[s];
    });
}

// Funções de relatório e PDF (presumidas existentes)
if (typeof generateReport === 'undefined') {
    window.generateReport = function() {
        console.warn('generateReport function is not defined.');
        alert('Funcionalidade de gerar relatório não implementada.');
    }
}
if (typeof exportToPDF === 'undefined') {
    window.exportToPDF = function() {
        console.warn('exportToPDF function is not defined.');
        alert('Funcionalidade de exportar PDF não implementada.');
    }
}

