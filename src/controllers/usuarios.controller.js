const usuarioModel = require('../models/usuario.model');
function normalizarDados({ nome, email, senha }) { return { nome, email: typeof email === 'string' ? email.trim().toLowerCase() : '', senha }; }
function dadosObrigatoriosPresentes({ nome, email, senha }) { return Boolean(nome && email && senha); }
function listar(req, res) { res.json(usuarioModel.listar()); }
function buscarPorId(req, res) { const usuario = usuarioModel.buscarPorId(Number(req.params.id)); if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' }); res.json(usuario); }
function criar(req, res) { const dados = normalizarDados(req.body); if (!dadosObrigatoriosPresentes(dados)) return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios' }); if (usuarioModel.buscarPorEmail(dados.email)) return res.status(409).json({ erro: 'E-mail já cadastrado' }); res.status(201).json(usuarioModel.adicionar(dados)); }
function atualizar(req, res) { const id = Number(req.params.id); if (!usuarioModel.buscarPorId(id)) return res.status(404).json({ erro: 'Usuário não encontrado' }); const dados = normalizarDados(req.body); if (!dadosObrigatoriosPresentes(dados)) return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios' }); const igual = usuarioModel.buscarPorEmail(dados.email); if (igual && igual.id !== id) return res.status(409).json({ erro: 'E-mail já cadastrado' }); res.json(usuarioModel.atualizar(id, dados)); }
function remover(req, res) { const usuario = usuarioModel.remover(Number(req.params.id)); if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' }); res.json({ mensagem: 'Usuário removido com sucesso', id: usuario.id }); }
module.exports = { listar, buscarPorId, criar, atualizar, remover };
