console.log("JS carregado");

// ================= BASE =================
let dadosProcessos = [];
let mapaUrgencia = {};
let embarquesSemana = new Set();
let modoApresentacaoAtivo = false;

// ================= RESUMO =================

Papa.parse("resumo.csv", {
    download: true,
    header: true,
    skipEmptyLines: true,

    complete: function(results) { 

	atualizarDataCarga();

        const dados = results.data;

        dados.forEach(linha => {

const po = linha["PO# REF"] || "";
const urgencia = linha["NÍVEL DE URGÊNCIA"] || "";

// PRIORIDADE
if(urgencia.includes("PRIORIDADE")){

    if(!mapaUrgencia[po]){
        mapaUrgencia[po] = "PRIORIDADE";
    }

}

// CRÍTICO SOBRESCREVE
if(urgencia.includes("CRÍTICO")){
    mapaUrgencia[po] = "CRÍTICO";
}

            const item = {
                status: linha["STATUS PROCESSO"] || "",
                codigo: linha["CÓDIGO"] || "",
                descricao: linha["DESCRIÇÃO"] || "",
                quantidade: linha["QUANTIDADE"] || "",
                urgencia: linha["NÍVEL DE URGÊNCIA"] || "",
                fornecedor: linha["FORNECEDOR"] || "",
                chegada: linha["PREV. CHEGADA CD"] || "",
                atracacao: linha["PREV. ATRACAÇÃO"] || "",
		semana: linha["SEMANA"] || "",
		mes: obterMes(linha["PREV. CHEGADA CD"] || ""),
		PO: linha["PO# REF"] || ""
            };

            dadosProcessos.push(item);

        });

        popularFiltros();
        aplicarFiltros();

    }
});


// ================= FILTROS =================

function toggleFiltro(id){
    const el = document.getElementById(id);
    el.style.display = el.style.display === "block" ? "none" : "block";
}

function aplicarFiltros(){

	
const dataInicio = document.getElementById("dataInicio").value;
const dataFim = document.getElementById("dataFim").value;

const dataInicioObj = dataInicio ? new Date(dataInicio) : null;
const dataFimObj = dataFim ? new Date(dataFim) : null;

    const statusSel = getSelecionados("statusBox");
    const fornecedorSel = getSelecionados("fornecedorBox");
    const urgenciaSel = getSelecionados("urgenciaBox");
    const semanaSel = getSelecionados("semanaBox");
    const mesSel = getSelecionados("mesBox");

    const busca = document.getElementById("filtroBusca")?.value.toLowerCase() || "";

    const tbody = document.querySelector("#tabela tbody");
    tbody.innerHTML = "";

	const processosSet = new Set();
	const skuSet = new Set();

	const estavelSet = new Set();
	const criticosSet = new Set();
	const prioridadeSet = new Set();

const fornecedores = new Set();

    dadosProcessos.forEach(item => {

const dataItem = converterDataBR(item.chegada);
const hoje = new Date();

const hojeFormatado =
    hoje.getDate().toString().padStart(2,"0") + "/" +
    (hoje.getMonth()+1).toString().padStart(2,"0") + "/" +
    hoje.getFullYear();
if(
    modoApresentacaoAtivo &&
    !embarquesSemana.has(item.PO)
){
    return;
}
if(dataInicioObj && dataItem && dataItem < dataInicioObj) return;
if(dataFimObj && dataItem && dataItem > dataFimObj) return;

        if(statusSel.length && !statusSel.includes(item.status)) return;
        if(fornecedorSel.length && !fornecedorSel.includes(item.fornecedor)) return;
        if(urgenciaSel.length && !urgenciaSel.includes(item.urgencia)) return;
        if(semanaSel.length && !semanaSel.includes(item.semana)) return;
	if(mesSel.length && !mesSel.includes(item.mes)) return;

        if(busca &&
           !item.codigo.toLowerCase().includes(busca) &&
           !item.descricao.toLowerCase().includes(busca)
        ) return;

        processosSet.add(item.PO);
	skuSet.add(item.codigo);

	fornecedores.add(item.fornecedor);

	if(item.urgencia.includes("ESTÁVEL")){
    estavelSet.add(item.codigo);
	}

	if(item.urgencia.includes("CRÍTICO")){
    criticosSet.add(item.codigo);
	}

	if(item.urgencia.includes("PRIORIDADE")){
    prioridadeSet.add(item.codigo);
	}

        const tr = document.createElement("tr");

        if (item.urgencia.includes("CRÍTICO")) tr.classList.add("critico");
        if (item.urgencia.includes("PRIORIDADE")) tr.classList.add("prioridade");
	if(item.chegada === hojeFormatado){
    tr.classList.add("chega-hoje");
}
if(embarquesSemana.has(item.PO)){
    tr.classList.add("programacao-semana");
}


        tr.innerHTML = `
            <td>${item.status}</td>
            <td>${item.codigo}</td>
            <td>${item.descricao}</td>
            <td>${item.quantidade}</td>
            <td>${item.urgencia}</td>
            <td>${item.fornecedor}</td>
            <td>${item.chegada}</td>
            <td>${item.atracacao}</td>

            <td>${item.semana}</td>
	    <td>${item.PO}</td>
        `;

        tbody.appendChild(tr);

    });

    document.getElementById("kpiProcessos").innerText = processosSet.size;
    document.getElementById("kpiEstavel").innerText = estavelSet.size;
    document.getElementById("kpiCriticos").innerText = criticosSet.size;
    document.getElementById("kpiPrioridade").innerText = prioridadeSet.size;
    document.getElementById("kpiFornecedores").innerText = fornecedores.size;
    document.getElementById("kpiSku").innerText = skuSet.size;
;
}

