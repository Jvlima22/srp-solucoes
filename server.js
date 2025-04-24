// server.js

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();  // Carregar variáveis de ambiente a partir de um arquivo .env, se existir

const app = express();

// Middlewares
app.use(express.json());  // Para processar o corpo das requisições em formato JSON
app.use(cors());  // Permitir requisições de diferentes origens (necessário para o React Native)

// Configuração do banco de dados
const db = mysql.createConnection({
  host: "170.81.43.172",
  user: "srpsoluc_mobile",
  password: "TgfatatOOO#1254@yw",
  database: "srpsoluc_teste",
  port: 3306,
});

// Testar conexão com o banco de dados
db.connect((err) => {
  if (err) {
    console.error("❌ Erro ao conectar ao MySQL:", err.message);
    return;
  }
  console.log("✅ Conectado ao MySQL!");
});

// Rota para testar a conexão
app.get("/", (req, res) => {
  res.send("Servidor está funcionando! Acesse /usuarios para interagir com os dados.");
});

// ==================== CRUD para a tabela 'minuta' ==================== //

// ✅ Listar todas as minutas
app.get("/minuta", (req, res) => {
  const sql = "SELECT * FROM minuta";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao listar minutas:", err.message);
      return res.status(500).json({ error: "Erro ao listar minutas" });
    }
    res.status(200).json(results);
  });
});

// ✅ Criar nova minuta
app.post("/minuta", (req, res) => {
  const data = req.body;

  // Verificar se os dados essenciais estão presentes
  if (!data.tipo || !data.data || !data.id_tipo_minuta || !data.id_unidade) {
    return res.status(400).json({ error: "Dados obrigatórios faltando" });
  }

  console.log("📥 Nova minuta recebida:", data); // Log para depuração
  
  const sql = "INSERT INTO minuta SET ?";
  db.query(sql, data, (err, results) => {
    if (err) {
      console.error("Erro ao criar minuta:", err.message);
      return res.status(500).json({ error: "Erro ao criar minuta", details: err.message });
    }
    console.log("📊 Minuta criada com ID:", results.insertId);
    res.status(201).json({ message: "Minuta criada com sucesso", minutaId: results.insertId });
  });
});

// Buscar uma minuta por ID
app.get("/minuta/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM minuta WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Erro ao buscar minuta:", err.message);
      return res.status(500).json({ error: "Erro ao buscar minuta" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Minuta não encontrada" });
    }
    res.status(200).json(results[0]);
  });
});

// Atualizar uma minuta
app.put("/minuta/:id", (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const sql = "UPDATE minuta SET ? WHERE id = ?";
  db.query(sql, [data, id], (err, results) => {
    if (err) {
      console.error("Erro ao atualizar minuta:", err.message);
      return res.status(500).json({ error: "Erro ao atualizar minuta" });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Minuta não encontrada" });
    }
    res.status(200).json({ message: "Minuta atualizada com sucesso" });
  });
});

// Deletar uma minuta
app.delete("/minuta/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM minuta WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Erro ao deletar minuta:", err.message);
      return res.status(500).json({ error: "Erro ao deletar minuta" });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Minuta não encontrada" });
    }
    res.status(200).json({ message: "Minuta deletada com sucesso" });
  });
});

// ==================== CRUD para a tabela 'frete' ==================== //

// Listar todos os fretes
app.get("/fretes", (req, res) => {
  const sql = "SELECT * FROM frete";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao buscar fretes:", err.message);
      return res.status(500).json({ error: "Erro ao buscar fretes" });
    }
    res.status(200).json(results);
  });
});

// Buscar um frete por ID
app.get("/fretes/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM frete WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Erro ao buscar frete:", err.message);
      return res.status(500).json({ error: "Erro ao buscar frete" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Frete não encontrado" });
    }
    res.status(200).json(results[0]);
  });
});

