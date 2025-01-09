import pg from 'pg';

const DB_ERROR_TYPE_CLIENT = 'DB_ERROR_TYPE_CLIENT';
const DB_ERROR_TYPE_INTERNAL = 'DB_ERROR_TYPE_INTERNAL';

export {
    DB_ERROR_TYPE_CLIENT,
    DB_ERROR_TYPE_INTERNAL
};

export default class DBAdapter {
    #dbHost = '';
    #dbPort = -1;
    #dbName = '';
    #dbUserLogin = '';
    #dbUserPassword = '';
    #dbClient = null;


    constructor({
        dbHost,
        dbPort,
        dbName,
        dbUserLogin,
        dbUserPassword
    })
    {
        this.#dbHost = dbHost;
        this.#dbPort = dbPort;
        this.#dbName = dbName;
        this.#dbUserLogin = dbUserLogin;
        this.#dbUserPassword = dbUserPassword;
        this.#dbClient = new pg.Client({
            host: this.#dbHost,
            port: this.#dbPort,
            database: this.#dbName,
            user: this.#dbUserLogin,
            password: this.#dbUserPassword
        });
    }

    async connect()
    {
        try
        {
            await this.#dbClient.connect();
            console.log(`Successfully connected to DB ${this.#dbName}`);
        }
        catch (err)
        {
            console.error(`Could not connect to DB ${this.#dbName} by ${err}`);
            return Promise.reject(err);
        }
    }

    async disconnect()
    {
        await this.#dbClient.end();
        console.log(`Disconnected from DB ${this.#dbName}`);
    }

    async getTasks()
    {
        try
        {
            const tasksData = await this.#dbClient.query(
                `SELECT task.id, staff_id, name AS equipment_name, equipment_id, start_book_date, end_book_date
                FROM task
                JOIN equipment ON (equipment_id = equipment.id)
                ORDER BY start_book_date;`
            );
            return tasksData.rows;
        }
        catch (err)
        {
            console.error(`DB error: getting tasks  ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }
    }

    async getEquipment()
    {
        try
        {
            const equipmentData = await this.#dbClient.query(
                `SELECT *
                FROM equipment;`
            );
            return equipmentData.rows;
        }
        catch (err)
        {
            console.error(`DB error: getting equipment ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }
    }

    async getStaff()
    {
        try
        {
            const staffData = await this.#dbClient.query(
                'SELECT * FROM staff ORDER BY position ASC;'
            );
            return staffData.rows;
        }
        catch (err)
        {
            console.error(`DB error while getting staff: ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }
    }
    async addStaff({id, name, position = -1})
    {
        if (!id || !name || position === -1)
        {
            const errMsg = `DB error wrong parameter for adding staff list ${id}, ${name}, ${position}`;
            console.error(errMsg);
            return Promise.reject({
                type: DB_ERROR_TYPE_CLIENT,
                error: new Error(errMsg)
            });
        }

        try
        {
            const staffPos = await this.#dbClient.query(
                `SELECT id FROM staff WHERE position = $1;`,
                [position]
            );

            if (staffPos.rows.length !== 0)
            {
                const errMsg = `DB error: Position ${position} already exist`;
                console.error(errMsg);
                return Promise.reject({
                    type: DB_ERROR_TYPE_CLIENT,
                    error: new Error(errMsg)
                });
            }
            await this.#dbClient.query(
                `INSERT INTO staff VALUES ($1, $2, $3);`,
                [id, name, position]
            );
        }
        catch (err)
        {
            console.error(`DB error: add staff  ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }

    }

    async addTask({id, staffID, equipmentID, startBookDate, endBookDate})
    {
        if (!id || !staffID || !equipmentID || !startBookDate || !endBookDate)
        {
            const errMsg = `DB error wrong parameter for adding task ${id}, ${staffID}, ${equipmentID}, ${startBookDate}, ${endBookDate}`;
            console.error(errMsg);
            return Promise.reject({
                type: DB_ERROR_TYPE_CLIENT,
                error: new Error(errMsg)
            });
        }

        try
        {
            const equipmentTaskDate = await this.#dbClient.query(
                `SELECT id
                FROM task
                WHERE id != $4 AND equipment_id = $3 AND NOT ($1 > end_book_date OR $2 < start_book_date);`,
                [startBookDate, endBookDate, equipmentID, id]
            );

            const equipmentStaffDate = await this.#dbClient.query(
                `SELECT id
                FROM task
                WHERE id != $4 AND staff_id = $3 AND NOT ($1 > end_book_date OR $2 < start_book_date);`,
                [startBookDate, endBookDate, staffID, id]
            );
            if (equipmentTaskDate.rows.length !== 0 || equipmentStaffDate.rows.length !== 0)
            {
                let errMsg = `DB error: equipment with ID ${equipmentID} already booked on this period`;
                if (equipmentStaffDate.rows.length !== 0)
                    errMsg = `DB error: employee with ID ${staffID} already working on this period`;
                console.error(errMsg);
                return Promise.reject({
                    type: DB_ERROR_TYPE_CLIENT,
                    error: new Error(errMsg),
                    taskID: equipmentTaskDate.rows.concat(equipmentStaffDate.rows)
                });
            }

            await this.#dbClient.query(
                `INSERT INTO task VALUES ($1, $2, $3, $4, $5);`,
                [id, staffID, equipmentID, startBookDate, endBookDate]
            );
        }
        catch (err)
        {
            console.error(`DB error: add task  ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }

    }

    async updateTask({id, staffID, equipmentID, startBookDate, endBookDate})
    {
        if (!id || (!staffID && !equipmentID && !startBookDate && !endBookDate))
        {
            const errMsg = `DB error wrong parameter for editing task ${id}, ${staffID}, ${equipmentID}, ${startBookDate}, ${endBookDate}`;
            console.error(errMsg);
            return Promise.reject({
                type: DB_ERROR_TYPE_CLIENT,
                error: new Error(errMsg)
            });
        }

        try
        {
            const {
                rows: [
                    {
                        staff_id: id1,
                        equipment_id:  id2,
                        start_book_date: d1,
                        end_book_date: d2
                    }
                ]
            } = await this.#dbClient.query(
                `SELECT * FROM task where ID = $1;`,
                [id]
            );
            if (!staffID)
                staffID = id1;
            if (!equipmentID)
                equipmentID = id2;
            if (!startBookDate)
                startBookDate = d1;
            if (!endBookDate)
                endBookDate = d2;

            const equipmentTaskDate = await this.#dbClient.query(
                `SELECT id
                FROM task
                WHERE id != $4 AND equipment_id = $3 AND NOT ($1 > end_book_date OR $2 < start_book_date);`,
                [startBookDate, endBookDate, equipmentID, id]
            );

            const equipmentStaffDate = await this.#dbClient.query(
                `SELECT id
                FROM task
                WHERE id != $4 AND staff_id = $3 AND NOT ($1 > end_book_date OR $2 < start_book_date);`,
                [startBookDate, endBookDate, staffID, id]
            );
            if (equipmentTaskDate.rows.length !== 0 || equipmentStaffDate.rows.length !== 0)
            {
                let errMsg = `DB error: equipment with ID ${equipmentID} already booked on this period`;
                if (equipmentStaffDate.rows.length !== 0)
                    errMsg = `DB error: employee with ID ${staffID} already working on this period`;
                console.error(errMsg);
                return Promise.reject({
                    type: DB_ERROR_TYPE_CLIENT,
                    error: new Error(errMsg),
                    taskID: equipmentTaskDate.rows.concat(equipmentStaffDate.rows)
                });
            }

            await this.#dbClient.query(`
                UPDATE task
                SET staff_id = $2, equipment_id = $3, start_book_date = $4, end_book_date = $5
                WHERE id = $1;`,
                [id, staffID, equipmentID, startBookDate, endBookDate]
            );
        }
        catch (err)
        {
            console.error(`DB error: upd task  ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }
    }

    async deleteTask({id})
    {
        if (!id)
        {
            const errMsg = `DB error wrong parameter for deleting task ${id}`;
            console.error(errMsg);
            return Promise.reject({
                type: DB_ERROR_TYPE_CLIENT,
                error: new Error(errMsg)
            });
        }

        try
        {
            await this.#dbClient.query(
                `DELETE FROM task WHERE id = $1`,
                [id]
            );
        }
        catch (err)
        {
            console.error(`DB error: delete task  ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }
    }

    async deleteStaff({id})
    {
        if (!id)
        {
            const errMsg = `DB error wrong parameter for deleting staff ${id}`;
            console.error(errMsg);
            return Promise.reject({
                type: DB_ERROR_TYPE_CLIENT,
                error: new Error(errMsg)
            });
        }

        try
        {
            await this.#dbClient.query(
                `DELETE FROM task WHERE staff_id = $1`,
                [id]
            );

            await this.#dbClient.query(
                `UPDATE staff
                SET position = position -1
                WHERE position > (
                    SELECT position
                    FROM staff
                    WHERE id = $1
                );`,
                [id]
            );

            await this.#dbClient.query(
                `DELETE FROM staff WHERE id = $1`,
                [id]
            );
        }
        catch (err)
        {
            console.error(`DB error: delete staff  ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }
    }

    async updateStaff({id, updatedStaffName})
    {
        console.log(id, updatedStaffName);
        if (!id || !updatedStaffName)
        {
            const errMsg = `DB error wrong parameter for editing staff ${id}, ${updatedStaffName}`;
            console.error(errMsg);
            return Promise.reject({
                type: DB_ERROR_TYPE_CLIENT,
                error: new Error(errMsg)
            });
        }

        try
        {
            await this.#dbClient.query(
                `UPDATE staff SET full_name = $1 WHERE id = $2;`,
                [updatedStaffName, id]
            );
        }
        catch (err)
        {
            console.error(`DB error: update staff ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }
    }
}