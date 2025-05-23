// Variáveis globais
let timer;
let startTime;
let currentEndTime; // Variável para armazenar o objeto Date do fim da tarefa
let pausedTime = 0;
let isRunning = false;
let isPaused = false;
let tasks = [];

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
    // Carregar tarefas do localStorage
    loadTasks();

    // Configurar data atual para os filtros
    try {
        document.getElementById("filter-date").valueAsDate = new Date();
    } catch (e) {
        console.error("Error setting initial filter date:", e);
        document.getElementById("filter-date").value = new Date().toISOString().split("T")[0];
    }

    // Configurar eventos
    setupEventListeners();
});

// Configuração de eventos
function setupEventListeners() {
    console.log("Setting up event listeners");
    // Eventos do cronômetro
    startBtn.addEventListener("click", startTimer);
    pauseBtn.addEventListener("click", pauseTimer);
    resumeBtn.addEventListener("click", resumeTimer);
    stopBtn.addEventListener("click", stopTimer);

    // Eventos de seleção de tarefa
    predefinedTasksSelect.addEventListener("change", updateTaskName);
    customTaskInput.addEventListener("input", updateTaskName);

    // Eventos do modal
    saveTaskBtn.addEventListener("click", saveTask);
    // Garantir que o modal seja reinicializado se houver problemas
    if (!renameTaskModal) {
        console.warn("Modal instance was not created, attempting again.");
        try {
            renameTaskModal = new bootstrap.Modal(renameTaskModalEl);
        } catch (e) {
            console.error("Failed to create modal instance:", e);
        }
    }

    // Eventos de filtro e relatório
    document.getElementById("apply-filter-btn").addEventListener("click", applyHistoryFilter);
    document.getElementById("generate-report-btn").addEventListener("click", generateReport);
    document.getElementById("export-pdf-btn").addEventListener("click", exportToPDF);

    // Evento para mostrar/esconder campos de data personalizada
    document.getElementById("report-period").addEventListener("change", function () {
        const customDateRange = document.querySelector(".custom-date-range");
        if (this.value === "custom") {
            customDateRange.style.display = "flex";
        } else {
            customDateRange.style.display = "none";
        }
    });
    console.log("Event listeners setup complete");
}

// Funções do cronômetro
function startTimer() {
    console.log("startTimer called");
    if (isRunning) {
        console.warn("startTimer called while already running");
        return;
    }

    // Verificar se há uma tarefa selecionada
    const taskName = getSelectedTaskName();
    if (!taskName) {
        alert("Por favor, selecione ou digite o nome da tarefa antes de iniciar o cronômetro.");
        console.warn("startTimer aborted: No task name selected");
        return;
    }

    // Configurar cronômetro
    startTime = new Date();
    pausedTime = 0;
    isRunning = true;
    isPaused = false;
    console.log("Timer started at:", startTime);

    // Atualizar interface
    updateTimerDisplay();
    startTimeDisplay.textContent = formatTime(startTime);
    endTimeDisplay.textContent = "--:--:--";
    currentTaskName.textContent = taskName;

    // Atualizar botões
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    resumeBtn.disabled = true;
    stopBtn.disabled = false;

    // Adicionar classe para animação
    timerContainer.classList.add("timer-running");
    timerContainer.classList.remove("timer-paused");

    // Iniciar timer
    if (timer) clearInterval(timer); // Clear any existing interval
    timer = setInterval(updateTimerDisplay, 1000);
    console.log("Timer interval set");
}

function pauseTimer() {
    console.log("pauseTimer called");
    if (!isRunning || isPaused) {
        console.warn("pauseTimer called in invalid state (not running or already paused)");
        return;
    }

    // Pausar cronômetro
    clearInterval(timer);
    const pauseMoment = new Date();
    pausedTime += (pauseMoment - startTime); // Accumulate elapsed time before pause
    isPaused = true;
    console.log("Timer paused. Accumulated pausedTime (ms):", pausedTime);

    // Atualizar botões
    pauseBtn.disabled = true;
    resumeBtn.disabled = false;

    // Atualizar classe para animação
    timerContainer.classList.remove("timer-running");
    timerContainer.classList.add("timer-paused");
}

