import dotenv from 'dotenv';
import express from 'express';
import DBAdapter, {DB_ERROR_TYPE_CLIENT} from './adapters/DBAdapter.js';

dotenv.config({
    path: './server/.env'
});

const {
    TM_APP_HOST,
    TM_APP_PORT,
    TM_DB_HOST,
    TM_DB_PORT,
    TM_DB_NAME,
    TM_DB_USER_LOGIN,
    TM_DB_USER_PASSWORD,
} = process.env;

const serverApp = express();
const dbAdapter = new DBAdapter({
    dbHost: TM_DB_HOST,
    dbPort: TM_DB_PORT,
    dbName: TM_DB_NAME,
    dbUserLogin: TM_DB_USER_LOGIN,
    dbUserPassword: TM_DB_USER_PASSWORD
});

// middleware - log req
serverApp.use('*', (req, res, next) => {
    console.log(
        new Date().toISOString(),
        req.method,
        req.originalUrl
    );
    next();
});

//another middlewares
serverApp.use('/api/v1/tasks', express.json());
serverApp.use('/api/v1/staff', express.json());
serverApp.use('/api/v1/staff/:staffID', express.json());
serverApp.use('/api/v1/tasks/:taskID', express.json());

serverApp.get('/api/v1/staff', async (req, res) => {
    try
    {
        const [dbTasks, dbStaff] = await Promise.all([
            dbAdapter.getTasks(),
            dbAdapter.getStaff()
        ]);
        const tasks = dbTasks.map(
            ({id, staff_id, equipment_name, equipment_id, start_book_date, end_book_date}) =>
            (
                start_book_date.setHours(start_book_date.getHours() + 3),
                end_book_date.setHours(end_book_date.getHours() + 3),
            {
                taskID: id,
                staffID: staff_id,
                equipmentName: equipment_name,
                equipmentID: equipment_id,
                startBookDate: start_book_date.toISOString().split('T')[0],
                endBookDate: end_book_date.toISOString().split('T')[0]
            })
        );
        const staff = dbStaff.map(
            ({id, full_name, position}) => ({
                staffID: id,
                staffName: full_name,
                staffPosition: position,
                tasks: tasks.filter(task => task.staffID === id)
            })
        );

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.json({staff});
    }
    catch (err)
    {
        res.statusCode = 500;
        res.statusMessage = 'Internal Server Error';
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: 500,
            message: `Error while getting Staff ${err.error || err.message}`
        });
    }
});

serverApp.get('/', async (req, res) => {
    res.statusCode = 200;
    res.statusMessage = "OK";
    res.sendFile("D:\\WEB\\DZ\\client\\index.html");
});

serverApp.use("/", express.static('./client'));

serverApp.get('/api/v1/equipment', async (req, res) => {
    try
    {
        const dbEquipment = await dbAdapter.getEquipment();
        const equipment = dbEquipment.map(
            ({id, name}) =>
            ({
                id: id,
                name: name
            })
        );
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.json({equipment});
    }
    catch (err)
    {
        res.statusCode = 500;
        res.statusMessage = 'Internal Server Error';
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: 500,
            message: `Error while getting Equipment ${err.error || err.message}`
        });
    }
});

