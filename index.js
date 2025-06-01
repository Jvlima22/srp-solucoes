// server.js

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());


// Configuração do banco de dados
const db = mysql.createConnection({
  host: "170.81.43.172",
  user: "srpsoluc_mobile",
  password: "TgfatatOOO#1254@yw",
  database: "srpsoluc_teste",
  port: 3306,
});

db.connect((err) => {
  if (err) {
    console.error("❌ Erro ao conectar ao MySQL:", err.message);
    return;
  }
  console.log("✅ Conectado ao MySQL!");
});


// ==================== Rotas da interface LOGIN ==================== //

app.post("/login", (req, res) => {
  const { login, senha, unidade } = req.body;

  if (!login || !senha || !unidade) {
    return res.status(400).json({ error: "Campos obrigatórios: login, senha, unidade" });
  }

  const senhaMD5 = require("crypto")
    .createHash("md5")
    .update(senha)
    .digest("hex");

  const sql = `
    SELECT 
      us.id,
      us.nome,
      us.login,
      tu.nome AS nome_unidade
    FROM srpsoluc_teste.usuario_sistema us
    JOIN srpsoluc_tmenu.tipo_usuario tu ON us.id_unidade = tu.id
    WHERE us.login = ? AND us.senha = ? AND tu.nome = ? AND us.status = 1
  `;

  db.query(sql, [login, senhaMD5, unidade.toUpperCase()], (err, results) => {
    if (err) {
      console.error("Erro ao validar login:", err.message);
      return res.status(500).json({ error: "Erro interno no servidor" });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "Credenciais inválidas ou usuário inativo" });
    }

    const { id, nome, login: usuarioLogin, nome_unidade } = results[0];

    res.status(200).json({
      message: "Login realizado com sucesso",
      usuario: {
        id,
        nome,
        login: usuarioLogin,
        nome_unidade,
        unidade
      }
    });
  });
});

app.get("/usuarios", (req, res) => {
  const sql = `
    SELECT
      us.id,
      us.nome,
      us.login,
      us.id_unidade,
      uc.etiqueta AS nome_unidade,
      us.status,
      us.perfil,
      us.nivel_acesso,
      us.dt_cadastro,
      us.dt_modificacao
    FROM usuario_sistema us
    JOIN unidade_configuracao uc ON uc.id = us.id_unidade
    ORDER BY us.nome ASC;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao buscar usuários:", err.message);
      return res.status(500).json({ error: "Erro ao buscar usuários" });
    }

    res.status(200).json(results);
  });
});

// ==================== Rotas da interface MANIFESTO ==================== //

app.get("/manifestos", (req, res) => {
  const sql = `
    SELECT
      mm.id_manifesto,
      CONCAT('Manifesto ', mm.id_manifesto) AS manifesto,

      SUM(CASE WHEN f.tipo = 13 THEN 1 ELSE 0 END) AS total_entregas,
      SUM(CASE WHEN f.tipo = 13 AND f.status = 1 THEN 1 ELSE 0 END) AS entregas_concluidas,

      SUM(CASE WHEN c.tipo = 3 THEN 1 ELSE 0 END) AS total_coletas,
      SUM(CASE WHEN c.tipo = 3 AND c.status = 1 THEN 1 ELSE 0 END) AS coletas_concluidas,

      SUM(CASE WHEN c.tipo = 2 THEN 1 ELSE 0 END) AS total_retiradas,
      SUM(CASE WHEN c.tipo = 2 AND c.status = 1 THEN 1 ELSE 0 END) AS retiradas_concluidas,

      SUM(CASE WHEN f.tipo = 14 THEN 1 ELSE 0 END) AS total_transferencias,
      SUM(CASE WHEN f.tipo = 14 AND f.status = 1 THEN 1 ELSE 0 END) AS transferencias_concluidas

    FROM manifesto_movimento mm
    LEFT JOIN frete f ON mm.id_movimento = f.id AND mm.id_tipo_movimento = 1
    LEFT JOIN coleta c ON mm.id_movimento = c.id AND mm.id_tipo_movimento = 2
    GROUP BY mm.id_manifesto
    ORDER BY mm.id_manifesto DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao buscar dados do manifesto:", err.message);
      return res.status(500).json({ error: "Erro ao buscar dados do manifesto" });
    }

    const data = results.map(row => ({
      id_manifesto: row.id_manifesto,
      entrega: `${row.total_entregas} / ${row.entregas_concluidas}`,
      coleta: `${row.total_coletas} / ${row.coletas_concluidas}`,
      retirada: `${row.total_retiradas} / ${row.retiradas_concluidas}`,
      transferencia: `${row.total_transferencias} / ${row.transferencias_concluidas}`,
      despacho: `0 / 0` 
    }));

    res.status(200).json(data);
  });
});