function resumeTimer() {
    console.log("resumeTimer called");
    if (!isRunning || !isPaused) {
        console.warn("resumeTimer called in invalid state (not running or not paused)");
        return;
    }

    // Retomar cronômetro
    startTime = new Date(); // Reset startTime for the current running interval
    isPaused = false;
    console.log("Timer resumed. New startTime for interval:", startTime);

    // Atualizar botões
    pauseBtn.disabled = false;
    resumeBtn.disabled = true;

    // Atualizar classe para animação
    timerContainer.classList.add("timer-running");
    timerContainer.classList.remove("timer-paused");

    // Reiniciar timer
    if (timer) clearInterval(timer);
    timer = setInterval(updateTimerDisplay, 1000);
    console.log("Timer interval restarted after resume");
}

function stopTimer() {
    console.log("stopTimer called");
    if (!isRunning) {
        console.warn("stopTimer called while not running");
        return;
    }

    // Parar cronômetro
    clearInterval(timer);
    currentEndTime = new Date(); // Armazena o objeto Date completo
    let totalTime;
    if (isPaused) {
        // If stopped while paused, total time is the accumulated pausedTime
        totalTime = pausedTime;
    } else {
        // If stopped while running, add the last interval to pausedTime
        totalTime = pausedTime + (currentEndTime - startTime);
    }
    console.log("Timer stopped at:", currentEndTime, "Total elapsed time (ms):", totalTime);

    // Atualizar interface
    endTimeDisplay.textContent = formatTime(currentEndTime);

    // Resetar estado
    isRunning = false;
    isPaused = false;

    // Atualizar botões
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    stopBtn.disabled = true;

    // Remover classes de animação
    timerContainer.classList.remove("timer-running");
    timerContainer.classList.remove("timer-paused");

    // Preparar dados para o modal
    const taskName = currentTaskName.textContent;
    finalTaskNameInput.value = taskName;
    // Need the original absolute startTime for the modal display
    // We need to store the absolute start time when the timer first starts
    // Let's modify startTimer to store absoluteStartTime
    // For now, we might have an issue if paused/resumed
    // Let's assume startTime holds the *first* start time for simplicity now
    // TODO: Store absolute start time separately if pause/resume is used heavily
    modalStartTime.textContent = startTimeDisplay.textContent; // Displays time, not full date
    modalEndTime.textContent = formatTime(currentEndTime);
    modalDuration.textContent = formatDuration(totalTime);
    console.log("Modal data prepared:", { taskName, startTime: modalStartTime.textContent, endTime: modalEndTime.textContent, duration: modalDuration.textContent });

    // Mostrar modal para renomear tarefa
    if (renameTaskModal) {
        renameTaskModal.show();
        console.log("Rename task modal shown");
    } else {
        console.error("Cannot show modal, instance is not available.");
        alert("Erro ao abrir a janela para salvar a tarefa.");
        // If modal fails, should we attempt to save with current name?
        // Or just reset? Let's reset for now.
        resetUIAndState();
    }
}

function updateTimerDisplay() {
    const currentTime = new Date();
    let elapsedTime;

    if (!isRunning || startTime === undefined) {
         // Not running or startTime not set, display 0
         elapsedTime = 0;
    } else if (isPaused) {
        elapsedTime = pausedTime;
    } else {
        // Currently running: accumulated paused time + time since last (re)start
        elapsedTime = pausedTime + (currentTime - startTime);
    }

    timerDisplay.textContent = formatDuration(elapsedTime);
}

// Funções auxiliares
function getSelectedTaskName() {
    const predefinedTask = predefinedTasksSelect.value;
    const customTask = customTaskInput.value.trim();
    return customTask || predefinedTask;
}

function updateTaskName() {
    if (isRunning) return; // Não permitir alteração durante execução

    const taskName = getSelectedTaskName();
    currentTaskName.textContent = taskName || "Nenhuma tarefa selecionada";

    // Limpar outro campo se um for preenchido
    if (this === predefinedTasksSelect && this.value) {
        customTaskInput.value = "";
    } else if (this === customTaskInput && this.value) {
        predefinedTasksSelect.value = "";
    }
}

