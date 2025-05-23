// Integração dos módulos de relatório e exportação PDF
document.addEventListener('DOMContentLoaded', function() {
    // Carregar funções de relatório
    loadReportFunctions();
    
    // Carregar funções de exportação PDF
    loadPDFExportFunctions();
    
    // Configurar eventos adicionais
    document.getElementById('export-pdf-btn').addEventListener('click', exportToPDF);
});

// Função para carregar as funções de relatório
function loadReportFunctions() {
    // As funções já estão definidas em report-functions.js
    console.log('Funções de relatório carregadas');
}

// Função para carregar as funções de exportação PDF
function loadPDFExportFunctions() {
    // As funções já estão definidas em pdf-export.js
    console.log('Funções de exportação PDF carregadas');
}