// ==================== Rota da interface OCORRÊNCIAS  ==================== //

app.get("/manifestos/ocorrencias/:id", async (req, res) => {
  const manifestoId = req.params.id;

  const tipos = {
    13: "entrega",
    12: "coleta",
    6: "despacho",
    5: "retirada",
    7: "transferencia"
  };

  const sql = `
    SELECT 
      f.id AS frete_id,
      f.numero_cte,
      f.contato_destinatario,
      f.id_local_destino,
      f.id_cliente,
      f.status,
      f.volume,
      f.tipo,
      fd.numero AS numero_documento,
      COUNT(fd.id) AS total_documento,
      COALESCE(om.id, 0) AS tem_ocorrencia
    FROM frete f
    LEFT JOIN frete_documento fd ON fd.id_frete = f.id
    LEFT JOIN ocorrencia_movimento om ON om.id_movimento = f.id
    WHERE f.id_manifesto = ?
    GROUP BY f.id;
  `;

  db.query(sql, [manifestoId], (err, results) => {
    if (err) {
      console.error("Erro ao buscar dados do manifesto:", err.message);
      return res.status(500).json({ error: "Erro ao buscar dados do manifesto" });
    }

    const formatado = results.map(item => {
      const tipo = parseInt(item.tipo);
      const tipoNome = tipos[tipo] || `tipo_${tipo}`;

      switch (tipo) {
        case 13: // ENTREGA
          return {
            tipo: "entrega",
            documento: item.numero_documento,
            frete: item.frete_id,
            cte: item.numero_cte === 0 ? "Sem informação" : item.numero_cte,
            destinatario: item.contato_destinatario,
            cidade: "DIADEMA",
            uf: "SP",
            status: item.status === 1 ? "EM ABERTO" : "OUTRO",
            ocorrencia: item.tem_ocorrencia ? "Com Registro" : "Sem Registro"
          };
        case 12: // COLETA
          return {
            tipo: "coleta",
            coleta_numero: item.frete_id,
            total_documento: item.total_documento,
            local: `Cliente ID ${item.id_cliente}`,
            cidade: "São Paulo",
            uf: "SP",
            status: item.status === 2 ? "EM TRANSITO" : "OUTRO"
          };
        case 6: // DESPACHO
          return {
            tipo: "despacho",
            minuta_numero: item.frete_id,
            total_frete: 1,
            total_documento: item.total_documento,
            total_volume: item.volume,
            local: "Cia teste de sistema",
            cidade: "JUNDIAÍ",
            uf: "SP",
            status: item.status === 4 ? "EM ABERTO" : "OUTRO"
          };
        case 5: // RETIRADA
          return {
            tipo: "retirada",
            minuta_numero: item.frete_id,
            total_frete: 2,
            total_documento: item.total_documento,
            total_volume: item.volume,
            local: "Cia teste de sistema",
            cidade: "JUNDIAÍ",
            uf: "SP",
            status: item.status === 4 ? "EM ABERTO" : "OUTRO"
          };
        case 7: // TRANSFERÊNCIA
          return {
            tipo: "transferencia",
            minuta_numero: item.frete_id,
            total_frete: 2,
            total_documento: item.total_documento,
            total_volume: item.volume,
            local: "Unidade de teste sistema",
            cidade: "AMARANTE",
            uf: "PI",
            status: item.status === 4 ? "EM ABERTO" : "OUTRO"
          };
        default:
          // Para tipos fora dos principais
          return {
            tipo: tipoNome,
            frete: item.frete_id,
            status: `Status ${item.status}`,
            documentos: item.total_documento
          };
      }
    });

    res.status(200).json(formatado);
  });
});

// ==================== Rota de LANÇAR OCORRÊNCIA DA ENTREGA ==================== //

// Listar detalhes da entrega ✅
app.get("/detalhes/entrega/:freteId", (req, res) => {
  const { freteId } = req.params;

  const sql = `
    SELECT 
      om.id AS numero,
      om.id_movimento AS frete,
      o.nome AS ocorrencia,
      DATE_FORMAT(om.data_ocorrencia, '%d/%m/%Y') AS data,
      TIME_FORMAT(om.hora_ocorrencia, '%H:%i') AS hora
    FROM ocorrencia_movimento om
    LEFT JOIN ocorrencia o ON o.id = om.id_ocorrencia
    WHERE om.id_movimento = ?
    ORDER BY om.data_ocorrencia DESC, om.hora_ocorrencia DESC
  `;

  db.query(sql, [freteId], (err, results) => {
    if (err) {
      console.error("Erro ao buscar ocorrências de entrega:", err.message);
      return res.status(500).json({ error: "Erro ao buscar ocorrências" });
    }

    res.status(200).json(results);
  });
});