function formatTime(date) {
    if (!date || !(date instanceof Date) || isNaN(date)) {
        console.warn("formatTime received invalid date:", date);
        return "--:--:--";
    }
    return date.toTimeString().split(" ")[0];
}

function formatDuration(ms) {
    if (typeof ms !== "number" || ms < 0) {
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
        console.warn("formatDate received invalid date:", date);
        return "Data inválida";
    }
    return date.toLocaleDateString("pt-BR");
}

// Funções de armazenamento
function saveTask() {
    console.log("saveTask started");

    const taskName = finalTaskNameInput.value.trim();
    if (!taskName) {
        alert("Por favor, insira um nome para a tarefa.");
        console.error("saveTask aborted: No task name provided.");
        return;
    }

    // Retrieve the absolute start time. Need to store this properly.
    // Let's assume 'startTime' holds the first start for now.
    // TODO: Implement storing the absolute start time correctly.
    const absoluteStartTime = startTime; // Placeholder - Needs proper implementation

    // Validate dates before creating task object
    if (!(absoluteStartTime instanceof Date) || isNaN(absoluteStartTime)) {
        console.error("saveTask aborted: Invalid absoluteStartTime", absoluteStartTime);
        alert("Erro: Horário de início inválido. Não foi possível salvar.");
        return;
    }
    if (!(currentEndTime instanceof Date) || isNaN(currentEndTime)) {
        console.error("saveTask aborted: Invalid currentEndTime", currentEndTime);
        alert("Erro: Horário de fim inválido. Não foi possível salvar.");
        return;
    }

    console.log("Creating task object with:", { taskName, startTime: absoluteStartTime, endTime: currentEndTime, duration: modalDuration.textContent });

    // Criar objeto de tarefa
    const task = {
        id: Date.now(),
        name: taskName,
        startTime: absoluteStartTime, // Use the absolute start Date object
        endTime: currentEndTime, // Use the end Date object
        duration: modalDuration.textContent, // This is the formatted duration string
        date: formatDate(absoluteStartTime) // Use absoluteStartTime for the date grouping
    };
    console.log("Task object created:", task);

    // Adicionar à lista e salvar
    try {
        tasks.push(task);
        console.log("Task pushed to tasks array. Current tasks:", tasks);
        saveTasks(); // This calls localStorage.setItem
        console.log("saveTasks() called (localStorage updated).");
    } catch (error) {
        console.error("Error during tasks.push or saveTasks:", error);
        alert("Erro ao salvar a tarefa no armazenamento local.");
        return; // Stop if saving failed
    }

    // Atualizar histórico
    try {
        updateHistoryTable();
        console.log("updateHistoryTable() called.");
    } catch (error) {
        console.error("Error during updateHistoryTable:", error);
        alert("Erro ao atualizar a tabela de histórico.");
    }

    // Fechar modal
    if (renameTaskModal) {
        renameTaskModal.hide();
        console.log("Modal hidden.");
    } else {
        console.warn("Modal instance not available to hide.");
    }

    // Resetar campos e estado
    resetUIAndState();
    console.log("saveTask finished successfully.");
}

function resetUIAndState() {
    console.log("Resetting UI and state");
    predefinedTasksSelect.value = "";
    customTaskInput.value = "";
    currentTaskName.textContent = "Nenhuma tarefa selecionada";
    timerDisplay.textContent = "00:00:00";
    startTimeDisplay.textContent = "--:--:--";
    endTimeDisplay.textContent = "--:--:--";

    // Reset internal state variables
    startTime = undefined; // Use undefined to indicate not set
    currentEndTime = undefined;
    pausedTime = 0;
    isRunning = false;
    isPaused = false;
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    // Ensure buttons are in correct initial state
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    stopBtn.disabled = true;
    timerContainer.classList.remove("timer-running", "timer-paused");
    console.log("UI and state reset complete");
}