// Criar novo frete
app.post("/fretes", (req, res) => {
  const data = req.body;
  const sql = "INSERT INTO frete SET ?";
  db.query(sql, data, (err, results) => {
    if (err) {
      console.error("Erro ao criar frete:", err.message);
      return res.status(500).json({ error: "Erro ao criar frete" });
    }
    res.status(201).json({ message: "Frete criado com sucesso", freteId: results.insertId });
  });
});

// Atualizar um frete
app.put("/fretes/:id", (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const sql = "UPDATE frete SET ? WHERE id = ?";
  db.query(sql, [data, id], (err, results) => {
    if (err) {
      console.error("Erro ao atualizar frete:", err.message);
      return res.status(500).json({ error: "Erro ao atualizar frete" });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Frete não encontrado" });
    }
    res.status(200).json({ message: "Frete atualizado com sucesso" });
  });
});

// Deletar um frete
app.delete("/fretes/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM frete WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Erro ao deletar frete:", err.message);
      return res.status(500).json({ error: "Erro ao deletar frete" });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Frete não encontrado" });
    }
    res.status(200).json({ message: "Frete deletado com sucesso" });
  });
});

// ==================== CRUD para a tabela 'frete_documento' ==================== //

// Listar todos os frete_documentos
app.get("/frete_documentos", (req, res) => {
  const sql = "SELECT * FROM frete_documento";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao buscar documentos:", err.message);
      return res.status(500).json({ error: "Erro ao buscar documentos" });
    }
    res.status(200).json(results);
  });
});

// Buscar um frete_documento por ID
app.get("/frete_documentos/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM frete_documento WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Erro ao buscar documento:", err.message);
      return res.status(500).json({ error: "Erro ao buscar documento" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Documento não encontrado" });
    }
    res.status(200).json(results[0]);
  });
});

// Criar novo frete_documento
app.post("/frete_documentos", (req, res) => {
  const data = req.body;
  const sql = "INSERT INTO frete_documento SET ?";
  db.query(sql, data, (err, results) => {
    if (err) {
      console.error("Erro ao criar documento:", err.message);
      return res.status(500).json({ error: "Erro ao criar documento" });
    }
    res.status(201).json({ message: "Documento criado com sucesso", documentoId: results.insertId });
  });
});

// Atualizar um frete_documento
app.put("/frete_documentos/:id", (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const sql = "UPDATE frete_documento SET ? WHERE id = ?";
  db.query(sql, [data, id], (err, results) => {
    if (err) {
      console.error("Erro ao atualizar documento:", err.message);
      return res.status(500).json({ error: "Erro ao atualizar documento" });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Documento não encontrado" });
    }
    res.status(200).json({ message: "Documento atualizado com sucesso" });
  });
});

// Deletar um frete_documento
app.delete("/frete_documentos/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM frete_documento WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Erro ao deletar documento:", err.message);
      return res.status(500).json({ error: "Erro ao deletar documento" });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Documento não encontrado" });
    }
    res.status(200).json({ message: "Documento deletado com sucesso" });
  });
});

// ==================== CRUD para a tabela 'historico_frete' ==================== //

// ✅ Listar todos os históricos
app.get("/historicos_frete", (req, res) => {
  const sql = "SELECT * FROM historico_frete";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao listar históricos:", err.message);
      return res.status(500).json({ error: "Erro ao listar históricos" });
    }
    res.status(200).json(results);
  });
});

// ✅ Criar novo histórico
app.post("/historicos_frete", (req, res) => {
  const data = req.body;

  // Verificar campos obrigatórios
  const obrigatorios = ['id_movimento', 'id_vinculado', 'tipo_movimento', 'descricao', 'data_historico', 'hora_historico', 'id_usuario'];
  const faltando = obrigatorios.filter(campo => !data[campo]);

  if (faltando.length > 0) {
    return res.status(400).json({ error: `Campos obrigatórios faltando: ${faltando.join(', ')}` });
  }

  data.dt_cadastro = new Date(); // adiciona a data atual

  const sql = "INSERT INTO historico_frete SET ?";
  db.query(sql, data, (err, results) => {
    if (err) {
      console.error("Erro ao criar histórico:", err.message);
      return res.status(500).json({ error: "Erro ao criar histórico" });
    }
    res.status(201).json({ message: "Histórico criado com sucesso", historicoId: results.insertId });
  });
});

