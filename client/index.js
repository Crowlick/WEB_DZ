document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();

});

let equipmentList = [];

class App
{
    #staffs = [];

    deleteStaff({staffID})
    {
        const deleteStaffIndex = this.#staffs.findIndex(staff => staff.staffID === staffID);
        if (deleteStaffIndex === -1) return;

        this.#staffs.splice(deleteStaffIndex, 1);
    }

    onDeleteStaff = async ({staffID}) => {
        const staff = this.#staffs.find(staff => staff.staffID === staffID);
        if (!staff)
        {
            console.error('Нет такого сотрудника');
            return;
        }

        const staffIsDeleted = confirm(`Сотрудник '${staff.staffName}' будет удалён со всеми заявками. Ок?`);
        if (!staffIsDeleted) return;
        this.deleteStaff({staffID});
        document.querySelector(`li[id="${staffID}"]`).remove();

        const response = await fetch(`/api/v1/staff/${staffID}`, {
                method: 'DELETE'
            });
    };

    onEditStaff = async ({staffID}) => {
        const staff = this.#staffs.find(staff => staff.staffID === staffID);
        if (!staff)
        {
            console.error('Нет такого сотрудника');
            return;
        }

        const updatedStaffName = prompt('Введите новое ФИО', staff.staffName);

        if (!updatedStaffName || updatedStaffName === staff.staffName) return;

        staff.staffName = updatedStaffName;

        document.querySelector(`li[id="${staffID}"] > .tasklist__header > .tasklist__header__tasklist_name`).innerHTML = updatedStaffName;

        const response = await fetch(`/api/v1/staff/${staffID}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    updatedStaffName: updatedStaffName
                })
            });
        console.log(response);
    };

    onKeyDownEscape = (event) => {
        if (event.key !== 'Escape') return;
        const input = document.getElementById('add-tasklist-input');
        input.style.display = 'none';
        input.value = '';

        document.getElementById('add-tasklist-btn').style.display = 'initial';
    };

    onKeyDownEnter = async (event) => {
        if (event.key !== 'Enter') return;
        const input = document.getElementById('add-tasklist-input');
        if (input.value !== '')
        {
            const response = await fetch("/api/v1/staff", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    staffName: input.value,
                    staffPosition: this.#staffs.length
                })
            });

            const data = await response.json();


            const newStaff = new Staff ({
                staffID: data.staffID,
                staffName: input.value,
                onEditTask: this.onEditTask,
                onDeleteTask: this.onDeleteTask,
                onMoveTask: this.onMoveTask,
                placeNewTask: this.placeNewTask,
                onDeleteStaff: this.onDeleteStaff,
                onEditStaff: this.onEditStaff
            });
            this.#staffs.push(newStaff);
            newStaff.render();
        }
        input.value = '';
        input.style.display = 'none';

        document.getElementById('add-tasklist-btn').style.display = 'initial';


    };

    onEditTask = async ({taskID, staffID}) => {
        const staff = this.#staffs.find(staff => staff.staffID === staffID);
        if (!staff)
        {
            console.error('Нет такого сотрудника');
            return;
        }

        const task = staff.getTask({taskID});
        task.taskIsEditing = true;
        if (!task)
        {
            console.error('Нет такой заявки');
            return;
        }
        document.querySelector(`li[id="${taskID}"] > ul.task__datas`).remove();
        document.querySelector(`li[id="${taskID}"] > div.task__controls`).remove();
        task.unFix(document.querySelector(`li[id="${taskID}"]`));
    };

    onDeleteTask = async ({taskID, staffID}) => {
        const staff = this.#staffs.find(staff => staff.staffID === staffID);
        if (!staff)
        {
            console.error('Нет такого сотрудника');
            return;
        }

        const task = staff.getTask({taskID});

        if (!task)
        {
            console.error('Нет такой заявки');
            return;
        }
        let taskIsDeleted = false;
        if (task.taskIsCreated)
             taskIsDeleted = confirm(`Заявка '${task.equipmentName} с ${task.startBookDate} по ${task.endBookDate}' будет удалена. Ок?`);
        else
            taskIsDeleted = confirm(`Заявка '${task.equipmentName || task.taskID}' будет удалена. Ок?`);
        if (!taskIsDeleted) return;
        staff.deleteTask({taskID});
        document.querySelector(`li[id="${taskID}"]`).remove();

        const response = await fetch(`/api/v1/tasks/${taskID}`, {
                method: 'DELETE'
            });
        let taskEl = document.querySelector(`li[class="task alert"`);
        while (taskEl)
        {
            taskEl.classList.remove("alert");
            taskEl = document.querySelector(`li[class="task alert"`);
        }
    };

    onMoveTask = async ({taskID, staffID, direction}) =>
    {
        if (direction !== TaskBtnTypes.MOVE_TASK_FORWARD && direction !== TaskBtnTypes.MOVE_TASK_BACK)
            return;
        const srcStaffIndex = this.#staffs.findIndex(staff => staff.staffID === staffID);
        if (srcStaffIndex === -1)
        {
            console.error('Нет такого сотрудника');
            return;
        }

        const movingTask = this.#staffs[srcStaffIndex].getTask({taskID});
        if (!movingTask)
        {
            console.error('Нет такой заявки');
            return;
        }

        let taskEl = document.querySelector(`li[class="task alert"`);
        while (taskEl)
        {
            taskEl.classList.remove("alert");
            taskEl = document.querySelector(`li[class="task alert"`);
        }

        const destStaffIndex = direction === TaskBtnTypes.MOVE_TASK_BACK
            ? srcStaffIndex - 1
            : srcStaffIndex + 1;
        if (destStaffIndex === -1 || destStaffIndex === this.#staffs.length) return;

        const response = await fetch("/api/v1/staff", {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    taskID: taskID,
                    dstStaffID: this.#staffs[destStaffIndex].staffID
                })
            });
        const data = await response.json();
        if (data.statusCode !== 200)
        {
            alert(`Невозможно переназначить заявку: сотрудник ${this.#staffs[destStaffIndex].staffName} уже занят тестированием`);
            data.id.forEach((ids) => document.querySelector(`li[id="${ids.id}"`).classList.add("alert"));

            return;
        }

        this.#staffs[srcStaffIndex].deleteTask({taskID});
        movingTask.staffID = this.#staffs[destStaffIndex].staffID;
        this.#staffs[destStaffIndex].addTask({task: movingTask});

        this.placeNewTask({taskID: taskID, staffID: this.#staffs[destStaffIndex].staffID});


    };


    async init()
    {
        document.getElementById('add-tasklist-btn')
            .addEventListener('click', (event) => {
                event.target.style.display = 'none';

                const input = document.getElementById('add-tasklist-input');

                input.style.display = 'initial';
                input.focus();
            })
            document.addEventListener('keydown', this.onKeyDownEscape);
            document.addEventListener('keydown', this.onKeyDownEnter);

            const equipment = await fetch(
                "http://localhost:7777/api/v1/equipment",
                {method: "GET"}
            );

            let data = await equipment.json();

            equipmentList = data.equipment;

            const staff = await fetch(
                "http://localhost:7777/api/v1/staff",
                {method: "GET"}
            );

            data = await staff.json();

        data.staff.forEach((staff) => {
            const newStaff = new Staff({
                staffID: staff.staffID,
                staffName: staff.staffName,
                onEditTask: this.onEditTask,
                onDeleteTask: this.onDeleteTask,
                onMoveTask: this.onMoveTask,
                placeNewTask: this.placeNewTask,
                onDeleteStaff: this.onDeleteStaff,
                onEditStaff: this.onEditStaff
            });

            this.#staffs.push(newStaff);
            newStaff.render();

            staff.tasks.forEach((task) => {
                const newTask = new Task({
                    taskID: task.taskID,
                    staffID: task.staffID,
                    equipmentName: task.equipmentName,
                    equipmentID: task.equipmentID,
                    startBookDate: task.startBookDate,
                    endBookDate: task.endBookDate,
                    onEditTask: this.onEditTask,
                    onDeleteTask: this.onDeleteTask,
                    onMoveTask: this.onMoveTask,
                    placeNewTask: this.placeNewTask
                });
                newTask.taskIsCreated = true;
                newStaff.tasks.push(newTask);
                newTask.render();
            });
        });
    }

    placeNewTask = ({taskID, staffID}) =>
    {
        const staff = this.#staffs.find(staff => staff.staffID === staffID);
        if (!staff)
        {
            console.error('Нет такого сотрудника');
            return;
        }

        const task = staff.getTask({taskID});

        if (!task)
        {
            console.error('Нет такой заявки');
            return;
        }

        const beforeTask = staff.earliestTask(task);

        const movingTaskEl = document.querySelector(`li[id="${taskID}"]`);
        if (!beforeTask)
            document.querySelector(`li[id="${task.staffID}"] > ul.tasklist__tasks-list`)
                .appendChild(movingTaskEl);
        else
            document.querySelector(`li[id="${task.staffID}"] > ul.tasklist__tasks-list`)
                .insertBefore(movingTaskEl, document.querySelector(`li[id="${beforeTask.taskID}"]`));
    }
}

class Staff
{
    #staffID = '';
    #staffName = '';
    #tasks = [];

    constructor({staffID, staffName, onEditTask, onDeleteTask, onMoveTask, placeNewTask, onDeleteStaff, onEditStaff})
    {
        this.#staffName = staffName;
        this.#staffID = staffID;
        this.onEditTask = onEditTask;
        this.onDeleteTask = onDeleteTask;
        this.onMoveTask = onMoveTask;
        this.placeNewTask = placeNewTask;
        this.onDeleteStaff = onDeleteStaff;
        this.onEditStaff = onEditStaff;
    }

    get staffID() {return this.#staffID;}

    get staffName() {return this.#staffName;}

    set staffName(newStaffName)
    {
       if (typeof newStaffName !== 'string') return;
        this.#staffName = newStaffName;
    }

    getTask ({taskID})
    {
        return this.#tasks.find(task => task.taskID === taskID);
    }
    get tasks() {return this.#tasks;}

    addTask({task})
    {
        if (!task instanceof Task) return;
        this.#tasks.push(task);
    }

    deleteTask({taskID})
    {
        const deleteTaskIndex = this.#tasks.findIndex(task => task.taskID === taskID);
        if (deleteTaskIndex === -1) return;

        this.#tasks.splice(deleteTaskIndex, 1);
    }

    earliestTask(insertingTask)
    {
        this.#tasks.sort((task1, task2) => {
            if (!task1.taskIsCreated && task2.taskIsCreated) return 1;
            if (task1.taskIsCreated && !task2.taskIsCreated) return -1;
            let cmp = new Date(insertingTask.startBookDate);
            task1 = new Date(task1.startBookDate) - cmp;
            task2 = new Date(task2.startBookDate) - cmp;
            if (task1 > task2) return 1;
            else if (task1 < task2) return -1;
            return 0;
        });
        let filteredTask = this.#tasks.filter(task => (new Date(task.startBookDate) > new Date(insertingTask.startBookDate) || !task.taskIsCreated));
        return filteredTask[0];
    }

    onConstructTask = () => {
        const newTask = new Task({
            taskID: crypto.randomUUID(),
            staffID: this.#staffID,
            onEditTask: this.onEditTask,
            onDeleteTask: this.onDeleteTask,
            onMoveTask: this.onMoveTask,
            placeNewTask: this.placeNewTask
        });
        this.#tasks.push(newTask);
        newTask.render();
    };



    render() {
        const staffEl = document.createElement('li');
        staffEl.classList.add('tasklist');
        staffEl.setAttribute('id', this.#staffID);

        const headerEl = document.createElement('header');
        headerEl.classList.add('tasklist__header');

        const spanEl = document.createElement('span');
        spanEl.classList.add('tasklist__header__tasklist_name');
        spanEl.innerHTML = this.#staffName;

        headerEl.appendChild(spanEl);

        const divEl = document.createElement('div');
        divEl.classList.add('tasklist__header__tasklist_controls');

        TaskBtnParams.slice(5, 7).forEach(({className, imageSrc, imageAlt, type}) => {
            const buttonEl = document.createElement('button');
            buttonEl.classList.add(className);
            switch(type)
            {
                case TaskBtnTypes.DELETE_STAFF:
                     buttonEl.addEventListener('click', () => this.onDeleteStaff({
                        staffID: this.#staffID
                     }));
                    break;
                case TaskBtnTypes.EDIT_STAFF:
                     buttonEl.addEventListener('click', () =>  this.onEditStaff({
                         staffID: this.#staffID
                     }));

                    break;
                default: break;
            }

            const imgEl = document.createElement('img');
            imgEl.setAttribute('src', imageSrc);
            imgEl.setAttribute('alt', imageAlt);

            buttonEl.appendChild(imgEl);

            divEl.appendChild(buttonEl);
        });

        headerEl.appendChild(divEl);

        staffEl.appendChild(headerEl);

        const tasksEl = document.createElement('ul');
        tasksEl.classList.add('tasklist__tasks-list');

        staffEl.appendChild(tasksEl);

        const buttonEl = document.createElement('button');
        buttonEl.classList.add('tasklist__add-task-btn');
        buttonEl.innerHTML = 'Добавить заявку';
        buttonEl.addEventListener('click', this.onConstructTask);

        staffEl.appendChild(buttonEl);

        const tlListEl = document.querySelector('ul.tasklists-list');
        tlListEl.insertBefore(staffEl, tlListEl.children[tlListEl.children.length - 1]);

    }
}

const TaskBtnTypes = Object.freeze({
    EDIT_TASK: 'EDIT_TASK',
    DELETE_TASK: 'DELETE_TASK',
    MOVE_TASK_BACK: 'MOVE_TASK_BACK',
    MOVE_TASK_FORWARD: 'MOVE_TASK_FORWARD',
    ADD_TASK: 'ADD_TASK',
    EDIT_STAFF: 'EDIT_STAFF',
    DELETE_STAFF: 'DELETE_STAFF'
});

const TaskBtnParams = Object.freeze([
    Object.freeze({
        type: TaskBtnTypes.MOVE_TASK_BACK,
        className: 'task-move-back',
        imageSrc: './assets/left-arrow.svg',
        imageAlt: 'Move To Prev'
    }),
    Object.freeze({
        type: TaskBtnTypes.MOVE_TASK_FORWARD,
        className: 'task-move-forward',
        imageSrc: './assets/right-arrow.svg',
        imageAlt: 'Move To Next'
    }),
    Object.freeze({
        type: TaskBtnTypes.EDIT_TASK,
        className: 'task-edit',
        imageSrc: './assets/edit.svg',
        imageAlt: 'Edit Task'
    }),
    Object.freeze({
        type: TaskBtnTypes.ADD_TASK,
        className: 'task-add',
        imageSrc: './assets/add-button.svg',
        imageAlt: 'Add Task'
    }),
    Object.freeze({
        type: TaskBtnTypes.DELETE_TASK,
        className: 'task-delete',
        imageSrc: './assets/delete-button.svg',
        imageAlt: 'Delete Task'
    }),
    Object.freeze({
        type: TaskBtnTypes.EDIT_STAFF,
        className: 'staff-edit',
        imageSrc: './assets/edit.svg',
        imageAlt: 'Edit Staff'
    }),
    Object.freeze({
        type: TaskBtnTypes.DELETE_STAFF,
        className: 'staff-delete',
        imageSrc: './assets/delete-button.svg',
        imageAlt: 'Delete Staff'
    })
]);

const TaskDataTypes = Object.freeze({
    EQUIPMENT_NAME: 'EQUIPMENT_NAME',
    START_BOOK_DATE: 'START_BOOK_DATE',
    END_BOOK_DATE: 'END_BOOK_DATE'
});

const dataTypes = [
    TaskDataTypes.EQUIPMENT_NAME,
    TaskDataTypes.START_BOOK_DATE,
    TaskDataTypes.END_BOOK_DATE
];

class Task
{
    #taskID = '';
    #equipmentName = '';
    #equipmentID = '';
    #startBookDate = '';
    #endBookDate = '';
    #staffID = '';
    #taskIsCreated = false;
    #taskIsEditing = false;
    constructor({taskID, equipmentName, equipmentID, startBookDate, endBookDate, staffID, onEditTask, onDeleteTask, onMoveTask, placeNewTask})
    {
        this.#taskID = taskID;
        this.#equipmentName = equipmentName;
        this.#equipmentID = equipmentID;
        this.#startBookDate = startBookDate;
        this.#endBookDate = endBookDate;
        this.#staffID = staffID;
        this.onEditTask = onEditTask;
        this.onDeleteTask = onDeleteTask;
        this.onMoveTask = onMoveTask;
        this.placeNewTask = placeNewTask;
    }

    get taskID() {return this.#taskID;}

    get equipmentName() {return this.#equipmentName;}

    get equipmentID() {return this.#equipmentID;}

    get startBookDate() {return this.#startBookDate;}

    get endBookDate() {return this.#endBookDate;}

    get taskIsCreated() {return this.#taskIsCreated;}

    get taskIsEditing() {return this.#taskIsEditing;}

    set equipmentName(newEquipmentName)
    {
       if (typeof newEquipmentName !== 'string') return;
        this.#equipmentName = newEquipmentName;
    }

    set startBookDate(newStartBookDate)
    {
       if (typeof newStartBookDate !== 'string') return;
        this.#startBookDate = newStartBookDate;
    }

    set endBookDate(newEndBookDate)
    {
       if (typeof newEndBookDate !== 'string') return;
        this.#endBookDate = newEndBookDate;
    }

    get staffID() {return this.#staffID;}

    set staffID(newStaffID)
    {
        if (typeof newStaffID !== 'string') return;
        this.#staffID = newStaffID;
    }

    set taskIsCreated(newCreatingState)
    {
        if (typeof newCreatingState !== typeof true) return;
        this.#taskIsCreated = newCreatingState;
    }

    set taskIsEditing(newEditingState)
    {
        if (typeof newEditingState !== typeof true) return;
        this.#taskIsEditing = newEditingState;
    }
    onAddTask = async () => {
        const selectEl = document.querySelector(`li[id="${this.#taskID}"] .options__input__select`);
        const inputStartDateEl = document.querySelector(`li[id="${this.#taskID}"] .options__input__date_start`);
        const inputEndDateEl = document.querySelector(`li[id="${this.#taskID}"] .options__input__date_end`);
        const equipmentName = selectEl.value;
        const startBookDate = inputStartDateEl.value;
        const endBookDate = inputEndDateEl.value;


        let taskEl = document.querySelector(`li[class="task alert"`);
        while (taskEl)
        {
            taskEl.classList.remove("alert");
            taskEl = document.querySelector(`li[class="task alert"`);
        }

        const d1 = new Date(startBookDate);
        const d2 = new Date(endBookDate);

        if (!equipmentName)
            selectEl.classList.add("error");
        else
             selectEl.classList.remove("error");
        if (!startBookDate || d1 >= d2)
            inputStartDateEl.classList.add("error");
        else
             inputStartDateEl.classList.remove("error");
        if (!endBookDate || d1 >= d2)
            inputEndDateEl.classList.add("error");
        else
            inputEndDateEl.classList.remove("error");


        if (!equipmentName || !startBookDate || !endBookDate || d1 >= d2) return;

        let mth = 'POST';
        let url = '/api/v1/tasks'

        if (this.#taskIsCreated)
        {
            mth = 'PATCH';
            url = `/api/v1/tasks/${this.#taskID}`;
        }
        const response = await fetch(url, {
                method: mth,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    staffID: this.#staffID,
                    equipmentID: selectEl.value,
                    startBookDate: startBookDate,
                    endBookDate: endBookDate
                })
            });
        const data = await response.json();
        if (data.statusCode !== 200)
        {

            alert(`Невозможно добавить заявку: оборудование "${equipmentList.find(item => item.id === selectEl.value).name}" уже забронировано на эту дату или данный сотрудник занят в это время`);
            data.id.forEach((ids) => document.querySelector(`li[id="${ids.id}"`).classList.add("alert"));
            return;
        }
        if (!this.#taskIsCreated)
        {
            document.querySelector(`li[id="${this.#taskID}"`).setAttribute("id", data.taskID);
            this.#taskID = data.taskID;
        }

        const task = document.getElementById(this.#taskID);

        this.#startBookDate = startBookDate;
        this.#endBookDate = endBookDate;
        this.#equipmentID = selectEl.value;

        this.fix();

        if (this.#taskIsCreated)
            this.#taskIsEditing = !this.#taskIsEditing;
        this.#taskIsCreated = true;
    };

    fix = () =>
    {

        let taskEl = document.querySelector(`li[class="task alert"`);
        while (taskEl)
        {
            taskEl.classList.remove("alert");
            taskEl = document.querySelector(`li[class="task alert"`);
        }
        let optsEl = document.querySelector(`li[id="${this.#taskID}"] > ul.task__options`);
        if (optsEl)
            optsEl.remove();
        optsEl = document.querySelector(`li[id="${this.#taskID}"] > div.task__controls2`);
        if (optsEl)
            optsEl.remove();
        this.#equipmentName = equipmentList.find(item => item.id === this.#equipmentID).name;
        const taskDatasEL = document.createElement('ul');
        taskDatasEL.classList.add('task__datas');

        dataTypes.forEach(type => {
            const taskDatasDataEl = document.createElement('li');
            taskDatasDataEl.classList.add('task__datas__data');

            const spanEl1 = document.createElement('span');
            spanEl1.classList.add('task__name');

            const spanEl2 = document.createElement('span');
            spanEl2.classList.add('task__name2');
            switch (type)
            {
                case TaskDataTypes.EQUIPMENT_NAME:
                    spanEl1.innerHTML = this.#equipmentName;
                    spanEl1.setAttribute("id", this.#equipmentID);
                    spanEl2.innerHTML = "Оборудование";
                    break;
                case TaskDataTypes.START_BOOK_DATE:
                    spanEl1.innerHTML = this.#startBookDate.split('-').reverse().join('.');
                    spanEl2.innerHTML = "Начало бронирования";
                    break;
                case TaskDataTypes.END_BOOK_DATE:
                    spanEl1.innerHTML = this.#endBookDate.split('-').reverse().join('.');
                    spanEl2.innerHTML = "Окончание бронирования";
                    break;
                default: break;
            }
            taskDatasDataEl.appendChild(spanEl1);
            taskDatasDataEl.appendChild(spanEl2);
            taskDatasEL.appendChild(taskDatasDataEl);
        });
        const controlsEl = document.createElement('div');
        controlsEl.classList.add('task__controls');
        TaskBtnParams.forEach(({className, imageSrc, imageAlt, type}) => {
            if (type === TaskBtnTypes.ADD_TASK || type === TaskBtnTypes.EDIT_STAFF || type === TaskBtnTypes.DELETE_STAFF) return;
            const buttonEl = document.createElement('button');
            buttonEl.classList.add(className);
            switch(type)
            {
                case TaskBtnTypes.EDIT_TASK:
                    buttonEl.addEventListener('click', () => this.onEditTask({
                        staffID: this.#staffID,
                        taskID: this.#taskID
                    }));
                    break;
                case TaskBtnTypes.DELETE_TASK:
                    buttonEl.addEventListener('click', () => this.onDeleteTask({
                        staffID: this.#staffID,
                        taskID: this.#taskID
                    }));
                    break;
                case TaskBtnTypes.MOVE_TASK_FORWARD:
                     buttonEl.addEventListener('click', () => this.onMoveTask({
                        staffID: this.#staffID,
                        taskID: this.#taskID,
                        direction: TaskBtnTypes.MOVE_TASK_FORWARD
                    }));
                    break;
                case TaskBtnTypes.MOVE_TASK_BACK:
                    buttonEl.addEventListener('click', () => this.onMoveTask({
                        staffID: this.#staffID,
                        taskID: this.#taskID,
                        direction: TaskBtnTypes.MOVE_TASK_BACK
                    }));
                    break;
                default: break;
            }

            const imgEl = document.createElement('img');
            imgEl.setAttribute('src', imageSrc);
            imgEl.setAttribute('alt', imageAlt);

            buttonEl.appendChild(imgEl);

            controlsEl.appendChild(buttonEl);
        });
        document.querySelector(`li[id="${this.#taskID}"]`).appendChild(taskDatasEL);
        document.querySelector(`li[id="${this.#taskID}"]`).appendChild(controlsEl);

        this.placeNewTask({taskID: this.#taskID, staffID: this.#staffID});
    }

    unFix = (taskEl) =>
    {
        const taskOptsEL = document.createElement('ul');
        taskOptsEL.classList.add('task__options');

        const OptEl = document.createElement('li');
        OptEl.classList.add('task__options__option');

        const selectEl = document.createElement('select');
        selectEl.classList.add('options__input__select');

        const optionEl = document.createElement('option');
        optionEl.setAttribute("value", "");
        optionEl.innerHTML = "Оборудование";
        selectEl.appendChild(optionEl);
        equipmentList.forEach(value => {
            const optionEl = document.createElement('option');
            optionEl.innerHTML = value.name;
            optionEl.setAttribute("value", value.id);
            if (this.#equipmentName === optionEl.innerHTML)
                optionEl.selected = true;
            selectEl.appendChild(optionEl);
        });
        OptEl.appendChild(selectEl);
        taskOptsEL.appendChild(OptEl);


        dataTypes.forEach(type => {
            if (type === TaskDataTypes.EQUIPMENT_NAME) return;
            const optEl = document.createElement('li');
            optEl.classList.add('task__options__option');

            const dateEl = document.createElement('input');
            dateEl.setAttribute("type", "date");

            let currentDate = new Date();
            currentDate.setHours(currentDate.getHours() + 3);
            currentDate =  currentDate.toISOString().split('T')[0];
            dateEl.setAttribute("min", currentDate);
            let prevDate = '';
            const spanEl = document.createElement('span');
            spanEl.classList.add('task__name2');
            switch (type)
            {
                case TaskDataTypes.START_BOOK_DATE:
                    prevDate = this.#startBookDate;
                    dateEl.classList.add('options__input__date_start');
                    spanEl.innerHTML = "Начало бронирования";
                    break;
                case TaskDataTypes.END_BOOK_DATE:
                    prevDate = this.#endBookDate;
                    dateEl.classList.add('options__input__date_end');
                    spanEl.innerHTML = "Окончание бронирования";
                    break;
                default: break;
            }
            if (!prevDate)
                prevDate = currentDate;
            prevDate = prevDate.split('T')[0];
            dateEl.setAttribute("value", prevDate);
            optEl.appendChild(dateEl);
            optEl.appendChild(spanEl);

            taskOptsEL.appendChild(optEl);
        });
        taskEl.appendChild(taskOptsEL);

        const controlsEl = document.createElement('div');
        controlsEl.classList.add('task__controls2');

        TaskBtnParams.slice(3, 5).forEach(({className, imageSrc, imageAlt, type}) => {
            const buttonEl = document.createElement('button');
            buttonEl.classList.add(className);
            switch(type)
            {
                case TaskBtnTypes.DELETE_TASK:
                    if (this.#taskIsEditing)
                        buttonEl.addEventListener('click', () => this.fix());
                    else
                        buttonEl.addEventListener('click', () => this.onDeleteTask({
                            staffID: this.#staffID,
                            taskID: this.#taskID
                        }));
                    break;
                case TaskBtnTypes.ADD_TASK:
                     buttonEl.addEventListener('click', () => this.onAddTask({
                        staffID: this.#staffID
                    }));
                    break;
                default: break;
            }

            const imgEl = document.createElement('img');
            imgEl.setAttribute('src', imageSrc);
            imgEl.setAttribute('alt', imageAlt);

            buttonEl.appendChild(imgEl);

            controlsEl.appendChild(buttonEl);
        });
        taskEl.appendChild(controlsEl);
    }

    render()
    {
        const taskEl = document.createElement('li');
        taskEl.classList.add('task');
        taskEl.setAttribute('id', this.#taskID);
        if (!this.taskIsCreated)
        {
            this.unFix(taskEl);
            document.querySelector(`li[id="${this.#staffID}"] > ul.tasklist__tasks-list`)
            .appendChild(taskEl);
        }
        else
        {

            document.querySelector(`li[id="${this.#staffID}"] > ul.tasklist__tasks-list`)
            .appendChild(taskEl);
            this.fix();
        }
    }
}