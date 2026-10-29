const criarErro = require('../utils/criarErro');
const jwt = require('jsonwebtoken');
const usuarioModel = require('../models/usuario.model');
const { producao, senhaAceita } = require('../utils/politicaSenha');

const authController = {
  async login(req, res) {
    const { email, senha } = req.body || {};

    if (!email || !senha) {
      throw criarErro(400, 'Email e senha são obrigatórios');
    }

    if (producao() && !senhaAceita(senha)) throw criarErro(401, 'Credenciais inválidas');
    const usuario = await usuarioModel.autenticar(email, senha);
    if (!usuario) {
      throw criarErro(401, 'Credenciais inválidas');
    }

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, versaoUsuarios: 'neon-v1', versaoSenha: usuario.versaoSenha },
      process.env.JWT_SECRET,
      { expiresIn: '8h' },
    );

    return res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome },
    });
  },

  async perfil(req, res) {
    const usuario = await usuarioModel.buscarPorId(req.usuario.id);

    if (!usuario) {
      throw criarErro(404, 'Usuário não encontrado');
    }

    return res.json({ id: usuario.id, nome: usuario.nome, email: usuario.email });
  },
};

module.exports = authController;
