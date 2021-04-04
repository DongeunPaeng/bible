const query = require("../utils/queryBuilder");

module.exports = class BaseRepository {
  insert(queryString, args = []) {
    return query(async (connection) => {
      const [rows] = await connection.query(queryString, args);
      return rows.insertId;
    });
  }

  selectSingular(queryString, args = []) {
    return query(async (connection) => {
      const [rows] = await connection.query(queryString, args);
      return rows[0];
    });
  }

  selectAll(queryString, args = []) {
    return query(async (connection) => {
      const [rows] = await connection.query(queryString, args);
      return rows;
    });
  }

  update(queryString, args = []) {
    return query(async (connection) => {
      const [rows] = await connection.query(queryString, args);
      return rows;
    });
  }
};