// ✅ Buscar um histórico por ID
app.get("/historicos_frete/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM historico_frete WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Erro ao buscar histórico:", err.message);
      return res.status(500).json({ error: "Erro ao buscar histórico" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Histórico não encontrado" });
    }
    res.status(200).json(results[0]);
  });
});

// ✅ Atualizar um histórico
app.put("/historicos_frete/:id", (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const sql = "UPDATE historico_frete SET ? WHERE id = ?";
  db.query(sql, [data, id], (err, results) => {
    if (err) {
      console.error("Erro ao atualizar histórico:", err.message);
      return res.status(500).json({ error: "Erro ao atualizar histórico" });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Histórico não encontrado" });
    }
    res.status(200).json({ message: "Histórico atualizado com sucesso" });
  });
});

// ✅ Deletar um histórico
app.delete("/historicos_frete/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM historico_frete WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Erro ao deletar histórico:", err.message);
      return res.status(500).json({ error: "Erro ao deletar histórico" });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Histórico não encontrado" });
    }
    res.status(200).json({ message: "Histórico deletado com sucesso" });
  });
});

// ==================== CRUD para a tabela 'coleta' ==================== //

// ✅ Listar todas as coletas
app.get("/coleta", (req, res) => {
  const sql = "SELECT * FROM coleta";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao listar coletas:", err.message);
      return res.status(500).json({ error: "Erro ao listar coletas" });
    }
    res.status(200).json(results);
  });
});

// ✅ Criar nova coleta
app.post("/coleta", (req, res) => {
  const data = req.body;

  // Verificar campos obrigatórios
  const obrigatorios = ['tipo', 'id_unidade', 'data', 'hora', 'id_cliente', 'id_usuario'];
  const faltando = obrigatorios.filter(campo => !data[campo]);

  if (faltando.length > 0) {
    return res.status(400).json({ error: `Campos obrigatórios faltando: ${faltando.join(', ')}` });
  }

  data.dt_cadastro = new Date();
  data.dt_modificacao = new Date();

  const sql = "INSERT INTO coleta SET ?";
  db.query(sql, data, (err, results) => {
    if (err) {
      console.error("Erro ao criar coleta:", err.message);
      return res.status(500).json({ error: "Erro ao criar coleta" });
    }
    res.status(201).json({ message: "Coleta criada com sucesso", coletaId: results.insertId });
  });
});

// ✅ Buscar uma coleta por ID
app.get("/coleta/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM coleta WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Erro ao buscar coleta:", err.message);
      return res.status(500).json({ error: "Erro ao buscar coleta" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Coleta não encontrada" });
    }
    res.status(200).json(results[0]);
  });
});

// ✅ Atualizar uma coleta
app.put("/coleta/:id", (req, res) => {
  const { id } = req.params;
  const data = req.body;
  data.dt_modificacao = new Date();

  const sql = "UPDATE coleta SET ? WHERE id = ?";
  db.query(sql, [data, id], (err, results) => {
    if (err) {
      console.error("Erro ao atualizar coleta:", err.message);
      return res.status(500).json({ error: "Erro ao atualizar coleta" });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Coleta não encontrada" });
    }
    res.status(200).json({ message: "Coleta atualizada com sucesso" });
  });
});

// ✅ Deletar uma coleta
app.delete("/coleta/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM coleta WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Erro ao deletar coleta:", err.message);
      return res.status(500).json({ error: "Erro ao deletar coleta" });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Coleta não encontrada" });
    }
    res.status(200).json({ message: "Coleta deletada com sucesso" });
  });
});

// ==================== CRUD para a tabela 'historico_coleta' ==================== //

// ✅ Listar todos os históricos de coleta
app.get("/historico_coleta", (req, res) => {
  const sql = "SELECT * FROM historico_coleta";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao listar históricos de coleta:", err.message);
      return res.status(500).json({ error: "Erro ao listar históricos de coleta" });
    }
    res.status(200).json(results);
  });
});

