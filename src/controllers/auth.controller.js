const jwt = require('jsonwebtoken');
const usuarioModel = require('../models/usuario.model');

const authController = {
  login(req, res) {
    const { email, senha } = req.body || {};

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    const usuario = usuarioModel.buscarPorEmail(email);
    if (!usuario || usuario.senha !== senha) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome },
    });
  },

  perfil(req, res) {
    const usuario = usuarioModel.buscarPorId(req.usuario.id);

    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    return res.json({ id: usuario.id, nome: usuario.nome, email: usuario.email });
  },
};

module.exports = authController;