function obterMes(dataStr){

    if(!dataStr) return "";

    const partes = dataStr.split("/");

    if(partes.length !== 3) return "";

    const mes = parseInt(partes[1]);

    const meses = [
        "JANEIRO",
        "FEVEREIRO",
        "MARÇO",
        "ABRIL",
        "MAIO",
        "JUNHO",
        "JULHO",
        "AGOSTO",
        "SETEMBRO",
        "OUTUBRO",
        "NOVEMBRO",
        "DEZEMBRO"
    ];

    return meses[mes - 1];
}

function converterDataBR(dataStr){

    if(!dataStr) return null;

    const partes = dataStr.split("/");

    if(partes.length !== 3) return null;

    return new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);
}

document.getElementById("dataInicio").addEventListener("change", aplicarFiltros);
document.getElementById("dataFim").addEventListener("change", aplicarFiltros);

// ================= MULTISELECT =================

function criarCheckboxes(containerId, valores){

    const box = document.getElementById(containerId);
    box.innerHTML = "";

    valores.forEach(v => {

        const label = document.createElement("label");

        label.innerHTML = `
            <input type="checkbox" value="${v}" checked> ${v}
        `;

        box.appendChild(label);
    });
}

function getSelecionados(containerId){

    const checks = document.querySelectorAll(`#${containerId} input:checked`);
    return Array.from(checks).map(c => c.value);
}

function popularFiltros(){

    const statusSet = new Set();
    const fornecedorSet = new Set();
    const urgenciaSet = new Set();
    const semanaSet = new Set();
    const skuSet = new Set();
    const mesSet = new Set();

    dadosProcessos.forEach(item => {
        statusSet.add(item.status);
        fornecedorSet.add(item.fornecedor);
        urgenciaSet.add(item.urgencia);
        semanaSet.add(item.semana);
	skuSet.add(item.codigo);
	mesSet.add(item.mes);
    });

    criarCheckboxes("statusBox", [...statusSet]);
    criarCheckboxes("fornecedorBox", [...fornecedorSet]);
    criarCheckboxes("urgenciaBox", [...urgenciaSet]);
    criarCheckboxes("semanaBox", [...semanaSet]);
    criarCheckboxes("mesBox", [...mesSet]);
}


// ================= EVENTOS =================

document.addEventListener("change", function(e){
    if(e.target.type === "checkbox"){
        aplicarFiltros();
    }
});

document.addEventListener("input", function(e){
    if(e.target.id === "filtroBusca"){
        aplicarFiltros();
    }
});


// ================= LIMPAR =================