function loadTasks() {
    console.log("loadTasks started");
    const storedTasks = localStorage.getItem("tasks");
    if (storedTasks) {
        try {
            tasks = JSON.parse(storedTasks);
            console.log("Tasks loaded from localStorage:", tasks);

            // Converter strings de data para objetos Date e validar
            tasks = tasks.map(task => {
                const loadedStartTime = task.startTime ? new Date(task.startTime) : null;
                const loadedEndTime = task.endTime ? new Date(task.endTime) : null;

                if (!loadedStartTime || isNaN(loadedStartTime)) {
                    console.warn("Loaded invalid startTime for task ID:", task.id, "Value:", task.startTime);
                    // Handle invalid date - maybe skip task or set to null?
                    // For now, let's keep it but it might cause issues later
                    task.startTime = null; 
                } else {
                    task.startTime = loadedStartTime;
                }

                if (!loadedEndTime || isNaN(loadedEndTime)) {
                     console.warn("Loaded invalid endTime for task ID:", task.id, "Value:", task.endTime);
                     task.endTime = null; // Set invalid end times to null
                } else {
                    task.endTime = loadedEndTime;
                }
                return task;
            }).filter(task => task.startTime !== null); // Filter out tasks with completely invalid start times
            
            console.log("Tasks after date conversion and validation:", tasks);

            // Atualizar histórico com dados carregados e validados
            updateHistoryTable();
            console.log("History table updated on load.");
        } catch (error) {
            console.error("Error parsing tasks from localStorage or converting dates:", error);
            tasks = []; // Reset tasks if loading fails
            localStorage.removeItem("tasks"); // Clear corrupted data
            alert("Erro ao carregar tarefas salvas. O histórico pode ter sido limpo.");
        }
    } else {
        console.log("No tasks found in localStorage.");
    }
}

function saveTasks() {
    try {
        localStorage.setItem("tasks", JSON.stringify(tasks));
    } catch (error) {
        console.error("Error saving tasks to localStorage:", error);
        alert("Não foi possível salvar as tarefas. O armazenamento local pode estar cheio ou indisponível.");
    }
}

