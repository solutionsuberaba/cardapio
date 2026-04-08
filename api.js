/**
 * =========================================================================
 * SISTEMA: SOLUTIONS QR BUSINESS INTELLIGENCE
 * MÓDULO: SERVIDOR DE ALTA DISPONIBILIDADE (API CORE)
 * VERSÃO: 7.6 PRO MASTER UNIFICADO (SOLDAGEM DE EDIÇÃO E AUDITORIA)
 * DESENVOLVEDOR: ENGENHARIA DE SOFTWARE SÊNIOR
 * =========================================================================
 * 
 * PROTOCOLO DE INTEGRIDADE:
 * - Proibido resumir funções.
 * - Proibido alterar rotas validadas.
 * - Volume de código expandido para segurança técnica e auditoria forense.
 */

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();

// =========================================================================
// CONFIGURAÇÕES GLOBAIS DE MIDDLEWARE E REDE (CONEXÃO LISA)
// =========================================================================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// Estabelecendo Conexão com o Banco de Dados Central Solutions QR
const db = new sqlite3.Database(process.env.DB_PATH || path.join(__dirname, 'database.db'), (err) => {
    if (err) {
        console.error("CRÍTICO: Falha na conexão com o banco de dados:", err.message);
    } else {
        console.log("SUCESSO: Solutions Master Database conectado com sucesso.");
    }
});

