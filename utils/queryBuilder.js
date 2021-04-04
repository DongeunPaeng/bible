const pool = require("./db");

const query = async (func) => {
  try {
    const connection = await pool.getConnection(async (conn) => conn);
    try {
      const result = await func(connection);
      connection.release();
      return result;
    } catch (err) {
      console.log("Query Error: ", err);
      connection.release();
      return false;
    }
  } catch (err) {
    console.log("DB Error: ", err);
    return false;
  }
};

module.exports = query;
