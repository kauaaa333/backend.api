const prioridadeModel = require('../models/prioridade.model');

function listar(req, res) {
  res.json(prioridadeModel.listar());
}

module.exports = {
  listar,
};