// Funções de histórico
function updateHistoryTable() {
    console.log("updateHistoryTable started");
    const tableBody = document.getElementById("history-table-body");
    const filterType = document.getElementById("filter-type").value;
    const filterDateInput = document.getElementById("filter-date");
    let filterDate = filterDateInput.valueAsDate;

    // Default to today if no valid date is selected
    if (!filterDate || isNaN(filterDate)) {
        console.warn("updateHistoryTable: Invalid or no filter date selected. Defaulting to today.");
        filterDate = new Date();
        // Adjust to midnight start of today for consistent filtering
        filterDate.setHours(0, 0, 0, 0);
        // Don't update the input visually, just use for filtering
        // filterDateInput.valueAsDate = filterDate; 
    }
    console.log("Filtering history with type:", filterType, "and date:", filterDate);

    // Limpar tabela
    tableBody.innerHTML = "";

    // Filtrar tarefas
    let filteredTasks = [];
    try {
        // Filter only tasks that have a valid startTime and endTime
        const completedTasks = tasks.filter(task => task.startTime && !isNaN(task.startTime) && task.endTime && !isNaN(task.endTime));
        console.log("Completed tasks with valid dates to filter:", completedTasks);
        filteredTasks = filterTasks(completedTasks, filterType, filterDate);
        console.log("Filtered tasks result:", filteredTasks);
    } catch (error) {
        console.error("Error during filterTasks:", error);
    }

    // Adicionar linhas à tabela
    filteredTasks.sort((a, b) => b.startTime - a.startTime); // Sort by start time descending
    filteredTasks.forEach(task => {
        const formattedStartTime = formatTime(task.startTime);
        const formattedEndTime = formatTime(task.endTime);
        const formattedDate = formatDate(task.startTime);

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${task.name || "Sem nome"}</td>
            <td>${formattedStartTime}</td>
            <td>${formattedEndTime}</td>
            <td>${task.duration || "Inválido"}</td>
            <td>${formattedDate}</td>
        `;
        tableBody.appendChild(row);
    });

    // Mensagem se não houver tarefas
    if (filteredTasks.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = '<td colspan="5" class="text-center">Nenhuma tarefa encontrada para este período.</td>';
        tableBody.appendChild(row);
    }
    console.log("updateHistoryTable finished");
}

function applyHistoryFilter() {
    console.log("applyHistoryFilter called");
    updateHistoryTable();
}

function filterTasks(tasksToFilter, filterType, filterDate) {
    console.log("filterTasks called with:", { tasksCount: tasksToFilter.length, filterType, filterDate });
    if (!filterDate || isNaN(filterDate)) {
        console.warn("filterTasks: Invalid filter date provided.");
        return []; // Return empty if date is invalid
    }

    const year = filterDate.getFullYear();
    const month = filterDate.getMonth();
    const day = filterDate.getDate();

    // Get start and end of the filter day
    const filterDayStart = new Date(year, month, day, 0, 0, 0, 0);
    const filterDayEnd = new Date(year, month, day, 23, 59, 59, 999);

    // Get start and end of the filter week (assuming week starts on Sunday)
    const firstDayOfWeek = new Date(filterDate);
    firstDayOfWeek.setDate(filterDate.getDate() - filterDate.getDay());
    firstDayOfWeek.setHours(0, 0, 0, 0);
    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
    lastDayOfWeek.setHours(23, 59, 59, 999);

    // Get start and end of the filter month
    const firstDayOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
    const lastDayOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    console.log("Filter ranges:", { filterDayStart, filterDayEnd, firstDayOfWeek, lastDayOfWeek, firstDayOfMonth, lastDayOfMonth });

    return tasksToFilter.filter(task => {
        // Task startTime must be valid (already pre-filtered in updateHistoryTable)
        const taskDate = task.startTime;

        switch (filterType) {
            case "day":
                return taskDate >= filterDayStart && taskDate <= filterDayEnd;
            case "week":
                return taskDate >= firstDayOfWeek && taskDate <= lastDayOfWeek;
            case "month":
                return taskDate >= firstDayOfMonth && taskDate <= lastDayOfMonth;
            default:
                console.warn("filterTasks: Unknown filterType:", filterType);
                return false; // Don't include if filter type is unknown
        }
    });
}

// Funções de relatório
function generateReport() {
    console.log("generateReport called");
    const reportPeriod = document.getElementById("report-period").value;
    const reportView = document.getElementById("report-view").value;

    // Determinar período de datas
    let startDate, endDate;
    const today = new Date();
    today.setHours(0,0,0,0); // Start of today

    if (reportPeriod === "custom") {
        startDate = document.getElementById("report-start-date").valueAsDate;
        endDate = document.getElementById("report-end-date").valueAsDate;

        if (!startDate || isNaN(startDate) || !endDate || isNaN(endDate)) {
            alert("Por favor, selecione datas inicial e final válidas para o relatório personalizado.");
            return;
        }
        // Adjust dates to cover full days
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

    } else {
        switch (reportPeriod) {
            case "day":
                startDate = new Date(today);
                endDate = new Date(today); endDate.setHours(23, 59, 59, 999);
                break;
            case "week":
                startDate = new Date(today);
                startDate.setDate(today.getDate() - today.getDay()); // Sunday
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6); // Saturday
                endDate.setHours(23, 59, 59, 999);
                break;
            case "month":
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            default:
                 console.error("Invalid report period selected");
                 return;
        }
    }
    console.log("Report period selected:", { reportPeriod, startDate, endDate });

    // Filtrar tarefas pelo período (only completed tasks with valid dates)
    const completedTasks = tasks.filter(task => task.startTime && !isNaN(task.startTime) && task.endTime && !isNaN(task.endTime));
    const filteredTasks = completedTasks.filter(task => {
        return task.startTime >= startDate && task.startTime <= endDate;
    });
    console.log("Tasks filtered for report:", filteredTasks);

    // Agrupar tarefas por nome
    const taskGroups = {};
    filteredTasks.forEach(task => {
        if (!taskGroups[task.name]) {
            taskGroups[task.name] = {
                name: task.name,
                count: 0,
                totalDurationSeconds: 0,
                tasks: []
            };
        }
        // Calculate duration in seconds directly from Date objects for accuracy
        const durationInSeconds = Math.floor((task.endTime - task.startTime) / 1000);
        // TODO: Account for pauses if implementing pause/resume fully

        taskGroups[task.name].count++;
        taskGroups[task.name].totalDurationSeconds += durationInSeconds;
        taskGroups[task.name].tasks.push(task);
    });
    console.log("Tasks grouped for report:", taskGroups);

    // Calcular médias e formatar durações
    const reportData = Object.values(taskGroups).map(group => {
        const averageDurationSeconds = group.totalDurationSeconds / group.count;
        return {
            ...group,
            formattedTotalDuration: formatDuration(group.totalDurationSeconds * 1000),
            formattedAverageDuration: formatDuration(averageDurationSeconds * 1000)
        };
    });
    console.log("Report data calculated:", reportData);

    // Atualizar visualização conforme selecionado
    updateReportView(reportData, reportView);
}

// --- Funções updateReportView, updateReportChart, updateReportTable (sem alterações significativas, exceto usar reportData) ---
// --- Função exportToPDF (sem alterações) ---

// Funções de relatório (atualizadas para usar reportData)
function updateReportView(reportData, viewType) {
    const chartContainer = document.querySelector(".chart-container");
    const tableContainer = document.getElementById("report-table-container");

    // Configurar visibilidade
    switch (viewType) {
        case "chart":
            chartContainer.style.display = "block";
            tableContainer.style.display = "none";
            break;
        case "table":
            chartContainer.style.display = "none";
            tableContainer.style.display = "block";
            break;
        case "both":
            chartContainer.style.display = "block";
            tableContainer.style.display = "block";
            break;
    }

    // Atualizar gráfico se visível
    if (viewType === "chart" || viewType === "both") {
        updateReportChart(reportData);
    }

    // Atualizar tabela se visível
    if (viewType === "table" || viewType === "both") {
        updateReportTable(reportData);
    }
}

function updateReportChart(reportData) {
    const ctx = document.getElementById("report-chart").getContext("2d");

    // Destruir gráfico existente se houver
    if (window.reportChart) {
        window.reportChart.destroy();
    }

    // Se não houver dados, mostrar mensagem
    if (reportData.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = "#6c757d";
        ctx.fillText("Nenhuma tarefa encontrada para este período.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        // Remove toggle button if it exists and there's no chart
        const toggleButton = document.getElementById('toggle-chart-type');
        if (toggleButton) toggleButton.remove();
        return;
    }

    // Preparar dados para gráfico de barras (tempo total)
    const barLabels = reportData.map(group => group.name);
    const barData = reportData.map(group => group.totalDurationSeconds / 60); // Converter para minutos

    // Preparar dados para gráfico de pizza (distribuição de tempo)
    const pieLabels = barLabels;
    const pieData = barData;

    // Gerar cores
    const backgroundColors = reportData.map((_, index) => `hsl(${(index * 360 / reportData.length) % 360}, 70%, 70%)`);
    const borderColors = backgroundColors;

    // Criar gráfico de barras inicial
    window.reportChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: barLabels,
            datasets: [{
                label: "Tempo Total (minutos)",
                data: barData,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: "Tempo Total por Tarefa", font: { size: 16 } },
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const minutes = context.raw;
                            const hours = Math.floor(minutes / 60);
                            const mins = Math.round(minutes % 60);
                            return `${context.label}: ${hours}h ${mins}m`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: "Tempo (Horas:Minutos)" },
                     ticks: {
                        callback: function(value) {
                            const hours = Math.floor(value / 60);
                            const mins = Math.round(value % 60);
                            return `${hours}:${mins.toString().padStart(2, '0')}`;
                        }
                    }
                }
            }
        }
    });

    // Adicionar/atualizar botão para alternar tipo de gráfico
    let toggleButton = document.getElementById("toggle-chart-type");
    if (!toggleButton) {
        toggleButton = document.createElement("button");
        toggleButton.id = "toggle-chart-type";
        toggleButton.className = "btn btn-sm btn-outline-secondary mt-2";
        const chartContainer = document.querySelector(".chart-container");
        // Ensure button is added only once and in the right place
        if (chartContainer && !chartContainer.querySelector('#toggle-chart-type')) {
             chartContainer.appendChild(toggleButton);
        }
    }
    toggleButton.textContent = "Alternar para Gráfico de Pizza";
    toggleButton.onclick = () => toggleChartType(ctx, pieLabels, pieData, barLabels, barData, backgroundColors, borderColors, toggleButton);
}

// Função separada para alternar tipo de gráfico
function toggleChartType(ctx, pieLabels, pieData, barLabels, barData, backgroundColors, borderColors, button) {
    if (!window.reportChart) return;

    const currentType = window.reportChart.config.type;
    window.reportChart.destroy(); // Destroy existing chart

    if (currentType === "bar") {
        // Mudar para gráfico de pizza
        window.reportChart = new Chart(ctx, {
            type: "pie",
            data: {
                labels: pieLabels,
                datasets: [{
                    data: pieData,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: "Distribuição de Tempo por Tarefa", font: { size: 16 } },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const minutes = context.raw;
                                const hours = Math.floor(minutes / 60);
                                const mins = Math.round(minutes % 60);
                                const totalMinutes = pieData.reduce((a, b) => a + b, 0);
                                const percentage = totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0;
                                return `${context.label}: ${hours}h ${mins}m (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        button.textContent = "Alternar para Gráfico de Barras";
    } else {
        // Mudar para gráfico de barras
        window.reportChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: barLabels,
                datasets: [{
                    label: "Tempo Total (minutos)",
                    data: barData,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
             options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: "Tempo Total por Tarefa", font: { size: 16 } },
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const minutes = context.raw;
                                const hours = Math.floor(minutes / 60);
                                const mins = Math.round(minutes % 60);
                                return `${context.label}: ${hours}h ${mins}m`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: "Tempo (Horas:Minutos)" },
                         ticks: {
                            callback: function(value) {
                                const hours = Math.floor(value / 60);
                                const mins = Math.round(value % 60);
                                return `${hours}:${mins.toString().padStart(2, '0')}`;
                            }
                        }
                    }
                }
            }
        });
        button.textContent = "Alternar para Gráfico de Pizza";
    }
}

