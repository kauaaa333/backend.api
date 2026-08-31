const usuarios = [{ id: 1, nome: 'admin', email: 'admin@taskflow.com', senha: '1234' }];
let proximoId = 2;
function listar() { return usuarios; }
function buscarPorId(id) { return usuarios.find((usuario) => usuario.id === id); }
function buscarPorEmail(email) { return usuarios.find((usuario) => usuario.email.toLowerCase() === email.toLowerCase()); }
function adicionar({ nome, email, senha }) { const usuario = { id: proximoId++, nome, email, senha }; usuarios.push(usuario); return usuario; }
function atualizar(id, { nome, email, senha }) { const indice = usuarios.findIndex((usuario) => usuario.id === id); if (indice === -1) return null; const usuario = { id, nome, email, senha }; usuarios[indice] = usuario; return usuario; }
function remover(id) { const indice = usuarios.findIndex((usuario) => usuario.id === id); return indice === -1 ? null : usuarios.splice(indice, 1)[0]; }
module.exports = { listar, buscarPorId, buscarPorEmail, adicionar, atualizar, remover };