function limparFiltros(){

    // Resetar checkboxes
    document.querySelectorAll(".dropdown input").forEach(c => c.checked = true);

    // Limpar busca
    document.getElementById("filtroBusca").value = "";

    // 🔥 LIMPAR DATAS
    document.getElementById("dataInicio").value = "";
    document.getElementById("dataFim").value = "";

    // Reaplicar filtros (mostra tudo)
    aplicarFiltros();
}



// ================= CONTAINERS =================

Papa.parse("container.csv", {
    download: true,
    header: true,
    skipEmptyLines: true,

    complete: function(results) {
	
	atualizarDataCarga();

        const dados = results.data;
	let totalContainers = 0;
        const tbody = document.querySelector("#tabelaContainers tbody");

        dados.forEach(linha => {

embarquesSemana.add(linha["EMBARQUE"]);
const qtdContainer = parseFloat(
    (linha["CONTAINER"] || "0")
        .toString()
        .replace(",", ".")
        .trim()
);

totalContainers += qtdContainer;

const embarque = linha["EMBARQUE"] || "";

const nivel = mapaUrgencia[embarque] || "";

            const tr = document.createElement("tr");

if(nivel === "CRÍTICO"){
    tr.classList.add("container-critico");
}

if(nivel === "PRIORIDADE"){
    tr.classList.add("container-prioridade");
}

            tr.innerHTML = `
                <td>${linha["CONFIRMADO"] || ""}</td>
                <td>${linha["EMBARQUE"] || ""}</td>
                <td>${linha["CONTAINER"] || ""}</td>
                <td>${linha["CONSOLIDADO"] || ""}</td>
                <td>${linha["PREVISÃO DE ENTREGA CD DT"] || ""}</td>
<td>
    ${
        linha["TEM NOTA MÃE?"] === "SIM"
        ? `<span class="status-ok">✅Sim</span>`
        : `<span class="status-no">⛔Não	</span>`
    }
</td>

                <td>${linha["PREVISÃO CHEGADA CD HORAS"] || ""}</td>
                <td>${linha["NOTA COMPLEMENTAR"] || ""}</td>
                <td>${linha["DESCARREGAMENTO"] || ""}</td>
                <td>${linha["DISPONÍVEL VENDA"] || ""}</td>
                <td>${linha["VTO ARMAZÉM"] || ""}</td>
                <td>${linha["DESP ARMAZÉM"] || ""}</td>
            `;

	document.getElementById("kpiContainersSemana").innerText = totalContainers;

            tbody.appendChild(tr);

        });

    }
});

function modoApresentacao(){

    modoApresentacaoAtivo = !modoApresentacaoAtivo;

    document.body.classList.toggle("modo-apresentacao");

    aplicarFiltros();
}

function atualizarData(){

    const agora = new Date();

    const dataFormatada =
        agora.toLocaleDateString("pt-BR") + " " +
        agora.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        });

    document.getElementById("dataAtual").innerText = dataFormatada;
}

// Atualiza ao carregar
atualizarData();

// Atualiza a cada 1 minuto
setInterval(atualizarData, 60000);

function atualizarDataCarga(){

    const agora = new Date();

    const dataFormatada =
        agora.toLocaleDateString("pt-BR") + " " +
        agora.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        });

    document.getElementById("dataAtual").innerText = dataFormatada;
}

function exportarResumo(){

    const tabela = document.getElementById("tabela");

    let csv = [];

    for(let i = 0; i < tabela.rows.length; i++){

        let linha = [];

        for(let j = 0; j < tabela.rows[i].cells.length; j++){

            linha.push(
                '"' +
                tabela.rows[i].cells[j].innerText.replace(/"/g,'""')
                + '"'
            );

        }

        csv.push(linha.join(";"));
    }

    const csvString = csv.join("\n");

const blob = new Blob(
    ["\uFEFF" + csvString],
    {
        type: "text/csv;charset=utf-8;"
    }
);

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);

    const data = new Date();

    const nomeArquivo =
        "Resumo_" +
        data.toISOString().slice(0,10) +
        ".csv";

    link.download = nomeArquivo;

    link.click();
}



