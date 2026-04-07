const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'database.db'));

db.serialize(() => {
    // 1. Primeiro, vamos garantir que a categoria 'Porções' existe
    db.run("INSERT OR IGNORE INTO categorias (nome) VALUES ('Porções')");
    db.run("INSERT OR IGNORE INTO categorias (nome) VALUES ('Bebidas')");

    // 2. Agora vamos mover os produtos para as categorias certas
    // Ajusta a Tilápia e o Contra Filé para 'Porções'
    db.run(`
        UPDATE produtos 
        SET categoria_id = (SELECT id FROM categorias WHERE nome = 'Porções')
        WHERE nome LIKE '%Tilapia%' OR nome LIKE '%Contra%'
    `);

    // Ajusta a Coca para 'Bebidas'
    db.run(`
        UPDATE produtos 
        SET categoria_id = (SELECT id FROM categorias WHERE nome = 'Bebidas')
        WHERE nome LIKE '%Coca%'
    `);

    console.log("✅ Banco de dados atualizado com sucesso!");
    console.log("Tilápia e Contra Filé -> Porções");
    console.log("Coca Cola -> Bebidas");
});

db.close();