function updateReportTable(reportData) {
    const tableBody = document.getElementById("report-table-body");
    tableBody.innerHTML = ""; // Limpar tabela

    // Adicionar linhas
    reportData.sort((a, b) => b.totalDurationSeconds - a.totalDurationSeconds); // Sort by total duration
    reportData.forEach(group => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${group.name}</td>
            <td>${group.formattedTotalDuration}</td>
            <td>${group.formattedAverageDuration}</td>
            <td>${group.count}</td>
        `;
        tableBody.appendChild(row);
    });

    // Adicionar linha de total se houver dados
    if (reportData.length > 0) {
        const totalRow = document.createElement("tr");
        totalRow.className = "table-active fw-bold"; // Use Bootstrap classes for styling

        const totalCount = reportData.reduce((sum, group) => sum + group.count, 0);
        const totalDurationSeconds = reportData.reduce((sum, group) => sum + group.totalDurationSeconds, 0);
        const formattedTotalDuration = formatDuration(totalDurationSeconds * 1000);

        totalRow.innerHTML = `
            <td>TOTAL</td>
            <td>${formattedTotalDuration}</td>
            <td>-</td>
            <td>${totalCount}</td>
        `;
        tableBody.appendChild(totalRow);
    }

    // Mensagem se não houver dados
    if (reportData.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = '<td colspan="4" class="text-center">Nenhuma tarefa encontrada para este período.</td>';
        tableBody.appendChild(row);
    }
}

// Função básica de exportação para PDF (mantida como estava)
function exportToPDF() {
    console.log("Export to PDF called");
    // A implementação completa da exportação PDF já existe no arquivo pdf-export.js
    // Esta função no app.js pode ser removida se pdf-export.js for carregado corretamente.
    // No entanto, vamos chamar a função global que deve estar definida por pdf-export.js
    if (typeof generatePdfReport === "function") { // Assuming pdf-export.js defines generatePdfReport
        generatePdfReport(); // Call the actual export function
    } else {
        console.error("PDF export function (generatePdfReport) not found.");
        alert("Erro: A função de exportação para PDF não está disponível.");
    }
}

// Adicionar uma função global no pdf-export.js para ser chamada
// Exemplo em pdf-export.js:
// window.generatePdfReport = function() { ... (código de exportToPDF) ... }