serverApp.post('/api/v1/staff', async (req, res) => {
    try
    {
        console.log(req.body);
        const
        {
            staffName,
            staffPosition
        } = req.body;

        const staffID = crypto.randomUUID();

        await dbAdapter.addStaff({
            id: staffID,
            name: staffName,
            position: staffPosition,
        });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.json({staffID});
    }
    catch (err)
    {
        switch(err.type)
        {
            case DB_ERROR_TYPE_CLIENT:
                res.statusCode = 400;
                res.statusMessage = 'Bad Request';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = "Internal serv err";
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Add staff error ${err.error || err.message}`
        });
    }
});

serverApp.post('/api/v1/tasks', async (req, res) => {
    try
    {
        console.log(req.body);
        const
        {
            staffID,
            equipmentID,
            startBookDate,
            endBookDate
        } = req.body;
        const taskID = crypto.randomUUID();

        await dbAdapter.addTask({
            id: taskID,
            staffID: staffID,
            equipmentID: equipmentID,
            startBookDate: startBookDate,
            endBookDate: endBookDate
        });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.json({taskID:taskID, statusCode: res.statusCode});
    }
    catch (err)
    {
        switch(err.type)
        {
            case DB_ERROR_TYPE_CLIENT:
                res.statusCode = 400;
                res.statusMessage = 'Bad Request';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = "Internal serv err";
        }
        let d = new Date();
        d.setHours(d.getHours() + 3);
        res.json({
            timestamp: d.toISOString(),
            statusCode: res.statuscode,
            message: `Add task error ${err.error || err.message}`,
            id: err.taskID
        });
    }

});

serverApp.patch('/api/v1/tasks/:taskID', async (req, res) => {
    try
    {
        const
        {
            staffID,
            equipmentID,
            startBookDate,
            endBookDate
        } = req.body;
        const {taskID} = req.params;

        await dbAdapter.updateTask({
            id: taskID,
            staffID: staffID,
            equipmentID: equipmentID,
            startBookDate: startBookDate,
            endBookDate: endBookDate
        });
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.json({taskID:taskID, statusCode: res.statusCode});
    }
    catch (err)
    {
        switch(err.type)
        {
            case DB_ERROR_TYPE_CLIENT:
                res.statusCode = 400;
                res.statusMessage = 'Bad Request';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = "Internal serv err";
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Upd task error ${err.message || err.error}`,
            id: err.taskID
        });
    }
});

serverApp.patch('/api/v1/staff/:staffID', async (req, res) => {
    try
    {
        const
        {
            updatedStaffName
        } = req.body;
        const {staffID} = req.params;

        await dbAdapter.updateStaff({
            id: staffID,
            updatedStaffName: updatedStaffName
        });
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.json({staffID:staffID, statusCode: res.statusCode});
   }
    catch (err)
    {
        switch(err.type)
        {
            case DB_ERROR_TYPE_CLIENT:
                res.statusCode = 400;
                res.statusMessage = 'Bad Request';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = "Internal serv err";
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Upd staff error ${err.message || err.error}`,
            id: err.taskID
        });
    }
});

serverApp.delete('/api/v1/tasks/:taskID', async (req, res) => {

    try
    {
        const {taskID} = req.params;

        await dbAdapter.deleteTask({
            id: taskID
        });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.send();
    }
    catch (err)
    {
        switch(err.type)
        {
            case DB_ERROR_TYPE_CLIENT:
                res.statusCode = 400;
                res.statusMessage = 'Bad Request';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = "Internal serv err";
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Delete task error ${err.message || err.error}`
        });
    }
});

serverApp.delete('/api/v1/staff/:staffID', async (req, res) => {

    try
    {
        const {staffID} = req.params;

        await dbAdapter.deleteStaff({
            id: staffID
        });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.send();
    }
    catch (err)
    {
        switch(err.type)
        {
            case DB_ERROR_TYPE_CLIENT:
                res.statusCode = 400;
                res.statusMessage = 'Bad Request';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = "Internal serv err";
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Delete staff error ${err.message || err.error}`
        });
    }
});

serverApp.patch('/api/v1/staff', async (req, res) => {
    try
    {
        const
        {
            taskID,
            dstStaffID
        } = req.body;

        await dbAdapter.updateTask({
            id: taskID,
            staffID: dstStaffID
        });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.json({staffID: dstStaffID, statusCode: res.statusCode});
    }
    catch (err)
    {
        switch(err.type)
        {
            case DB_ERROR_TYPE_CLIENT:
                res.statusCode = 400;
                res.statusMessage = 'Bad Request';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = "Internal serv err";
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Move task error ${err.message || err.error}`,
            id: err.taskID
        });
    }
});

serverApp.listen(Number(TM_APP_PORT), TM_APP_HOST, async () => {
    try
    {
        await dbAdapter.connect();
    }
    catch (err)
    {
        console.log('TaskManager is shutting down!');
        process.exit(100);
    }
    console.log(`TM APP SERVER started (${TM_APP_HOST}:${TM_APP_PORT})`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received');
    serverApp.close(async () => {
        await dbAdapter.disconnect();
        console.log('DB CLOSED');
    });
});