// Atualizar ocorrência de entrega
app.put("/ocorrencia/entrega/:freteId", async (req, res) => {
  const { freteId } = req.params;
  const {
    ocorrencia,
    data_ocorrencia,
    hora_ocorrencia,
    observacao,
    recebedor,
    documento_recebedor,
    id_tipo_recebedor,
    arquivo
  } = req.body;

  const ocorrenciasRestritas = [
    "Aguardado no local",
    "Cliente recusou a entrega",
    "Entrega cancelada pelo cliente"
  ];

  // Validação para ocorrências restritas - só pode atualizar se tiver exatamente esses campos no body
  if (ocorrenciasRestritas.includes(ocorrencia)) {
    // Verifica campos obrigatórios
    if (!data_ocorrencia || !hora_ocorrencia || !observacao) {
      return res.status(400).json({
        error: 'Para essa ocorrência é obrigatório informar data_ocorrencia, hora_ocorrencia e observacao.'
      });
    }

    // Verifica se existe algum campo extra além desses quatro (ocorrencia + os 3)
    const chavesBody = Object.keys(req.body);
    const chavesPermitidas = ["ocorrencia", "data_ocorrencia", "hora_ocorrencia", "observacao"];
    const temCampoExtra = chavesBody.some(chave => !chavesPermitidas.includes(chave));

    if (temCampoExtra) {
      return res.status(400).json({
        error: 'Para essa ocorrência, o body deve conter somente ocorrencia, data_ocorrencia, hora_ocorrencia e observacao.'
      });
    }
  }

  // Para ocorrência "entrega realizado normalmente" permite outros campos
  if (ocorrencia === "entrega realizado normalmente") {
    // Apenas certifique que os campos principais estejam presentes (se quiser)
    if (!data_ocorrencia || !hora_ocorrencia) {
      return res.status(400).json({
        error: 'Para "entrega realizado normalmente", data_ocorrencia e hora_ocorrencia são obrigatórios.'
      });
    }
  }

  // Para outras ocorrências que não estejam na lista e não sejam "entrega realizado normalmente", negar
  const ocorrenciasValidas = [...ocorrenciasRestritas, "entrega realizado normalmente"];
  if (!ocorrenciasValidas.includes(ocorrencia)) {
    return res.status(400).json({
      error: `Ocorrência "${ocorrencia}" não permitida para atualização.`
    });
  }

  let id_ocorrencia;
  switch (ocorrencia) {
    case "Aguardado no local":
      id_ocorrencia = 1;
      break;
    case "Cliente recusou a entrega":
      id_ocorrencia = 2;
      break;
    case "Entrega cancelada pelo cliente":
      id_ocorrencia = 3;
      break;
    case "entrega realizado normalmente":
      id_ocorrencia = 4;
      break;
    default:
      id_ocorrencia = 99;
  }

  const dt_atualizacao = new Date();

  try {
    // Atualiza a ocorrência mais recente relacionada ao frete
    const sqlUpdateOcorrencia = `
      UPDATE ocorrencia_movimento
      SET
        id_ocorrencia = ?,
        data_ocorrencia = ?,
        hora_ocorrencia = ?,
        observacao = ?,
        dt_cadastro = ?
      WHERE id_movimento = ? AND id_tipo_movimento = 4 AND id_documento = 2
      ORDER BY dt_cadastro DESC
      LIMIT 1
    `;

    await db.execute(sqlUpdateOcorrencia, [
      id_ocorrencia,
      data_ocorrencia || null,
      hora_ocorrencia || null,
      observacao || null,
      dt_atualizacao,
      freteId
    ]);

    // Atualiza a tabela frete_documento
    const sqlAtualizaFreteDocumento = `
      UPDATE frete_documento
      SET
        recebedor = ?,
        documento_recebedor = ?,
        id_tipo_recebedor = ?,
        id_ocorrencia = ?,
        dt_cadastro = ?
      WHERE id_frete = ?
    `;

    await db.execute(sqlAtualizaFreteDocumento, [
      recebedor || null,
      documento_recebedor || null,
      id_tipo_recebedor || null,
      id_ocorrencia,
      dt_atualizacao,
      freteId
    ]);

    res.status(200).json({ message: `Ocorrência "${ocorrencia}" atualizada com sucesso!` });
  } catch (error) {
    console.error('Erro ao atualizar ocorrência:', error);
    res.status(500).json({ error: 'Erro ao atualizar ocorrência.' });
  }
});