// ✅ Criar novo histórico de coleta
app.post("/historico_coleta", (req, res) => {
  const data = req.body;

  // Verificar campos obrigatórios
  const obrigatorios = ['id_movimento', 'id_vinculado', 'tipo_movimento', 'descricao', 'data_historico', 'hora_historico', 'id_usuario'];
  const faltando = obrigatorios.filter(campo => !data[campo]);

  if (faltando.length > 0) {
    return res.status(400).json({ error: `Campos obrigatórios faltando: ${faltando.join(', ')}` });
  }

  data.dt_cadastro = new Date();

  const sql = "INSERT INTO historico_coleta SET ?";
  db.query(sql, data, (err, results) => {
    if (err) {
      console.error("Erro ao criar histórico de coleta:", err.message);
      return res.status(500).json({ error: "Erro ao criar histórico de coleta" });
    }
    res.status(201).json({ message: "Histórico de coleta criado com sucesso", historicoId: results.insertId });
  });
});

// ✅ Buscar um histórico de coleta por ID
app.get("/historico_coleta/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM historico_coleta WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Erro ao buscar histórico de coleta:", err.message);
      return res.status(500).json({ error: "Erro ao buscar histórico de coleta" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Histórico de coleta não encontrado" });
    }
    res.status(200).json(results[0]);
  });
});

// ✅ Atualizar um histórico de coleta
app.put("/historico_coleta/:id", (req, res) => {
  const { id } = req.params;
  const data = req.body;
  data.dt_cadastro = new Date();

  const sql = "UPDATE historico_coleta SET ? WHERE id = ?";
  db.query(sql, [data, id], (err, results) => {
    if (err) {
      console.error("Erro ao atualizar histórico de coleta:", err.message);
      return res.status(500).json({ error: "Erro ao atualizar histórico de coleta" });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Histórico de coleta não encontrado" });
    }
    res.status(200).json({ message: "Histórico de coleta atualizado com sucesso" });
  });
});

// ✅ Deletar um histórico de coleta
app.delete("/historico_coleta/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM historico_coleta WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Erro ao deletar histórico de coleta:", err.message);
      return res.status(500).json({ error: "Erro ao deletar histórico de coleta" });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Histórico de coleta não encontrado" });
    }
    res.status(200).json({ message: "Histórico de coleta deletado com sucesso" });
  });
});

// ==================== CRUD para a tabela 'comprovante_movimento' ==================== //

// ✅ Listar todos os comprovantes de movimento
app.get("/comprovante_movimento", (req, res) => {
  const sql = "SELECT * FROM comprovante_movimento";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao listar comprovantes de movimento:", err.message);
      return res.status(500).json({ error: "Erro ao listar comprovantes de movimento" });
    }
    res.status(200).json(results);
  });
});

// ✅ Criar novo comprovante de movimento
app.post("/comprovante_movimento", (req, res) => {
  const data = req.body;

  // Verificar campos obrigatórios
  const obrigatorios = ['id_movimento', 'id_tipo_movimento', 'arquivo', 'id_usuario'];
  const faltando = obrigatorios.filter(campo => !data[campo]);

  if (faltando.length > 0) {
    return res.status(400).json({ error: `Campos obrigatórios faltando: ${faltando.join(', ')}` });
  }

  data.dt_cadastro = new Date();

  const sql = "INSERT INTO comprovante_movimento SET ?";
  db.query(sql, data, (err, results) => {
    if (err) {
      console.error("Erro ao criar comprovante de movimento:", err.message);
      return res.status(500).json({ error: "Erro ao criar comprovante de movimento" });
    }
    res.status(201).json({ message: "Comprovante de movimento criado com sucesso", comprovanteId: results.insertId });
  });
});

// ✅ Buscar um comprovante de movimento por ID
app.get("/comprovante_movimento/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM comprovante_movimento WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Erro ao buscar comprovante de movimento:", err.message);
      return res.status(500).json({ error: "Erro ao buscar comprovante de movimento" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Comprovante de movimento não encontrado" });
    }
    res.status(200).json(results[0]);
  });
});

