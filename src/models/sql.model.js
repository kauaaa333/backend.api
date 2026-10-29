const db = require('../config/database');
// Os nomes SQL vêm exclusivamente desta configuração interna, nunca da requisição.
module.exports = function model(table, columns) {
  const projection = Object.entries(columns)
    .map(([key, column]) => `${column} AS "${key}"`)
    .join(', ');
  const rows = async (sql, values = [], client = db) => (await client.query(sql, values)).rows;
  return {
    listar: () => rows(`SELECT ${projection} FROM ${table} ORDER BY id`),
    listarPor: (campo, valor) => {
      if (!Object.hasOwn(columns, campo)) throw new Error('Filtro SQL não permitido');
      return rows(`SELECT ${projection} FROM ${table} WHERE ${columns[campo]}=$1 ORDER BY id`, [
        valor,
      ]);
    },
    buscar: async (id) => (await rows(`SELECT ${projection} FROM ${table} WHERE id=$1`, [id]))[0],
    async adicionar(data, client = db) {
      const keys = Object.keys(columns).filter((k) => k !== 'id' && data[k] !== undefined);
      const values = keys.map((k) => data[k]);
      const campos = keys.map((key) => columns[key]).join(',');
      const parametros = keys.map((_, i) => '$' + (i + 1)).join(',');
      return (
        await rows(
          `INSERT INTO ${table} (${campos}) VALUES (${parametros}) RETURNING ${projection}`,
          values,
          client,
        )
      )[0];
    },
    async atualizar(id, data, client = db) {
      const keys = Object.keys(columns).filter((k) => k !== 'id' && data[k] !== undefined);
      if (!keys.length)
        return (await rows(`SELECT ${projection} FROM ${table} WHERE id=$1`, [id], client))[0];
      const campos = keys.map((key, i) => columns[key] + '=$' + (i + 1)).join(',');
      const values = [...keys.map((key) => data[key]), id];
      return (
        await rows(
          `UPDATE ${table} SET ${campos} WHERE id=$${keys.length + 1} RETURNING ${projection}`,
          values,
          client,
        )
      )[0];
    },
    remover: async (id, client = db) =>
      (await rows(`DELETE FROM ${table} WHERE id=$1 RETURNING ${projection}`, [id], client))[0],
  };
};