// ==================== Rota de LANÇAR OCORRÊNCIA DA COLETA ==================== //

// Listar detalhes da coleta ✅
app.get("/detalhes/coleta/:freteId", async (req, res) => {
  const freteId = req.params.freteId;

  const sql = `
    SELECT 
      om.id,
      om.data_ocorrencia,
      om.hora_ocorrencia,
      o.nome AS ocorrencia
    FROM ocorrencia_movimento om
    LEFT JOIN ocorrencia o ON o.id = om.id_ocorrencia
    WHERE om.id_movimento = ?
    ORDER BY om.data_ocorrencia ASC, om.hora_ocorrencia ASC
  `;

  db.query(sql, [freteId], (err, results) => {
    if (err) {
      console.error("Erro ao buscar ocorrências da coleta:", err.message);
      return res.status(500).json({ error: "Erro ao buscar ocorrências da coleta" });
    }

    const ocorrencias = results.length > 0
      ? results.map((item, index) => {
          const dataFormatada = new Date(item.data_ocorrencia).toLocaleDateString("pt-BR");
          const horaFormatada = item.hora_ocorrencia?.slice(0, 5) || "-";
          return {
            numero: index + 1,
            documento: freteId,
            ocorrencia: item.ocorrencia || "Sem Registro",
            data: dataFormatada,
            hora: horaFormatada
          };
        })
      : [{
          numero: 1,
          documento: freteId,
          ocorrencia: "Sem Registro",
          data: "-",
          hora: "-"
        }];

    res.status(200).json(ocorrencias);
  });
});

// Atualizar ocorrência de coleta
app.put("/ocorrencia/coleta/:freteId", async (req, res) => {
  const { freteId } = req.params;
  const {
    ocorrencia,
    data_ocorrencia,
    hora_ocorrencia,
    observacao,
    recebedor,
    documento_recebedor,
    id_tipo_recebedor,
    arquivo
  } = req.body;

  const ocorrenciasRestritas = ["coleta cancelada", "Filial"];
  const ocorrenciaNormal = "Coleta realizado normalmente";

  // Validação para ocorrências restritas
  if (ocorrenciasRestritas.includes(ocorrencia)) {
    if (!data_ocorrencia || !hora_ocorrencia || !observacao) {
      return res.status(400).json({
        error: 'Para essa ocorrência é obrigatório informar data_ocorrencia, hora_ocorrencia e observacao.'
      });
    }

    const chavesBody = Object.keys(req.body);
    const chavesPermitidas = ["ocorrencia", "data_ocorrencia", "hora_ocorrencia", "observacao"];
    const temCampoExtra = chavesBody.some(chave => !chavesPermitidas.includes(chave));

    if (temCampoExtra) {
      return res.status(400).json({
        error: 'Para essa ocorrência, o body deve conter somente ocorrencia, data_ocorrencia, hora_ocorrencia e observacao.'
      });
    }
  }

  // Validação para "Coleta realizado normalmente"
  if (ocorrencia === ocorrenciaNormal) {
    if (!data_ocorrencia || !hora_ocorrencia || !observacao || !recebedor || !documento_recebedor || !id_tipo_recebedor || !arquivo) {
      return res.status(400).json({
        error: 'Para "Coleta realizado normalmente", todos os campos são obrigatórios.'
      });
    }
  }

  // Se a ocorrência não for válida, rejeita
  const ocorrenciasValidas = [...ocorrenciasRestritas, ocorrenciaNormal];
  if (!ocorrenciasValidas.includes(ocorrencia)) {
    return res.status(400).json({
      error: `Ocorrência "${ocorrencia}" não permitida para atualização.`
    });
  }

  // Mapeia ocorrência para id_ocorrencia
  let id_ocorrencia;
  switch (ocorrencia) {
    case "coleta cancelada":
      id_ocorrencia = 10;
      break;
    case "Filial":
      id_ocorrencia = 11;
      break;
    case "Coleta realizado normalmente":
      id_ocorrencia = 12;
      break;
    default:
      id_ocorrencia = 99;
  }

  const dt_atualizacao = new Date();

  try {
    // Atualiza a ocorrência mais recente relacionada à coleta (id_tipo_movimento = 5)
    const sqlUpdateOcorrencia = `
      UPDATE ocorrencia_movimento
      SET
        id_ocorrencia = ?,
        data_ocorrencia = ?,
        hora_ocorrencia = ?,
        observacao = ?,
        dt_cadastro = ?
      WHERE id_movimento = ? AND id_tipo_movimento = 5 AND id_documento = 2
      ORDER BY dt_cadastro DESC
      LIMIT 1
    `;

    await db.execute(sqlUpdateOcorrencia, [
      id_ocorrencia,
      data_ocorrencia || null,
      hora_ocorrencia || null,
      observacao || null,
      dt_atualizacao,
      freteId
    ]);

    // Atualiza frete_documento, se aplicável
    if (ocorrencia === ocorrenciaNormal) {
      const sqlAtualizaFreteDocumento = `
        UPDATE frete_documento
        SET
          recebedor = ?,
          documento_recebedor = ?,
          id_tipo_recebedor = ?,
          id_ocorrencia = ?,
          dt_cadastro = ?
        WHERE id_frete = ?
      `;

      await db.execute(sqlAtualizaFreteDocumento, [
        recebedor || null,
        documento_recebedor || null,
        id_tipo_recebedor || null,
        id_ocorrencia,
        dt_atualizacao,
        freteId
      ]);
    }

    res.status(200).json({ message: `Ocorrência de coleta "${ocorrencia}" atualizada com sucesso!` });
  } catch (error) {
    console.error('Erro ao atualizar ocorrência de coleta:', error);
    res.status(500).json({ error: 'Erro ao atualizar ocorrência de coleta.' });
  }
});

