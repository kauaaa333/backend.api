const prioridadeModel = require('../models/prioridade.model');

async function listar(req, res) {
  res.json(await prioridadeModel.listar());
}

module.exports = {
  listar,
};
