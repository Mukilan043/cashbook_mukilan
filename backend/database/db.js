const path = require('path');
const sqlite3 = require('sqlite3').verbose();

let dbInstance;

function getDb() {
	if (dbInstance) return dbInstance;

	const dbPath =
		process.env.SQLITE_DB_PATH || path.join(__dirname, 'cashbook.sqlite');

	dbInstance = new sqlite3.Database(dbPath);
	dbInstance.serialize(() => {
		dbInstance.run('PRAGMA foreign_keys = ON');
	});

	return dbInstance;
}

module.exports = { getDb };