// ==================== Rota de LANÇAR OCORRÊNCIA DA DESPACHO ==================== //

// Listar detalhes do despacho ✅
app.get("/detalhes/despacho/:minutaId", async (req, res) => {
  const minutaId = req.params.minutaId;

  const sql = `
    SELECT 
      f.id AS minuta_numero,
      f.id AS frete,
      fd.numero AS documento,
      oco.nome AS ocorrencias,
      DATE_FORMAT(om.data_ocorrencia, '%Y-%m-%d') AS data,
      TIME_FORMAT(om.hora_ocorrencia, '%H:%i') AS hora
    FROM frete f
    LEFT JOIN frete_documento fd ON fd.id_frete = f.id
    LEFT JOIN ocorrencia_movimento om ON om.id_movimento = f.id
    LEFT JOIN ocorrencia oco ON oco.id = om.id_ocorrencia
    WHERE f.id = ?
    ORDER BY om.data_ocorrencia DESC, om.hora_ocorrencia DESC
    LIMIT 1
  `;

  db.query(sql, [minutaId], (err, results) => {
    if (err) {
      console.error("Erro ao buscar detalhes do despacho:", err.message);
      return res.status(500).json({ error: "Erro ao buscar detalhes do despacho" });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({ message: "Minuta não encontrada ou sem dados relacionados" });
    }

    const row = results[0];

    const response = {
      numero_minuta: row.minuta_numero,
      frete: row.frete,
      documento: row.documento || "",
      ocorrencias: row.ocorrencias || "",
      data: row.data || "",
      hora: row.hora || ""
    };

    res.status(200).json(response);
  });
});

