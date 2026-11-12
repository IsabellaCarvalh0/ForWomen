/* Formatação limitada a elementos de texto, sem atributos ou HTML executável. */
window.TextoAtividade = (() => {
    const marca = 'FW-RICH:';
    const permitidas = new Set(['B','STRONG','I','EM','U','S','STRIKE','P','DIV','BR','UL','OL','LI','BLOCKQUOTE']);
    function limpar(html) {
        const origem = document.createElement('template');
        origem.innerHTML = html;
        const destino = document.createElement('div');
        function copiar(no, pai) {
            if (no.nodeType === 3) { pai.appendChild(document.createTextNode(no.textContent)); return; }
            if (no.nodeType !== 1 || ['SCRIPT','STYLE','IFRAME','OBJECT','SVG','MATH'].includes(no.tagName)) return;
            const elemento = permitidas.has(no.tagName) ? document.createElement(no.tagName.toLowerCase()) : pai;
            if (elemento !== pai) pai.appendChild(elemento);
            no.childNodes.forEach(filho => copiar(filho, elemento));
        }
        origem.content.childNodes.forEach(no => copiar(no, destino));
        return destino.innerHTML;
    }
    function html(valor) {
        valor = String(valor || '');
        if (valor.startsWith(marca)) return limpar(valor.slice(marca.length));
        const div = document.createElement('div');
        div.textContent = valor;
        return div.innerHTML.replace(/\n/g, '<br>');
    }
    function texto(valor) {
        const div = document.createElement('div'); div.innerHTML = html(valor);
        return div.textContent;
    }
    function editor(id) {
        const campo = document.getElementById(id);
        const grupo = document.createElement('div'); grupo.className = 'editor-grupo';
        const barra = document.createElement('div'); barra.className = 'editor-barra';
        barra.setAttribute('role','toolbar'); barra.setAttribute('aria-label','Formatação do texto');
        const area = document.createElement('div'); area.className = 'editor-texto texto-formatado';
        area.contentEditable = 'true'; area.id = id + 'Editor';
        area.setAttribute('role','textbox'); area.setAttribute('aria-multiline','true');
        area.setAttribute('aria-label', campo.labels[0]?.textContent || 'Texto da atividade');
        area.dataset.placeholder = campo.placeholder;
        campo.hidden = true; campo.required = false;
        campo.after(grupo); grupo.append(barra,area);
        const comandos = [['bold','Negrito','N'],['italic','Itálico','I'],['underline','Sublinhado','S'],['strikeThrough','Tachado','T'],['insertUnorderedList','Lista com marcadores','• Lista'],['insertOrderedList','Lista numerada','1. Lista'],['removeFormat','Limpar formatação','Limpar']];
        for (const [comando,nome,rotulo] of comandos) {
            const botao = document.createElement('button'); botao.type = 'button'; botao.textContent = rotulo;
            botao.title = nome; botao.setAttribute('aria-label',nome);
            botao.addEventListener('mousedown',e=>e.preventDefault());
            botao.addEventListener('click',()=>{ area.focus(); document.execCommand(comando,false,null); });
            barra.appendChild(botao);
        }
        // Colar como texto impede estilos externos de deformarem o formulário.
        area.addEventListener('paste', e => {
            e.preventDefault(); document.execCommand('insertText',false,e.clipboardData.getData('text/plain'));
        });
        document.querySelector('label[for="'+id+'"]').htmlFor = area.id;
        return { definir(valor) { area.innerHTML = html(valor); },
            obter() { return area.textContent.trim() ? marca + limpar(area.innerHTML) : ''; } };
    }
    return { html, texto, editor };
})();