// =========================================================================
// PROTOCOLO DE INICIALIZAÇÃO E SCHEMAS (INTEGRIDADE TOTAL)
// =========================================================================
db.serialize(() => {
    console.log("Monitor de Sistema [BI]: Iniciando varredura de integridade de tabelas...");

    db.run(`CREATE TABLE IF NOT EXISTS configuracoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        modo_whatsapp INTEGER DEFAULT 0,
        limite_mesas INTEGER DEFAULT 15,
        whatsapp_numero TEXT DEFAULT '',
        modulo_dashboard INTEGER DEFAULT 1,
        modulo_caixa INTEGER DEFAULT 1
    )`);
    
    db.run(`INSERT OR IGNORE INTO configuracoes (id, modo_whatsapp, limite_mesas) VALUES (1, 0, 15)`);

    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        nome TEXT, 
        login TEXT UNIQUE, 
        senha TEXT, 
        nivel TEXT
    )`);
    
    db.run(`INSERT OR IGNORE INTO usuarios (nome, login, senha, nivel) 
            VALUES ('Administrador', 'admin', '123', 'ADMIN')`);

    db.run(`CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        nome TEXT, 
        preco REAL, 
        subcategoria TEXT, 
        descricao TEXT, 
        disponivel INTEGER DEFAULT 1, 
        promocao INTEGER DEFAULT 0, 
        imagem TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS adicionais (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto_id INTEGER,
        nome TEXT,
        preco REAL,
        FOREIGN KEY(produto_id) REFERENCES produtos(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        mesa TEXT, 
        itens TEXT, 
        total REAL, 
        status TEXT DEFAULT 'PENDENTE', 
        garcom_nome TEXT DEFAULT NULL, 
        hora TEXT, 
        destino TEXT, 
        horario_entrega TEXT,
        data_iso TEXT,
        fechamento_id TEXT DEFAULT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS chamados (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        mesa TEXT, 
        hora TEXT, 
        status TEXT DEFAULT 'ABERTO'
    )`);

    console.log("Executando migrações de segurança e expansão de campos temporais...");
    db.run("ALTER TABLE pedidos ADD COLUMN data_iso TEXT", (err) => {});
    db.run("ALTER TABLE pedidos ADD COLUMN horario_entrega TEXT", (err) => {});
    db.run("ALTER TABLE pedidos ADD COLUMN destino TEXT", (err) => {});
    db.run("ALTER TABLE pedidos ADD COLUMN fechamento_id TEXT", (err) => {});
    db.run("ALTER TABLE produtos ADD COLUMN promocao INTEGER DEFAULT 0", (err) => {});
    db.run("ALTER TABLE produtos ADD COLUMN disponivel INTEGER DEFAULT 1", (err) => {});
    
    db.run("UPDATE produtos SET preco = 0.00 WHERE preco IS NULL OR preco = ''");
});

// =========================================================================
// SISTEMA DE SEGURANÇA E ACESSO (AUTENTICAÇÃO)
// =========================================================================
app.post('/auth/login', (req, res) => {
    const { login, senha } = req.body;
    const sqlAuth = 'SELECT nome, nivel FROM usuarios WHERE login = ? AND senha = ?';
    
    db.get(sqlAuth, [login, senha], (err, user) => {
        if (err) {
            console.error("ERRO-AUDITORIA: Falha interna no servidor durante login:", err);
            return res.status(500).json({ success: false });
        }
        if (user) {
            console.log(`LOGIN SUCESSO-BI: ${user.nome} entrou como ${user.nivel}`);
            res.json({ success: true, user });
        } else {
            console.warn(`ACESSO NEGADO-BI: Tentativa de login falhou para usuário: ${login}`);
            res.status(401).json({ success: false, message: "Login ou senha incorretos." });
        }
    });
});

// =========================================================================
// ROTEAMENTO LÓGICO DE PEDIDOS (MOTOR DE SPLIT E AUDITORIA)
// =========================================================================
app.post('/pedidos', (req, res) => {
    const { mesa, itens } = req.body;
    const horaPedido = new Date().toLocaleTimeString();
    const dataISO = new Date().toISOString().split('T')[0]; 
    
    console.log(`OPERACIONAL: Pedido recebido - Mesa ${mesa} | Itens: ${itens.length}`);

    const catBar = [
        'Cerveja', 'Refrigerante', 'Água', 'Drink', 'Bebida', 
        'Cervejas', 'Refrigerantes', 'Águas', 'Drinks', 
        'Destilados', 'Whisky', 'Long Neck', 'Sucos', 'Diversos'
    ];
    
    const itensBar = itens.filter(i => catBar.includes(i.subcategoria));
    const itensCozinha = itens.filter(i => !catBar.includes(i.subcategoria));

    if (itensBar.length > 0) {
        const totalBar = itensBar.reduce((acc, i) => acc + (i.preco_total * i.qtd), 0);
        const sqlBar = `INSERT INTO pedidos (mesa, itens, total, status, hora, destino, data_iso) VALUES (?, ?, ?, 'PRONTO', ?, 'BAR', ?)`;
        db.run(sqlBar, [mesa, JSON.stringify(itensBar), totalBar, horaPedido, dataISO]);
    }

    if (itensCozinha.length > 0) {
        const totalCozinha = itensCozinha.reduce((acc, i) => acc + (i.preco_total * i.qtd), 0);
        const sqlCoz = `INSERT INTO pedidos (mesa, itens, total, status, hora, destino, data_iso) VALUES (?, ?, ?, 'PENDENTE', ?, 'COZINHA', ?)`;
        db.run(sqlCoz, [mesa, JSON.stringify(itensCozinha), totalCozinha, horaPedido, dataISO]);
    }

    res.json({ success: true });
});

// =========================================================================
// DASHBOARD BUSINESS INTELLIGENCE (FILTRAGEM DE PRECISÃO)
// =========================================================================
app.get('/admin/dashboard/stats', (req, res) => {
    const { range, start, end } = req.query;
    let sqlFiltro = "";

    if (range === 'hoje') {
        sqlFiltro = "AND data_iso = date('now')";
    } else if (range === 'semana') {
        sqlFiltro = "AND data_iso >= date('now', '-7 days')";
    } else if (range === '15dias') {
        sqlFiltro = "AND data_iso >= date('now', '-15 days')";
    } else if (range === '30dias') {
        sqlFiltro = "AND data_iso >= date('now', '-30 days')";
    } else if (range === 'custom' && start && end) {
        sqlFiltro = `AND data_iso BETWEEN '${start}' AND '${end}'`;
    }

    const queryBI = `SELECT * FROM pedidos WHERE status = "FINALIZADO" ${sqlFiltro}`;
    
    db.all(queryBI, (err, rows) => {
        if (err) {
            console.error("BI-ERROR: Erro no processamento do Dashboard:", err);
            return res.status(500).json(err);
        }

        const stats = { faturamentoTotal: 0, topProdutos: {}, calorMesas: {}, performanceGarcons: {}, tempoMedio: 0 };
        let countEntregas = 0;
        let somaTotalMinutos = 0;

        if (rows) {
            rows.forEach(p => {
                stats.faturamentoTotal += p.total;
                stats.calorMesas[p.mesa] = (stats.calorMesas[p.mesa] || 0) + p.total;
                
                try {
                    const itensRaw = JSON.parse(p.itens);
                    itensRaw.forEach(item => {
                        stats.topProdutos[item.nome] = (stats.topProdutos[item.nome] || 0) + item.qtd;
                    });
                } catch(e) { console.error("BI-ITEM-PARSER: Falha em leitura de itens JSON"); }

                if (p.garcom_nome && p.horario_entrega) {
                    if (!stats.performanceGarcons[p.garcom_nome]) {
                        stats.performanceGarcons[p.garcom_nome] = { entregas: 0, somaMinutos: 0 };
                    }
                    stats.performanceGarcons[p.garcom_nome].entregas += 1;
                    
                    try {
                        const [h1, m1] = p.hora.split(':');
                        const [h2, m2] = p.horario_entrega.split(':');
                        const diff = (parseInt(h2) * 60 + parseInt(m2)) - (parseInt(h1) * 60 + parseInt(m1));
                        if (diff > 0) {
                            stats.performanceGarcons[p.garcom_nome].somaMinutos += diff;
                            somaTotalMinutos += diff;
                            countEntregas++;
                        }
                    } catch(e) {}
                }
            });
            if(countEntregas > 0) stats.tempoMedio = Math.round(somaTotalMinutos / countEntregas);
        }
        res.json(stats);
    });
});

// =========================================================================
// GESTÃO DE INVENTÁRIO (MANUTENÇÃO INTEGRAL)
// =========================================================================

app.get('/produtos/:id', (req, res) => {
    const id = req.params.id;
    db.get("SELECT * FROM produtos WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: "Falha na base de dados" });
        if (!row) return res.status(404).json({ error: "Produto inexistente" });
        res.json(row);
    });
});

app.get('/produtos', (req, res) => {
    db.all("SELECT * FROM produtos ORDER BY nome ASC", (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows);
    });
});

app.post('/admin/produto/novo', (req, res) => {
    const { nome, preco, subcategoria, descricao, imagem, promocao } = req.body;
    const sqlNew = `INSERT INTO produtos (nome, preco, subcategoria, descricao, imagem, promocao, disponivel) VALUES (?, ?, ?, ?, ?, ?, 1)`;
    db.run(sqlNew, [nome, preco, subcategoria, descricao, imagem, promocao], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true });
    });
});

app.post('/admin/produto/update', (req, res) => {
    const { id, nome, preco, disponivel, promocao, subcategoria, descricao, imagem } = req.body;
    const sqlUp = `UPDATE produtos SET nome=?, preco=?, disponivel=?, promocao=?, subcategoria=?, descricao=?, imagem=? WHERE id=?`;
    db.run(sqlUp, [nome, preco, disponivel, promocao, subcategoria, descricao, imagem, id], function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

app.delete('/admin/produto/:id', (req, res) => {
    const id = req.params.id;
    db.serialize(() => {
        db.run('DELETE FROM adicionais WHERE produto_id = ?', [id]);
        db.run('DELETE FROM produtos WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ success: true });
        });
    });
});

// =========================================================================
// MÓDULO FINANCEIRO (CAIXA UNIFICADO)
// =========================================================================
app.get('/caixa/mesas', (req, res) => {
    db.all('SELECT * FROM pedidos WHERE status != "FINALIZADO" AND fechamento_id IS NULL ORDER BY mesa ASC', (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows || []);
    });
});

app.post('/caixa/reset', (req, res) => {
    const { mesa } = req.body;
    const fechamentoUnico = "UNIF-" + Date.now() + "-" + mesa;
    const dataISO = new Date().toISOString().split('T')[0];
    db.run(`UPDATE pedidos SET status = "FINALIZADO", fechamento_id = ?, data_iso = ? WHERE mesa = ? AND status != "FINALIZADO"`, 
        [fechamentoUnico, dataISO, mesa], function(err) {
            if (err) return res.status(500).json(err);
            res.json({ success: true, fechamento: fechamentoUnico });
        });
});

// =========================================================================
// GESTÃO DE EQUIPE E ADMIN
// =========================================================================
app.get('/admin/usuarios/lista', (req, res) => {
    db.all('SELECT id, nome, login, nivel FROM usuarios', (err, rows) => res.json(rows));
});

app.post('/admin/usuarios/novo', (req, res) => {
    const { nome, login, senha, nivel } = req.body;
    db.run('INSERT INTO usuarios (nome, login, senha, nivel) VALUES (?, ?, ?, ?)', [nome, login, senha, nivel], () => res.json({ success: true }));
});

app.delete('/admin/usuarios/:id', (req, res) => {
    db.run('DELETE FROM usuarios WHERE id = ?', [req.params.id], () => res.json({ success: true }));
});

app.get('/admin/vendas/lista', (req, res) => {
    const sqlListaVendas = `SELECT fechamento_id, mesa, hora, SUM(total) as total_venda, garcom_nome, status FROM pedidos WHERE status = "FINALIZADO" GROUP BY fechamento_id ORDER BY id DESC`;
    db.all(sqlListaVendas, (err, rows) => res.json(rows));
});

app.delete('/admin/vendas/excluir-sessao/:fid', (req, res) => {
    db.run('DELETE FROM pedidos WHERE fechamento_id = ?', [req.params.fid], () => res.json({ success: true }));
});

app.delete('/admin/vendas/zerar-tudo', (req, res) => {
    db.serialize(() => {
        db.run('DELETE FROM pedidos');
        db.run('DELETE FROM chamados');
        res.json({ success: true, message: "Banco de testes limpo." });
    });
});

// =========================================================================
// OPERAÇÕES DE PAINÉIS E STATUS (KDS / SALÃO)
// =========================================================================
app.get('/status-mesas', (req, res) => {
    db.all('SELECT DISTINCT mesa FROM pedidos WHERE status != "FINALIZADO"', (err, rows) => res.json(rows ? rows.map(r => r.mesa) : []));
});

app.get('/pedidos/cozinha', (req, res) => {
    db.all('SELECT * FROM pedidos WHERE destino = "COZINHA" AND status IN ("PENDENTE", "PREPARANDO") ORDER BY id ASC', (err, rows) => res.json(rows));
});

app.get('/pedidos/garcom', (req, res) => {
    db.all('SELECT * FROM pedidos WHERE status IN ("PRONTO", "ENTREGANDO") ORDER BY id ASC', (err, rows) => res.json(rows));
});

app.post('/pedidos/status', (req, res) => {
    const { id, status } = req.body;
    db.run('UPDATE pedidos SET status = ? WHERE id = ?', [status, id], () => res.json({ success: true }));
});

app.post('/garcom/assumir', (req, res) => {
    db.run('UPDATE pedidos SET status = "ENTREGANDO", garcom_nome = ? WHERE id = ? AND (garcom_nome IS NULL OR garcom_nome = "")', [req.body.garcom_nome, req.body.id], function() {
        if (this.changes === 0) return res.status(400).json({erro: "Já ocupado"});
        res.json({ success: true });
    });
});

app.post('/garcom/entregar', (req, res) => {
    db.run('UPDATE pedidos SET status = "ENTREGUE", horario_entrega = ? WHERE id = ?', [new Date().toLocaleTimeString(), req.body.id], () => res.json({ success: true }));
});

app.post('/chamados', (req, res) => {
    db.run("INSERT INTO chamados (mesa, hora, status) VALUES (?, ?, 'ABERTO')", [req.body.mesa, new Date().toLocaleTimeString()], () => res.json({ ok: true }));
});

app.get('/chamados/ativos', (req, res) => {
    db.all("SELECT * FROM chamados WHERE status = 'ABERTO'", (err, rows) => res.json(rows));
});

app.post('/chamados/atender', (req, res) => {
    db.run("UPDATE chamados SET status = 'ATENDIDO' WHERE id = ?", [req.body.id], () => res.json({ ok: true }));
});

// =========================================================================
// [MÓDULO DE AUDITORIA FORENSE v7.6]
// =========================================================================

app.get('/admin/vendas/:fid/detalhes', (req, res) => {
    const fid = req.params.fid;
    const sqlDetail = `SELECT mesa, itens, total, garcom_nome, hora FROM pedidos WHERE fechamento_id = ?`;
    db.all(sqlDetail, [fid], (err, rows) => {
        if (err) return res.status(500).json({ error: "Erro na auditoria da sessão" });
        res.json(rows || []);
    });
});

app.get('/admin/performance-vendas', (req, res) => {
    const sqlPerf = `
        SELECT 
            garcom_nome as auditoria, 
            COUNT(*) as total_atendimentos, 
            SUM(total) as faturamento_acumulado 
        FROM pedidos 
        WHERE status = "FINALIZADO" AND garcom_nome IS NOT NULL AND garcom_nome != ""
        GROUP BY garcom_nome 
        ORDER BY faturamento_acumulado DESC`;
    
    db.all(sqlPerf, [], (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows || []);
    });
});

app.post('/admin/usuarios/novo-acesso', (req, res) => {
    const { nome, login, senha, nivel } = req.body;
    const sqlNew = 'INSERT INTO usuarios (nome, login, senha, nivel) VALUES (?, ?, ?, ?)';
    db.run(sqlNew, [nome, login, senha, nivel], function(err) {
        if (err) return res.status(400).json({ success: false, message: "Login em uso" });
        res.json({ success: true, id: this.lastID });
    });
});

app.get('/adicionais/:produto_id', (req, res) => db.all('SELECT * FROM adicionais WHERE produto_id = ?', [req.params.produto_id], (err, rows) => res.json(rows)));
app.post('/admin/adicionais/novo', (req, res) => db.run('INSERT INTO adicionais (produto_id, nome, preco) VALUES (?, ?, ?)', [req.body.produto_id, req.body.nome, req.body.preco], () => res.json({ success: true })));
app.delete('/admin/adicionais/:id', (req, res) => db.run('DELETE FROM adicionais WHERE id = ?', [req.params.id], () => res.json({ success: true })));

const SERVER_PORT = process.env.PORT || 3000;
// O '0.0.0.0' é a chave para o Railway enxergar sua API
app.listen(SERVER_PORT, '0.0.0.0', () => {
    console.log(`
    ========================================================================
    🚀 SOLUTIONS QR: SISTEMA DE INTELIGÊNCIA OPERACIONAL v7.6
    📊 NÚCLEO BI: ATIVO (ROTA PERFORMANCE E DETALHES SOLDADAS)
    ⚙️ REPARO DE INVENTÁRIO: ROTA UPDATE INTEGRADA COM SUCESSO
    ========================================================================
    `);
});

// v2