// Atualizar ocorrência de despacho
app.put("/ocorrencia/despacho/:minutaId", async (req, res) => {
  const { minutaId } = req.params;
  const {
    ocorrencia,
    data_ocorrencia,
    hora_ocorrencia,
    observacao
  } = req.body;

  // Validação básica dos campos obrigatórios
  if (!ocorrencia || !data_ocorrencia || !hora_ocorrencia || !observacao) {
    return res.status(400).json({
      error: "Campos obrigatórios: ocorrencia, data_ocorrencia, hora_ocorrencia, observacao"
    });
  }

  try {
    // Busca o id_ocorrencia pelo nome da ocorrência no banco
    const [ocorrencias] = await db.promise().query(
      "SELECT id FROM ocorrencia WHERE LOWER(nome) = LOWER(?)",
      [ocorrencia]
    );

    if (!ocorrencias.length) {
      return res.status(400).json({ error: `Ocorrência "${ocorrencia}" não encontrada no banco.` });
    }

    const id_ocorrencia = ocorrencias[0].id;
    const dt_atualizacao = new Date();

    // Atualiza a ocorrência mais recente relacionada ao despacho (id_tipo_movimento = 4)
    const [result] = await db.promise().query(
      `
      UPDATE ocorrencia_movimento
      SET
        id_ocorrencia = ?,
        data_ocorrencia = ?,
        hora_ocorrencia = ?,
        observacao = ?,
        dt_cadastro = ?
      WHERE id_movimento = ? AND id_tipo_movimento = 4
      ORDER BY dt_cadastro DESC
      LIMIT 1
      `,
      [
        id_ocorrencia,
        data_ocorrencia,
        hora_ocorrencia,
        observacao,
        dt_atualizacao,
        minutaId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ocorrência de despacho não encontrada para atualizar." });
    }

    res.status(200).json({ message: `Ocorrência "${ocorrencia}" atualizada com sucesso!` });
  } catch (error) {
    console.error('Erro ao atualizar ocorrência de despacho:', error);
    res.status(500).json({ error: 'Erro ao atualizar ocorrência de despacho.' });
  }
});

// ==================== Rota de LANÇAR OCORRÊNCIA DA RETIRADA ==================== //

// Listar detalhes da retirada ✅
app.get("/detalhes/retirada/:minutaId", async (req, res) => {
  const minutaId = req.params.minutaId;

  const sql = `
    SELECT 
      f.id AS frete,
      fd.numero AS documento,
      oco.nome AS ocorrencia,
      DATE_FORMAT(om.data_ocorrencia, '%d/%m/%Y') AS data,
      TIME_FORMAT(om.hora_ocorrencia, '%H:%i') AS hora
    FROM frete f
    LEFT JOIN frete_documento fd ON fd.id_frete = f.id
    LEFT JOIN ocorrencia_movimento om ON om.id_movimento = f.id AND om.id_tipo_movimento = 5
    LEFT JOIN ocorrencia oco ON oco.id = om.id_ocorrencia
    WHERE f.id = ?
    ORDER BY om.data_ocorrencia DESC, om.hora_ocorrencia DESC
    LIMIT 1
  `;

  db.query(sql, [minutaId], (err, results) => {
    if (err) {
      console.error("Erro ao buscar detalhes da retirada:", err.message);
      return res.status(500).json({ error: "Erro ao buscar detalhes da retirada" });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({ message: "Minuta não encontrada ou sem dados relacionados" });
    }

    const row = results[0];

    res.status(200).json({
      frete: row.frete,
      documento: row.documento || "",
      ocorrencia: row.ocorrencia || "Sem Registro",
      data: row.data || "",
      hora: row.hora || ""
    });
  });
});

// Atualizar ocorrência de retirada
app.put("/ocorrencia/retirada/:minutaId", async (req, res) => {
  const { minutaId } = req.params;
  const {
    ocorrencia,
    data_ocorrencia,
    hora_ocorrencia,
    observacao
  } = req.body;

  // Só permite "Retira cancelada"
  if (!ocorrencia || ocorrencia.toLowerCase() !== "retira cancelada") {
    return res.status(400).json({
      error: 'Apenas a ocorrência "Retira cancelada" é permitida nesta rota.'
    });
  }

  // Validação dos campos obrigatórios
  if (!data_ocorrencia || !hora_ocorrencia || !observacao) {
    return res.status(400).json({
      error: "Campos obrigatórios: data_ocorrencia, hora_ocorrencia, observacao"
    });
  }

  try {
    // Busca o id_ocorrencia correspondente no banco
    const [ocorrencias] = await db.promise().query(
      "SELECT id FROM ocorrencia WHERE LOWER(nome) = LOWER(?)",
      [ocorrencia]
    );

    if (!ocorrencias.length) {
      return res.status(400).json({ error: `Ocorrência "${ocorrencia}" não encontrada no banco.` });
    }

    const id_ocorrencia = ocorrencias[0].id;
    const dt_atualizacao = new Date();

    // Atualiza a ocorrência mais recente de retirada (id_tipo_movimento = 5)
    const [result] = await db.promise().query(
      `
      UPDATE ocorrencia_movimento
      SET
        id_ocorrencia = ?,
        data_ocorrencia = ?,
        hora_ocorrencia = ?,
        observacao = ?,
        dt_cadastro = ?
      WHERE id_movimento = ? AND id_tipo_movimento = 5
      ORDER BY dt_cadastro DESC
      LIMIT 1
      `,
      [
        id_ocorrencia,
        data_ocorrencia,
        hora_ocorrencia,
        observacao,
        dt_atualizacao,
        minutaId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ocorrência de retirada não encontrada para atualizar." });
    }

    res.status(200).json({ message: `Ocorrência "${ocorrencia}" atualizada com sucesso!` });
  } catch (error) {
    console.error('Erro ao atualizar ocorrência de retirada:', error);
    res.status(500).json({ error: 'Erro ao atualizar ocorrência de retirada.' });
  }
});

// ==================== Rota de LANÇAR OCORRÊNCIA DA TRANSFERÊNCIA ==================== //

// Detalhes da ocorrência de transferência
app.get("/detalhes/transferencia/:minutaId", async (req, res) => {
  const minutaId = req.params.minutaId;

  const sql = `
    SELECT 
      f.id AS frete,
      fd.numero AS documento,
      oco.nome AS ocorrencia,
      DATE_FORMAT(om.data_ocorrencia, '%d/%m/%Y') AS data,
      TIME_FORMAT(om.hora_ocorrencia, '%H:%i') AS hora
    FROM frete f
    LEFT JOIN frete_documento fd ON fd.id_frete = f.id
    LEFT JOIN ocorrencia_movimento om ON om.id_movimento = f.id AND om.id_tipo_movimento = 7
    LEFT JOIN ocorrencia oco ON oco.id = om.id_ocorrencia
    WHERE f.id = ?
    ORDER BY om.data_ocorrencia DESC, om.hora_ocorrencia DESC
    LIMIT 1
  `;

  db.query(sql, [minutaId], (err, results) => {
    if (err) {
      console.error("Erro ao buscar detalhes da transferência:", err.message);
      return res.status(500).json({ error: "Erro ao buscar detalhes da transferência" });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({ message: "Minuta não encontrada ou sem dados relacionados" });
    }

    const row = results[0];

    res.status(200).json({
      frete: row.frete,
      documento: row.documento || "",
      ocorrencia: row.ocorrencia || "Sem Registro",
      data: row.data || "",
      hora: row.hora || ""
    });
  });
});

// Atualizar ocorrência de transferência
app.put("/ocorrencia/transferencia/:minutaId", async (req, res) => {
  const { minutaId } = req.params;
  const {
    ocorrencia,
    data_ocorrencia,
    hora_ocorrencia,
    observacao
  } = req.body;

  // Validação dos campos obrigatórios
  if (!ocorrencia || !data_ocorrencia || !hora_ocorrencia || !observacao) {
    return res.status(400).json({
      error: "Campos obrigatórios: ocorrencia, data_ocorrencia, hora_ocorrencia, observacao"
    });
  }

  try {
    // Busca o id_ocorrencia correspondente no banco
    const [ocorrencias] = await db.promise().query(
      "SELECT id FROM ocorrencia WHERE LOWER(nome) = LOWER(?)",
      [ocorrencia]
    );

    if (!ocorrencias.length) {
      return res.status(400).json({ error: `Ocorrência "${ocorrencia}" não encontrada no banco.` });
    }

    const id_ocorrencia = ocorrencias[0].id;
    const dt_atualizacao = new Date();

    // Atualiza a ocorrência mais recente de transferência (id_tipo_movimento = 7)
    const [result] = await db.promise().query(
      `
      UPDATE ocorrencia_movimento
      SET
        id_ocorrencia = ?,
        data_ocorrencia = ?,
        hora_ocorrencia = ?,
        observacao = ?,
        dt_cadastro = ?
      WHERE id_movimento = ? AND id_tipo_movimento = 7
      ORDER BY dt_cadastro DESC
      LIMIT 1
      `,
      [
        id_ocorrencia,
        data_ocorrencia,
        hora_ocorrencia,
        observacao,
        dt_atualizacao,
        minutaId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ocorrência de transferência não encontrada para atualizar." });
    }

    res.status(200).json({ message: `Ocorrência "${ocorrencia}" de transferência atualizada com sucesso!` });
  } catch (error) {
    console.error('Erro ao atualizar ocorrência de transferência:', error);
    res.status(500).json({ error: 'Erro ao atualizar ocorrência de transferência.' });
  }
});

// ==================== Rota da interface ENTREGA ==================== //

app.get("/info-entrega", (req, res) => {
  const sql = `
    SELECT 
      f.id AS frete_id,
      f.numero_cte,
      f.contato_destinatario,
      f.id_local_destino,
      f.status,
      fd.numero AS numero_documento,
      COALESCE(om.id, 0) AS tem_ocorrencia
    FROM frete f
    LEFT JOIN frete_documento fd ON fd.id_frete = f.id
    LEFT JOIN ocorrencia_movimento om ON om.id_movimento = f.id
    WHERE f.tipo = 13;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao buscar entregas:", err.message);
      return res.status(500).json({ error: "Erro ao buscar entregas" });
    }

    // Transformação para leitura mais amigável pela UI
    const entregas = results.map(entrega => ({
      documento: entrega.numero_documento,
      frete: entrega.frete_id,
      cte: entrega.numero_cte === 0 ? "Sem informação" : entrega.numero_cte,
      destinatario: entrega.contato_destinatario,
      cidade: "DIADEMA", // fixo no layout pois não temos tabela de cidades
      uf: "SP", // idem
      status: entrega.status === 1 ? "EM ABERTO" : "OUTRO",
      ocorrencia: entrega.tem_ocorrencia ? "Com Registro" : "Sem Registro"
    }));

    res.status(200).json(entregas);
  });
});

// ==================== Rota da interface COLETA ==================== //

app.get("/info-coleta", (req, res) => {
  const sql = `
    SELECT 
      f.id AS frete_id,
      f.id_cliente,
      f.id_local_destino AS id_local_coleta,  -- Ajuste feito aqui para usar id_local_destino
      f.status,
      COUNT(fd.id) AS total_documento
    FROM frete f
    LEFT JOIN frete_documento fd ON fd.id_frete = f.id
    WHERE f.tipo = 12
    GROUP BY f.id, f.id_cliente, f.id_local_destino, f.status;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao buscar coletas:", err.message);
      return res.status(500).json({ error: "Erro ao buscar coletas" });
    }
  
    console.log(results); 
  
    if (results.length === 0) {
      return res.status(404).json({ message: "Nenhuma coleta encontrada." });
    }
  
    const coletas = results.map(coleta => ({
      coleta_numero: coleta.frete_id,
      total_documento: coleta.total_documento,
      local: `Cliente ID ${coleta.id_cliente}`,
      cidade: "São Paulo", 
      uf: "SP",
      status: coleta.status === 2 ? "EM TRANSITO" : "OUTRO"
    }));
  
    res.status(200).json(coletas);
  });
  
});