// ✅ Atualizar um comprovante de movimento
app.put("/comprovante_movimento/:id", (req, res) => {
  const { id } = req.params;
  const data = req.body;
  data.dt_cadastro = new Date();

  const sql = "UPDATE comprovante_movimento SET ? WHERE id = ?";
  db.query(sql, [data, id], (err, results) => {
    if (err) {
      console.error("Erro ao atualizar comprovante de movimento:", err.message);
      return res.status(500).json({ error: "Erro ao atualizar comprovante de movimento" });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Comprovante de movimento não encontrado" });
    }
    res.status(200).json({ message: "Comprovante de movimento atualizado com sucesso" });
  });
});

// ✅ Deletar um comprovante de movimento
app.delete("/comprovante_movimento/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM comprovante_movimento WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Erro ao deletar comprovante de movimento:", err.message);
      return res.status(500).json({ error: "Erro ao deletar comprovante de movimento" });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Comprovante de movimento não encontrado" });
    }
    res.status(200).json({ message: "Comprovante de movimento deletado com sucesso" });
  });
});

// ==================== CRUD para a tabela 'ocorrencia_movimento' ==================== //

// ✅ Listar todas as ocorrências de movimento
app.get("/ocorrencia_movimento", (req, res) => {
  const sql = "SELECT * FROM ocorrencia_movimento";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao listar ocorrências de movimento:", err.message);
      return res.status(500).json({ error: "Erro ao listar ocorrências de movimento" });
    }
    res.status(200).json(results);
  });
});

// Criar nova ocorrência de movimento
app.post("/ocorrencia_movimento", (req, res) => {
  const data = req.body;

  // Verificar campos obrigatórios corretamente (permitindo 0)
  const obrigatorios = ['id_movimento', 'id_tipo_movimento', 'id_usuario'];
  const faltando = obrigatorios.filter(campo => data[campo] === undefined || data[campo] === null);

  if (faltando.length > 0) {
    return res.status(400).json({ error: `Campos obrigatórios faltando: ${faltando.join(', ')}` });
  }

  data.dt_cadastro = new Date();

  const sql = "INSERT INTO ocorrencia_movimento SET ?";
  db.query(sql, data, (err, results) => {
    if (err) {
      console.error("Erro ao criar ocorrência de movimento:", err.message);
      return res.status(500).json({ error: "Erro ao criar ocorrência de movimento" });
    }
    res.status(201).json({ message: "Ocorrência de movimento criada com sucesso", ocorrenciaId: results.insertId });
  });
});

// ✅ Buscar uma ocorrência de movimento por ID
app.get("/ocorrencia_movimento/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM ocorrencia_movimento WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Erro ao buscar ocorrência de movimento:", err.message);
      return res.status(500).json({ error: "Erro ao buscar ocorrência de movimento" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Ocorrência de movimento não encontrada" });
    }
    res.status(200).json(results[0]);
  });
});

// ✅ Atualizar uma ocorrência de movimento
app.put("/ocorrencia_movimento/:id", (req, res) => {
  const { id } = req.params;
  const data = req.body;
  data.dt_cadastro = new Date();

  const sql = "UPDATE ocorrencia_movimento SET ? WHERE id = ?";
  db.query(sql, [data, id], (err, results) => {
    if (err) {
      console.error("Erro ao atualizar ocorrência de movimento:", err.message);
      return res.status(500).json({ error: "Erro ao atualizar ocorrência de movimento" });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Ocorrência de movimento não encontrada" });
    }
    res.status(200).json({ message: "Ocorrência de movimento atualizada com sucesso" });
  });
});

// ✅ Deletar uma ocorrência de movimento
app.delete("/ocorrencia_movimento/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM ocorrencia_movimento WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Erro ao deletar ocorrência de movimento:", err.message);
      return res.status(500).json({ error: "Erro ao deletar ocorrência de movimento" });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Ocorrência de movimento não encontrada" });
    }
    res.status(200).json({ message: "Ocorrência de movimento deletada com sucesso" });
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