// ==================== Rota da interface DESPACHO ==================== //

app.get("/info-despacho", (req, res) => {
  const sql = `
    SELECT 
      f.id AS frete_id,
      f.volume AS total_volume,
      f.status,
      COUNT(fd.id) AS total_documento
    FROM frete f
    LEFT JOIN frete_documento fd ON fd.id_frete = f.id
    WHERE f.tipo = 6
    GROUP BY f.id, f.volume, f.status
    ORDER BY f.id DESC;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao buscar despachos:", err.message);
      return res.status(500).json({ error: "Erro ao buscar despachos" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Nenhum despacho encontrado." });
    }

    const despachos = results.map(despacho => ({
      minuta_numero: despacho.frete_id,
      total_frete: 1,
      total_documento: despacho.total_documento,
      total_volume: despacho.total_volume,
      local: "Cia teste de sistema", // fixo por enquanto
      cidade: "JUNDIAÍ",
      uf: "SP",
      status: despacho.status === 4 ? "EM ABERTO" : "OUTRO"
    }));

    res.status(200).json(despachos);
  });
});

// ==================== Rota da interface RETIRADA ==================== //

app.get("/info-retirada", (req, res) => {
  const sql = `
    SELECT 
      f.id AS frete_id,
      f.volume AS total_volume,
      f.status,
      COUNT(fd.id) AS total_documento
    FROM frete f
    LEFT JOIN frete_documento fd ON fd.id_frete = f.id
    WHERE f.tipo = 5 -- assumindo que 5 representa retirada
    GROUP BY f.id, f.volume, f.status
    ORDER BY f.id DESC;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao buscar retiradas:", err.message);
      return res.status(500).json({ error: "Erro ao buscar retiradas" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Nenhuma retirada encontrada." });
    }

    const retiradas = results.map(retirada => ({
      minuta_numero: retirada.frete_id,
      total_frete: 2, // conforme imagem
      total_documento: retirada.total_documento,
      total_volume: retirada.total_volume,
      local: "Cia teste de sistema", // fixo por enquanto
      cidade: "JUNDIAÍ",
      uf: "SP",
      status: retirada.status === 4 ? "EM ABERTO" : "OUTRO"
    }));

    res.status(200).json(retiradas);
  });
});

// ==================== Rota da interface TRANSFERÊNCIA ==================== //

app.get("/info-transferencia", (req, res) => {
  const sql = `
    SELECT 
      f.id AS frete_id,
      f.volume AS total_volume,
      f.status,
      COUNT(fd.id) AS total_documento
    FROM frete f
    LEFT JOIN frete_documento fd ON fd.id_frete = f.id
    WHERE f.tipo = 7
    GROUP BY f.id, f.volume, f.status
    ORDER BY f.id DESC;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao buscar transferências:", err.message);
      return res.status(500).json({ error: "Erro ao buscar transferências" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Nenhuma transferência encontrada." });
    }

    const transferencias = results.map(t => ({
      minuta_numero: t.frete_id,
      total_frete: 2,
      total_documento: t.total_documento,
      total_volume: t.total_volume,
      local: "Unidade de teste sistema", 
      cidade: "AMARANTE",
      uf: "PI",
      status: t.status === 4 ? "EM ABERTO" : "OUTRO"
    }));

    res.status(200).json(transferencias);
  });
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
app.get("/coletas", (req, res) => {
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
app.post("/coletas", (req, res) => {
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
app.get("/coletas/:id", (req, res) => {
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
app.put("/coletas/:id", (req, res) => {
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
app.delete("/coletas/:id", (req, res) => {
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
